import { Arc, CCW, Circle, CW, Point, Segment, Vector, point, vector_from_points as vector, segment, arc, vec_angle } from "./Geometry";
import { PlayerMovementSettings, PointerControl } from "./PlayerMovement";
import { EQ_0 } from "./utils";

enum NextMoveType {
    STRAIGHT_LINE,
    SLIDE_OBSTACLE,
    BYPASS_ANGLE,
    STOP,
}

type PredictNextMoveData = {
    next_do: NextMoveType, 
    way_required: Segment,
    lenght_remains: number,
    vertice_to_bypass?: Point,
    prev_vertice?: Point,
    obstacle_to_slide?: Segment,
    prev_obstacle?: Segment,
    pointer_control: PointerControl,
}

type ClosestObstacleData = {
    obstacle?: Segment,
    distance: number,
    point?: Point,
    way?: Segment | Arc,
    is_vertice: boolean,
}

type OffsetBuildOption = "all" | "arc" | "segment";

const point_zero = point(0, 0);


export function PathFinder(settings: PlayerMovementSettings, _obstacles?: Segment[]) {
    const max_intervals =  settings.max_predicted_way_intervals;
    const collision_min_error = settings.collision_min_error;
    const blocked_move_min_dist = settings.blocked_move_min_dist;
    const move_min_angle = settings.block_move_min_angle;
    const max_try_dist = settings.max_try_dist;
    const collision_radius = settings.collision_radius;
    const debug =  settings.debug;
    const clear_drawn_lines =  settings.clear_drawn_lines;
    const way_intervals: (Segment | Arc)[] = [];
    let current_pos = point_zero;
    let current_target = point_zero;
    let checking_obstacles = true;
    let obstacles = (_obstacles) ? _obstacles : [];
    let way_total_length = 0;

    function enable_obstacles(enable = true) {
        checking_obstacles = enable;
        log(`Obstacles ${(enable) ? 'enabled' : 'disabled'}`)
    }
    function check_obstacles_enabled() {
        return checking_obstacles;
    }

    function update_way(way_required: Segment, pointer_control: PointerControl) {
        let lenght_remains = way_required.length();
        const data: PredictNextMoveData = {next_do: NextMoveType.STRAIGHT_LINE, way_required, lenght_remains, pointer_control};
        let counter = 0;
        clear_way();
        while (data.lenght_remains >= collision_min_error && counter < max_intervals) {
            if (debug)  {
                log(`Next move in predicted way:`, NextMoveType[data.next_do]);   
            }
            if (data.next_do == NextMoveType.STRAIGHT_LINE) {
                linear_move(data);
            }
            else if (data.next_do == NextMoveType.BYPASS_ANGLE) {
                bypass_vertice(data);
            }
            else if (data.next_do == NextMoveType.SLIDE_OBSTACLE) {
                slide_obstacle(data);
            }
            else if (data.next_do == NextMoveType.STOP) break;
            counter ++;
        }
    }

    function clear_way() {        
        way_intervals.splice(0, way_intervals.length);
        way_total_length = 0;
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
        if (data.pointer_control == PointerControl.JS) {
            correction_angle = 0;
        }
        else if (data.pointer_control == PointerControl.FP) {
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

    function bypass_vertice(data: PredictNextMoveData) {
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
        const closest = find_closest_obstacle_use_offsets(way_arc, obstacles);
        if (closest.obstacle && closest.obstacle != obstacle) {
            let distance_before_collision = closest.distance;
            if (distance_before_collision < 0) {
                Log.error(`Intersection with an obstacle while collision checking in bypass_angle! Distance - ${distance_before_collision}`);
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
            if (data.pointer_control == PointerControl.JS) {
                const new_target = _get_new_target(s_pos, allowed_way.end(), data.way_required.end);
                data.way_required = segment(allowed_way.end().x, allowed_way.end().y, new_target.x, new_target.y);
            }
            else if (data.pointer_control == PointerControl.FP) {
                const new_target =  data.way_required.end;
                data.way_required = segment(allowed_way.end().x, allowed_way.end().y, new_target.x, new_target.y);
            }
            way_total_length += allowed_way.length();
            way_intervals.push(allowed_way);
        }

        // if (debug) {
        //     log('point of vertice', vertice);
        //     log('points of obstacle', obstacle.start, obstacle.end);
        //     log('dir_diff_start_angle', radToDeg(dir_diff_start_angle));
        //     log('way_required.vector.slope', radToDeg(data.way_required.vector.slope));
        //     log('direction.slope', radToDeg(data.way_required.vector.slope));
        //     log('obstacle_angle', radToDeg(obstacle_limit_vec.slope));
        //     log('rotation dir', (rotate_dir) ? 'CW' : 'CCW');
        //     log('start_angle',  radToDeg(start_angle));
        //     log('_end_angle',  radToDeg(_end_angle));
        //     log('excess_rotation_angle',  radToDeg(excess_rotation_angle));
        //     log('final_end_angle',  radToDeg(end_angle));
        //     log('blocked_by_current_obstacle',  blocked_by_current_obstacle);
        // }
    }

    function slide_obstacle(data: PredictNextMoveData) {
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
        const max_slide_distance = (data.pointer_control == PointerControl.FP) ?data.lenght_remains * Math.cos(d_angle) : data.lenght_remains;
        way_required_to_slide = way_required_to_slide.splitAtLength(max_slide_distance)[0] as Segment;
        if (EQ_0(max_slide_distance)) {
            data.next_do = NextMoveType.STOP; 
            return;
        }
        const closest = find_closest_obstacle_use_offsets(way_required_to_slide, obstacles);
        if (closest.obstacle) {
            let distance_before_collision = closest.distance;
            if (distance_before_collision < 0) {
                Log.error(`Intersection with an obstacle while collision checking in slide_obstacle! Distance - ${distance_before_collision}`);
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
            if (data.pointer_control == PointerControl.JS) {
                const new_target = _get_new_target(s_pos, allowed_way.end, data.way_required.end);
                data.way_required = segment(allowed_way.end.x, allowed_way.end.y, new_target.x, new_target.y);
            }
            else if (data.pointer_control == PointerControl.FP) {
                const new_target =  data.way_required.end;
                data.way_required = segment(allowed_way.end.x, allowed_way.end.y, new_target.x, new_target.y);
            }
            way_total_length += allowed_way.length();
            way_intervals.push(allowed_way);
        }
    }

    function linear_move(data: PredictNextMoveData) {
        data.obstacle_to_slide = undefined;
        data.vertice_to_bypass = undefined;
        const closest = find_closest_obstacle_use_offsets(data.way_required, obstacles);
        let allowed_way = undefined;
        if (closest.obstacle) { 
            let distance_before_collision = closest.distance;
            if (distance_before_collision < 0) {
                Log.error(`Intersection with an obstacle while collision checking in linear_move! Distance - ${distance_before_collision}`);
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
            way_total_length += allowed_way.length();
            way_intervals.push(allowed_way);
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

    function build_offsets(obstacle: Segment, offset: number, build_option: OffsetBuildOption = "all") {
        const result: (Segment | Arc)[] = [];
        const tangent = obstacle.vector().normalize();
        const normal = tangent.rotate90CW();
        if (build_option == "all" || build_option == "segment") {
            result.push(obstacle.translate(normal.multiply(offset)));
            result.push(obstacle.translate(normal.multiply(-offset)));
        }
        
        if (build_option == "all" || build_option == "arc") {
            const slope = obstacle.slope;
            result.push(arc(obstacle.start, offset, slope() + Math.PI / 2, slope() - Math.PI / 2, true));
            result.push(arc(obstacle.end, offset, slope() - Math.PI / 2, slope() + Math.PI / 2, true));
        }
        return result;
    }

    // function find_closest_obstacle_use_rays(rays: Ray[], obstacles: Segment[], side_name: "left" | "right") {
    //     const intersected_obstacles_groups: Segment[][] = []
    //     let shortest_distance = Infinity;
    //     let closest_obstacle: Segment | undefined = undefined;
    //     let shortest_ray_segment: Segment | undefined = undefined;
    //     for (const ray of rays) {
    //         const ray_intersected_obstacles: Segment[] = [];
    //         intersected_obstacles_groups.push(ray_intersected_obstacles);
    //         for (const obstacle of obstacles) {
    //             const obstacle_points = ray.intersect(obstacle);
    //             if (obstacle_points.length) {
    //                 const distance_segment = new Segment(ray.start, obstacle_points[0]);
    //                 const distance = distance_segment.length;
    //                 ray_intersected_obstacles.push(obstacle);
    //                 if (distance < shortest_distance) {
    //                     shortest_distance = distance;
    //                     closest_obstacle = obstacle;
    //                     shortest_ray_segment = distance_segment;
    //                 }
    //             }
    //         }
    //     }
    //     return {obstacle: closest_obstacle, distance: shortest_distance, distance_segment: shortest_ray_segment, side: side_name};
    // }

    function make_collision_way(way: Segment | Arc) {
        if (way.name == 'segment') {
            const way_segment = way as Segment;
            const base_vec = way_segment.vector().normalize();
            const start = way_segment.start.translate(base_vec.invert().multiply(collision_min_error));
            const end = way_segment.end.translate(base_vec.multiply(way_segment.length()));
            return segment(start.x, start.y, end.x, end.y);
        }
        else {
            const way_arc = way as Arc;
            return way_arc;
        }
    }

    function find_closest_obstacle_use_offsets(way_required: Segment | Arc, obstacles: Segment[]): ClosestObstacleData {
        let shortest_distance = Infinity;
        let closest_point: Point | undefined = undefined;
        let closest_obstacle: Segment | undefined = undefined;
        let shortest_way: Segment | Arc | undefined = undefined;
        let is_vertice: boolean = false;
        let offset_collision_line: Segment | Arc | undefined = undefined;
        if (!checking_obstacles) return {obstacle: closest_obstacle, distance: way_required.length(), point: closest_point, way: shortest_way, is_vertice};
        const collision_way = way_required;
        for (const obstacle of obstacles) {
            const offset_collision_lines = build_offsets(obstacle, collision_radius);
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
            // const move_stop_lines = build_offsets(closest_obstacle, collision_radius + collision_min_error, (is_vertice) ? "arc" : "segment");
            // for (const line of move_stop_lines) {
            //     const intersections = collision_way.intersect(line);
            //     if (intersections.length > 0) {
            //         let closest: { distance: number; way?: Segment | Arc; point: Point } | undefined = undefined;
            //         closest = get_closest_intersection(collision_way, intersections);
            //         if (closest && closest.distance < shortest_distance) {
            //             shortest_distance = closest.distance;
            //             shortest_way = closest.way;
            //         }
            //     }
            //     else {
            //         Log.error('Не удалось определить расстояние остановки до соприкосновения с препятствием!')
            //     }
            // }

            // Возможно, достаточно просто останавливаться на заданном ненулевом расстоянии от препятствий, либо 
            // не двигаться, если текущее расстояние меньше него; нужно больше тестов
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

    const get_next_pos: (current_pos: Point, dt: number, speed: number) => Point = get_next_pos_way_prediction;

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
        for (let i = 0; i < way_intervals.length; i++) {
            if (way_intervals[i].contains(current_pos)) 
                return i;
        }
        return -1;
    }
    
    function get_next_pos_way_prediction(current_pos: Point, dt: number, speed: number) {
        let _current_pos = current_pos;
        let _time_remains = dt;
        if (way_intervals.length == 0) {
            Log.error("No calculated way to get the next waypoint!");
            return _current_pos;
        };
        const id = find_current_interval(current_pos);
        if (id == -1) {
            Log.error("current_pos doesn't belong to any way interval");
            return _current_pos;
        }
        const _way_intervals: (Segment | Arc)[] = [];
        const current_interval_remains = way_intervals[id].split(_current_pos)[1];
        if (current_interval_remains)
            _way_intervals.push(current_interval_remains);
        _way_intervals.push(...way_intervals.slice(id + 1));

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

    // function get_next_pos_basic(current_pos: Point, dt: number, speed: number) {
    //     const dist_to_target = current_pos.distanceTo(current_target)[0];
    //     const try_dist = (dt * speed > dist_to_target) ? dist_to_target : dt * speed;
    //     const intervals_to_check = [];
    //     if (try_dist > max_try_dist) {
    //         const stop = Math.floor(try_dist / max_try_dist);
    //         for (let i = 1; i <= stop; i ++) {
    //             intervals_to_check.push(max_try_dist);
    //             if (i == stop) {
    //                 intervals_to_check.push(try_dist % max_try_dist)
    //             }
    //         }
    //     }
    //     else intervals_to_check.push(try_dist);
    //     let end_pos = current_pos;
    //     let total = 0;
    //     let dir = vector(current_pos, current_target);
    //     dir = dir.normalize();
    //     for (const interval of intervals_to_check) {
    //         total += interval;
    //         const {new_pos, stop_search: stop} = find_new_pos_for_interval(current_pos, dir.clone(), total, dir);
    //         if (new_pos) end_pos = new_pos;
    //         if (stop) break;
    //     }
    //     return end_pos;
    // }

    // function find_new_pos_for_interval(start_pos: Point, dir: Vector, interval: number, base_dir: Vector, correction = false): {new_pos: Point, stop_search: boolean} {
    //     const try_pos_vector = vector(point_zero, start_pos);
    //     const way_vector = dir.multiply(interval);
    //     const try_pos = point(try_pos_vector.add(way_vector));
    //     const collide_circle = new Circle(try_pos, collision_radius);
    //     const obstacles = check_obstacles_by_circle(collide_circle);
    //     if (obstacles.length > 0) {
    //         if (correction) return {new_pos: start_pos, stop_search: true};
    //         const {distance, obstacle} = obstacles[0];
    //         if (distance[0] < blocked_move_min_dist) return {new_pos: start_pos, stop_search: true};
    //         let correction_move_angle = vec_angle(dir, obstacle.vector);
    //         correction_move_angle = (Math.abs(correction_move_angle) > Math.PI / 2) ? Math.PI + correction_move_angle : correction_move_angle;
    //         const new_dir = base_dir.clone().rotate(correction_move_angle, point_zero);
    //         //
    //         let new_interval = interval;
    //         // let new_interval = Math.abs(interval * Math.cos(correction_move_angle));
    //         //
    //         new_interval = (Math.PI / 2 - Math.abs(correction_move_angle) > move_min_angle) ? interval : 0;
    //         if (new_interval == 0) return {new_pos: start_pos, stop_search: true};
    //         return find_new_pos_for_interval(start_pos, new_dir, new_interval, base_dir, true);
    //     };
    //     return {new_pos: try_pos, stop_search: false};
    // }

    function check_obstacles_by_circle(collide_circle: Circle) {
        const list = [];
        for (const obstacle of obstacles) {
            const circle_collision_points = collide_circle.intersect(obstacle);;
            if (circle_collision_points && circle_collision_points.length != 0) {
                const distance = collide_circle.center().distanceTo(circle_collision_points[0]);
                list.push({distance, obstacle});
            }
        }
        list.sort(_compare_distances);
        return list;
    }
    
    function set_current_pos(_current_pos: Point) {
        current_pos = _current_pos;
    }

    function set_obstacles(_obstacles: Segment[]) {
        obstacles = _obstacles;
    }

    function get_current_pos() {
        return current_pos;
    }

    function get_way() {
        return way_intervals;
    }

    function get_way_length() {
        return way_total_length;
    }
   
    function _compare_distances(a: {distance: [number, Segment]}, b: {distance: [number, Segment]}) {
        return a.distance[0] - b.distance[0];
    }

    return { get_next_pos, set_current_pos, get_current_pos, set_obstacles,
        find_closest_obstacle_use_offsets, linear_move, bypass_vertice, slide_obstacle, get_way, get_way_length,
        update_way, clear_way, make_collision_way, enable_obstacles, check_obstacles_enabled }
}

