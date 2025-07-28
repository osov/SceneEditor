/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { TDictionary } from "@editor/modules_editor/modules_editor_const";
import { IObjectTypes } from "@editor/render_engine/types";
import { NULL_VALUE, ShapeNames } from "./geometry/const";
import { arc_end, arc_start, clone, point2point, point_at_length, rotate, shape_vector, translate } from "./geometry/logic";
import { Point, Segment, Vector } from "./geometry/shapes";
import { IArc, IPoint, ISegment, PointLike } from "./geometry/types";
import { EQ, EQ_0, multiply, shape_length, vector_slope } from "./geometry/utils";
import { compute_arc_length_table, degToRad, get_position_by_time } from "./math_utils";
import { LinesDrawer } from "./physic/LinesDrawer";
import { ObstaclesManagerCreate } from "./physic/obstacle_manager";
import { PathFinderModule } from "./physic/PathFinder";
import { ControlType, movement_default_settings, PathData, PlayerMovementSettings } from "./physic/types";
import { radToDeg } from "./physic/utils";


export type ControlsState = {
    state: boolean;
    target?: IPoint;
    angle: number;
    control_type: ControlType;
};

export type MovementData = {
    start_pos: IPoint;
    path_data: PathData;
    controls_state: ControlsState;
    last_upd_controls_state: ControlsState;
    upd_time: number;
    has_target: boolean;
    speed: number;
};

declare global {
    const PathUpdater: ReturnType<typeof PathUpdaterModule>;
}

export function register_path_updater() {
    (window as any).PathUpdater = PathUpdaterModule(movement_default_settings);
}

