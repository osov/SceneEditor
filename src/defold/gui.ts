import { IBaseEntityAndThree } from "@editor/render_engine/types";

declare global {
    namespace gui {
        export function new_box_node(pos: vmath.vector3, size: vmath.vector3): string
        export function new_text_node(pos: vmath.vector3, text: string): string
        export function set(node: string, property: string, value: any, options?: any): void
        export function set_alpha(node: string, alpha: number): void
        export function set_blend_mode(node: string, blend_mode: any): void
        export function set_clipping_mode(node: string, mode: any): void
        export function set_clipping_inverted(node: string, inverted: boolean): void
        export function set_clipping_visible(node: string, visible: boolean): void
        export function set_color(node: string, color: vmath.vector4): void
        export function set_euler(node: string, euler: vmath.vector3): void
        export function set_leading(node: string, leading: number): void
        export function set_line_break(node: string, line_break: boolean): void
        export function set_parent(node: string, parent: string, keep_scene_transform?: boolean): void
        export function set_pivot(node: string, pivot: any): void
        export function set_position(node: string, position: vmath.vector3): void
        export function set_rotation(node: string, rotation: vmath.quaternion): void
        export function set_size(node: string, size: vmath.vector3): void
        export function set_slice9(node: string, slice9: vmath.vector4): void
        export function set_text(node: string, text: string | number): void
        export function set_texture(node: string, texture: string): void
        export function get(node: string, property: string, options?: any): any
        export function get_type(node: string): any
        export function get_parent(node: string): string
        export function get_position(node: string): vmath.vector3
        export function get_rotation(node: string): vmath.quaternion
        export function get_scale(node: string): vmath.vector3
        export function get_size(node: string): vmath.vector3
        export function get_slice9(node: string): vmath.vector4
        export function get_text(node: string): string
        export function get_pivot(node: string): any
        export function get_alpha(node: string): number
        export function get_adjust_mode(node: string): any
        export function get_blend_mode(node: string): any
        export function get_clipping_mode(node: string): any
        export function get_clipping_inverted(node: string): boolean
        export function get_clipping_visible(node: string): boolean
        export function get_color(node: string): vmath.vector4
        export function get_euler(node: string): vmath.vector3
        export function get_leading(node: string): number
        export function get_line_break(node: string): boolean
        export function clone(node: string): any
        export function clone_tree(node: string): any
        export function delete_node(node: string): void
        export function animate(node: string, property: string, playback: any, to: number | vmath.vector3 | vmath.quaternion, easing: any, duration: number, delay?: number, complete_function?: (self: IBaseEntityAndThree, node: string, property: string) => void): void
        export function cancel_animations(node: string, property?: string): void

        export const PIVOT_CENTER: any;
        export const PIVOT_N: any;
        export const PIVOT_NE: any;
        export const PIVOT_E: any;
        export const PIVOT_SE: any;
        export const PIVOT_S: any;
        export const PIVOT_SW: any;
        export const PIVOT_W: any;
        export const PIVOT_NW: any;

        export const ADJUST_FIT: any;
        export const ADJUST_ZOOM: any;
        export const ADJUST_STRETCH: any;

        export const CLIPPING_MODE_NONE: any;
        export const CLIPPING_MODE_STENCIL: any;

        export const BLEND_ALPHA: any;
        export const BLEND_ADD: any;
        export const BLEND_ADD_ALPHA: any;
        export const BLEND_MULT: any;
        export const BLEND_SCREEN: any;

        export const PLAYBACK_ONCE_FORWARD: any;
        export const PLAYBACK_ONCE_BACKWARD: any;
        export const PLAYBACK_ONCE_PINGPONG: any;
        export const PLAYBACK_LOOP_FORWARD: any;
        export const PLAYBACK_LOOP_BACKWARD: any;
        export const PLAYBACK_LOOP_PINGPONG: any;

        export const EASING_LINEAR: any;
        export const EASING_INQUAD: any;
        export const EASING_OUTQUAD: any;
        export const EASING_INOUTQUAD: any;
        export const EASING_INCUBIC: any;
        export const EASING_OUTCUBIC: any;
        export const EASING_INOUTCUBIC: any;
        export const EASING_INQUART: any;
        export const EASING_OUTQUART: any;
        export const EASING_INOUTQUART: any;
        export const EASING_INQUINT: any;
        export const EASING_OUTQUINT: any;
        export const EASING_INOUTQUINT: any;
        export const EASING_INSINE: any;
        export const EASING_OUTSINE: any;
        export const EASING_INOUTSINE: any;
        export const EASING_INEXPO: any;
        export const EASING_OUTEXPO: any;
        export const EASING_INOUTEXPO: any;
        export const EASING_INCIRC: any;
        export const EASING_OUTCIRC: any;
        export const EASING_INOUTCIRC: any;
        export const EASING_INELASTIC: any;
        export const EASING_OUTELASTIC: any;
        export const EASING_INOUTELASTIC: any;
        export const EASING_INBACK: any;
        export const EASING_OUTBACK: any;
        export const EASING_INOUTBACK: any;
        export const EASING_INBOUNCE: any;
        export const EASING_OUTBOUNCE: any;
        export const EASING_INOUTBOUNCE: any;
    }
}

