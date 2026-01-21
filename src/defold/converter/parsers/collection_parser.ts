/**
 * Collection Parser - генерация коллекций для Defold
 */

import { Vector3, Vector4 } from 'three';
import {
    type IExtDependencies,
    type IGuiNode,
    type ILabel,
    type INodeEmpty,
    type INodesList,
    type ISound,
    type ISpineModel,
    type ISprite,
    NodeType,
} from '../convert_types';
import {
    encodeCollection,
    encodePrototype,
    type IDefoldCollection,
    type IDefoldCollectionFile,
    type IDefoldEmbeddedComponent,
    type IDefoldGo,
} from '../defold_encoder';
import { eulerToQuaternion } from '../../../modules/utils';
import { getNameFromPath } from './utils';
import {
    castSprite2DefoldEmbeddedComponent,
    castLabel2DefoldEmbeddedComponent,
    castSpineModel2DefoldEmbeddedComponent,
    castSound2DefoldGoSound,
    castIExtDependence2DefoldGoCollectionProxy,
    castIExtDependence2DefoldGoCollectionFactory,
    castIExtDependence2DefoldGoFactory,
} from './component_parser';

/** Конвертировать пустую ноду в DefoldGo */
export function castNodeEmpty2DefoldGo(data: INodeEmpty, children?: string[]): IDefoldGo {
    return {
        id: data.name,
        position: data.position,
        rotation: eulerToQuaternion(data.rotation),
        scale3: data.scale,
        children,
        data: ''
    };
}

/** Конвертировать GUI в DefoldGo */
export function castGui2DefoldGo(data: IGuiNode, children?: string[]): IDefoldGo {
    return {
        id: 'ui',
        position: new Vector3(),
        rotation: new Vector4(),
        scale3: new Vector3(1, 1, 1),
        children,
        data: encodePrototype({
            components: [{
                id: getNameFromPath(data.name),
                component: data.name + '.gui'
            }]
        })
    };
}

/** Конвертировать NodesList в DefoldCollectionFile */
export function castNodeList2DefoldCollection(data: INodesList): IDefoldCollectionFile {
    const name = getNameFromPath(data.name);
    return {
        id: name,
        collection: data.name + '.collection'
    };
}

/** Собрать данные для коллекции */
function gatherCollectionData(
    data: INodesList,
    collection: IDefoldCollection,
    instances: { [key: number]: IDefoldGo },
    embeddedComponents: { [key: number]: IDefoldEmbeddedComponent[] }
): void {
    for (const node of data.list) {
        switch (node.type) {
            case NodeType.COLLECTION: {
                const collection_instance = castNodeList2DefoldCollection(node.data as INodesList);
                collection.collection_instances.push(collection_instance);
                break;
            }
            case NodeType.GUI: {
                const ui_instance = castGui2DefoldGo(node.data as IGuiNode);
                collection.embedded_instances.push(ui_instance);
                break;
            }
            case NodeType.GO: {
                const go_id = (node.data as INodeEmpty).id;
                const go_instance = castNodeEmpty2DefoldGo(node.data as INodeEmpty);
                instances[go_id] = go_instance;
                break;
            }
            case NodeType.SPRITE: {
                const sprite_data = node.data as ISprite;
                if (!embeddedComponents[sprite_data.pid]) {
                    embeddedComponents[sprite_data.pid] = [];
                }
                embeddedComponents[sprite_data.pid].push(castSprite2DefoldEmbeddedComponent(sprite_data));
                break;
            }
            case NodeType.LABEL: {
                const label_data = node.data as ILabel;
                if (!embeddedComponents[label_data.pid]) {
                    embeddedComponents[label_data.pid] = [];
                }
                embeddedComponents[label_data.pid].push(castLabel2DefoldEmbeddedComponent(label_data));
                break;
            }
            case NodeType.SPINE_MODEL: {
                const spine_data = node.data as ISpineModel;
                if (!embeddedComponents[spine_data.pid]) {
                    embeddedComponents[spine_data.pid] = [];
                }
                embeddedComponents[spine_data.pid].push(castSpineModel2DefoldEmbeddedComponent(spine_data));
                break;
            }
            case NodeType.SOUND: {
                const sound_instance = castSound2DefoldGoSound(node.data as ISound);
                collection.embedded_instances.push(sound_instance);
                break;
            }
            case NodeType.COLLECTION_PROXY: {
                const collection_proxy_instance = castIExtDependence2DefoldGoCollectionProxy(node.data as IExtDependencies);
                collection.embedded_instances.push(collection_proxy_instance);
                break;
            }
            case NodeType.COLLECTION_FACTORY: {
                const collection_factory_instance = castIExtDependence2DefoldGoCollectionFactory(node.data as IExtDependencies);
                collection.embedded_instances.push(collection_factory_instance);
                break;
            }
            case NodeType.FACTORY: {
                const factory_instance = castIExtDependence2DefoldGoFactory(node.data as IExtDependencies);
                collection.embedded_instances.push(factory_instance);
                break;
            }
        }
    }
}

/** Связать дочерние GO с родительскими */
function linkGoChildren(
    collection: IDefoldCollection,
    instances: { [key: number]: IDefoldGo },
    data: INodesList
): void {
    for (const [id, instance] of Object.entries(instances)) {
        const node = data.list.find(n => (n.data as { id?: number }).id === Number(id));
        if (node && (node.data as { pid?: number }).pid) {
            const parentId = (node.data as { pid: number }).pid;
            const parent = instances[parentId];
            if (parent) {
                if (!parent.children) parent.children = [];
                parent.children.push(instance.id);
            }
        }
        collection.embedded_instances.push(instance);
    }
}

/** Создать прототипы для GO со встроенными компонентами */
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

/** Генерация коллекции */
export function generateCollection(data: INodesList): string {
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
