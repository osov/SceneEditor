import { Vector3, Vector4 } from "three";

import {
    ExtDependenceType,
    IAtlas,
    IExtDependencies,
    IFont,
    IGuiBox,
    IGuiNode,
    IGuiSpine,
    IGuiText,
    ILabel,
    INodeEmpty,
    INodesList,
    IPrefab,
    ISound,
    ISpineModel,
    ISpineScene,
    ISprite,
    NodeData,
    NodeType,
    PrefabComponentType
} from "./convert_types";

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
    encodeCollectionFactory,
    encodeCollectionProxy,
    encodeFactory,
    IDefoldEmbeddedComponent,
    DefoldSizeMode,
    DefoldFontTextureFormat,
    encodeSpineScene,
    IDefoldSpineScene,
    encodeSpineModel,
    IDefoldSpineModel,
    IDefoldResource
} from "./defold_encoder";
import { eulerToQuaternion, hexToRGB } from "../modules/utils";
import { PivotX, PivotY } from "../render_engine/types";


export enum DefoldType {
    COLLECTION,
    GO,
    GUI,
    ATLAS,
    FONT,
    SPINE
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

export function parseSpineScene(data: ISpineScene): DefoldData {
    return {
        name: data.name,
        type: DefoldType.SPINE,
        data: encodeSpineScene(castSpine2DefoldSpineScene(data))
    };
}

export function parseFont(data: IFont): DefoldData {
    return {
        name: data.font.split(".")[0],
        type: DefoldType.FONT,
        data: encodeFont({
            font: data.font,
            material: "/builtins/fonts/font-df.material",
            outline_alpha: data.outline_alpha,
            outline_width: data.outline_width,
            shadow_alpha: data.shadow_alpha,
            shadow_x: data.shadow_x,
            shadow_y: data.shadow_y,
            shadow_blur: data.shadow_blur,
            output_format: DefoldFontTextureFormat.TYPE_DISTANCE_FIELD,
            alpha: data.alpha,
            size: data.size,
            all_chars: true
        })
    };
}

function generateCollection(data: INodesList): string {
    const collection = {
        name: getNameFromPath(data.name),
        embedded_instances: [] as IDefoldGo[],
        collection_instances: [] as IDefoldCollectionFile[]
    } as IDefoldCollection;

    const instances: { [key: number]: IDefoldGo } = {};
    const embeddedComponents: { [key: number]: IDefoldEmbeddedComponent[] } = {};

    // NOTE: Начальная настройка и сбор данных
    gatherCollectionData(data, collection, instances, embeddedComponents);

    // NOTE: Связывание дочерних GO с родительскими
    linkGoChildren(collection, instances, data);

    // NOTE: Создание прототипов для GO со встроенными компонентами
    createGoPrototypes(instances, embeddedComponents);

    return encodeCollection(collection);
}

function gatherCollectionData(
    data: INodesList,
    collection: IDefoldCollection,
    instances: { [key: number]: IDefoldGo },
    embeddedComponents: { [key: number]: IDefoldEmbeddedComponent[] }
): void {
    for (const node of data.list) {
        switch (node.type) {
            case NodeType.COLLECTION:
                const collection_instance = castNodeList2DefoldCollection(node.data as INodesList);
                collection.collection_instances.push(collection_instance);
                break;
            case NodeType.GUI:
                const ui_instance = castGui2DefoldGo(node.data as IGuiNode);
                collection.embedded_instances.push(ui_instance);
                break;
            case NodeType.GO:
                const go_id = (node.data as INodeEmpty).id;
                const go_instance = castNodeEmpty2DefoldGo(node.data as INodeEmpty);
                instances[go_id] = go_instance;
                break;
            case NodeType.SPRITE:
                const sprite_data = node.data as ISprite;
                if (!embeddedComponents[sprite_data.pid]) {
                    embeddedComponents[sprite_data.pid] = [];
                }
                embeddedComponents[sprite_data.pid].push(castSprite2DefoldEmbeddedComponent(sprite_data));
                break;
            case NodeType.LABEL:
                const label_data = node.data as ILabel;
                if (!embeddedComponents[label_data.pid]) {
                    embeddedComponents[label_data.pid] = [];
                }
                embeddedComponents[label_data.pid].push(castLabel2DefoldEmbeddedComponent(label_data));
                break;
            case NodeType.SPINE_MODEL:
                const spine_data = node.data as ISpineModel;
                if (!embeddedComponents[spine_data.pid]) {
                    embeddedComponents[spine_data.pid] = [];
                }
                embeddedComponents[spine_data.pid].push(castSpineModel2DefoldEmbeddedComponent(spine_data));
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
}

function linkGoChildren(
    collection: IDefoldCollection,
    instances: { [key: number]: IDefoldGo },
    data: INodesList
): void {
    for (const [id, instance] of Object.entries(instances)) {
        const node = data.list.find(n => (n.data as any).id === Number(id));
        if (node && (node.data as any).pid) {
            const parentId = (node.data as any).pid;
            const parent = instances[parentId];
            if (parent) {
                if (!parent.children) parent.children = [];
                parent.children.push(instance.id);
            }
        }
        collection.embedded_instances.push(instance);
    }
}

function createGoPrototypes(
    instances: { [key: number]: IDefoldGo },
    embeddedComponents: { [key: number]: IDefoldEmbeddedComponent[] }
): void {
    for (const [goId, go] of Object.entries(instances)) {
        const components = embeddedComponents[Number(goId)];
        if (components && components.length > 0) {
            go.data = encodePrototype({
                embedded_components: components
            });
        }
    }
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
    gui.resources = [];

    // NOTE: для уникальности атласов
    const uniqueAtlases = new Set<string>();

    for (const node of data.list) {
        switch (node.type) {
            case NodeType.GUI_BOX:
                const box_data = node.data as IGuiBox;
                const box_node = castGuiBox2DefoldGuiNode(box_data);
                box_node.parent = getNodeBoxParent(box_data.pid, data);
                gui.nodes.push(box_node);
                if (box_data.atlas) {
                    const box_node_name = box_data.atlas.split(".")[0];
                    if (!uniqueAtlases.has(box_node_name)) {
                        uniqueAtlases.add(box_node_name);
                        gui.textures.push({
                            name: getNameFromPath(box_node_name),
                            texture: box_data.atlas
                        });
                    }
                }
                break;
            case NodeType.GUI_TEXT:
                const text_data = node.data as IGuiText;
                const text_node = castGuiText2DefoldGuiNode(text_data);
                text_node.parent = getNodeBoxParent(text_data.pid, data);
                gui.nodes.push(text_node);
                const text_node_name = text_data.font.split(".")[0];
                if (!uniqueAtlases.has(text_node_name)) {
                    uniqueAtlases.add(text_node_name);
                    gui.fonts.push({
                        name: getNameFromPath(text_node_name),
                        font: text_data.font,
                    });
                }
                break;
            case NodeType.GUI_SPINE:
                const spine_data = node.data as IGuiSpine;
                const spine_node = castGuiSpine2DefoldGuiNode(spine_data);
                spine_node.parent = getNodeBoxParent(spine_data.pid, data);
                gui.nodes.push(spine_node);
                const spine_node_name = spine_data.spine_scene.split(".")[0];
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

    return encodeGui(gui);
}

function castNodeEmpty2DefoldGo(data: INodeEmpty, children?: string[]): IDefoldGo {
    return {
        id: data.name,
        position: data.position,
        rotation: eulerToQuaternion(data.rotation),
        scale3: data.scale,
        children,
        data: ""
    };
}

function castGui2DefoldGo(data: IGuiNode, children?: string[]): IDefoldGo {
    return {
        id: "ui",
        position: new Vector3(),
        rotation: new Vector4(),
        scale3: new Vector3(1, 1, 1),
        children,
        data: encodePrototype({
            components: [{
                id: getNameFromPath(data.name),
                component: data.name + ".gui"
            }]
        })
    };
}

function castSprite2DefoldSprite(data: ISprite): IDefoldSprite {
    return {
        textures: {
            sampler: "texture_sampler",
            texture: data.atlas
        },
        default_animation: data.texture,
        size_mode: DefoldSizeMode.SIZE_MODE_MANUAL,
        size: new Vector3(data.width, data.height),
        slice9: new Vector4(data.slice_width, data.slice_height, data.slice_width, data.slice_height)
    };
}

function castLabel2DefoldLabel(data: ILabel): IDefoldLabel {
    return {
        text: data.text,
        font: data.font.split(".")[0] + ".font",
        size: new Vector4(data.width, data.height),
        scale: new Vector4(data.scale.x, data.scale.y, data.scale.z),
        color: castColor(data.color),
        outline: castColor(data.outline),
        shadow: castColor(data.shadow),
        leading: data.leading,
        tracking: 0,
        pivot: DefoldPivot.PIVOT_CENTER,
        blend_mode: DefoldBlendMode.BLEND_MODE_ALPHA,
        line_break: data.line_break,
        material: "/builtins/fonts/label-df.material"
    };
}

function castSpineModel2DefoldSpineModel(data: ISpineModel): IDefoldSpineModel {
    return {
        spine_scene: data.spine_scene,
        default_animation: data.default_animation,
        skin: data.skin
    };
}

function castSound2DefoldGoSound(data: ISound): IDefoldGo {
    return {
        id: data.name,
        position: new Vector3(),
        rotation: new Vector4(),
        scale3: new Vector3(1, 1, 1),
        data: encodePrototype({
            embedded_components: [castSound2DefoldEmbeddedComponent(data)]
        })
    };
}

function castIExtDependence2DefoldGoCollectionProxy(data: IExtDependencies): IDefoldGo {
    return {
        id: data.name,
        position: new Vector3(),
        rotation: new Vector4(),
        scale3: new Vector3(1, 1, 1),
        data: encodePrototype({
            embedded_components: [castExtDependencies2DefoldEmbeddedComponent(data)]
        })
    };
}

function castIExtDependence2DefoldGoCollectionFactory(data: IExtDependencies): IDefoldGo {
    return {
        id: data.name,
        position: new Vector3(),
        rotation: new Vector4(),
        scale3: new Vector3(1, 1, 1),
        data: encodePrototype({
            embedded_components: [castExtDependencies2DefoldEmbeddedComponent(data)]
        })
    };
}

function castIExtDependence2DefoldGoFactory(data: IExtDependencies): IDefoldGo {
    return {
        id: data.name,
        position: new Vector3(),
        rotation: new Vector4(),
        scale3: new Vector3(1, 1, 1),
        data: encodePrototype({
            embedded_components: [castExtDependencies2DefoldEmbeddedComponent(data)]
        })
    };
}

function castNodeList2DefoldCollection(data: INodesList): IDefoldCollectionFile {
    const name = getNameFromPath(data.name);
    return {
        id: name,
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
        size_mode: DefoldSizeMode.SIZE_MODE_MANUAL,
        size: new Vector4(data.width, data.height),
        color: castColor(data.color),
        enabled: data.enabled,
        visible: data.visible,
        texture: data.atlas && data.texture ? getNameFromPath(data.atlas) + `/${data.texture}` : undefined,
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

function castGuiSpine2DefoldGuiNode(data: IGuiSpine): IDefoldGuiNode {
    return {
        id: data.name,
        type: DefoldGuiNodeType.TYPE_SPINE,
        position: new Vector4(data.position.x, data.position.y, data.position.z),
        rotation: new Vector4(data.rotation.x, data.rotation.y, data.rotation.z),
        scale: new Vector4(data.scale.x, data.scale.y, data.scale.z),
        color: castColor(data.color),
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

function castStencil(stencil: boolean): DefoldClippingMode {
    if (stencil) return DefoldClippingMode.CLIPPING_MODE_STENCIL;
    return DefoldClippingMode.CLIPPING_MODE_NONE;
}

function castPivot(data: number[]): DefoldPivot {
    const x = data[0];
    const y = data[1];

    const is_n = (x == PivotX.CENTER) && (y == PivotY.TOP);
    if (is_n) return DefoldPivot.PIVOT_N;

    const is_ne = (x == PivotX.RIGHT) && (y == PivotY.TOP);
    if (is_ne) return DefoldPivot.PIVOT_NE;

    const is_e = (x == PivotX.RIGHT) && (y == PivotY.CENTER);
    if (is_e) return DefoldPivot.PIVOT_E;

    const is_se = (x == PivotX.RIGHT) && (y == PivotY.BOTTOM);
    if (is_se) return DefoldPivot.PIVOT_SE;

    const is_s = (x == PivotX.CENTER) && (y == PivotY.BOTTOM);
    if (is_s) return DefoldPivot.PIVOT_S;

    const is_sw = (x == PivotX.LEFT) && (y == PivotY.BOTTOM);
    if (is_sw) return DefoldPivot.PIVOT_SW;

    const is_w = (x == PivotX.LEFT) && (y == PivotY.CENTER);
    if (is_w) return DefoldPivot.PIVOT_W;

    const is_nw = (x == PivotX.LEFT) && (y == PivotY.TOP);
    if (is_nw) return DefoldPivot.PIVOT_NW;

    return DefoldPivot.PIVOT_CENTER;
}

function castColor(hex_rgb: string): Vector3 {
    const color = hexToRGB(hex_rgb);
    return new Vector3(color.x, color.y, color.z);
}

function castAtlas2DefoldAtlas(data: IAtlas): IDefoldAtlas {
    const atlas = {} as IDefoldAtlas;
    atlas.images = [];
    for (const image of data.images) {
        atlas.images.push({ image });
    }
    return atlas;
}

function castSpine2DefoldSpineScene(data: ISpineScene): IDefoldSpineScene {
    return {
        spine_json: data.json,
        atlas: data.atlas
    };
}

function castPrefab2DefoldProtorype(prefab: IPrefab): IDefoldPrototype {
    const prototype = {} as IDefoldPrototype;
    prototype.embedded_components = [];

    for (const data of prefab.data) {
        switch (data.type) {
            case PrefabComponentType.SPRITE:
                const sprite = data.data as ISprite;
                prototype.embedded_components.push(castSprite2DefoldEmbeddedComponent(sprite));
                break;
            case PrefabComponentType.LABEL:
                const label = data.data as ILabel;
                prototype.embedded_components.push(castLabel2DefoldEmbeddedComponent(label));
                break;
        }
    }

    return prototype;
}

function castSprite2DefoldEmbeddedComponent(sprite: ISprite): IDefoldEmbeddedComponent {
    return {
        id: sprite.name,
        position: sprite.position,
        rotation: eulerToQuaternion(sprite.rotation),
        scale: sprite.scale,
        type: "sprite",
        data: encodeSprite(castSprite2DefoldSprite(sprite))
    };
}

function castLabel2DefoldEmbeddedComponent(label: ILabel): IDefoldEmbeddedComponent {
    return {
        id: label.name,
        position: label.position,
        rotation: eulerToQuaternion(label.rotation),
        scale: label.scale,
        type: "label",
        data: encodeLabel(castLabel2DefoldLabel(label))
    };
}

function castSpineModel2DefoldEmbeddedComponent(spine_model: ISpineModel): IDefoldEmbeddedComponent {
    return {
        id: spine_model.name,
        position: spine_model.position,
        rotation: eulerToQuaternion(spine_model.rotation),
        scale: spine_model.scale,
        type: "spinemodel",
        data: encodeSpineModel(castSpineModel2DefoldSpineModel(spine_model))
    };
}

function castSound2DefoldEmbeddedComponent(data: ISound): IDefoldEmbeddedComponent {
    return {
        id: data.name,
        position: new Vector3(),
        rotation: new Vector4(),
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
        position: new Vector3(),
        rotation: new Vector4(),
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

function getNameFromPath(data: string): string {
    data = data.split(".")[0];
    const match = data.match(/\/([^\/]+)$/);
    return match ? match[1] : "error";
}