export function gui_module() {
    const PIVOT_CENTER = 0;
    const PIVOT_N = 1;
    const PIVOT_NE = 2;
    const PIVOT_E = 3;
    const PIVOT_SE = 4;
    const PIVOT_S = 5;
    const PIVOT_SW = 6;
    const PIVOT_W = 7;
    const PIVOT_NW = 8;

    const ADJUST_FIT = 0;
    const ADJUST_ZOOM = 1;
    const ADJUST_STRETCH = 2;

    const CLIPPING_MODE_NONE = 0;
    const CLIPPING_MODE_STENCIL = 1;

    const BLEND_ALPHA = 0;
    const BLEND_ADD = 1;
    const BLEND_ADD_ALPHA = 2;
    const BLEND_MULT = 3;
    const BLEND_SCREEN = 4;

    const PLAYBACK_ONCE_FORWARD = 0;
    const PLAYBACK_ONCE_BACKWARD = 1;
    const PLAYBACK_ONCE_PINGPONG = 2;
    const PLAYBACK_LOOP_FORWARD = 3;
    const PLAYBACK_LOOP_BACKWARD = 4;
    const PLAYBACK_LOOP_PINGPONG = 5;

    const EASING_LINEAR = 0;
    const EASING_INQUAD = 1;
    const EASING_OUTQUAD = 2;
    const EASING_INOUTQUAD = 3;
    const EASING_INCUBIC = 4;
    const EASING_OUTCUBIC = 5;
    const EASING_INOUTCUBIC = 6;
    const EASING_INQUART = 7;
    const EASING_OUTQUART = 8;
    const EASING_INOUTQUART = 9;
    const EASING_INQUINT = 10;
    const EASING_OUTQUINT = 11;
    const EASING_INOUTQUINT = 12;
    const EASING_INSINE = 13;
    const EASING_OUTSINE = 14;
    const EASING_INOUTSINE = 15;
    const EASING_INEXPO = 16;
    const EASING_OUTEXPO = 17;
    const EASING_INOUTEXPO = 18;
    const EASING_INCIRC = 19;
    const EASING_OUTCIRC = 20;
    const EASING_INOUTCIRC = 21;
    const EASING_INELASTIC = 22;
    const EASING_OUTELASTIC = 23;
    const EASING_INOUTELASTIC = 24;
    const EASING_INBACK = 25;
    const EASING_OUTBACK = 26;
    const EASING_INOUTBACK = 27;
    const EASING_INBOUNCE = 28;
    const EASING_OUTBOUNCE = 29;
    const EASING_INOUTBOUNCE = 30;

    function new_box_node(pos: vmath.vector3, size: vmath.vector3) {
    }

    function new_text_node(pos: vmath.vector3, text: string) {
    }

    function set(node: string, property: string, value: any, options?: any) {
    }

    function set_alpha(node: string, alpha: number) {
    }

    function set_blend_mode(node: string, blend_mode: any) {
    }

    function set_clipping_inverted(node: string, inverted: boolean) {
    }

    function set_clipping_mode(node: string, mode: any) {
    }

    function set_clipping_visible(node: string, visible: boolean) {
    }

    function set_color(node: string, color: vmath.vector4) {
    }

    function set_euler(node: string, euler: vmath.vector3) {
    }

    function set_leading(node: string, leading: number) {
    }

    function set_line_break(node: string, line_break: boolean) {
    }

    function set_parent(node: string, parent: string, keep_scene_transform?: boolean) {
    }

    function set_pivot(node: string, pivot: any) {
    }

    function set_position(node: string, position: vmath.vector3) {
    }

    function set_rotation(node: string, rotation: vmath.quaternion) {
    }

    function set_size(node: string, size: vmath.vector3) {
    }

    function set_slice9(node: string, slice9: vmath.vector4) {
    }

    function set_text(node: string, text: string | number) {
    }

    function set_texture(node: string, texture: string) {
    }

    function get(node: string, property: string, options?: any) {
    }

    function get_type(node: string) {
    }

    function get_parent(node: string) {
    }

    function get_position(node: string) {
    }

    function get_rotation(node: string) {
    }

    function get_scale(node: string) {
    }

    function get_size(node: string) {
    }

    function get_slice9(node: string) {
    }

    function get_text(node: string) {
    }

    function get_pivot(node: string) {
    }

    function get_alpha(node: string) {
    }

    function get_adjust_mode(node: string) {
    }

    function get_blend_mode(node: string) {
    }

    function get_clipping_mode(node: string) {
    }

    function get_clipping_inverted(node: string) {
    }

    function get_clipping_visible(node: string) {
    }

    function get_color(node: string) {
    }

    function get_euler(node: string) {
    }

    function delete_node(node: string) {
    }

    function get_leading(node: string) {
    }

    function get_line_break(node: string) {
    }

    function clone(node: string) {
    }

    function clone_tree(node: string) {
    }

    function animate(node: string, property: string, playback: any, to: number | vmath.vector3 | vmath.quaternion, easing: any, duration: number, delay?: number, complete_function?: (self: IBaseEntityAndThree, node: string, property: string) => void) {
    }

    function cancel_animations(node: string, property?: string) {
    }

    return {
        new_box_node,
        new_text_node,
        set,
        set_alpha,
        set_blend_mode,
        set_clipping_inverted,
        set_clipping_mode,
        set_clipping_visible,
        set_color,
        set_euler,
        set_leading,
        set_line_break,
        set_parent,
        set_pivot,
        set_position,
        set_rotation,
        set_size,
        set_slice9,
        set_text,
        set_texture,
        get,
        get_type,
        get_parent,
        get_position,
        get_rotation,
        get_scale,
        get_size,
        get_slice9,
        get_text,
        get_pivot,
        get_alpha,
        get_adjust_mode,
        get_blend_mode,
        get_clipping_mode,
        get_clipping_inverted,
        get_clipping_visible,
        get_color,
        get_euler,
        delete_node,
        get_leading,
        get_line_break,
        clone,
        clone_tree,
        animate,
        cancel_animations,

        PIVOT_CENTER,
        PIVOT_N,
        PIVOT_NE,
        PIVOT_E,
        PIVOT_SE,
        PIVOT_S,
        PIVOT_SW,
        PIVOT_W,
        PIVOT_NW,

        ADJUST_FIT,
        ADJUST_ZOOM,
        ADJUST_STRETCH,

        CLIPPING_MODE_NONE,
        CLIPPING_MODE_STENCIL,

        BLEND_ALPHA,
        BLEND_ADD,
        BLEND_ADD_ALPHA,
        BLEND_MULT,
        BLEND_SCREEN,

        PLAYBACK_ONCE_FORWARD,
        PLAYBACK_ONCE_BACKWARD,
        PLAYBACK_ONCE_PINGPONG,
        PLAYBACK_LOOP_FORWARD,
        PLAYBACK_LOOP_BACKWARD,
        PLAYBACK_LOOP_PINGPONG,

        EASING_LINEAR,
        EASING_INQUAD,
        EASING_OUTQUAD,
        EASING_INOUTQUAD,
        EASING_INCUBIC,
        EASING_OUTCUBIC,
        EASING_INOUTCUBIC,
        EASING_INQUART,
        EASING_OUTQUART,
        EASING_INOUTQUART,
        EASING_INQUINT,
        EASING_OUTQUINT,
        EASING_INOUTQUINT,
        EASING_INSINE,
        EASING_OUTSINE,
        EASING_INOUTSINE,
        EASING_INEXPO,
        EASING_OUTEXPO,
        EASING_INOUTEXPO,
        EASING_INCIRC,
        EASING_OUTCIRC,
        EASING_INOUTCIRC,
        EASING_INELASTIC,
        EASING_OUTELASTIC,
        EASING_INOUTELASTIC,
        EASING_INBACK,
        EASING_OUTBACK,
        EASING_INOUTBACK,
        EASING_INBOUNCE,
        EASING_OUTBOUNCE,
        EASING_INOUTBOUNCE
    };
}