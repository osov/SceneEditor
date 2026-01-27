import { rgbToHex } from "@editor/modules/utils";
import { is_base_mesh } from "@editor/render_engine/helpers/utils";
import { GuiBox, GuiText } from "@editor/render_engine/objects/sub_types";
import { IBaseEntityAndThree, IObjectTypes } from "@editor/render_engine/types";
import { ObjectTypes } from "@editor/core/render/types";
import { Quaternion, Vector3 } from "three";
import {
    animate_logic, cancel_animations_logic, hex2rgba,
    PLAYBACK_LOOP_BACKWARD, PLAYBACK_LOOP_FORWARD, PLAYBACK_ONCE_BACKWARD,
    PLAYBACK_ONCE_FORWARD, PLAYBACK_ONCE_PINGPONG, PLAYBACK_LOOP_PINGPONG,
    EASING_LINEAR, EASING_INQUART, EASING_INQUAD, EASING_OUTQUART, EASING_OUTQUAD,
    EASING_OUTQUINT, EASING_INOUTQUAD, EASING_INQUINT, EASING_INOUTQUART,
    EASING_INOUTQUINT, EASING_OUTCUBIC, EASING_INOUTCUBIC, EASING_OUTSINE,
    EASING_INSINE, EASING_INCUBIC, EASING_INOUTSINE, EASING_OUTCIRC, EASING_INOUTCIRC,
    EASING_INOUTEXPO, EASING_INCIRC, EASING_OUTBACK, EASING_INBACK, EASING_INOUTELASTIC,
    EASING_INOUTBACK, EASING_INEXPO, EASING_OUTEXPO, EASING_INELASTIC, EASING_OUTELASTIC,
    EASING_INBOUNCE, EASING_OUTBOUNCE, EASING_INOUTBOUNCE,
    get_nested_property, set_nested_property,
    convert_defold_blend_mode_to_threejs, convert_threejs_blend_mode_to_defold,
    convert_defold_pivot_to_threejs, convert_threejs_pivot_to_defold,
    generate_unique_name, make_names_unique,
    type PlaybackMode, type EasingType
} from "./utils";
import { Services } from '@editor/core';

// === GUI типы ===

/** Тип GUI ноды (node содержит id меша) */
interface NodeWithId {
    id: number;
}

/** Константы типов GUI нод */
const GUI_TYPE_BOX = 0 as const;
const GUI_TYPE_TEXT = 1 as const;

/** Тип GUI ноды */
type GuiNodeType = typeof GUI_TYPE_BOX | typeof GUI_TYPE_TEXT;

/** Константы pivot */
const GUI_PIVOT_CENTER = 0 as const;
const GUI_PIVOT_N = 1 as const;
const GUI_PIVOT_NE = 2 as const;
const GUI_PIVOT_E = 3 as const;
const GUI_PIVOT_SE = 4 as const;
const GUI_PIVOT_S = 5 as const;
const GUI_PIVOT_SW = 6 as const;
const GUI_PIVOT_W = 7 as const;
const GUI_PIVOT_NW = 8 as const;

/** Тип pivot */
type PivotType =
    | typeof GUI_PIVOT_CENTER
    | typeof GUI_PIVOT_N
    | typeof GUI_PIVOT_NE
    | typeof GUI_PIVOT_E
    | typeof GUI_PIVOT_SE
    | typeof GUI_PIVOT_S
    | typeof GUI_PIVOT_SW
    | typeof GUI_PIVOT_W
    | typeof GUI_PIVOT_NW;

/** Константы clipping mode */
const GUI_CLIPPING_MODE_NONE = 0 as const;
const GUI_CLIPPING_MODE_STENCIL = 1 as const;

/** Тип clipping mode */
type ClippingMode = typeof GUI_CLIPPING_MODE_NONE | typeof GUI_CLIPPING_MODE_STENCIL;

/** Константы blend mode */
const GUI_BLEND_ALPHA = 0 as const;
const GUI_BLEND_ADD = 1 as const;
const GUI_BLEND_ADD_ALPHA = 2 as const;
const GUI_BLEND_MULT = 3 as const;
const GUI_BLEND_SCREEN = 4 as const;

/** Тип blend mode */
type BlendMode =
    | typeof GUI_BLEND_ALPHA
    | typeof GUI_BLEND_ADD
    | typeof GUI_BLEND_ADD_ALPHA
    | typeof GUI_BLEND_MULT
    | typeof GUI_BLEND_SCREEN;

