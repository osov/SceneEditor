import { Slice9Mesh } from "@editor/render_engine/objects/slice9";
import { IBaseEntityAndThree } from "@editor/render_engine/types";
import { AdditiveBlending, Color, CustomBlending, MultiplyBlending, NoColorSpace, NormalBlending } from "three";
import * as TWEEN from '@tweenjs/tween.js';
import { Services } from '@editor/core';
import { get_tween_manager } from '@editor/render_engine/tween_manager';


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
        Services.logger.error('hex not correct:' + hex);
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

export function get_nested_property(obj: IBaseEntityAndThree, path: string): unknown {
    const parts = path.split('.');
    // Приводим к типу с методами mesh
    const mesh = obj as IBaseEntityAndThree & {
        get_size?: () => { x: number; y: number };
        get_color?: () => string;
        get_alpha?: () => number;
    };
    if (path == 'size' && mesh.get_size !== undefined) {
        return mesh.get_size();
    }
    if (path == 'euler.z') {
        return obj.rotation.z;
    }
    if (path == 'tint' && mesh.get_color !== undefined && mesh.get_alpha !== undefined) {
        const clr = new Color().setStyle(mesh.get_color(), NoColorSpace);
        const v = vmath.vector4(clr.r, clr.g, clr.b, mesh.get_alpha());
        return v;
    }
    if ((path == 'tint.w' || path == 'alpha') && mesh.get_alpha !== undefined) {
        return mesh.get_alpha();
    }
    // Для доступа к вложенным свойствам используем Record
    let current: Record<string, unknown> = obj as unknown as Record<string, unknown>;
    for (const part of parts) {
        if (current === undefined || current === null) {
            Services.logger.error(`get_nested_property: ${path} not found`, obj);
            return undefined;
        }
        current = current[part] as Record<string, unknown>;
    }
    if (current == undefined)
        Services.logger.error(`get_nested_property: ${path} not found`, obj);
    return current;
}

export function set_nested_property(obj: IBaseEntityAndThree, path: string, value: unknown): void {
    // Приводим к типу с методами mesh
    const mesh = obj as IBaseEntityAndThree & {
        set_size?: (w: number, h: number) => void;
        set_color?: (hex: string) => void;
        set_alpha?: (v: number) => void;
    };
    if (path == 'size' && mesh.set_size !== undefined) {
        const v = value as { x: number; y: number };
        mesh.set_size(v.x, v.y);
        return;
    }
    if (path == 'tint' && mesh.set_color !== undefined) {
        const v = value as vmath.vector4;
        mesh.set_color(rgb2hex(v));
        if (v.w !== undefined && mesh.set_alpha !== undefined)
            mesh.set_alpha(v.w);
        return;
    }
    if ((path == 'tint.w' || path == 'alpha') && mesh.set_alpha !== undefined) {
        mesh.set_alpha(value as number);
        return;
    }
    if (path == 'euler.z') {
        obj.rotation.z = value as number;
        return;
    }
    // Для доступа к вложенным свойствам используем Record
    const parts = path.split('.');
    let current: Record<string, unknown> = obj as unknown as Record<string, unknown>;
    for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (current[part] === undefined || current[part] === null) {
            current[part] = {};
        }
        current = current[part] as Record<string, unknown>;
    }
    current[parts[parts.length - 1]] = value;
}

// === Константы режимов воспроизведения ===
export const PLAYBACK_ONCE_FORWARD = 0 as const;
export const PLAYBACK_ONCE_BACKWARD = 1 as const;
export const PLAYBACK_ONCE_PINGPONG = 2 as const;
export const PLAYBACK_LOOP_FORWARD = 3 as const;
export const PLAYBACK_LOOP_BACKWARD = 4 as const;
export const PLAYBACK_LOOP_PINGPONG = 5 as const;

/** Тип режима воспроизведения анимации */
export type PlaybackMode =
    | typeof PLAYBACK_ONCE_FORWARD
    | typeof PLAYBACK_ONCE_BACKWARD
    | typeof PLAYBACK_ONCE_PINGPONG
    | typeof PLAYBACK_LOOP_FORWARD
    | typeof PLAYBACK_LOOP_BACKWARD
    | typeof PLAYBACK_LOOP_PINGPONG;

