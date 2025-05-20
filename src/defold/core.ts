import { Quaternion, Vector3 } from "three"
import { MessageId } from "../modules/modules_const"
import * as TWEEN from '@tweenjs/tween.js';
import { IBaseEntityAndThree } from "../render_engine/types";
import { is_base_mesh, is_label, is_sprite, is_text } from "../render_engine/helpers/utils";

declare global {
    const json: ReturnType<typeof json_module>

    function tonumber(e: any, base?: number): number | undefined;

    namespace math {
        function ceil(x: number): number;
        function pow(x: number, y: number): number;
        function abs(x: number): number;
        function cos(x: number): number;
        function sin(x: number): number;
        function rad(x: number): number;
        function random(m: number, n: number): number;
        function floor(x: number): number;
        function sqrt(x: number): number;
        function tan(x: number): number;
        function asin(x: number): number;
        function acos(x: number): number;
        function atan(x: number): number;
        function atan2(y: number, x: number): number;
        function deg(x: number): number;
        function min(...x: number[]): number;
        function max(...x: number[]): number;
        function sign(x: number): number;
        function pi(): number;
    }

    namespace vmath {
        type vector3 = {
            x: number,
            y: number,
            z: number
        }

        type quat = {
            x: number,
            y: number,
            z: number,
            w: number
        }

        function vector3(): vmath.vector3
        function vector3(n: number): vmath.vector3
        function vector3(v1: vmath.vector3): vmath.vector3
        function vector3(x: number, y: number, z: number): vmath.vector3
        function length(v: vmath.vector3): number
        function normalize(v: vmath.vector3): vmath.vector3
        function dot(v1: vmath.vector3, v2: vmath.vector3): number
        function cross(v1: vmath.vector3, v2: vmath.vector3): vmath.vector3
        function mul_per_element(v1: vmath.vector3, v2: vmath.vector3): vmath.vector3
        function lerp(t: number, v1: vmath.vector3, v2: vmath.vector3): vmath.vector3
        function slerp(t: number, q1: vmath.quat, q2: vmath.quat): vmath.quat

        function quat(): vmath.quat
        function quat(q: vmath.quat): vmath.quat
        function quat(x: number, y: number, z: number, w: number): vmath.quat
        function quat_from_axis_angle(axis: vmath.vector3, angle: number): vmath.quat
        function euler_to_quat(x: number, y: number, z: number): vmath.quat
        function rotate(q: vmath.quat, v: vmath.vector3): vmath.vector3
    }

    namespace go {
        function set_position(id: string, position: vmath.vector3): void
        function get_position(id: string): vmath.vector3 | null
        function set_rotation(rotation: vmath.quat, id?: string): void
        function get_rotation(id: string): vmath.quat | null
        function set_scale(id: string, scale: vmath.vector3): void
        function get_scale(id: string): vmath.vector3 | null
        function set_parent(id: string, parent_id: string): void
        function get_parent(id: string): string | null
        function get_world_position(id: string): vmath.vector3 | null
        function get_world_rotation(id: string): vmath.quat | null
        function get_world_scale(id: string): vmath.vector3 | null
        function _delete(url: string): void
        function animate(id: string, property: string, to: any, easing: string, duration: number, delay?: number, complete_function?: () => void): void
        function cancel_animations(id: string, property?: string): void

        const PLAYBACK_ONCE_FORWARD: string;
        const PLAYBACK_ONCE_BACKWARD: string;
        const PLAYBACK_ONCE_PINGPONG: string;
        const PLAYBACK_LOOP_FORWARD: string;
        const PLAYBACK_LOOP_BACKWARD: string;
        const PLAYBACK_LOOP_PINGPONG: string;

        const EASING_LINEAR: string;
        const EASING_INQUAD: string;
        const EASING_OUTQUAD: string;
        const EASING_INOUTQUAD: string;
        const EASING_INCUBIC: string;
        const EASING_OUTCUBIC: string;
        const EASING_INOUTCUBIC: string;
        const EASING_INQUART: string;
        const EASING_OUTQUART: string;
        const EASING_INOUTQUART: string;
        const EASING_INQUINT: string;
        const EASING_OUTQUINT: string;
        const EASING_INOUTQUINT: string;
        const EASING_INSINE: string;
        const EASING_OUTSINE: string;
        const EASING_INOUTSINE: string;
        const EASING_INEXPO: string;
        const EASING_OUTEXPO: string;
        const EASING_INOUTEXPO: string;
        const EASING_INCIRC: string;
        const EASING_OUTCIRC: string;
        const EASING_INOUTCIRC: string;
        const EASING_INELASTIC: string;
        const EASING_OUTELASTIC: string;
        const EASING_INOUTELASTIC: string;
        const EASING_INBACK: string;
        const EASING_OUTBACK: string;
        const EASING_INOUTBACK: string;
        const EASING_INBOUNCE: string;
        const EASING_OUTBOUNCE: string;
        const EASING_INOUTBOUNCE: string;
    }

    namespace sprite {
        function play_flipbook(url: string, animation_id: string): void;
        function set_hflip(url: string, flip: boolean): void;
        function set_vflip(url: string, flip: boolean): void;
    }

    namespace factory {
        function create(url: string, position: Vector3, rotation?: Quaternion, scale?: Vector3): number;
    }

    namespace collectionfactory {
        function create(url: string, position: Vector3, rotation?: Quaternion, scale?: Vector3): string[];
    }

    namespace msg {
        function post(receiver: string, message_id: string, message?: any): void;
        function url(socket?: string, go?: string, component?: string): string;
    }
}


