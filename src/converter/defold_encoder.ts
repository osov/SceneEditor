import * as protobuf from 'protobufjs';
import { Vector3, Vector4 } from 'three';


export interface IDefoldCollection {
    name: string,

    instances?: IDefoldGoFile[],
    embedded_instances?: IDefoldEmbeddedGo[],
    collection_instances?: IDefoldCollectionFile[],
    scale_along_z?: number,
    prope?: string
}

export interface IDefoldTransform {
    id: string,

    position?: Vector3,
    rotation?: Vector3,
    scale3?: Vector3
}

export interface IDefoldCollectionFile extends IDefoldTransform {
    collection: string,
}

export interface IDefoldGo extends IDefoldTransform {
    children: string,
}

export interface IDefoldEmbeddedGo extends IDefoldGo {
    data: string,
}

export interface IDefoldGoFile extends IDefoldGo {
    prototype: string,
}

export interface IDefoldComponent extends IDefoldTransform {
    component: string,
}

export interface IDefoldEmbeddedComponent extends IDefoldTransform {
    type: string,
    data: string,
}

export interface IDefoldGui {
    script: string,
    nodes: IDefoldGuiNode[],

    fonts?: IDefoldFont[],
    textures?: IDefoldTexture[],
    material?: string,
}

export interface IDefoldGuiNode {

}

export interface IDefoldAtlas {
    images: IDefoldAtlasImage[],
}

export interface IDefoldAtlasImage {
    image: string
}

export interface IDefoldTexture {
    name: string,
    texture: string
}

export interface IDefoldFont {
    name: string,
    font: string
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

export interface IDefoldLable {
    text: string,
    font: string,
    size: Vector4,
    scale: Vector4,
    color: Vector4,
    outline: Vector4,
    shadow: Vector4,
    leading: number,
    tracking: number,
    pivot: DefoldPivot,
    blend_mode: DefoldBlendMode,
    line_break: boolean,
    material: string
}

export interface IDefoldSound {
    sound: string,

    looping?: number,
    group?: string,
    gain?: number,
    pan?: number,
    speed?: number,
    loopcount?: number
}


const typecache: Record<string, protobuf.Type> = {};
const root = protobuf.loadSync("src/converter/ddf/proto/ddf.proto");

function findMessage(name: string, message: protobuf.Type, path: string): protobuf.Type | undefined {
    for (const m of message.nestedArray) {
        if (m instanceof protobuf.Type) {
            if (`${path}.${m.name}` === name) {
                return m;
            }
            const nested = findMessage(name, message, `${path}.${message.name}`);
            if (nested) return nested;
        }
    }

    return undefined;
}

function getMessage(name: string): protobuf.Type | undefined {
    if (typecache[name]) return typecache[name];
    for (const proto of root.nestedArray) {
        if (proto instanceof protobuf.Type) {
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

function getField(k: string, message: protobuf.Type): protobuf.Field | undefined {
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

export function encode(t: Object, message: protobuf.Type): string {
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

export function encodeCollection(t: IDefoldCollection) {
    return encode(t, root.lookupType("dmGameObjectDDF.CollectionDesc"));
}

export function encodeCollectionInstance(t: IDefoldCollectionFile) {
    return encode(t, root.lookupType("dmGameObjectDDF.CollectionInstanceDesc"));
}

export function encodeGo(t: IDefoldGoFile) {
    return encode(t, root.lookupType("dmGameObjectDDF.InstanceDesc"));
}

export function encodeEmbeddedGo(t: IDefoldEmbeddedGo) {
    return encode(t, root.lookupType("dmGameObjectDDF.EmbeddedInstanceDesc"));
}

export function encodeGui(t: IDefoldGui) {
    return encode(t, root.lookupType("dmGuiDDF.SceneDesc"));
}

export function encodeGuiNode(t: IDefoldGuiNode) {
    return encode(t, root.lookupType("dmGuiDDF.NodeDesc"));
}

export function encodeLabel(t: IDefoldLable) {
    return encode(t, root.lookupType("dmGameSystemDDF.LabelDesc"));
}

export function encodeFont(t: IDefoldFont) {
    return encode(t, root.lookupType("dmRenderDDF.FontDesc"));
}

export function encodeAtlas(t: IDefoldAtlas) {
    return encode(t, root.lookupType("dmGameSystemDDF.Atlas"));
}

export function encodeSound(t: IDefoldSound) {
    return encode(t, root.lookupType("dmSoundDDF.SoundDesc"));
}

// TODO: functions for combine encoding, for example go instances in collection and etc.