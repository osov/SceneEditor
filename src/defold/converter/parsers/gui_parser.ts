/**
 * GUI Parser - генерация GUI файлов для Defold
 */

import { Vector4 } from 'three';
import {
    type IGuiBox,
    type IGuiNode,
    type IGuiSpine,
    type IGuiText,
    type INodesList,
    type NodeData,
    NodeType,
} from '../convert_types';
import {
    encodeGui,
    type IDefoldGui,
    type IDefoldGuiNode,
    DefoldGuiNodeType,
    DefoldSizeMode,
} from '../defold_encoder';
import { castColor, castPivot, castStencil, getNameFromPath } from './utils';

/** Получить родителя GUI ноды */
function getNodeBoxParent(pid: number, data: INodesList): string {
    return data.list.filter((node: NodeData) => {
        const is_node = (node.type === NodeType.GUI_BOX) || (node.type === NodeType.GUI_TEXT);
        const is_parent = (node.data as IGuiNode).id === pid;
        return is_node && is_parent;
    }).map((node: NodeData) => {
        return (node.data as IGuiNode).name;
    })[0];
}

/** Конвертировать GuiBox в DefoldGuiNode */
export function castGuiBox2DefoldGuiNode(data: IGuiBox): IDefoldGuiNode {
    return {
        id: data.name,
        type: DefoldGuiNodeType.TYPE_BOX,
        position: new Vector4(data.position.x, data.position.y, data.position.z),
        rotation: new Vector4(data.rotation.x, data.rotation.y, data.rotation.z),
        scale: new Vector4(data.scale.x, data.scale.y, data.scale.z),
        size_mode: DefoldSizeMode.SIZE_MODE_MANUAL,
        size: new Vector4(data.width, data.height),
        color: data.color ? castColor(data.color) : undefined,
        enabled: data.enabled,
        visible: data.visible,
        texture: data.atlas && data.texture ? getNameFromPath(data.atlas) + `/${data.texture}` : undefined,
        clipping_mode: castStencil(data.stencil),
        slice9: new Vector4(data.slice_width, data.slice_height, data.slice_width, data.slice_height),
        alpha: data.alpha,
        pivot: castPivot(data.pivot)
    };
}

/** Конвертировать GuiText в DefoldGuiNode */
export function castGuiText2DefoldGuiNode(data: IGuiText): IDefoldGuiNode {
    return {
        id: data.name,
        type: DefoldGuiNodeType.TYPE_TEXT,
        text: data.text,
        font: getNameFromPath(data.font),
        line_break: data.line_break,
        text_leading: data.leading,
        color: data.color ? castColor(data.color) : undefined,
        outline: data.outline ? castColor(data.outline) : undefined,
        outline_alpha: data.outline_alpha,
        shadow: data.shadow ? castColor(data.shadow) : undefined,
        shadow_alpha: data.shadow_alpha,
        position: new Vector4(data.position.x, data.position.y, data.position.z),
        rotation: new Vector4(data.rotation.x, data.rotation.y, data.rotation.z),
        scale: new Vector4(data.scale.x, data.scale.y, data.scale.z),
        size: new Vector4(data.width, data.height),
        enabled: data.enabled,
        visible: data.visible,
        alpha: data.alpha,
        pivot: castPivot(data.pivot)
    };
}

/** Конвертировать GuiSpine в DefoldGuiNode */
export function castGuiSpine2DefoldGuiNode(data: IGuiSpine): IDefoldGuiNode {
    return {
        id: data.name,
        type: DefoldGuiNodeType.TYPE_SPINE,
        position: new Vector4(data.position.x, data.position.y, data.position.z),
        rotation: new Vector4(data.rotation.x, data.rotation.y, data.rotation.z),
        scale: new Vector4(data.scale.x, data.scale.y, data.scale.z),
        color: data.color ? castColor(data.color) : undefined,
        size: new Vector4(data.width, data.height),
        enabled: data.enabled,
        visible: data.visible,
        alpha: data.alpha,
        pivot: castPivot(data.pivot),
        spine_scene: getNameFromPath(data.spine_scene),
        spine_default_animation: data.default_animation,
        spine_skin: data.skin
    };
}

/** Генерация GUI файла */
export function generateGui(data: INodesList): string {
    const gui = {} as IDefoldGui;
    gui.script = '';
    gui.nodes = [];
    gui.textures = [];
    gui.fonts = [];
    gui.resources = [];

    // NOTE: для уникальности атласов
    const uniqueAtlases = new Set<string>();

    for (const node of data.list) {
        switch (node.type) {
            case NodeType.GUI_BOX: {
                const box_data = node.data as IGuiBox;
                const box_node = castGuiBox2DefoldGuiNode(box_data);
                box_node.parent = getNodeBoxParent(box_data.pid, data);
                gui.nodes.push(box_node);
                if (box_data.atlas) {
                    const box_node_name = box_data.atlas.split('.')[0];
                    if (!uniqueAtlases.has(box_node_name)) {
                        uniqueAtlases.add(box_node_name);
                        gui.textures.push({
                            name: getNameFromPath(box_node_name),
                            texture: box_data.atlas
                        });
                    }
                }
                break;
            }
            case NodeType.GUI_TEXT: {
                const text_data = node.data as IGuiText;
                const text_node = castGuiText2DefoldGuiNode(text_data);
                text_node.parent = getNodeBoxParent(text_data.pid, data);
                gui.nodes.push(text_node);
                const text_node_name = text_data.font.split('.')[0];
                if (!uniqueAtlases.has(text_node_name)) {
                    uniqueAtlases.add(text_node_name);
                    gui.fonts.push({
                        name: getNameFromPath(text_node_name),
                        font: text_data.font,
                    });
                }
                break;
            }
            case NodeType.GUI_SPINE: {
                const spine_data = node.data as IGuiSpine;
                const spine_node = castGuiSpine2DefoldGuiNode(spine_data);
                spine_node.parent = getNodeBoxParent(spine_data.pid, data);
                gui.nodes.push(spine_node);
                const spine_node_name = spine_data.spine_scene.split('.')[0];
                if (!uniqueAtlases.has(spine_node_name)) {
                    uniqueAtlases.add(spine_node_name);
                    gui.resources.push({
                        name: getNameFromPath(spine_node_name),
                        path: spine_data.spine_scene
                    });
                }
                break;
            }
        }
    }

    return encodeGui(gui);
}