export function PathUpdaterModule(settings: PlayerMovementSettings) {
    const collision_radius = settings.collision_radius;
    const update_interval = settings.min_update_interval;
    const min_target_change = settings.min_target_change;
    const min_angle_change = settings.min_angle_change;
    const path_mult = settings.pred_path_lenght_mult;


    function on_input(movement_data: MovementData, new_state: ControlsState) {
        if (new_state.state && (new_state.target == undefined) && (new_state.angle == -1)) {
            throw new Error('input with no target pos or angle!');
        }
        movement_data.controls_state = {
            state: new_state.state,
            control_type: new_state.control_type, 
            target: new_state.target,
            angle: new_state.angle
        };
    }

    function update_user_path(pos: IPoint, movement_data: MovementData, dt: number) {
        // Если джойстик отпущен, сбрасываем путь (если будем использовать управление кликом мыши, проверять, есть ли целевая позиция и достигнута ли она)
        if (!movement_data.controls_state.state) {
            clear_path(movement_data);
            return false;
        }

        // Если у игрока ещё нет построенного пути, рассчитываем его сразу
        // Если есть, проверяем, что прошло достаточно времени перед следующим перерасчётом пути.
        if (movement_data.path_data.length != 0) {
            movement_data.upd_time += dt;
            if (movement_data.upd_time >= update_interval)
                movement_data.upd_time = 0;
            else 
                return false;
        }

        // const controls_state = movement_data.controls_state;
        // const last_upd_controls_state = movement_data.last_upd_controls_state;
        // if (controls_state != undefined) {
        //     if (last_upd_controls_state == undefined || check_state_changed(controls_state, last_upd_controls_state)) {
        //         update_path(pos, movement_data);
        //     }
        // }

        return update_path(pos, movement_data);
    }

    function clear_path(movement_data: MovementData) {
        movement_data.path_data.length = 0;
        movement_data.path_data.path = [];
        movement_data.path_data.path_points = [];
        movement_data.path_data.arc_table = undefined;
    }

    function update_path(pos: IPoint, movement_data: MovementData,) {
        const target = movement_data.controls_state.target;
        const angle = degToRad(movement_data.controls_state.angle);
        const control_type = movement_data.controls_state.control_type;
        let path_to_check = Segment(Point());
        
        if (control_type == ControlType.JS) {
            if (angle != undefined) {
                const dist_to_check = movement_data.speed * update_interval * path_mult;
                path_to_check = path_from_angle(pos, angle, dist_to_check);
            }
        }
        else if ([ControlType.FP, ControlType.GP,].includes(movement_data.controls_state.control_type)) { 
            if (target != undefined)
                path_to_check = Segment(pos, target);
        }
        if (shape_length(path_to_check) == 0) return false;
        movement_data.path_data = PathFinder.update_path(path_to_check, collision_radius, control_type);
        movement_data.last_upd_controls_state = movement_data.controls_state;
        return movement_data.path_data.path.length != 0;
    }

    
    const pos_point = vmath.vector3();

    function get_user_pos(out_result: PointLike, speed: number, path_data: PathData, dt: number) {
        if (path_data.path.length == 0) return false;
        const start_time = path_data.time;
        path_data.cur_time += dt;
        const now = path_data.cur_time;
        pos_point.x = out_result.x; pos_point.y = out_result.y;
        const elapsed = (now - start_time);
        const distance_traveled = speed * elapsed;
        const ratio = distance_traveled / path_data.length;
        const pos_at_ratio = get_pos_at_ratio(path_data, ratio);
        if (!('null' in pos_at_ratio)) {
            out_result.x = pos_at_ratio.x;
            out_result.y = pos_at_ratio.y;
            return true;
        }
        // get_position_by_time(now, start_time, speed, points, arc_table, pos_point);
        // const dist = Math.sqrt(Math.pow(pos_point.y - out_result.y, 2) + Math.pow(pos_point.x - out_result.x, 2));
        // const p0 = points[0];
        // const px = points[points.length - 1];
        // const dist2 = Math.sqrt(Math.pow(p0.y - px.y, 2) + Math.pow(p0.x - px.x, 2));
        // log(p0.y,  pos_point.y,  px.y, ' || ', dist, dist2, ' || ', dt, dist / dt, speed);
        // out_result.x = pos_point.x; 
        // out_result.y = pos_point.y;
        return true;
    }

    function check_state_changed(state: ControlsState, last_check_state: ControlsState) {
        const control = state.control_type;
        const checked_control = last_check_state.control_type;
        if (control != checked_control)
            return true;

        if (control == ControlType.FP || control == ControlType.GP) {
            const target = state.target;
            const checked_target = last_check_state.target;
            if (target != undefined && checked_target != undefined && point2point(checked_target, target)[0] >= min_target_change)
                return true;
        }

        if (control == ControlType.JS) {
            const angle = state.angle;
            const checked_angle = last_check_state.angle;
            if (angle != undefined && checked_angle != undefined && Math.abs(angle - checked_angle) >= min_angle_change)
                return true;
        }
    }

    function path_from_angle(cp: IPoint, angle: number, length: number) {
        const dir = Vector(1, 0);
        rotate(dir, angle);
        multiply(dir, length);
        const ep = clone(cp);
        translate(ep, dir.x, dir.y);
        return Segment(Point(cp.x, cp.y), Point(ep.x, ep.y));
    }

    function path_to_points_amount(path_data: PathData, amount: number) {
        if (amount == 1 && path_data.path.length > 0) {
            const first = path_data.path[0];
            if (first.name == ShapeNames.Segment) return (first as ISegment).start;
            else return arc_start(first as IArc);
        }
        else if (amount == 0) return false;
        const step = path_data.length / (amount - 1);
        return path_to_points_step(path_data.path, step);
    }

    function path_to_points_step(path: (ISegment | IArc)[], step: number) {
        let length_left = 0;
        const result: IPoint[] = [];
        if (path.length == 0) return result;
        const first = path[0];
        result.push(point_at_length(first, 0) as IPoint);
        for (const interval of path) {
            const length = shape_length(interval);
            if (length < step) {
                length_left += length;
            }
            else if (length >= step) {
                const first_interval = (EQ_0(step - length_left)) ? 0 : step - length_left;
                const point = point_at_length(interval, first_interval) as IPoint;
                result.push(point);
                let total_length = step - length_left + step;
                while (total_length < length && !EQ(total_length, length)) {
                    const point = point_at_length(interval, total_length) as IPoint;
                    result.push(point);
                    total_length += step;
                }
                length_left = length - total_length + step;
            }
        }
        const last = path[path.length - 1];
        result.push(point_at_length(last, shape_length(last)) as IPoint);
        return result;
    }

    function prepare_path_data(path_data: PathData, renew_time = false, step = 1) {
        if (path_data.length == 0) return;
        const points = path_to_points_step(path_data.path, step);
        path_data.path_points = points;
        path_data.arc_table = compute_arc_length_table(points);
        if (renew_time)
            path_data.time = System.now();
    }  
      
    function get_pos_at_ratio(path_data: PathData, _ratio: number) {
        if (path_data.path.length == 0) {
            return NULL_VALUE;
        }
        let ratio = (_ratio > 1) ? 1 : _ratio;
        ratio = (_ratio < 0) ? 0 : _ratio;
        if (ratio == 0) {
            let interval = path_data.path[0];
            let start = (interval.name == ShapeNames.Segment) ? (interval as ISegment).start : arc_start((interval as IArc));
            return start;
        }
        if (ratio == 1) {
            let interval = path_data.path[path_data.path.length - 1];
            let end = (interval.name == ShapeNames.Segment) ? (interval as ISegment).end : arc_end((interval as IArc));
            return end;
        }
        let length_remains = path_data.length * ratio;
        for (const interval of path_data.path) {
            if (length_remains < shape_length(interval)) {
                return point_at_length(interval, length_remains);
            }
            else {
                length_remains -= shape_length(interval);
            }
        }
        return NULL_VALUE;
    }

    return { on_input, update_user_path, get_user_pos, prepare_path_data, path_from_angle };
}

