import { Vector3, Vector4 } from "three";

import {
    ExtDependenceType,
    IAtlas,
    IExtDependencies,
    IFont,
    IGuiBox,
    IGuiNode,
    IGuiText,
    ILabel,
    INodeEmpty,
    INodesList,
    IPrefab,
    ISound,
    ISprite,
    NodeData,
    NodeType,
    PrefabComponentType
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
    IDefoldCollectionFile,
    encodeAtlas,
    IDefoldAtlas,
    encodePrototype,
    IDefoldPrototype,
    encodeSprite,
    encodeLabel,
    IDefoldLabel,
    IDefoldSprite,
    DefoldBlendMode,
    encodeFont,
    encodeSound,
    IDefoldSound,
    encodeCollectionFactory,
    encodeCollectionProxy,
    encodeFactory,
    IDefoldCollectionProxy,
    IDefoldFactory,
    IDefoldEmbeddedComponent
} from "./defold_encoder";
import { hexToRGB } from "../modules/utils";


export enum DefoldType {
    COLLECTION,
    GO,
    GUI,
    ATLAS,
    FONT
}

export interface DefoldData {
    name: string;
    type: DefoldType;
    data: string;
}

export function parseScene(data: INodesList): DefoldData[] {
    const result = [] as DefoldData[];

    // main коллекция
    result.push({
        name: data.name,
        type: DefoldType.COLLECTION,
        data: generateCollection(data)
    });

    // ищем встроенные/вложенные коллекции и gui
    for (const node of data.list) {
        switch (node.type) {
            case NodeType.COLLECTION:
                const node_list = (node.data as INodesList);
                result.push({
                    name: node_list.name,
                    type: DefoldType.COLLECTION,
                    data: generateCollection(node_list)
                })
                break;
            case NodeType.GUI:
                const gui = (node.data as IGuiNode);
                result.push({
                    name: gui.name,
                    type: DefoldType.GUI,
                    data: generateGui(data)
                });
                break;
        }
    }

    return result;
}

export function parsePrefab(data: IPrefab): DefoldData {
    return {
        name: data.name,
        type: DefoldType.GO,
        data: encodePrototype(castPrefab2DefoldProtorype(data))
    };
}

export function parseAtlas(data: IAtlas): DefoldData {
    return {
        name: data.name,
        type: DefoldType.ATLAS,
        data: encodeAtlas(castAtlas2DefoldAtlas(data))
    };
}

