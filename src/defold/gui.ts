import { rgbToHex } from "@editor/modules/utils";
import { is_base_mesh } from "@editor/render_engine/helpers/utils";
import { GuiBox, GuiText } from "@editor/render_engine/objects/sub_types";
import { IBaseEntityAndThree, IObjectTypes } from "@editor/render_engine/types";
import { ObjectTypes } from "@editor/core/render/types";
import { Quaternion, Vector3 } from "three";
import { animate_logic, cancel_animations_logic, hex2rgba, PLAYBACK_LOOP_BACKWARD, PLAYBACK_LOOP_FORWARD, PLAYBACK_ONCE_BACKWARD, PLAYBACK_ONCE_FORWARD, PLAYBACK_ONCE_PINGPONG, PLAYBACK_LOOP_PINGPONG, EASING_LINEAR, EASING_INQUART, EASING_INQUAD, EASING_OUTQUART, EASING_OUTQUAD, EASING_OUTQUINT, EASING_INOUTQUAD, EASING_INQUINT, EASING_INOUTQUART, EASING_INOUTQUINT, EASING_OUTCUBIC, EASING_INOUTCUBIC, EASING_OUTSINE, EASING_INSINE, EASING_INCUBIC, EASING_INOUTSINE, EASING_OUTCIRC, EASING_INOUTCIRC, EASING_INOUTEXPO, EASING_INCIRC, EASING_OUTBACK, EASING_INBACK, EASING_INOUTELASTIC, EASING_INOUTBACK, EASING_INEXPO, EASING_OUTEXPO, EASING_INELASTIC, EASING_OUTELASTIC, EASING_INBOUNCE, EASING_OUTBOUNCE, EASING_INOUTBOUNCE, get_nested_property, set_nested_property, convert_defold_blend_mode_to_threejs, convert_threejs_blend_mode_to_defold, convert_defold_pivot_to_threejs, convert_threejs_pivot_to_defold, generate_unique_name, make_names_unique } from "./utils";
import { Services } from '@editor/core';

