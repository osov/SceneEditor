import { Euler, Vector2, Vector2Like, Vector3, } from 'three';
import { AnimatedMesh } from '../render_engine/objects/animated_mesh';
import { get_depth } from '../render_engine/parsers/tile_parser';
import {
    Point,
    Vector, 
    Line,  
    Ray,      
    Segment,  
    Arc, 
    Circle,
} from '2d-geometry';
import { degToRad } from './utils';
import { radToDeg } from 'three/src/math/MathUtils.js';

enum PointerControl {
    FOLLOW_DIRECTION,   // Двигается в направлении курсора, пока зажата ЛКМ  
    // GO_TO_TARGET,       // Двигается в направлении точки уровня, в которой была отпущена ЛКМ
    FOLLOW_POINTER,      // Двигается в направлении курсора, пока не достигнет точки уровня, в которой была отпущена ЛКМ
    STICK,              // Двигается в направлении, полученном от джойстика  
}

enum PathFinderMode {
    BASIC,   // Проверка столкновений каждый sys_update через поиск пересечений игрока (окружности) с препятствиями на пути длиной dt * скорость с шагом max_try_dist;
    WAY_PREDICTION  // Построение прогнозируемого пути каждые update_interval сек или при изменении направления на угол >= update_way_angle,
                    // но не чаще чем через min_update_interval. Проверка столкновений через построение лучей параллельных пути;

}

const point_zero = new Point(0, 0);

type PlayerMovementSettings = {
    path_finder_mode: PathFinderMode,
    pointer_control: PointerControl,
    keys_control: boolean,
    model_layer: number,
    target_stop_distance: number,
    animation_names: AnimationNames,
    update_interval: number,
    min_update_interval: number,
    update_way_angle: number,
    block_move_min_angle: number,
    speed: SpeedSettings,
    collide_radius: number,
    max_try_dist: number,
    max_blocked_move_time: number,
    blocked_move_min_dist: number,
}

type AnimationNames = {
    IDLE: string,
    WALK: string,
    RUN?: string,
}

type SpeedSettings = {
    WALK: number,
    RUN?: number,
}


export const default_settings: PlayerMovementSettings = {
    path_finder_mode: PathFinderMode.BASIC,
    pointer_control: PointerControl.FOLLOW_POINTER,
    keys_control: true,
    target_stop_distance: 2,
    model_layer: 15, 
    animation_names: {IDLE: "idle", WALK: "walk"},
    update_interval: 1,
    min_update_interval: 0.1,
    update_way_angle: 5 * Math.PI / 180,
    block_move_min_angle: 15 * Math.PI / 180,
    speed: {WALK: 26},
    collide_radius: 4,
    max_try_dist: 0.2,
    max_blocked_move_time: 5,
    blocked_move_min_dist: 0.006,
}

function interpolate_delta_with_wrapping(start: number, end: number, percent: number, wrap_min: number, wrap_max: number) {
    const wrap_test = wrap_max - wrap_min;
    if (start - end > wrap_test / 2) end += wrap_test;
    else if (end - start > wrap_test / 2) start += wrap_test;
    return (end - start) * percent;
}

function interpolate_with_wrapping(start: number, end: number, percent: number, wrap_min: number, wrap_max: number, is_range = false) {
    let interpolated_val = start + interpolate_delta_with_wrapping(start, end, percent, wrap_min, wrap_max);
    if (is_range) {
        const wrap_length = (wrap_max - wrap_min) / 2;
        if (interpolated_val >= wrap_length) interpolated_val -= 2 * wrap_length;
        if (interpolated_val <= -wrap_length) interpolated_val += 2 * wrap_length;
    }
    else {
        const wrap_length = wrap_max - wrap_min;
        if (interpolated_val >= wrap_length) interpolated_val -= wrap_length;
        if (interpolated_val < 0) interpolated_val += wrap_length;
    }
    return interpolated_val;
}
  

