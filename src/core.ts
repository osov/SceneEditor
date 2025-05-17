import { Quaternion, Vector3 } from "three"
import { MessageId } from "./modules/modules_const"
import * as TWEEN from '@tweenjs/tween.js';
import { IBaseEntityAndThree } from "./render_engine/types";

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
        // Q&A: как быть с зарезервированным словом delete ?
        // function delete(hash: string): void
        function animate(id: string, property: string, to: any, easing: string, duration: number, delay?: number, complete_function?: () => void): void
        function cancel_animations(id: string, property?: string): void

        const PLAYBACK_ONCE_FORWARD = "once_forward";
        const PLAYBACK_ONCE_BACKWARD = "once_backward";
        const PLAYBACK_ONCE_PINGPONG = "once_pingpong";
        const PLAYBACK_LOOP_FORWARD = "loop_forward";
        const PLAYBACK_LOOP_BACKWARD = "loop_backward";
        const PLAYBACK_LOOP_PINGPONG = "loop_pingpong";

        const EASING_LINEAR = "linear";
        const EASING_INQUAD = "inquad";
        const EASING_OUTQUAD = "outquad";
        const EASING_INOUTQUAD = "inoutquad";
        const EASING_INCUBIC = "incubic";
        const EASING_OUTCUBIC = "outcubic";
        const EASING_INOUTCUBIC = "inoutcubic";
        const EASING_INQUART = "inquart";
        const EASING_OUTQUART = "outquart";
        const EASING_INOUTQUART = "inoutquart";
        const EASING_INQUINT = "inquint";
        const EASING_OUTQUINT = "outquint";
        const EASING_INOUTQUINT = "inoutquint";
        const EASING_INSINE = "insine";
        const EASING_OUTSINE = "outsine";
        const EASING_INOUTSINE = "inoutsine";
        const EASING_INEXPO = "inexpo";
        const EASING_OUTEXPO = "outexpo";
        const EASING_INOUTEXPO = "inoutexpo";
        const EASING_INCIRC = "incirc";
        const EASING_OUTCIRC = "outcirc";
        const EASING_INOUTCIRC = "inoutcirc";
        const EASING_INELASTIC = "inelastic";
        const EASING_OUTELASTIC = "outelastic";
        const EASING_INOUTELASTIC = "inoutelastic";
        const EASING_INBACK = "inback";
        const EASING_OUTBACK = "outback";
        const EASING_INOUTBACK = "inoutback";
        const EASING_INBOUNCE = "inbounce";
        const EASING_OUTBOUNCE = "outbounce";
        const EASING_INOUTBOUNCE = "inoutbounce";
    }

    namespace sprite {
        function play_flipbook(hash: string, animation_id: string, options?: {
            offset?: number,
            playback_rate?: number
        }): void;
        function set_hflip(hash: string, flip: boolean): void;
        function set_vflip(hash: string, flip: boolean): void;
    }

    namespace factory {
        function create(hash: string, position?: Vector3, rotation?: Quaternion, scale?: Vector3): number;
        function load(hash: string): void;
        function set_prototype(hash: string, prototype_hash: string): void;
        function unload(hash: string): void;
    }

    namespace msg {
        function post(receiver: string, message_id: string, message?: any): void;
        function url(path?: string, fragment?: string, component?: string): string;
    }
}

export function register_lua_types() {
    (global as any).tonumber = Number;
    (global as any).json = json_module();
    (global as any).math = math_module();
    (global as any).vmath = vmath_module();
    (global as any).go = go_module();
    (global as any).sprite = sprite_module();
    (global as any).factory = factory_module();
    (global as any).msg = msg_module();
}

const EASING_MAP: Record<string, (k: number) => number> = {
    [go.EASING_LINEAR]: TWEEN.Easing.Linear.None,
    [go.EASING_INQUAD]: TWEEN.Easing.Quadratic.In,
    [go.EASING_OUTQUAD]: TWEEN.Easing.Quadratic.Out,
    [go.EASING_INOUTQUAD]: TWEEN.Easing.Quadratic.InOut,
    [go.EASING_INCUBIC]: TWEEN.Easing.Cubic.In,
    [go.EASING_OUTCUBIC]: TWEEN.Easing.Cubic.Out,
    [go.EASING_INOUTCUBIC]: TWEEN.Easing.Cubic.InOut,
    [go.EASING_INQUART]: TWEEN.Easing.Quartic.In,
    [go.EASING_OUTQUART]: TWEEN.Easing.Quartic.Out,
    [go.EASING_INOUTQUART]: TWEEN.Easing.Quartic.InOut,
    [go.EASING_INQUINT]: TWEEN.Easing.Quintic.In,
    [go.EASING_OUTQUINT]: TWEEN.Easing.Quintic.Out,
    [go.EASING_INOUTQUINT]: TWEEN.Easing.Quintic.InOut,
    [go.EASING_INSINE]: TWEEN.Easing.Sinusoidal.In,
    [go.EASING_OUTSINE]: TWEEN.Easing.Sinusoidal.Out,
    [go.EASING_INOUTSINE]: TWEEN.Easing.Sinusoidal.InOut,
    [go.EASING_INEXPO]: TWEEN.Easing.Exponential.In,
    [go.EASING_OUTEXPO]: TWEEN.Easing.Exponential.Out,
    [go.EASING_INOUTEXPO]: TWEEN.Easing.Exponential.InOut,
    [go.EASING_INCIRC]: TWEEN.Easing.Circular.In,
    [go.EASING_OUTCIRC]: TWEEN.Easing.Circular.Out,
    [go.EASING_INOUTCIRC]: TWEEN.Easing.Circular.InOut,
    [go.EASING_INELASTIC]: TWEEN.Easing.Elastic.In,
    [go.EASING_OUTELASTIC]: TWEEN.Easing.Elastic.Out,
    [go.EASING_INOUTELASTIC]: TWEEN.Easing.Elastic.InOut,
    [go.EASING_INBACK]: TWEEN.Easing.Back.In,
    [go.EASING_OUTBACK]: TWEEN.Easing.Back.Out,
    [go.EASING_INOUTBACK]: TWEEN.Easing.Back.InOut,
    [go.EASING_INBOUNCE]: TWEEN.Easing.Bounce.In,
    [go.EASING_OUTBOUNCE]: TWEEN.Easing.Bounce.Out,
    [go.EASING_INOUTBOUNCE]: TWEEN.Easing.Bounce.InOut,
};

