/**
 * ControlManager - координатор UI контролов редактора
 *
 * Управляет переключением режимов трансформации,
 * обновлением дерева иерархии, менеджерами атласов и слоёв.
 */

import { is_base_mesh } from "../render_engine/helpers/utils";
import { IBaseMeshAndThree } from "../render_engine/types";
import { TreeItem, get_tree_control } from "./TreeControl";
import { componentsGo } from "../shared/types";
import { cbDataItem, Action, get_popups } from "./Popups";
import Stats from 'stats.js';
import { DEFOLD_LIMITS, IS_CAMERA_ORTHOGRAPHIC } from "../config";
import { HistoryOwner } from "./modules_editor_const";
import { Services, try_get_service } from '@editor/core';
import type { ISceneObject } from '@editor/engine/types';

// CameraControl и SizeControl мигрированы на Services.camera и Services.size

// Тип HistoryData для undo
type HistoryData = {
    MESH_MOVE: { id_mesh: number; pid: number; next_id: number };
    MESH_NAME: { mesh_id: number; value: string };
    MESH_VISIBLE: { mesh_id: number; value: boolean };
};

/** Тип ControlManager */
export type ControlManagerType = ReturnType<typeof ControlManagerCreate>;

/** Модульный instance для использования через импорт */
let control_manager_instance: ControlManagerType | undefined;

/** Получить instance ControlManager */
export function get_control_manager(): ControlManagerType {
    if (control_manager_instance === undefined) {
        throw new Error('ControlManager не инициализирован. Вызовите register_control_manager() сначала.');
    }
    return control_manager_instance;
}

export function register_control_manager() {
    control_manager_instance = ControlManagerCreate();
}

type ButtonsList = 'translate_transform_btn' | 'scale_transform_btn' | 'rotate_transform_btn' | 'size_transform_btn';

