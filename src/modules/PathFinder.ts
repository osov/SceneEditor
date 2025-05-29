import { Arc, CCW, CW, Point, Segment, Vector, point, vector_from_points as vector, segment, arc, vec_angle, PointLike } from "./Geometry";
import { PlayerMovementSettings, ControlType, SubGridParams, default_obstacle_grid, default_settings } from "../modules_editor/PlayerMovement";
import { EQ_0 } from "./utils";
import { ObstaclesGrid, ObstaclesManager } from "@editor/utils/obstacle_manager";
import { AStarFinder } from 'astar-typescript';


export type PathFinder = ReturnType<typeof PathFinderModule>;

type PredictNextMoveData = {
    next_do: NextMoveType, 
    way_required: Segment,
    lenght_remains: number,
    vertice_to_bypass?: Point,
    prev_vertice?: Point,
    obstacle_to_slide?: Segment,
    prev_obstacle?: Segment,
    control_type: ControlType,
}

type ClosestObstacleData = {
    obstacle?: Segment,
    distance: number,
    point?: Point,
    way?: Segment | Arc,
    is_vertice: boolean,
}

type WayTreeNode = {
    interval: Arc | Segment,
    total_length: number,
    depth: number,
    children: WayTreeNode[],
    parent?: WayTreeNode,
}

enum NextMoveType {
    STRAIGHT_LINE,
    SLIDE_OBSTACLE,
    BYPASS_ANGLE,
    STOP,
}

const point_zero = point(0, 0);


