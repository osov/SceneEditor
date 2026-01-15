/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable prefer-const */
import { Services } from '@editor/core';
import { ObstaclesManager } from "./obstacle_manager";
import { ClosestObstacleData, ControlType, NextMoveType, PredictNextMoveData, PathData as PathData, PathNode, PathFinderSettings, PF_default_settings, COLORS } from "./types";
import { CCW, CW, DP_TOL, ShapeNames } from "../geometry/const";
import { ISegment, IPoint, IArc, IVector } from "../geometry/types";
import { vector_from_points, vec_angle, segment, clone, rotate_vec_90CW, 
    rotate_vec_90CCW, invert_vec, rotate, translate, shape_equal_to, 
    shape_contains, shape_center, arc_start, arc_end, arc_start_tangent, 
    shape_box, point_at_length, split_at_length, split, shape_vector, intersect, point2point, point2segment 
} from "../geometry/logic";
import { Vector, Segment, Arc, Point } from "../geometry/shapes";
import { shape_length, normalize, multiply, add, EQ_0, vector_slope, EQ } from "../geometry/utils";
import { GoContainer } from "@editor/render_engine/objects/sub_types";
import { TLinesDrawer } from "./LinesDrawer";
import { TDictionary } from "@editor/modules_editor/modules_editor_const";


const path_tree_root: PathNode = {
    children: [],
    depth: 0,
    total_length: 0
};

declare global {
    const PathFinder: ReturnType<typeof PathFinderModule>;
}

export function register_pathfinder() {
    (window as any).PathFinder = PathFinderModule(PF_default_settings);
}