export function register_lua_core() {
    (window as any).tonumber = Number;
    (window as any).json = json_module();
    (window as any).math = math_module();
    (window as any).vmath = vmath_module();
    (window as any).go = go_module();
    (window as any).sprite = sprite_module();
    (window as any).factory = factory_module();
    (window as any).collectionfactory = collectionfactory_module();
    (window as any).msg = msg_module();
}


function url_to_id(url: string) {
    // NOTE: socket не учитываем
    const idx = url.indexOf(":/");
    let goAndComponent = url;
    if (idx !== -1) {
        goAndComponent = url.substring(idx + 1);
    }
    // NOTE: проверяем, есть ли компонент
    const hashIdx = goAndComponent.indexOf("#");
    if (hashIdx !== -1) {
        // NOTE: если компонент есть, берем только его имя
        const componentName = goAndComponent.substring(hashIdx + 1);
        return SceneManager.get_mesh_id_by_name(componentName);
    } else {
        // NOTE: если нет компонента, берем последний сегмент go-части
        const goPath = goAndComponent;
        const parts = goPath.split("/");
        const lastName = parts[parts.length - 1];
        return SceneManager.get_mesh_id_by_name(lastName);
    }
}

function id_to_url(id: number) {
    const mesh = SceneManager.get_mesh_by_id(id);
    if (!mesh) {
        Log.error(`Mesh not found`);
        return null;
    }

    // NOTE: строим путь от корня до текущего объекта
    const path: string[] = [];
    let parent = mesh.parent;
    while (parent && is_base_mesh(parent)) {
        path.push(parent.name);
        parent = parent.parent;
    }
    path.reverse();

    // NOTE: если объект не является компонентом, добавляем его go-часть
    const is_cmp = is_text(mesh) || is_label(mesh) || is_sprite(mesh);
    if (!is_cmp) path.push(mesh.name);

    const goPath = path.join('/');
    return msg.url(undefined, goPath, is_cmp ? mesh.name : undefined);
}


function json_module() {
    function encode(data: any, _: any) {
        return JSON.stringify(data)
    }

    function decode(s: string) {
        return JSON.parse(s)
    }

    return { encode, decode };
}


function math_module() {
    function ceil(x: number) {
        return Math.ceil(x);
    }

    function pow(x: number, y: number) {
        return Math.pow(x, y);
    }

    function abs(x: number) {
        return Math.abs(x);
    }

    function cos(x: number) {
        return Math.cos(x);
    }

    function sin(x: number) {
        return Math.sin(x);
    }

    function rad(x: number) {
        return Math.PI * x / 180;
    }

    function random(m: number = 0, n: number = 1) {
        const minCeiled = Math.ceil(m);
        const maxFloored = Math.floor(n);
        return Math.floor(Math.random() * (maxFloored - minCeiled + 1) + minCeiled);
    }

    function floor(x: number) {
        return Math.floor(x);
    }

    function sqrt(x: number) {
        return Math.sqrt(x);
    }

    function tan(x: number) {
        return Math.tan(x);
    }

    function asin(x: number) {
        return Math.asin(x);
    }

    function acos(x: number) {
        return Math.acos(x);
    }

    function atan(x: number) {
        return Math.atan(x);
    }

    function atan2(y: number, x: number) {
        return Math.atan2(y, x);
    }

    function deg(x: number) {
        return x * 180 / Math.PI;
    }

    function min(...x: number[]) {
        return Math.min(...x);
    }

    function max(...x: number[]) {
        return Math.max(...x);
    }

    function sign(x: number) {
        return Math.sign(x);
    }

    function pi() {
        return Math.PI;
    }

    return {
        ceil, pow, abs, cos, sin, rad, random,
        floor, sqrt, tan, asin, acos, atan, atan2,
        deg, min, max, sign, pi
    };
}