/** Константы adjust mode */
const GUI_ADJUST_FIT = 0 as const;
const GUI_ADJUST_ZOOM = 1 as const;
const GUI_ADJUST_STRETCH = 2 as const;

/** Тип adjust mode */
type AdjustMode = typeof GUI_ADJUST_FIT | typeof GUI_ADJUST_ZOOM | typeof GUI_ADJUST_STRETCH;

declare global {
    namespace gui {
        export function new_box_node(pos: vmath.vector3, size: vmath.vector3): string
        export function new_text_node(pos: vmath.vector3, text: string): string
        export function set(node: node, property: string, value: unknown): void
        export function set_alpha(node: node, alpha: number): void
        export function set_blend_mode(node: node, blend_mode: BlendMode): void
        export function set_clipping_mode(node: node, mode: ClippingMode): void
        export function set_clipping_inverted(node: node, inverted: boolean): void
        export function set_clipping_visible(node: node, visible: boolean): void
        export function set_color(node: node, color: vmath.vector4): void
        export function set_euler(node: node, euler: vmath.vector3): void
        export function set_leading(node: node, leading: number): void
        export function set_parent(node: node, parent: node, keep_scene_transform?: boolean): void
        export function set_pivot(node: node, pivot: PivotType): void
        export function set_position(node: node, position: vmath.vector3): void
        export function set_rotation(node: node, rotation: vmath.quaternion): void
        export function set_size(node: node, size: vmath.vector3): void
        export function set_slice9(node: node, slice9: vmath.vector4): void
        export function set_text(node: node, text: string | number): void
        export function set_texture(node: node, texture: string): void
        export function get(node: node, property: string): unknown
        export function get_node(id: string): node
        export function get_type(node: node): GuiNodeType
        export function get_parent(node: node): node
        export function get_position(node: node): vmath.vector3
        export function get_rotation(node: node): vmath.quaternion
        export function get_scale(node: node): vmath.vector3
        export function get_size(node: node): vmath.vector3
        export function get_slice9(node: node): vmath.vector4
        export function get_text(node: node): string
        export function get_pivot(node: node): PivotType
        export function get_alpha(node: node): number
        export function get_blend_mode(node: node): BlendMode
        export function get_clipping_mode(node: node): ClippingMode
        export function get_clipping_inverted(node: node): boolean
        export function get_clipping_visible(node: node): boolean
        export function get_color(node: node): vmath.vector4
        export function get_euler(node: node): vmath.vector3
        export function get_leading(node: node): number
        export function clone(node: node): node
        export function clone_tree(node: node): node
        export function delete_node(node: node): void
        export function animate(node: node, property: string, playback: PlaybackMode, to: number | vmath.vector3 | vmath.quaternion, easing: EasingType, duration: number, delay?: number, complete_function?: (self: IBaseEntityAndThree, node: node, property: string) => void): void
        export function cancel_animations(node: node, property?: string): void

        export const TYPE_BOX: GuiNodeType;
        export const TYPE_TEXT: GuiNodeType;

        export const PIVOT_CENTER: PivotType;
        export const PIVOT_N: PivotType;
        export const PIVOT_NE: PivotType;
        export const PIVOT_E: PivotType;
        export const PIVOT_SE: PivotType;
        export const PIVOT_S: PivotType;
        export const PIVOT_SW: PivotType;
        export const PIVOT_W: PivotType;
        export const PIVOT_NW: PivotType;

        export const ADJUST_FIT: AdjustMode;
        export const ADJUST_ZOOM: AdjustMode;
        export const ADJUST_STRETCH: AdjustMode;

        export const CLIPPING_MODE_NONE: ClippingMode;
        export const CLIPPING_MODE_STENCIL: ClippingMode;

        export const BLEND_ALPHA: BlendMode;
        export const BLEND_ADD: BlendMode;
        export const BLEND_ADD_ALPHA: BlendMode;
        export const BLEND_MULT: BlendMode;
        export const BLEND_SCREEN: BlendMode;

        export const PLAYBACK_ONCE_FORWARD: PlaybackMode;
        export const PLAYBACK_ONCE_BACKWARD: PlaybackMode;
        export const PLAYBACK_ONCE_PINGPONG: PlaybackMode;
        export const PLAYBACK_LOOP_FORWARD: PlaybackMode;
        export const PLAYBACK_LOOP_BACKWARD: PlaybackMode;
        export const PLAYBACK_LOOP_PINGPONG: PlaybackMode;

        export const EASING_LINEAR: EasingType;
        export const EASING_INQUAD: EasingType;
        export const EASING_OUTQUAD: EasingType;
        export const EASING_INOUTQUAD: EasingType;
        export const EASING_INCUBIC: EasingType;
        export const EASING_OUTCUBIC: EasingType;
        export const EASING_INOUTCUBIC: EasingType;
        export const EASING_INQUART: EasingType;
        export const EASING_OUTQUART: EasingType;
        export const EASING_INOUTQUART: EasingType;
        export const EASING_INQUINT: EasingType;
        export const EASING_OUTQUINT: EasingType;
        export const EASING_INOUTQUINT: EasingType;
        export const EASING_INSINE: EasingType;
        export const EASING_OUTSINE: EasingType;
        export const EASING_INOUTSINE: EasingType;
        export const EASING_INEXPO: EasingType;
        export const EASING_OUTEXPO: EasingType;
        export const EASING_INOUTEXPO: EasingType;
        export const EASING_INCIRC: EasingType;
        export const EASING_OUTCIRC: EasingType;
        export const EASING_INOUTCIRC: EasingType;
        export const EASING_INELASTIC: EasingType;
        export const EASING_OUTELASTIC: EasingType;
        export const EASING_INOUTELASTIC: EasingType;
        export const EASING_INBACK: EasingType;
        export const EASING_OUTBACK: EasingType;
        export const EASING_INOUTBACK: EasingType;
        export const EASING_INBOUNCE: EasingType;
        export const EASING_OUTBOUNCE: EasingType;
        export const EASING_INOUTBOUNCE: EasingType;
    }
}

