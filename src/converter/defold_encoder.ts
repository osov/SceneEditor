import { Type, Field, Root, Namespace } from 'protobufjs';
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

export interface IDefoldPrototype {
    components?: IDefoldComponent[],
    embedded_components?: IDefoldEmbeddedComponent[]
}

export interface IDefoldComponent extends IDefoldTransform {
    component: string;
}

export interface IDefoldEmbeddedComponent extends IDefoldTransform {
    type: string;
    data: string;
}

export interface IDefoldSprite {
    textures: {
        sampler: string;
        texture: string;
    };
    default_animation: string;
    material?: string;
    blend_mode?: DefoldBlendMode;
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

export interface IDefoldFontFile {
    font: string;
    material: string;
    size: number;
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

export interface IDefoldCollectionProxy {
    collection: string;
    exclude?: boolean;
}

// use for Collection and Go
export interface IDefoldFactory {
    prototype: string;
    load_dynamically?: boolean;
}


const typecache: Record<string, Type> = {};
const protos = new Root();
const root = protos.loadSync("src/converter/ddf/proto/ddf.proto", { keepCase: true });

function findMessage(name: string, message: Namespace, path: string): Type | undefined {
    for (const m of message.nestedArray) {
        if (m instanceof Type) {
            if (m.fullName === `${path}.${name}` || m.fullName === `.${name}`) {
                return m;
            }
        }

        if (m instanceof Namespace) {
            const nested = findMessage(name, m as Namespace, `${path}.${m.name}`);
            if (nested) return nested;
        }
    }

    return undefined;
}

function getMessage(name: string): Type | undefined {
    if (typecache[name]) return typecache[name];
    for (const proto of root.nestedArray) {
        if (proto instanceof Namespace) {
            const message = findMessage(name, proto, `${proto.fullName}`);
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
    console.error(`Unable to find field ${k} in message ${message.fullName}`);
    return undefined;
}

function indent(s: string, n: number): string {
    const tab = "  ".repeat(n);
    return tab + s.replace(/\n/g, `\n${tab}`);
}

function encodeString(data: string): string {
    return data
        .replace(/\\/g, '\\\\')
        .replace(/\"/g, '\\"')
        .replace(/\n/g, '\\n')
        .split(/(?='\\n')/g)

        .map((line: string, index: number, array: string[]): string => {
            if (array.length > 1 && index != array.length - 1) {
                return `${line}\\n"`;
            }
            else return `${line}`;
        })
        .join('\n');
}

export function encode(t: Object, message: Type): string {
    let out = "";

    for (const [name, field] of Object.entries(t)) {
        const proto_field = getField(name, message);
        if (!proto_field) continue;

        const elements = (proto_field.repeated) ? (field != undefined) ? field : [] : [field];
        for (const element of elements) {
            const field_type = typeof element;
            switch (field_type) {
                case "string":
                    if (proto_field.type === "string") {
                        out += `${name}: "${encodeString(element)}"\n`; // String
                    }
                    else out += `${name}: ${element} \n`; // Enum
                    break;
                case "number":
                    const not_int = ["double", "float"];
                    if (not_int.includes(proto_field.type)) out += `${name}: ${element} \n`; // Decimal
                    else out += `${name}: ${Math.trunc(element)} \n`; // Integer
                    break;
                case "boolean":
                    out += `${name}: ${element ? "true" : "false"} \n`;
                    break;
                case "object":
                    const nestedMessage = getMessage(proto_field.type);
                    if (!nestedMessage)
                        break;
                    out += `${name} { \n${indent(encode(element, nestedMessage), 1)} \n } \n`;
                    break;
            }
        }
    }

    return out;
}

export function encodeCollection(t: IDefoldCollection): string {
    return encode(t, root.lookupType("dmGameObjectDDF.CollectionDesc"));
}

export function encodePrototype(t: IDefoldPrototype): string {
    return encode(t, root.lookupType("dmGameObjectDDF.PrototypeDesc"));
}

export function encodeSprite(t: IDefoldSprite): string {
    return encode(t, root.lookupType("dmGameSystemDDF.SpriteDesc"))
}

export function encodeLabel(t: IDefoldLabel): string {
    return encode(t, root.lookupType("dmGameSystemDDF.LabelDesc"));
}

export function encodeGui(t: IDefoldGui): string {
    return encode(t, root.lookupType("dmGuiDDF.SceneDesc"));
}

export function encodeFont(t: IDefoldFontFile): string {
    return encode(t, root.lookupType("dmRenderDDF.FontDesc"));
}

export function encodeAtlas(t: IDefoldAtlas): string {
    return encode(t, root.lookupType("dmGameSystemDDF.Atlas"));
}

export function encodeSound(t: IDefoldSound): string {
    return encode(t, root.lookupType("dmSoundDDF.SoundDesc"));
}

export function encodeCollectionFactory(t: IDefoldFactory): string {
    return encode(t, root.lookupType("dmGameSystemDDF.CollectionFactoryDesc"));
};

export function encodeCollectionProxy(t: IDefoldCollectionProxy): string {
    return encode(t, root.lookupType("dmGameSystemDDF.CollectionProxyDesc"));
}

export function encodeFactory(t: IDefoldFactory): string {
    return encode(t, root.lookupType("dmGameSystemDDF.FactoryDesc"));
}