// Q&A: что нужно именно у нас хранить в hash кроме id ?
function hash_to_id(hash: string) {
    return Number(hash);
}

function id_to_hash(id: number) {
    return id.toString();
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
    function set_position(position: vmath.vector3, hash: string) {
        const mesh = SceneManager.get_mesh_by_id(hash_to_id(hash));
        if (!mesh) {
            Log.error(`Mesh with hash ${hash} not found`);
            return;
        }

        mesh.position.copy(position);
    }

    function get_position(hash: string) {
        const mesh = SceneManager.get_mesh_by_id(hash_to_id(hash));
        if (!mesh) {
            Log.error(`Mesh with hash ${hash} not found`);
            return null;
        }

        return vmath.vector3(...mesh.position.toArray());
    }

    function set_rotation(rotation: vmath.quat, hash: string) {
        const mesh = SceneManager.get_mesh_by_id(hash_to_id(hash));
        if (!mesh) {
            Log.error(`Mesh with hash ${hash} not found`);
            return;
        }

        mesh.rotation.setFromQuaternion(new Quaternion(rotation.x, rotation.y, rotation.z, rotation.w));
    }

    function get_rotation(hash: string) {
        const mesh = SceneManager.get_mesh_by_id(hash_to_id(hash));
        if (!mesh) {
            Log.error(`Mesh with hash ${hash} not found`);
            return null;
        }

        const euler = mesh.rotation;
        return vmath.euler_to_quat(euler.x, euler.y, euler.z);
    }

    function set_scale(scale: vmath.vector3, hash: string) {
        const mesh = SceneManager.get_mesh_by_id(hash_to_id(hash));
        if (!mesh) {
            Log.error(`Mesh with hash ${hash} not found`);
            return;
        }

        mesh.scale.copy(scale);
    }

    function get_scale(hash: string) {
        const mesh = SceneManager.get_mesh_by_id(hash_to_id(hash));
        if (!mesh) {
            Log.error(`Mesh with hash ${hash} not found`);
            return null;
        }

        return vmath.vector3(...mesh.scale.toArray());
    }

    function set_parent(parent_hash: string, _: boolean = false, hash: string) {
        const mesh = SceneManager.get_mesh_by_id(hash_to_id(hash));
        const parent = SceneManager.get_mesh_by_id(hash_to_id(parent_hash));

        if (!mesh) {
            Log.error(`Mesh with hash ${hash} not found`);
            return;
        }
        if (!parent) {
            Log.error(`Parent mesh with hash ${parent_hash} not found`);
            return;
        }

        mesh.parent = parent;
    }

    function get_parent(hash: string) {
        const mesh = SceneManager.get_mesh_by_id(hash_to_id(hash));
        if (!mesh) {
            Log.error(`Mesh with hash ${hash} not found`);
            return null;
        }

        return mesh.parent ? id_to_hash(mesh.parent.id) : null;
    }

    function get_world_position(hash: string) {
        const mesh = SceneManager.get_mesh_by_id(hash_to_id(hash));
        if (!mesh) {
            Log.error(`Mesh with hash ${hash} not found`);
            return null;
        }

        const worldPosition = mesh.getWorldPosition(new Vector3());
        return vmath.vector3(...worldPosition.toArray());
    }

    function get_world_rotation(hash: string) {
        const mesh = SceneManager.get_mesh_by_id(hash_to_id(hash));
        if (!mesh) {
            Log.error(`Mesh with hash ${hash} not found`);
            return null;
        }

        const worldRotation = mesh.rotation;
        return vmath.euler_to_quat(worldRotation.x, worldRotation.y, worldRotation.z);
    }

    function get_world_scale(hash: string) {
        const mesh = SceneManager.get_mesh_by_id(hash_to_id(hash));
        if (!mesh) {
            Log.error(`Mesh with hash ${hash} not found`);
            return null;
        }

        const worldScale = mesh.getWorldScale(new Vector3());
        return vmath.vector3(...worldScale.toArray());
    }

    function animate(
        hash: string,
        property: string,
        playback: string,
        to: any,
        easing: string,
        duration: number,
        delay: number = 0,
        complete_function?: (self: IBaseEntityAndThree, url: string, property: string) => void
    ) {
        const mesh_id = hash_to_id(hash);
        const mesh = SceneManager.get_mesh_by_id(mesh_id);
        if (!mesh) {
            Log.error(`Mesh with hash ${hash} not found`);
            return;
        }

        const is_backward = playback == go.PLAYBACK_ONCE_BACKWARD || playback == go.PLAYBACK_LOOP_BACKWARD;
        const obj = { [property]: is_backward ? to : (mesh as any)[property] };
        const tween = new TWEEN.Tween(obj)
            .to({ [property]: is_backward ? (mesh as any)[property] : to }, duration)
            .onUpdate(() => {
                (mesh as any)[property] = obj[property];
            })
            .delay(delay)
            .easing(EASING_MAP[easing] ?? TWEEN.Easing.Linear.None)
            .onComplete((_: { [key: string]: any }) => {
                if (complete_function) complete_function(mesh, hash, property);
                SceneManager.remove_mesh_property_tween(mesh_id, property);
            });

        applyPlayback(tween, playback);

        tween.start();

        // Q&A: где хранить инстанс твина чтоб им управлять ? - пока что храню в SceneManager
        SceneManager.set_mesh_property_tween(mesh_id, property, tween);
    }

    function applyPlayback(tween: TWEEN.Tween, playback: string) {
        switch (playback) {
            case go.PLAYBACK_ONCE_FORWARD:
                tween.repeat(0).yoyo(false);
                break;
            case go.PLAYBACK_ONCE_BACKWARD:
                tween.repeat(0).yoyo(false);
                break;
            case go.PLAYBACK_ONCE_PINGPONG:
                tween.repeat(1).yoyo(true);
                break;
            case go.PLAYBACK_LOOP_FORWARD:
                tween.repeat(Infinity).yoyo(false);
                break;
            case go.PLAYBACK_LOOP_BACKWARD:
                tween.repeat(Infinity).yoyo(false);
                break;
            case go.PLAYBACK_LOOP_PINGPONG:
                tween.repeat(Infinity).yoyo(true);
                break;
        }
    }

    function cancel_animations(hash: string, property?: string) {
        const mesh_id = hash_to_id(hash);
        const mesh = SceneManager.get_mesh_by_id(hash_to_id(hash));
        if (!mesh) {
            Log.error(`Mesh with hash ${hash} not found`);
            return;
        }

        if (property) {
            SceneManager.get_mesh_property_tween(mesh_id, property)?.remove();
            SceneManager.remove_mesh_property_tween(mesh_id, property);
        }
        else {
            SceneManager.get_all_mesh_properties_tweens(mesh_id)?.forEach((t) => t.remove());
            SceneManager.remove_all_mesh_properties_tweens(mesh_id);
        }
    }

    return {
        set_position, get_position, set_rotation, get_rotation,
        set_scale, get_scale, set_parent, get_parent,
        get_world_position, get_world_rotation, get_world_scale,
        animate, cancel_animations
    };
}