export function MovementLogic(settings: PlayerMovementSettings = default_settings) {
    const pointer = new Point();
    const target = new Point();
    const stick_dir = new Vector();
    const obstacles: Segment[] = [];
    const position = new Point();
    const target_error = settings.target_stop_distance;
    const layer = settings.model_layer;
    const animations = settings.animation_names;
    const pointer_control = settings.pointer_control;
    const update_interval = settings.update_interval;
    const update_way_angle = settings.update_way_angle;
    const speed = settings.speed;
    const max_blocked_move_time = settings.max_blocked_move_time;
    const blocked_max_dist = settings.blocked_move_min_dist;
    const PF = PathFinder(settings, obstacles);
    let is_moving = false;
    let is_pointer_down = false;
    let is_in_target = false;
    let blocked_move_time = 0;
    let has_target = false;

    function init(model: AnimatedMesh, _obstacles: Segment[] = []) {
        target.x = model.position.x;
        target.y = model.position.y;
        PF.set_target(target);
        PF.set_current_pos(target);
        position.x = model.position.x;
        position.y = model.position.y;
        obstacles.push(..._obstacles);

        if ([PointerControl.FOLLOW_POINTER, PointerControl.FOLLOW_DIRECTION].includes(pointer_control)) {
            EventBus.on('SYS_INPUT_POINTER_DOWN', (e) => {
                if (e.button != 0)
                    return;
                is_pointer_down = true;
                update_pointer_position(e);
            });
            EventBus.on('SYS_INPUT_POINTER_UP', (e) => {
                if (e.button != 0)
                    return;
                update_pointer_position(e);
                is_pointer_down = false;
            });
            EventBus.on('SYS_INPUT_POINTER_MOVE', (e) => {
                if (!is_pointer_down)
                    return;
                update_pointer_position(e);
            });
            
            if (pointer_control == PointerControl.FOLLOW_POINTER) {
                EventBus.on('SYS_INPUT_POINTER_DOWN', (e) => has_target = true);
                EventBus.on('SYS_ON_UPDATE', (e) => handle_update_follow_pointer(e.dt));
            }
            else if (pointer_control == PointerControl.FOLLOW_DIRECTION) {
                EventBus.on('SYS_ON_UPDATE', (e) => handle_update_follow_direction(e.dt));
            }

        }

        else if (pointer_control == PointerControl.STICK) {
            // EventBus.on('SYS_INPUT_STICK_DOWN', (e) => {
            //     is_pointer_down = true;
            //     stick_dir.set(e.x, e.y);
            // })
            // EventBus.on('SYS_INPUT_STICK_UP', (e) => {
            //     is_pointer_down = false;
            // })
            // EventBus.on('SYS_INPUT_STICK_MOVE', (e) => {
            //     if (!is_pointer_down)
            //         return;
            //     stick_dir.set(e.x, e.y);
            // });
            // EventBus.on('SYS_ON_UPDATE', (e) => handle_update_stick(e));
        }

        function handle_update_follow_pointer( dt: number ) {
            if (!has_target) return;
            position.x = model.position.x;
            position.y = model.position.y;
            const dist = position.distanceTo(target)[0];
            is_in_target = (dist <= target_error) ? true : false;
            if (is_in_target && is_moving) {
                stop_movement();
            }
            else if (!is_in_target) {
                if (!is_moving) start_movement();
                else {
                    update_position(dt);
                    update_pointer_position(pointer);
                }
            }
        }

        function handle_update_follow_direction( dt: number ) {
            if (!is_pointer_down) {
                if (is_moving) stop_movement();
            }
            else {
                if (!is_moving) start_movement();
                else {
                    update_position(dt);
                    update_pointer_position(pointer);
                }
            }
        }        

        function stop_movement() {
            is_moving = false;
            model.set_animation(animations.IDLE);
            has_target = false;
        }

        function start_movement() {
            is_moving = true;
            model.set_animation(animations.WALK);
        }

        function update_position(dt: number) {
            const start_pos = new Point(model.position.x, model.position.y);
            const end_pos = PF.get_next_pos(start_pos, dt);    
            if (start_pos.distanceTo(end_pos)[0] > blocked_max_dist) {
                model.position.x = end_pos.x;
                model.position.y = end_pos.y;
                model.position.z = get_depth(model.position.x, model.position.y, layer, model.get_size().x, model.get_size().y);
                CameraControl.set_position(model.position.x, model.position.y, true);
            }
            else {
                blocked_move_time += dt;
                if (blocked_move_time >= max_blocked_move_time) {
                    stop_movement();
                    blocked_move_time = 0;
                }
            }
            let dir = new Vector(start_pos, end_pos);
            dir = (dir.length != 0) ? dir : new Vector(start_pos, target);
            model.rotation.y = interpolate_with_wrapping(model.rotation.y, Math.atan2(dir.y, dir.x) + Math.PI / 2, 0.1, 0, 2 * Math.PI);
            model.transform_changed();
        }
    }


    function update_pointer_position(pos: Vector2Like) {
        if (is_pointer_down) {
            pointer.x = pos.x;
            pointer.y = pos.y;
            const wp = Camera.screen_to_world(pointer.x, pointer.y);
            target.x = wp.x;
            target.y = wp.y;
        }
    }

    return {init}
}