declare global {
    namespace gui {
        export function new_box_node(pos: vmath.vector3, size: vmath.vector3): string
        export function new_text_node(pos: vmath.vector3, text: string): string
        export function set(node: node, property: string, value: any, options?: any): void
        export function set_alpha(node: node, alpha: number): void
        export function set_blend_mode(node: node, blend_mode: any): void
        export function set_clipping_mode(node: node, mode: any): void
        export function set_clipping_inverted(node: node, inverted: boolean): void
        export function set_clipping_visible(node: node, visible: boolean): void
        export function set_color(node: node, color: vmath.vector4): void
        export function set_euler(node: node, euler: vmath.vector3): void
        export function set_leading(node: node, leading: number): void
        export function set_parent(node: node, parent: node, keep_scene_transform?: boolean): void
        export function set_pivot(node: node, pivot: any): void
        export function set_position(node: node, position: vmath.vector3): void
        export function set_rotation(node: node, rotation: vmath.quaternion): void
        export function set_size(node: node, size: vmath.vector3): void
        export function set_slice9(node: node, slice9: vmath.vector4): void
        export function set_text(node: node, text: string | number): void
        export function set_texture(node: node, texture: string): void
        export function get(node: node, property: string, options?: any): any
        export function get_node(id: string): node
        export function get_type(node: node): any
        export function get_parent(node: node): node
        export function get_position(node: node): vmath.vector3
        export function get_rotation(node: node): vmath.quaternion
        export function get_scale(node: node): vmath.vector3
        export function get_size(node: node): vmath.vector3
        export function get_slice9(node: node): vmath.vector4
        export function get_text(node: node): string
        export function get_pivot(node: node): any
        export function get_alpha(node: node): number
        export function get_blend_mode(node: node): any
        export function get_clipping_mode(node: node): any
        export function get_clipping_inverted(node: node): boolean
        export function get_clipping_visible(node: node): boolean
        export function get_color(node: node): vmath.vector4
        export function get_euler(node: node): vmath.vector3
        export function get_leading(node: node): number
        export function clone(node: node): node
        export function clone_tree(node: node): node
        export function delete_node(node: node): void
        export function animate(node: node, property: string, playback: any, to: number | vmath.vector3 | vmath.quaternion, easing: any, duration: number, delay?: number, complete_function?: (self: IBaseEntityAndThree, node: node, property: string) => void): void
        export function cancel_animations(node: node, property?: string): void

        export const TYPE_BOX: any;
        export const TYPE_TEXT: any;

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
    const TYPE_BOX = 0;
    const TYPE_TEXT = 1;

    const PIVOT_CENTER = 0;
    const PIVOT_N = 1;
    const PIVOT_NE = 2;
    const PIVOT_E = 3;
    const PIVOT_SE = 4;
    const PIVOT_S = 5;
    const PIVOT_SW = 6;
    const PIVOT_W = 7;
    const PIVOT_NW = 8;

    const CLIPPING_MODE_NONE = 0;
    const CLIPPING_MODE_STENCIL = 1;

    const BLEND_ALPHA = 0;
    const BLEND_ADD = 1;
    const BLEND_ADD_ALPHA = 2;
    const BLEND_MULT = 3;
    const BLEND_SCREEN = 4;

    function new_box_node(pos: vmath.vector3, size: vmath.vector3) {
        const gui_box = Services.scene.create(ObjectTypes.GUI_BOX, {
            width: size.x,
            height: size.y,
        }) as GuiBox;
        gui_box.set_position(pos.x, pos.y);
        return { id: gui_box.mesh_data.id } as node;
    }

    function new_text_node(pos: vmath.vector3, text: string) {
        const gui_text = Services.scene.create(ObjectTypes.GUI_TEXT, { text }) as GuiText;
        gui_text.set_position(pos.x, pos.y);
        return { id: gui_text.mesh_data.id } as node;
    }

    function set(node: node, property: string, value: any, _options?: any) {
        const mesh = Services.scene.get_by_id((node as any).id);
        if (!mesh) {
            Services.logger.error('[set] Mesh not found for id:', (node as any).id);
            return;
        }
        const is_gui_type = mesh.type == IObjectTypes.GUI_BOX || mesh.type == IObjectTypes.GUI_TEXT;
        if (['position', 'rotation', 'scale', 'euler.z'].includes(property) && !is_gui_type) {
            Services.logger.error('[set] Mesh with id', (node as any).id, 'is not gui property:', property);
            return;
        }
        set_nested_property(mesh, property, value);
    }

    function set_alpha(node: node, alpha: number) {
        const mesh = Services.scene.get_by_id((node as any).id);
        if (!mesh || !(mesh instanceof GuiBox || mesh instanceof GuiText)) {
            Services.logger.error('[set_alpha] Mesh not found for id:', (node as any).id);
            return;
        }
        mesh.set_alpha(alpha);
    }

    function set_blend_mode(node: node, blend_mode: any) {
        const mesh = Services.scene.get_by_id((node as any).id);
        if (!mesh) {
            Services.logger.error('[set_blend_mode] Mesh not found for id:', (node as any).id);
            return;
        }
        if (mesh instanceof GuiBox) mesh.material.blending = blend_mode;
        const three_blend_mode = convert_defold_blend_mode_to_threejs(blend_mode);

        if (mesh instanceof GuiBox) mesh.material.blending = three_blend_mode;
        else if (mesh instanceof GuiText && mesh.material) mesh.material.blending = blend_mode;
    }

    function set_clipping_mode(node: node, mode: any) {
        const mesh = Services.scene.get_by_id((node as any).id);
        if (!mesh || !(mesh instanceof GuiBox)) {
            Services.logger.error('[set_clipping_mode] Mesh not found for id:', (node as any).id);
            return;
        }
        if (mode == CLIPPING_MODE_NONE) mesh.disableClipping();
        else mesh.enableClipping(false, mode);
    }

    function set_clipping_inverted(node: node, inverted: boolean) {
        const mesh = Services.scene.get_by_id((node as any).id);
        if (!mesh || !(mesh instanceof GuiBox)) {
            Services.logger.error('[set_clipping_inverted] Mesh not found for id:', (node as any).id);
            return;
        }
        if (!mesh.isClippingEnabled()) {
            Services.logger.warn('[set_clipping_inverted] Clipping is not enabled for id:', (node as any).id);
            return;
        }
        mesh.enableClipping(inverted);
    }

    function set_clipping_visible(node: node, visible: boolean) {
        const mesh = Services.scene.get_by_id((node as any).id);
        if (!mesh || !(mesh instanceof GuiBox)) {
            Services.logger.error('[set_clipping_visible] Mesh not found for id:', (node as any).id);
            return;
        }
        if (!mesh.isClippingEnabled()) {
            Services.logger.warn('[set_clipping_visible] Clipping is not enabled for id:', (node as any).id);
            return;
        }
        mesh.enableClipping(false, visible);
    }

    function set_color(node: node, color: vmath.vector4) {
        const mesh = Services.scene.get_by_id((node as any).id);
        if (!mesh || !(mesh instanceof GuiBox || mesh instanceof GuiText)) {
            Services.logger.error('[set_color] Mesh not found for id:', (node as any).id);
            return;
        }
        mesh.set_color(rgbToHex(new Vector3(color.x, color.y, color.z)));
    }

    function set_euler(node: node, euler: vmath.vector3) {
        const mesh = Services.scene.get_by_id((node as any).id);
        if (!mesh || !(mesh instanceof GuiBox || mesh instanceof GuiText)) {
            Services.logger.error('[set_euler] Mesh not found for id:', (node as any).id);
            return;
        }
        mesh.rotation.set(euler.x, euler.y, euler.z);
    }

    function set_leading(node: node, leading: number) {
        const mesh = Services.scene.get_by_id((node as any).id);
        if (!mesh || !(mesh instanceof GuiText)) {
            Services.logger.error('[set_leading] Mesh not found for id:', (node as any).id);
            return;
        }
        mesh.lineHeight = leading;
    }

    function set_parent(node: node, parent: node, _keep_scene_transform?: boolean) {
        const mesh = Services.scene.get_by_id((node as any).id);
        if (!mesh) {
            Services.logger.error('[set_parent] Mesh not found for id:', (node as any).id);
            return;
        }
        const parent_mesh = Services.scene.get_by_id((parent as any).id);
        if (!parent_mesh) {
            Services.logger.error('[set_parent] Parent mesh not found for id:', (parent as any).id);
            return;
        }
        mesh.parent = parent_mesh;
    }

    function set_pivot(node: node, pivot: any) {
        const mesh = Services.scene.get_by_id((node as any).id);
        if (!mesh || !(mesh instanceof GuiBox || mesh instanceof GuiText)) {
            Services.logger.error('[set_pivot] Mesh not found for id:', (node as any).id);
            return;
        }
        const [pivot_x, pivot_y] = convert_defold_pivot_to_threejs(pivot);
        mesh.set_pivot(pivot_x, pivot_y);
    }

    function set_position(node: node, position: vmath.vector3) {
        const mesh = Services.scene.get_by_id((node as any).id);
        if (!mesh || !(mesh instanceof GuiBox || mesh instanceof GuiText)) {
            Services.logger.error('[set_position] Mesh not found for id:', (node as any).id);
            return;
        }
        mesh.position.set(position.x, position.y, position.z);
    }

    function set_rotation(node: node, rotation: vmath.quaternion) {
        const mesh = Services.scene.get_by_id((node as any).id);
        if (!mesh || !(mesh instanceof GuiBox || mesh instanceof GuiText)) {
            Services.logger.error('[set_rotation] Mesh not found for id:', (node as any).id);
            return;
        }
        mesh.setRotationFromQuaternion(new Quaternion(rotation.x, rotation.y, rotation.z, rotation.w));
    }

    function set_size(node: node, size: vmath.vector3) {
        const mesh = Services.scene.get_by_id((node as any).id);
        if (!mesh || !(mesh instanceof GuiBox || mesh instanceof GuiText)) {
            Services.logger.error('[set_size] Mesh not found for id:', (node as any).id);
            return;
        }
        mesh.set_size(size.x, size.y);
    }

    function set_slice9(node: node, slice9: vmath.vector4) {
        const mesh = Services.scene.get_by_id((node as any).id);
        if (!mesh || !(mesh instanceof GuiBox)) {
            Services.logger.error('[set_slice9] Mesh not found for id:', (node as any).id);
            return;
        }
        mesh.set_slice(slice9.x, slice9.y);
    }

    function set_text(node: node, text: string | number) {
        const mesh = Services.scene.get_by_id((node as any).id);
        if (!mesh || !(mesh instanceof GuiText)) {
            Services.logger.error('[set_text] Mesh not found for id:', (node as any).id);
            return;
        }
        mesh.set_text(text.toString());
    }

    // NOTE: сдесь хотим передавать atlas/texture_name ?
    function set_texture(node: node, texture: string) {
        const mesh = Services.scene.get_by_id((node as any).id);
        if (!mesh || !(mesh instanceof GuiBox)) {
            Services.logger.error('[set_texture] Mesh not found for id:', (node as any).id);
            return;
        }
        const [atlas, texture_name] = texture.split('/');
        mesh.set_texture(texture_name, atlas);
    }

    function get(node: node, property: string, _options?: any) {
        const mesh = Services.scene.get_by_id((node as any).id);
        if (!mesh) {
            Services.logger.error('[get] Mesh not found for id:', (node as any).id);
            return null;
        }
        return get_nested_property(mesh, property);
    }

    function get_node(id: string) {
        const mesh = Services.scene.get_by_name(id);
        if (!mesh) {
            Services.logger.error('[get_node] Mesh not found for id:', id);
            return;
        }
        return { id: mesh.mesh_data.id } as node;
    }

    function get_type(node: node) {
        const mesh = Services.scene.get_by_id((node as any).id);
        if (!mesh) {
            Services.logger.error('[get_type] Mesh not found for id:', (node as any).id);
            return;
        }
        if (mesh.type != IObjectTypes.GUI_BOX && mesh.type != IObjectTypes.GUI_TEXT) {
            Services.logger.error('[get_type] Wrong/Unsupported mesh type:', (node as any).id);
            return;
        }
        return mesh.type == IObjectTypes.GUI_BOX ? TYPE_BOX : TYPE_TEXT;
    }

    function get_parent(node: node) {
        const mesh = Services.scene.get_by_id((node as any).id);
        if (!mesh) {
            Services.logger.error('[get_parent] Mesh not found for id:', (node as any).id);
            return;
        }
        if (!mesh.parent || !is_base_mesh(mesh.parent)) {
            Services.logger.error('[get_parent] Parent mesh not found for id:', (node as any).id);
            return;
        }
        return { id: (mesh.parent as any).mesh_data.id } as node;
    }

    function get_position(node: node) {
        const mesh = Services.scene.get_by_id((node as any).id);
        if (!mesh) {
            Services.logger.error('[get_position] Mesh not found for id:', (node as any).id);
            return;
        }
        return vmath.vector3(mesh.position.x, mesh.position.y, mesh.position.z);
    }

    function get_rotation(node: node) {
        const mesh = Services.scene.get_by_id((node as any).id);
        if (!mesh) {
            Services.logger.error('[get_rotation] Mesh not found for id:', (node as any).id);
            return;
        }
        return vmath.vector4(mesh.quaternion.x, mesh.quaternion.y, mesh.quaternion.z, mesh.quaternion.w);
    }

    function get_scale(node: node) {
        const mesh = Services.scene.get_by_id((node as any).id);
        if (!mesh) {
            Services.logger.error('[get_scale] Mesh not found for id:', (node as any).id);
            return;
        }
        return vmath.vector3(mesh.scale.x, mesh.scale.y, mesh.scale.z);
    }

    function get_size(node: node) {
        const mesh = Services.scene.get_by_id((node as any).id);
        if (!mesh || !(mesh instanceof GuiBox || mesh instanceof GuiText)) {
            Services.logger.error('[get_size] Mesh not found for id:', (node as any).id);
            return;
        }
        return vmath.vector3(mesh.get_size().x, mesh.get_size().y, 0);
    }

    function get_slice9(node: node) {
        const mesh = Services.scene.get_by_id((node as any).id);
        if (!mesh || !(mesh instanceof GuiBox)) {
            Services.logger.error('[get_slice9] Mesh not found for id:', (node as any).id);
            return;
        }
        return vmath.vector4(mesh.get_slice().x, mesh.get_slice().y, 0, 0);
    }

    function get_text(node: node) {
        const mesh = Services.scene.get_by_id((node as any).id);
        if (!mesh || !(mesh instanceof GuiText)) {
            Services.logger.error('[get_text] Mesh not found for id:', (node as any).id);
            return;
        }
        return mesh.text;
    }

    function get_pivot(node: node) {
        const mesh = Services.scene.get_by_id((node as any).id);
        if (!mesh || !(mesh instanceof GuiBox || mesh instanceof GuiText)) {
            Services.logger.error('[get_pivot] Mesh not found for id:', (node as any).id);
            return;
        }
        const [pivot_x, pivot_y] = mesh.get_pivot();
        return convert_threejs_pivot_to_defold(pivot_x, pivot_y);
    }

    function get_alpha(node: node) {
        const mesh = Services.scene.get_by_id((node as any).id);
        if (!mesh || !(mesh instanceof GuiBox || mesh instanceof GuiText)) {
            Services.logger.error('[get_alpha] Mesh not found for id:', (node as any).id);
            return;
        }
        return mesh.get_alpha();
    }

    function get_blend_mode(node: node) {
        const mesh = Services.scene.get_by_id((node as any).id);
        if (!mesh || !(mesh instanceof GuiBox || mesh instanceof GuiText) || !mesh.material) {
            Services.logger.error('[get_blend_mode] Mesh not found for id:', (node as any).id);
            return;
        }
        return convert_threejs_blend_mode_to_defold(mesh.material.blending);
    }

    function get_clipping_mode(node: node) {
        const mesh = Services.scene.get_by_id((node as any).id);
        if (!mesh || !(mesh instanceof GuiBox)) {
            Services.logger.error('[get_clipping_mode] Mesh not found for id:', (node as any).id);
            return;
        }
        return mesh.isClippingEnabled() ? CLIPPING_MODE_STENCIL : CLIPPING_MODE_NONE;
    }

    function get_clipping_inverted(node: node) {
        const mesh = Services.scene.get_by_id((node as any).id);
        if (!mesh || !(mesh instanceof GuiBox)) {
            Services.logger.error('[get_clipping_inverted] Mesh not found for id:', (node as any).id);
            return;
        }
        return mesh.isInvertedClipping();
    }

    function get_clipping_visible(node: node) {
        const mesh = Services.scene.get_by_id((node as any).id);
        if (!mesh || !(mesh instanceof GuiBox)) {
            Services.logger.error('[get_clipping_visible] Mesh not found for id:', (node as any).id);
            return;
        }
        return mesh.isClippingVisible();
    }

    function get_color(node: node) {
        const mesh = Services.scene.get_by_id((node as any).id);
        if (!mesh || !(mesh instanceof GuiBox || mesh instanceof GuiText)) {
            Services.logger.error('[get_color] Mesh not found for id:', (node as any).id);
            return;
        }
        return hex2rgba(mesh.get_color());
    }

    function get_euler(node: node) {
        const mesh = Services.scene.get_by_id((node as any).id);
        if (!mesh || !(mesh instanceof GuiBox || mesh instanceof GuiText)) {
            Services.logger.error('[get_euler] Mesh not found for id:', (node as any).id);
            return;
        }
        return vmath.vector3(mesh.rotation.x, mesh.rotation.y, mesh.rotation.z);
    }

    function delete_node(node: node) {
        Services.scene.remove_by_id((node as any).id);
    }

    function get_leading(node: node) {
        const mesh = Services.scene.get_by_id((node as any).id);
        if (!mesh || !(mesh instanceof GuiText)) {
            Services.logger.error('[get_leading] Mesh not found for id:', (node as any).id);
            return;
        }
        return mesh.lineHeight;
    }

    function clone(node: node) {
        const mesh = Services.scene.get_by_id((node as any).id);
        if (!mesh) {
            Services.logger.error('[clone] Mesh not found for id:', (node as any).id);
            return;
        }
        const parent = mesh.parent ?? Services.render.scene;
        const origin = Services.scene.serialize_object(mesh as IBaseEntityAndThree, false, true);
        origin.name = generate_unique_name(origin.name);
        const cloned = Services.scene.deserialize_object(origin, false);
        parent.add(cloned);
        return { id: cloned.mesh_data.id } as node;
    }

    function clone_tree(node: node) {
        const mesh = Services.scene.get_by_id((node as any).id);
        if (!mesh) {
            Services.logger.error('[clone] Mesh not found for id:', (node as any).id);
            return;
        }
        const parent = mesh.parent ?? Services.render.scene;
        const origin = Services.scene.serialize_object(mesh as IBaseEntityAndThree);
        make_names_unique(origin);
        const cloned = Services.scene.deserialize_object(origin, false);
        parent.add(cloned);
        return { id: cloned.mesh_data.id } as node;
    }

    function animate(
        node: node,
        property: string,
        playback: any,
        to: number | vmath.vector3 | vmath.quaternion,
        easing: any,
        duration: number,
        delay?: number,
        complete_function?: (self: IBaseEntityAndThree, node: node, property: string) => void
    ) {
        const mesh = Services.scene.get_by_id((node as any).id);
        if (!mesh) {
            Services.logger.error('[animate] Mesh not found for id:', (node as any).id);
            return;
        }
        animate_logic(mesh as IBaseEntityAndThree, property, playback, to, easing, duration, delay, () => {
            if (complete_function) complete_function(mesh as IBaseEntityAndThree, node, property);
        });
    }

    function cancel_animations(node: node, property?: string) {
        const mesh = Services.scene.get_by_id((node as any).id);
        if (!mesh) {
            Services.logger.error('[cancel_animations] Mesh not found for id:', (node as any).id);
            return;
        }
        cancel_animations_logic(mesh as IBaseEntityAndThree, property);
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
        set_parent,
        set_pivot,
        set_position,
        set_rotation,
        set_size,
        set_slice9,
        set_text,
        set_texture,
        get,
        get_node,
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
        get_blend_mode,
        get_clipping_mode,
        get_clipping_inverted,
        get_clipping_visible,
        get_color,
        get_euler,
        delete_node,
        get_leading,
        clone,
        clone_tree,
        animate,
        cancel_animations,

        TYPE_BOX,
        TYPE_TEXT,

        PIVOT_CENTER,
        PIVOT_N,
        PIVOT_NE,
        PIVOT_E,
        PIVOT_SE,
        PIVOT_S,
        PIVOT_SW,
        PIVOT_W,
        PIVOT_NW,

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