function vmath_module() {
    function vector3_0() {
        return { x: 0, y: 0, z: 0 };
    }

    function vector3_1(n: number) {
        return { x: n, y: n, z: n };
    }

    function vector3_2(v1: vmath.vector3) {
        return { x: v1.x, y: v1.y, z: v1.z };
    }

    function vector3_3(x: number, y: number, z: number) {
        return { x, y, z };
    }

    function vector3(...args: any) {
        if (args.length == 1) {
            if (Number.isInteger(args[0]))
                return vector3_1(args[0]);
            else
                return vector3_2(args[0]);
        }
        if (args.length == 3) {
            return vector3_3(args[0], args[1], args[2]);
        }
        return vector3_0();
    }

    function length(v: vmath.vector3) {
        return Math.sqrt(v.x * v.x + v.y * v.y);
    }

    function normalize(v: vmath.vector3) {
        const len = length(v);
        if (len === 0) return vector3_0();
        return vector3(v.x / len, v.y / len, v.z / len);
    }

    function dot(v1: vmath.vector3, v2: vmath.vector3) {
        return v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
    }

    function cross(v1: vmath.vector3, v2: vmath.vector3) {
        return vector3(
            v1.y * v2.z - v1.z * v2.y,
            v1.z * v2.x - v1.x * v2.z,
            v1.x * v2.y - v1.y * v2.x
        );
    }

    function mul_per_element(v1: vmath.vector3, v2: vmath.vector3) {
        return vector3(v1.x * v2.x, v1.y * v2.y, v1.z * v2.z);
    }

    function lerp(t: number, v1: vmath.vector3, v2: vmath.vector3) {
        return vector3(
            v1.x + (v2.x - v1.x) * t,
            v1.y + (v2.y - v1.y) * t,
            v1.z + (v2.z - v1.z) * t
        );
    }

    function slerp(t: number, v1: vmath.vector3, v2: vmath.vector3) {
        let dot = vmath.dot(v1, v2);

        if (dot < 0) {
            v2 = vector3(-v2.x, -v2.y, -v2.z);
            dot = -dot;
        }

        if (dot > 0.9995) {
            return vector3(
                v1.x + (v2.x - v1.x) * t,
                v1.y + (v2.y - v1.y) * t,
                v1.z + (v2.z - v1.z) * t
            );
        }

        const theta = Math.acos(dot);
        const sinTheta = Math.sin(theta);
        const w1 = Math.sin((1 - t) * theta) / sinTheta;
        const w2 = Math.sin(t * theta) / sinTheta;

        return vector3(
            w1 * v1.x + w2 * v2.x,
            w1 * v1.y + w2 * v2.y,
            w1 * v1.z + w2 * v2.z
        );
    }

    function quat_0() {
        return { x: 0, y: 0, z: 0, w: 0 };
    }

    function quat_1(q: vmath.quat) {
        return { x: q.x, y: q.y, z: q.z, w: q.w };
    }

    function quat_2(x: number, y: number, z: number, w: number) {
        return { x, y, z, w };
    }

    function quat(...args: any) {
        if (args.length == 1) {
            return quat_1(args[0]);
        }
        if (args.length == 4) {
            return quat_2(args[0], args[1], args[2], args[3]);
        }
        return quat_0();
    }

    function quat_from_axis_angle(axis: vmath.vector3, angle: number) {
        const halfAngle = angle * 0.5;
        const s = Math.sin(halfAngle);
        return quat(
            axis.x * s,
            axis.y * s,
            axis.z * s,
            Math.cos(halfAngle)
        );
    }

    function euler_to_quat(x: number, y: number, z: number) {
        const cx = Math.cos(x * 0.5);
        const sx = Math.sin(x * 0.5);
        const cy = Math.cos(y * 0.5);
        const sy = Math.sin(y * 0.5);
        const cz = Math.cos(z * 0.5);
        const sz = Math.sin(z * 0.5);

        return quat(
            sx * cy * cz + cx * sy * sz,
            cx * sy * cz - sx * cy * sz,
            cx * cy * sz + sx * sy * cz,
            cx * cy * cz - sx * sy * sz
        );
    }

    function rotate(q: vmath.quat, v: vmath.vector3) {
        const qx = q.x, qy = q.y, qz = q.z, qw = q.w;
        const vx = v.x, vy = v.y, vz = v.z;

        const ix = qw * vx + qy * vz - qz * vy;
        const iy = qw * vy + qz * vx - qx * vz;
        const iz = qw * vz + qx * vy - qy * vx;
        const iw = -qx * vx - qy * vy - qz * vz;

        return vector3(
            ix * qw + iw * -qx + iy * -qz - iz * -qy,
            iy * qw + iw * -qy + iz * -qx - ix * -qz,
            iz * qw + iw * -qz + ix * -qy - iy * -qx
        );
    }

    return {
        vector3, length, normalize, dot, cross, mul_per_element, lerp, slerp,
        quat, quat_from_axis_angle, euler_to_quat, rotate
    };
}


