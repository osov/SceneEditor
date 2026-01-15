/**
 * SceneService - сервис управления объектами сцены
 *
 * Управляет созданием, добавлением, удалением объектов.
 * Сериализация и десериализация сцены.
 */

import { Object3D } from 'three';
import type { ObjectTypes, BaseEntityData, IBaseEntity } from '@editor/core/render/types';
import type {
    ISceneService,
    ISceneObject,
    SceneServiceParams,
    SceneGraphItem,
} from './types';

/** Объявление глобального SceneManager */
declare const SceneManager: {
    create<T extends ObjectTypes>(type: T, params?: Record<string, unknown>, id?: number): IBaseEntity;
    serialize_mesh(mesh: IBaseEntity, clean_id_pid?: boolean, without_children?: boolean): BaseEntityData;
    deserialize_mesh(data: BaseEntityData, with_id?: boolean, parent?: Object3D): IBaseEntity;
    get_unique_id(): number;
    get_mesh_by_id(id: number): IBaseEntity | null;
    set_mesh_name(mesh: IBaseEntity, name: string): void;
    update_mesh_url(mesh: IBaseEntity): void;
    get_mesh_url_by_id(id: number): string | undefined;
    get_mesh_id_by_url(url: string): number | undefined;
    add(mesh: IBaseEntity, id_parent?: number, id_before?: number): void;
    remove(id: number): void;
    move_mesh(mesh: IBaseEntity, pid?: number, next_id?: number): void;
    move_mesh_id(id: number, pid?: number, next_id?: number): void;
    find_next_id_mesh(mesh: IBaseEntity): number;
    make_graph(): Array<{ id: number; pid: number; name: string; visible: boolean; type: ObjectTypes }>;
    get_scene_list(): IBaseEntity[];
};

/** Проверить является ли объект ISceneObject */
function is_scene_object(obj: Object3D): obj is ISceneObject {
    return 'mesh_data' in obj && typeof (obj as ISceneObject).mesh_data?.id === 'number';
}

