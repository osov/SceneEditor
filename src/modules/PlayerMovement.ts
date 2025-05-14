import { AnimatedMesh } from '../render_engine/objects/animated_mesh';
import { get_depth, MapData, parse_tiled } from '../render_engine/parsers/tile_parser';
import { EQ_0 } from './utils';
import { IObjectTypes } from '../render_engine/types';
import { WORLD_SCALAR as WS } from '../config';
import { GoContainer } from '../render_engine/objects/sub_types';
import { PathFinder } from './PathFinder';
import {
    point,
    vector_from_points as vector,
    segment,
    arc,
    Point,
    Segment,
    vec_angle,
    PointLike,
} from './Geometry';
import { LinesDrawer } from './LinesDrawer';


/**
 * JS (JOYSTICK) двигается в направлении, полученном от джойстика   
 * FP (FOLLOW_POINTER) - двигается в направлении курсора, пока не достигнет точки уровня, в которой была отпущена ЛКМ
 */
export enum PointerControl {
    JS,
    FP,
    // FOLLOW_DIRECTION,            
}

export type PlayerMovementSettings = {
    max_predicted_way_intervals: number,  // Макс. количество отрезков прогнозируемого пути, на котором цикл построения пути завершится преждевременно
    min_predicted_way_lenght: number,     // TODO: Проверить, нужно ли это делать, или можно обойтись без минимальной длины прогнозируемого пути
    predicted_way_lenght_mult: number,    // Множитель длины пути для построения пути с запасом
    collision_min_error: number,          // Минимальное расстояние сближения с припятствиями, для предотвращения соприкосновений геометрий 
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
    collision_radius: number,      // Радиус столкновения управляемого персонажа с препятствиями
    max_try_dist: number,          // Только для BASIC режима расчёта пути, шаг проверки столкновений с препятствиями
    max_blocked_move_time: number, // Время нахождения застрявшего игрока в одной позиции, после которого движение приостановится
    blocked_move_min_dist: number, // Минимальное расстояние для перемещения, меньше него позиция остаётся прежней.
    min_stick_dist: number,
    debug?: boolean,
    clear_drawn_lines?: boolean,   // Если false, все рисуемые линии остаются после update
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
    max_predicted_way_intervals: 10,
    min_predicted_way_lenght: 4,
    predicted_way_lenght_mult: 1.5,
    collision_min_error: 0.001,
    pointer_control: PointerControl.FP,
    keys_control: true,
    target_stop_distance: 2,
    model_layer: 15, 
    animation_names: {IDLE: "idle", WALK: "walk"},
    update_interval: 2.5,
    min_update_interval: 0.2,
    update_way_angle: 3 * Math.PI / 180,
    block_move_min_angle: 15 * Math.PI / 180,
    speed: {WALK: 26},
    collision_radius: 4,
    max_try_dist: 0.2,
    max_blocked_move_time: 5,
    blocked_move_min_dist: 0.006,
    clear_drawn_lines: true,
    min_stick_dist: 15,
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

export function load_obstacles(map_data: MapData) {
    const obstacles: Segment[] = [];
    const render_data = parse_tiled(map_data);
    const now = Date.now();
    for (let object_layer of render_data.objects_layers) {
        for (let tile of object_layer.objects) {
            if (tile.polygon || tile.polyline) {
                const cx = tile.x * WS;
                const cy = tile.y * WS;
                if (tile.polygon) {
                    for (let i = 0; i < tile.polygon.length - 1; i ++) {
                        const s_x = tile.polygon[i].x;
                        const s_y = tile.polygon[i].y;
                        const e_x = tile.polygon[i + 1].x;
                        const e_y = tile.polygon[i + 1].y;
                        const seg = segment(cx + s_x * WS, cy - s_y * WS, cx + e_x * WS, cy - e_y * WS);
                        obstacles.push(seg);
                    }
                    
                    const s_x = tile.polygon[tile.polygon.length - 1].x;
                    const s_y = tile.polygon[tile.polygon.length - 1].y;
                    const e_x = tile.polygon[0].x;
                    const e_y = tile.polygon[0].y;
                    const seg = segment(cx + s_x * WS, cy - s_y * WS, cx + e_x * WS, cy - e_y * WS);
                    obstacles.push(seg);
                }
                if (tile.polyline) {
                    for (let i = 0; i < tile.polyline.length - 1; i ++) {
                        const s_x = tile.polyline[i].x;
                        const s_y = tile.polyline[i].y;
                        const e_x = tile.polyline[i + 1].x;
                        const e_y = tile.polyline[i + 1].y;
                        const seg = segment(cx + s_x * WS, cy - s_y * WS, cx + e_x * WS, cy - e_y * WS);
                        obstacles.push(seg);
                    }
                }
            }
        }
    }
    const total_time = (Date.now() - now) / 1000;
    log(`Obstacles loading took ${total_time} sec`)
    return obstacles;
}

export function MovementLogic(settings: PlayerMovementSettings = default_settings) {
    let pointer = point(0, 0);
    let target = point(0, 0);
    let last_check_dir = vector(pointer, target);
    let stick_start: Point | undefined = undefined;
    let stick_end: Point | undefined = undefined;
    let current_dir = vector(pointer, target);
    const obstacles: Segment[] = [];
    const target_error = settings.target_stop_distance;
    const layer = settings.model_layer;
    const animations = settings.animation_names;
    const pointer_control = settings.pointer_control;
    const max_blocked_move_time = settings.max_blocked_move_time;
    const blocked_max_dist = settings.blocked_move_min_dist;
    const update_t_interval = settings.update_interval;
    const min_update_t_interval = settings.min_update_interval;
    const update_way_angle = settings.update_way_angle;
    const min_stick_dist = settings.min_stick_dist;
    const debug =  settings.debug;
    const clear_drawn_lines =  settings.clear_drawn_lines;
    const min_predicted_way_lenght = settings.min_predicted_way_lenght;
    const predicted_way_lenght_mult = settings.predicted_way_lenght_mult;
    const PF = PathFinder(settings, obstacles);
    const LD = LinesDrawer();
    const speed = settings.speed;
    const collision_radius = settings.collision_radius;
    let current_speed: number = speed.WALK;
    let is_moving = false;
    let is_pointer_down = false;
    let is_in_target = false;
    let blocked_move_time = 0;
    let time_elapsed = 0;
    let has_target = false;
    const player_container = SceneManager.create(IObjectTypes.GO_CONTAINER, {});
    player_container.name = 'player collision circle';
    SceneManager.add(player_container);
    const way_container = SceneManager.create(IObjectTypes.GO_CONTAINER, {});
    way_container.name = 'way intervals';
    SceneManager.add(way_container);
    const marked_obstacles = SceneManager.create(IObjectTypes.GO_CONTAINER, {});
    marked_obstacles.name = 'marked obstacles';
    SceneManager.add(marked_obstacles);

    const joystick = SceneManager.create(IObjectTypes.GO_CONTAINER, {});
    joystick.name = 'joystick';
    SceneManager.add(joystick);
    

    function init(init_data: {model: AnimatedMesh, obstacles: Segment[]}) {
        const model = init_data.model;
        target = point(model.position.x, model.position.y);
        PF.set_current_pos(target);
        obstacles.push(...init_data.obstacles);

        if (pointer_control == PointerControl.FP) {
            EventBus.on('SYS_ON_UPDATE', (e) => {
                time_elapsed += e.dt;
                if (!has_target) return;
                if (is_pointer_down) {  
                    // Если удерживать кнопку мыши, путь перестраивается раз в min_update_t_interval с.
                    // TODO: Чтобы реже перестраивать путь, возможно стоит еще делать проверку что положение target 
                    // (цель перемещения) изменилось на заданную минимальную величину
                    if (time_elapsed >= min_update_t_interval) {
                        update_predicted_way();
                        time_elapsed = 0;
                    }
                }
                else {
                    if (time_elapsed >= update_t_interval) {
                        update_predicted_way();
                        time_elapsed = 0;
                    }
                }
            })
        }

        if (pointer_control == PointerControl.JS) {
            EventBus.on('SYS_ON_UPDATE', (e) => {
                time_elapsed += e.dt;
                if (!stick_start) return;
                if (check_dir_change()) {
                    // TODO: Возможно стоит сделать зависимость min_update_t_interval от величины изменения 
                    // направления, чем сильнее изменилось направление, там меньше интервал времени до следующего update_predicted_way()
                    if (time_elapsed >= min_update_t_interval) {
                        update_predicted_way();
                        time_elapsed = 0;
                    }
                }
                else {
                    if (time_elapsed >= update_t_interval) {
                        update_predicted_way();
                        time_elapsed = 0;
                    }
                }
            })
        }

        if (pointer_control == PointerControl.FP) {
            EventBus.on('SYS_INPUT_POINTER_DOWN', (e) => {
                if (e.button != 0)
                    return;
                is_pointer_down = true;
                has_target = true;
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
                const current_pos = point(model.position.x, model.position.y);
                const dist = current_pos.distanceTo(target)[0];
                is_in_target = (dist <= target_error) ? true : false;
                if (!is_in_target) has_target = true;
            });
            EventBus.on('SYS_ON_UPDATE', (e) => handle_update_follow_pointer(e.dt));
        }

        // Используем мышь вместо реального джойстика
        else if (pointer_control == PointerControl.JS) {
            EventBus.on('SYS_INPUT_POINTER_DOWN', (e) => {
                if (e.button != 0)
                    return;
                stick_start = point(e.x, e.y);
            });
            
            EventBus.on('SYS_INPUT_POINTER_MOVE', (e) => {
                update_stick_direction(e);
            });
    
            EventBus.on('SYS_INPUT_POINTER_UP', (e) => {
                if (!stick_start)
                    return;
                stick_start = undefined;
                current_dir = vector(point(0, 0), point(0, 0));
                LD.clear_container(joystick);
                LD.clear_container(way_container);
            });
            
            EventBus.on('SYS_ON_UPDATE', (e) => {
                if (stick_start && stick_end) {
                    const start = Camera.screen_to_world(stick_start.x, stick_start.y);
                    const end = Camera.screen_to_world(stick_end.x, stick_end.y);
                    LD.clear_container(joystick);
                    if (debug) {
                        LD.add_arc(arc(point(start.x, start.y), 3, 0, Math.PI * 2), joystick, 0xffffff);
                        LD.add_arc(arc(point(end.x, end.y), 3, 0, Math.PI * 2), joystick, 0xff0000);
                    }

                }
                handle_update_follow_direction(e.dt);
            });
        }
    
        function update_predicted_way() {
            let way_required = get_required_way(update_t_interval);
            if (EQ_0(way_required.length())) {
                return;
            }
            last_check_dir = current_dir.clone();
            PF.update_predicted_way(way_required, pointer_control);
        }

        function get_required_way(dt: number) {
            const cp = point(model.position.x, model.position.y);
            let lenght_remains = dt * current_speed * predicted_way_lenght_mult;
            let way_required = segment(cp.x, cp.y, target.x, target.y);
            if (pointer_control == PointerControl.FP) {
                if (lenght_remains < way_required.length()) {
                    const _segment = way_required.splitAtLength(lenght_remains)[0];
                    way_required = (_segment) ? _segment : segment(cp.x, cp.y, cp.x, cp.y);
                }
            }
            if (pointer_control == PointerControl.JS) {
                if (!EQ_0(current_dir.length())) {
                    const ep = cp.translate(current_dir.normalize().multiply(lenght_remains));
                    way_required = segment(cp.x, cp.y, ep.x, ep.y);
                }
                else 
                    way_required = segment(cp.x, cp.y, cp.x, cp.y);
            }
            return way_required;
        }

        function check_dir_change() {
            let result = false;
            if (last_check_dir.length() == 0 && current_dir.length() != last_check_dir.length())
                result = true;
            else if (current_dir.length() != 0 && last_check_dir.length() != 0) {
                const d_angle = Math.abs(vec_angle(current_dir, last_check_dir));
                result = (d_angle > update_way_angle);
            }
            return result;
        }

        function handle_update_follow_pointer( dt: number ) {
            if (!has_target) return;
            const current_pos = point(model.position.x, model.position.y);
            const dist = current_pos.distanceTo(target)[0];
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
            if (current_dir.length() == 0) {
                if (is_moving) stop_movement();
            }   
            else {
                update_position(dt);
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
            const current_pos = point(model.position.x, model.position.y);
            const available_way = PF.get_way_length();
            if (available_way == 0) {
                stop_movement();
                return;
            }
            const end_pos = PF.get_next_pos(current_pos, dt, current_speed); 
            if (!end_pos || (end_pos.equalTo(current_pos))) {
                stop_movement();
                return;
            }
            else {
                if (!is_moving) start_movement();
            }
            if (current_pos.distanceTo(end_pos)[0] > blocked_max_dist) {
                model.position.x = end_pos.x;
                model.position.y = end_pos.y;
                PF.set_current_pos(end_pos);
                if (clear_drawn_lines) LD.clear_container(player_container);
                if (debug) LD.add_arc(arc(current_pos, collision_radius, 0, 2 * Math.PI), player_container, 0x66ffff);
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
            const dir = vector(current_pos, end_pos);
            model.rotation.y = interpolate_with_wrapping(model.rotation.y, Math.atan2(dir.y, dir.x) + Math.PI / 2, 0.1, 0, 2 * Math.PI);
            model.transform_changed();
        }
    }


    function update_pointer_position(pos: PointLike) {
        if (is_pointer_down) {
            pointer = point(pos.x, pos.y);
            const wp = Camera.screen_to_world(pointer.x, pointer.y);
            target = point(wp.x, wp.y);
        }
    }

    function update_stick_direction(e: PointLike) {
        if (!stick_start)
            return;
        stick_end = point(e.x, e.y);
        if (stick_end.distanceTo(stick_start)[0] < min_stick_dist)
        current_dir = vector(stick_start, stick_end);
    }

    function enable_obstacles(enable = true) {
        PF.enable_obstacles(enable)
    }

    function check_obstacles_enabled() {
        return PF.check_obstacles_enabled();
    }

    function mark_obstacles(_obstacles: Segment[]) {
        for (const obstacle of _obstacles) {
            LD.add_line(obstacle.start, obstacle.end, marked_obstacles, 0xffff00);
        }
    }

    return {init, enable_obstacles, check_obstacles_enabled, mark_obstacles}
}


