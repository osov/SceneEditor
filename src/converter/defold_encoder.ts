import * as protobuf from 'protobufjs';

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

export function encodeCollection(t: any) {
    return encode(t, root.lookupType("dmGameObjectDDF.CollectionDesc"));
}

export function encodeGo(t: any) {
    return encode(t, root.lookupType("dmGameObjectDDF.InstanceDesc"));
}

export function encodeSprite(t: any) {
    return encode(t, root.lookupType("dmGameSystemDDF.SpriteDesc"));
}

export function encodeGui(t: any) {
    return encode(t, root.lookupType("dmGuiDDF.SceneDesc"));
}

export function encodeLabel(t: any) {
    return encode(t, root.lookupType("dmGameSystemDDF.LabelDesc"));
}

export function encodeFont(t: any) {
    return encode(t, root.lookupType("dmRenderDDF.FontDesc"));
}

export function encodeAtlas(t: any) {
    return encode(t, root.lookupType("dmGameSystemDDF.Atlas"));
}

export function encodeSound(t: any) {
    return encode(t, root.lookupType("dmSoundDDF.SoundDesc"));
}