function ControlManagerCreate() {
    let active_control = '';
    let current_scene_name = 'Сцена';
    let current_draw_call = 0;

    function init() {
        bind_btn('translate_transform_btn', () => set_active_control('translate_transform_btn'));
        bind_btn('scale_transform_btn', () => set_active_control('scale_transform_btn'));
        bind_btn('rotate_transform_btn', () => set_active_control('rotate_transform_btn'));
        bind_btn('size_transform_btn', () => set_active_control('size_transform_btn'));

        // Используем DI EventBus
        Services.event_bus.on('selection:mesh_list', (data) => {
            const e = data as { list: IBaseMeshAndThree[] };
            (window as unknown as Record<string, unknown>).selected = e.list[0];
            Services.transform.set_selected_list(e.list);
            Services.size.set_selected_list(e.list as unknown as ISceneObject[]);
            update_graph();
        });

        Services.event_bus.on('selection:cleared', () => {
            (window as unknown as Record<string, unknown>).selected = null;
            Services.transform.detach();
            Services.size.detach();
            update_graph();
        });

        // Graph select - используем DI Selection
        Services.event_bus.on('hierarchy:selected', (data) => {
            const e = data as { list: number[] };
            const list: IBaseMeshAndThree[] = [];
            for (let i = 0; i < e.list.length; i++) {
                const m = Services.scene.get_by_id(e.list[i]) as IBaseMeshAndThree | undefined;
                if (m !== undefined)
                    list.push(m);
            }
            // Используем DI SelectionService
            Services.selection.set_selected(list as unknown as ISceneObject[]);
            get_tree_control().set_selected_items(e.list);
            if (list.length === 0)
                Services.event_bus.emit('selection:cleared', {});
        });

        Services.event_bus.on('hierarchy:moved', (data) => {
            const e = data as { id_mesh_list: number[]; pid: number; next_id: number };
            // save history
            const saved_list: HistoryData['MESH_MOVE'][] = [];
            const mesh_list: IBaseMeshAndThree[] = [];
            for (let i = 0; i < e.id_mesh_list.length; i++) {
                const id = e.id_mesh_list[i];
                const mesh = Services.scene.get_by_id(id) as IBaseMeshAndThree | undefined;
                if (mesh === undefined) {
                    Services.logger.error('mesh is null', id);
                    continue;
                }
                const parent = mesh.parent;
                let pid = -1;
                if (parent !== null && is_base_mesh(parent))
                    pid = (parent as IBaseMeshAndThree).mesh_data.id;
                saved_list.push({ id_mesh: id, pid: pid, next_id: Services.scene.find_next_sibling_id(mesh as unknown as ISceneObject) });
                mesh_list.push(mesh);
            }
            // Используем DI HistoryService
            Services.history.push({
                type: 'MESH_MOVE',
                data: { items: saved_list, owner: HistoryOwner.CONTROL_MANAGER },
                description: 'Move objects',
                undo: (d) => undo_mesh_move(d.items),
                redo: () => {
                    // Redo будет выполнять то же перемещение
                    for (let i = 0; i < e.id_mesh_list.length; i++) {
                        const id = e.id_mesh_list[i];
                        Services.scene.move_by_id(id, e.pid, e.next_id);
                    }
                },
            });
            // move
            for (let i = 0; i < e.id_mesh_list.length; i++) {
                const id = e.id_mesh_list[i];
                Services.scene.move_by_id(id, e.pid, e.next_id);
            }
            Services.selection.set_selected(mesh_list as unknown as ISceneObject[]);
            update_graph();
        });

        Services.event_bus.on('hierarchy:renamed', (data) => {
            const e = data as { id: number; name: string };
            const mesh = Services.scene.get_by_id(e.id) as IBaseMeshAndThree | undefined;
            if (mesh === undefined) {
                Services.logger.error('mesh is null', e.id);
                return;
            }
            const old_name = mesh.name;
            // Используем DI HistoryService
            Services.history.push({
                type: 'MESH_NAME',
                data: { mesh_id: e.id, value: old_name, owner: HistoryOwner.CONTROL_MANAGER },
                description: 'Rename object',
                undo: (d) => {
                    const m = Services.scene.get_by_id(d.mesh_id) as IBaseMeshAndThree | undefined;
                    if (m !== undefined) {
                        Services.scene.set_name(m as unknown as ISceneObject, d.value);
                        Services.selection.set_selected([m as unknown as ISceneObject]);
                        update_graph();
                    }
                },
                redo: () => {
                    const m = Services.scene.get_by_id(e.id) as IBaseMeshAndThree | undefined;
                    if (m !== undefined) {
                        Services.scene.set_name(m as unknown as ISceneObject, e.name);
                        Services.selection.set_selected([m as unknown as ISceneObject]);
                        update_graph();
                    }
                },
            });
            Services.scene.set_name(mesh as unknown as ISceneObject, e.name);
            Services.selection.set_selected([mesh as unknown as ISceneObject]);
            update_graph();
        });

        set_active_control(IS_CAMERA_ORTHOGRAPHIC ? 'size_transform_btn' : 'translate_transform_btn');
        init_stats();
        Services.camera.load_scene_state('');
    }

    function undo_mesh_move(items: HistoryData['MESH_MOVE'][]) {
        const mesh_list: IBaseMeshAndThree[] = [];
        for (const data of items) {
            const mesh = Services.scene.get_by_id(data.id_mesh) as IBaseMeshAndThree | undefined;
            if (mesh !== undefined) {
                Services.scene.move(mesh as unknown as ISceneObject, data.pid, data.next_id);
                mesh_list.push(mesh);
            }
        }
        Services.selection.set_selected(mesh_list as unknown as ISceneObject[]);
        update_graph();
    }

    function init_stats() {
        const params = new URLSearchParams(document.location.search);
        if (params.has("stats")) {
            const div = document.createElement('div');
            div.style.cssText = ' position: absolute;z-index: 10000;top: 50px;left: 45px;font-size: 12px;';
            div.innerHTML = 'Draw Call: <span id="draw_call">100</span><br>Zoom: <span id="zoom">' + Services.camera.get_zoom().toFixed(2) + '</span>';
            document.body.appendChild(div);
            const div_dc = document.getElementById('draw_call')!;
            const div_zoom = document.getElementById('zoom')!;
            const stats = new Stats();
            stats.dom.style.cssText = 'position:fixed;top:0;left:45px;cursor:pointer;opacity:0.9;z-index:10000';
            stats.showPanel(0);
            document.body.appendChild(stats.dom);
            Services.event_bus.on('engine:update', () => stats.begin());
            Services.event_bus.on('engine:update_end', () => {
                stats.end();
                const render = try_get_service('render');
                if (render !== undefined && render.is_active())
                    div_dc.innerHTML = render.renderer.info.render.calls.toString();
                else
                    div_dc.innerHTML = current_draw_call.toString();
                div_zoom.innerHTML = Services.camera.get_zoom().toFixed(2);
            });
        }
    }

    function inc_draw_calls(cnt: number) {
        current_draw_call += cnt;
    }

    function clear_draw_calls() {
        current_draw_call = 0;
    }

    function bind_btn(name: ButtonsList, callback: () => void) {
        const btn = document.querySelector('.menu_min a.' + name);
        if (btn !== null) {
            btn.addEventListener('click', callback);
        }
    }

    function set_active_control(name: ButtonsList) {
        if (name === active_control) return;
        clear_all_controls();
        set_active_btn(name);

        // Получаем выделенные объекты через DI
        const selected = Services.selection.selected as IBaseMeshAndThree[];

        if (name === 'translate_transform_btn') {
            active_control = 'translate';
            Services.transform.set_active(true);
            Services.transform.set_mode('translate');
            Services.transform.set_selected_list(selected);
        }
        if (name === 'scale_transform_btn') {
            active_control = 'scale';
            Services.transform.set_active(true);
            Services.transform.set_mode('scale');
            Services.transform.set_selected_list(selected);
        }
        if (name === 'rotate_transform_btn') {
            active_control = 'rotate';
            Services.transform.set_active(true);
            Services.transform.set_mode('rotate');
            Services.transform.set_selected_list(selected);
        }
        if (name === 'size_transform_btn') {
            active_control = 'size';
            Services.size.set_active(true);
            Services.size.set_selected_list(selected as unknown as ISceneObject[]);
        }
    }

    function clear_all_controls() {
        const list = document.querySelectorAll('.menu_min a');
        for (let i = 0; i < list.length; i++) {
            list[i].classList.remove('active');
        }
        Services.transform.set_active(false);
        Services.size.set_active(false);
    }

    function set_active_btn(name: ButtonsList) {
        const btn = document.querySelector('.menu_min a.' + name);
        if (btn !== null) {
            btn.classList.add('active');
        }
    }

    function setVisible(item: IBaseMeshAndThree): boolean {
        return item.get_active() && item.get_visible();
    }

    function getParentActiveIds(list: IBaseMeshAndThree[]): number[] {
        const ids: number[] = [];
        list.forEach((item) => {
            if ((!item.get_active() || ids.includes(item.mesh_data.id)) && item.children.length > 0) {
                for (const child of item.children) {
                    if (is_base_mesh(child)) {
                        ids.push((child as IBaseMeshAndThree).mesh_data.id);
                    }
                }
            }
        });
        return ids;
    }

    function get_tree_graph() {
        const graph = Services.scene.make_graph();
        const scene_list = Services.scene.get_all() as IBaseMeshAndThree[];
        const parentActiveIds = getParentActiveIds(scene_list);
        // Используем DI SelectionService
        const sel_list_ids = Services.selection.selected.map(m => m.mesh_data.id);
        const list: TreeItem[] = [];
        list.push({ id: -1, pid: -2, name: current_scene_name, icon: 'scene', selected: false, visible: true });
        for (let i = 0; i < graph.length; i++) {
            const g_item = graph[i];
            const scene_item = scene_list[i];
            const item: TreeItem = {
                id: g_item.id,
                pid: g_item.pid,
                name: g_item.name,
                icon: g_item.type,
                selected: sel_list_ids.includes(g_item.id),
                visible: parentActiveIds.includes(g_item.id) ? false : setVisible(scene_item)
            };

            // no_drop для компонентов Go
            if (DEFOLD_LIMITS && componentsGo.includes(g_item.type)) { item.no_drop = true; }

            list.push(item);
        }
        return list;
    }

    function update_graph(is_first = false, name = '', is_load_scene = false) {
        if (name !== '') {
            current_scene_name = name;
            Services.camera.load_scene_state(name);
        }
        get_tree_control().draw_graph(get_tree_graph(), 'test_scene', is_first, false, is_load_scene);
    }

    function get_current_scene_name() {
        return current_scene_name;
    }

    function open_atlas_manager() {
        const atlases = Services.resources.get_all_atlases();
        const emptyIndex = atlases.findIndex((atlas: string) => atlas === '');
        if (emptyIndex !== -1) {
            atlases.splice(emptyIndex, 1);
        }
        const list = atlases.map((title: string, id: number) => {
            return { id: id.toString(), title, can_delete: true };
        });

        get_popups().open({
            type: "Layers",
            params: {
                title: "Atlas",
                button: "Add",
                list
            },
            callback: (success: boolean, data?: cbDataItem) => {
                if (!success) {
                    return;
                }

                switch (data?.action) {
                    case Action.ADD:
                        const added_item = data.item;
                        Services.resources.add_atlas(added_item.title);
                        Services.resources.write_metadata();
                        break;
                    case Action.DELETE:
                        const deleted_item = data.item;
                        Services.resources.del_atlas(deleted_item.title);
                        Services.resources.write_metadata();
                        break;
                }

                Services.event_bus.emit('assets:atlas_changed', {});
            }
        });
    }

    function open_layer_manager() {
        const list = Services.resources.get_layers().filter((l: string) => l !== 'default').map((title: string, id: number) => {
            return {
                id: id.toString(), title, can_delete: true
            };
        });

        get_popups().open({
            type: "Layers",
            params: {
                title: "Layer",
                button: "Add",
                list,
                with_index: true
            },
            callback: (success: boolean, data?: cbDataItem) => {
                if (!success) {
                    return;
                }

                switch (data?.action) {
                    case Action.ADD:
                        const added_item = data.item;
                        Services.resources.add_layer(added_item.title);
                        Services.resources.write_metadata();
                        break;
                    case Action.DELETE:
                        const deleted_item = data.item;
                        Services.resources.remove_layer(deleted_item.title);
                        Services.resources.write_metadata();
                        break;
                }

                Services.event_bus.emit('assets:layer_changed', {});
            }
        });
    }

    init();
    return { clear_all_controls, set_active_control, get_tree_graph, update_graph, get_current_scene_name, open_atlas_manager, open_layer_manager, inc_draw_calls, clear_draw_calls };
}
