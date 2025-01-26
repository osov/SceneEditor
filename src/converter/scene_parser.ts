import { Vector3, Vector4 } from "three";

import {
    IExtDependencies,
    IGuiBox,
    IGuiNode,
    IGuiText,
    ILabel,
    INodeEmpty,
    INodesList,
    ISound,
    ISprite,
    NodeData,
    NodeType
} from "../render_engine/convert_types";

import {
    encodeCollection,
    encodeGui,
    IDefoldGo,
    IDefoldGui,
    IDefoldGuiNode,
    IDefoldCollection,
    DefoldGuiNodeType,
    DefoldClippingMode,
    DefoldPivot,
    IDefoldCollectionFile
} from "./defold_encoder";
import { hexToRGB } from "../modules/utils";


export enum DefoldFileType {
    COLLECTION,
    GO,
    GUI,
    ATLAS,
    FONT
}

export interface DefoldFileData {
    name: string;
    type: DefoldFileType;
    data: string;
}

export function parseScene(data: INodesList): DefoldFileData[] {
    const result = [] as DefoldFileData[];

    // main коллекция
    result.push({
        name: data.name,
        type: DefoldFileType.COLLECTION,
        data: generateCollection(data)
    });

    // ищем встроенные/вложенные коллекции и gui
    for (const node of data.list) {
        switch (node.type) {
            case NodeType.COLLECTION:
                const node_list = (node.data as INodesList);
                result.push({
                    name: node_list.name,
                    type: DefoldFileType.COLLECTION,
                    data: generateCollection(node_list)
                })
                break;
            case NodeType.GUI:
                const gui = (node.data as IGuiNode);
                result.push({
                    name: gui.name,
                    type: DefoldFileType.GUI,
                    data: generateGui(data)
                });
                break;
        }
    }

    return result;
}

export function parsePrefab(data: INodeEmpty | ISprite | ILabel): DefoldFileData {
    return {} as DefoldFileData;
}


function generateCollection(data: INodesList): string {
    const collection = {} as IDefoldCollection;
    collection.name = data.name;
    collection.embedded_instances = [];
    collection.collection_instances = [];

    for (const node of data.list) {
        switch (node.type) {
            case NodeType.COLLECTION:
                const collection_instance = castNodeList2DefoldCollection(node.data as INodesList);
                collection.collection_instances.push(collection_instance);
                break;
            case NodeType.GO:
                const go_id = (node.data as INodeEmpty).id;
                const go_instance = castNodeEmpty2DefoldGo(node.data as INodeEmpty, getChildrens(go_id, data));
                collection.embedded_instances.push(go_instance);
                break;
            case NodeType.SPRITE:
                const sprite_id = (node.data as ISprite).id;
                const sprite_instance = castSprite2DefoldGoSprite(node.data as ISprite, getChildrens(sprite_id, data));
                collection.embedded_instances.push(sprite_instance);
                break;
            case NodeType.LABEL:
                const lable_id = (node.data as ISprite).id;
                const lable_instance = castLabel2DefoldGoLabel(node.data as ILabel, getChildrens(lable_id, data));
                collection.embedded_instances.push(lable_instance);
                break;
            case NodeType.SOUND:
                const sound_instance = castSound2DefoldGoSound(node.data as ISound);
                collection.embedded_instances.push(sound_instance);
                break;
            case NodeType.COLLECTION_PROXY:
                const collection_proxy_instance = castIExtDependence2DefoldGoCollectionProxy(node.data as IExtDependencies);
                collection.embedded_instances.push(collection_proxy_instance);
                break;
            case NodeType.COLLECTION_FACTORY:
                const collection_factory_instance = castIExtDependence2DefoldGoCollectionFactory(node.data as IExtDependencies);
                collection.embedded_instances.push(collection_factory_instance);
                break;
            case NodeType.FACTORY:
                const factory_instance = castIExtDependence2DefoldGoFactory(node.data as IExtDependencies);
                collection.embedded_instances.push(factory_instance);
                break;
        }
    }

    return encodeCollection(collection);
}

function getChildrens(id: number, data: INodesList): string[] {
    return data.list.filter((node: NodeData) => {
        const is_go = node.type == NodeType.GO;
        const is_parent = (node.data as INodeEmpty).pid == id;
        return is_go && is_parent;
    }).map((node: NodeData) => {
        return (node.data as INodeEmpty).name;
    });
}

function generateGui(data: INodesList): string {
    const gui = {} as IDefoldGui;
    gui.script = "";
    gui.nodes = [];

    for (const node of data.list) {
        switch (node.type) {
            case NodeType.GUI:

                break;
            case NodeType.GUI_BOX: gui.nodes.push(castGuiBox2DefoldGuiNode(node.data as IGuiBox)); break;
            case NodeType.GUI_TEXT: gui.nodes.push(castGuiText2DefoldGuiNode(node.data as IGuiText)); break;
        }
    }

    return encodeGui(gui);
}

