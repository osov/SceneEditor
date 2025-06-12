import { Arc, CCW, CW, Point, Segment, Vector, vector_from_points as vector, segment, arc, vec_angle, vector_from_points } from "./Geometry";
import { DP_TOL, EQ_0 } from "./utils";
import { ObstaclesManager } from "@editor/utils/obstacle_manager";
import { ClosestObstacleData, ControlType, NextMoveType, PlayerMovementSettings, PredictNextMoveData, PathData as PathData, WayNode } from "./types";


export type PathFinder = ReturnType<typeof PathFinderModule>;


export function PathFinderModule(settings: PlayerMovementSettings, obstacles_manager: ReturnType<typeof ObstaclesManager>) {
    const logger = Log.get_with_prefix('pathfinder')

    const max_intervals =  settings.max_predicted_way_intervals;
    const collision_min_error = settings.collision_min_error;
    const move_min_angle = settings.block_move_min_angle;
    const collision_radius = settings.collision_radius;
    const max_correction = settings.target_max_correction;
    const debug =  settings.debug;

    // Настройки геометрического поиска пути
    const max_checks = settings.max_checks_number;
    const max_checks_one_dir = settings.max_checks_one_dir;
    const max_depth = settings.max_depth;
    const max_way_length = settings.max_way_length;
    const max_update_time = settings.max_update_time;

    let checking_obstacles = true;

    function enable_collision(enable = true) {
        checking_obstacles = enable;
        logger.log(`Obstacles ${(enable) ? 'enabled' : 'disabled'}`)
    }
    function check_obstacles_enabled() {
        return checking_obstacles;
    }

    function update_path(way_required: Segment, control_type: ControlType) {
        const now = Date.now();
        const path_data: PathData = {path: [], length: 0};
        if (control_type == ControlType.JS || control_type == ControlType.FP)
            path_data.path.push(...predict_way(way_required, control_type));

        if (control_type == ControlType.GP) {
            const data = find_way(way_required);
            path_data.path = data.path;
            path_data.clear_way_nodes = data.clear_way_nodes;
            path_data.blocked_way_nodes = data.blocked_way_nodes;
            // Если не удалось определить путь через find_way, строим обычным способом
            if (path_data.path.length == 0)
                path_data.path.push(...default_update_way(way_required, ControlType.FP));
        }
        for (const elem of path_data.path)
            path_data.length += elem.length();
        log('update_path took time: ', Date.now() - now, ' ms');
        return path_data;
    }

    function default_update_way(way_required: Segment, control_type: ControlType) {
        return predict_way(way_required, control_type);
    }

    function find_clear_target(target: Point, checks_number = 4) {
        let clear_target_pos = target;
        const R = collision_radius + collision_min_error;
        const close_obstacles = obstacles_manager.get_obstacles(
            clear_target_pos.x, 
            clear_target_pos.y, 
            2 * (R + max_correction), 
            2 * (R + max_correction)
        );
        if (close_obstacles.length > 0) {
            let i = 0;
            let point_found = false
            while (i < checks_number && !point_found) {
                i ++;
                for (const obstacle of close_obstacles) {
                    const dist = clear_target_pos.distanceTo(obstacle);
                    const intersect_dist = R - dist[0];
                    if (dist[0] <= R && intersect_dist <= max_correction) {
                        const vec = dist[1].vector().normalize().invert().multiply(intersect_dist);
                        clear_target_pos = clear_target_pos.translate(vec);
                    }
                    else point_found = true;
                }
            }
        }
        return clear_target_pos;
    }

    function find_way(required_way: Segment) {
        log(`Start find_way`);
        const target = required_way.end;
        const start = required_way.start;
        let corrected_required_way = required_way;
        
        const clear_target = find_clear_target(target);
        if (clear_target) {
            corrected_required_way = Segment(start, clear_target);
        }
        else {
            if (debug) 
                logger.log('У цели пути нет свободного места!')
            return {path: [], blocked_way_nodes: [], clear_way_nodes: []};
        }
        // Строим дерево путей и получаем его конечные ноды.
        const {end_nodes, blocked_way_nodes, clear_way_nodes} = build_path_tree(corrected_required_way, max_checks);

        // Восстанавливаем полный путь до start.
        const path = path_from_tree(end_nodes);

        return {path, blocked_way_nodes, clear_way_nodes};
    }

    function path_from_tree(end_nodes: WayNode[]) {
        const path: (Segment | Arc)[] = [];
        let min_length = Infinity;
        let min_length_node: WayNode | undefined = undefined;
        if (end_nodes.length > 0) {
            for (const node of end_nodes) {
                if (node.total_length < min_length) {
                    min_length = node.total_length;
                    min_length_node = node;
                }
            }
        }
        if (min_length_node != undefined) {
            let node: WayNode | undefined = min_length_node;
            while (node) {
                if (node.segment) path.push(node.segment as Segment);
                if (node.arc) path.push(node.arc);
                node = node.parent;
            }
        }
        path.reverse();
        return path;
    }

    function build_path_tree(way_required: Segment, max_checks: number) {
        const target = way_required.end;
        const checked_obstacles: {obstacles: Segment[], start_pos: Point}[] = [];
        const ways_to_check: WayNode[] = [];
        const way_tree_root: WayNode = {
            children: [], 
            depth: 0, 
            total_length: 0
        };
        const end_nodes: WayNode[] = []; 
        const clear_way_nodes: WayNode[] = [];
        const blocked_way_nodes: WayNode[] = [];
        const way_required_node: WayNode = {
            segment: way_required, 
            children: [], 
            parent: way_tree_root,
            depth: 1, 
            total_length: way_required.length()
        };
        way_tree_root.children.push(way_required_node);

        ways_to_check.push(way_required_node);
        let checks_number = 0;
        const time = Date.now();
        let time_elapsed = 0;

        // Пока есть пути, которые нужно проверить, при этом не превысили ограничений по числу проверок:
        while (ways_to_check.length > 0 && checks_number <= max_checks && time_elapsed <= max_update_time) {
            const way_to_check = ways_to_check.splice(0, 1)[0] as WayNode;
            // const way_to_check = ways_to_check.pop() as WayNode;
            const result = check_way_node(way_to_check, target, checked_obstacles);
            ways_to_check.push(...result.ways_to_check);
            end_nodes.push(...result.end_nodes);
            clear_way_nodes.push(...result.clear_way_nodes);
            blocked_way_nodes.push(...result.blocked_way_nodes);
            checks_number ++;
            time_elapsed = Date.now() - time;
            if (end_nodes.length > 0) break;
        }
        return {end_nodes, clear_way_nodes, blocked_way_nodes};
    }

    /**
     * Для поиска пути: достаёт массив препятствий, к которым уже были построены обходные пути из указанной start_pos, создаёт новый массив, если он не был найден
     */
    function get_checked_obstacles(checked_obstacles: {obstacles: Segment[], start_pos: Point}[], start_pos: Point): Segment[] {
        let found_entry: Segment[] | undefined;
        let result: Segment[];
        for (const entry of checked_obstacles) {
            if (entry.start_pos.equalTo(start_pos)) {
                found_entry = entry.obstacles;
            }
        }
        if (!found_entry) {
            const new_entry = {obstacles: [], start_pos}
            checked_obstacles.push(new_entry);
            result = new_entry.obstacles;
        }
        else result = found_entry;
        return result;
    }

    function check_way_node(way: WayNode, target: Point, checked_obstacles: {obstacles: Segment[], start_pos: Point}[]) {
        const ways_to_check: WayNode[] = [];
        const end_nodes: WayNode[] = [];
        const clear_way_nodes: WayNode[] = [];
        const blocked_way_nodes: WayNode[] = [];

        // Если глубина либо длина полного пути данной ноды больше максимальной, пропускаем проверку, саму ноду нигде не учитываем. 
        // TODO: можно добавлять её в список blocked_way_nodes или отдельный для отображения
        if (way.total_length > max_way_length || way.depth > max_depth) {
            return {ways_to_check, end_nodes, clear_way_nodes, blocked_way_nodes}
        } 

        const arc = way.arc;
        const segment = way.segment;
        const previous_vertice = way.previous_vertice;
        const previous_clockwise = way.previous_clockwise;
        const next_vertice = way.next_vertice;
        const next_clockwise = way.next_clockwise;
        let arc_collision = false;
        let segment_collision = false;

        // Стартовая позиция ноды - начало дуги обхода вершины препятствия, либо, если её нет, начало сегмента пути.
        let start = (arc) ? arc.start() : segment!.start;
        let end = segment!.end;

        // Если у данной ноды есть дуга пути обхода предыдущей вершины, проверяем наличие её пересечений с препятствиями
        if (arc) {
            const obstacle = find_closest_obstacle(arc).obstacle;
            if (obstacle) {
                arc_collision = true;
                const checked = get_checked_obstacles(checked_obstacles, arc.start());

                // Если есть пересечение с препятствием и к данному препятствию еще не строили обходных путей из стартовой позиции этой ноды:
                if (!checked.includes(obstacle)) {
                    let sideways: WayNode[];

                    // Если не указана вершина предыдущего препятствия, создаём ноды с обходными путями к препятствию напрямую их стартовой позиции этой ноды:
                    // TODO: Раз имеем дело с дугой обхода вершины, previous_vertice никогда не будет undefined? Возможно стоит убрать make_sideways 
                    if (!(previous_vertice && previous_clockwise != undefined)) {
                        sideways = make_sideways(
                            start,
                            end,
                            obstacle, 
                            way.parent,
                            collision_radius + collision_min_error,
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
                            way.parent,
                            collision_radius + collision_min_error
                        );
                    }
                    checked.push(obstacle);

                    // Добавляем новые ноды в список для проверки
                    for (const sideway of sideways) {
                        ways_to_check.push(sideway);
                    }
                }
            }
        }
        
        // Если у данной ноды есть сегмент (прямой отрезок) пути и не было пересечений с дугой пути, проверяем наличие пересечений сегмента с препятствиями
        if (segment && !arc_collision) {
            const obstacle = find_closest_obstacle(segment).obstacle;
            if (obstacle) {
                segment_collision = true;
                const checked = get_checked_obstacles(checked_obstacles, segment.start);

                // Если есть пересечение с препятствием и к данному препятствию еще не строили обходных путей из стартовой позиции этой ноды:
                if (!checked.includes(obstacle)) {
                    let sideways: WayNode[];
                    if (!(previous_vertice && previous_clockwise != undefined)) {
                        sideways = make_sideways(
                            start, 
                            end,
                            obstacle,
                            way.parent,
                            collision_radius + collision_min_error,
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
                            way.parent,
                            collision_radius + collision_min_error
                        );
                    }
                    checked.push(obstacle);

                    // Добавляем новые ноды в список для проверки
                    for (const sideway of sideways) {
                        ways_to_check.push(sideway);
                    }
                }
            }
        }

        // Если пересечений элементов пути этой ноды с препятствиями не было, и конечная точка ноды совпадает с target, добавляем её в список конечных нод
        // Иначе создаём новую ноду с началом пути в конечной точки этой ноды и добавляем её в список для проверки. 
        if (!(arc_collision || segment_collision) && segment) {
            clear_way_nodes.push(way);
            if (segment.end == target) {
                end_nodes.push(way);
            }
            else if (next_vertice && next_clockwise != undefined) {
                const next_way: WayNode = make_way_bypass_vertice(
                    segment.end, 
                    target, 
                    next_vertice, 
                    next_clockwise,
                    way
                )
                ways_to_check.push(next_way);
            }
        }

        // Если было пересечение, добавляем в список блокированных путей, 
        else
            blocked_way_nodes.push(way);

        return {ways_to_check, end_nodes, clear_way_nodes, blocked_way_nodes};
    }

    /**
     * Построение пути WayNode для обхода препятствия, из одного сегмента (отрезка), начало в точке start, конец в точке касания с 
     * окружностью радиусом collision_radius и центром в target_vertice. Направление обхода передаётся в clockwise.
     * @param start стартовая точка
     * @param target_vertice вершина, к которой строим путь
     * @param collision_radius расстоянение столкновения
     * @param clockwise направление обхода
     * @param parent_node
     * @returns WayNode
     */
    function make_way(start: Point, target_vertice: Point, collision_radius: number, clockwise: boolean, parent_node?: WayNode) {
        let temp_segment = Segment(start, target_vertice);
        let angle = Math.asin(collision_radius / temp_segment.length()) + Math.PI / 2;
        angle = (clockwise) ? angle : -angle;
        let temp_vec = temp_segment.vector().rotate(angle).normalize().multiply(collision_radius);
        const way_end = target_vertice.translate(temp_vec);
        const segment = Segment(start, way_end);
        const node: WayNode = {
            segment, 
            parent: parent_node,
            children: [],
            depth: (parent_node) ? parent_node.depth + 1 : 0,
            total_length: (parent_node) ? parent_node.total_length + segment.length() : segment.length(),
            previous_vertice: parent_node?.previous_vertice, 
            previous_clockwise: parent_node?.previous_clockwise,
            next_vertice: target_vertice, 
            next_clockwise: clockwise,
        };
        if (parent_node)
            parent_node.children.push(node);
        return node;
    }

    /**
     * Построение двух вариантов обхода препятствия из стартовой точки. В отличие от make_all_sideways строит только два необходимых отрезка вместо четырёх
     * @param start стартовая точка
     * @param target цель к которой пытались построить путь без учёта этого препятствия
     * @param obstacle препятствие, к которому строим обходные пути
     * @param parent_node
     * @param collision_radius 
     * @returns [WayNode, WayNode]
     */
    function make_sideways(start: Point, target: Point, obstacle: Segment, parent_node: WayNode | undefined, collision_radius: number) {
        const target_vec = vector_from_points(start, target);
        const vec_l = vector_from_points(start, obstacle.start);
        const vec_r = vector_from_points(start, obstacle.end);
        const result: WayNode[] = [];
        let angle_l = (!EQ_0(vec_l.length())) ? vec_angle(target_vec, vec_l) : 0;
        let angle_r = (!EQ_0(vec_r.length())) ? vec_angle(target_vec, vec_r) : 0;
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
        if (vec_l.length() > collision_radius - collision_min_error) {
            // Если расстояние больше радиуса столкновения, строим отрезок
            if (vec_l.length() > collision_radius) {
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
                ))
            }
        }
        
        if (vec_r.length() > collision_radius - collision_min_error) {
            if (vec_r.length() > collision_radius) {
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
                ))
            }
        }
        return result;
    }
    

    /**
     * Строит все варианты путей с касательными отрезками из точки start к окуружностям с collision_radius на вершинах сегмента препятствия
     */
    function make_all_sideways(start: Point, target: Point, obstacle: Segment, parent_node: WayNode | undefined, collision_radius: number) {
        const result: WayNode[] = [];
        for (const dir of [CCW, CW]) {
            for (const vertice of [obstacle.start, obstacle.end]) {
                const dist = vector_from_points(start, vertice).length();
                // Проверяем, на каком расстоянии от вершины препятствия находится start
                if (dist > collision_radius - collision_min_error) {
                    let node: WayNode;
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
                        )
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
    function make_sideways_bypass_vertice(start: Point, target: Point, obstacle: Segment, vertice: Point, clockwise = CW, parent_node?: WayNode, collision_radius?: number) {
        const result: WayNode[] = [];
        const R = (collision_radius) ? collision_radius : start.distanceTo(vertice)[0];
        const arc_start_vec = vector_from_points(vertice, start);
        const vertice_l = obstacle.start;
        const vertice_r = obstacle.end;
        let vec_l = vector_from_points(vertice, vertice_l);
        let vec_r = vector_from_points(vertice, vertice_r);
        const target_vec = vector_from_points(start, target);
        
        // В зависимости положения вершин препятствия относительно вектора направления желаемого движения target_vec, определяем направление обхода этих вершин
        let same_side_touch_vertice: Point;
        let diff_side_touch_vertice: Point;
        if (vec_l.length() != 0 && vec_r.length() != 0) {
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
        else if (vec_l.length() == 0) {
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
        if (!EQ_0(vert_to_vert.length())) {
            let prev_vertice = parent_node?.previous_vertice;
            let prev_segment = parent_node?.segment;
            let prev_arc = parent_node?.arc;
            let way_diff_angle = 0;
            
            // Проверяем, отклоняется ли путь на больший угол от желаемого направления, чем путь ноды-родителя. 
            // Если да, нужно определить, как строить этот путь. Присоединять его будем к родителю полученной ноды-родителя
            if (prev_segment && !EQ_0(prev_segment.length())) {
                way_diff_angle = vec_angle(vert_to_vert.vector(), prev_segment.vector());
            }
            if (prev_segment && ((way_diff_angle < 0 && clockwise) || (way_diff_angle > 0 && !clockwise))) {
                const dist = vector_from_points(prev_segment.start, same_side_touch_vertice).length();
                if (dist > R - collision_min_error) {
                    let nodes: WayNode[] = [];
                    // Если у родителя указана предыдущая вершина, будем перестраивать новый путь с помощью данной функцией от начала дуги родителя.
                    if (prev_vertice) {
                        nodes = make_sideways_bypass_vertice(
                            prev_arc!.start(),
                            target, 
                            obstacle,
                            prev_vertice,
                            clockwise,
                            parent_node?.parent,
                            R
                        )
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
                            prev_arc!.start(), 
                            target, 
                            same_side_touch_vertice,
                            clockwise,
                            parent_node?.parent
                        ))
                    }
                }
            }

            // Если путь не будет отклоняться сильнее предыдущего пути, строим дугу для обхода вершины
            else {
                const obstacle_vec = vector_from_points(same_side_touch_vertice, diff_side_touch_vertice);
                const obstacle_norm = (!clockwise) ? obstacle_vec.rotate90CCW() : obstacle_vec.rotate90CW();

                const vec_S = vert_to_vert.vector().normalize().multiply(R);
                const vec_S_norm = (!clockwise) ? vec_S.rotate90CCW() : vec_S.rotate90CW();

                // Конец пути в точке:
                const end_S_point = same_side_touch_vertice.translate(vec_S_norm);
                const start_angle = arc_start_vec.slope();
                let end_angle = vec_S_norm.slope();

                // TODO: Возможно стоит останавливаться до столкновения с самим обходимым препятствием
                // end_angle = (obstacle_block_angle < end_angle && end_angle < obstacle_block_angle + Math.PI) ? obstacle_block_angle : end_angle;
                const arc_clockwise = ((start_angle > end_angle && !clockwise) || (start_angle < end_angle && clockwise)) ? !clockwise : !clockwise;
                const way_S_arc = Arc(vertice, arc_start_vec.length(), start_angle, end_angle, arc_clockwise);
                const way_S_segment = Segment(way_S_arc.end(), end_S_point);
                const length_S = way_S_arc.length() + way_S_segment.length();
                const node_S: WayNode = {
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

        // Путь пролегает между этими вершинами. Проверяем что расстояние между ними больше двух радиусов столкновения, иначе строить путь нет смысла.
        if (vert_to_vert.length() > 2 * R) {
            const obstacle_vec = vector_from_points(diff_side_touch_vertice, same_side_touch_vertice);
            const obstacle_norm = (!clockwise) ? obstacle_vec.rotate90CW() : obstacle_vec.rotate90CCW();
            const obstacle_block_angle = obstacle_norm.slope();
            
            let angle = Math.acos(2 * R / vert_to_vert.length());
            const vec_D = vert_to_vert.vector().normalize().multiply(R); 
            const vec_D_norm = (!clockwise) ? vec_D.rotate(-angle) : vec_D.rotate(angle);

            // Конец пути в точке:
            const end_D_point = diff_side_touch_vertice.translate(vec_D_norm.invert());
            const start_angle = arc_start_vec.slope();
            let end_angle = vec_D_norm.slope();
            // end_angle = (obstacle_block_angle < end_angle && end_angle < obstacle_block_angle + Math.PI) ? obstacle_block_angle : end_angle;
            const arc_clockwise = !clockwise;
            const way_D_arc = Arc(vertice, arc_start_vec.length(), start_angle, end_angle, arc_clockwise);
            const way_D_segment = Segment(way_D_arc.end(), end_D_point);
            const length_D = way_D_arc.length() + way_D_segment.length();
            const node_D: WayNode = {
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
    function make_way_bypass_vertice(start: Point, target: Point, vertice: Point, clockwise = CW, parent_node?: WayNode, collision_radius?: number) {
        const R = (collision_radius) ? collision_radius : start.distanceTo(vertice)[0];
        const arc_start_vec = vector_from_points(vertice, start);
        const vert_to_target = Segment(vertice, target);
        const angle = Math.acos(R / vert_to_target.length()) + DP_TOL;
        const vec = vert_to_target.vector().normalize().multiply(R); 
        const vec_norm = (clockwise) ? vec.rotate(angle) : vec.rotate(-angle);
        const start_angle = arc_start_vec.slope();
        const end_angle = vec_norm.slope();
        const arc_clockwise = !clockwise;
        
        const arc = Arc(vertice, arc_start_vec.length(), start_angle, end_angle, arc_clockwise);
        const segment = Segment(arc.end(), target);
        const length = arc.length() + segment.length();
        const node: WayNode = {
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

    function predict_way(way_required: Segment, control_type: ControlType) {
        const way: (Segment | Arc)[] = [];
        let lenght_remains = way_required.length();
        const data: PredictNextMoveData = {next_do: NextMoveType.STRAIGHT_LINE, way_required, lenght_remains, control_type};
        let counter = 0;
        log(`Start predict_way`)
        while (data.lenght_remains >= collision_min_error && counter < max_intervals) {
            if (debug)  {
                log(`Next move in predicted way:`, NextMoveType[data.next_do]);   
            }
            if (data.next_do == NextMoveType.STRAIGHT_LINE) {
                linear_move(way, data);
            }
            else if (data.next_do == NextMoveType.BYPASS_ANGLE) {
                bypass_vertice(way, data);
            }
            else if (data.next_do == NextMoveType.SLIDE_OBSTACLE) {
                slide_obstacle(way, data);
            }
            else if (data.next_do == NextMoveType.STOP) break;
            counter ++;
        }
        return way;
    }

    function _get_correction_angle(pos: Point, vertice: Point, way_req: Segment) {
        let correction_angle = 0;
        const pos_to_vert_vec = vector(pos, vertice);
        const vert_to_tar_vec = vector(vertice, way_req.end);
        const pos_target_vec = way_req.vector().invert();
        correction_angle = Math.asin(pos_to_vert_vec.length() / vert_to_tar_vec.length()) - Math.abs(vec_angle(pos_target_vec, vert_to_tar_vec.invert()));
        return correction_angle;
    }

    function _correct_vec_angle_to_dir(vec: Vector, data: PredictNextMoveData, rotate_dir: boolean) {
        let correction_angle = 0;
        let end_vec = vec;
        if (data.control_type == ControlType.JS) {
            correction_angle = 0;
        }
        else if (data.control_type == ControlType.FP) {
            correction_angle =  _get_correction_angle(data.way_required.start, data.vertice_to_bypass as Point, data.way_required);
        }
        if (correction_angle) end_vec = (rotate_dir) ? end_vec.rotate(-correction_angle) : end_vec.rotate(correction_angle);
        // log('correction_angle',  radToDeg(correction_angle));
        // log('corrected_end_angle',  radToDeg(end_vec.slope));
        return end_vec;
    }

    function _get_new_target(pos: Point, new_pos: Point, old_target: Point) {
        const d_vec = vector(pos, new_pos);
        return old_target.translate(d_vec);
    }

    function bypass_vertice(way: (Segment | Arc)[], data: PredictNextMoveData) {
        const obstacle = data.obstacle_to_slide as Segment;
        const vertice = data.vertice_to_bypass as Point;
        const ostacle_vec = (vertice.equalTo(obstacle.start)) ? obstacle.vector() : obstacle.vector().invert();
        const s_pos = data.way_required.start;
        const pos_to_vertice_vec = vector(s_pos, vertice);
        const dir_diff_start_angle = vec_angle(data.way_required.vector(), pos_to_vertice_vec);
        const rotate_dir = (dir_diff_start_angle < 0) ? CW : CCW;
        let obstacle_limit_vec = (rotate_dir) ? ostacle_vec.rotate90CW() : ostacle_vec.rotate90CCW();
        let start_vec = pos_to_vertice_vec.invert();
        let end_vec = (rotate_dir) ? data.way_required.vector().rotate90CW() : data.way_required.vector().rotate90CCW();
        let _end_angle = end_vec.slope();
        let allowed_way = undefined;

        end_vec = _correct_vec_angle_to_dir(end_vec, data, rotate_dir);
        
        // Проверяем, что при обходе угла не столкнулись с препятствием, край которого сейчас обходим, если столкнулись ограничиваем угол обхода
        let blocked_by_current_obstacle = false;
        let excess_rotation_angle = (rotate_dir) ? vec_angle(end_vec, obstacle_limit_vec) : vec_angle(obstacle_limit_vec, end_vec);
        if (excess_rotation_angle > 0) {
            end_vec = obstacle_limit_vec;
            blocked_by_current_obstacle = true;
        }

        let start_angle = start_vec.slope();
        let end_angle = end_vec.slope();

        // Дуга пути, чтобы обойти угол и выйти на нужную траекторию:
        const way_arc_full = arc(vertice, pos_to_vertice_vec.length(), start_angle, end_angle, !rotate_dir);
        let way_arc = way_arc_full;
        if (!check_collision_angle_ok(data.way_required.vector(), way_arc)) {
            data.next_do = NextMoveType.STOP;    
            return;          
        }

        // Если длина дуги больше оставшейся для расчётов длины пути, ограничиваем дугу этой длиной
        if (data.lenght_remains < way_arc_full.length())
            way_arc = way_arc_full.splitAtLength(data.lenght_remains)[0] as Arc;
        
        // Далее ищем пересечения дуги с остальными препятствиями
        const closest = find_closest_obstacle(way_arc);
        if (closest.obstacle && closest.obstacle != obstacle) {
            let distance_before_collision = closest.distance;
            if (distance_before_collision < 0) {
                distance_before_collision = 0;
            }
            const way_segments = way_arc.splitAtLength(distance_before_collision);
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
            if (data.lenght_remains < way_arc_full.length()) {
                data.next_do = NextMoveType.STOP; 
            }
            else if (blocked_by_current_obstacle) 
                data.next_do = NextMoveType.SLIDE_OBSTACLE;
            else {
                data.next_do = NextMoveType.STRAIGHT_LINE;
            }
            data.lenght_remains -= way_arc.length(); 
            allowed_way = way_arc;
        }
        
        if (allowed_way) {
            if (data.control_type == ControlType.JS) {
                const new_target = _get_new_target(s_pos, allowed_way.end(), data.way_required.end);
                data.way_required = segment(allowed_way.end().x, allowed_way.end().y, new_target.x, new_target.y);
            }
            else if (data.control_type == ControlType.FP) {
                const new_target =  data.way_required.end;
                data.way_required = segment(allowed_way.end().x, allowed_way.end().y, new_target.x, new_target.y);
            }
            way.push(allowed_way);
        }
    }

    function slide_obstacle(way: (Segment | Arc)[], data: PredictNextMoveData) {
        const obstacle = data.obstacle_to_slide as Segment;
        const s_pos = data.way_required.start;
        const distance_segment = s_pos.distanceTo(obstacle)[1];
        const translate_vec = distance_segment.vector().invert();
        const slide_l = segment(distance_segment.end.x, distance_segment.end.y, obstacle.start.x, obstacle.start.y);
        const slide_r = segment(distance_segment.end.x, distance_segment.end.y, obstacle.end.x, obstacle.end.y);
        const angle_l = (!EQ_0(slide_l.length())) ? Math.abs(vec_angle(data.way_required.vector(), slide_l.vector())) : 2 * Math.PI;
        const angle_r = (!EQ_0(slide_r.length())) ? Math.abs(vec_angle(data.way_required.vector(), slide_r.vector())) : 2 * Math.PI;
        const slide = (angle_l < angle_r) ? slide_l : slide_r;
        const d_angle = Math.abs(vec_angle(slide.vector(), data.way_required.vector()));
        let allowed_way = undefined;

        // Требуемый путь, чтобы добраться до края препятствия:
        let way_required_to_slide = slide.translate(translate_vec);

        if (!check_collision_angle_ok(data.way_required.vector(), way_required_to_slide)) {
            data.next_do = NextMoveType.STOP;    
            return;                  
        }
        // Оставшееся расстояние может закончиться раньше, чем добрались до края препятствия:
        const max_slide_distance = (data.control_type == ControlType.FP) ?data.lenght_remains * Math.cos(d_angle) : data.lenght_remains;
        way_required_to_slide = way_required_to_slide.splitAtLength(max_slide_distance)[0] as Segment;
        if (EQ_0(max_slide_distance)) {
            data.next_do = NextMoveType.STOP; 
            return;
        }
        const closest = find_closest_obstacle(way_required_to_slide);
        if (closest.obstacle) {
            let distance_before_collision = closest.distance;
            if (distance_before_collision < 0) {
                distance_before_collision = 0;
            }
            const way_segments = way_required_to_slide.splitAtLength(distance_before_collision);
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
            if (max_slide_distance < slide.length()) {
                data.lenght_remains = 0; 
                data.next_do = NextMoveType.STOP; 
            }
            else {
                data.lenght_remains -= (slide.length() / Math.cos(d_angle));
                data.vertice_to_bypass = slide.end;
                data.next_do = NextMoveType.BYPASS_ANGLE;
            }
            allowed_way = way_required_to_slide;
        }
        if (allowed_way) {
            if (data.control_type == ControlType.JS) {
                const new_target = _get_new_target(s_pos, allowed_way.end, data.way_required.end);
                data.way_required = segment(allowed_way.end.x, allowed_way.end.y, new_target.x, new_target.y);
            }
            else if (data.control_type == ControlType.FP) {
                const new_target =  data.way_required.end;
                data.way_required = segment(allowed_way.end.x, allowed_way.end.y, new_target.x, new_target.y);
            }
            way.push(allowed_way);
        }
    }

    function linear_move(way: (Segment | Arc)[], data: PredictNextMoveData) {
        data.obstacle_to_slide = undefined;
        data.vertice_to_bypass = undefined;
        const closest = find_closest_obstacle(data.way_required);
        let allowed_way = undefined;
        if (closest.obstacle) { 
            let distance_before_collision = closest.distance;
            if (distance_before_collision < 0) {
                distance_before_collision = 0;
            }
            const way_segments = data.way_required.splitAtLength(distance_before_collision);
            allowed_way = way_segments[0];
            data.way_required = way_segments[1] as Segment;
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
            allowed_way = data.way_required;
        }
        if (allowed_way) {
            way.push(allowed_way);
        }
    }

    function check_collision_angle_ok(direction_required: Vector, way: Segment | Arc) {
        let collision_angle: number | undefined = undefined;
        if (way.name == "segment") {
            const way_segment = way as Segment;
            collision_angle = Math.PI / 2 - Math.abs(vec_angle(direction_required, way_segment.vector())); 
        }
        if (way.name == "arc") {
            const way_arc = way as Arc;
            collision_angle = Math.PI / 2 - Math.abs(vec_angle(direction_required, way_arc.tangentInStart())); 
        }
        if (collision_angle) return (collision_angle) > move_min_angle;
        return false;
    }
    
    function find_closest_obstacle(way_required: Segment | Arc): ClosestObstacleData {
        let shortest_distance = Infinity;
        let closest_point: Point | undefined = undefined;
        let closest_obstacle: Segment | undefined = undefined;
        let shortest_way: Segment | Arc | undefined = undefined;
        let is_vertice: boolean = false;
        let offset_collision_line: Segment | Arc | undefined = undefined;
        if (!checking_obstacles) return {obstacle: closest_obstacle, distance: way_required.length(), point: closest_point, way: shortest_way, is_vertice};
        const way_box = way_required.box();
        const way_c = way_box.center();
        const obstacles = obstacles_manager.get_obstacles(way_c.x, way_c.y, way_box.width + collision_radius * 2, way_box.height + collision_radius * 2);
        const collision_way = way_required;
        for (const obstacle of obstacles) {
            const offset_collision_lines = obstacles_manager.build_offsets(obstacle, collision_radius);
            for (const line of offset_collision_lines) {
                const intersections = collision_way.intersect(line);
                if (intersections.length > 0) {
                    let closest: { distance: number; way?: Segment | Arc; point: Point } | undefined = undefined;
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
            shortest_distance = way_required.length();

        if (offset_collision_line) {
            if (offset_collision_line.name == "arc") {
                is_vertice = true;
                closest_point = offset_collision_line.center();
            }
            else {
                is_vertice = false;
            }
        }
        return {obstacle: closest_obstacle, distance: shortest_distance, point: closest_point, way: shortest_way, is_vertice};
    }

    function get_closest_intersection(way: Segment | Arc, intersections: Point[]) {
        const list: {distance: number, way?: Segment | Arc, point: Point}[] = [];
        for (const point of intersections) {
            const sub_way = way.split(point)[0];
            if (sub_way)
                list.push({distance: sub_way.length(), way: sub_way, point});
            else
                list.push({distance: 0, way: undefined, point});
        }
        list.sort((a, b) => a.distance - b.distance);
        return list[0];
    }

    function get_waypoint_on_interval(interval: Segment | Arc, dt: number, current_speed: number) {
        const cosA = 1;
        const dist = cosA * dt * current_speed;
        const point = interval.pointAtLength(dist);
        if (dist > interval.length()) {
            const dist_remains = dist - interval.length();
            const time_remains = dist_remains / cosA / current_speed;
            return {point, time_remains};
        }
        else {
            const time_remains = 0
            return {point, time_remains};
        }
    }

    function get_pos_at_ratio(path_data: PathData, _ratio: number) {
        if (path_data.path.length == 0) {
            logger.warn("No path to get the next waypoint!");
            return undefined;
        };
        let ratio = (_ratio > 1) ? 1 : _ratio;
        ratio = (_ratio < 0) ? 0 : _ratio;
        let length_remains = path_data.length * ratio;
        for (const interval of path_data.path) {
            if (length_remains < interval.length()) {
                return interval.pointAtLength(length_remains);
            }
            else {
                length_remains -= interval.length();
            }
        }
        let interval = path_data.path[0];
        let start = (interval.name == 'segment') ? (interval as Segment).start : (interval as Arc).start();
        return start;
    }

    function find_current_interval(path: (Segment | Arc)[], current_pos: Point) {
        for (let i = 0; i < path.length; i++) {
            if (path[i].contains(current_pos)) 
                return i;
        }
        return -1;
    }
    
    function get_next_pos(path_data: PathData, current_pos: Point, dt: number, speed: number) {
        let _current_pos = current_pos;
        let _time_remains = dt;
        if (path_data.path.length == 0) {
            logger.warn("No path to get the next waypoint!");
            return _current_pos;
        };
        const id = find_current_interval(path_data.path, current_pos);
        if (id == -1) {
            logger.warn("current_pos doesn't belong to any path interval");
            return _current_pos;
        }
        const _path_intervals: (Segment | Arc)[] = [];
        const current_interval_remains = path_data.path[id].split(_current_pos)[1];
        if (current_interval_remains)
            _path_intervals.push(current_interval_remains);
        _path_intervals.push(...path_data.path.slice(id + 1));

        let i = 0;
        while (_time_remains > 0 && i < _path_intervals.length) {
            let interval = _path_intervals[i];
            const {point, time_remains} = get_waypoint_on_interval(interval, _time_remains, speed);
            _current_pos = point as Point;
            _time_remains = time_remains;
            if (!time_remains) {
                break;
            }
            i ++;
        }
        return _current_pos;
    }

    function way_from_angle(cp: Point, angle: number, length: number) {
        const dir = Vector(1, 0).rotate(angle);
        const ep = cp.translate(dir.multiply(length));
        return Segment(Point(cp.x, cp.y), Point(ep.x, ep.y));
    }

    function path_to_points(path: (Segment | Arc)[], step: number) {
        let length_left = 0;
        const result: Point[] = [];
        if (path.length == 0) return result;
        const first = path[0];
        result.push(first.pointAtLength(0) as Point)
        for (let interval of path) {
            const length = interval.length();
            if (length < step) {
                length_left += length;
            }
            else if (length >= step) {
                const point = interval.pointAtLength(step - length_left) as Point;
                result.push(point);
                let total_length = step - length_left + step;
                while (total_length < length) {
                    const point = interval.pointAtLength(total_length) as Point;
                    result.push(point);
                    total_length += step;
                }
                length_left = length - total_length + step;
            }
        }
        const last = path[path.length-1];
        result.push(last.pointAtLength(last.length()) as Point)
        return result;
    }
    
    return { update_path, get_next_pos, get_pos_at_ratio,
        enable_collision, check_obstacles_enabled,
        build_path_tree, way_from_angle, path_to_points,
        obstacles_manager,
    }
}