export function PathFinderModule(settings: PlayerMovementSettings, obstacles_manager: ReturnType<typeof ObstaclesManager>) {
    const logger = Log.get_with_prefix('pathfinder')
    const max_intervals =  settings.max_predicted_way_intervals;
    const collision_min_error = settings.collision_min_error;
    const blocked_move_min_dist = settings.blocked_move_min_dist;
    const move_min_angle = settings.block_move_min_angle;
    const max_try_dist = settings.max_try_dist;
    const collision_radius = settings.collision_radius;
    const debug =  settings.debug;
    const way: (Segment | Arc)[] = [];
    const max_subgrid_size = settings.max_subgrid_size;
    const min_subgrid_size = settings.min_subgrid_size;
    const max_grid_pathway = 300;
    let _way_tree: WayTreeNode | undefined = undefined;
    let _way_total_length = 0;
    let current_pos = point_zero;
    let current_target = point_zero;
    let checking_obstacles = true;

    function enable_obstacles(enable = true) {
        checking_obstacles = enable;
        logger.log(`Obstacles ${(enable) ? 'enabled' : 'disabled'}`)
    }
    function check_obstacles_enabled() {
        return checking_obstacles;
    }

    function update_way_tree(way_required: Segment, pointer_control: ControlType) {
        clear_way();
        const start_length_remains = way_required.length();

    }

    function _next_nove(data: PredictNextMoveData, parent?: WayTreeNode) {
        if (parent && max_intervals == parent.depth) return;
        if (debug)  {
            logger.log(`Next move in predicted way:`, NextMoveType[data.next_do]);   
        }
        let interval: Arc | Segment | null;
        const depth = parent ? parent.depth + 1 : 1;
        let total_length = parent ? parent.total_length : 0;
        if (data.next_do == NextMoveType.STRAIGHT_LINE) {
            interval = linear_move_recursive(data, parent);
        }
        // else if (data.next_do == NextMoveType.BYPASS_ANGLE) {
        //     interval = bypass_vertice_recursive(data, parent);
        // }
        // if (interval) {
        //     total_length += interval.length();
        //     const child: WayTreeNode = {interval, total_length, depth, children: [], parent};
        //     if (parent) parent.children.push(child);
        // }
    }

    function linear_move_recursive(data: PredictNextMoveData, parent?: WayTreeNode): Segment | null {
        const closest = find_closest_obstacle(data.way_required);
        let allowed_way = undefined;
        let next_do = NextMoveType.STOP;
        let way_required = data.way_required;
        let lenght_remains = data.lenght_remains;
        let obstacle_to_slide: Segment | undefined = undefined;
        if (!closest.obstacle) { 
            lenght_remains = 0; 
            allowed_way = data.way_required;
        }
        else {
            let distance_before_collision = closest.distance;
            if (distance_before_collision < 0) {
                distance_before_collision = 0;
            }
            const way_segments = data.way_required.splitAtLength(distance_before_collision);
            allowed_way = way_segments[0];
            way_required = way_segments[1] as Segment;
            obstacle_to_slide = closest.obstacle;
            lenght_remains -= distance_before_collision;
            if (closest.is_vertice) {
                data.vertice_to_bypass = closest.point;
                next_do = NextMoveType.BYPASS_ANGLE; 
            } 
            else {
                next_do = NextMoveType.SLIDE_OBSTACLE;
            }
        }
        const next_move_data: PredictNextMoveData = {next_do, way_required, lenght_remains, obstacle_to_slide, control_type: data.control_type}
        _next_nove(next_move_data, parent)
        return allowed_way;
    }


    function update_way(way_required: Segment, control_type: ControlType) {
        clear_way();
        const now = Date.now();
        if (control_type == ControlType.JS || control_type == ControlType.FP)
            way.push(...predict_way(way_required, control_type));
        if (control_type == ControlType.GP)
            way.push(...find_way_aStar(way_required));
        log('Update_way took time: ', Date.now() - now, ' ms');
        return way;
    }

    function default_update_way(way_required: Segment, control_type: ControlType) {
        return [];
    }

    function find_way_aStar(way_required: Segment) {
        log(`Start find_way_aStar`)
        const way: (Segment | Arc)[] = [];
        const grid = obstacles_manager.get_grid();
        if (!grid) {
            // Не была инициализирована сетка для поиска пути
            return default_update_way(way_required, ControlType.FP);
        }
        const start = grid.coord_to_grid_pos(way_required.start);
        const end = grid.coord_to_grid_pos(way_required.end);
        if (!(start && end)) {
            // Текущая позиция либо цель вне сетки для поиска пути
            return default_update_way(way_required, ControlType.FP);
        }
        if (start.x == end.x && start.y == end.y) {
            // Текущая позиция и цель в одной ячейке, искать путь не нужно
            return default_update_way(way_required, ControlType.FP);
        }
        const dimension = Math.floor(Math.max(Math.abs(start.x - end.x ), Math.abs(start.y - end.y), min_subgrid_size));
        if (dimension > max_subgrid_size) {
            // Цель слишком далеко, размеры подсетки будут больше допустимых
            return default_update_way(way_required, ControlType.FP);
        }
        const amount = {
            x: dimension * 2 + 1, 
            y: dimension * 2 + 1
        };
        const offset_x = Math.abs(start.x - Math.floor(amount.x / 2));
        const offset_y = Math.abs(start.y - Math.floor(amount.y / 2));
        const offset = {
            x: Math.min(grid.amount.x - 1, Math.max(0, offset_x)), 
            y: Math.min(grid.amount.y - 1, Math.max(0, offset_y)), 
        };
        const subgrid_params: SubGridParams = {offset, amount};
        const subgrid = grid.get_subgrid(subgrid_params) as ObstaclesGrid;
        const matrix = subgrid.get_grid();
        const aStarInstance = new AStarFinder({
            grid: {
              matrix
            },
        });
        const subgrid_start = subgrid.coord_to_grid_pos(way_required.start);
        const subgrid_end = subgrid.coord_to_grid_pos(way_required.end);
        if (!(subgrid_start && subgrid_end)) {
            // Текущая позиция либо цель вне сетки для поиска пути
            return default_update_way(way_required, ControlType.FP);
        }
        const grid_pathway = aStarInstance.findPath(subgrid_start, subgrid_end);
        if (!grid_pathway) 
            return default_update_way(way_required, ControlType.FP);
        if (grid_pathway.length > max_grid_pathway || grid_pathway.length * grid.cell_size > way_required.length() * 4) {
            // Длина пути на сетке превышает допустимое значение
            return default_update_way(way_required, ControlType.FP);
        }
        if (grid_pathway.length == 0) {
            // Длина пути равна нулю
            return default_update_way(way_required, ControlType.FP);
        }
        let i = 0;
        const p2 = grid_pathway[i];
        const c2 = subgrid.grid_pos_to_coord({x: p2[0], y: p2[1]}) as PointLike;
        const segment = Segment(way_required.start, Point(c2.x, c2.y));
        way.push(segment);
        while (i < grid_pathway.length - 1) {
            const p1 = grid_pathway[i];
            const p2 = grid_pathway[i + 1];
            const c1 = subgrid.grid_pos_to_coord({x: p1[0], y: p1[1]}) as PointLike;
            const c2 = subgrid.grid_pos_to_coord({x: p2[0], y: p2[1]}) as PointLike;
            const start = Point(c1.x, c1.y);
            const end = Point(c2.x, c2.y);
            const segment = Segment(start, end);
            way.push(segment);
            _way_total_length += segment.length();
            i++;
        }
        return way;
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

    function clear_way() {
        _way_tree = undefined;
        way.splice(0, way.length);
        _way_total_length = 0;
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
            _way_total_length += allowed_way.length();
            way.push(allowed_way);
        }

        if (debug) {
            // log('point of vertice', vertice);
            // log('points of obstacle', obstacle.start, obstacle.end);
            // log('dir_diff_start_angle', radToDeg(dir_diff_start_angle));
            // log('way_required.vector.slope', radToDeg(data.way_required.vector().slope()));
            // log('direction.slope', radToDeg(data.way_required.vector().slope()));
            // log('obstacle_angle', radToDeg(obstacle_limit_vec.slope()));
            // log('rotation dir', (rotate_dir) ? 'CW' : 'CCW');
            // log('start_angle',  radToDeg(start_angle));
            // log('_end_angle',  radToDeg(_end_angle));
            // log('excess_rotation_angle',  radToDeg(excess_rotation_angle));
            // log('final_end_angle',  radToDeg(end_angle));
            // log('blocked_by_current_obstacle',  blocked_by_current_obstacle);
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
            _way_total_length += allowed_way.length();
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
            _way_total_length += allowed_way.length();
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
        let angle = Math.PI / 2;
        if (interval.name == "segment") {
            const segment = interval as Segment;
            const disired_dir = vector(current_pos, current_target);
            // angle = disired_dir.angleTo(segment.vector);
        }
        else if (interval.name == "arc") {
            const arc = interval as Arc;
            const disired_dir = vector(current_pos, current_target);
            const actual_dir = arc.tangentInStart();
            // angle = disired_dir.angleTo(actual_dir);
        }
        // TODO: угол можно использовать для корректировки скорости при движении вдоль препятствий
        // const cosA = Math.cos(angle);
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

    function find_current_interval(current_pos: Point) {
        for (let i = 0; i < way.length; i++) {
            if (way[i].contains(current_pos)) 
                return i;
        }
        return -1;
    }
    
    function get_next_pos(current_pos: Point, dt: number, speed: number) {
        let _current_pos = current_pos;
        let _time_remains = dt;
        if (way.length == 0) {
            logger.error("No calculated way to get the next waypoint!");
            return _current_pos;
        };
        const id = find_current_interval(current_pos);
        if (id == -1) {
            logger.error("current_pos doesn't belong to any way interval");
            return _current_pos;
        }
        const _way_intervals: (Segment | Arc)[] = [];
        const current_interval_remains = way[id].split(_current_pos)[1];
        if (current_interval_remains)
            _way_intervals.push(current_interval_remains);
        _way_intervals.push(...way.slice(id + 1));

        let i = 0;
        while (_time_remains > 0 && i < _way_intervals.length) {
            let interval = _way_intervals[i];
            const {point, time_remains} = get_waypoint_on_interval(interval, _time_remains, speed);
            _current_pos = point as Point;
            _time_remains = time_remains;
            if (!time_remains) {
                // Log.error("Calculated way ended before the remaining time for the move!");
                break;
            }
            i ++;
        }
        return _current_pos;
    }
    
    function set_current_pos(_current_pos: Point) {
        current_pos = _current_pos;
    }

    function get_current_pos() {
        return current_pos;
    }

    function get_way() {
        return way;
    }

    function get_way_length() {
        return _way_total_length;
    }

    return { update_way, get_way, clear_way, get_way_length,
        set_current_pos, get_current_pos, get_next_pos,
        enable_obstacles, check_obstacles_enabled
    }
}


export function test_pathfinder() {
    const params = {...default_obstacle_grid, cell_size: 1, amount: {x: 100, y: 100},}
    const obst_A1 = Segment(Point(0.1, 0), Point(9.1, 9));
    const obst_B1 = Segment(Point(13, -12), Point(-12, 13));
    const ob = ObstaclesManager(1);
    ob.set_obstacles([
        obst_A1,
        obst_B1
        ]);
    ob.init_grid({...params});
    const PF = PathFinderModule({...default_settings}, ob);
    const req_way: Segment = Segment(Point(5, 5), Point(14, 14));
    PF.update_way(req_way, ControlType.GP);
}