export function get_angle() {
    let angle = -1;
    if ((Input.keys_state['d'] || Input.keys_state['ArrowRight']) && (Input.keys_state['w'] || Input.keys_state['ArrowUp']))
        angle = 45;
    else if ((Input.keys_state['a'] || Input.keys_state['ArrowLeft']) && (Input.keys_state['w'] || Input.keys_state['ArrowUp']))
        angle = 135;
    else if ((Input.keys_state['a'] || Input.keys_state['ArrowLeft']) && (Input.keys_state['s'] || Input.keys_state['ArrowDown']))
        angle = 225;
    else if ((Input.keys_state['d'] || Input.keys_state['ArrowRight']) && (Input.keys_state['s'] || Input.keys_state['ArrowDown']))
        angle = 315;
    else if (Input.keys_state['d'] || Input.keys_state['ArrowRight'])
        angle = 0;
    else if (Input.keys_state['w'] || Input.keys_state['ArrowUp'])
        angle = 90;
    else if (Input.keys_state['a'] || Input.keys_state['ArrowLeft'])
        angle = 180;
    else if (Input.keys_state['s'] || Input.keys_state['ArrowDown'])
        angle = 270;
    return angle;
}


export function test_path_updater(
    obstacles: ISegment[], 
    path: ISegment, 
    collision_radius: number, 
    move: number, 
    update_move_times: number, 
    updates: number
) {
    log('test pathfinder')
    const obstacles_manager = ObstaclesManagerCreate(5);
    obstacles_manager.set_obstacles(obstacles);
    PathFinder.set_obstacles_manager(obstacles_manager);
    const angle = vector_slope(shape_vector(path));
    const points: IPoint[] = [];
    const dt = 1 / 60;
    points.push(path.start);
    const update_distance = move * update_move_times * 2;
    let path_to_check = PathUpdater.path_from_angle(path.start, angle, update_distance);
    const pos = Point(path.start.x, path.start.y)
    const t1 = System.now_ms()
    let n = 0;
    for (n; n < updates; n++) {
        const path_data = PathFinder.update_path(path_to_check, collision_radius, ControlType.JS, true);
        for (let i = 0; i < update_move_times; i++) {
            PathUpdater.get_user_pos(pos, move, path_data, dt)
            points.push(Point(pos.x, pos.y));
        }
        path_to_check = PathUpdater.path_from_angle(pos, angle, update_distance);
    }
    const t2 = System.now_ms()
    log('time', t2 - t1)
    log('points', points.length, 'updates', n)
    return points;
}