// === Константы функций плавности ===
export const EASING_LINEAR = 0 as const;
export const EASING_INQUAD = 1 as const;
export const EASING_OUTQUAD = 2 as const;
export const EASING_INOUTQUAD = 3 as const;
export const EASING_INCUBIC = 4 as const;
export const EASING_OUTCUBIC = 5 as const;
export const EASING_INOUTCUBIC = 6 as const;
export const EASING_INQUART = 7 as const;
export const EASING_OUTQUART = 8 as const;
export const EASING_INOUTQUART = 9 as const;
export const EASING_INQUINT = 10 as const;
export const EASING_OUTQUINT = 11 as const;
export const EASING_INOUTQUINT = 12 as const;
export const EASING_INSINE = 13 as const;
export const EASING_OUTSINE = 14 as const;
export const EASING_INOUTSINE = 15 as const;
export const EASING_INEXPO = 16 as const;
export const EASING_OUTEXPO = 17 as const;
export const EASING_INOUTEXPO = 18 as const;
export const EASING_INCIRC = 19 as const;
export const EASING_OUTCIRC = 20 as const;
export const EASING_INOUTCIRC = 21 as const;
export const EASING_INELASTIC = 22 as const;
export const EASING_OUTELASTIC = 23 as const;
export const EASING_INOUTELASTIC = 24 as const;
export const EASING_INBACK = 25 as const;
export const EASING_OUTBACK = 26 as const;
export const EASING_INOUTBACK = 27 as const;
export const EASING_INBOUNCE = 28 as const;
export const EASING_OUTBOUNCE = 29 as const;
export const EASING_INOUTBOUNCE = 30 as const;

/** Тип функции плавности анимации */
export type EasingType =
    | typeof EASING_LINEAR
    | typeof EASING_INQUAD
    | typeof EASING_OUTQUAD
    | typeof EASING_INOUTQUAD
    | typeof EASING_INCUBIC
    | typeof EASING_OUTCUBIC
    | typeof EASING_INOUTCUBIC
    | typeof EASING_INQUART
    | typeof EASING_OUTQUART
    | typeof EASING_INOUTQUART
    | typeof EASING_INQUINT
    | typeof EASING_OUTQUINT
    | typeof EASING_INOUTQUINT
    | typeof EASING_INSINE
    | typeof EASING_OUTSINE
    | typeof EASING_INOUTSINE
    | typeof EASING_INEXPO
    | typeof EASING_OUTEXPO
    | typeof EASING_INOUTEXPO
    | typeof EASING_INCIRC
    | typeof EASING_OUTCIRC
    | typeof EASING_INOUTCIRC
    | typeof EASING_INELASTIC
    | typeof EASING_OUTELASTIC
    | typeof EASING_INOUTELASTIC
    | typeof EASING_INBACK
    | typeof EASING_OUTBACK
    | typeof EASING_INOUTBACK
    | typeof EASING_INBOUNCE
    | typeof EASING_OUTBOUNCE
    | typeof EASING_INOUTBOUNCE;

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

