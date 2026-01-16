/**
 * SceneService - сервис управления объектами сцены
 *
 * Управляет созданием, добавлением, удалением объектов.
 * Сериализация и десериализация сцены.
 */

import { Object3D, Quaternion, Vector2, Vector3 } from 'three';
import { ObjectTypes, type BaseEntityData } from '@editor/core/render/types';
import { IObjectTypes } from '@editor/render_engine/types';
import type {
    ISceneService,
    ISceneObject,
    SceneServiceParams,
    SceneGraphItem,
} from './types';
import { filter_list_base_mesh, is_base_mesh, is_label, is_sprite, is_text } from '@editor/render_engine/helpers/utils';
import { FLOAT_PRECISION } from '@editor/config';
import { deepClone } from '@editor/modules/utils';

// Импорты классов объектов
import { Slice9Mesh } from '@editor/render_engine/objects/slice9';
import { TextMesh } from '@editor/render_engine/objects/text';
import { GoContainer, GoSprite, GoText, GuiBox, GuiContainer, GuiText } from '@editor/render_engine/objects/sub_types';
import { AnimatedMesh } from '@editor/render_engine/objects/animated_mesh';
import { EntityBase } from '@editor/render_engine/objects/entity_base';
import { Component } from '@editor/render_engine/components/container_component';
import { Model } from '@editor/render_engine/objects/model';
import { AudioMesh } from '@editor/render_engine/objects/audio_mesh';
import { MultipleMaterialMesh } from '@editor/render_engine/objects/multiple_material_mesh';

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

    function check_id_is_available_or_generate_new(id: number): number {
        if (id !== -1) {
            const m = get_by_id(id);
            if (m !== undefined) {
                const new_id = get_unique_id();
                logger.error('mesh with id already exists', id, 'generated new id', new_id);
                return new_id;
            }
            return id;
        }
        return get_unique_id();
    }

    function create<T extends ObjectTypes>(type: T, params_obj?: Record<string, unknown>, id = -1): ISceneObject {
        let mesh: ISceneObject;
        const p = params_obj || {};
        const default_size = 10;

        // base
        if (type === ObjectTypes.ENTITY || type === ObjectTypes.EMPTY) {
            mesh = new EntityBase(check_id_is_available_or_generate_new(id)) as unknown as ISceneObject;
        }
        else if (type === ObjectTypes.SLICE9_PLANE) {
            mesh = new Slice9Mesh(
                check_id_is_available_or_generate_new(id),
                (p.width as number) || default_size,
                (p.height as number) || default_size,
                (p.slice_width as number) || 0,
                (p.slice_height as number) || 0
            ) as unknown as ISceneObject;
        }
        else if (type === ObjectTypes.TEXT) {
            mesh = new TextMesh(
                check_id_is_available_or_generate_new(id),
                (p.text as string) || '',
                (p.width as number) || default_size,
                (p.height as number) || default_size
            ) as unknown as ISceneObject;
        }
        // gui
        else if (type === ObjectTypes.GUI_CONTAINER) {
            mesh = new GuiContainer(check_id_is_available_or_generate_new(id)) as unknown as ISceneObject;
        }
        else if (type === ObjectTypes.GUI_BOX) {
            mesh = new GuiBox(
                check_id_is_available_or_generate_new(id),
                (p.width as number) || default_size,
                (p.height as number) || default_size,
                (p.slice_width as number) || 0,
                (p.slice_height as number) || 0
            ) as unknown as ISceneObject;
        }
        else if (type === ObjectTypes.GUI_TEXT) {
            mesh = new GuiText(
                check_id_is_available_or_generate_new(id),
                (p.text as string) || '',
                (p.width as number) || default_size,
                (p.height as number) || default_size
            ) as unknown as ISceneObject;
        }
        // go
        else if (type === ObjectTypes.GO_CONTAINER) {
            mesh = new GoContainer(check_id_is_available_or_generate_new(id)) as unknown as ISceneObject;
        }
        // go components
        else if (type === ObjectTypes.GO_SPRITE_COMPONENT) {
            mesh = new GoSprite(
                check_id_is_available_or_generate_new(id),
                (p.width as number) || default_size,
                (p.height as number) || default_size,
                (p.slice_width as number) || 0,
                (p.slice_height as number) || 0
            ) as unknown as ISceneObject;
        }
        else if (type === ObjectTypes.GO_LABEL_COMPONENT) {
            mesh = new GoText(
                check_id_is_available_or_generate_new(id),
                (p.text as string) || '',
                (p.width as number) || default_size,
                (p.height as number) || default_size
            ) as unknown as ISceneObject;
        }
        else if (type === ObjectTypes.GO_MODEL_COMPONENT) {
            mesh = new Model(
                check_id_is_available_or_generate_new(id),
                (p.width as number) || default_size,
                (p.height as number) || default_size
            ) as unknown as ISceneObject;
        }
        else if (type === ObjectTypes.GO_ANIMATED_MODEL_COMPONENT) {
            mesh = new AnimatedMesh(
                check_id_is_available_or_generate_new(id),
                (p.width as number) || default_size,
                (p.height as number) || default_size
            ) as unknown as ISceneObject;
        }
        else if (type === ObjectTypes.GO_AUDIO_COMPONENT) {
            mesh = new AudioMesh(check_id_is_available_or_generate_new(id)) as unknown as ISceneObject;
        }
        else if (type === ObjectTypes.COMPONENT) {
            mesh = new Component(check_id_is_available_or_generate_new(id), (p.type as number) || 0) as unknown as ISceneObject;
        }
        else {
            logger.error('Unknown mesh type', type);
            mesh = new Slice9Mesh(check_id_is_available_or_generate_new(id), 32, 32) as unknown as ISceneObject;
        }

        set_name(mesh, type + mesh.mesh_data.id);
        mesh.layers.enable(render_service.DC_LAYERS.RAYCAST_LAYER);

        event_bus.emit('scene:object_created', { id: mesh.mesh_data.id, type });

        return mesh;
    }

    function update_url(mesh: ISceneObject): void {
        const entity = mesh as unknown as EntityBase;
        let fullPath = '';
        if (is_text(entity) || is_label(entity) || is_sprite(entity)) {
            fullPath = '#' + mesh.name;
        } else {
            fullPath = mesh.name;
        }

        let parent = mesh.parent;
        while (parent !== null && is_base_mesh(parent)) {
            fullPath = parent.name + (fullPath.startsWith('#') ? '' : '/') + fullPath;
            parent = parent.parent;
        }
        fullPath = ':/' + fullPath;

        // Удаляем старый путь, если он существует
        const old_url = mesh_id_to_url.get(mesh.mesh_data.id);
        if (old_url !== undefined) {
            mesh_url_to_id.delete(old_url);
        }

        mesh_url_to_id.set(fullPath, mesh.mesh_data.id);
        mesh_id_to_url.set(mesh.mesh_data.id, fullPath);
    }

    function set_name(mesh: ISceneObject, name: string): void {
        mesh.name = name;
        update_url(mesh);

        // Рекурсивно обновляем пути для всех детей
        mesh.children.forEach(child => {
            if (is_base_mesh(child)) {
                const childMesh = child as unknown as ISceneObject;
                set_name(childMesh, childMesh.name);
            }
        });

        event_bus.emit('scene:object_renamed', { id: mesh.mesh_data.id, name });
    }

    function get_url_by_id(id: number): string | undefined {
        return mesh_id_to_url.get(id);
    }

    function get_id_by_url(url: string): number | undefined {
        return mesh_url_to_id.get(url);
    }

    function get_by_url(url: string): ISceneObject | undefined {
        const id = mesh_url_to_id.get(url);
        if (id === undefined) {
            return undefined;
        }
        return get_by_id(id);
    }

    function get_by_name(name: string): ISceneObject | undefined {
        const scene = render_service.scene;
        let result: ISceneObject | undefined;

        scene.traverse((child) => {
            if (is_base_mesh(child)) {
                const it = child as unknown as ISceneObject;
                if (it.name === name) {
                    result = it;
                }
            }
        });

        return result;
    }

    function serialize_object(m: ISceneObject, clean_id_pid = false, without_children = false): BaseEntityData {
        const entity = m as unknown as EntityBase;
        const wp = new Vector3();
        const wr = new Quaternion();
        const ws = new Vector2();

        wp.copy(entity.get_position() as unknown as Vector3);
        wr.copy(entity.quaternion);
        ws.copy(entity.get_scale());

        const pid = m.parent !== null
            ? (is_base_mesh(m.parent) ? (m.parent as unknown as ISceneObject).mesh_data.id : -1)
            : -1;

        const data: BaseEntityData = {
            id: m.mesh_data.id,
            pid,
            type: (m as unknown as EntityBase).type as unknown as ObjectTypes,
            name: m.name,
            visible: entity.get_active(),
            position: wp.toArray().map(value => Number(value.toFixed(FLOAT_PRECISION))) as [number, number, number],
            rotation: wr.toArray().map(value => Number(value.toFixed(FLOAT_PRECISION))) as [number, number, number, number],
            scale: ws.toArray().map(value => Number(value.toFixed(FLOAT_PRECISION))) as [number, number],
            other_data: entity.serialize(),
        };

        if (clean_id_pid) {
            delete (data as unknown as Record<string, unknown>).id;
            delete (data as unknown as Record<string, unknown>).pid;
        }

        if (!without_children && m.children.length > 0) {
            data.children = [];
            for (let i = 0; i < m.children.length; i++) {
                if (is_base_mesh(m.children[i])) {
                    const bm = m.children[i] as unknown as ISceneObject;
                    const entity_bm = bm as unknown as EntityBase;
                    if (entity_bm.no_saving) {
                        continue;
                    }
                    data.children.push(serialize_object(bm, clean_id_pid));
                }
            }
        }

        return data;
    }

    function deserialize_object(data: BaseEntityData, with_id = false): ISceneObject {
        const mesh = create(data.type, data.other_data, with_id ? data.id : -1);
        const entity = mesh as unknown as EntityBase;

        if (data.position !== undefined) {
            mesh.position.set(data.position[0], data.position[1], data.position[2]);
        }
        if (data.rotation !== undefined) {
            mesh.quaternion.set(data.rotation[0], data.rotation[1], data.rotation[2], data.rotation[3]);
        }
        if (data.scale !== undefined) {
            entity.set_scale(data.scale[0], data.scale[1]);
        }

        set_name(mesh, data.name);
        entity.set_active(data.visible);
        entity.deserialize(data.other_data || {});

        if (data.children !== undefined) {
            for (let i = 0; i < data.children.length; i++) {
                const child = deserialize_object(data.children[i], with_id);
                mesh.add(child);
                update_url(child);
            }
        }

        if (data.scale !== undefined && mesh instanceof MultipleMaterialMesh) {
            mesh.set_scale(data.scale[0], data.scale[1]);
        }

        return mesh;
    }

    function get_mesh_list(mesh: Object3D): ISceneObject[] {
        const tmp: Object3D[] = [];
        mesh.traverse((child) => tmp.push(child));
        return filter_list_base_mesh(tmp) as unknown as ISceneObject[];
    }

    function get_all(): ISceneObject[] {
        return get_mesh_list(render_service.scene);
    }

    function get_by_id(id: number): ISceneObject | undefined {
        const list = get_all();
        for (let i = 0; i < list.length; i++) {
            if (list[i].mesh_data.id === id) {
                return list[i];
            }
        }
        return undefined;
    }

    function clear(): void {
        const scene = render_service.scene;

        for (let i = scene.children.length - 1; i >= 0; i--) {
            const _m = scene.children[i];
            if (is_base_mesh(_m)) {
                const m = _m as unknown as ISceneObject;
                const entity = m as unknown as EntityBase;
                if (entity.no_removing) {
                    continue;
                }
                for (let j = m.children.length - 1; j >= 0; j--) {
                    const c = m.children[j];
                    if (c instanceof EntityBase) {
                        c.dispose();
                    }
                }
                if (_m instanceof EntityBase) {
                    _m.dispose();
                }
                scene.remove(_m);
            }
        }

        mesh_url_to_id.clear();
        mesh_id_to_url.clear();

        logger.info('Сцена очищена');
        event_bus.emit('scene:cleared', {});
    }

    function serialize(): BaseEntityData[] {
        return save_scene();
    }

    function save_scene(): BaseEntityData[] {
        const scene = render_service.scene;
        const list: BaseEntityData[] = [];

        for (let i = 0; i < scene.children.length; i++) {
            const _m = scene.children[i];
            if (is_base_mesh(_m)) {
                const m = _m as unknown as ISceneObject;
                const entity = m as unknown as EntityBase;
                if (entity.no_saving) {
                    continue;
                }
                list.push(serialize_object(m, true));
            }
        }

        return list;
    }

    function deserialize(data: BaseEntityData[]): void {
        load_scene(data, '');
    }

    function load_scene(data: BaseEntityData[], sub_name = ''): void {
        const scene = render_service.scene;

        if (sub_name === '') {
            clear();
            for (let i = 0; i < data.length; i++) {
                const it = data[i];
                const mesh = deserialize_object(it, false);
                scene.add(mesh);
                if (mesh instanceof AudioMesh) {
                    mesh.after_deserialize();
                }
            }
        } else {
            const container = create(ObjectTypes.GO_CONTAINER, {});
            container.name = sub_name;
            const tmp = deepClone(data);
            for (let i = 0; i < tmp.length; i++) {
                const it = tmp[i];
                const mesh = deserialize_object(it, false);
                container.add(mesh);
            }
            scene.add(container);
        }

        logger.info(`Загружено ${data.length} объектов`);
        event_bus.emit('scene:loaded', { count: data.length });
    }

    function update_gui_container_children_z(container: GuiContainer): void {
        let z_index = container.position.z;

        function update_z_recursive(parent: ISceneObject): void {
            parent.children.forEach((child) => {
                if (child instanceof GuiBox || child instanceof GuiText) {
                    z_index++;
                    const world_pos = new Vector3();
                    child.getWorldPosition(world_pos);
                    world_pos.z = z_index;
                    const local_pos = (parent as unknown as Object3D).worldToLocal(world_pos);
                    child.position.copy(local_pos);
                    child.transform_changed();
                    update_z_recursive(child as unknown as ISceneObject);
                }
            });
        }

        update_z_recursive(container as unknown as ISceneObject);
        container.transform_changed();
    }

    function find_nearest_gui_container(mesh: ISceneObject): ISceneObject | null {
        let current = mesh.parent;
        while (current !== null) {
            if (is_base_mesh(current) && (current as unknown as EntityBase).type === IObjectTypes.GUI_CONTAINER) {
                return current as unknown as ISceneObject;
            }
            current = current.parent;
        }
        return null;
    }

    function find_nearest_clipping_parent(mesh: ISceneObject): ISceneObject | null {
        if (mesh.parent instanceof GuiBox) {
            if (mesh.parent.isClippingEnabled()) {
                return mesh.parent as unknown as ISceneObject;
            }
            return find_nearest_clipping_parent(mesh.parent as unknown as ISceneObject);
        }
        if (mesh.parent instanceof GuiText) {
            return find_nearest_clipping_parent(mesh.parent as unknown as ISceneObject);
        }

        return null;
    }

    function move(mesh: ISceneObject, pid = -1, next_id = -1): void {
        const scene = render_service.scene;

        // Проверяем что pid не является потомком mesh
        let pid_is_child = false;
        (mesh as unknown as Object3D).traverse((child) => {
            if (is_base_mesh(child) && (child as unknown as ISceneObject).mesh_data.id === pid && pid !== -1) {
                pid_is_child = true;
            }
        });

        if (pid_is_child) {
            logger.error('pid is child');
            return;
        }

        // Выполняем перемещение
        const has_old_parent = mesh.parent !== null;
        const old_parent = mesh.parent !== null ? mesh.parent : scene;
        const old_index = old_parent.children.indexOf(mesh);
        let new_parent: Object3D | ISceneObject = pid === -1 ? scene : (get_by_id(pid) || scene);

        if (new_parent === scene && pid !== -1) {
            logger.error('new_parent is null, mesh:', mesh.mesh_data.id, 'pid:' + pid);
        }

        const old_pos = new Vector3();
        mesh.getWorldPosition(old_pos);
        const old_scale = new Vector3();
        mesh.getWorldScale(old_scale);

        const new_before = get_by_id(next_id);
        let new_index = -1;
        if (new_before !== undefined) {
            new_index = (new_parent as Object3D).children.indexOf(new_before as unknown as Object3D);
        } else {
            new_index = (new_parent as Object3D).children.length;
        }

        if (old_parent === new_parent && new_index > old_index) {
            new_index--;
        }

        // перемещаем
        old_parent.remove(mesh);
        const children = (new_parent as Object3D).children;
        children.splice(new_index, 0, mesh);
        mesh.parent = new_parent as Object3D;

        const lp = mesh.parent.worldToLocal(old_pos);
        mesh.position.copy(lp);

        if (has_old_parent) {
            const parent_scale = new Vector3();
            mesh.parent.getWorldScale(parent_scale);
            old_scale.divide(parent_scale);
            mesh.scale.copy(old_scale);
        }

        update_url(mesh);

        if (mesh instanceof GuiBox || mesh instanceof GuiText) {
            const gui_container = find_nearest_gui_container(mesh as unknown as ISceneObject);
            if (gui_container !== null) {
                update_gui_container_children_z(gui_container as unknown as GuiContainer);
            }
            const clipping_parent = find_nearest_clipping_parent(mesh as unknown as ISceneObject);
            if (clipping_parent !== null) {
                const cp = clipping_parent as unknown as GuiBox;
                cp.enableClipping(cp.isInvertedClipping(), cp.isClippingVisible());
            }
        }

        event_bus.emit('hierarchy:moved', { id: mesh.mesh_data.id, pid });
        event_bus.emit('scene:object_moved', { id: mesh.mesh_data.id, parent_id: pid, before_id: next_id });
    }

    function move_by_id(id: number, pid = -1, next_id = -1): void {
        const mesh = get_by_id(id);
        if (mesh !== undefined) {
            move(mesh, pid, next_id);
        } else {
            logger.error('mesh is null');
        }
    }

    function add(mesh: ISceneObject, id_parent = -1, id_before = -1): void {
        move(mesh, id_parent, id_before);
        logger.debug(`Объект ${mesh.mesh_data.id} добавлен в сцену`);
        event_bus.emit('scene:object_added', { id: mesh.mesh_data.id });
    }

    function add_to_mesh(mesh: ISceneObject, parent_mesh: ISceneObject): void {
        const id_parent = parent_mesh.mesh_data.id;
        move(mesh, id_parent);

        update_url(mesh);

        if (mesh instanceof GuiBox || mesh instanceof GuiText) {
            const gui_container = find_nearest_gui_container(mesh as unknown as ISceneObject);
            if (gui_container !== null) {
                update_gui_container_children_z(gui_container as unknown as GuiContainer);
            }
            const clipping_parent = find_nearest_clipping_parent(mesh as unknown as ISceneObject);
            if (clipping_parent !== null) {
                const cp = clipping_parent as unknown as GuiBox;
                cp.enableClipping(cp.isInvertedClipping(), cp.isClippingVisible());
            }
        }
    }

    function remove(object: ISceneObject): void {
        remove_by_id(object.mesh_data.id);
    }

    function remove_by_id(id: number): void {
        event_bus.emit('scene:object_removing', { id });

        const mesh = get_by_id(id);
        if (mesh !== undefined) {
            if (mesh instanceof EntityBase) {
                mesh.dispose();
            }
            if (mesh.parent !== null) {
                mesh.parent.remove(mesh);
            }

            // Удаляем из URL маппинга
            const url = mesh_id_to_url.get(id);
            if (url !== undefined) {
                mesh_url_to_id.delete(url);
                mesh_id_to_url.delete(id);
            }

            logger.debug(`Объект ${id} удалён из сцены`);
            event_bus.emit('scene:object_removed', { id });
        }
    }

    function find_next_sibling_id(mesh: ISceneObject): number {
        const scene = render_service.scene;
        const parent = mesh.parent !== null ? mesh.parent : scene;
        const index = parent.children.indexOf(mesh);

        if (index === parent.children.length - 1) {
            return -1;
        }

        for (let i = index + 1; i < parent.children.length; i++) {
            const child = parent.children[i];
            if (is_base_mesh(child)) {
                return (child as unknown as ISceneObject).mesh_data.id;
            }
        }

        return -1;
    }

    function make_graph(): SceneGraphItem[] {
        const scene = render_service.scene;
        const list: SceneGraphItem[] = [];

        scene.traverse((child) => {
            if (is_base_mesh(child)) {
                const it = child as unknown as ISceneObject;
                const entity = it as unknown as EntityBase;
                let pid = -1;
                if (is_base_mesh(it.parent!)) {
                    pid = (it.parent as unknown as ISceneObject).mesh_data.id;
                }
                list.push({
                    id: it.mesh_data.id,
                    pid,
                    name: it.name,
                    visible: it.visible,
                    type: entity.type as unknown as ObjectTypes,
                });
            }
        });

        // Обновляем z-индексы для GUI контейнеров
        list.filter(item => item.type === ObjectTypes.GUI_CONTAINER).forEach((info) => {
            const container = get_by_id(info.id);
            if (container !== undefined) {
                update_gui_container_children_z(container as unknown as GuiContainer);
            }
        });

        return list;
    }

    function debug_graph(mesh: Object3D, level = 0): string {
        let graph = '';
        for (let i = 0; i < mesh.children.length; i++) {
            const child = mesh.children[i];
            if (is_base_mesh(child)) {
                graph += '\n' + '   '.repeat(level) + ' ' + child.name;
                graph += debug_graph(child, level + 1);
            }
        }
        return graph;
    }

    function save_editor(): { id_counter: number } {
        return { id_counter };
    }

    function load_editor(data: { id_counter: number }): void {
        id_counter = data.id_counter;
    }

    function dispose(): void {
        clear();
        logger.info('SceneService освобождён');
    }

    return {
        create,
        add,
        add_to_mesh,
        remove,
        remove_by_id,
        get_by_id,
        get_by_name,
        get_by_url,
        get_url_by_id,
        get_id_by_url,
        get_all,
        clear,
        serialize,
        save_scene,
        deserialize,
        load_scene,
        serialize_object,
        deserialize_object,
        get_unique_id,
        move,
        move_by_id,
        set_name,
        update_url,
        find_next_sibling_id,
        find_nearest_gui_container,
        find_nearest_clipping_parent,
        make_graph,
        debug_graph,
        save_editor,
        load_editor,
        dispose,
    };
}
