import { Type, Field, loadSync } from 'protobufjs';
import { Vector3, Vector4 } from 'three';

export enum DefoldGuiNodeType {
    TYPE_BOX = 0,
    TYPE_TEXT,
    TYPE_PIE,
    TYPE_TEMPLATE,
    TYPE_SPINE,
    TYPE_PARTICLEFX
}

export enum DefoldXAnchor {
    XANCHOR_NONE = 0,
    XANCHOR_LEFT,
    XANCHOR_RIGHT
};

export enum DefoldYAnchor {
    YANCHOR_NONE = 0,
    YANCHOR_TOP,
    YANCHOR_BOTTOM
};

export enum DefoldClippingMode {
    CLIPPING_MODE_NONE = 0,
    CLIPPING_MODE_STENCIL,
}

export enum DefoldGuiNodeSizeMode {
    SIZE_MODE_MANUAL = 0,
    SIZE_MODE_AUTO,
}

export enum DefoldBlendMode {
    BLEND_MODE_ALPHA = 0,
    BLEND_MODE_ADD,
    BLEND_MODE_ADD_ALPHA,
    BLEND_MODE_MULT,
    BLEND_MODE_SCREEN
}

export enum DefoldPivot {
    PIVOT_CENTER = 0,
    PIVOT_N,
    PIVOT_NE,
    PIVOT_E,
    PIVOT_SE,
    PIVOT_S,
    PIVOT_SW,
    PIVOT_W,
    PIVOT_NW
}

export interface IDefoldTransform {
    id: string;

    position?: Vector3;
    rotation?: Vector3;
    scale3?: Vector3;
}

export interface IDefoldCollection {
    name: string;

    instances?: IDefoldGoFile[];
    embedded_instances?: IDefoldGo[];
    collection_instances?: IDefoldCollectionFile[];
    scale_along_z?: number;
    prope?: string;
}

export interface IDefoldCollectionFile extends IDefoldTransform {
    collection: string;
}

export interface IDefoldGo extends IDefoldTransform {
    children?: string[];
    data: string;
}

export interface IDefoldGoFile extends IDefoldTransform {
    children?: string[];
    prototype: string;
}

export interface IDefoldComponent extends IDefoldTransform {
    component: string;
}

export interface IDefoldEmbeddedComponent extends IDefoldTransform {
    type: string;
    data: string;
}

export interface IDefoldSprite {
    tile_set: string // but need - textures { sampler: string, texture: string }
    default_animation: string,
    material?: string,
    blend_mode?: DefoldBlendMode
}

export interface IDefoldGui {
    script: string;
    nodes: IDefoldGuiNode[];

    fonts?: IDefoldFont[];
    textures?: IDefoldTexture[];
    material?: string;
}

export interface IDefoldGuiNode {
    id?: string;
    enabled?: boolean,
    visible?: boolean,
    type?: DefoldGuiNodeType;
    position?: Vector4;
    rotation?: Vector4;
    scale?: Vector4;
    size?: Vector4;
    color?: Vector4;
    blend_mode?: DefoldBlendMode;
    text?: string;
    texture?: string;
    font?: string;
    xanchor?: DefoldXAnchor;
    yanchor?: DefoldYAnchor;
    pivot?: DefoldPivot;
    outline?: Vector4;
    shadow?: Vector4;
    line_break?: boolean;
    parent?: string;
    layer?: string;
    inherit_alpha?: boolean;
    slice9?: Vector4;
    clipping_mode?: DefoldClippingMode;
    clipping_visible?: boolean;
    clipping_inverted?: boolean;
    alpha?: number;
    outline_alpha?: number;
    shadow_alpha?: number;
    template?: string;
    text_leading?: number;
    text_tracking?: number;
    size_mode?: DefoldGuiNodeSizeMode;
}

export interface IDefoldAtlas {
    images: IDefoldAtlasImage[];
}

export interface IDefoldAtlasImage {
    image: string;
}

export interface IDefoldTexture {
    name: string;
    texture: string;
}

export interface IDefoldFont {
    name: string;
    font: string;
}

export interface IDefoldLabel {
    text: string;
    font: string;
    size: Vector4;
    scale: Vector4;
    color: Vector4;
    outline: Vector4;
    shadow: Vector4;
    leading: number;
    tracking: number;
    pivot: DefoldPivot;
    blend_mode: DefoldBlendMode;
    line_break: boolean;
    material: string;
}