function applyPlayback(tween: TWEEN.Tween, playback: PlaybackMode) {
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
    playback: PlaybackMode,
    to: number | vmath.vector3 | vmath.quaternion,
    easing: EasingType,
    duration: number,
    delay: number = 0,
    complete_function?: () => void
) {
    if (property == 'tint.w')
        property = 'alpha';

    cancel_animations_logic(mesh, property);

    let is_material_property = false;
    let currentValue = get_nested_property(mesh, property);
    if (currentValue == undefined) {
        is_material_property = true;
        const material = (mesh as unknown as { material?: { uniforms?: Record<string, { value: unknown }> } }).material;
        if (material !== undefined && material.uniforms !== undefined) currentValue = material.uniforms[property]?.value;
        if (currentValue == undefined) {
            Services.logger.error(`Property ${property} not found on mesh`);
            return;
        }
    }

    const is_backward = playback == PLAYBACK_ONCE_BACKWARD || playback == PLAYBACK_LOOP_BACKWARD;

    // NOTE: спецально хак логика так как 'yoyo' сломан https://github.com/tweenjs/tween.js/issues/677
    if (playback == PLAYBACK_LOOP_PINGPONG) {
        const obj = { value: currentValue };

        function forwardTween() {
            const forward_tween = new TWEEN.Tween(obj)
                .to({ value: to }, duration * 1000)
                .onUpdate(() => {
                    if (is_material_property) {
                        Services.resources.set_material_uniform_for_mesh(mesh as Slice9Mesh, property, obj.value);
                        return;
                    }
                    set_nested_property(mesh, property, obj.value);
                })
                .delay(delay * 1000)
                .easing(EASING_MAP[easing] ?? TWEEN.Easing.Linear.None)
                .onComplete(() => {
                    backwardTween();
                });
            applyPlayback(forward_tween, PLAYBACK_ONCE_FORWARD);
            get_tween_manager().set_mesh_property_tween(mesh.mesh_data.id, property, forward_tween);
            forward_tween.start();

        }

        function backwardTween() {
            const backward_tween = new TWEEN.Tween(obj)
                .to({ value: currentValue }, duration * 1000)
                .onUpdate(() => {
                    if (is_material_property) {
                        Services.resources.set_material_uniform_for_mesh(mesh as Slice9Mesh, property, obj.value);
                        return;
                    }
                    set_nested_property(mesh, property, obj.value);
                })
                .delay(delay * 1000)
                .easing(EASING_MAP[easing] ?? TWEEN.Easing.Linear.None)
                .onComplete(() => {
                    forwardTween();
                });
            applyPlayback(backward_tween, PLAYBACK_ONCE_FORWARD);
            get_tween_manager().set_mesh_property_tween(mesh.mesh_data.id, property, backward_tween);
            backward_tween.start();
        }

        forwardTween();
        return;
    }

    const obj = { value: is_backward ? to : currentValue };
    const tween = new TWEEN.Tween(obj)
        .to({ value: is_backward ? currentValue : to }, duration * 1000)
        .onUpdate(() => {
            if (is_material_property) {
                // FIXME: не будет ли ошибкой к примеру при установке для текста, он должен же менятся на прямую
                Services.resources.set_material_uniform_for_mesh(mesh as Slice9Mesh, property, obj.value);
                return;
            }
            set_nested_property(mesh, property, obj.value);
        })
        .delay(delay * 1000)
        .easing(EASING_MAP[easing] ?? TWEEN.Easing.Linear.None)
        .onComplete(() => {
            get_tween_manager().remove_mesh_property_tween(mesh.mesh_data.id, property);
            if (complete_function) complete_function();
        });
    applyPlayback(tween, playback);
    get_tween_manager().set_mesh_property_tween(mesh.mesh_data.id, property, tween);
    tween.start();
}

export function cancel_animations_logic(mesh: IBaseEntityAndThree, property?: string) {
    if (property == 'tint.w')
        property = 'alpha';
    if (property) get_tween_manager().remove_mesh_property_tween(mesh.mesh_data.id, property);
    else get_tween_manager().remove_all_mesh_properties_tweens(mesh.mesh_data.id);
}

export function uh_to_id(uh: string | hash): number {
    if (typeof uh !== 'string' && (uh as { id?: number }).id !== undefined) {
        return (uh as { id: number }).id;
    }
    return Services.scene.get_id_by_url(uh as string) ?? -1;
}

export function convert_defold_blend_mode_to_threejs(blend_mode: number) {
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

export function convert_threejs_blend_mode_to_defold(blend_mode: number) {
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

export function convert_defold_pivot_to_threejs(pivot: number) {
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

export function convert_threejs_pivot_to_defold(x: number, y: number): number {
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

export function generate_unique_name(baseName: string): string {
    let counter = 1;
    let uniqueName = baseName;
    while (Services.scene.get_by_name(uniqueName)) {
        uniqueName = `${baseName}_${counter}`;
        counter++;
    }
    return uniqueName;
}

/** Данные с именем и дочерними элементами */
interface NamedData {
    name: string;
    children?: NamedData[];
}

export function make_names_unique(data: NamedData): NamedData {
    data.name = generate_unique_name(data.name);
    if (data.children !== undefined && Array.isArray(data.children)) {
        for (const child of data.children) {
            make_names_unique(child);
        }
    }
    return data;
}