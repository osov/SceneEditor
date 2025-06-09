import { AnimatedMesh } from '../render_engine/objects/animated_mesh';
import { get_depth, MapData, parse_tiled } from '../render_engine/parsers/tile_parser';
import { EQ_0 } from '../modules/utils';
import { IObjectTypes } from '../render_engine/types';
import { WORLD_SCALAR, WORLD_SCALAR as WS } from '../config';
import { PathFinder } from '../modules/PathFinder';
import {
    point,
    vector_from_points as vector,
    segment,
    arc,
    Point,
    Segment,
    vec_angle,
    PointLike,
    Arc,
    POINT_EMPTY,
} from '../modules/Geometry';
import { Line as GeomLine } from 'three';
import { LinesDrawer } from '../modules/LinesDrawer';
import { PlayerMovementSettings, default_settings, ControlType } from '@editor/modules/types';


const RED = 0xff0000;
const LIGHT_RED = 0xff3333
const DARK_RED = 0xaa0000;
const BLUE = 0x2233ff;
const LIGHT_BLUE = 0x6677ff;
const PURPLE = 0xee44ff;
const YELLOW = 0xffff00;
const ORANGE = 0xff6600;
const GREEN = 0x00ff00;
const GRAY = 0x333333;
const WHITE = 0xffffff;


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
    for (let object_layer of render_data.objects_layers) {
        for (let tile of object_layer.objects) {
            if (tile.polygon || tile.polyline) {
                const cx = tile.x * WS;
                const cy = tile.y * WS;
                if (tile.polygon) {
                    for (let i = 0; i < tile.polygon.length - 1; i++) {
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
                    for (let i = 0; i < tile.polyline.length - 1; i++) {
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
    return obstacles;
}

export function MovementControlCreate(settings: PlayerMovementSettings = default_settings) {
    const LD = LinesDrawer();
    const width = 50 * WORLD_SCALAR;
    const height = 50 * WORLD_SCALAR;
    let pointer = point(0, 0);
    let target = point(0, 0);
    let last_check_dir = vector(pointer, target);
    let last_check_target = point(0, 0);
    let stick_start: Point | undefined = undefined;
    let stick_end: Point | undefined = undefined;
    let current_dir = vector(pointer, target);
    let target_error = settings.target_stop_distance;
    let layer = settings.model_layer;
    let animations = settings.animation_names;
    let pointer_control = settings.control_type;
    let max_blocked_move_time = settings.max_blocked_move_time;
    let min_required_way = settings.min_required_way;
    let min_awailable_way = settings.min_awailable_way;
    let min_idle_time = settings.min_idle_time;
    let min_target_change = settings.min_target_change;
    let blocked_max_dist = settings.blocked_move_min_dist;
    let update_t_interval = settings.update_interval;
    let min_update_t_interval = settings.min_update_interval;
    let min_find_path_interval = settings.min_find_path_interval;
    let update_way_angle = settings.update_way_angle;
    let min_stick_dist = settings.min_stick_dist;
    let predicted_way_lenght_mult = settings.predicted_way_lenght_mult;
    let speed = settings.speed;
    let current_speed: number = speed.WALK;
    let is_moving = false;
    let is_pointer_down = false;
    let is_in_target = false;
    let blocked_move_time = 0;
    let last_upd_time_elapsed = 0;
    let last_stop_time_elapsed = 0;
    let has_target = false;
    let PF: PathFinder

    const player_circle: {
        line: GeomLine;
        p1: PointLike;
        p2: PointLike;
    }[] = [];

    const joystick = SceneManager.create(IObjectTypes.GO_CONTAINER, {});
    joystick.name = 'joystick';
    SceneManager.add(joystick);
    const player_geometry = SceneManager.create(IObjectTypes.GO_CONTAINER, {});
    player_geometry.name = 'player_geometry';
    SceneManager.add(player_geometry);
    const player_way = SceneManager.create(IObjectTypes.GO_CONTAINER, {});
    player_way.name = 'player_way';
    SceneManager.add(player_way);

    function init(init_data: { model: AnimatedMesh, path_finder: PathFinder }) {
        const model = init_data.model;
        target = point(model.position.x, model.position.y);
        PF = init_data.path_finder;
        PF.set_current_pos(target);

        if (pointer_control == ControlType.GP) {
            EventBus.on('SYS_ON_UPDATE', (e) => {
                last_upd_time_elapsed += e.dt;
                if (!has_target) return;
                if (check_target_change()) {
                    if (last_upd_time_elapsed >= min_find_path_interval) {
                        update_predicted_way();
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
                        update_predicted_way();
                        last_upd_time_elapsed = 0;
                    }
                }
                else {
                    if (last_upd_time_elapsed >= update_t_interval) {
                        update_predicted_way();
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
                        update_predicted_way();
                        last_upd_time_elapsed = 0;
                    }
                }
                else {
                    if (last_upd_time_elapsed >= update_t_interval) {
                        update_predicted_way();
                        last_upd_time_elapsed = 0;
                    }
                }
            })
        }

        if (pointer_control == ControlType.FP || pointer_control == ControlType.GP) {
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
        else if (pointer_control == ControlType.JS) {
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
            });

            EventBus.on('SYS_ON_UPDATE', (e) => {
                if (stick_start && stick_end) {
                    const start = Camera.screen_to_world(stick_start.x, stick_start.y);
                    const end = Camera.screen_to_world(stick_end.x, stick_end.y);
                    LD.clear_container(joystick);
                    if (settings.debug) {
                        LD.draw_arc(arc(point(start.x, start.y), 3, 0, Math.PI * 2), joystick, RED);
                        LD.draw_arc(arc(point(end.x, end.y), 3, 0, Math.PI * 2), joystick, RED);
                    }

                }
                handle_update_follow_direction(e.dt);
            });
        }

        EventBus.on('SYS_ON_UPDATE', (e) => {
            last_stop_time_elapsed += e.dt;
        })

        function update_predicted_way() {
            let way_required = get_required_way(update_t_interval);
            if (way_required.length() < min_required_way) {
                PF.clear_way();
                return;
            }
            last_check_dir = current_dir.clone();
            last_check_target = target.clone();
            const way = PF.update_way(way_required, pointer_control);
            const {clear_ways, blocked_ways, way_tree} = PF.get_path_tree();
            LD.clear_container(player_way);
            for (const way of blocked_ways) {
                if (way.arc) 
                    LD.draw_arc(way.arc, player_way, ORANGE);
                if (way.segment) 
                    LD.draw_line(way.segment, player_way, ORANGE);
            }
            for (const way of clear_ways) {
                if (way.arc) 
                    LD.draw_arc(way.arc, player_way, LIGHT_BLUE);
                if (way.segment) 
                    LD.draw_line(way.segment, player_way, LIGHT_BLUE);
            }
            for (const interval of way) {
                if (interval.name == 'arc') 
                    LD.draw_arc(interval as Arc, player_way, PURPLE);
                else 
                    LD.draw_line(interval as Segment, player_way, PURPLE);
            }
        }

        function get_required_way(dt: number) {
            const cp = point(model.position.x, model.position.y);
            let lenght_remains = dt * current_speed * predicted_way_lenght_mult;
            let way_required = segment(cp.x, cp.y, target.x, target.y);
            if (pointer_control == ControlType.FP || pointer_control == ControlType.GP) {
                if (lenght_remains < way_required.length()) {
                    const _segment = way_required.splitAtLength(lenght_remains)[0];
                    way_required = (_segment) ? _segment : segment(cp.x, cp.y, cp.x, cp.y);
                }
            }
            if (pointer_control == ControlType.JS) {
                if (!EQ_0(current_dir.length())) {
                    const ep = cp.translate(current_dir.normalize().multiply(lenght_remains));
                    way_required = segment(cp.x, cp.y, ep.x, ep.y);
                }
                else
                    way_required = segment(cp.x, cp.y, cp.x, cp.y);
            }
            return way_required;
        }

        function check_target_change() {
            let result = false;
            if (last_check_target.distanceTo(target)[0] > min_target_change) {
                result = true;
            }
            return result;
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

        function handle_update_follow_pointer(dt: number) {
            if (!has_target) return;
            const available_way = PF.get_way_length();
            if (available_way < min_awailable_way) {
                stop_movement();
                return;
            }
            const current_pos = point(model.position.x, model.position.y);
            const dist = current_pos.distanceTo(target)[0];
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
            PF.clear_way();
            has_target = false;
        }

        function start_movement() {
            is_moving = true;
            model.set_animation(animations.WALK);
        }

        function update_position(dt: number) {
            const current_pos = point(model.position.x, model.position.y);
            const end_pos = PF.get_next_pos(current_pos, dt, current_speed);
            if (!end_pos || (end_pos.equalTo(current_pos))) {
                stop_movement();
                return;
            }
            if (current_pos.distanceTo(end_pos)[0] > blocked_max_dist) {
                model.position.x = end_pos.x;
                model.position.y = end_pos.y;
                model.position.z = get_depth(end_pos.x, end_pos.y, 9, width, height);
                PF.set_current_pos(end_pos);
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
            if (player_geometry.children.length == 0) {
                LD.draw_arc(Arc(POINT_EMPTY, settings.collision_radius, 0, Math.PI * 2), player_geometry, RED);
            }
            for (const line of player_geometry.children) {
                line.position.x = current_pos.x;
                line.position.y = current_pos.y;
            }
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

    return { init }
}


