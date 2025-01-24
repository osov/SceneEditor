import { Vector4 } from "three";

import {
    IGuiBox,
    IGuiText,
    ILabel,
    INodeEmpty,
    INodesList,
    ISprite,
    NodeType
} from "../render_engine/convert_types";

import {
    encodeAtlas,
    encodeCollection,
    encodeCollectionFile,
    encodeFont,
    encodeGoFile,
    encodeGui,
    IDefoldAtlas,
    IDefoldGo,
    IDefoldFont,
    IDefoldGoFile,
    IDefoldGui,
    IDefoldGuiNode,
    IDefoldLabel,
    IDefoldSprite,
    IDefoldCollection,
    DefoldGuiNodeType,
    DefoldClippingMode,
    DefoldPivot
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

    // GENERATING MAIN COLLECTION
    result.push({
        name: "main",
        type: DefoldFileType.COLLECTION,
        data: generateCollection(data)
    });

    // // GENERATING UI
    // result.push({
    //     name: "ui",
    //     type: DefoldFileType.GUI,
    //     data: generateGui(data)
    // });

    // // GENERATING OTHER TYPES
    // // TODO: deeper analyze of list
    // result.push({
    //     name: "",
    //     type: DefoldFileType.GO,
    //     data: generateGoFile({} as INodeEmpty)
    // });

    // result.push({
    //     name: "",
    //     type: DefoldFileType.ATLAS,
    //     data: encodeAtlas({} as IDefoldAtlas)
    // });

    // result.push({
    //     name: "",
    //     type: DefoldFileType.FONT,
    //     data: encodeFont({} as IDefoldFont)
    // });

    return result;
}


function generateCollection(data: INodesList): string {
    const collection = {} as IDefoldCollection;
    collection.name = data.name;
    collection.embedded_instances = []

    for (const node of data.list) {
        switch (node.type) {
            case NodeType.GO:
                // TODO: search children of this go by pid and grab name
                const go = castNodeEmpty2DefoldGo(node.data as INodeEmpty);
                collection.embedded_instances.push(go);
                break;
            case NodeType.SPRITE:
                break;
            case NodeType.SOUND:
                break;
            case NodeType.LABEL:
                break;
            case NodeType.COLLECTION_PROXY:
                break;
        }
    }

    return encodeCollection(collection);
}

function generateCollectionFile(data: INodesList, path: string): string {
    return encodeCollectionFile({
        id: data.name,
        collection: path

        // ISSUE: we don't want position, rotation and scaling on that collection ?
    });
}

function generateGoFile(data: INodeEmpty): string {
    // TODO: convert into Defold type
    return encodeGoFile({} as IDefoldGoFile);
}

function generateGui(data: INodesList): string {
    const gui = {} as IDefoldGui;

    for (const node of data.list) {
        switch (node.type) {
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

function castSprite2DefoldSprite(data: ISprite): IDefoldSprite {
    return {} as IDefoldSprite;
}

function castLable2DefoldLable(data: ILabel): IDefoldLabel {
    return {} as IDefoldLabel;
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
        texture: data.atlas.split(".atlas")[0] + data.texture,
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