/** Создать SceneService */
export function create_scene_service(params: SceneServiceParams): ISceneService {
    const { logger, event_bus, render_service } = params;

    // Внутреннее состояние
    let id_counter = 0;
    const mesh_url_to_id = new Map<string, number>();
    const mesh_id_to_url = new Map<number, string>();

    function get_unique_id(): number {
        while (true) {
            id_counter++;
            if (get_by_id(id_counter) === undefined) {
                return id_counter;
            }
        }
    }

    function create<T extends ObjectTypes>(type: T, params_obj?: Record<string, unknown>): ISceneObject {
        logger.debug(`Создание объекта типа ${type}`);

        // Делегируем создание legacy SceneManager
        // который знает как создавать все типы объектов (Slice9Mesh, TextMesh и т.д.)
        if (typeof SceneManager !== 'undefined') {
            const mesh = SceneManager.create(type, params_obj);
            event_bus.emit('scene:object_created', { id: mesh.mesh_data.id, type });
            return mesh as unknown as ISceneObject;
        }

        // Fallback если SceneManager недоступен
        const id = get_unique_id();
        const obj = new Object3D() as Object3D & { mesh_data: ISceneObject['mesh_data'] };

        obj.mesh_data = {
            id,
            type,
            name: `${type}_${id}`,
            ...params_obj,
        };

        obj.name = obj.mesh_data.name as string;

        event_bus.emit('scene:object_created', { id, type });

        return obj as ISceneObject;
    }

    function add(object: ISceneObject, parent_id?: number, before_id?: number): void {
        // Делегируем SceneManager для корректной обработки иерархии
        if (typeof SceneManager !== 'undefined') {
            SceneManager.add(object as unknown as IBaseEntity, parent_id ?? -1, before_id ?? -1);
        } else {
            const scene = render_service.scene;
            scene.add(object);
            update_mesh_url(object);
        }

        logger.debug(`Объект ${object.mesh_data.id} добавлен в сцену`);
        event_bus.emit('scene:object_added', { id: object.mesh_data.id });
    }

    function remove(object: ISceneObject): void {
        const id = object.mesh_data.id;

        event_bus.emit('scene:object_removing', { id });

        // Делегируем SceneManager для корректного удаления
        if (typeof SceneManager !== 'undefined') {
            SceneManager.remove(id);
        } else {
            // Удаляем из URL маппинга
            const url = mesh_id_to_url.get(id);
            if (url !== undefined) {
                mesh_url_to_id.delete(url);
                mesh_id_to_url.delete(id);
            }

            // Удаляем из сцены
            if (object.parent !== null) {
                object.parent.remove(object);
            }
        }

        logger.debug(`Объект ${id} удалён из сцены`);
        event_bus.emit('scene:object_removed', { id });
    }

    function get_by_id(id: number): ISceneObject | undefined {
        // Делегируем SceneManager
        if (typeof SceneManager !== 'undefined') {
            const mesh = SceneManager.get_mesh_by_id(id);
            return mesh !== null ? mesh as unknown as ISceneObject : undefined;
        }

        // Fallback
        const scene = render_service.scene;
        let result: ISceneObject | undefined;

        scene.traverse((child) => {
            if (is_scene_object(child) && child.mesh_data.id === id) {
                result = child;
            }
        });

        return result;
    }

    function get_all(): ISceneObject[] {
        const scene = render_service.scene;
        const result: ISceneObject[] = [];

        scene.traverse((child) => {
            if (is_scene_object(child)) {
                result.push(child);
            }
        });

        return result;
    }

    function clear(): void {
        const scene = render_service.scene;

        // Удаляем все объекты сцены
        for (let i = scene.children.length - 1; i >= 0; i--) {
            const child = scene.children[i];
            if (is_scene_object(child)) {
                scene.remove(child);
            }
        }

        // Очищаем маппинги
        mesh_url_to_id.clear();
        mesh_id_to_url.clear();
        id_counter = 0;

        logger.info('Сцена очищена');
        event_bus.emit('scene:cleared', {});
    }

    function serialize(): BaseEntityData[] {
        const result: BaseEntityData[] = [];
        const scene = render_service.scene;

        for (const child of scene.children) {
            if (is_scene_object(child)) {
                result.push(serialize_object(child));
            }
        }

        return result;
    }

    function deserialize(data: BaseEntityData[]): void {
        clear();

        for (const item of data) {
            deserialize_object(item);
        }

        logger.info(`Десериализовано ${data.length} объектов`);
        event_bus.emit('scene:loaded', { count: data.length });
    }

    function serialize_object(object: ISceneObject): BaseEntityData {
        // Делегируем SceneManager для корректной сериализации
        if (typeof SceneManager !== 'undefined') {
            return SceneManager.serialize_mesh(object as unknown as IBaseEntity, true);
        }

        // Fallback
        const position = object.position.toArray() as [number, number, number];
        const rotation = object.quaternion.toArray() as [number, number, number, number];
        const scale: [number, number] = [object.scale.x, object.scale.y];

        const data: BaseEntityData = {
            id: object.mesh_data.id,
            pid: get_parent_id(object),
            type: (object.mesh_data.type as ObjectTypes) ?? ('empty' as ObjectTypes),
            name: object.name,
            visible: object.visible,
            position,
            rotation,
            scale,
            other_data: { ...object.mesh_data },
        };

        // Сериализуем детей
        const children: BaseEntityData[] = [];
        for (const child of object.children) {
            if (is_scene_object(child)) {
                children.push(serialize_object(child));
            }
        }

        if (children.length > 0) {
            data.children = children;
        }

        return data;
    }

    function deserialize_object(data: BaseEntityData, parent?: ISceneObject): ISceneObject {
        const object = create(data.type, data.other_data);

        // Восстанавливаем трансформацию
        if (data.position !== undefined) {
            object.position.set(data.position[0], data.position[1], data.position[2]);
        }
        if (data.rotation !== undefined) {
            object.quaternion.set(data.rotation[0], data.rotation[1], data.rotation[2], data.rotation[3]);
        }
        if (data.scale !== undefined) {
            object.scale.set(data.scale[0], data.scale[1], 1);
        }

        object.name = data.name;
        object.visible = data.visible;

        // Добавляем к родителю или в сцену
        if (parent !== undefined) {
            parent.add(object);
        } else {
            add(object);
        }

        // Десериализуем детей
        if (data.children !== undefined) {
            for (const childData of data.children) {
                deserialize_object(childData, object);
            }
        }

        return object;
    }

    function get_parent_id(object: ISceneObject): number | undefined {
        if (object.parent !== null && is_scene_object(object.parent)) {
            return object.parent.mesh_data.id;
        }
        return undefined;
    }

    function update_mesh_url(mesh: ISceneObject): void {
        // Строим полный путь
        let fullPath = mesh.name;
        let parent = mesh.parent;

        while (parent !== null && is_scene_object(parent)) {
            fullPath = parent.name + '/' + fullPath;
            parent = parent.parent;
        }

        fullPath = ':/' + fullPath;

        // Удаляем старый путь
        const oldUrl = mesh_id_to_url.get(mesh.mesh_data.id);
        if (oldUrl !== undefined) {
            mesh_url_to_id.delete(oldUrl);
        }

        // Сохраняем новый
        mesh_url_to_id.set(fullPath, mesh.mesh_data.id);
        mesh_id_to_url.set(mesh.mesh_data.id, fullPath);
    }

    function get_by_url(url: string): ISceneObject | undefined {
        // Делегируем SceneManager
        if (typeof SceneManager !== 'undefined') {
            const mesh_id = SceneManager.get_mesh_id_by_url(url);
            if (mesh_id !== undefined) {
                return get_by_id(mesh_id);
            }
            return undefined;
        }

        // Fallback
        const id = mesh_url_to_id.get(url);
        if (id === undefined) {
            return undefined;
        }
        return get_by_id(id);
    }

    function get_url_by_id(id: number): string | undefined {
        // Делегируем SceneManager
        if (typeof SceneManager !== 'undefined') {
            return SceneManager.get_mesh_url_by_id(id);
        }

        return mesh_id_to_url.get(id);
    }

    function move(object: ISceneObject, parent_id: number, before_id: number): void {
        // Делегируем SceneManager
        if (typeof SceneManager !== 'undefined') {
            SceneManager.move_mesh(object as unknown as IBaseEntity, parent_id, before_id);
            event_bus.emit('scene:object_moved', { id: object.mesh_data.id, parent_id, before_id });
            return;
        }

        logger.warn('move: SceneManager недоступен, операция не выполнена');
    }

    function move_by_id(id: number, parent_id: number, before_id: number): void {
        // Делегируем SceneManager
        if (typeof SceneManager !== 'undefined') {
            SceneManager.move_mesh_id(id, parent_id, before_id);
            event_bus.emit('scene:object_moved', { id, parent_id, before_id });
            return;
        }

        // Fallback
        const object = get_by_id(id);
        if (object !== undefined) {
            move(object, parent_id, before_id);
        } else {
            logger.error(`move_by_id: объект с id ${id} не найден`);
        }
    }

    function set_name(object: ISceneObject, name: string): void {
        // Делегируем SceneManager
        if (typeof SceneManager !== 'undefined') {
            SceneManager.set_mesh_name(object as unknown as IBaseEntity, name);
            event_bus.emit('scene:object_renamed', { id: object.mesh_data.id, name });
            return;
        }

        // Fallback
        object.name = name;
        update_mesh_url(object);
        event_bus.emit('scene:object_renamed', { id: object.mesh_data.id, name });
    }

    function find_next_sibling_id(object: ISceneObject): number {
        // Делегируем SceneManager
        if (typeof SceneManager !== 'undefined') {
            return SceneManager.find_next_id_mesh(object as unknown as IBaseEntity);
        }

        // Fallback
        const parent = object.parent;
        if (parent === null) {
            return -1;
        }

        const index = parent.children.indexOf(object);
        if (index === -1 || index === parent.children.length - 1) {
            return -1;
        }

        for (let i = index + 1; i < parent.children.length; i++) {
            const child = parent.children[i];
            if (is_scene_object(child)) {
                return child.mesh_data.id;
            }
        }

        return -1;
    }

    function make_graph(): SceneGraphItem[] {
        // Делегируем SceneManager
        if (typeof SceneManager !== 'undefined') {
            return SceneManager.make_graph() as SceneGraphItem[];
        }

        // Fallback
        const result: SceneGraphItem[] = [];
        const scene = render_service.scene;

        scene.traverse((child) => {
            if (is_scene_object(child)) {
                let pid = -1;
                if (child.parent !== null && is_scene_object(child.parent)) {
                    pid = child.parent.mesh_data.id;
                }
                result.push({
                    id: child.mesh_data.id,
                    pid,
                    name: child.name,
                    visible: child.visible,
                    type: (child.mesh_data.type ?? 'empty') as ObjectTypes,
                });
            }
        });

        return result;
    }

    function dispose(): void {
        clear();
        logger.info('SceneService освобождён');
    }

    return {
        create,
        add,
        remove,
        get_by_id,
        get_by_url,
        get_url_by_id,
        get_all,
        clear,
        serialize,
        deserialize,
        serialize_object,
        get_unique_id,
        move,
        move_by_id,
        set_name,
        find_next_sibling_id,
        make_graph,
        dispose,
    };
}
