import { Euler, Vector2, Vector3, } from 'three';
import { AnimatedMesh } from '../render_engine/objects/animated_mesh';
import { get_depth } from '../render_engine/parsers/tile_parser';
import { circle_line_intersect } from './utils';
import { Circle, Segment } from '../modules_editor/modules_editor_const';


enum PointerControl {
    FOLLOW_DIRECTION,   // Двигается в направлении курсора, пока зажата ЛКМ  
    // GO_TO_TARGET,       // Двигается в направлении точки уровня, в которой была отпущена ЛКМ
    FOLLOW_POINTER,      // Двигается в направлении курсора, пока не достигнет точки уровня, в которой была отпущена ЛКМ
    STICK,              // Двигается в направлении, полученном от джойстика  
}

type PlayerMovementSettings = {
    pointer_control: PointerControl,
    keys_control: boolean,
    model_layer: number,
    target_max_error: number,
    animation_names: AnimationNames,
    min_update_interval: number,
    speed: SpeedSettings,
    collide_radius: number,
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
    pointer_control: PointerControl.FOLLOW_POINTER,
    keys_control: true,
    target_max_error: 5,
    model_layer: 15, 
    animation_names: {IDLE: "idle", WALK: "walk"},
    min_update_interval: 0.1,
    speed: {WALK: 26},
    collide_radius: 6,
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
    const pointer = new Vector2();
    const target = new Vector2();
    const stick_dir = new Vector2();
    let dir: Vector2;
    let time_since_update = 0;
    let is_moving = false;
    let is_pointer_down = false;
    let is_in_target = false;
    const obstacles: Segment[] = [];
    const tmp_vec2 = new Vector2();
    const t_error = settings.target_max_error;
    const layer = settings.model_layer;
    const animations = settings.animation_names;
    const pointer_control = settings.pointer_control;
    const min_update_interval = settings.min_update_interval;
    const speed = settings.speed;
    const collide_radius = settings.collide_radius;


    function init(model: AnimatedMesh, _obstacles: Segment[] = []) {
        target.set(model.position.x, model.position.y);
        tmp_vec2.set(model.position.x, model.position.y);
        obstacles.push(..._obstacles);

        EventBus.on('SYS_ON_UPDATE', (e) => {
            if (is_pointer_down)
                time_since_update += e.dt
            });

        if ([PointerControl.FOLLOW_POINTER, PointerControl.FOLLOW_DIRECTION].includes(pointer_control)) {
            EventBus.on('SYS_INPUT_POINTER_DOWN', (e) => {
                if (e.button != 0)
                    return;
                is_pointer_down = true;
                pointer.set(e.x, e.y);
                const wp = Camera.screen_to_world(e.x, e.y);
                target.set(wp.x, wp.y);
            });
            EventBus.on('SYS_INPUT_POINTER_UP', (e) => {
                if (e.button != 0)
                    return;
                is_pointer_down = false;
                const wp = Camera.screen_to_world(e.x, e.y);
                target.set(wp.x, wp.y);
            });
            EventBus.on('SYS_INPUT_POINTER_MOVE', (e) => {
                if (!is_pointer_down)
                    return;
                pointer.set(e.x, e.y);
                const wp = Camera.screen_to_world(e.x, e.y);
                target.set(wp.x, wp.y);
            });
            
            if (pointer_control == PointerControl.FOLLOW_POINTER) {
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

        function check_interval(callback: () => void ) {
            if (time_since_update >= min_update_interval) {
                callback();
                time_since_update = 0;
            }
            return;
        }

        function handle_update_follow_pointer( dt: number ) {
            tmp_vec2.set(model.position.x, model.position.y);
            dir = target.clone().sub(tmp_vec2).normalize();
            const dist = tmp_vec2.distanceTo(target);
            is_in_target = (dist <= t_error) ? true : false;
            if (is_in_target && is_moving) stop_movement();
            else if (!is_in_target) {
                if (!is_moving) start_movement();
                else {
                    update_movement(dt);
                    update_pointer_position();
                }
            }
        }

        function handle_update_follow_direction( dt: number ) {
            tmp_vec2.set(model.position.x, model.position.y);
            dir = target.clone().sub(tmp_vec2).normalize();
            if (!is_pointer_down) {
                if (is_moving) stop_movement();
            }
            else {
                if (!is_moving) start_movement();
                else {
                    update_movement(dt);
                    update_pointer_position();
                }
            }
        }
        
        function handle_update_stick( dt: number ) {
            tmp_vec2.set(model.position.x, model.position.y);

        }
        

        function stop_movement() {
            is_moving = false;
            model.set_animation(animations.IDLE);
        }

        function start_movement() {
            is_moving = true;
            model.set_animation(animations.WALK);
        }

        function update_movement(dt: number) {
            const try_dist = dt * speed.WALK;
            const new_pos = new Vector2(model.position.x, model.position.y);
            new_pos.add(dir.clone().multiplyScalar(try_dist));
            const can_move = check_obstacles({center: new_pos, radius: collide_radius});
            const dist = (can_move) ? try_dist : 0;
            tmp_vec2.add(dir.clone().multiplyScalar(dist));
            model.position.x = tmp_vec2.x;
            model.position.y = tmp_vec2.y;
            model.position.z = get_depth(model.position.x, model.position.y, layer, model.get_size().x, model.get_size().y);
            model.rotation.y = interpolate_with_wrapping(model.rotation.y, Math.atan2(dir.y, dir.x) + Math.PI / 2, 0.1, 0, 2 * Math.PI);
            model.transform_changed();
            CameraControl.set_position(model.position.x, model.position.y, true);
        }

    }

    function check_obstacles(collide_circle: Circle) {
        function compareDistances(a: {distance: number}, b: {distance: number}) {
            return a.distance - b.distance;
          }
        const list = [];
        for (const obstacle of obstacles) {
            const collision_points = circle_line_intersect(collide_circle, obstacle);
            if (collision_points && collision_points.length != 0) {
                const distance = collide_circle.center.distanceTo(collision_points[0]);
                list.push({distance, obstacle});
            }
        }
        list.sort(compareDistances);
        if (list.length > 0) 
            return false;
        return true;
    }
    

    function update_pointer_position() {
        if (is_pointer_down) {
            const wp = Camera.screen_to_world(pointer.x, pointer.y);
            target.set(wp.x, wp.y);
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
    const tl = {x: top_left.x, y: top_left.y};
    const tr = {x: top_right.x, y: top_right.y};
    const bl = {x: bottom_left.x, y: bottom_left.y};
    const br = {x: bottom_right.x, y: bottom_right.y};
    return [
        {p1: tl, p2: tr},
        {p1: tr, p2: bl},
        {p1: bl, p2: br},
        {p1: br, p2: tl},
    ];
}