export interface IDefoldSound {
    sound: string;

    looping?: number;
    group?: string;
    gain?: number;
    pan?: number;
    speed?: number;
    loopcount?: number;
}


const typecache: Record<string, Type> = {};
const root = loadSync("src/converter/ddf/proto/ddf.proto");

function findMessage(name: string, message: Type, path: string): Type | undefined {
    for (const m of message.nestedArray) {
        if (m instanceof Type) {
            if (`${path}.${m.name}` === name) {
                return m;
            }
            const nested = findMessage(name, message, `${path}.${message.name}`);
            if (nested) return nested;
        }
    }

    return undefined;
}

function getMessage(name: string): Type | undefined {
    if (typecache[name]) return typecache[name];
    for (const proto of root.nestedArray) {
        if (proto instanceof Type) {
            const message = findMessage(name, proto, `.${proto.name}`);
            if (message) {
                typecache[name] = message;
                return message;
            }
        }
    }
    console.error(`Unable to find message ${name}`);
    return undefined
}

function getField(k: string, message: Type): Field | undefined {
    for (const field of message.fieldsArray) {
        if (k === field.name) {
            return field;
        }
    }
    console.error(`Unable to find field ${k} in message ${message.name}`);
    return undefined;
}

function indent(s: string, n: number): string {
    const tab = "  ".repeat(n);
    return tab + s.replace(/\n/g, `\n${tab}`);
}

export function encode(t: Object, message: Type): string {
    let out = "";

    for (const [k, f] of Object.entries(t)) {
        const proto_field = getField(k, message);
        if (!proto_field) continue;

        const fields = (proto_field.repeated) ? f : [f];
        for (const field of fields) {
            const field_type = typeof field;
            switch (field_type) {
                case "string":
                    if (proto_field.type === "string") out += `${k}: "${field}"\n`; // String
                    else out += `${k}: ${field}\n`; // Enum
                    break;
                case "number":
                    const not_int = ["double", "float"];
                    if (not_int.includes(proto_field.type)) out += `${k}: ${field}\n`; // Decimal
                    else out += `${k}: ${Math.trunc(field)}\n`; // Integer
                    break;
                case "boolean":
                    out += `${k}: ${field ? "true" : "false"}\n`;
                    break;
                case "object":
                    if (!proto_field.message)
                        break;
                    const nestedMessage = getMessage(proto_field.message.name);
                    if (!nestedMessage)
                        break;
                    out += `${k} {\n${indent(encode(field, nestedMessage), 1)}\n}\n`;
                    break;
            }
        }
    }

    return out;
}

export function encodeCollection(t: IDefoldCollection): string {
    return encode(t, root.lookupType("dmGameObjectDDF.CollectionDesc"));
}

export function encodeCollectionFile(t: IDefoldCollectionFile): string {
    return encode(t, root.lookupType("dmGameObjectDDF.CollectionInstanceDesc"));
}

export function encodeGo(t: IDefoldGo): string {
    return encode(t, root.lookupType("dmGameObjectDDF.EmbeddedInstanceDesc"));
}

export function encodeGoFile(t: IDefoldGoFile): string {
    return encode(t, root.lookupType("dmGameObjectDDF.InstanceDesc"));
}

export function encodeSprite(t: IDefoldSprite): string {
    return encode(t, root.lookupType("SpriteDesc"))
}

export function encodeLabel(t: IDefoldLabel): string {
    return encode(t, root.lookupType("dmGameSystemDDF.LabelDesc"));
}

export function encodeGui(t: IDefoldGui): string {
    return encode(t, root.lookupType("dmGuiDDF.SceneDesc"));
}

export function encodeGuiNode(t: IDefoldGuiNode): string {
    return encode(t, root.lookupType("dmGuiDDF.NodeDesc"));
}

export function encodeFont(t: IDefoldFont): string {
    return encode(t, root.lookupType("dmRenderDDF.FontDesc"));
}

export function encodeAtlas(t: IDefoldAtlas): string {
    return encode(t, root.lookupType("dmGameSystemDDF.Atlas"));
}

export function encodeSound(t: IDefoldSound): string {
    return encode(t, root.lookupType("dmSoundDDF.SoundDesc"));
}