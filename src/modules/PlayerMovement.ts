import { Euler, LineBasicMaterial, Vector2, Vector2Like, Vector3, Line as GeomLine, BufferGeometry } from 'three';
import { AnimatedMesh } from '../render_engine/objects/animated_mesh';
import { get_depth, MapData, parse_tiled } from '../render_engine/parsers/tile_parser';
import {
    Point,
    Vector, 
    Ray,      
    Segment,  
    Arc, 
    Circle,
    CW,
    CCW,
    PointLike,
} from '2d-geometry';
import { EQ_0 } from './utils';
import { IObjectTypes } from '../render_engine/types';
import { CAMERA_Z, WORLD_SCALAR } from '../config';
import { GoContainer } from '../render_engine/objects/sub_types';


/**
 * JS (JOYSTICK) двигается в направлении, полученном от джойстика   
 * FP (FOLLOW_POINTER) - двигается в направлении курсора, пока не достигнет точки уровня, в которой была отпущена ЛКМ
 */
export enum PointerControl {
    JS,
    FP,
    // FOLLOW_DIRECTION,            
}

export enum PathFinderMode {
    BASIC,
    WAY_PREDICTION,
}

const point_zero = new Point(0, 0);

export type PlayerMovementSettings = {
    max_predicted_way_intervals: number,  // Макс. количество отрезков прогнозируемого пути, на котором цикл построения пути завершится преждевременно
    min_predicted_way_lenght: number,     // TODO: Проверить, нужно ли это делать, или можно обойтись без минимальной длины прогнозируемого пути
    predicted_way_lenght_mult: number,    // Множитель длины пути для построения пути с запасом
    collision_min_error: number,          // Минимальное расстояние сближения с припятствиями, для предотвращения соприкосновений геометрий
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

const DRAWN_ARC_EDGES_AMOUNT = 60;

export const default_settings: PlayerMovementSettings = {
    max_predicted_way_intervals: 10,
    min_predicted_way_lenght: 4,
    predicted_way_lenght_mult: 1.5,
    collision_min_error: 0.001,
    path_finder_mode: PathFinderMode.BASIC,
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


function vec_angle(v1: Vector, v2: Vector) {
    let a = v1.angleTo(v2);
    if (a > Math.PI) a = a - 2 * Math.PI;
    return a
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

export function load_obstacles(map_data: MapData) {
    const obstacles: Segment[] = [];
    const render_data = parse_tiled(map_data);
    const now = Date.now();
    for (let object_layer of render_data.objects_layers) {
        for (let tile of object_layer.objects) {
            if (tile.polygon || tile.polyline) {
                const cx = tile.x * WORLD_SCALAR;
                const cy = tile.y * WORLD_SCALAR;
                if (tile.polygon) {
                    for (let i = 0; i < tile.polygon.length - 1; i ++) {
                        const s_x = tile.polygon[i].x;
                        const s_y = tile.polygon[i].y;
                        const e_x = tile.polygon[i + 1].x;
                        const e_y = tile.polygon[i + 1].y;
                        const start = new Point(cx + s_x * WORLD_SCALAR, cy - s_y * WORLD_SCALAR);
                        const end = new Point(cx + e_x * WORLD_SCALAR, cy - e_y * WORLD_SCALAR);
                        const seg = new Segment(start, end);
                        obstacles.push(seg);
                    }
                    
                    const s_x = tile.polygon[tile.polygon.length - 1].x;
                    const s_y = tile.polygon[tile.polygon.length - 1].y;
                    const e_x = tile.polygon[0].x;
                    const e_y = tile.polygon[0].y;
                    const start = new Point(cx + s_x * WORLD_SCALAR, cy - s_y * WORLD_SCALAR);
                    const end = new Point(cx + e_x * WORLD_SCALAR, cy - e_y * WORLD_SCALAR);
                    const seg = new Segment(start, end);
                    obstacles.push(seg);
                }
                if (tile.polyline) {
                    for (let i = 0; i < tile.polyline.length - 1; i ++) {
                        const s_x = tile.polyline[i].x;
                        const s_y = tile.polyline[i].y;
                        const e_x = tile.polyline[i + 1].x;
                        const e_y = tile.polyline[i + 1].y;
                        const start = new Point(cx + s_x * WORLD_SCALAR, cy - s_y * WORLD_SCALAR);
                        const end = new Point(cx + e_x * WORLD_SCALAR, cy - e_y * WORLD_SCALAR);
                        const seg = new Segment(start, end);
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

function _add_line(a: Point, b: Point, container: GoContainer, color = 0x22ff77) {
    const point_a = new Vector2(a.x,  a.y);
    const point_b = new Vector2(b.x,  b.y);
    const points: Vector2[] = [point_a, point_b];
    const geometry = new BufferGeometry().setFromPoints(points);
    const material = new LineBasicMaterial({ color });
    const line = new GeomLine(geometry, material);
    line.position.z = CAMERA_Z - 0.01;
    container.add(line);
}

function _add_arc(arc: Arc, container: GoContainer, color = 0x22ff77) {
    const step = 2 * Math.PI * arc.r / DRAWN_ARC_EDGES_AMOUNT;
    let lenght_remains = arc.length;
    let _allowed_way = arc;
    while (lenght_remains > 0 && _allowed_way) {
        const move = (step < _allowed_way.length) ? step : _allowed_way.length;
        lenght_remains -= move;
        const sub_arcs = _allowed_way.splitAtLength(move);
        const move_arc = sub_arcs[0];
        _allowed_way = sub_arcs[1];
        _add_line(move_arc.start, move_arc.end, container, color);
    }
}

export function MovementLogic(settings: PlayerMovementSettings = default_settings) {
    let pointer = new Point(0, 0);
    let target = new Point(0, 0);
    let last_check_dir = new Vector(0, 0);
    let stick_start: Point | undefined = undefined;
    let current_dir = new Vector(0, 0);
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
    const mode = settings.path_finder_mode;
    const debug =  settings.debug;
    const clear_drawn_lines =  settings.clear_drawn_lines;
    const min_predicted_way_lenght = settings.min_predicted_way_lenght;
    const predicted_way_lenght_mult = settings.predicted_way_lenght_mult;
    const PF = PathFinder(settings, obstacles);
    const speed = settings.speed;
    let current_speed: number = speed.WALK;
    let is_moving = false;
    let is_pointer_down = false;
    let is_in_target = false;
    let blocked_move_time = 0;
    let time_elapsed = 0;
    let has_target = false;
    if (debug) {
        const stick_line = SceneManager.create(IObjectTypes.GO_CONTAINER, {});
        stick_line.name = 'stick line';
        SceneManager.add(stick_line);
    }

    function init(init_data: {model: AnimatedMesh, obstacles: Segment[]}) {
        const model = init_data.model;
        target = new Point(model.position.x, model.position.y);
        PF.set_current_pos(target);
        obstacles.push(...init_data.obstacles);

        if (mode == PathFinderMode.WAY_PREDICTION) {
            EventBus.on('SYS_ON_UPDATE', (e) => {
                time_elapsed += e.dt;
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

        if (PointerControl.FP == pointer_control) {
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
            });
            EventBus.on('SYS_ON_UPDATE', (e) => handle_update_follow_pointer(e.dt));
        }

        // Используем мышь вместо реального джойстика
        else if (pointer_control == PointerControl.JS) {
            EventBus.on('SYS_INPUT_POINTER_DOWN', (e) => {
                if (e.button != 0)
                    return;
                stick_start = new Point(e.x, e.y);
            });
            
            EventBus.on('SYS_INPUT_POINTER_MOVE', (e) => {
                update_stick_direction(e)
            });
    
            EventBus.on('SYS_INPUT_POINTER_UP', (e) => {
                if (!stick_start)
                    return;
                update_stick_direction(stick_start);
                stick_start = undefined;
                current_dir = new Vector(0, 0);
            });

            EventBus.on('SYS_ON_UPDATE', (e) => handle_update_follow_direction(e.dt));
        }
    
        function update_predicted_way() {
            let way_required = get_required_way(update_t_interval);
            if (EQ_0(way_required.length)) {
                return;
            }
            last_check_dir = current_dir.clone();
            PF.update_predicted_way(way_required, pointer_control);
        }

        function get_required_way(dt: number) {
            const current_pos = new Point(model.position.x, model.position.y);
            let lenght_remains = dt * current_speed * predicted_way_lenght_mult;
            let way_required = new Segment(current_pos, target);
            if (pointer_control == PointerControl.FP) {
                if (lenght_remains < way_required.length) {
                    const segment = way_required.splitAtLength(lenght_remains)[0];
                    way_required = (segment) ? segment : new Segment(current_pos, current_pos);
                }
            }
            if (pointer_control == PointerControl.JS) {
                if (!EQ_0(current_dir.length)) {
                    const end_pos = current_pos.translate(current_dir.normalize().multiply(lenght_remains));
                    way_required = new Segment(current_pos, end_pos);
                }
            }
            return way_required;
        }

        function check_dir_change() {
            let result = false;
            if (last_check_dir.length == 0 && current_dir.length != last_check_dir.length)
                result = true;
            else if (current_dir.length != 0 && last_check_dir.length != 0) {
                const d_angle = Math.abs(vec_angle(current_dir, last_check_dir));
                result = (d_angle > update_way_angle);
            }
            return result;
        }

        function handle_update_follow_pointer( dt: number ) {
            if (!has_target) return;
            const current_pos = new Point(model.position.x, model.position.y);
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
            if (current_dir.length == 0) {
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
            const current_pos = new Point(model.position.x, model.position.y);
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
            const dir = new Vector(current_pos, end_pos);
            model.rotation.y = interpolate_with_wrapping(model.rotation.y, Math.atan2(dir.y, dir.x) + Math.PI / 2, 0.1, 0, 2 * Math.PI);
            model.transform_changed();
        }
    }


    function update_pointer_position(pos: Vector2Like) {
        if (is_pointer_down) {
            pointer = new Point(pos.x, pos.y);
            const wp = Camera.screen_to_world(pointer.x, pointer.y);
            target = new Point(wp.x, wp.y);
        }
    }

    function update_stick_direction(e: PointLike) {
        if (!stick_start)
            return;
        const stick_end = new Point(e.x, e.y);
        if (stick_end.distanceTo(stick_start)[0] < min_stick_dist)
        current_dir = new Vector(stick_start, stick_end);
    }

    function enable_obstacles(enable = true) {
        PF.enable_obstacles(enable)
    }

    function check_obstacles_enabled() {
        return PF.check_obstacles_enabled();
    }

    return {init, enable_obstacles, check_obstacles_enabled}
}


export function PathFinder(settings: PlayerMovementSettings, _obstacles?: Segment[]) {
    const max_intervals =  settings.max_predicted_way_intervals;
    const mode = settings.path_finder_mode;
    const collision_min_error = settings.collision_min_error;
    const blocked_move_min_dist = settings.blocked_move_min_dist;
    const move_min_angle = settings.block_move_min_angle;
    const max_try_dist = settings.max_try_dist;
    const collision_radius = settings.collision_radius;
    const debug =  settings.debug;
    const clear_drawn_lines =  settings.clear_drawn_lines;
    const way_intervals: (Segment | Arc)[] = [];
    let current_pos = new Point(0, 0);
    let current_target = new Point(0, 0);
    let checking_obstacles = true;
    let obstacles = (_obstacles) ? _obstacles : [];
    const player_container = SceneManager.create(IObjectTypes.GO_CONTAINER, {});
    player_container.name = 'player collision circle';
    SceneManager.add(player_container);
    const way_container = SceneManager.create(IObjectTypes.GO_CONTAINER, {});
    way_container.name = 'way intervals';
    SceneManager.add(way_container);
    const marked_obstacles = SceneManager.create(IObjectTypes.GO_CONTAINER, {});
    marked_obstacles.name = 'marked obstacles';
    SceneManager.add(marked_obstacles);

    function enable_obstacles(enable = true) {
        checking_obstacles = enable;
        log(`Obstacles ${(enable) ? 'enabled' : 'disabled'}`)
    }
    function check_obstacles_enabled() {
        return checking_obstacles;
    }

    function update_predicted_way(way_required: Segment, pointer_control: PointerControl) {
        let lenght_remains = way_required.length;
        const data: PredictNextMoveData = {next_do: NextMoveType.STRAIGHT_LINE, way_required, lenght_remains, pointer_control};
        way_intervals.splice(0, way_intervals.length);
        let counter = 0;
        if (clear_drawn_lines)
            way_container.clear();
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

    function _get_correction_angle(pos: Point, vertice: Point, way_req: Segment) {
        let correction_angle = 0;
        const pos_to_vertice_vec = new Vector(pos, vertice);
        const vertice_to_target_vec = new Vector(vertice, way_req.end);
        const pos_target_vec = way_req.vector.invert();
        correction_angle = Math.asin(pos_to_vertice_vec.length / vertice_to_target_vec.length) - Math.abs(vec_angle(pos_target_vec, vertice_to_target_vec.invert()));
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
        const d_vec = new Vector(pos, new_pos);
        return old_target.translate(d_vec);
    }

    function bypass_vertice(data: PredictNextMoveData) {
        const obstacle = data.obstacle_to_slide as Segment;
        const vertice = data.vertice_to_bypass as Point;
        const ostacle_vec = (vertice.equalTo(obstacle.start)) ? obstacle.vector : obstacle.vector.invert();
        const s_pos = data.way_required.start;
        const pos_to_vertice_vec = new Vector(s_pos, vertice);
        const dir_diff_start_angle = vec_angle(data.way_required.vector, pos_to_vertice_vec);
        const rotate_dir = (dir_diff_start_angle < 0) ? CW : CCW;
        let obstacle_limit_vec = (rotate_dir) ? ostacle_vec.rotate90CW() : ostacle_vec.rotate90CCW();
        let start_vec = pos_to_vertice_vec.invert();
        let end_vec = (rotate_dir) ? data.way_required.vector.rotate90CW() : data.way_required.vector.rotate90CCW();
        let _end_angle = end_vec.slope;
        let allowed_way = undefined;

        end_vec = _correct_vec_angle_to_dir(end_vec, data, rotate_dir);
        
        // Проверяем, что при обходе угла не столкнулись с препятствием, край которого сейчас обходим, если столкнулись ограничиваем угол обхода
        let blocked_by_current_obstacle = false;
        let excess_rotation_angle = (rotate_dir) ? vec_angle(end_vec, obstacle_limit_vec) : vec_angle(obstacle_limit_vec, end_vec);
        if (excess_rotation_angle > 0) {
            end_vec = obstacle_limit_vec;
            blocked_by_current_obstacle = true;
        }

        let start_angle = start_vec.slope;
        let end_angle = end_vec.slope;

        // Дуга пути, чтобы обойти угол и выйти на нужную траекторию:
        const way_arc_full = new Arc(vertice, pos_to_vertice_vec.length, start_angle, end_angle, !rotate_dir);
        let way_arc = way_arc_full;
        if (!check_collision_angle_ok(data.way_required.vector, way_arc)) {
            data.next_do = NextMoveType.STOP;
            data.lenght_remains = 0; 
            allowed_way = data.way_required;                
        }

        // Если длина дуги больше оставшейся для расчётов длины пути, ограничиваем дугу этой длиной
        if (data.lenght_remains < way_arc_full.length)
            way_arc = way_arc_full.splitAtLength(data.lenght_remains)[0];
        
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
            if (data.lenght_remains < way_arc_full.length) {
                data.next_do = NextMoveType.STOP; 
            }
            else if (blocked_by_current_obstacle) 
                data.next_do = NextMoveType.SLIDE_OBSTACLE;
            else {
                data.next_do = NextMoveType.STRAIGHT_LINE;
            }
            data.lenght_remains -= way_arc.length; 
            allowed_way = way_arc;
        }
        
        if (allowed_way) {
            if (data.pointer_control == PointerControl.JS) {
                const new_target = _get_new_target(s_pos, allowed_way.end, data.way_required.end);
                data.way_required = new Segment(allowed_way.end, new_target);
            }
            else if (data.pointer_control == PointerControl.FP) {
                const new_target =  data.way_required.end;
                data.way_required = new Segment(allowed_way.end, new_target);
            }
            way_intervals.push(allowed_way);
            if (debug) _add_arc(allowed_way, way_container);
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
        const translate_vec = distance_segment.vector.invert();
        const slide_l = new Segment(distance_segment.end, obstacle.start);
        const slide_r = new Segment(distance_segment.end, obstacle.end);
        const angle_l = (!EQ_0(slide_l.length)) ? Math.abs(vec_angle(data.way_required.vector, slide_l.vector)) : 2 * Math.PI;
        const angle_r = (!EQ_0(slide_r.length)) ? Math.abs(vec_angle(data.way_required.vector, slide_r.vector)) : 2 * Math.PI;
        const slide = (angle_l < angle_r) ? slide_l : slide_r;
        const d_angle = Math.abs(vec_angle(slide.vector, data.way_required.vector));
        let allowed_way = undefined;

        // Требуемый путь, чтобы добраться до края препятствия:
        let way_required_to_slide = slide.translate(translate_vec);

        if (!check_collision_angle_ok(data.way_required.vector, way_required_to_slide)) {
            data.next_do = NextMoveType.STOP;
            data.lenght_remains = 0; 
            allowed_way = data.way_required;                
        }
        // Оставшееся расстояние может закончиться раньше, чем добрались до края препятствия:
        const max_slide_distance = (data.pointer_control == PointerControl.FP) ?data.lenght_remains * Math.cos(d_angle) : data.lenght_remains;
        way_required_to_slide = way_required_to_slide.splitAtLength(max_slide_distance)[0];
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
            if (max_slide_distance < slide.length) {
                data.lenght_remains = 0; 
                data.next_do = NextMoveType.STOP; 
            }
            else {
                data.lenght_remains -= (slide.length / Math.cos(d_angle));
                data.vertice_to_bypass = slide.end;
                data.next_do = NextMoveType.BYPASS_ANGLE;
            }
            allowed_way = way_required_to_slide;
        }
        if (allowed_way) {
            if (data.pointer_control == PointerControl.JS) {
                const new_target = _get_new_target(s_pos, allowed_way.end, data.way_required.end);
                data.way_required = new Segment(allowed_way.end, new_target);
            }
            else if (data.pointer_control == PointerControl.FP) {
                const new_target =  data.way_required.end;
                data.way_required = new Segment(allowed_way.end, new_target);
            }
            way_intervals.push(allowed_way);
            if (debug) _add_line(allowed_way.start, allowed_way.end, way_container);
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
            data.way_required = way_segments[1];
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
            way_intervals.push(allowed_way);
            if (debug) _add_line(allowed_way.start, allowed_way.end, way_container);
        }
    }

    function check_collision_angle_ok(direction_required: Vector, way: Segment | Arc) {
        let collision_angle: number | undefined = undefined;
        if (way.name == "segment") {
            const way_segment = way as Segment;
            collision_angle = Math.PI / 2 - Math.abs(vec_angle(direction_required, way_segment.vector)); 
            log('collision_angle', collision_angle, move_min_angle, (collision_angle) > move_min_angle)
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
        const tangent = obstacle.vector.normalize();
        const normal = tangent.rotate90CW();
        if (build_option == "all" || build_option == "segment") {
            result.push(obstacle.translate(normal.multiply(offset)));
            result.push(obstacle.translate(normal.multiply(-offset)));
        }
        
        if (build_option == "all" || build_option == "arc") {
            const slope = obstacle.slope;
            result.push(new Arc(obstacle.start, offset, slope + Math.PI / 2, slope - Math.PI / 2, true));
            result.push(new Arc(obstacle.end, offset, slope - Math.PI / 2, slope + Math.PI / 2, true));
        }
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

    function make_collision_way(way: Segment | Arc) {
        if (way.name == 'segment') {
            const way_segment = way as Segment;
            const base_vec = way_segment.vector.normalize();
            const start = way.start.translate(base_vec.invert().multiply(collision_min_error));
            const end = way.end.translate(base_vec.multiply(way.length));
            return new Segment(start, end);
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
        if (!checking_obstacles) return {obstacle: closest_obstacle, distance: way_required.length, point: closest_point, way: shortest_way, is_vertice};
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
            shortest_distance = way_required.length;

        if (offset_collision_line) {
            if (offset_collision_line.name == "arc") {
                is_vertice = true;
                closest_point = offset_collision_line.center;
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
                list.push({distance: sub_way.length, way: sub_way, point});
            else
                list.push({distance: 0, way: undefined, point});
        }
        list.sort((a, b) => a.distance - b.distance);
        return list[0];
    }

    const get_next_pos: (current_pos: Point, dt: number, speed: number) => Point = (mode == PathFinderMode.WAY_PREDICTION) ? get_next_pos_way_prediction : get_next_pos_basic;

    function get_waypoint_on_interval(interval: Segment | Arc, dt: number, current_speed: number) {
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

    function get_next_pos_basic(current_pos: Point, dt: number, speed: number) {
        const dist_to_target = current_pos.distanceTo(current_target)[0];
        const try_dist = (dt * speed > dist_to_target) ? dist_to_target : dt * speed;
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
    
    function set_current_pos(_current_pos: Point) {
        current_pos = _current_pos;
        if (clear_drawn_lines) player_container.clear();
        if (debug) _add_arc(new Arc(current_pos, collision_radius, 0, 2 * Math.PI), player_container, 0x66ffff)
    }

    function set_obstacles(_obstacles: Segment[]) {
        obstacles = _obstacles;
    }

    function mark_obstacles(_obstacles: Segment[]) {
        for (const obstacle of _obstacles) {
            _add_line(obstacle.start, obstacle.end, marked_obstacles, 0xffff00);
        }
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

    return {get_next_pos, set_current_pos, get_current_pos, set_obstacles, find_closest_obstacle_use_rays,
        find_closest_obstacle_use_offsets, linear_move, bypass_angle: bypass_vertice, slide_obstacle: slide_obstacle, get_predicted_way, 
        update_predicted_way, make_collision_way, mark_obstacles, enable_obstacles, check_obstacles_enabled }
}