function sprite_module() {
    function play_flipbook(hash: string, animation_id: string, complete_function?: () => void, options?: {
        offset?: number,
        playback_rate?: number
    }) {
        const mesh = SceneManager.get_mesh_by_id(hash_to_id(hash));
        if (!mesh) {
            Log.error(`Mesh with hash ${hash} not found`);
            return;
        }

        // Q&A: что тут использовать ?
    }

    function set_hflip(hash: string, flip: boolean) {
        const mesh = SceneManager.get_mesh_by_id(hash_to_id(hash));
        if (!mesh) {
            Log.error(`Mesh with hash ${hash} not found`);
            return;
        }

        mesh.scale.x = Math.abs(mesh.scale.x) * (flip ? -1 : 1);
    }

    function set_vflip(hash: string, flip: boolean) {
        const mesh = SceneManager.get_mesh_by_id(hash_to_id(hash));
        if (!mesh) {
            Log.error(`Mesh with hash ${hash} not found`);
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
    // Q&A: где хранить сами фактори ? тоже в SceneManager как с tween-ами ?

    function create(hash: string, position?: vmath.vector3, rotation?: vmath.quat, properties?: any, scale?: vmath.vector3) {
        // Q&A: создает обьект ? откуда брать шаблон ? из файла ?
    }

    function load(hash: string) {
        // Q&A: загрузка и создание ресурса ?
    }

    function set_prototype(hash: string, prototype_hash: string) {
        // Q&A: установка ресурса для создания объектов
    }

    function unload(hash: string) {
        // Q&A: выгрузка ресурса ?
    }

    return { create, load, set_prototype, unload };
}

function msg_module() {
    function post(receiver: string, message_id: string, message?: any) {
        EventBus.send(message_id as MessageId, message);
    }

    return { post };
}