export function PathFinderModule(settings: PathFinderSettings) {
    const logger = Log.get_with_prefix('pathfinder');
    
    const max_intervals = settings.max_path_intervals;
    const collision_min_error = settings.collision_min_error;
    const move_min_angle = settings.block_move_min_angle;
    const max_correction = settings.target_max_correction;
    const max_checks = settings.max_checks_number;
    const max_depth = settings.max_depth;
    const max_way_length = settings.max_way_length;
    const max_update_time = settings.max_update_time;

    const debug = settings.debug;

    let obstacles_manager: ObstaclesManager | undefined = undefined;
    let checking_obstacles = true;

    function set_obstacles_manager(manager: ObstaclesManager) {
        obstacles_manager = manager;
    }

    function get_obstacles_manager() {
        return obstacles_manager;
    }

    function clear_obstacles_manager() {
        obstacles_manager = undefined;
    }

    function enable_collision(enable = true) {
        checking_obstacles = enable;
        logger.log(`Obstacles ${(enable) ? 'enabled' : 'disabled'}`);
    }
    function check_obstacles_enabled() {
        return checking_obstacles;
    }

    function update_path(way_required: ISegment, collision_radius: number, control_type: ControlType, use_first_found = false) {
        const path_data: PathData = { path: [], length: 0, path_points: [], time: 0, cur_time: 0 };
        if (control_type == ControlType.JS || control_type == ControlType.FP)
            path_data.path = predict_way(way_required, collision_radius, control_type);

        if (control_type == ControlType.GP) {
            const data = find_way(way_required, collision_radius, use_first_found);
            path_data.path = data.path;
            path_data.clear_way_nodes = data.clear_way_nodes;
            path_data.blocked_way_nodes = data.blocked_way_nodes;
        }
        for (const elem of path_data.path)
            path_data.length += shape_length(elem);
        path_data.time = Services.time.now();
        path_data.cur_time = path_data.time;
        return path_data;
    }

    function default_update_way(way_required: ISegment, collision_radius: number, control_type: ControlType) {
        return predict_way(way_required, collision_radius, control_type);
    }

    function find_clear_space(target: IPoint, collision_radius: number, checks_number = 4) {
        if (obstacles_manager == undefined)
            throw new Error('obstacles_manager is not set');
        let clear_target_pos = target;
        const R = collision_radius + collision_min_error;
        let i = 0;
        let point_found = false;
        while (i < checks_number && !point_found) {
            i++;
            const close_obstacles = obstacles_manager.get_obstacles(
                clear_target_pos.x,
                clear_target_pos.y,
                2 * (R + max_correction),
                2 * (R + max_correction)
            );
            if (close_obstacles.length > 0) {
                let sum_vec = Vector(0, 0);
                for (const obstacle of close_obstacles) {
                    const dist_data = point2segment(clear_target_pos, obstacle);
                    const segment = dist_data[1];
                    const dist = dist_data[0];
                    const intersect_dist = R - dist;
                    if (dist <= R && intersect_dist <= max_correction) {
                        const vec = clone(shape_vector(segment));
                        normalize(vec);
                        multiply(vec, intersect_dist);
                        invert_vec(vec);
                        add(sum_vec, vec);
                    }
                }
                if (EQ_0(shape_length(sum_vec))) point_found = true;
                else {
                    clear_target_pos = clone(clear_target_pos);
                    translate(clear_target_pos, sum_vec.x, sum_vec.y);
                }
            }
            else point_found = true;
        }
        return (point_found) ? clear_target_pos : null;
    }

    function find_way(required_path: ISegment, collision_radius: number, use_first_found: boolean) {
        const target = required_path.end;
        const start = required_path.start;
        let corrected_required_path = required_path;

        const clear_target = find_clear_space(target, collision_radius);
        if (clear_target != null) {
            corrected_required_path = Segment(start, clear_target);
        }
        else {
            if (debug)
                logger.log('У цели пути нет свободного места!');
            return { path: [], blocked_way_nodes: [], clear_way_nodes: [] };
        }
        // Строим дерево путей и получаем его конечные ноды.
        const { 
            end_nodes,
            blocked_path_nodes: blocked_way_nodes,
            clear_path_nodes: clear_way_nodes 
        } = build_path_tree(corrected_required_path, collision_radius, max_checks, use_first_found);

        // Восстанавливаем полный путь до start.
        const path = path_from_tree(end_nodes);

        return { path, blocked_way_nodes, clear_way_nodes };
    }

    function path_from_tree(end_nodes: PathNode[]) {
        const path: (ISegment | IArc)[] = [];
        let min_length = Infinity;
        let min_length_node: PathNode | undefined = undefined;
        if (end_nodes.length > 0) {
            for (const node of end_nodes) {
                if (node.total_length < min_length) {
                    min_length = node.total_length;
                    min_length_node = node;
                }
            }
        }
        if (min_length_node != undefined) {
            let node: PathNode | undefined = min_length_node;
            while (node) {
                if (node.segment) path.push(node.segment);
                if (node.arc) path.push(node.arc);
                node = node.parent;
            }
        }
        path.reverse();
        return path;
    }

    function build_path_tree(path_required: ISegment, collision_radius: number, max_checks: number, use_first_found: boolean) {
        path_tree_root.children = [];
        const target = path_required.end;
        const checked_obstacles: { obstacles: ISegment[], start_pos: IPoint }[] = [];
        const nodes_to_check: PathNode[] = [];
        const end_nodes: PathNode[] = [];
        const clear_path_nodes: PathNode[] = [];
        const blocked_path_nodes: PathNode[] = [];
        const path_required_node: PathNode = {
            segment: path_required,
            children: [],
            parent: path_tree_root,
            depth: 1,
            total_length: shape_length(path_required)
        };
        path_tree_root.children.push(path_required_node);

        nodes_to_check.push(path_required_node);
        let checks_number = 0;
        const time = Services.time.now();
        let time_elapsed = 0;

        // Пока есть пути, которые нужно проверить, при этом не превысили ограничений по числу проверок:
        while (nodes_to_check.length > 0 && checks_number <= max_checks && time_elapsed <= max_update_time) {
            const node_to_check = nodes_to_check.splice(0, 1)[0];
            // const way_to_check = ways_to_check.pop() as PathNode;
            const result = check_path_node(node_to_check, target, collision_radius, checked_obstacles);
            nodes_to_check.push(...result.ways_to_check);
            end_nodes.push(...result.end_nodes);
            clear_path_nodes.push(...result.clear_way_nodes);
            blocked_path_nodes.push(...result.blocked_way_nodes);
            checks_number++;
            time_elapsed = Services.time.now() - time;

            if (use_first_found && end_nodes.length > 0) break; 
        }
        return { end_nodes, clear_path_nodes, blocked_path_nodes };
    }

    /**
     * Для поиска пути: достаёт массив препятствий, к которым уже были построены обходные пути из указанной start_pos, создаёт новый массив, если он не был найден
     */
    function get_checked_obstacles(checked_obstacles: { obstacles: ISegment[], start_pos: IPoint }[], start_pos: IPoint): ISegment[] {
        let found_entry: ISegment[] | undefined;
        let result: ISegment[];
        for (const entry of checked_obstacles) {
            if (shape_equal_to(entry.start_pos, start_pos)) {
                found_entry = entry.obstacles;
            }
        }
        if (!found_entry) {
            const new_entry = { obstacles: [], start_pos };
            checked_obstacles.push(new_entry);
            result = new_entry.obstacles;
        }
        else result = found_entry;
        return result;
    }

    function check_path_node(path: PathNode, target: IPoint, collision_radius: number, checked_obstacles: { obstacles: ISegment[], start_pos: IPoint }[]) {
        const paths_to_check: PathNode[] = [];
        const end_nodes: PathNode[] = [];
        const clear_way_nodes: PathNode[] = [];
        const blocked_way_nodes: PathNode[] = [];

        // Если глубина либо длина полного пути данной ноды больше максимальной, пропускаем проверку, саму ноду нигде не учитываем. 
        // TODO: можно добавлять её в список blocked_way_nodes или отдельный для отображения
        if (path.total_length > max_way_length || path.depth > max_depth) {
            return { ways_to_check: paths_to_check, end_nodes, clear_way_nodes, blocked_way_nodes };
        }

        const arc = path.arc;
        const segment = path.segment;
        const previous_vertice = path.previous_vertice;
        const previous_clockwise = path.previous_clockwise;
        const next_vertice = path.next_vertice;
        const next_clockwise = path.next_clockwise;
        let arc_collision = false;
        let segment_collision = false;

        // Стартовая позиция ноды - начало дуги обхода вершины препятствия, либо, если её нет, начало сегмента пути.
        let start = (arc) ? arc_start(arc) : segment!.start;
        let end = segment!.end;

        // Если у данной ноды есть дуга пути обхода предыдущей вершины, проверяем наличие её пересечений с препятствиями
        if (arc) {
            const obstacle = find_closest_obstacle(arc, collision_radius).obstacle;
            if (obstacle) {
                arc_collision = true;
                const checked = get_checked_obstacles(checked_obstacles, arc_start(arc));

                // Если есть пересечение с препятствием и к данному препятствию еще не строили обходных путей из стартовой позиции этой ноды:
                if (!checked.includes(obstacle)) {
                    let sideways: PathNode[];

                    // Если не указана вершина предыдущего препятствия, создаём ноды с обходными путями к препятствию напрямую их стартовой позиции этой ноды:
                    // TODO: Раз имеем дело с дугой обхода вершины, previous_vertice никогда не будет undefined? Возможно стоит убрать make_sideways 
                    if (!(previous_vertice && previous_clockwise != undefined)) {
                        sideways = make_sideways(
                            start,
                            end,
                            obstacle,
                            collision_radius + collision_min_error,
                            path.parent,
                        );
                    }

                    // Если указана, создаём ноды с обходными путями к препятствию с обходом вершины предыдущего препятствия:
                    else {
                        sideways = make_sideways_bypass_vertice(
                            start,
                            end,
                            obstacle,
                            previous_vertice,
                            previous_clockwise,
                            path.parent,
                            collision_radius + collision_min_error
                        );
                    }
                    checked.push(obstacle);

                    // Добавляем новые ноды в список для проверки
                    for (const sideway of sideways) {
                        paths_to_check.push(sideway);
                    }
                }
            }
        }

        // Если у данной ноды есть сегмент (прямой отрезок) пути и не было пересечений с дугой пути, проверяем наличие пересечений сегмента с препятствиями
        if (segment && !arc_collision) {
            const obstacle = find_closest_obstacle(segment, collision_radius).obstacle;
            if (obstacle) {
                segment_collision = true;
                const checked = get_checked_obstacles(checked_obstacles, segment.start);
                // Если есть пересечение с препятствием и к данному препятствию еще не строили обходных путей из стартовой позиции этой ноды:
                if (!checked.includes(obstacle)) {
                    let sideways: PathNode[];
                    if (!(previous_vertice && previous_clockwise != undefined)) {
                        sideways = make_sideways(
                            start,
                            end,
                            obstacle,
                            collision_radius + collision_min_error,
                            path.parent,
                        );
                    }

                    // Если указана, создаём ноды с обходными путями к препятствию с обходом вершины предыдущего препятствия:
                    else {
                        sideways = make_sideways_bypass_vertice(
                            start,
                            end,
                            obstacle,
                            previous_vertice,
                            previous_clockwise,
                            path.parent,
                            collision_radius + collision_min_error
                        );
                    }
                    checked.push(obstacle);

                    // Добавляем новые ноды в список для проверки
                    for (const sideway of sideways) {
                        paths_to_check.push(sideway);
                    }
                }
            }
        }

        // Если пересечений элементов пути этой ноды с препятствиями не было, и конечная точка ноды совпадает с target, добавляем её в список конечных нод
        // Иначе создаём новую ноду с началом пути в конечной точки этой ноды и добавляем её в список для проверки. 
        if (!(arc_collision || segment_collision) && segment) {
            clear_way_nodes.push(path);
            if (segment.end == target) {
                end_nodes.push(path);
            }
            else if (next_vertice && next_clockwise != undefined) {
                const next_way: PathNode = make_way_bypass_vertice(
                    segment.end,
                    target,
                    next_vertice,
                    next_clockwise,
                    path
                );
                paths_to_check.push(next_way);
            }
        }

        // Если было пересечение, добавляем в список блокированных путей, 
        else
            blocked_way_nodes.push(path);

        return { ways_to_check: paths_to_check, end_nodes, clear_way_nodes, blocked_way_nodes };
    }

    /**
     * Построение пути PathNode для обхода препятствия, из одного сегмента (отрезка), начало в точке start, конец в точке касания с 
     * окружностью радиусом collision_radius и центром в target_vertice. Направление обхода передаётся в clockwise.
     * @param start стартовая точка
     * @param target_vertice вершина, к которой строим путь
     * @param collision_radius расстоянение столкновения
     * @param clockwise направление обхода
     * @param parent_node
     * @returns PathNode
     */
    function make_way(start: IPoint, target_vertice: IPoint, collision_radius: number, clockwise: boolean, parent_node?: PathNode) {
        const vec = vector_from_points(start, target_vertice);
        let angle = Math.asin(collision_radius / shape_length(vec)) + Math.PI / 2;
        angle = (clockwise) ? angle : -angle;
        normalize(vec);
        rotate(vec, angle);
        multiply(vec, collision_radius);
        const way_end = clone(target_vertice);
        translate(way_end, vec.x, vec.y);
        const segment = Segment(start, way_end);
        const node: PathNode = {
            segment,
            parent: parent_node,
            children: [],
            depth: (parent_node) ? parent_node.depth + 1 : 0,
            total_length: (parent_node) ? parent_node.total_length + shape_length(segment) : shape_length(segment),
            previous_vertice: parent_node?.previous_vertice,
            previous_clockwise: parent_node?.previous_clockwise,
            next_vertice: target_vertice,
            next_clockwise: clockwise,
        };
        if (parent_node)
            parent_node.children.push(node);
        return node;
    }

    const target_vec = Vector(0, 0);
    const vec_l = Vector(0, 0);
    const vec_r = Vector(0, 0);

    /**
     * Построение двух вариантов обхода препятствия из стартовой точки. В отличие от make_all_sideways строит только два необходимых отрезка вместо четырёх
     * @param start стартовая точка
     * @param target цель к которой пытались построить путь без учёта этого препятствия
     * @param obstacle препятствие, к которому строим обходные пути
     * @param parent_node
     * @param collision_radius 
     * @returns [PathNode, PathNode]
     */
    function make_sideways(start: IPoint, target: IPoint, obstacle: ISegment, collision_radius: number, parent_node = path_tree_root) {
        target_vec.x = target.x - start.x;
        target_vec.y = target.y - start.y;
        vec_l.x = obstacle.start.x - start.x;
        vec_l.y = obstacle.start.y - start.y;
        vec_r.x = obstacle.end.x - start.x;
        vec_r.y = obstacle.end.y - start.y;
        const result: PathNode[] = [];
        const length_l = shape_length(vec_l);
        const length_r = shape_length(vec_r);
        let angle_l = (!EQ_0(length_l)) ? vec_angle(target_vec, vec_l) : 0;
        let angle_r = (!EQ_0(length_r)) ? vec_angle(target_vec, vec_r) : 0;
        let clockwise_l: boolean;
        let clockwise_r: boolean;

        // В зависимости положения вершин препятствия относительно вектора направления желаемого движения target_vec, определяем направление обхода этих вершин
        if (angle_l > angle_r) {
            clockwise_l = true;
            clockwise_r = false;
        }
        else {
            clockwise_l = false;
            clockwise_r = true;
        }

        // Проверяем, на каком расстоянии от вершины препятствия находится start
        if (length_l > collision_radius - collision_min_error) {
            // Если расстояние больше радиуса столкновения, строим отрезок
            if (length_l > collision_radius) {
                result.push(make_way(
                    start,
                    obstacle.start,
                    collision_radius,
                    clockwise_l,
                    parent_node
                ));
            }
            // Если расстояние до вершины меньше радиуса столкновения, но в пределах погрешности collision_min_error,
            // значит, start уже находится возле данной вершины. Пробуем строить путь дальше, от вершины к цели движения
            else {
                result.push(make_way_bypass_vertice(
                    start,
                    target,
                    obstacle.start,
                    clockwise_l,
                    parent_node
                ));
            }
        }

        if (length_r > collision_radius - collision_min_error) {
            if (length_r > collision_radius) {
                result.push(make_way(
                    start,
                    obstacle.end,
                    collision_radius,
                    clockwise_r,
                    parent_node
                ));
            }
            else {
                result.push(make_way_bypass_vertice(
                    start,
                    target,
                    obstacle.end,
                    clockwise_r,
                    parent_node
                ));
            }
        }
        return result;
    }


    /**
     * Строит все варианты путей с касательными отрезками из точки start к окуружностям с collision_radius на вершинах сегмента препятствия
     */
    function make_all_sideways(start: IPoint, target: IPoint, obstacle: ISegment, parent_node: PathNode | undefined, collision_radius: number) {
        const result: PathNode[] = [];
        for (const dir of [CCW, CW]) {
            for (const vertice of [obstacle.start, obstacle.end]) {
                const dist = shape_length(vector_from_points(start, vertice));
                // Проверяем, на каком расстоянии от вершины препятствия находится start
                if (dist > collision_radius - collision_min_error) {
                    let node: PathNode;
                    // Если расстояние больше радиуса столкновения, строим отрезок
                    if (dist > collision_radius) {
                        node = make_way(
                            start,
                            vertice,
                            collision_radius,
                            dir,
                            parent_node
                        );
                    }
                    // Если расстояние меньше радиуса столкновения, но в пределах погрешности collision_min_error,
                    // значит, start уже находится возле данной вершины. Пробуем строить путь дальше, от вершины к цели движения
                    else {
                        node = make_way_bypass_vertice(
                            start,
                            target,
                            vertice,
                            dir,
                            parent_node
                        );
                    }
                    result.push(node);
                }
                else {
                    // Error, start уже слишком близко к препятствию
                }
            }
        }
        return result;
    }

    /**
     * Построение двух вариантов обхода препятствия с определением дуги пути для обхода вершины загораживающей путь
     */
    function make_sideways_bypass_vertice(start: IPoint, target: IPoint, obstacle: ISegment, vertice: IPoint, clockwise = CW, parent_node?: PathNode, collision_radius?: number) {
        const result: PathNode[] = [];
        const R = (collision_radius) ? collision_radius : point2point(start, vertice)[0];
        const arc_start_vec = vector_from_points(vertice, start);
        const vertice_l = obstacle.start;
        const vertice_r = obstacle.end;
        let vec_l = vector_from_points(vertice, vertice_l);
        let vec_r = vector_from_points(vertice, vertice_r);
        const target_vec = vector_from_points(start, target);

        // В зависимости положения вершин препятствия относительно вектора направления желаемого движения target_vec, определяем направление обхода этих вершин
        let same_side_touch_vertice: IPoint;
        let diff_side_touch_vertice: IPoint;
        const length_l = shape_length(vec_l);
        const length_r = shape_length(vec_r);
        if (length_l != 0 && length_r != 0) {
            let angle_l = vec_angle(target_vec, vec_l);
            let angle_r = vec_angle(target_vec, vec_r);
            if (!clockwise) {
                same_side_touch_vertice = (angle_l < angle_r) ? vertice_l : vertice_r;
                diff_side_touch_vertice = (angle_l < angle_r) ? vertice_r : vertice_l;
            }
            else {
                same_side_touch_vertice = (angle_l < angle_r) ? vertice_r : vertice_l;
                diff_side_touch_vertice = (angle_l < angle_r) ? vertice_l : vertice_r;
            }
        }
        else if (length_l == 0) {
            same_side_touch_vertice = vertice_r;
            diff_side_touch_vertice = vertice_l;
        }
        else {
            same_side_touch_vertice = vertice_l;
            diff_side_touch_vertice = vertice_r;
        }

        //  Далее работаем с вариантом пути, обходящим обе вершин с одной стороны
        let vert_to_vert = Segment(vertice, same_side_touch_vertice);

        // Проверяем что расстояние между вершинами не равно нулю, иначе это одна и та же вершина и строить путь не нужно
        if (!EQ_0(shape_length(vert_to_vert))) {
            let prev_vertice = parent_node?.previous_vertice;
            let prev_segment = parent_node?.segment;
            let prev_arc = parent_node?.arc;
            let way_diff_angle = 0;

            // Проверяем, отклоняется ли путь на больший угол от желаемого направления, чем путь ноды-родителя. 
            // Если да, нужно определить, как строить этот путь. Присоединять его будем к родителю полученной ноды-родителя
            if (prev_segment && !EQ_0(shape_length(prev_segment))) {
                way_diff_angle = vec_angle(shape_vector(vert_to_vert), shape_vector(prev_segment));
            }
            if (prev_segment && ((way_diff_angle < 0 && clockwise) || (way_diff_angle > 0 && !clockwise))) {
                const dist = shape_length(vector_from_points(prev_segment.start, same_side_touch_vertice));
                if (dist > R - collision_min_error) {
                    let nodes: PathNode[] = [];
                    // Если у родителя указана предыдущая вершина, будем перестраивать новый путь с помощью данной функцией от начала дуги родителя.
                    if (prev_vertice) {
                        nodes = make_sideways_bypass_vertice(
                            arc_start(prev_arc!),
                            target,
                            obstacle,
                            prev_vertice,
                            clockwise,
                            parent_node?.parent,
                            R
                        );
                        result.push(...nodes);
                    }
                    // Если нет, значит, предыдущий путь состоял из одного сегмента. Определяем вариант построения 
                    // в зависимости от расстояния от prev_segment.start до следующей вершины.
                    // Если расстояние больше R, строим прямой путь.
                    else if (dist > R) {
                        result.push(make_way(
                            prev_segment.start,
                            same_side_touch_vertice,
                            R,
                            clockwise,
                            parent_node?.parent
                        ));
                    }
                    // Иначе начало предыдущего пути уже находится возле следующей вершины, просто строим путь, обходящий её из prev_arc.start
                    // TODO: Проверить, возможен ли такой вариант вообще
                    if (dist < R) {
                        result.push(make_way_bypass_vertice(
                            arc_start(prev_arc!),
                            target,
                            same_side_touch_vertice,
                            clockwise,
                            parent_node?.parent
                        ));
                    }
                }
            }

            // Если путь не будет отклоняться сильнее предыдущего пути, строим дугу для обхода вершины
            else {
                const obstacle_vec = vector_from_points(same_side_touch_vertice, diff_side_touch_vertice);
                // const obstacle_norm = (!clockwise) ? obstacle_vec.rotate90CCW() : obstacle_vec.rotate90CW();
                const v2v_vec = shape_vector(vert_to_vert);
                const vec_S = clone(v2v_vec);
                normalize(vec_S);
                multiply(vec_S, R);
                if (!clockwise) 
                    rotate_vec_90CCW(vec_S);
                else 
                    rotate_vec_90CW(vec_S);

                // Конец пути в точке:
                const end_S_point = clone(same_side_touch_vertice);
                translate(end_S_point, vec_S.x, vec_S.y);
                const start_angle = vector_slope(arc_start_vec);
                let end_angle = vector_slope(vec_S);

                // TODO: Возможно стоит останавливаться до столкновения с самим обходимым препятствием
                // end_angle = (obstacle_block_angle < end_angle && end_angle < obstacle_block_angle + Math.PI) ? obstacle_block_angle : end_angle;
                const arc_clockwise = ((start_angle > end_angle && !clockwise) || (start_angle < end_angle && clockwise)) ? !clockwise : !clockwise;
                const way_S_arc = Arc(vertice, shape_length(arc_start_vec), start_angle, end_angle, arc_clockwise);
                const way_S_segment = Segment(arc_end(way_S_arc), end_S_point);
                const length_S = shape_length(way_S_arc) + shape_length(way_S_segment);
                const node_S: PathNode = {
                    segment: way_S_segment,
                    arc: way_S_arc,
                    parent: parent_node,
                    children: [],
                    depth: (parent_node) ? parent_node.depth + 1 : 0,
                    total_length: (parent_node) ? parent_node.total_length + length_S : length_S,
                    previous_vertice: vertice,
                    previous_clockwise: clockwise,
                    next_vertice: same_side_touch_vertice,
                    next_clockwise: clockwise,
                };
                if (parent_node)
                    parent_node.children.push(node_S);
                result.push(node_S);
            }
        }

        //  Далее работаем с вариантом пути, обходящим вершин с разных сторон
        vert_to_vert = Segment(vertice, diff_side_touch_vertice);
        const v2v_length = shape_length(vert_to_vert);
        // Путь пролегает между этими вершинами. Проверяем что расстояние между ними больше двух радиусов столкновения, иначе строить путь нет смысла.
        if (v2v_length > 2 * R) {
            const obstacle_vec = vector_from_points(diff_side_touch_vertice, same_side_touch_vertice);
            // const obstacle_norm = (!clockwise) ? obstacle_vec.rotate90CW() : obstacle_vec.rotate90CCW();
            // const obstacle_block_angle = obstacle_norm.slope();

            let angle = Math.acos(2 * R / v2v_length);
            const vec_D = clone(shape_vector(vert_to_vert));
            normalize(vec_D);
            multiply(vec_D, R);
            if (!clockwise) 
                rotate(vec_D, -angle);
            else
                rotate(vec_D, angle);

            let end_angle = vector_slope(vec_D);

            // Конец пути в точке:
            invert_vec(vec_D);
            const end_D_point = clone(diff_side_touch_vertice);
            translate(end_D_point, vec_D.x, vec_D.y);
            const start_angle = vector_slope(arc_start_vec);
            // end_angle = (obstacle_block_angle < end_angle && end_angle < obstacle_block_angle + Math.PI) ? obstacle_block_angle : end_angle;
            const arc_clockwise = !clockwise;
            const way_D_arc = Arc(vertice, shape_length(arc_start_vec), start_angle, end_angle, arc_clockwise);
            const way_D_segment = Segment(arc_end(way_D_arc), end_D_point);
            const length_D = shape_length(way_D_arc) + shape_length(way_D_segment);
            const node_D: PathNode = {
                segment: way_D_segment,
                arc: way_D_arc,
                parent: parent_node,
                children: [],
                depth: (parent_node) ? parent_node.depth + 1 : 0,
                total_length: (parent_node) ? parent_node.total_length + length_D : length_D,
                previous_vertice: vertice,
                previous_clockwise: clockwise,
                next_vertice: diff_side_touch_vertice,
                next_clockwise: !clockwise,
            };
            if (parent_node)
                parent_node.children.push(node_D);
            result.push(node_D);
        }
        return result;
    }

    /**
     * Строит путь с дугой обходящей вершину препятствия в указанном направлении и прямым отрезком из конца этой дуги до точки target
     */
    function make_way_bypass_vertice(start: IPoint, target: IPoint, vertice: IPoint, clockwise = CW, parent_node?: PathNode, collision_radius?: number) {
        const R = (collision_radius) ? collision_radius : point2point(start, vertice)[0];
        const arc_start_vec = vector_from_points(vertice, start);
        const vert_to_target = Segment(vertice, target);
        const angle = Math.acos(R / shape_length(vert_to_target)) + DP_TOL;
        const vec = clone(shape_vector(vert_to_target));
        normalize(vec);
        multiply(vec, R);
        if (!clockwise) 
            rotate(vec, -angle);
        else
            rotate(vec, angle);

        const start_angle = vector_slope(arc_start_vec);
        const end_angle = vector_slope(vec);
        const arc_clockwise = !clockwise;

        const arc = Arc(vertice, shape_length(arc_start_vec), start_angle, end_angle, arc_clockwise);
        const segment = Segment(arc_end(arc), target);
        const length = shape_length(arc) + shape_length(segment);
        const node: PathNode = {
            segment: segment,
            arc: arc,
            parent: parent_node,
            children: [],
            depth: (parent_node) ? parent_node.depth + 1 : 0,
            total_length: (parent_node) ? parent_node.total_length + length : length,
            previous_vertice: vertice,
            previous_clockwise: clockwise,
            next_vertice: undefined,
            next_clockwise: undefined,
        };
        if (parent_node)
            parent_node.children.push(node);
        return node;
    }

    function predict_way(way_required: ISegment, collision_radius: number, control_type: ControlType) {
        const way: (ISegment | IArc)[] = [];
        let lenght_remains = shape_length(way_required);
        const data: PredictNextMoveData = { next_do: NextMoveType.STRAIGHT_LINE, path_required: way_required, lenght_remains, control_type };
        let counter = 0;
        while (data.lenght_remains >= collision_min_error && counter < max_intervals) {
            if (debug) {
                log(`Next move in predicted way:`, NextMoveType[data.next_do]);
            }
            if (data.next_do == NextMoveType.STRAIGHT_LINE) {
                linear_move(way, collision_radius, data);
            }
            else if (data.next_do == NextMoveType.BYPASS_ANGLE) {
                bypass_vertice(way, collision_radius, data);
            }
            else if (data.next_do == NextMoveType.SLIDE_OBSTACLE) {
                slide_obstacle(way, collision_radius, data);
            }
            else if (data.next_do == NextMoveType.STOP) break;
            counter++;
        }
        return way;
    }

    function _get_correction_angle(pos: IPoint, vertice: IPoint, way_req: ISegment) {
        let correction_angle = 0;
        const pos_to_vert_vec = vector_from_points(pos, vertice);
        const vert_to_tar_vec = vector_from_points(vertice, way_req.end);
        const vert_to_tar_vec_inver = clone(vert_to_tar_vec);
        invert_vec(vert_to_tar_vec_inver);
        const target_to_pos_vec = shape_vector(way_req);
        const pos_to_target_vec = clone(target_to_pos_vec);
        invert_vec(pos_to_target_vec);
        correction_angle = Math.asin(shape_length(pos_to_vert_vec) / shape_length(vert_to_tar_vec)) - Math.abs(vec_angle(pos_to_target_vec, vert_to_tar_vec_inver));
        return correction_angle;
    }

    function _correct_vec_angle_to_dir(vec: IVector, data: PredictNextMoveData, rotate_dir: boolean) {
        let correction_angle = 0;
        let end_vec = clone(vec);
        if (data.control_type == ControlType.JS) {
            correction_angle = 0;
        }
        else if (data.control_type == ControlType.FP) {
            correction_angle = _get_correction_angle(data.path_required.start, data.vertice_to_bypass as IPoint, data.path_required);
        }
        if (correction_angle != 0) {
            if (rotate_dir) 
                rotate(end_vec, -correction_angle);
            else
                rotate(end_vec, correction_angle);
        }

        // log('correction_angle',  radToDeg(correction_angle));
        // log('corrected_end_angle',  radToDeg(end_vec.slope));
        return end_vec;
    }

    function _get_new_target(pos: IPoint, new_pos: IPoint, old_target: IPoint) {
        const d_vec = vector_from_points(pos, new_pos);
        const new_target = clone(old_target);
        translate(new_target, d_vec.x, d_vec.y);
        return new_target;
    }

    function bypass_vertice(way: (ISegment | IArc)[], collision_radius: number, data: PredictNextMoveData) {
        const obstacle = data.obstacle_to_slide as ISegment;
        const vertice = data.vertice_to_bypass as IPoint;
        const s_pos = data.path_required.start;
        const pos_to_vertice_vec = vector_from_points(s_pos, vertice);
        const dir_diff_start_angle = vec_angle(shape_vector(data.path_required), pos_to_vertice_vec);
        const rotate_dir = (dir_diff_start_angle < 0) ? CW : CCW;

        let obstacle_limit_vec = clone(shape_vector(obstacle));
        if (shape_equal_to(vertice, obstacle.end)) 
            invert_vec(obstacle_limit_vec);
        if (rotate_dir) 
            rotate_vec_90CW(obstacle_limit_vec);
        else
            rotate_vec_90CCW(obstacle_limit_vec);

        let start_vec = clone(pos_to_vertice_vec);
        invert_vec(start_vec);

        let end_vec = clone(shape_vector(data.path_required));

        if (rotate_dir) 
            rotate_vec_90CW(end_vec);
        else
            rotate_vec_90CCW(end_vec);

        let _end_angle = vector_slope(end_vec);
        let allowed_way = undefined;

        end_vec = _correct_vec_angle_to_dir(end_vec, data, rotate_dir);

        // Проверяем, что при обходе угла не столкнулись с препятствием, край которого сейчас обходим, если столкнулись ограничиваем угол обхода
        let blocked_by_current_obstacle = false;
        let excess_rotation_angle = (rotate_dir) ? vec_angle(end_vec, obstacle_limit_vec) : vec_angle(obstacle_limit_vec, end_vec);
        if (excess_rotation_angle > 0) {
            end_vec = obstacle_limit_vec;
            blocked_by_current_obstacle = true;
        }

        let start_angle = vector_slope(start_vec);
        let end_angle = vector_slope(end_vec);

        // Дуга пути, чтобы обойти угол и выйти на нужную траекторию:
        const way_arc_full = Arc(vertice, shape_length(start_vec), start_angle, end_angle, !rotate_dir);
        let way_arc = way_arc_full;
        if (!check_collision_angle_ok(shape_vector(data.path_required), way_arc)) {
            data.next_do = NextMoveType.STOP;
            return;
        }

        // Если длина дуги больше оставшейся для расчётов длины пути, ограничиваем дугу этой длиной
        if (data.lenght_remains < shape_length(way_arc_full))
            way_arc = split_at_length(way_arc_full, data.lenght_remains)[0] as IArc;

        // Далее ищем пересечения дуги с остальными препятствиями
        const closest = find_closest_obstacle(way_arc, collision_radius);
        if (closest.obstacle && closest.obstacle != obstacle) {
            let distance_before_collision = closest.distance;
            if (distance_before_collision < 0) {
                distance_before_collision = 0;
            }
            const way_segments = split_at_length(way_arc, distance_before_collision);
            allowed_way = way_segments[0];
            data.obstacle_to_slide = closest.obstacle;
            if (closest.is_vertice) {
                data.vertice_to_bypass = closest.point;
                data.next_do = NextMoveType.BYPASS_ANGLE;
            }
            else {
                // Если столкнулись с препятствием, которое обходили в предыдущее действие, останавливаемся.
                if (closest.obstacle == data.prev_obstacle) {
                    data.next_do = NextMoveType.STOP;
                }
                else {
                    data.next_do = NextMoveType.SLIDE_OBSTACLE;
                }
            }
            data.lenght_remains -= distance_before_collision;
            data.prev_obstacle = obstacle;
        }
        else {
            if (data.lenght_remains < shape_length(way_arc_full)) {
                data.next_do = NextMoveType.STOP;
            }
            else if (blocked_by_current_obstacle)
                data.next_do = NextMoveType.SLIDE_OBSTACLE;
            else {
                data.next_do = NextMoveType.STRAIGHT_LINE;
            }
            data.lenght_remains -= shape_length(way_arc);
            allowed_way = way_arc;
        }

        if (!('null' in allowed_way)) {
            if (data.control_type == ControlType.JS) {
                const new_target = _get_new_target(s_pos, arc_end(allowed_way), data.path_required.end);
                data.path_required = segment(arc_end(allowed_way).x, arc_end(allowed_way).y, new_target.x, new_target.y);
            }
            else if (data.control_type == ControlType.FP) {
                const new_target = data.path_required.end;
                data.path_required = segment(arc_end(allowed_way).x, arc_end(allowed_way).y, new_target.x, new_target.y);
            }
            way.push(allowed_way);
        }
    }

    function slide_obstacle(way: (ISegment | IArc)[], collision_radius: number, data: PredictNextMoveData) {
        const obstacle = data.obstacle_to_slide as ISegment;
        const s_pos = data.path_required.start;
        const distance_segment = point2segment(s_pos, obstacle)[1];
        const vec = clone(shape_vector(distance_segment));
        invert_vec(vec);
        const slide_l = segment(distance_segment.end.x, distance_segment.end.y, obstacle.start.x, obstacle.start.y);
        const slide_r = segment(distance_segment.end.x, distance_segment.end.y, obstacle.end.x, obstacle.end.y);
        const vec_l = shape_vector(slide_l);
        const vec_r = shape_vector(slide_r);
        const path_vec = shape_vector(data.path_required);
        const angle_l = (!EQ_0(shape_length(vec_l))) ? Math.abs(vec_angle(path_vec, vec_l)) : 2 * Math.PI;
        const angle_r = (!EQ_0(shape_length(vec_r))) ? Math.abs(vec_angle(path_vec, vec_r)) : 2 * Math.PI;
        const slide = (angle_l < angle_r) ? slide_l : slide_r;
        const d_angle = Math.abs(vec_angle(shape_vector(slide), shape_vector(data.path_required)));
        let allowed_way = undefined;

        // Требуемый путь, чтобы добраться до края препятствия:
        let way_required_to_slide = clone(slide);
        translate(way_required_to_slide, vec.x, vec.y);

        if (!check_collision_angle_ok(shape_vector(data.path_required), way_required_to_slide)) {
            data.next_do = NextMoveType.STOP;
            return;
        }
        // Оставшееся расстояние может закончиться раньше, чем добрались до края препятствия:
        const max_slide_distance = (data.control_type == ControlType.FP) ? data.lenght_remains * Math.cos(d_angle) : data.lenght_remains;
        way_required_to_slide = split_at_length(way_required_to_slide, max_slide_distance)[0] as ISegment;
        if (EQ_0(max_slide_distance)) {
            data.next_do = NextMoveType.STOP;
            return;
        }
        const closest = find_closest_obstacle(way_required_to_slide, collision_radius);
        if (closest.obstacle) {
            let distance_before_collision = closest.distance;
            if (distance_before_collision < 0) {
                distance_before_collision = 0;
            }
            const way_segments = split_at_length(way_required_to_slide, distance_before_collision);
            allowed_way = way_segments[0];
            if (closest.is_vertice) {
                data.vertice_to_bypass = closest.point;
                data.next_do = NextMoveType.BYPASS_ANGLE;
            }
            else {
                // Если столкнулись с препятствием, которое обходили в предыдущее действие, останавливаемся.
                if (closest.obstacle == data.prev_obstacle) {
                    data.next_do = NextMoveType.STOP;
                }
                else {
                    data.next_do = NextMoveType.SLIDE_OBSTACLE;
                }
            }
            data.obstacle_to_slide = closest.obstacle;
            data.lenght_remains -= distance_before_collision;
            data.prev_obstacle = obstacle;
        }
        else {
            const slide_length = shape_length(slide);
            if (max_slide_distance < slide_length) {
                data.lenght_remains = 0;
                data.next_do = NextMoveType.STOP;
            }
            else {
                data.lenght_remains -= (slide_length / Math.cos(d_angle));
                data.vertice_to_bypass = slide.end;
                data.next_do = NextMoveType.BYPASS_ANGLE;
            }
            allowed_way = way_required_to_slide;
        }
        if (!('null' in allowed_way)) {
            if (data.control_type == ControlType.JS) {
                const new_target = _get_new_target(s_pos, allowed_way.end, data.path_required.end);
                data.path_required = segment(allowed_way.end.x, allowed_way.end.y, new_target.x, new_target.y);
            }
            else if (data.control_type == ControlType.FP) {
                const new_target = data.path_required.end;
                data.path_required = segment(allowed_way.end.x, allowed_way.end.y, new_target.x, new_target.y);
            }
            way.push(allowed_way);
        }
    }

    function linear_move(way: (ISegment | IArc)[], collision_radius: number, data: PredictNextMoveData) {
        data.obstacle_to_slide = undefined;
        data.vertice_to_bypass = undefined;
        const closest = find_closest_obstacle(data.path_required, collision_radius);
        let allowed_way = undefined;
        if (closest.obstacle) {
            let distance_before_collision = closest.distance;
            if (distance_before_collision < 0) {
                distance_before_collision = 0;
            }
            const way_segments = split_at_length(data.path_required, distance_before_collision);
            allowed_way = way_segments[0];
            data.path_required = way_segments[1] as ISegment;
            data.obstacle_to_slide = closest.obstacle;
            data.lenght_remains -= distance_before_collision;
            if (closest.is_vertice) {
                data.vertice_to_bypass = closest.point;
                data.next_do = NextMoveType.BYPASS_ANGLE;
            }
            else {
                data.next_do = NextMoveType.SLIDE_OBSTACLE;
            }
        }
        else {
            data.next_do = NextMoveType.STOP;
            data.lenght_remains = 0;
            allowed_way = data.path_required;
        }
        if (!('null' in allowed_way)) {
            way.push(allowed_way);
        }
    }

    function check_collision_angle_ok(direction_required: IVector, way: ISegment | IArc) {
        let collision_angle: number | undefined = undefined;
        if (way.name == ShapeNames.Segment) {
            const way_segment = way as ISegment;
            collision_angle = Math.PI / 2 - Math.abs(vec_angle(direction_required, shape_vector(way_segment)));
        }
        if (way.name == ShapeNames.Arc) {
            const way_arc = way as IArc;
            collision_angle = Math.PI / 2 - Math.abs(vec_angle(direction_required, arc_start_tangent(way_arc)));
        }
        if (collision_angle) return (collision_angle) > move_min_angle;
        return false;
    }

    function find_closest_obstacle(way_required: ISegment | IArc, collision_radius: number): ClosestObstacleData {
        if (obstacles_manager == undefined)
            throw new Error('obstacles_manager is not set');
        let shortest_distance = Infinity;
        let closest_point: IPoint | undefined = undefined;
        let closest_obstacle: ISegment | undefined = undefined;
        let shortest_way: ISegment | IArc | undefined = undefined;
        let is_vertice = false;
        let offset_collision_line: ISegment | IArc | undefined = undefined;
        if (!checking_obstacles) return { obstacle: closest_obstacle, distance: shape_length(way_required), point: closest_point, way: shortest_way, is_vertice };
        const way_box = shape_box(way_required);
        const way_box_width = Math.abs(way_box.xmax - way_box.xmin);
        const way_box_height = Math.abs(way_box.ymax - way_box.ymin);
        const way_c = shape_center(way_box);
        const obstacles = obstacles_manager.get_obstacles(way_c.x, way_c.y, way_box_width + collision_radius * 2, way_box_height + collision_radius * 2);
        const collision_way = way_required;
        for (const obstacle of obstacles) {
            const offset_collision_lines = obstacles_manager.build_offsets(obstacle, collision_radius);
            for (const line of offset_collision_lines) {
                const intersections = intersect(collision_way, line);
                if (intersections.length > 0) {
                    let closest: { distance: number; way?: ISegment | IArc; point: IPoint } | undefined = undefined;
                    closest = get_closest_intersection(collision_way, intersections);
                    if (closest && closest.distance < shortest_distance) {
                        shortest_distance = closest.distance;
                        shortest_way = closest.way;
                        closest_obstacle = obstacle;
                        offset_collision_line = line;
                    }
                }
            }
        }

        // Если встречено препятствие, нужно определить расстояние, на котором нужно остановиться от него, чтобы не было точки соприкосновения
        if (closest_obstacle) {
            shortest_distance = shortest_distance - collision_min_error;
            shortest_distance = (shortest_distance > 0) ? shortest_distance : 0;
        }

        else
            shortest_distance = shape_length(way_required);

        if (offset_collision_line) {
            if (offset_collision_line.name == ShapeNames.Arc) {
                is_vertice = true;
                closest_point = shape_center(offset_collision_line);
            }
            else {
                is_vertice = false;
            }
        }
        return { obstacle: closest_obstacle, distance: shortest_distance, point: closest_point, way: shortest_way, is_vertice };
    }

    function get_closest_intersection(way: ISegment | IArc, intersections: IPoint[]) {
        const list: { distance: number, way?: ISegment | IArc, point: IPoint }[] = [];
        for (const point of intersections) {
            const sub_way = split(way, point)[0];
            if (!('null' in sub_way))
                list.push({ distance: shape_length(sub_way), way: sub_way, point });
            else
                list.push({ distance: 0, way: undefined, point });
        }
        list.sort((a, b) => a.distance - b.distance);
        return list[0];
    }

    function get_waypoint_on_interval(interval: ISegment | IArc, dt: number, current_speed: number) {
        const cosA = 1;
        const dist = cosA * dt * current_speed;
        const point = point_at_length(interval, dist);
        if (dist > shape_length(interval)) {
            const dist_remains = dist - shape_length(interval);
            const time_remains = dist_remains / cosA / current_speed;
            return { point, time_remains };
        }
        else {
            const time_remains = 0;
            return { point, time_remains };
        }
    }

    function find_current_interval(path: (ISegment | IArc)[], current_pos: IPoint) {
        for (let i = 0; i < path.length; i++) {
            if (shape_contains(path[i], current_pos))
                return i;
        }
        return -1;
    }

    function get_next_pos(path_data: PathData, current_pos: IPoint, dt: number, speed: number) {
        let _current_pos = current_pos;
        let _time_remains = dt;
        if (path_data.path.length == 0) {
            logger.warn("No path to get the next waypoint!");
            return _current_pos;
        }
        const id = find_current_interval(path_data.path, current_pos);
        if (id == -1) {
            logger.warn("current_pos doesn't belong to any path interval");
            return _current_pos;
        }
        const _path_intervals: (ISegment | IArc)[] = [];
        const current_interval_remains = split(path_data.path[id], _current_pos)[1];
        if (!('null' in current_interval_remains))
            _path_intervals.push(current_interval_remains);
        _path_intervals.push(...path_data.path.slice(id + 1));

        let i = 0;
        while (_time_remains > 0 && i < _path_intervals.length) {
            let interval = _path_intervals[i];
            const { point, time_remains } = get_waypoint_on_interval(interval, _time_remains, speed);
            _current_pos = point as IPoint;
            _time_remains = time_remains;
            if (!time_remains) {
                break;
            }
            i++;
        }
        return _current_pos;
    }
    
    function draw_obstacles(LD: TLinesDrawer, obstacles_lines: TDictionary<any>, obstacles_container: GoContainer) {
        const objects_dict = get_obstacles_manager()!.objects;
        for (const id in objects_dict) {
            const obstacles = objects_dict[id].obstacles;
            obstacles_lines[id] = [];
            for (const obst_id of obstacles) {
                const obstacle = get_obstacles_manager()!.get_obstacle_by_id(obst_id);
                if (obstacle) {
                    const line = LD.draw_line(obstacle, obstacles_container, COLORS.RED);
                    obstacles_lines[id].push(line);             
                }
            }
        }
    }

    function draw_path(LD: TLinesDrawer, player_way: GoContainer, path_data: PathData) {
        LD.clear_container(player_way);
        if (debug) {
            if (path_data.clear_way_nodes && path_data.blocked_way_nodes) {
                for (const way of path_data.blocked_way_nodes) {
                    if (way.arc) 
                        LD.draw_arc(way.arc, player_way, COLORS.ORANGE);
                    if (way.segment) 
                        LD.draw_line(way.segment, player_way, COLORS.ORANGE);
                }
                for (const way of path_data.clear_way_nodes) {
                    if (way.arc) 
                        LD.draw_arc(way.arc, player_way, COLORS.LIGHT_BLUE);
                    if (way.segment) 
                        LD.draw_line(way.segment, player_way, COLORS.LIGHT_BLUE);
                }
            }
            for (const interval of path_data.path) {
                if (interval.name == ShapeNames.Arc) 
                    LD.draw_arc(interval as IArc, player_way, COLORS.GREEN);
                else 
                    LD.draw_line(interval as ISegment, player_way, COLORS.GREEN);
            }
        }
    }

    return {
        update_path, get_next_pos,
        enable_collision, check_obstacles_enabled, 
        build_path_tree,
        get_obstacles_manager, find_clear_space, set_obstacles_manager, clear_obstacles_manager, 
        make_sideways, make_sideways_bypass_vertice, make_way_bypass_vertice, make_way, 
        draw_obstacles, draw_path
    };
}