function go_module() {
    const PLAYBACK_ONCE_FORWARD: string = "once_forward";
    const PLAYBACK_ONCE_BACKWARD: string = "once_backward";
    const PLAYBACK_ONCE_PINGPONG: string = "once_pingpong";
    const PLAYBACK_LOOP_FORWARD: string = "loop_forward";
    const PLAYBACK_LOOP_BACKWARD: string = "loop_backward";
    const PLAYBACK_LOOP_PINGPONG: string = "loop_pingpong";

    const EASING_LINEAR: string = "linear";
    const EASING_INQUAD: string = "inquad";
    const EASING_OUTQUAD: string = "outquad";
    const EASING_INOUTQUAD: string = "inoutquad";
    const EASING_INCUBIC: string = "incubic";
    const EASING_OUTCUBIC: string = "outcubic";
    const EASING_INOUTCUBIC: string = "inoutcubic";
    const EASING_INQUART: string = "inquart";
    const EASING_OUTQUART: string = "outquart";
    const EASING_INOUTQUART: string = "inoutquart";
    const EASING_INQUINT: string = "inquint";
    const EASING_OUTQUINT: string = "outquint";
    const EASING_INOUTQUINT: string = "inoutquint";
    const EASING_INSINE: string = "insine";
    const EASING_OUTSINE: string = "outsine";
    const EASING_INOUTSINE: string = "inoutsine";
    const EASING_INEXPO: string = "inexpo";
    const EASING_OUTEXPO: string = "outexpo";
    const EASING_INOUTEXPO: string = "inoutexpo";
    const EASING_INCIRC: string = "incirc";
    const EASING_OUTCIRC: string = "outcirc";
    const EASING_INOUTCIRC: string = "inoutcirc";
    const EASING_INELASTIC: string = "inelastic";
    const EASING_OUTELASTIC: string = "outelastic";
    const EASING_INOUTELASTIC: string = "inoutelastic";
    const EASING_INBACK: string = "inback";
    const EASING_OUTBACK: string = "outback";
    const EASING_INOUTBACK: string = "inoutback";
    const EASING_INBOUNCE: string = "inbounce";
    const EASING_OUTBOUNCE: string = "outbounce";
    const EASING_INOUTBOUNCE: string = "inoutbounce";

    const EASING_MAP: Record<string, (k: number) => number> = {
        [EASING_LINEAR]: TWEEN.Easing.Linear.None,
        [EASING_INQUAD]: TWEEN.Easing.Quadratic.In,
        [EASING_OUTQUAD]: TWEEN.Easing.Quadratic.Out,
        [EASING_INOUTQUAD]: TWEEN.Easing.Quadratic.InOut,
        [EASING_INCUBIC]: TWEEN.Easing.Cubic.In,
        [EASING_OUTCUBIC]: TWEEN.Easing.Cubic.Out,
        [EASING_INOUTCUBIC]: TWEEN.Easing.Cubic.InOut,
        [EASING_INQUART]: TWEEN.Easing.Quartic.In,
        [EASING_OUTQUART]: TWEEN.Easing.Quartic.Out,
        [EASING_INOUTQUART]: TWEEN.Easing.Quartic.InOut,
        [EASING_INQUINT]: TWEEN.Easing.Quintic.In,
        [EASING_OUTQUINT]: TWEEN.Easing.Quintic.Out,
        [EASING_INOUTQUINT]: TWEEN.Easing.Quintic.InOut,
        [EASING_INSINE]: TWEEN.Easing.Sinusoidal.In,
        [EASING_OUTSINE]: TWEEN.Easing.Sinusoidal.Out,
        [EASING_INOUTSINE]: TWEEN.Easing.Sinusoidal.InOut,
        [EASING_INEXPO]: TWEEN.Easing.Exponential.In,
        [EASING_OUTEXPO]: TWEEN.Easing.Exponential.Out,
        [EASING_INOUTEXPO]: TWEEN.Easing.Exponential.InOut,
        [EASING_INCIRC]: TWEEN.Easing.Circular.In,
        [EASING_OUTCIRC]: TWEEN.Easing.Circular.Out,
        [EASING_INOUTCIRC]: TWEEN.Easing.Circular.InOut,
        [EASING_INELASTIC]: TWEEN.Easing.Elastic.In,
        [EASING_OUTELASTIC]: TWEEN.Easing.Elastic.Out,
        [EASING_INOUTELASTIC]: TWEEN.Easing.Elastic.InOut,
        [EASING_INBACK]: TWEEN.Easing.Back.In,
        [EASING_OUTBACK]: TWEEN.Easing.Back.Out,
        [EASING_INOUTBACK]: TWEEN.Easing.Back.InOut,
        [EASING_INBOUNCE]: TWEEN.Easing.Bounce.In,
        [EASING_OUTBOUNCE]: TWEEN.Easing.Bounce.Out,
        [EASING_INOUTBOUNCE]: TWEEN.Easing.Bounce.InOut,
    };

    function set_position(position: vmath.vector3, url: string) {
        const mesh = SceneManager.get_mesh_by_id(url_to_id(url));
        if (!mesh) {
            Log.error(`Mesh with url ${url} not found`);
            return;
        }
        mesh.position.copy(position);
    }

    function get_position(url: string) {
        const mesh = SceneManager.get_mesh_by_id(url_to_id(url));
        if (!mesh) {
            Log.error(`Mesh with url ${url} not found`);
            return null;
        }
        return vmath.vector3(...mesh.position.toArray());
    }

    function set_rotation(rotation: vmath.quat, url: string) {
        const mesh = SceneManager.get_mesh_by_id(url_to_id(url));
        if (!mesh) {
            Log.error(`Mesh with url ${url} not found`);
            return;
        }
        mesh.rotation.setFromQuaternion(new Quaternion(rotation.x, rotation.y, rotation.z, rotation.w));
    }

    function get_rotation(url: string) {
        const mesh = SceneManager.get_mesh_by_id(url_to_id(url));
        if (!mesh) {
            Log.error(`Mesh with url ${url} not found`);
            return null;
        }
        const euler = mesh.rotation;
        return vmath.euler_to_quat(euler.x, euler.y, euler.z);
    }

    function set_scale(scale: vmath.vector3, url: string) {
        const mesh = SceneManager.get_mesh_by_id(url_to_id(url));
        if (!mesh) {
            Log.error(`Mesh with url ${url} not found`);
            return;
        }
        mesh.scale.copy(scale);
    }

    function get_scale(url: string) {
        const mesh = SceneManager.get_mesh_by_id(url_to_id(url));
        if (!mesh) {
            Log.error(`Mesh with url ${url} not found`);
            return null;
        }
        return vmath.vector3(...mesh.scale.toArray());
    }

    function set_parent(parent_url: string, _: boolean = false, url: string) {
        const mesh = SceneManager.get_mesh_by_id(url_to_id(url));
        const parent = SceneManager.get_mesh_by_id(url_to_id(parent_url));
        if (!mesh) {
            Log.error(`Mesh with url ${url} not found`);
            return;
        }
        if (!parent) {
            Log.error(`Parent mesh with url ${parent_url} not found`);
            return;
        }
        mesh.parent = parent;
    }

    function get_parent(url: string) {
        const mesh = SceneManager.get_mesh_by_id(url_to_id(url));
        if (!mesh) {
            Log.error(`Mesh with url ${url} not found`);
            return null;
        }
        return mesh.parent ? id_to_url(mesh.parent.id) : null;
    }

    function get_world_position(url: string) {
        const mesh = SceneManager.get_mesh_by_id(url_to_id(url));
        if (!mesh) {
            Log.error(`Mesh with url ${url} not found`);
            return null;
        }
        const worldPosition = mesh.getWorldPosition(new Vector3());
        return vmath.vector3(...worldPosition.toArray());
    }

    function get_world_rotation(url: string) {
        const mesh = SceneManager.get_mesh_by_id(url_to_id(url));
        if (!mesh) {
            Log.error(`Mesh with url ${url} not found`);
            return null;
        }
        const worldRotation = mesh.rotation;
        return vmath.euler_to_quat(worldRotation.x, worldRotation.y, worldRotation.z);
    }

    function get_world_scale(url: string) {
        const mesh = SceneManager.get_mesh_by_id(url_to_id(url));
        if (!mesh) {
            Log.error(`Mesh with url ${url} not found`);
            return null;
        }
        const worldScale = mesh.getWorldScale(new Vector3());
        return vmath.vector3(...worldScale.toArray());
    }

    function _delete(url: string) {
        SceneManager.remove(url_to_id(url));
    }

    function applyPlayback(tween: TWEEN.Tween, playback: string) {
        switch (playback) {
            case PLAYBACK_ONCE_PINGPONG:
                tween.yoyo(true).repeat(1);
                break;
            case PLAYBACK_LOOP_FORWARD:
                tween.repeat(Infinity);
                break;
            case PLAYBACK_LOOP_BACKWARD:
                tween.repeat(Infinity);
                break;
            case PLAYBACK_LOOP_PINGPONG:
                tween.yoyo(true).repeat(Infinity);
                break;
        }
    }

    function get_nested_property(obj: any, path: string): any {
        const parts = path.split('.');
        let current = obj;
        for (const part of parts) {
            if (current === undefined || current === null) return undefined;
            current = current[part];
        }
        return current;
    }

    function set_nested_property(obj: any, path: string, value: any): void {
        const parts = path.split('.');
        let current = obj;
        for (let i = 0; i < parts.length - 1; i++) {
            const part = parts[i];
            if (current[part] === undefined || current[part] === null) {
                current[part] = {};
            }
            current = current[part];
        }
        current[parts[parts.length - 1]] = value;
    }

    function animate(
        url: string,
        property: string,
        playback: string,
        to: any,
        easing: string,
        duration: number,
        delay: number = 0,
        complete_function?: (self: IBaseEntityAndThree, url: string, property: string) => void
    ) {
        const mesh_id = url_to_id(url);
        const mesh = SceneManager.get_mesh_by_id(mesh_id);
        if (!mesh) {
            Log.error(`Mesh with url ${url} not found`);
            return;
        }

        const currentValue = get_nested_property(mesh, property);
        if (currentValue === undefined) {
            Log.error(`Property ${property} not found on mesh`);
            return;
        }

        const is_backward = playback == go.PLAYBACK_ONCE_BACKWARD || playback == go.PLAYBACK_LOOP_BACKWARD;
        const obj = { value: is_backward ? to : currentValue };
        const tween = new TWEEN.Tween(obj)
            .to({ value: is_backward ? currentValue : to }, duration)
            .onUpdate(() => {
                set_nested_property(mesh, property, obj.value);
            })
            .delay(delay)
            .easing(EASING_MAP[easing] ?? TWEEN.Easing.Linear.None)
            .onComplete((_: { [key: string]: any }) => {
                TweenManager.remove_mesh_property_tween(mesh_id, property);
                if (complete_function) complete_function(mesh, url, property);
            });
        applyPlayback(tween, playback);
        TweenManager.set_mesh_property_tween(mesh_id, property, tween);
        tween.start();
    }

    function cancel_animations(url: string, property?: string) {
        const mesh_id = url_to_id(url);
        const mesh = SceneManager.get_mesh_by_id(url_to_id(url));
        if (!mesh) {
            Log.error(`Mesh with url ${url} not found`);
            return;
        }
        if (property) {
            TweenManager.get_mesh_property_tween(mesh_id, property)?.remove();
            TweenManager.remove_mesh_property_tween(mesh_id, property);
        }
        else {
            TweenManager.get_all_mesh_properties_tweens(mesh_id)?.forEach((t) => t.remove());
            TweenManager.remove_all_mesh_properties_tweens(mesh_id);
        }
    }

    return {
        set_position, get_position, set_rotation, get_rotation,
        set_scale, get_scale, set_parent, get_parent,
        get_world_position, get_world_rotation, get_world_scale,
        _delete, animate, cancel_animations,
        PLAYBACK_ONCE_FORWARD, PLAYBACK_ONCE_BACKWARD, PLAYBACK_ONCE_PINGPONG,
        PLAYBACK_LOOP_FORWARD, PLAYBACK_LOOP_BACKWARD, PLAYBACK_LOOP_PINGPONG,
        EASING_LINEAR, EASING_INQUAD, EASING_OUTQUAD, EASING_INOUTQUAD,
        EASING_INCUBIC, EASING_OUTCUBIC, EASING_INOUTCUBIC,
        EASING_INQUART, EASING_OUTQUART, EASING_INOUTQUART,
        EASING_INQUINT, EASING_OUTQUINT, EASING_INOUTQUINT,
        EASING_INSINE, EASING_OUTSINE, EASING_INOUTSINE,
        EASING_INEXPO, EASING_OUTEXPO, EASING_INOUTEXPO,
        EASING_INCIRC, EASING_OUTCIRC, EASING_INOUTCIRC,
        EASING_INELASTIC, EASING_OUTELASTIC, EASING_INOUTELASTIC,
        EASING_INBACK, EASING_OUTBACK, EASING_INOUTBACK,
        EASING_INBOUNCE, EASING_OUTBOUNCE, EASING_INOUTBOUNCE
    };
}