function castNodeEmpty2DefoldGo(data: INodeEmpty, children?: string[]): IDefoldGo {
    return {
        id: data.name,
        position: data.position,
        rotation: data.rotation,
        scale3: data.scale,
        children,
        data: ""
    };
}

function castSprite2DefoldGoSprite(data: ISprite, children?: string[]): IDefoldGo {
    return {
        id: data.name,
        position: data.position,
        rotation: data.rotation,
        scale3: data.scale,
        children,
        data: "" // TODO: embed sprite
    };
}

function castLabel2DefoldGoLabel(data: ILabel, children?: string[]): IDefoldGo {
    return {
        id: data.name,
        position: data.position,
        rotation: data.rotation,
        scale3: data.scale,
        children,
        data: "" // TODO: embed label
    };
}

function castSound2DefoldGoSound(data: ISound): IDefoldGo {
    return {
        id: data.name,
        position: new Vector3(0, 0, 0),
        rotation: new Vector3(0, 0, 0),
        scale3: new Vector3(1, 1, 1),
        data: "" // TODO: embed sound
    };
}

function castIExtDependence2DefoldGoCollectionProxy(data: IExtDependencies): IDefoldGo {
    return {
        id: data.name,
        position: new Vector3(0, 0, 0),
        rotation: new Vector3(0, 0, 0),
        scale3: new Vector3(1, 1, 1),
        data: "" // TODO: embed collection proxy
    };
}

function castIExtDependence2DefoldGoCollectionFactory(data: IExtDependencies): IDefoldGo {
    return {
        id: data.name,
        position: new Vector3(0, 0, 0),
        rotation: new Vector3(0, 0, 0),
        scale3: new Vector3(1, 1, 1),
        data: "" // TODO: embed collection factory
    };
}

function castIExtDependence2DefoldGoFactory(data: IExtDependencies): IDefoldGo {
    return {
        id: data.name,
        position: new Vector3(0, 0, 0),
        rotation: new Vector3(0, 0, 0),
        scale3: new Vector3(1, 1, 1),
        data: "" // TODO: embed factory
    };
}

function castNodeList2DefoldCollection(data: INodesList): IDefoldCollectionFile {
    return {
        id: data.name,
        collection: data.name + ".collection"
    }
}

function castGuiBox2DefoldGuiNode(data: IGuiBox): IDefoldGuiNode {
    return {
        id: data.name,
        type: DefoldGuiNodeType.TYPE_BOX,
        position: new Vector4(data.position.x, data.position.y, data.position.z),
        rotation: new Vector4(data.rotation.x, data.rotation.y, data.rotation.z),
        scale: new Vector4(data.scale.x, data.scale.y, data.scale.z),
        size: new Vector4(data.width, data.height),
        enabled: data.enabled,
        visible: data.visible,
        // ISSUE: where default animation ?
        texture: data.atlas.split(".atlas")[0] + `/${data.texture}`,
        clipping_mode: castStencil(data.stencil),
        slice9: new Vector4(data.slice_width, data.slice_height, data.slice_width, data.slice_height),
        alpha: data.alpha,
        pivot: castPivot(data.pivot)
    };
}

function castGuiText2DefoldGuiNode(data: IGuiText): IDefoldGuiNode {
    return {
        id: data.name,
        type: DefoldGuiNodeType.TYPE_TEXT,
        text: data.text,
        font: data.font,
        line_break: data.line_break,
        text_leading: data.leading,
        outline: data.outline ? castColor(data.outline, data.outline_alpha ? data.outline_alpha : 1) : undefined,
        shadow: data.shadow ? castColor(data.shadow, data.shadow_alpha ? data.shadow_alpha : 1) : undefined,
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

function castStencil(stencil: boolean): DefoldClippingMode {
    if (stencil) return DefoldClippingMode.CLIPPING_MODE_STENCIL;
    return DefoldClippingMode.CLIPPING_MODE_NONE;
}

function castPivot(data: number[]): DefoldPivot {
    const x = data[0];
    const y = data[1];

    const is_n = (x == 0) && (y == 1);
    if (is_n) return DefoldPivot.PIVOT_N;

    const is_ne = (x == 1) && (y == 1);
    if (is_ne) return DefoldPivot.PIVOT_NE;

    const is_e = (x == 1) && (y == 0);
    if (is_e) return DefoldPivot.PIVOT_E;

    const is_se = (x == 1) && (y == -1);
    if (is_se) return DefoldPivot.PIVOT_SE;

    const is_s = (x == -1) && (y == 0);
    if (is_s) return DefoldPivot.PIVOT_S;

    const is_sw = (x == -1) && (y == -1);
    if (is_sw) return DefoldPivot.PIVOT_SW;

    const is_w = (x == 0) && (y == -1);
    if (is_w) return DefoldPivot.PIVOT_W;

    const is_nw = (x == -1) && (y == 1);
    if (is_nw) return DefoldPivot.PIVOT_NW;

    return DefoldPivot.PIVOT_CENTER;
}

function castColor(hex_rgb: string, alpha: number): Vector4 {
    const color = hexToRGB(hex_rgb);
    return new Vector4(color.x, color.y, color.z, alpha);
}