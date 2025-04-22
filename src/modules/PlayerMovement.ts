import { Euler, Vector2, Vector2Like, Vector3, } from 'three';
import { AnimatedMesh } from '../render_engine/objects/animated_mesh';
import { get_depth } from '../render_engine/parsers/tile_parser';
import {
    Point,
    Vector, 
    Ray,      
    Segment,  
    Arc, 
    Circle,
} from '2d-geometry';
import { degToRad } from './utils';
import { radToDeg } from 'three/src/math/MathUtils.js';

export enum PointerControl {
    FOLLOW_DIRECTION,   // Двигается в направлении курсора, пока зажата ЛКМ  
    FOLLOW_POINTER,     // Двигается в направлении курсора, пока не достигнет точки уровня, в которой была отпущена ЛКМ
    STICK,              // Двигается в направлении, полученном от джойстика  
}

export enum PathFinderMode {
    BASIC,
    WAY_PREDICTION
}

const point_zero = new Point(0, 0);

export type PlayerMovementSettings = {
    path_finder_mode: PathFinderMode, 
    pointer_control: PointerControl,
    keys_control: boolean,         // TODO: управление через клавиатуру
    model_layer: number,    
    target_stop_distance: number,  // Расстояние остановки игрока от точки target
    animation_names: AnimationNames, 
    update_interval: number,       // Интервал между обновлениями прогнозируемого пути по умолчанию 
    min_update_interval: number,   // Минимальный интервал между обновлениями прогнозируемого пути
    update_way_angle: number,      // Минимальный угол изменения направления движения, при котором произойдёт обновление прогнозируемого пути
    block_move_min_angle: number,  // Минимальный угол между нормалью к препятствию и направлением движения, при котором возможно движение вдоль препятствия
    speed: SpeedSettings,
    collision_radius: number,
    max_try_dist: number,          // Только для BASIC режима расчёта пути, шаг проверки столкновений с препятствиями
    max_blocked_move_time: number, // Время нахождения застрявшего игрока в одной позиции, после которого движение приостановится
    blocked_move_min_dist: number, // Минимальное расстояние для перемещения, меньше него позиция остаётся прежней.
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

enum RotationType {
    CW,    // clockwise
    CCW,   // counterclockwise
}

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
}

type ClosestObstacleData = {
    obstacle: Segment | undefined;
    distance: number;
    point: undefined;
    distance_segment: Segment | undefined;
    is_vertice: boolean;
}