export function calculate_borders(obj: {position: Vector3, rotation: Euler, get_pivot: () => Vector2, get_size: () => Vector2}): Segment[] {
    const size = obj.get_size().divideScalar(2);
    const pos = obj.position;
    const rotation = obj.rotation;
    const local_top_left = new Vector3(-size.x, size.y, 0);
    const local_top_right = new Vector3(size.x, size.y, 0);
    const local_bottom_left = new Vector3(-size.x, -size.y, 0);
    const local_bottom_right = new Vector3(size.x, -size.y, 0);
    const top_left = local_top_left.applyEuler(rotation).add(pos);
    const top_right = local_top_right.applyEuler(rotation).add(pos);
    const bottom_left = local_bottom_left.applyEuler(rotation).add(pos);
    const bottom_right = local_bottom_right.applyEuler(rotation).add(pos);
    const tl = new Point({x: top_left.x, y: top_left.y});
    const tr = new Point({x: top_right.x, y: top_right.y});
    const bl = new Point({x: bottom_left.x, y: bottom_left.y});
    const br = new Point({x: bottom_right.x, y: bottom_right.y});
    return [
        new Segment(tl, tr),
        new Segment(tr, bl),
        new Segment(bl, br),
        new Segment(br, tl),
    ];
}


function PathFinder(settings: PlayerMovementSettings, obstacles: Segment[]) {
    const mode = settings.path_finder_mode;
    const speed = settings.speed;
    const blocked_move_min_dist = settings.blocked_move_min_dist;
    const move_min_angle = settings.block_move_min_angle;
    const max_try_dist = settings.max_try_dist;
    const collide_radius = settings.collide_radius;
    const update_t_interval = settings.update_interval;
    const min_update_t_interval = settings.min_update_interval;
    const update_way_angle = settings.update_way_angle;
    const way_intervals: (Segment | Arc)[] = [];
    let current_pos = new Point(0, 0);
    let target = new Point(0, 0);
    let current_speed: number = speed.WALK;
    let time_elapsed = 0;
    let current_real_dir = new Vector(0, 0);
    let current_dir = new Vector(0, 0);
    
    if (mode == PathFinderMode.WAY_PREDICTION) {
        EventBus.on('SYS_ON_UPDATE', (e) => {
            time_elapsed += e.dt;
            const dir_changed = check_dir_change();
            if (dir_changed) {
                check_interval(min_update_t_interval, () => {
                    current_dir = current_real_dir.clone();
                    update_way();
                });
            }
            else {
                check_interval(update_t_interval, () => {
                    update_way();
                })
            }
        })
    }

    function update_way() {
        way_intervals.splice(0, way_intervals.length);
        
    }

    function check_dir_change() {
        const d_angle = vec_angle(current_real_dir, current_dir);
        return (d_angle > update_way_angle);
    }

    const get_next_pos: (current_pos: Point, dt: number) => Point = (mode == PathFinderMode.WAY_PREDICTION) ? get_next_pos_way_prediction : get_next_pos_basic;
    
    function check_interval(update_interval: number, callback: () => void ) {
        if (time_elapsed >= update_interval) {
            callback();
            time_elapsed = 0;
        }
        return;
    }

    function get_waypoint_on_interval(interval: Segment | Arc, dt: number) {
        let angle = Math.PI / 2;
        if (interval.name == "segment") {
            const segment = interval as Segment;
            const disired_dir = new Vector(current_pos, target);
            angle = disired_dir.angleTo(segment.vector);
        }
        else if (interval.name == "arc") {
            const arc = interval as Arc;
            const disired_dir = new Vector(current_pos, target);
            const actual_dir = arc.tangentInStart();
            angle = disired_dir.angleTo(actual_dir);
        }
        const cosA = Math.cos(angle);
        const dist = cosA * dt * current_speed;
        const point = interval.pointAtLength(dist);
        if (dist > interval.length) {
            const dist_remains = dist - interval.length;
            const time_remains = dist_remains / cosA / current_speed;
            return {point, time_remains};
        }
        else {
            const time_remains = 0
            return {point, time_remains};
        }
    }
    
    function get_next_pos_way_prediction(current_pos: Point, dt: number) {
        if (way_intervals.length == 0) {
            Log.error("No calculated way to get the next waypoint!");
        };
        let _current_pos = current_pos;
        let _time_remains = dt;
        while (_time_remains > 0) {
            let interval = way_intervals[0];
            const {point, time_remains} = get_waypoint_on_interval(interval, _time_remains);
            _current_pos = point;
            _time_remains = time_remains;
            if (time_remains) {
                way_intervals.splice(0);
                if (way_intervals.length == 0) {
                    Log.error("Calculated way ended before the remaining time for the move!");
                    break;
                };
            }
            else {
                break;
            }
        }
        return _current_pos;
    }

    function get_next_pos_basic(current_pos: Point, dt: number) {
        const dist_to_target = current_pos.distanceTo(target)[0];
        const try_dist = (dt * speed.WALK > dist_to_target) ? dist_to_target : dt * speed.WALK;
        const intervals_to_check = [];
        if (try_dist > max_try_dist) {
            const stop = Math.floor(try_dist / max_try_dist);
            for (let i = 1; i <= stop; i ++) {
                intervals_to_check.push(max_try_dist);
                if (i == stop) {
                    intervals_to_check.push(try_dist % max_try_dist)
                }
            }
        }
        else intervals_to_check.push(try_dist);
        let end_pos = current_pos;
        let total = 0;
        let dir = new Vector(current_pos, target);
        dir = dir.normalize();
        for (const interval of intervals_to_check) {
            total += interval;
            const {new_pos, stop_search: stop} = find_new_pos_for_interval(current_pos, dir.clone(), total, dir);
            if (new_pos) end_pos = new_pos;
            if (stop) break;
        }
        return end_pos;
    }

    function find_new_pos_for_interval(start_pos: Point, dir: Vector, interval: number, base_dir: Vector, correction = false): {new_pos: Point, stop_search: boolean} {
        const try_pos_vector = new Vector(point_zero, start_pos);
        const way_vector = dir.multiply(interval);
        const try_pos = new Point(try_pos_vector.add(way_vector));
        const collide_circle = new Circle(try_pos, collide_radius);
        const obstacles = check_obstacles_by_circle(collide_circle);
        if (obstacles.length > 0) {
            if (correction) return {new_pos: start_pos, stop_search: true};
            const {result, obstacle} = obstacles[0];
            const dist = result[0];
            if (dist < blocked_move_min_dist) return {new_pos: start_pos, stop_search: true};
            let correction_move_angle = vec_angle(dir, obstacle.vector);
            correction_move_angle = (Math.abs(correction_move_angle) > Math.PI / 2) ? Math.PI + correction_move_angle : correction_move_angle;
            const new_dir = base_dir.clone().rotate(correction_move_angle, point_zero);
            //
            let new_interval = interval;
            // let new_interval = Math.abs(interval * Math.cos(correction_move_angle));
            //
            new_interval = (Math.PI / 2 - Math.abs(correction_move_angle) > move_min_angle) ? interval : 0;
            if (new_interval == 0) return {new_pos: start_pos, stop_search: true};
            return find_new_pos_for_interval(start_pos, new_dir, new_interval, base_dir, true);
        };
        return {new_pos: try_pos, stop_search: false};
    }

    function vec_angle(v1: Vector, v2: Vector) {
        let a1 = Math.abs(v1.slope);
        a1 = (a1 > Math.PI) ? a1 - Math.PI : a1;
        let a2 = Math.abs(v2.slope);
        a2 = (a2 > Math.PI) ? a2 - Math.PI : a2;
        return a2 - a1
    }

    function check_obstacles_by_circle(collide_circle: Circle) {
        function compare_distances(a: {result: [number, Segment]}, b: {result: [number, Segment]}) {
            return a.result[0] - b.result[0];
          }
        const list = [];
        for (const obstacle of obstacles) {
            const circle_collision_points = collide_circle.intersect(obstacle);;
            if (circle_collision_points && circle_collision_points.length != 0) {
                const result = collide_circle.center.distanceTo(circle_collision_points[0]);
                list.push({result, obstacle});
            }
        }
        list.sort(compare_distances);
        return list;
    }

    function set_target(_target: Point, set_dir = false) {
        target = _target;
        if (set_dir) current_real_dir = new Vector(current_pos, target);
    }
    
    function set_current_pos(_current_pos: Point) {
        current_pos = _current_pos;
    }
    
    return {get_next_pos, set_target, set_current_pos}

}