export function parseFont(data: IFont): DefoldData {
    return {
        name: data.font.split(".")[0],
        type: DefoldType.FONT,
        data: encodeFont({
            font: data.font,
            material: "/builtins/fonts/font.material",
            size: data.size
        })
    };
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
                const go_instance = castNodeEmpty2DefoldGo(node.data as INodeEmpty, getGoChildrens(go_id, data));
                collection.embedded_instances.push(go_instance);
                break;
            case NodeType.SPRITE:
                const sprite_id = (node.data as ISprite).id;
                const sprite_instance = castSprite2DefoldGoSprite(node.data as ISprite, getGoChildrens(sprite_id, data));
                collection.embedded_instances.push(sprite_instance);
                break;
            case NodeType.LABEL:
                const lable_id = (node.data as ISprite).id;
                const lable_instance = castLabel2DefoldGoLabel(node.data as ILabel, getGoChildrens(lable_id, data));
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

function getGoChildrens(id: number, data: INodesList): string[] {
    return data.list.filter((node: NodeData) => {
        const is_go = node.type == NodeType.GO;
        const is_parent = (node.data as INodeEmpty).pid == id;
        return is_go && is_parent;
    }).map((node: NodeData) => {
        return (node.data as INodeEmpty).name;
    });
}

function getNodeBoxParent(pid: number, data: INodesList): string {
    return data.list.filter((node: NodeData) => {
        const is_node = (node.type == NodeType.GUI_BOX) || (node.type == NodeType.GUI_TEXT);
        const is_parent = (node.data as IGuiNode).id == pid;
        return is_node && is_parent;
    }).map((node: NodeData) => {
        return (node.data as IGuiNode).name;
    })[0];
}

function generateGui(data: INodesList): string {
    const gui = {} as IDefoldGui;
    gui.script = "";
    gui.nodes = [];
    gui.textures = [];
    gui.fonts = [];

    for (const node of data.list) {
        switch (node.type) {
            case NodeType.GUI_BOX:
                const box_data = node.data as IGuiBox;
                const box_node = castGuiBox2DefoldGuiNode(box_data);
                box_node.parent = getNodeBoxParent(box_data.pid, data);
                gui.nodes.push(box_node);
                if (box_data.atlas) {
                    gui.textures.push({
                        name: box_data.atlas.split(".")[0],
                        texture: box_data.atlas
                    });
                }
                break;
            case NodeType.GUI_TEXT:
                const text_data = node.data as IGuiText;
                const text_node = castGuiText2DefoldGuiNode(text_data);
                text_node.parent = getNodeBoxParent(text_data.pid, data);
                gui.nodes.push(text_node);
                gui.fonts.push({
                    name: text_data.font.split(".")[0],
                    font: text_data.font,
                });
                break;
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
        data: encodePrototype({
            embedded_components: [castSprite2DefoldEmbeddedComponent(data)]
        })
    };
}

function castLabel2DefoldGoLabel(data: ILabel, children?: string[]): IDefoldGo {
    return {
        id: data.name,
        position: data.position,
        rotation: data.rotation,
        scale3: data.scale,
        children,
        data: encodePrototype({
            embedded_components: [castLabel2DefoldEmbeddedComponent(data)]
        })
    };
}

function castSprite2DefoldSprite(data: ISprite): IDefoldSprite {
    return {
        textures: {
            sampler: "texture_sampler",
            texture: data.atlas
        },
        default_animation: data.texture
    };
}

function castLabel2DefoldLabel(data: ILabel): IDefoldLabel {
    return {
        text: data.text,
        font: data.font.split(".")[0] + ".font",
        size: new Vector4(data.width, data.height),
        scale: new Vector4(data.scale.x, data.scale.y, data.scale.z),
        color: castColor(data.color, 1),
        outline: castColor(data.outline, 1),
        shadow: castColor(data.shadow, 1),
        leading: data.leading,
        tracking: 0,
        pivot: DefoldPivot.PIVOT_CENTER,
        blend_mode: DefoldBlendMode.BLEND_MODE_ALPHA,
        line_break: data.line_break,
        material: "/builtins/fonts/label-df.material"
    };
}

function castSound2DefoldGoSound(data: ISound): IDefoldGo {
    return {
        id: data.name,
        position: new Vector3(0, 0, 0),
        rotation: new Vector3(0, 0, 0),
        scale3: new Vector3(1, 1, 1),
        data: encodePrototype({
            embedded_components: [castSound2DefoldEmbeddedComponent(data)]
        })
    };
}

function castIExtDependence2DefoldGoCollectionProxy(data: IExtDependencies): IDefoldGo {
    return {
        id: data.name,
        position: new Vector3(0, 0, 0),
        rotation: new Vector3(0, 0, 0),
        scale3: new Vector3(1, 1, 1),
        data: encodePrototype({
            embedded_components: [castExtDependencies2DefoldEmbeddedComponent(data)]
        })
    };
}

function castIExtDependence2DefoldGoCollectionFactory(data: IExtDependencies): IDefoldGo {
    return {
        id: data.name,
        position: new Vector3(0, 0, 0),
        rotation: new Vector3(0, 0, 0),
        scale3: new Vector3(1, 1, 1),
        data: encodePrototype({
            embedded_components: [castExtDependencies2DefoldEmbeddedComponent(data)]
        })
    };
}

function castIExtDependence2DefoldGoFactory(data: IExtDependencies): IDefoldGo {
    return {
        id: data.name,
        position: new Vector3(0, 0, 0),
        rotation: new Vector3(0, 0, 0),
        scale3: new Vector3(1, 1, 1),
        data: encodePrototype({
            embedded_components: [castExtDependencies2DefoldEmbeddedComponent(data)]
        })
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
        texture: data.atlas && data.texture ? data.atlas.split(".atlas")[0] + `/${data.texture}` : undefined,
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
        font: data.font.split(".")[0],
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

function castAtlas2DefoldAtlas(data: IAtlas): IDefoldAtlas {
    const atlas = {} as IDefoldAtlas;
    atlas.images = [];
    for (const image of data.images) {
        atlas.images.push({ image });
    }
    return atlas;
}

function castPrefab2DefoldProtorype(prefab: IPrefab): IDefoldPrototype {
    const prototype = {} as IDefoldPrototype;
    prototype.embedded_components = [];

    for (const data of prefab.data) {
        switch (data.type) {
            case PrefabComponentType.SPRITE:
                const sprite = data.data as ISprite;
                prototype.embedded_components.push(castSprite2DefoldEmbeddedComponent(sprite, true));
                break;
            case PrefabComponentType.LABEL:
                const label = data.data as ILabel;
                prototype.embedded_components.push(castLabel2DefoldEmbeddedComponent(label, true));
                break;
        }
    }

    return prototype;
}

function castSprite2DefoldEmbeddedComponent(sprite: ISprite, with_transform = false): IDefoldEmbeddedComponent {
    return {
        id: sprite.name,
        position: with_transform ? sprite.position : new Vector3(0, 0, 0),
        rotation: with_transform ? sprite.rotation : new Vector3(0, 0, 0),
        type: "sprite",
        data: encodeSprite(castSprite2DefoldSprite(sprite))
    };
}

function castLabel2DefoldEmbeddedComponent(label: ILabel, with_transform = false): IDefoldEmbeddedComponent {
    return {
        id: label.name,
        position: with_transform ? label.position : new Vector3(0, 0, 0),
        rotation: with_transform ? label.rotation : new Vector3(0, 0, 0),
        type: "label",
        data: encodeLabel(castLabel2DefoldLabel(label))
    };
}

function castSound2DefoldEmbeddedComponent(data: ISound): IDefoldEmbeddedComponent {
    return {
        id: data.name,
        position: new Vector3(0, 0, 0),
        rotation: new Vector3(0, 0, 0),
        type: "sound",
        data: encodeSound({
            sound: data.path,
            looping: data.loop ? 1 : 0,
            group: data.group,
            gain: data.gain,
            pan: data.pan,
            speed: data.speed
        })
    };
}

function castExtDependencies2DefoldEmbeddedComponent(data: IExtDependencies): IDefoldEmbeddedComponent {
    const component = {
        id: data.name,
        position: new Vector3(0, 0, 0),
        rotation: new Vector3(0, 0, 0),
        type: "",
        data: ""
    };

    switch (data.type) {
        case ExtDependenceType.COLLECTION_PROXY:
            component.type = "collectionproxy";
            component.data = encodeCollectionProxy({
                collection: data.path.split(".")[0] + ".collection"
            });
            break;
        case ExtDependenceType.COLLECTION_FACTORY:
            component.type = "collectionfactory";
            component.data = encodeCollectionFactory({
                prototype: data.path.split(".")[0] + ".collection"
            });
            break;
        case ExtDependenceType.GO_FACTORY:
            component.type = "factory";
            component.data = encodeFactory({
                prototype: data.path.split(".")[0] + ".go"
            });

            break;
    }

    return component;
}