export const default_settings: PlayerMovementSettings = {
    path_finder_mode: PathFinderMode.BASIC,
    pointer_control: PointerControl.FOLLOW_POINTER,
    keys_control: true,
    target_stop_distance: 2,
    model_layer: 15, 
    animation_names: {IDLE: "idle", WALK: "walk"},
    update_interval: 2,
    min_update_interval: 0.2,
    update_way_angle: 5 * Math.PI / 180,
    block_move_min_angle: 15 * Math.PI / 180,
    speed: {WALK: 26},
    collision_radius: 4,
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
    let pointer = new Point(0, 0);
    let target = new Point(0, 0);
    const stick_dir = new Vector();
    const obstacles: Segment[] = [];
    const position = new Point();
    const target_error = settings.target_stop_distance;
    const layer = settings.model_layer;
    const animations = settings.animation_names;
    const pointer_control = settings.pointer_control;
    const max_blocked_move_time = settings.max_blocked_move_time;
    const blocked_max_dist = settings.blocked_move_min_dist;
    const PF = PathFinder(settings, obstacles);
    let is_moving = false;
    let is_pointer_down = false;
    let is_in_target = false;
    let blocked_move_time = 0;
    let has_target = false;

    function init(model: AnimatedMesh, _obstacles: Segment[] = []) {
        target = new Point(model.position.x, model.position.y);
        PF.set_current_pos(target);
        PF.set_target(new Point(model.position.x, model.position.y), true);
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
                EventBus.on('SYS_INPUT_POINTER_DOWN', (e) => {
                    has_target = true;
                });
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
            if (end_pos.x == start_pos.x && end_pos.y == start_pos.y) {
                stop_movement();
                return;
            };
            if (start_pos.distanceTo(end_pos)[0] > blocked_max_dist) {
                model.position.x = end_pos.x;
                model.position.y = end_pos.y;
                PF.set_current_pos(end_pos);
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
            pointer = new Point(pos.x, pos.y);
            const wp = Camera.screen_to_world(pointer.x, pointer.y);
            target = new Point(wp.x, wp.y);
            PF.set_target(target, true);
        }
    }

    function update_direction(direction: Vector) {
        PF.set_direction(direction);
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
function PathFinder(settings: PlayerMovementSettings, _obstacles?: Segment[]) {
    const predicted_way_lenght_mult = 1.0;
    const collision_min_error = 0.001;
    const rays_number = 2;
    const max_intervals = 10;
    const mode = settings.path_finder_mode;
    const speed = settings.speed;
    const blocked_move_min_dist = settings.blocked_move_min_dist;
    const move_min_angle = settings.block_move_min_angle;
    const max_try_dist = settings.max_try_dist;
    const collision_radius = settings.collision_radius;
    const update_t_interval = settings.update_interval;
    const min_update_t_interval = settings.min_update_interval;
    const update_way_angle = settings.update_way_angle;
    const way_intervals: (Segment | Arc)[] = [];
    let current_pos = new Point(0, 0);
    let current_target = new Point(0, 0);
    let current_speed: number = speed.WALK;
    let current_dir = new Vector(0, 0);
    let last_check_dir = new Vector(0, 0);
    let time_elapsed = 0;
    let obstacles = (_obstacles) ? _obstacles : [];
    
    if (mode == PathFinderMode.WAY_PREDICTION) {
        EventBus.on('SYS_ON_UPDATE', (e) => {
            time_elapsed += e.dt;
            // TODO: Сделать проверку, есть ли необходимость выполнять update_way по истечении времени.
            if (check_dir_change()) {
                if (time_elapsed >= min_update_t_interval) {
                    last_check_dir = current_dir.clone();
                    update_way();
                    time_elapsed = 0;
                }
            }
            else {
                if (time_elapsed >= update_t_interval) {
                    last_check_dir = current_dir.clone();
                    update_way();
                    time_elapsed = 0;
                }
            }
        })
    }

    function check_dir_change() {
        let result = false;
        if (last_check_dir.length == 0 && current_dir.length != last_check_dir.length)
            result = true;
        else if (current_dir.length != 0 && last_check_dir.length != 0) {
            const d_angle = vec_angle(current_dir, last_check_dir);
            result = (d_angle > update_way_angle);
        }
        return result;
    }

    function update_way() {
        let way_required = get_required_way(update_t_interval);
        let lenght_remains = way_required.length;
        const data: PredictNextMoveData = {next_do: NextMoveType.STRAIGHT_LINE, way_required, lenght_remains};
        way_intervals.splice(0, way_intervals.length);
        let counter = 0;
        while (data.lenght_remains > collision_min_error && counter < max_intervals) {
            if (data.next_do == NextMoveType.STRAIGHT_LINE) linear_move(data);
            else if (data.next_do == NextMoveType.SLIDE_OBSTACLE) slide_obstacle_move(data);
            else if (data.next_do == NextMoveType.BYPASS_ANGLE) bypass_angle(data);
            else if (data.next_do == NextMoveType.STOP) return;
            counter ++;
        }
        // log("update_way", way_required, way_intervals)
    }

    function bypass_angle(data: PredictNextMoveData) {
        const point = data.vertice_to_bypass as Point;
        const s_pos = data.way_required.start;
        data.next_do = NextMoveType.STOP; 
    }

    function slide_obstacle_move(data: PredictNextMoveData) {
        const obstacle = data.obstacle_to_slide as Segment;
        const s_pos = data.way_required.start;
        const distance_data = s_pos.distanceTo(obstacle);
        const translate_vec = distance_data[1].vector.invert();
        const slide_l = new Segment(distance_data[1].end, obstacle.start);
        const slide_r = new Segment(distance_data[1].end, obstacle.end);
        const angle_l = Math.abs(vec_angle(data.way_required.vector, slide_l.vector));
        const angle_r = Math.abs(vec_angle(data.way_required.vector, slide_r.vector));
        const slide = (angle_l < angle_r) ? slide_l : slide_r;
        const d_angle = Math.abs(vec_angle(slide.vector, data.way_required.vector));

        // Требуемый путь, чтобы добраться до края препятствия:
        let way_required_to_slide = slide.translate(translate_vec);
        // Оставшееся расстояние может закончиться раньше, чем добрались до края препятствия:
        const max_slide_distance = data.lenght_remains * Math.cos(d_angle);
        way_required_to_slide = way_required_to_slide.splitAtLength(max_slide_distance)[0];

        let allowed_way = way_required_to_slide;

        const closest = find_closest_obstacle_use_offsets(way_required_to_slide, obstacles);
        if (closest.obstacle) {
            const way_segments = way_required_to_slide.splitAtLength(closest.distance - collision_min_error);
            allowed_way = way_segments[0];
            data.obstacle_to_slide = closest.obstacle;
            data.lenght_remains -= (allowed_way.length / Math.cos(d_angle));
            if (closest.is_vertice) {
                data.vertice_to_bypass = closest.point;
                data.next_do = NextMoveType.BYPASS_ANGLE;  // TODO: bypass_angle не готово, пока будем останавливаться при задевании углов препятствий
            } 
            else {
                 // Если столкнулись с препятствием, которое обходили в предыдущее действие, останавливаемся.
                if (closest.obstacle == data.prev_obstacle) {
                    data.next_do = NextMoveType.STOP; 
                }
                else {
                    data.next_do = NextMoveType.SLIDE_OBSTACLE;
                    data.prev_obstacle = closest.obstacle;
                }
            }
        }
        else { 
            if (max_slide_distance < slide.length) {
                data.lenght_remains = 0; 
                data.next_do = NextMoveType.STOP; 
            }
            else {
                data.lenght_remains -= (slide.length / Math.cos(d_angle));
                data.vertice_to_bypass = slide.end;
                data.next_do = NextMoveType.BYPASS_ANGLE;  // TODO: bypass_angle не готово, пока будем останавливаться при задевании углов препятствий
            }
        }
        data.way_required = new Segment(allowed_way.end, data.way_required.end);
        way_intervals.push(allowed_way);
    }

    function linear_move(data: PredictNextMoveData) {
        // TODO: С лучами не всегда правильно определяет расстояния до препятствий, с оффсетами работает лучше
        // const {rays_L, rays_R} = build_rays(data.way_required, rays_number); 
        // const shortest_L = find_closest_obstacle_use_rays(rays_L, obstacles, 'left');
        let allowed_way = data.way_required;
        const closest = find_closest_obstacle_use_offsets(data.way_required, obstacles);
        if (closest.obstacle) {
            const way_segments = data.way_required.splitAtLength(closest.distance - collision_min_error);
            allowed_way = way_segments[0];
            data.way_required = way_segments[1];
            data.obstacle_to_slide = closest.obstacle;
            data.lenght_remains -= allowed_way.length;
            if (closest.is_vertice) {
                data.vertice_to_bypass = closest.point;
                // data.next_do = NextMoveType.BYPASS_ANGLE;  // TODO: bypass_angle не готово, пока будем останавливаться при задевании углов препятствий
                data.next_do = NextMoveType.STOP; 
            } 
            else {
                data.next_do = NextMoveType.SLIDE_OBSTACLE;
            }
        }
        else {
            data.next_do = NextMoveType.STOP;
            data.lenght_remains = 0; 
        }
        way_intervals.push(allowed_way);
    }

    function build_rays(required_way: Segment, number: number) {
        // const collide_circle = new Circle(required_way.start, collide_radius);
        const r_limits = collision_radius;
        const tangent = required_way.vector.normalize();
        const normal_L = tangent.rotate90CW();
        const normal_R = tangent.rotate90CCW();
        const ray = new Ray(required_way.start, normal_L);
        const rays_L: Ray[] = [];
        const rays_R: Ray[] = [];
        const step = r_limits / number;
        for (let i = 0; i < number; i ++) {
            const multiplier_norm = r_limits - step * i;
            const multiplier_tan = Math.sqrt(1 - multiplier_norm ** 2);
            const tan_transl_vec = tangent.multiply(multiplier_tan);
            const normal_transl_vec_L = normal_L.multiply(multiplier_norm);
            const normal_transl_vec_R = normal_R.multiply(multiplier_norm);
            const translation_L = normal_transl_vec_L.add(tan_transl_vec);
            const translation_R = normal_transl_vec_R.add(tan_transl_vec);
            let ray_L = ray.translate(translation_L);
            let ray_R = ray.translate(translation_R);
            rays_L.push(ray_L);
            rays_R.push(ray_R);
        }
        return {rays_L, rays_R}
    }

    function build_offsets(obstacle: Segment) {
        const result: (Segment | Arc)[] = [];
        const padding_r = collision_radius;
        const tangent = obstacle.vector.normalize();
        const normal = tangent.rotate90CW();
        result.push(obstacle.translate(normal.multiply(padding_r)));
        result.push(obstacle.translate(normal.multiply(-padding_r)));
        const slope = obstacle.slope;
        result.push(new Arc(obstacle.start, collision_radius, slope + Math.PI / 2, slope - Math.PI / 2, true));
        result.push(new Arc(obstacle.end, collision_radius, slope - Math.PI / 2, slope + Math.PI / 2, true));
        return result;
    }

    function find_closest_obstacle_use_rays(rays: Ray[], obstacles: Segment[], side_name: "left" | "right") {
        const intersected_obstacles_groups: Segment[][] = []
        let shortest_distance = Infinity;
        let closest_obstacle: Segment | undefined = undefined;
        let shortest_ray_segment: Segment | undefined = undefined;
        for (const ray of rays) {
            const ray_intersected_obstacles: Segment[] = [];
            intersected_obstacles_groups.push(ray_intersected_obstacles);
            for (const obstacle of obstacles) {
                const obstacle_points = ray.intersect(obstacle);
                if (obstacle_points.length) {
                    const distance_segment = new Segment(ray.start, obstacle_points[0]);
                    const distance = distance_segment.length;
                    ray_intersected_obstacles.push(obstacle);
                    if (distance < shortest_distance) {
                        shortest_distance = distance;
                        closest_obstacle = obstacle;
                        shortest_ray_segment = distance_segment;
                    }
                }
            }
        }
        return {obstacle: closest_obstacle, distance: shortest_distance, distance_segment: shortest_ray_segment, side: side_name};
    }

    function find_closest_obstacle_use_offsets(way_required: Segment, obstacles: Segment[]): ClosestObstacleData {
        let shortest_distance = Infinity;
        let closest_point: Point | undefined = undefined;
        let closest_obstacle: Segment | undefined = undefined;
        let shortest_way_segment: Segment | undefined = undefined;
        let is_vertice: boolean = false;
        for (const obstacle of obstacles) {
            const offsets = build_offsets(obstacle);
            for (const offset of offsets) {
                const intersections = way_required.intersect(offset);
                const closest = get_closest_point(way_required.start, intersections);
                if (closest && closest.distance < shortest_distance) {
                    shortest_distance = closest.distance;
                    shortest_way_segment = closest.distance_segment;
                    closest_obstacle = obstacle;
                    is_vertice = (offset.name == "arc") ? true : false;
                }
            }
        }
        if (!closest_obstacle) 
            shortest_distance = way_required.length;
        return {obstacle: closest_obstacle, distance: shortest_distance, point: closest_point, distance_segment: shortest_way_segment, is_vertice};
    }

    function get_closest_point(target: Point, points: Point[]) {
        const list: {distance: number, distance_segment: Segment, point: Point}[] = [];
        for (const point of points) {
            const data = point.distanceTo(target);
            list.push({distance: data[0], distance_segment: data[1], point});
        }
        list.sort((a, b) => a.distance - b.distance);
        return list[0];
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
            const disired_dir = new Vector(current_pos, current_target);
            // angle = disired_dir.angleTo(segment.vector);
        }
        else if (interval.name == "arc") {
            const arc = interval as Arc;
            const disired_dir = new Vector(current_pos, current_target);
            const actual_dir = arc.tangentInStart();
            // angle = disired_dir.angleTo(actual_dir);
        }
        // TODO: угол можно использовать для корректировки скорости при движении вдоль препятствий
        // const cosA = Math.cos(angle);
        const cosA = 1;
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

    function find_current_interval(current_pos: Point) {
        for (let i = 0; i < way_intervals.length; i++) {
            if (way_intervals[i].contains(current_pos))
                return i;
        }
        return -1;
    }
    
    function get_next_pos_way_prediction(current_pos: Point, dt: number) {
        if (way_intervals.length == 0) {
            Log.error("No calculated way to get the next waypoint!");
        };
        let _current_pos = current_pos;
        let _time_remains = dt;
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
            const {point, time_remains} = get_waypoint_on_interval(interval, _time_remains);
            _current_pos = point;
            _time_remains = time_remains;
            if (!time_remains) {
                // Log.error("Calculated way ended before the remaining time for the move!");
                break;
            }
            i ++;
        }
        return _current_pos;
    }

    function get_next_pos_basic(current_pos: Point, dt: number) {
        const dist_to_target = current_pos.distanceTo(current_target)[0];
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
        let dir = new Vector(current_pos, current_target);
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
        const collide_circle = new Circle(try_pos, collision_radius);
        const obstacles = check_obstacles_by_circle(collide_circle);
        if (obstacles.length > 0) {
            if (correction) return {new_pos: start_pos, stop_search: true};
            const {distance, obstacle} = obstacles[0];
            if (distance[0] < blocked_move_min_dist) return {new_pos: start_pos, stop_search: true};
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
        let a = v1.angleTo(v2);
        if (a > Math.PI) a = 2 * Math.PI - a;
        return a
    }

    function check_obstacles_by_circle(collide_circle: Circle) {
        const list = [];
        for (const obstacle of obstacles) {
            const circle_collision_points = collide_circle.intersect(obstacle);;
            if (circle_collision_points && circle_collision_points.length != 0) {
                const distance = collide_circle.center.distanceTo(circle_collision_points[0]);
                list.push({distance, obstacle});
            }
        }
        list.sort(_compare_distances);
        return list;
    }

    function set_target(_target: Point, set_dir = false) {
        current_target = _target;
        if (set_dir) {
            current_dir = new Vector(current_pos, current_target);
            if (check_dir_change()) {
                last_check_dir = current_dir.clone();
                    update_way();
                    time_elapsed = 0;
            }
        }
    }
    
    function set_current_pos(_current_pos: Point) {
        current_pos = _current_pos;
    }

    function set_direction(_dir: Vector) {
        current_dir = new Vector(current_pos, current_target);
    }

    function set_obstacles(_obstacles: Segment[]) {
        obstacles = _obstacles;
    }

    function get_required_way(update_t_interval?: number) {
        let way_required = new Segment(current_pos, current_target);
        if (update_t_interval) {
            let lenght_remains = update_t_interval * current_speed * predicted_way_lenght_mult;
            if (lenght_remains < way_required.length) {
                way_required = way_required.splitAtLength(lenght_remains)[0]
            }
        }
        return way_required;
    }

    function get_current_pos() {
        return current_pos;
    }

    function get_predicted_way() {
        return way_intervals;
    }
   
    function _compare_distances(a: {distance: [number, Segment]}, b: {distance: [number, Segment]}) {
        return a.distance[0] - b.distance[0];
    }

    return {get_next_pos, set_target, set_direction, set_current_pos, get_current_pos, set_obstacles, build_rays, find_closest_obstacle_use_rays, find_closest_obstacle_use_offsets, linear_move, bypass_angle, slide_obstacle_move, get_required_way, get_predicted_way, update_way}

}

export function test_pathfinder() {
    const obstacle_A = new Segment(0, -4, 7, -1);
    const obstacle_B = new Segment(2, -4, 12, 3);
    const target = new Point(40, 0);
    let current_pos = new Point(0, 0);
    let settings: PlayerMovementSettings = {...default_settings, update_interval: 20, min_update_interval: 1, collision_radius: 3, speed: {WALK: 1}, path_finder_mode: PathFinderMode.WAY_PREDICTION}
    const PF = PathFinder(settings);
    PF.set_target(target);
    PF.set_current_pos(current_pos);
    PF.set_obstacles([obstacle_A, obstacle_B]);
    PF.update_way();
    const way_intervals = PF.get_predicted_way();
    log(way_intervals)
    for (let i = 1; i < 10; i++) {
        const new_pos = PF.get_next_pos(current_pos, 1);
        log('distance', current_pos.distanceTo(new_pos)[0]);
        current_pos = new_pos;
        log('current_pos', current_pos);
    }
}