function sprite_module() {
    function play_flipbook(
        url: string,
        animation_id: string,
        complete_function?: (self: IBaseEntityAndThree, message_id: string, message: any) => void,
        options?: {
            offset?: number,
            playback_rate?: number
        }
    ) {
        const mesh = SceneManager.get_mesh_by_id(url_to_id(url));
        if (!mesh) {
            Log.error(`Mesh with url ${url} not found`);
            return;
        }
        const info = mesh.get_texture();
        mesh.set_texture(animation_id, info[1]);
    }

    function set_hflip(url: string, flip: boolean) {
        const mesh = SceneManager.get_mesh_by_id(url_to_id(url));
        if (!mesh) {
            Log.error(`Mesh with url ${url} not found`);
            return;
        }
        mesh.scale.x = Math.abs(mesh.scale.x) * (flip ? -1 : 1);
    }

    function set_vflip(url: string, flip: boolean) {
        const mesh = SceneManager.get_mesh_by_id(url_to_id(url));
        if (!mesh) {
            Log.error(`Mesh with url ${url} not found`);
            return;
        }
        mesh.scale.y = Math.abs(mesh.scale.y) * (flip ? -1 : 1);
    }

    return {
        play_flipbook,
        set_hflip,
        set_vflip
    };
}

function factory_module() {
    function create(
        url: string,
        position: vmath.vector3,
        rotation?: vmath.quat,
        properties?: any,
        scale?: vmath.vector3
    ) {
        const result = AssetControl.loadPartOfSceneInPos(
            url,
            new Vector3().copy(position),
            rotation ? new Quaternion().copy(rotation) : undefined,
            scale ? new Vector3().copy(scale) : undefined
        );
        if (result == null) return null;
        return id_to_url(result.mesh_data.id);
    }

    return { create };
}


function collectionfactory_module() {
    function create(
        url: string,
        position: vmath.vector3,
        rotation?: vmath.quat,
        properties?: any,
        scale?: vmath.vector3
    ) {
        const result = AssetControl.loadPartOfSceneInPos(
            url,
            new Vector3().copy(position),
            rotation ? new Quaternion().copy(rotation) : undefined,
            scale ? new Vector3().copy(scale) : undefined
        );
        if (!result) return null;
        return SceneManager.get_scene_list().filter(obj => {
            return obj.mesh_data.id > result.mesh_data.id;
        }).map((obj: IBaseEntityAndThree) => id_to_url(obj.mesh_data.id));
    }

    return { create };
}


function msg_module() {
    function post(receiver: string, message_id: string, message?: any) {
        EventBus.send(message_id as MessageId, {
            receiver,
            message
        });
    }

    function url(socket?: string, go?: string, component?: string): string {
        let result = "";
        if (socket) result += socket;
        if (go) result += ":/" + go;
        if (component) result += "#" + component;
        return result;
    }

    return { post, url };
}