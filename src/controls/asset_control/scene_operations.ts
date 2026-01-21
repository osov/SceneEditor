// Модуль операций со сценами

import { SCENE_EXT } from '../../modules_editor/modules_editor_const';
import { get_client_api } from '../../modules_editor/ClientAPI';
import { error_popup } from '../../render_engine/helpers/utils';
import { Services } from '@editor/core';
import { get_popups } from '../../modules_editor/Popups';
import { get_control_manager } from '../../modules_editor/ControlManager';
import type { BaseEntityData } from '../../core/render/types';
import type { AssetControlState } from './types';
import { Quaternion, Vector3 } from 'three';

/** Фабрика для создания менеджера операций со сценами */
export function create_scene_operations(
    state: AssetControlState,
    go_to_dir: (path: string, renew?: boolean) => Promise<void>
) {
    async function open_scene(path: string) {
        if (path === undefined) {
            Services.logger.warn('[open_scene] Попытка открыть сцену, но путь undefined');
            return;
        }
        const result = await set_current_scene(path);
        if (result) {
            await load_scene(path);
        }
    }

    async function set_current_scene(path: string): Promise<boolean> {
        if (path === undefined) {
            Services.logger.warn('[set_current_scene] Попытка установить сцену, но путь undefined');
            return false;
        }
        const resp = await get_client_api().set_current_scene(path);
        if (!resp || resp.result === 0) {
            get_popups().toast.error(`Серверу не удалось установить сцену текущей: ${resp.message}`);
            return false;
        }
        state.current_scene.name = resp.data?.name as string;
        state.current_scene.path = resp.data?.path as string;
        localStorage.setItem('current_scene_name', state.current_scene.name);
        localStorage.setItem('current_scene_path', state.current_scene.path);
        state.history_length_cache[path] = Services.history.get_undo_stack().length;
        return true;
    }

    async function load_scene(path: string): Promise<void> {
        const resp = await get_client_api().get_data(path);
        if (!resp || resp.result === 0 || !resp.data) {
            get_popups().toast.error(`Не удалось получить данные сцены от сервера: ${resp.message}`);
            return;
        }
        const parsed = JSON.parse(resp.data) as BaseEntityData[] | { scene_data: BaseEntityData[] };

        // Поддержка обоих форматов: массив [...] или объект {scene_data: [...]}
        const scene_data = Array.isArray(parsed) ? parsed : parsed.scene_data;

        if (scene_data === undefined) {
            get_popups().toast.error('Неверный формат файла сцены');
            return;
        }

        Services.scene.load_scene(scene_data);
        get_control_manager().update_graph(true, state.current_scene.name, true);
    }

    async function save_current_scene(
        new_scene_popup: (current_path: string, set_scene_current?: boolean, save_scene?: boolean) => void
    ) {
        if (!state.current_scene.name && state.current_dir !== undefined) {
            // Если у AssetControl нет данных о текущем открытом файле сцены, создаём новый файл сцены
            new_scene_popup(state.current_dir, true, true);
            return;
        }
        const path = state.current_scene.path as string;
        const name = state.current_scene.name as string;
        const data = Services.scene.save_scene();
        const r = await get_client_api().save_data(path, JSON.stringify({ scene_data: data }));
        if (r && r.result) {
            state.history_length_cache[path] = Services.history.get_undo_stack().length;
            return get_popups().toast.success(`Сцена ${name} сохранена, путь: ${path}`);
        }
        return get_popups().toast.error(`Не удалось сохранить сцену ${name}, путь: ${path}: ${r.message}`);
    }

    async function new_scene(path: string, name: string) {
        const scene_path = `${path}/${name}.${SCENE_EXT}`;
        const r = await get_client_api().save_data(scene_path, JSON.stringify({ scene_data: [] }));
        if (r.result === 0) {
            error_popup(`Не удалось создать сцену, ответ сервера: ${r.message}`);
            return;
        }
        if (r.result && r.data) {
            await go_to_dir(path, true);
        }
        return scene_path;
    }

    function loadPartOfSceneInPos(
        pathToScene: string,
        position?: Vector3,
        _rotation?: Quaternion,
        scale?: Vector3,
        with_check = false
    ) {
        if (pathToScene.substring(0, 1) !== '/')
            pathToScene = `/${pathToScene}`;
        const info = Services.resources.get_scene_info(pathToScene);
        if (!info) {
            return Services.logger.error(`Не удалось получить данные сцены: ${pathToScene}`);
        }

        if (with_check && !info.is_component) {
            return Services.logger.error(`${pathToScene} не может быть создан, так как он содержит вложенные GO`);
        }

        const obj_data = info.data;
        const root = Services.scene.deserialize_object(obj_data, false) as any;

        // NOTE: ищем уникальное имя для root и всех его детей
        const baseName = obj_data.name;
        let counter = 1;
        let uniqueName = baseName;
        while (Services.scene.get_id_by_url(':/' + uniqueName) !== undefined) {
            uniqueName = `${baseName}_${counter}`;
            counter++;
        }
        Services.scene.set_name(root, uniqueName);

        if (position) root.set_position(position.x, position.y, position.z);
        if (_rotation) root.set_rotation(_rotation);
        if (scale) root.set_scale(scale.x, scale.y);
        let id_parent = -1;
        const selected = Services.selection.selected;
        if (selected.length === 1)
            id_parent = selected[0].mesh_data.id;

        Services.scene.add(root, id_parent);

        const mesh_id = root.mesh_data.id;
        const mesh_data = Services.scene.serialize_object(root);
        const next_id = Services.scene.find_next_sibling_id(root);

        Services.history.push({
            type: 'import_model',
            description: 'Импорт модели',
            data: { mesh_id, mesh_data, next_id, id_parent },
            undo: (data) => {
                Services.scene.remove_by_id(data.mesh_id);
                Services.transform.detach();
                Services.selection.clear();
                Services.ui.update_hierarchy();
            },
            redo: (data) => {
                const parent = data.id_parent === -1
                    ? Services.render.scene
                    : Services.scene.get_by_id(data.id_parent);
                if (parent) {
                    const m = Services.scene.deserialize_object(data.mesh_data, true);
                    parent.add(m);
                    Services.scene.move(m, data.id_parent, data.next_id);
                    Services.selection.set_selected([m as any]);
                    Services.ui.update_hierarchy();
                }
            }
        });
        root.position.z = 0;

        Services.selection.set_selected([root]);

        return root;
    }

    function open_scene_exit_popup(current_path: string, new_path: string) {
        get_popups().open({
            type: 'Confirm',
            params: {
                title: '',
                text: `У сцены "${current_path}" есть несохранённые изменения, закрыть без сохранения?`,
                button: 'Да',
                buttonNo: 'Нет',
                auto_close: true
            },
            callback: async (success) => {
                if (success && new_path !== undefined) {
                    Services.history.clear();
                    await open_scene(new_path);
                }
            }
        });
    }

    function get_current_scene() {
        return state.current_scene;
    }

    return {
        open_scene,
        set_current_scene,
        load_scene,
        save_current_scene,
        new_scene,
        loadPartOfSceneInPos,
        open_scene_exit_popup,
        get_current_scene,
    };
}

export type SceneOperations = ReturnType<typeof create_scene_operations>;
