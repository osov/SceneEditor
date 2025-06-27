import { AnimatedMesh } from '../render_engine/objects/animated_mesh';
import { get_depth } from '../render_engine/parsers/tile_parser';
import { EQ_0 } from '../modules/utils';
import { IObjectTypes } from '../render_engine/types';
import { WORLD_SCALAR } from '../config';
import { PathFinder } from '../utils/physic/PathFinder';
import { Line as GeomLine, LineBasicMaterial } from 'three';
import { LinesDrawer } from '../utils/physic/LinesDrawer';
import { PlayerMovementSettings, movement_default_settings, ControlType, PathData, COLORS } from '@editor/modules/types';
import { POINT_EMPTY } from '@editor/utils/geometry/const';
import { IPoint, IArc, ISegment, PointLike } from '@editor/utils/geometry/types';
import { point, vector_from_points as vector, segment, vec_angle, clone, shape_equal_to, shape_length, split_at_length, vector_slope } from '@editor/utils/geometry/utils';
import { Arc } from '@editor/utils/geometry/shapes';
import { point2point } from '@editor/utils/geometry/distance';


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

export function MovementControlCreate(settings: PlayerMovementSettings = movement_default_settings) {
    let path_data: PathData = {length: 0, path: []};
    const LD = LinesDrawer();
    const width = 50 * WORLD_SCALAR;
    const height = 50 * WORLD_SCALAR;
    let pointer = point(0, 0);
    let target = point(0, 0);
    let last_check_dir = vector(pointer, target);
    let last_check_target = point(0, 0);
    let stick_start: IPoint | undefined = undefined;
    let stick_end: IPoint | undefined = undefined;
    let current_dir = vector(pointer, target);
    let target_error = settings.target_stop_distance;
    let animations = settings.animation_names;
    let pointer_control = settings.control_type;
    let collision_radius = settings.collision_radius;
    let max_blocked_move_time = settings.max_blocked_move_time;
    let min_required_path = settings.min_required_path;
    let min_awailable_path = settings.min_awailable_path;
    let min_idle_time = settings.min_idle_time;
    let min_target_change = settings.min_target_change;
    let blocked_max_dist = settings.blocked_move_min_dist;
    let update_t_interval = settings.update_interval;
    let min_update_t_interval = settings.min_update_interval;
    let min_find_path_interval = settings.min_find_path_interval;
    let update_way_angle = settings.update_path_angle;
    let min_stick_dist = settings.min_stick_dist;
    let pred_path_lenght_mult = settings.pred_path_lenght_mult;
    let speed = settings.speed;
    let debug =  settings.debug;
    let current_speed: number = speed.WALK;
    let is_moving = false;
    let is_pointer_down = false;
    let is_in_target = false;
    let blocked_move_time = 0;
    let last_upd_time_elapsed = 0;
    let last_stop_time_elapsed = 0;
    let has_target = false;
    let PF: PathFinder;
    let model: AnimatedMesh;

    const obstacles_lines: {[key: string]: GeomLine<any>[]} = {};

    const joystick = SceneManager.create(IObjectTypes.GO_CONTAINER, {});
    joystick.name = 'joystick';
    SceneManager.add(joystick);
    const player_geometry = SceneManager.create(IObjectTypes.GO_CONTAINER, {});
    player_geometry.name = 'player_geometry';
    SceneManager.add(player_geometry);
    const player_way = SceneManager.create(IObjectTypes.GO_CONTAINER, {});
    player_way.name = 'player_way';
    SceneManager.add(player_way);
    const obstacles_container = SceneManager.create(IObjectTypes.GO_CONTAINER, {});
    obstacles_container.name = 'obstacles';
    SceneManager.add(obstacles_container);

    function init(init_data: { model: AnimatedMesh, path_finder: PathFinder }) {
        model = init_data.model;
        PF = init_data.path_finder;
        target = point(model.position.x, model.position.y);

        if (debug) draw_obstacles();
        
        // Управление препятствиями

        let n_pressed = false
        EventBus.on('SYS_VIEW_INPUT_KEY_DOWN', (e) => {
            if (e.key == 'n' || e.key == 'т') {
                n_pressed = true
            }
        })
        EventBus.on('SYS_VIEW_INPUT_KEY_UP', (e) => {
            if (e.key == 'n' || e.key == 'т') {
                n_pressed = false
            }
        })
        EventBus.on('SYS_INPUT_POINTER_DOWN', (e) => {
            if (n_pressed && e.button == 0) {
                const wp = Camera.screen_to_world(e.x, e.y);
                const obj = PF.obstacles_manager.get_object_by_pos(wp.x, wp.y);
                if (obj) {
                    let color = COLORS.RED;
                    if (obj.enabled) {
                        log('Препятствие', obj.id, 'отключено');
                        color = COLORS.YELLOW;
                    }
                    else {
                        log('Препятствие', obj.id, 'включено');
                    }
                    PF.obstacles_manager.enable_object(obj.id, !obj.enabled);
                    const lines = obstacles_lines[obj.id];
                    for (const line of lines) {
                        const material = new LineBasicMaterial({ color });
                        line.material = material;
                    }
                }
            }
        })
        EventBus.on('SYS_VIEW_INPUT_KEY_UP', (e) => {
            if (e.key == 'ь' || e.key == 'm') {
                if (PF.check_obstacles_enabled()) PF.enable_collision(false);
                else PF.enable_collision(true);
            }
        })
        
        ////

        if (pointer_control == ControlType.GP) {
            EventBus.on('SYS_ON_UPDATE', (e) => {
                last_upd_time_elapsed += e.dt;
                if (!has_target) return;
                if (check_target_change()) {
                    if (last_upd_time_elapsed >= min_find_path_interval) {
                        update_predicted_path();
                        last_upd_time_elapsed = 0;
                    }
                }
            })
        }

        if (pointer_control == ControlType.FP) {
            EventBus.on('SYS_ON_UPDATE', (e) => {
                last_upd_time_elapsed += e.dt;
                if (!has_target) return;
                if (is_pointer_down && check_target_change()) {
                    if (last_upd_time_elapsed >= min_update_t_interval) {
                        update_predicted_path();
                        last_upd_time_elapsed = 0;
                    }
                }
                else {
                    if (last_upd_time_elapsed >= update_t_interval) {
                        update_predicted_path();
                        last_upd_time_elapsed = 0;
                    }
                }
            })
        }

        if (pointer_control == ControlType.JS) {
            EventBus.on('SYS_ON_UPDATE', (e) => {
                last_upd_time_elapsed += e.dt;
                if (!stick_start) return;
                if (check_dir_change()) {
                    if (last_upd_time_elapsed >= min_update_t_interval) {
                        update_predicted_path();
                        last_upd_time_elapsed = 0;
                    }
                }
                else {
                    if (last_upd_time_elapsed >= update_t_interval) {
                        update_predicted_path();
                        last_upd_time_elapsed = 0;
                    }
                }
            })
        }

        if (pointer_control == ControlType.FP || pointer_control == ControlType.GP) {
            EventBus.on('SYS_INPUT_POINTER_DOWN', (e) => {
                if (e.button != 0 || n_pressed)
                    return;
                is_pointer_down = true;
                has_target = true;
                update_pointer_position(e);
            });
            EventBus.on('SYS_INPUT_POINTER_UP', (e) => {
                if (e.button != 0 || n_pressed)
                    return;
                update_pointer_position(e);
                is_pointer_down = false;
            });
            EventBus.on('SYS_INPUT_POINTER_MOVE', (e) => {
                if (!is_pointer_down)
                    return;
                update_pointer_position(e);
                const current_pos = point(model.position.x, model.position.y);
                const dist = point2point(current_pos, target)[0];
                is_in_target = (dist <= target_error) ? true : false;
                if (!is_in_target) has_target = true;
            });
            EventBus.on('SYS_ON_UPDATE', (e) => handle_update_follow_pointer(e.dt));
        }

        // Используем мышь вместо реального джойстика
        else if (pointer_control == ControlType.JS) {
            EventBus.on('SYS_INPUT_POINTER_DOWN', (e) => {
                if (e.button != 0 || n_pressed)
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
                stick_end = undefined;
                current_dir = vector(point(0, 0), point(0, 0));
            });

            // Отрисовка джойстика
            EventBus.on('SYS_ON_UPDATE', (e) => {
                LD.clear_container(joystick);
                if (stick_start && stick_end) {
                    const start = Camera.screen_to_world(stick_start.x, stick_start.y);
                    const end = Camera.screen_to_world(stick_end.x, stick_end.y);
                    if (settings.debug) {
                        LD.draw_arc(Arc(point(start.x, start.y), 3, 0, Math.PI * 2), joystick, COLORS.WHITE);
                        LD.draw_arc(Arc(point(end.x, end.y), 3, 0, Math.PI * 2), joystick, COLORS.WHITE);
                    }

                }
                handle_update_follow_direction(e.dt);
            });
        }

        EventBus.on('SYS_ON_UPDATE', (e) => {
            last_stop_time_elapsed += e.dt;
        })

        function update_predicted_path() {
            let way_required = get_required_path(update_t_interval);
            if (shape_length(way_required) < min_required_path) {
                clear_way()
                return;
            }
            last_check_dir = clone(current_dir);
            last_check_target = clone(target);
            path_data = PF.update_path(way_required, collision_radius, pointer_control);
            
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
                    if (interval.name == 'arc') 
                        LD.draw_arc(interval as IArc, player_way, COLORS.GREEN);
                    else 
                        LD.draw_line(interval as ISegment, player_way, COLORS.GREEN);
                }
            }
        }

        function get_required_path(dt: number) {
            const cp = point(model.position.x, model.position.y);
            let lenght_remains = dt * current_speed * pred_path_lenght_mult;
            let way_required = segment(cp.x, cp.y, target.x, target.y);
            if (pointer_control == ControlType.FP || pointer_control == ControlType.GP) {
                if (lenght_remains < shape_length(way_required)) {
                    const _segment = split_at_length(way_required, lenght_remains)[0];
                    way_required = (!('null' in _segment)) ? _segment : segment(cp.x, cp.y, cp.x, cp.y);
                }
            }
            if (pointer_control == ControlType.JS) {
                if (!EQ_0(shape_length(current_dir))) {
                    way_required = PF.way_from_angle(cp, vector_slope(current_dir), lenght_remains);
                }
                else
                    way_required = segment(cp.x, cp.y, cp.x, cp.y);
            }
            return way_required;
        }

        function handle_update_follow_pointer(dt: number) {
            if (!has_target) return;
            const available_way = path_data.length;
            if (available_way < min_awailable_path) {
                stop_movement();
                return;
            }
            const current_pos = point(model.position.x, model.position.y);
            const dist = point2point(current_pos, target)[0];
            is_in_target = (dist <= target_error) ? true : false;
            if (is_in_target && is_moving) {
                stop_movement();
            }
            else if (!is_in_target) {
                if (!is_moving && last_stop_time_elapsed > min_idle_time) {
                    last_stop_time_elapsed = 0;
                    start_movement();
                }
                else if (is_moving) {
                    update_position(dt);
                    update_pointer_position(pointer);
                }
            }
        }

        function handle_update_follow_direction(dt: number) {
            if (shape_length(current_dir) == 0) {
                if (is_moving) stop_movement();
            }
            else {
                if (!is_moving) start_movement();
                update_position(dt);
            }
        }

        function clear_way() {
            path_data = {length: 0, path: []};
        }

        function stop_movement() {
            is_moving = false;
            model.set_animation(animations.IDLE);
            clear_way();
            has_target = false;
        }

        function start_movement() {
            is_moving = true;
            model.set_animation(animations.WALK);
        }

        function update_position(dt: number) {
            const current_pos = point(model.position.x, model.position.y);
            const end_pos = PF.get_next_pos(path_data, current_pos, dt, current_speed);
            if (!end_pos || (shape_equal_to(end_pos, current_pos))) {
                stop_movement();
                return;
            }
            if (point2point(current_pos, end_pos)[0] > blocked_max_dist) {
                model.position.x = end_pos.x;
                model.position.y = end_pos.y;
                model.position.z = get_depth(end_pos.x, end_pos.y, 9, width, height);
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
            if (debug && player_geometry.children.length == 0) {
                LD.draw_arc(Arc(POINT_EMPTY, settings.collision_radius, 0, Math.PI * 2), player_geometry, COLORS.RED);
            }
            for (const line of player_geometry.children) {
                line.position.x = current_pos.x;
                line.position.y = current_pos.y;
            }
        }

        function draw_obstacles() {
            const objects_dict = PF.obstacles_manager.objects;
            for (const id in objects_dict) {
                const obstacles = objects_dict[id].obstacles;
                obstacles_lines[id] = [];
                for (const obst_id of obstacles) {
                    const obstacle = PF.obstacles_manager.get_obstacle_by_id(obst_id);
                    if (obstacle) {
                        const line = LD.draw_line(obstacle, obstacles_container, COLORS.RED);
                        obstacles_lines[id].push(line);             
                    }
                }
            }
        }
    }

    function check_target_change() {
        let result = false;
        if (point2point(last_check_target, target)[0] > min_target_change) {
            result = true;
        }
        return result;
    }

    function check_dir_change() {
        let result = false;
        if (shape_length(last_check_dir) == 0 && shape_length(current_dir) != shape_length(last_check_dir))
            result = true;
        else if (shape_length(current_dir) != 0 && shape_length(last_check_dir) != 0) {
            const d_angle = Math.abs(vec_angle(current_dir, last_check_dir));
            result = (d_angle > update_way_angle);
        }
        return result;
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
        if (point2point(stick_end, stick_start)[0] < min_stick_dist)
            current_dir = vector(stick_start, stick_end);
    }

    return { init }
}


