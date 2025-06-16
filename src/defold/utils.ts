import { Slice9Mesh } from "@editor/render_engine/objects/slice9";
import { IBaseEntityAndThree } from "@editor/render_engine/types";
import { AdditiveBlending, CustomBlending, MultiplyBlending, NormalBlending } from "three";
import * as TWEEN from '@tweenjs/tween.js';


export function hex2rgba(hex: string, alpha = 1) {
    hex = hex.replace('#', '');
    if (hex.length == 3)
        return vmath.vector4(
            tonumber("0x" + hex.substr(0, 1))! * 17 / 255,
            tonumber("0x" + hex.substr(1, 1))! * 17 / 255,
            tonumber("0x" + hex.substr(2, 1))! * 17 / 255, alpha);

    else if (hex.length == 6)
        return vmath.vector4(
            tonumber("0x" + hex.substr(0, 2))! / 255,
            tonumber("0x" + hex.substr(2, 2))! / 255,
            tonumber("0x" + hex.substr(4, 2))! / 255, alpha);
    else {
        Log.error(false, 'hex not correct:' + hex);
        return vmath.vector4();
    }
}

export function rgb2hex(vec: vmath.vector3): string {
    const r = Math.round(vec.x * 255);
    const g = Math.round(vec.y * 255);
    const b = Math.round(vec.z * 255);
    const toHex = (v: number) => v.toString(16).padStart(2, "0");
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function get_nested_property(obj: any, path: string): any {
    const parts = path.split('.');
    let current = obj;
    if (path == 'size') {
        return obj.get_size();
    }
    if (path == 'euler.z') {
        return obj.rotation.z;
    }
    for (const part of parts) {
        if (current === undefined || current === null) {
            Log.error(`get_nested_property: ${path} not found`, obj);
            return undefined;
        }
        current = current[part];
    }
    if (current == undefined)
        Log.error(`get_nested_property: ${path} not found`, obj);
    return current;
}

export function set_nested_property(obj: any, path: string, value: any): void {
    if (path == 'size') {
        obj.set_size(value.x, value.y);
        return;
    }
    if (path == 'tint') {
        obj.set_color(rgb2hex(value));
        if (value.w != undefined)
            obj.set_alpha(value.w);
        return;
    }
    if (path == 'tint.w') {
        obj.set_alpha(value);
        return;
    }
    if (path == 'euler.z') {
        obj.rotation.z = value;
        return;
    }
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

export const PLAYBACK_ONCE_FORWARD = 0;
export const PLAYBACK_ONCE_BACKWARD = 1;
export const PLAYBACK_ONCE_PINGPONG = 2;
export const PLAYBACK_LOOP_FORWARD = 3;
export const PLAYBACK_LOOP_BACKWARD = 4;
export const PLAYBACK_LOOP_PINGPONG = 5;

export const EASING_LINEAR = 0;
export const EASING_INQUAD = 1;
export const EASING_OUTQUAD = 2;
export const EASING_INOUTQUAD = 3;
export const EASING_INCUBIC = 4;
export const EASING_OUTCUBIC = 5;
export const EASING_INOUTCUBIC = 6;
export const EASING_INQUART = 7;
export const EASING_OUTQUART = 8;
export const EASING_INOUTQUART = 9;
export const EASING_INQUINT = 10;
export const EASING_OUTQUINT = 11;
export const EASING_INOUTQUINT = 12;
export const EASING_INSINE = 13;
export const EASING_OUTSINE = 14;
export const EASING_INOUTSINE = 15;
export const EASING_INEXPO = 16;
export const EASING_OUTEXPO = 17;
export const EASING_INOUTEXPO = 18;
export const EASING_INCIRC = 19;
export const EASING_OUTCIRC = 20;
export const EASING_INOUTCIRC = 21;
export const EASING_INELASTIC = 22;
export const EASING_OUTELASTIC = 23;
export const EASING_INOUTELASTIC = 24;
export const EASING_INBACK = 25;
export const EASING_OUTBACK = 26;
export const EASING_INOUTBACK = 27;
export const EASING_INBOUNCE = 28;
export const EASING_OUTBOUNCE = 29;
export const EASING_INOUTBOUNCE = 30;

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

function applyPlayback(tween: TWEEN.Tween, playback: any) {
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

// NOTE: важно что для полей материала не поддерживается передача c доступом через '.'
// если нужно к примеру передать vector, то нужно передавать целиком
// pos.x - выдаст что поле не найдено
// pos - верно
export function animate_logic(
    mesh: IBaseEntityAndThree,
    property: string,
    playback: any,
    to: number | vmath.vector3 | vmath.quaternion,
    easing: any,
    duration: number,
    delay: number = 0,
    complete_function?: () => void
) {
    if (property == 'tint.w')
        property = 'alpha';

    let is_material_property = false;
    let currentValue = get_nested_property(mesh, property);
    if (currentValue == undefined) {
        is_material_property = true;
        const material = (mesh as any).material;
        if (material) currentValue = material.uniforms[property]?.value;
        if (currentValue == undefined) {
            Log.error(`Property ${property} not found on mesh`);
            return;
        }
    }

    const is_backward = playback == PLAYBACK_ONCE_BACKWARD || playback == PLAYBACK_LOOP_BACKWARD;
    const obj = { value: is_backward ? to : currentValue };
    const tween = new TWEEN.Tween(obj)
        .to({ value: is_backward ? currentValue : to }, duration * 1000)
        .onUpdate(() => {
            if (is_material_property) {
                // FIXME: не будет ли ошибкой к примеру при установке для текста, он должен же менятся на прямую
                ResourceManager.set_material_uniform_for_mesh(mesh as Slice9Mesh, property, obj.value);
                return;
            }
            set_nested_property(mesh, property, obj.value);
        })
        .delay(delay * 1000)
        .easing(EASING_MAP[easing] ?? TWEEN.Easing.Linear.None)
        .onComplete((_: { [key: string]: any }) => {
            TweenManager.remove_mesh_property_tween(mesh.mesh_data.id, property);
            if (complete_function) complete_function();
        });
    applyPlayback(tween, playback);
    TweenManager.set_mesh_property_tween(mesh.mesh_data.id, property, tween);
    tween.start();
}

export function cancel_animations_logic(mesh: IBaseEntityAndThree, property?: string) {
    if (property == 'tint.w')
        property = 'alpha';
    if (property) TweenManager.remove_mesh_property_tween(mesh.mesh_data.id, property);
    else TweenManager.remove_all_mesh_properties_tweens(mesh.mesh_data.id);
}

export function uh_to_id(uh: string | hash): number {
    if (typeof uh !== 'string' && (uh as any).id != undefined) {
        return (uh as any).id;
    }
    return SceneManager.get_mesh_id_by_url(uh as string);
}

export function convert_defold_blend_mode_to_threejs(blend_mode: any) {
    switch (blend_mode) {
        case gui.BLEND_ALPHA:
            return NormalBlending;
        case gui.BLEND_ADD:
            return AdditiveBlending;
        case gui.BLEND_ADD_ALPHA:
            return AdditiveBlending;
        case gui.BLEND_MULT:
            return MultiplyBlending;
        case gui.BLEND_SCREEN:
            return CustomBlending;
        default:
            return NormalBlending;
    }
}

export function convert_threejs_blend_mode_to_defold(blend_mode: any) {
    switch (blend_mode) {
        case NormalBlending:
            return gui.BLEND_ALPHA;
        case AdditiveBlending:
            return gui.BLEND_ADD;
        case MultiplyBlending:
            return gui.BLEND_MULT;
        case CustomBlending:
            return gui.BLEND_SCREEN;
        default:
            return gui.BLEND_ALPHA;
    }
}

export function convert_defold_pivot_to_threejs(pivot: any) {
    let pivot_x = 0.5;
    let pivot_y = 0.5;

    switch (pivot) {
        case gui.PIVOT_CENTER:
            pivot_x = 0.5;
            pivot_y = 0.5;
            break;
        case gui.PIVOT_N:
            pivot_x = 0.5;
            pivot_y = 1.0;
            break;
        case gui.PIVOT_NE:
            pivot_x = 1.0;
            pivot_y = 1.0;
            break;
        case gui.PIVOT_E:
            pivot_x = 1.0;
            pivot_y = 0.5;
            break;
        case gui.PIVOT_SE:
            pivot_x = 1.0;
            pivot_y = 0.0;
            break;
        case gui.PIVOT_S:
            pivot_x = 0.5;
            pivot_y = 0.0;
            break;
        case gui.PIVOT_SW:
            pivot_x = 0.0;
            pivot_y = 0.0;
            break;
        case gui.PIVOT_W:
            pivot_x = 0.0;
            pivot_y = 0.5;
            break;
        case gui.PIVOT_NW:
            pivot_x = 0.0;
            pivot_y = 1.0;
            break;
    }

    return [pivot_x, pivot_y];
}

export function convert_threejs_pivot_to_defold(x: number, y: number): any {
    // Use small epsilon for float comparison
    const EPSILON = 0.001;

    if (Math.abs(x - 0.5) < EPSILON && Math.abs(y - 0.5) < EPSILON) {
        return gui.PIVOT_CENTER;
    }
    if (Math.abs(x - 0.5) < EPSILON && Math.abs(y - 1.0) < EPSILON) {
        return gui.PIVOT_N;
    }
    if (Math.abs(x - 1.0) < EPSILON && Math.abs(y - 1.0) < EPSILON) {
        return gui.PIVOT_NE;
    }
    if (Math.abs(x - 1.0) < EPSILON && Math.abs(y - 0.5) < EPSILON) {
        return gui.PIVOT_E;
    }
    if (Math.abs(x - 1.0) < EPSILON && Math.abs(y - 0.0) < EPSILON) {
        return gui.PIVOT_SE;
    }
    if (Math.abs(x - 0.5) < EPSILON && Math.abs(y - 0.0) < EPSILON) {
        return gui.PIVOT_S;
    }
    if (Math.abs(x - 0.0) < EPSILON && Math.abs(y - 0.0) < EPSILON) {
        return gui.PIVOT_SW;
    }
    if (Math.abs(x - 0.0) < EPSILON && Math.abs(y - 0.5) < EPSILON) {
        return gui.PIVOT_W;
    }
    if (Math.abs(x - 0.0) < EPSILON && Math.abs(y - 1.0) < EPSILON) {
        return gui.PIVOT_NW;
    }

    // Default to center if no exact match
    return gui.PIVOT_CENTER;
}