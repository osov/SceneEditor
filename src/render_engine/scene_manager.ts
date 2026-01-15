/**
 * SceneManager - управление объектами сцены
 *
 * Создание, удаление, сериализация объектов сцены.
 * Использует DI сервисы через глобальные обёртки:
 * - RenderEngine.scene → DI RenderService.scene
 * - Log → DI LoggerService
 * - EventBus → DI EventBus
 */

import { Object3D, Quaternion, Vector2, Vector2Tuple, Vector3, Vector3Tuple, Vector4Tuple } from "three";
import { filter_list_base_mesh, is_base_mesh, is_label, is_sprite, is_text } from "./helpers/utils";
import { Slice9Mesh } from "./objects/slice9";
import { IBaseEntityAndThree, IBaseEntityData, IObjectTypes } from "./types";
import { TextMesh } from "./objects/text";
import { deepClone } from "../modules/utils";
import { GoContainer, GoSprite, GoText, GuiBox, GuiContainer, GuiText } from "./objects/sub_types";
import { AnimatedMesh } from "./objects/animated_mesh";
import { EntityBase } from "./objects/entity_base";
import { Component } from "./components/container_component";
import { FLOAT_PRECISION } from "../config";
import { TDictionary } from "../modules_editor/modules_editor_const";
import { Model } from "./objects/model";
import { AudioMesh } from "./objects/audio_mesh";
import { MultipleMaterialMesh } from "./objects/multiple_material_mesh";
import { Services } from '@editor/core';

declare global {
    const SceneManager: ISceneManager;
}

/** Интерфейс SceneManager для типизации */
interface ISceneManager {
    get_unique_id(): number;
    create<T extends IObjectTypes>(type: T, params?: Record<string, unknown>, id?: number): IBaseEntityAndThree;
    add(mesh: IBaseEntityAndThree, id_parent?: number, id_before?: number): void;
    add_to_mesh(mesh: IBaseEntityAndThree, parent_mesh: IBaseEntityAndThree): void;
    remove(id: number): void;
    get_mesh_by_id(id: number): IBaseEntityAndThree | null;
    get_mesh_by_name(name: string): IBaseEntityAndThree | undefined;
    move_mesh(mesh: IBaseEntityAndThree, pid?: number, next_id?: number): void;
    move_mesh_id(id: number, pid?: number, next_id?: number): void;
    find_next_id_mesh(mesh: IBaseEntityAndThree): number;
    make_graph(): { id: number; pid: number; name: string; visible: boolean; type: IObjectTypes }[];
    debug_graph(mesh: Object3D, level?: number): string;
    save_editor(): { id_counter: number };
    load_editor(data: { id_counter: number }): void;
    serialize_mesh(mesh: IBaseEntityAndThree, clean_id_pid?: boolean, without_children?: boolean): IBaseEntityData;
    deserialize_mesh(data: IBaseEntityData, with_id?: boolean): IBaseEntityAndThree;
    save_scene(): IBaseEntityData[];
    load_scene(data: IBaseEntityData[], sub_name?: string): void;
    get_scene_list(): IBaseEntityAndThree[];
    set_mesh_name(mesh: IBaseEntityAndThree, name: string): void;
    update_mesh_url(mesh: IBaseEntityAndThree): void;
    get_mesh_id_by_url(url: string): number | undefined;
    get_mesh_url_by_id(id: number): string | undefined;
    find_nearest_gui_container(mesh: GuiBox | GuiText): GuiContainer | null;
    find_nearest_clipping_parent(mesh: GuiBox | GuiText): GuiBox | null;
}

/** Регистрация глобального SceneManager */
export function register_scene_manager(): void {
    (window as unknown as Record<string, unknown>).SceneManager = SceneManagerModule();
}