export function gui_module() {
    // Локальные константы используют глобальные типизированные значения
    const TYPE_BOX = GUI_TYPE_BOX;
    const TYPE_TEXT = GUI_TYPE_TEXT;

    const PIVOT_CENTER = GUI_PIVOT_CENTER;
    const PIVOT_N = GUI_PIVOT_N;
    const PIVOT_NE = GUI_PIVOT_NE;
    const PIVOT_E = GUI_PIVOT_E;
    const PIVOT_SE = GUI_PIVOT_SE;
    const PIVOT_S = GUI_PIVOT_S;
    const PIVOT_SW = GUI_PIVOT_SW;
    const PIVOT_W = GUI_PIVOT_W;
    const PIVOT_NW = GUI_PIVOT_NW;

    const CLIPPING_MODE_NONE = GUI_CLIPPING_MODE_NONE;
    const CLIPPING_MODE_STENCIL = GUI_CLIPPING_MODE_STENCIL;

    const BLEND_ALPHA = GUI_BLEND_ALPHA;
    const BLEND_ADD = GUI_BLEND_ADD;
    const BLEND_ADD_ALPHA = GUI_BLEND_ADD_ALPHA;
    const BLEND_MULT = GUI_BLEND_MULT;
    const BLEND_SCREEN = GUI_BLEND_SCREEN;

    const ADJUST_FIT = GUI_ADJUST_FIT;
    const ADJUST_ZOOM = GUI_ADJUST_ZOOM;
    const ADJUST_STRETCH = GUI_ADJUST_STRETCH;

    function new_box_node(pos: vmath.vector3, size: vmath.vector3) {
        const gui_box = Services.scene.create(ObjectTypes.GUI_BOX, {
            width: size.x,
            height: size.y,
        }) as unknown as GuiBox;
        gui_box.set_position(pos.x, pos.y);
        return { id: gui_box.mesh_data.id } as node;
    }

    function new_text_node(pos: vmath.vector3, text: string) {
        const gui_text = Services.scene.create(ObjectTypes.GUI_TEXT, { text }) as unknown as GuiText;
        gui_text.set_position(pos.x, pos.y);
        return { id: gui_text.mesh_data.id } as node;
    }

    function set(node: node, property: string, value: unknown) {
        const node_id = (node as NodeWithId).id;
        const mesh = Services.scene.get_by_id(node_id);
        if (!mesh) {
            Services.logger.error('[set] Mesh not found for id:', node_id);
            return;
        }
        const is_gui_type = mesh.type == IObjectTypes.GUI_BOX || mesh.type == IObjectTypes.GUI_TEXT;
        if (['position', 'rotation', 'scale', 'euler.z'].includes(property) && !is_gui_type) {
            Services.logger.error('[set] Mesh with id', node_id, 'is not gui property:', property);
            return;
        }
        set_nested_property(mesh as IBaseEntityAndThree, property, value);
    }

    function set_alpha(node: node, alpha: number) {
        const node_id = (node as NodeWithId).id;
        const mesh = Services.scene.get_by_id(node_id);
        if (!mesh || !(mesh instanceof GuiBox || mesh instanceof GuiText)) {
            Services.logger.error('[set_alpha] Mesh not found for id:', node_id);
            return;
        }
        mesh.set_alpha(alpha);
    }

    function set_blend_mode(node: node, blend_mode: BlendMode) {
        const node_id = (node as NodeWithId).id;
        const mesh = Services.scene.get_by_id(node_id);
        if (!mesh) {
            Services.logger.error('[set_blend_mode] Mesh not found for id:', node_id);
            return;
        }
        const three_blend_mode = convert_defold_blend_mode_to_threejs(blend_mode);

        if (mesh instanceof GuiBox) mesh.material.blending = three_blend_mode;
        else if (mesh instanceof GuiText && mesh.material) mesh.material.blending = three_blend_mode;
    }

    function set_clipping_mode(node: node, mode: ClippingMode) {
        const node_id = (node as NodeWithId).id;
        const mesh = Services.scene.get_by_id(node_id);
        if (!mesh || !(mesh instanceof GuiBox)) {
            Services.logger.error('[set_clipping_mode] Mesh not found for id:', node_id);
            return;
        }
        if (mode == CLIPPING_MODE_NONE) mesh.disableClipping();
        else mesh.enableClipping(false, true);
    }

    function set_clipping_inverted(node: node, inverted: boolean) {
        const node_id = (node as NodeWithId).id;
        const mesh = Services.scene.get_by_id(node_id);
        if (!mesh || !(mesh instanceof GuiBox)) {
            Services.logger.error('[set_clipping_inverted] Mesh not found for id:', node_id);
            return;
        }
        if (!mesh.isClippingEnabled()) {
            Services.logger.warn('[set_clipping_inverted] Clipping is not enabled for id:', node_id);
            return;
        }
        mesh.enableClipping(inverted);
    }

    function set_clipping_visible(node: node, visible: boolean) {
        const node_id = (node as NodeWithId).id;
        const mesh = Services.scene.get_by_id(node_id);
        if (!mesh || !(mesh instanceof GuiBox)) {
            Services.logger.error('[set_clipping_visible] Mesh not found for id:', node_id);
            return;
        }
        if (!mesh.isClippingEnabled()) {
            Services.logger.warn('[set_clipping_visible] Clipping is not enabled for id:', node_id);
            return;
        }
        mesh.enableClipping(false, visible);
    }

    function set_color(node: node, color: vmath.vector4) {
        const node_id = (node as NodeWithId).id;
        const mesh = Services.scene.get_by_id(node_id);
        if (!mesh || !(mesh instanceof GuiBox || mesh instanceof GuiText)) {
            Services.logger.error('[set_color] Mesh not found for id:', node_id);
            return;
        }
        mesh.set_color(rgbToHex(new Vector3(color.x, color.y, color.z)));
    }

    function set_euler(node: node, euler: vmath.vector3) {
        const node_id = (node as NodeWithId).id;
        const mesh = Services.scene.get_by_id(node_id);
        if (!mesh || !(mesh instanceof GuiBox || mesh instanceof GuiText)) {
            Services.logger.error('[set_euler] Mesh not found for id:', node_id);
            return;
        }
        mesh.rotation.set(euler.x, euler.y, euler.z);
    }

    function set_leading(node: node, leading: number) {
        const node_id = (node as NodeWithId).id;
        const mesh = Services.scene.get_by_id(node_id);
        if (!mesh || !(mesh instanceof GuiText)) {
            Services.logger.error('[set_leading] Mesh not found for id:', node_id);
            return;
        }
        mesh.lineHeight = leading;
    }

    function set_parent(node: node, parent: node, _keep_scene_transform?: boolean) {
        const node_id = (node as NodeWithId).id;
        const parent_id = (parent as NodeWithId).id;
        const mesh = Services.scene.get_by_id(node_id);
        if (!mesh) {
            Services.logger.error('[set_parent] Mesh not found for id:', node_id);
            return;
        }
        const parent_mesh = Services.scene.get_by_id(parent_id);
        if (!parent_mesh) {
            Services.logger.error('[set_parent] Parent mesh not found for id:', parent_id);
            return;
        }
        mesh.parent = parent_mesh;
    }

    function set_pivot(node: node, pivot: PivotType) {
        const node_id = (node as NodeWithId).id;
        const mesh = Services.scene.get_by_id(node_id);
        if (!mesh || !(mesh instanceof GuiBox || mesh instanceof GuiText)) {
            Services.logger.error('[set_pivot] Mesh not found for id:', node_id);
            return;
        }
        const [pivot_x, pivot_y] = convert_defold_pivot_to_threejs(pivot);
        mesh.set_pivot(pivot_x, pivot_y);
    }

    function set_position(node: node, position: vmath.vector3) {
        const node_id = (node as NodeWithId).id;
        const mesh = Services.scene.get_by_id(node_id);
        if (!mesh || !(mesh instanceof GuiBox || mesh instanceof GuiText)) {
            Services.logger.error('[set_position] Mesh not found for id:', node_id);
            return;
        }
        mesh.position.set(position.x, position.y, position.z);
    }

    function set_rotation(node: node, rotation: vmath.quaternion) {
        const node_id = (node as NodeWithId).id;
        const mesh = Services.scene.get_by_id(node_id);
        if (!mesh || !(mesh instanceof GuiBox || mesh instanceof GuiText)) {
            Services.logger.error('[set_rotation] Mesh not found for id:', node_id);
            return;
        }
        mesh.setRotationFromQuaternion(new Quaternion(rotation.x, rotation.y, rotation.z, rotation.w));
    }

    function set_size(node: node, size: vmath.vector3) {
        const node_id = (node as NodeWithId).id;
        const mesh = Services.scene.get_by_id(node_id);
        if (!mesh || !(mesh instanceof GuiBox || mesh instanceof GuiText)) {
            Services.logger.error('[set_size] Mesh not found for id:', node_id);
            return;
        }
        mesh.set_size(size.x, size.y);
    }

    function set_slice9(node: node, slice9: vmath.vector4) {
        const node_id = (node as NodeWithId).id;
        const mesh = Services.scene.get_by_id(node_id);
        if (!mesh || !(mesh instanceof GuiBox)) {
            Services.logger.error('[set_slice9] Mesh not found for id:', node_id);
            return;
        }
        mesh.set_slice(slice9.x, slice9.y);
    }

    function set_text(node: node, text: string | number) {
        const node_id = (node as NodeWithId).id;
        const mesh = Services.scene.get_by_id(node_id);
        if (!mesh || !(mesh instanceof GuiText)) {
            Services.logger.error('[set_text] Mesh not found for id:', node_id);
            return;
        }
        mesh.set_text(text.toString());
    }

    // NOTE: сдесь хотим передавать atlas/texture_name ?
    function set_texture(node: node, texture: string) {
        const node_id = (node as NodeWithId).id;
        const mesh = Services.scene.get_by_id(node_id);
        if (!mesh || !(mesh instanceof GuiBox)) {
            Services.logger.error('[set_texture] Mesh not found for id:', node_id);
            return;
        }
        const [atlas, texture_name] = texture.split('/');
        mesh.set_texture(texture_name, atlas);
    }

    function get(node: node, property: string) {
        const node_id = (node as NodeWithId).id;
        const mesh = Services.scene.get_by_id(node_id);
        if (!mesh) {
            Services.logger.error('[get] Mesh not found for id:', node_id);
            return null;
        }
        return get_nested_property(mesh as IBaseEntityAndThree, property);
    }

    function get_node(id: string) {
        const mesh = Services.scene.get_by_name(id);
        if (!mesh) {
            Services.logger.error('[get_node] Mesh not found for id:', id);
            return;
        }
        return { id: mesh.mesh_data.id } as node;
    }

    function get_type(node: node): GuiNodeType | undefined {
        const node_id = (node as NodeWithId).id;
        const mesh = Services.scene.get_by_id(node_id);
        if (!mesh) {
            Services.logger.error('[get_type] Mesh not found for id:', node_id);
            return;
        }
        if (mesh.type != IObjectTypes.GUI_BOX && mesh.type != IObjectTypes.GUI_TEXT) {
            Services.logger.error('[get_type] Wrong/Unsupported mesh type:', node_id);
            return;
        }
        return mesh.type == IObjectTypes.GUI_BOX ? TYPE_BOX : TYPE_TEXT;
    }

    function get_parent(node: node) {
        const node_id = (node as NodeWithId).id;
        const mesh = Services.scene.get_by_id(node_id);
        if (!mesh) {
            Services.logger.error('[get_parent] Mesh not found for id:', node_id);
            return;
        }
        if (!mesh.parent || !is_base_mesh(mesh.parent)) {
            Services.logger.error('[get_parent] Parent mesh not found for id:', node_id);
            return;
        }
        const parent_mesh = mesh.parent as IBaseEntityAndThree;
        return { id: parent_mesh.mesh_data.id } as node;
    }

    function get_position(node: node) {
        const node_id = (node as NodeWithId).id;
        const mesh = Services.scene.get_by_id(node_id);
        if (!mesh) {
            Services.logger.error('[get_position] Mesh not found for id:', node_id);
            return;
        }
        return vmath.vector3(mesh.position.x, mesh.position.y, mesh.position.z);
    }

    function get_rotation(node: node) {
        const node_id = (node as NodeWithId).id;
        const mesh = Services.scene.get_by_id(node_id);
        if (!mesh) {
            Services.logger.error('[get_rotation] Mesh not found for id:', node_id);
            return;
        }
        return vmath.vector4(mesh.quaternion.x, mesh.quaternion.y, mesh.quaternion.z, mesh.quaternion.w);
    }

    function get_scale(node: node) {
        const node_id = (node as NodeWithId).id;
        const mesh = Services.scene.get_by_id(node_id);
        if (!mesh) {
            Services.logger.error('[get_scale] Mesh not found for id:', node_id);
            return;
        }
        return vmath.vector3(mesh.scale.x, mesh.scale.y, mesh.scale.z);
    }

    function get_size(node: node) {
        const node_id = (node as NodeWithId).id;
        const mesh = Services.scene.get_by_id(node_id);
        if (!mesh || !(mesh instanceof GuiBox || mesh instanceof GuiText)) {
            Services.logger.error('[get_size] Mesh not found for id:', node_id);
            return;
        }
        return vmath.vector3(mesh.get_size().x, mesh.get_size().y, 0);
    }

    function get_slice9(node: node) {
        const node_id = (node as NodeWithId).id;
        const mesh = Services.scene.get_by_id(node_id);
        if (!mesh || !(mesh instanceof GuiBox)) {
            Services.logger.error('[get_slice9] Mesh not found for id:', node_id);
            return;
        }
        return vmath.vector4(mesh.get_slice().x, mesh.get_slice().y, 0, 0);
    }

    function get_text(node: node) {
        const node_id = (node as NodeWithId).id;
        const mesh = Services.scene.get_by_id(node_id);
        if (!mesh || !(mesh instanceof GuiText)) {
            Services.logger.error('[get_text] Mesh not found for id:', node_id);
            return;
        }
        return mesh.text;
    }

    function get_pivot(node: node): PivotType | undefined {
        const node_id = (node as NodeWithId).id;
        const mesh = Services.scene.get_by_id(node_id);
        if (!mesh || !(mesh instanceof GuiBox || mesh instanceof GuiText)) {
            Services.logger.error('[get_pivot] Mesh not found for id:', node_id);
            return;
        }
        const [pivot_x, pivot_y] = mesh.get_pivot();
        return convert_threejs_pivot_to_defold(pivot_x, pivot_y) as PivotType;
    }

    function get_alpha(node: node) {
        const node_id = (node as NodeWithId).id;
        const mesh = Services.scene.get_by_id(node_id);
        if (!mesh || !(mesh instanceof GuiBox || mesh instanceof GuiText)) {
            Services.logger.error('[get_alpha] Mesh not found for id:', node_id);
            return;
        }
        return mesh.get_alpha();
    }

    function get_blend_mode(node: node): BlendMode | undefined {
        const node_id = (node as NodeWithId).id;
        const mesh = Services.scene.get_by_id(node_id);
        if (!mesh || !(mesh instanceof GuiBox || mesh instanceof GuiText) || !mesh.material) {
            Services.logger.error('[get_blend_mode] Mesh not found for id:', node_id);
            return;
        }
        return convert_threejs_blend_mode_to_defold(mesh.material.blending);
    }

    function get_clipping_mode(node: node): ClippingMode | undefined {
        const node_id = (node as NodeWithId).id;
        const mesh = Services.scene.get_by_id(node_id);
        if (!mesh || !(mesh instanceof GuiBox)) {
            Services.logger.error('[get_clipping_mode] Mesh not found for id:', node_id);
            return;
        }
        return mesh.isClippingEnabled() ? CLIPPING_MODE_STENCIL : CLIPPING_MODE_NONE;
    }

    function get_clipping_inverted(node: node) {
        const node_id = (node as NodeWithId).id;
        const mesh = Services.scene.get_by_id(node_id);
        if (!mesh || !(mesh instanceof GuiBox)) {
            Services.logger.error('[get_clipping_inverted] Mesh not found for id:', node_id);
            return;
        }
        return mesh.isInvertedClipping();
    }

    function get_clipping_visible(node: node) {
        const node_id = (node as NodeWithId).id;
        const mesh = Services.scene.get_by_id(node_id);
        if (!mesh || !(mesh instanceof GuiBox)) {
            Services.logger.error('[get_clipping_visible] Mesh not found for id:', node_id);
            return;
        }
        return mesh.isClippingVisible();
    }

    function get_color(node: node) {
        const node_id = (node as NodeWithId).id;
        const mesh = Services.scene.get_by_id(node_id);
        if (!mesh || !(mesh instanceof GuiBox || mesh instanceof GuiText)) {
            Services.logger.error('[get_color] Mesh not found for id:', node_id);
            return;
        }
        return hex2rgba(mesh.get_color());
    }

    function get_euler(node: node) {
        const node_id = (node as NodeWithId).id;
        const mesh = Services.scene.get_by_id(node_id);
        if (!mesh || !(mesh instanceof GuiBox || mesh instanceof GuiText)) {
            Services.logger.error('[get_euler] Mesh not found for id:', node_id);
            return;
        }
        return vmath.vector3(mesh.rotation.x, mesh.rotation.y, mesh.rotation.z);
    }

    function delete_node(node: node) {
        const node_id = (node as NodeWithId).id;
        Services.scene.remove_by_id(node_id);
    }

    function get_leading(node: node) {
        const node_id = (node as NodeWithId).id;
        const mesh = Services.scene.get_by_id(node_id);
        if (!mesh || !(mesh instanceof GuiText)) {
            Services.logger.error('[get_leading] Mesh not found for id:', node_id);
            return;
        }
        return mesh.lineHeight;
    }

    function clone(node: node) {
        const node_id = (node as NodeWithId).id;
        const mesh = Services.scene.get_by_id(node_id);
        if (!mesh) {
            Services.logger.error('[clone] Mesh not found for id:', node_id);
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
        const node_id = (node as NodeWithId).id;
        const mesh = Services.scene.get_by_id(node_id);
        if (!mesh) {
            Services.logger.error('[clone_tree] Mesh not found for id:', node_id);
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
        playback: PlaybackMode,
        to: number | vmath.vector3 | vmath.quaternion,
        easing: EasingType,
        duration: number,
        delay?: number,
        complete_function?: (self: IBaseEntityAndThree, node: node, property: string) => void
    ) {
        const node_id = (node as NodeWithId).id;
        const mesh = Services.scene.get_by_id(node_id);
        if (!mesh) {
            Services.logger.error('[animate] Mesh not found for id:', node_id);
            return;
        }
        animate_logic(mesh as IBaseEntityAndThree, property, playback, to, easing, duration, delay, () => {
            if (complete_function) complete_function(mesh as IBaseEntityAndThree, node, property);
        });
    }

    function cancel_animations(node: node, property?: string) {
        const node_id = (node as NodeWithId).id;
        const mesh = Services.scene.get_by_id(node_id);
        if (!mesh) {
            Services.logger.error('[cancel_animations] Mesh not found for id:', node_id);
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

        ADJUST_FIT,
        ADJUST_ZOOM,
        ADJUST_STRETCH,

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