type IMeshTypes = {
    [IObjectTypes.EMPTY]: EntityBase,
    [IObjectTypes.ENTITY]: EntityBase,
    [IObjectTypes.SLICE9_PLANE]: Slice9Mesh,
    [IObjectTypes.TEXT]: TextMesh,

    [IObjectTypes.GUI_CONTAINER]: GuiContainer,
    [IObjectTypes.GUI_BOX]: GuiBox,
    [IObjectTypes.GUI_TEXT]: GuiText,

    [IObjectTypes.GO_CONTAINER]: GoContainer,
    [IObjectTypes.GO_SPRITE_COMPONENT]: GoSprite,
    [IObjectTypes.GO_LABEL_COMPONENT]: GoText,

    [IObjectTypes.GO_MODEL_COMPONENT]: Model,
    [IObjectTypes.GO_ANIMATED_MODEL_COMPONENT]: AnimatedMesh,

    [IObjectTypes.GO_AUDIO_COMPONENT]: AudioMesh,

    [IObjectTypes.COMPONENT]: Component
}

export function SceneManagerModule() {
    const scene = RenderEngine.scene;

    const mesh_url_to_mesh_id: TDictionary<number> = {};
    const mesh_id_to_url: TDictionary<string> = {};

    let id_counter = 0;

    function get_unique_id() {
        while (true) {
            id_counter++;
            if (!get_mesh_by_id(id_counter))
                return id_counter;
        }
    }

    function create<T extends IObjectTypes>(type: T, params?: any, id = -1): IMeshTypes[T] {
        let mesh: IBaseEntityAndThree;
        params = params || {};
        const default_size = 32;
        // base
        if (type == IObjectTypes.ENTITY) {
            mesh = new EntityBase(check_id_is_available_or_generate_new(id));
        }
        else if (type == IObjectTypes.ENTITY) {
            mesh = new EntityBase(check_id_is_available_or_generate_new(id));
        }
        else if (type == IObjectTypes.SLICE9_PLANE) {
            mesh = new Slice9Mesh(check_id_is_available_or_generate_new(id), params.width || default_size, params.height || default_size, params.slice_width || 0, params.slice_height || 0);
        }
        else if (type == IObjectTypes.TEXT) {
            mesh = new TextMesh(check_id_is_available_or_generate_new(id), params.text || '', params.width || default_size, params.height || default_size);
        }

        // gui
        else if (type == IObjectTypes.GUI_CONTAINER) {
            mesh = new GuiContainer(check_id_is_available_or_generate_new(id));
        }
        else if (type == IObjectTypes.GUI_BOX) {
            mesh = new GuiBox(check_id_is_available_or_generate_new(id), params.width || default_size, params.height || default_size, params.slice_width || 0, params.slice_height || 0);
        }
        else if (type == IObjectTypes.GUI_TEXT) {
            mesh = new GuiText(check_id_is_available_or_generate_new(id), params.text || '', params.width || default_size, params.height || default_size);
        }

        // go
        else if (type == IObjectTypes.GO_CONTAINER) {
            mesh = new GoContainer(check_id_is_available_or_generate_new(id));
        }
        // go components
        else if (type == IObjectTypes.GO_SPRITE_COMPONENT) {
            mesh = new GoSprite(check_id_is_available_or_generate_new(id), params.width || default_size, params.height || default_size, params.slice_width || 0, params.slice_height || 0);
        }
        else if (type == IObjectTypes.GO_LABEL_COMPONENT) {
            mesh = new GoText(check_id_is_available_or_generate_new(id), params.text || '', params.width || default_size, params.height || default_size);
        }
        else if (type == IObjectTypes.GO_MODEL_COMPONENT) {
            mesh = new Model(check_id_is_available_or_generate_new(id), params.width || default_size, params.height || default_size);
        }
        else if (type == IObjectTypes.GO_ANIMATED_MODEL_COMPONENT) {
            mesh = new AnimatedMesh(check_id_is_available_or_generate_new(id), params.width || default_size, params.height || default_size);
        }
        else if (type == IObjectTypes.GO_AUDIO_COMPONENT) {
            mesh = new AudioMesh(check_id_is_available_or_generate_new(id));
        }
        else if (type == IObjectTypes.COMPONENT)
            mesh = new Component(check_id_is_available_or_generate_new(id), params.type || 0);
        else {
            Services.logger.error('Unknown mesh type', type);
            mesh = new Slice9Mesh(check_id_is_available_or_generate_new(id), 32, 32);
            //mesh.set_color('#f00');
        }

        set_mesh_name(mesh, type + mesh.mesh_data.id);
        mesh.layers.enable(RenderEngine.DC_LAYERS.RAYCAST_LAYER);
        return mesh as IMeshTypes[T];
    }

    function update_mesh_url(mesh: IBaseEntityAndThree) {
        let fullPath = '';
        if (is_text(mesh) || is_label(mesh) || is_sprite(mesh)) fullPath = '#' + mesh.name;
        else fullPath = mesh.name;
        let parent = mesh.parent;
        while (parent && is_base_mesh(parent)) {
            fullPath = parent.name + (fullPath.startsWith('#') ? '' : '/') + fullPath;
            parent = parent.parent;
        }
        fullPath = ":/" + fullPath;
        // NOTE: удаляем старый путь, если он существует
        if (mesh_id_to_url[mesh.mesh_data.id] != undefined) {
            delete mesh_url_to_mesh_id[mesh_id_to_url[mesh.mesh_data.id]];
        }
        mesh_url_to_mesh_id[fullPath] = mesh.mesh_data.id;
        mesh_id_to_url[mesh.mesh_data.id] = fullPath;
    }

    function set_mesh_name(mesh: IBaseEntityAndThree, name: string) {
        mesh.name = name;
        update_mesh_url(mesh);
        // NOTE: рекурсивно обновляем пути для всех детей
        mesh.children.forEach(child => {
            if (is_base_mesh(child)) {
                const childMesh = child as IBaseEntityAndThree;
                set_mesh_name(childMesh, childMesh.name);
            }
        });
    }

    function get_mesh_url_by_id(id: number) {
        return mesh_id_to_url[id];
    }

    function get_mesh_id_by_url(url: string) {
        return mesh_url_to_mesh_id[url];
    }

    function check_id_is_available_or_generate_new(id: number) {
        if (id != -1) {
            const m = get_mesh_by_id(id);
            if (m) {
                const new_id = get_unique_id();
                Services.logger.error('mesh with id already exists', id, 'generated new id', new_id);
                id = new_id;
            }
            return id;
        }
        return get_unique_id();
    }

    function serialize_mesh(m: IBaseEntityAndThree, clean_id_pid = false, without_children = false) {
        const wp = new Vector3();
        const wr = new Quaternion();
        const ws = new Vector2();
        wp.copy(m.get_position());
        wr.copy(m.quaternion);
        ws.copy(m.get_scale());
        const pid = m.parent ? (is_base_mesh(m.parent) ? (m.parent as IBaseEntityAndThree).mesh_data.id : -1) : -1;
        const data: IBaseEntityData = {
            id: m.mesh_data.id,
            pid,
            type: m.type,
            name: m.name,
            visible: m.get_active(),
            position: wp.toArray().map(value => Number(value.toFixed(FLOAT_PRECISION))) as Vector3Tuple,
            rotation: wr.toArray().map(value => Number(value.toFixed(FLOAT_PRECISION))) as Vector4Tuple,
            scale: ws.toArray().map(value => Number(value.toFixed(FLOAT_PRECISION))) as Vector2Tuple,
            other_data: m.serialize(),
        };
        if (clean_id_pid) {
            delete (data as any).id;
            delete (data as any).pid;
        }
        if (!without_children && m.children.length > 0) {
            data.children = [];
            for (let i = 0; i < m.children.length; i++)
                if (is_base_mesh(m.children[i])) {
                    const bm = m.children[i] as IBaseEntityAndThree;
                    if (bm.no_saving)
                        continue;
                    data.children.push(serialize_mesh(bm, clean_id_pid));
                }
        }
        return data;
    }

    function deserialize_mesh(data: IBaseEntityData, with_id = false): IBaseEntityAndThree {
        const mesh = create(data.type, data.other_data, with_id ? data.id : -1);
        if (data.position !== undefined)
            mesh.position.set(data.position[0], data.position[1], data.position[2]);
        if (data.rotation !== undefined)
            mesh.quaternion.set(data.rotation[0], data.rotation[1], data.rotation[2], data.rotation[3]);
        if (data.scale !== undefined) {
            mesh.set_scale(data.scale[0], data.scale[1]);
        }
        set_mesh_name(mesh, data.name);
        mesh.set_active(data.visible);

        mesh.deserialize(data.other_data);
        if (data.children !== undefined) {
            for (let i = 0; i < data.children.length; i++) {
                const m = mesh.add(deserialize_mesh(data.children[i], with_id));
                update_mesh_url(m);
            }
        }

        if (data.scale !== undefined && mesh instanceof MultipleMaterialMesh) {
            mesh.set_scale(data.scale[0], data.scale[1]);
        }

        return mesh;
    }

    function clear_scene() {
        for (let i = scene.children.length - 1; i >= 0; i--) {
            const _m = scene.children[i];
            if (is_base_mesh(_m)) {
                const m = (_m as any as IBaseEntityAndThree);
                if (m.no_removing)
                    continue;
                for (let j = m.children.length - 1; j >= 0; j--) {
                    const c = m.children[j]
                    if (c instanceof EntityBase) {
                        c.dispose();
                    }
                }
                if (m instanceof EntityBase) m.dispose();
                scene.remove(m);
            }
        }
    }

    function save_scene() {
        const list: IBaseEntityData[] = [];
        for (let i = 0; i < scene.children.length; i++) {
            const _m = scene.children[i];
            if (is_base_mesh(_m)) {
                const m = (_m as any as IBaseEntityAndThree);
                if (m.no_saving)
                    continue;
                list.push(serialize_mesh(m, true));
            }
        }
        return list;
    }

    function load_scene(data: IBaseEntityData[], sub_name = ''): void {
        if (sub_name === '') {
            clear_scene();
            for (let i = 0; i < data.length; i++) {
                const it = data[i];
                const mesh = deserialize_mesh(it, false);
                scene.add(mesh);
                if (mesh instanceof AudioMesh) mesh.after_deserialize();
            }
        }
        else {
            const container = create(IObjectTypes.GO_CONTAINER, {});
            container.name = sub_name;
            const tmp = deepClone(data);
            for (let i = 0; i < tmp.length; i++) {
                const it = tmp[i];
                const mesh = deserialize_mesh(it, false);
                container.add(mesh);
            }
            scene.add(container);
        }
    }

    function get_mesh_list(mesh: Object3D) {
        const tmp: Object3D[] = [];
        mesh.traverse((child) => tmp.push(child));
        return filter_list_base_mesh(tmp);
    }

    function get_scene_list() {
        return get_mesh_list(scene);
    }

    function get_mesh_by_id(id: number) {
        const list = get_scene_list();
        for (let i = 0; i < list.length; i++) {
            if (list[i].mesh_data.id == id) {
                return list[i];
            }
        }
        return null;
    }

    function move_mesh_id(id: number, pid = -1, next_id = -1) {
        const mesh = get_mesh_by_id(id);
        if (mesh)
            move_mesh(mesh, pid, next_id);
        else
            Services.logger.error('mesh is null');
    }

    function get_next_base_mesh_id(mesh: IBaseEntityAndThree) {
        const parent = mesh.parent ? mesh.parent : scene;
        const index = parent.children.indexOf(mesh);
        if (index == parent.children.length - 1)
            return -1;
        for (let i = index + 1; i < parent.children.length; i++) {
            const child = parent.children[i];
            if (is_base_mesh(child)) {
                return (child as any as IBaseEntityAndThree).mesh_data.id;
            }
        }
        return -1;
    }

    function find_next_id_mesh(mesh: IBaseEntityAndThree) {
        const parent = mesh.parent ? mesh.parent : scene;
        const index = parent.children.indexOf(mesh);

        if (index == parent.children.length - 1) {
            return -1;
        }
        return get_next_base_mesh_id(mesh);
    }

    function find_nearest_gui_container(mesh: GuiBox | GuiText): GuiContainer | null {
        let current = mesh.parent;
        while (current) {
            if (is_base_mesh(current) && current.type == IObjectTypes.GUI_CONTAINER) {
                return current as GuiContainer;
            }
            current = current.parent;
        }
        return null;
    }

    function find_nearest_clipping_parent(mesh: GuiBox | GuiText): GuiBox | null {
        if (mesh.parent instanceof GuiBox) {
            if (mesh.parent.isClippingEnabled())
                return mesh.parent;
            return find_nearest_clipping_parent(mesh.parent);
        }
        if (mesh.parent instanceof GuiText) {
            return find_nearest_clipping_parent(mesh.parent);
        }

        return null;
    }

    function update_gui_container_children_z(container: GuiContainer) {
        let z_index = container.position.z;

        function update_z_recursive(parent: IBaseEntityAndThree) {
            parent.children.forEach((child) => {
                if (child instanceof GuiBox || child instanceof GuiText) {
                    z_index++;
                    const world_pos = new Vector3();
                    child.getWorldPosition(world_pos);
                    world_pos.z = z_index;
                    const local_pos = parent.worldToLocal(world_pos);
                    child.position.copy(local_pos);
                    child.transform_changed();
                    update_z_recursive(child as IBaseEntityAndThree);
                }
            });
        }

        update_z_recursive(container);
        container.transform_changed();
    }

    function move_mesh(mesh: IBaseEntityAndThree, pid = -1, next_id = -1) {
        let pid_is_child = false;
        mesh.traverse((child) => {
            if (is_base_mesh(child) && (child as any).mesh_data.id == pid && pid != -1)
                pid_is_child = true;
        });
        if (pid_is_child)
            return Services.logger.error('pid is child');
        move_mesh_to(mesh, pid, next_id);
    }

    function move_mesh_to(mesh: IBaseEntityAndThree, pid = -1, next_id = -1) {
        const has_old_parent = mesh.parent != null;
        const old_parent = mesh.parent ? mesh.parent : scene;
        const old_index = old_parent.children.indexOf(mesh);
        let new_parent = (pid == -1) ? scene : get_mesh_by_id(pid);
        if (!new_parent) {
            new_parent = scene;
            Services.logger.error('new_parent is null, mesh:', mesh.mesh_data.id, 'pid:' + pid);
        }
        const old_pos = new Vector3();
        mesh.getWorldPosition(old_pos);
        const old_scale = new Vector3();
        mesh.getWorldScale(old_scale);
        const new_before = get_mesh_by_id(next_id);
        let new_index = -1;
        if (new_before != null)
            new_index = new_parent.children.indexOf(new_before);
        else
            new_index = new_parent.children.length;
        if (old_parent === new_parent && new_index > old_index)
            new_index--;

        // перемещаем
        old_parent.remove(mesh);
        var children = new_parent.children;
        children.splice(new_index, 0, mesh);
        mesh.parent = new_parent;
        const lp = mesh.parent!.worldToLocal(old_pos);
        mesh.position.copy(lp);
        if (has_old_parent) {
            const parent_scale = new Vector3();
            mesh.parent!.getWorldScale(parent_scale);
            old_scale.divide(parent_scale);
            mesh.scale.copy(old_scale);
        }

        update_mesh_url(mesh);

        if (mesh instanceof GuiBox || mesh instanceof GuiText) {
            const gui_container = find_nearest_gui_container(mesh);
            if (gui_container) {
                update_gui_container_children_z(gui_container);
            }
            const clipping_parent = find_nearest_clipping_parent(mesh);
            if (clipping_parent) {
                // NOTE: поросто вызываем еще раз чтобы новый элемент тоже добавить в сlipping
                clipping_parent.enableClipping(clipping_parent.isInvertedClipping(), clipping_parent.isClippingVisible());
            }
        }
        Services.event_bus.emit('SYS_MESH_MOVED_TO', { id: mesh.mesh_data.id, pid }, false);
    }

    function add(mesh: IBaseEntityAndThree, id_parent = -1, id_before = -1) {
        move_mesh(mesh, id_parent, id_before);
    }

    function add_to_mesh(mesh: IBaseEntityAndThree, parent_mesh: IBaseEntityAndThree) {
        const id_parent = parent_mesh.mesh_data.id;
        move_mesh(mesh, id_parent);

        update_mesh_url(mesh);

        if (mesh instanceof GuiBox || mesh instanceof GuiText) {
            const gui_container = find_nearest_gui_container(mesh);
            if (gui_container) {
                update_gui_container_children_z(gui_container);
            }
            const clipping_parent = find_nearest_clipping_parent(mesh);
            if (clipping_parent) {
                // NOTE: поросто вызываем еще раз чтобы новый элемент тоже добавить в сlipping
                clipping_parent.enableClipping(clipping_parent.isInvertedClipping(), clipping_parent.isClippingVisible());
            }
        }
    }

    function remove(id: number) {
        Services.event_bus.emit('SYS_MESH_REMOVE_BEFORE', { id: id }, false);
        const mesh = get_mesh_by_id(id);
        if (mesh) {
            if (mesh instanceof EntityBase)
                mesh.dispose();
            mesh.parent!.remove(mesh);
            Services.event_bus.emit('SYS_MESH_REMOVE_AFTER', { id: id }, false);
        }
    }

    function make_graph() {
        const list: { id: number, pid: number, name: string, visible: boolean, type: IObjectTypes }[] = [];
        scene.traverse((child) => {
            if (is_base_mesh(child)) {
                const it = child as any as IBaseEntityAndThree;
                let pid = -1;
                if (is_base_mesh(it.parent!))
                    pid = (it.parent as any as IBaseEntityAndThree).mesh_data.id;
                list.push({ id: it.mesh_data.id, pid: pid, name: it.name, visible: it.visible, type: it.type });
            }
        });
        list.filter(item => item.type == IObjectTypes.GUI_CONTAINER).forEach((info) => {
            const container = get_mesh_by_id(info.id);
            if (!container) return;
            update_gui_container_children_z(container as GuiContainer);
        });
        return list;
    }

    function debug_graph(mesh: Object3D, level = 0) {
        let graph = '';
        for (let i = 0; i < mesh.children.length; i++) {
            const child = mesh.children[i];
            if (is_base_mesh(child)) {
                graph += '\n' + '   '.repeat(level) + ' ' + (child.name);
                graph += debug_graph(child, level + 1);
            }
        }
        return graph;
    }

    function save_editor() {
        return { id_counter };
    }

    function load_editor(data: any) {
        id_counter = data.id_counter;
    }

    function get_mesh_by_name(name: string) {
        let mesh: IBaseEntityAndThree | undefined;
        scene.traverse((child) => {
            if (is_base_mesh(child)) {
                const it = child as any as IBaseEntityAndThree;
                if (it.name == name)
                    mesh = it;
            }
        });
        return mesh;
    }

    return {
        get_unique_id,
        create,
        add,
        add_to_mesh,
        remove,
        get_mesh_by_id,
        move_mesh,
        move_mesh_id,
        find_next_id_mesh,
        make_graph,
        debug_graph,
        save_editor,
        load_editor,
        serialize_mesh,
        deserialize_mesh,
        save_scene,
        load_scene,
        get_scene_list,
        set_mesh_name,
        update_mesh_url,
        get_mesh_id_by_url,
        get_mesh_url_by_id,
        get_mesh_by_name,
        find_nearest_gui_container,
        find_nearest_clipping_parent
    };
}