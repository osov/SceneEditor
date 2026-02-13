/**
 * ControlManager - координатор UI контролов редактора
 *
 * Координирует работу специализированных сервисов:
 * - TransformModeService: переключение режимов трансформации
 * - HierarchyGraphService: построение графа для дерева
 * - ResourceDialogService: диалоги атласов и слоёв
 *
 * Также обрабатывает события иерархии и историю операций.
 */

import { is_base_mesh } from '../render_engine/helpers/utils';
import type { IBaseMeshAndThree } from '../render_engine/types';
import type { TreeItem } from './TreeControl';
import Stats from 'stats.js';
import { IS_CAMERA_ORTHOGRAPHIC } from '../config';
import { HistoryOwner } from './modules_editor_const';
import { Services, try_get_service } from '@editor/core';
import type { ISceneObject } from '@editor/engine/types';
import {
    create_hierarchy_graph_service,
    type IHierarchyGraphService,
} from '../editor/HierarchyGraphService';
import {
    create_resource_dialog_service,
    type IResourceDialogService,
} from '../editor/ResourceDialogService';
import {
    create_transform_mode_service,
    type ITransformModeService,
    type TransformButtonType,
} from '../editor/TransformModeService';

// Тип HistoryData для undo
type HistoryData = {
    MESH_MOVE: { id_mesh: number; pid: number; next_id: number };
    MESH_NAME: { mesh_id: number; value: string };
    MESH_VISIBLE: { mesh_id: number; value: boolean };
};

/** Тип ControlManager */
export type ControlManagerType = ReturnType<typeof ControlManagerCreate>;

export function ControlManagerCreate() {
    let current_draw_call = 0;

    // Создаём сервисы
    let hierarchy_graph_service: IHierarchyGraphService;
    let resource_dialog_service: IResourceDialogService;
    let transform_mode_service: ITransformModeService;

    function init() {
        // Инициализируем сервисы после того как Services доступны
        hierarchy_graph_service = create_hierarchy_graph_service({
            logger: Services.logger,
            event_bus: Services.event_bus,
            scene_service: Services.scene as unknown as Parameters<typeof create_hierarchy_graph_service>[0]['scene_service'],
            selection_service: Services.selection,
            camera_service: Services.camera,
            tree_control: Services.tree_control,
        });

        resource_dialog_service = create_resource_dialog_service({
            logger: Services.logger,
            event_bus: Services.event_bus,
            resources_service: Services.resources,
        });

        transform_mode_service = create_transform_mode_service({
            logger: Services.logger,
            transform_service: Services.transform,
            size_service: Services.size,
            selection_service: Services.selection,
            default_mode: IS_CAMERA_ORTHOGRAPHIC ? 'size_transform_btn' : 'translate_transform_btn',
        });

        // Инициализируем режимы трансформации
        transform_mode_service.init();

        // Подписываемся на события
        setup_event_handlers();

        // Инициализируем статистику
        init_stats();

        // Загружаем состояние камеры
        Services.camera.load_scene_state('');
    }

    function setup_event_handlers() {
        // Событие выделения
        Services.event_bus.on('selection:mesh_list', (data) => {
            const e = data as { list: IBaseMeshAndThree[] };
            (window as unknown as Record<string, unknown>).selected = e.list[0];
            transform_mode_service.update_selected(e.list as unknown as ISceneObject[]);
            hierarchy_graph_service.update_graph();
        });

        // Событие снятия выделения
        Services.event_bus.on('selection:cleared', () => {
            (window as unknown as Record<string, unknown>).selected = null;
            Services.transform.detach();
            Services.size.detach();
            hierarchy_graph_service.update_graph();
        });

        // Выбор из графа иерархии
        Services.event_bus.on('hierarchy:selected', (data) => {
            const e = data as { list: number[] };
            const list: IBaseMeshAndThree[] = [];
            for (const id of e.list) {
                const m = Services.scene.get_by_id(id) as IBaseMeshAndThree | undefined;
                if (m !== undefined) {
                    list.push(m);
                }
            }
            Services.selection.set_selected(list as unknown as ISceneObject[]);
            Services.tree_control.set_selected_items(e.list);
            if (list.length === 0) {
                Services.event_bus.emit('selection:cleared', {});
            }
        });

        // Перемещение в иерархии
        Services.event_bus.on('hierarchy:moved', handle_hierarchy_moved);

        // Переименование в иерархии
        Services.event_bus.on('hierarchy:renamed', handle_hierarchy_renamed);
    }

    function handle_hierarchy_moved(data: unknown) {
        const e = data as {
            id_mesh_list?: number[];
            id?: number;
            pid?: number;
            parent_id?: number;
            next_id?: number;
        };

        // Событие от SceneService (только id) - пропускаем
        if (e.id_mesh_list === undefined) {
            return;
        }

        const id_mesh_list = e.id_mesh_list;
        const pid = e.pid ?? e.parent_id ?? -1;

        // Сохраняем текущее состояние ДО перемещения для истории
        const saved_list: HistoryData['MESH_MOVE'][] = [];
        const mesh_list: IBaseMeshAndThree[] = [];

        for (const id of id_mesh_list) {
            const mesh = Services.scene.get_by_id(id) as IBaseMeshAndThree | undefined;
            if (mesh === undefined) {
                Services.logger.error('mesh is null', id);
                continue;
            }

            const parent = mesh.parent;
            let current_pid = -1;
            if (parent !== null && is_base_mesh(parent)) {
                current_pid = (parent as IBaseMeshAndThree).mesh_data.id;
            }

            saved_list.push({
                id_mesh: id,
                pid: current_pid,
                next_id: Services.scene.find_next_sibling_id(mesh as unknown as ISceneObject),
            });
            mesh_list.push(mesh);
        }

        const target_pid = pid;
        const target_next_id = e.next_id ?? -1;

        // Записываем в историю
        Services.history.push({
            type: 'MESH_MOVE',
            data: { items: saved_list, owner: HistoryOwner.CONTROL_MANAGER },
            description: 'Move objects',
            undo: (d) => undo_mesh_move(d.items),
            redo: () => {
                for (const mesh_id of id_mesh_list) {
                    Services.scene.move_by_id(mesh_id, target_pid, target_next_id);
                }
            },
        });

        // Выполняем перемещение
        for (const mesh_id of id_mesh_list) {
            Services.scene.move_by_id(mesh_id, target_pid, target_next_id);
        }

        // Обновляем выделение
        Services.selection.set_selected(mesh_list as unknown as ISceneObject[]);
        hierarchy_graph_service.update_graph();
    }

    function handle_hierarchy_renamed(data: unknown) {
        const e = data as { id: number; name: string };
        const mesh = Services.scene.get_by_id(e.id) as IBaseMeshAndThree | undefined;

        if (mesh === undefined) {
            Services.logger.error('mesh is null', e.id);
            return;
        }

        const old_name = mesh.name;

        // Записываем в историю
        Services.history.push({
            type: 'MESH_NAME',
            data: { mesh_id: e.id, value: old_name, owner: HistoryOwner.CONTROL_MANAGER },
            description: 'Rename object',
            undo: (d) => {
                const m = Services.scene.get_by_id(d.mesh_id) as IBaseMeshAndThree | undefined;
                if (m !== undefined) {
                    Services.scene.set_name(m as unknown as ISceneObject, d.value);
                    Services.selection.set_selected([m as unknown as ISceneObject]);
                    hierarchy_graph_service.update_graph();
                }
            },
            redo: () => {
                const m = Services.scene.get_by_id(e.id) as IBaseMeshAndThree | undefined;
                if (m !== undefined) {
                    Services.scene.set_name(m as unknown as ISceneObject, e.name);
                    Services.selection.set_selected([m as unknown as ISceneObject]);
                    hierarchy_graph_service.update_graph();
                }
            },
        });

        Services.scene.set_name(mesh as unknown as ISceneObject, e.name);
        Services.selection.set_selected([mesh as unknown as ISceneObject]);
        hierarchy_graph_service.update_graph();
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
        hierarchy_graph_service.update_graph();
    }

    function init_stats() {
        const params = new URLSearchParams(document.location.search);
        if (params.has('stats')) {
            const div = document.createElement('div');
            div.style.cssText = 'position: absolute;z-index: 10000;top: 50px;left: 45px;font-size: 12px;';
            div.innerHTML = `Draw Call: <span id="draw_call">100</span><br>Zoom: <span id="zoom">${Services.camera.get_zoom().toFixed(2)}</span>`;
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
                if (render !== undefined && render.is_active()) {
                    div_dc.innerHTML = render.renderer.info.render.calls.toString();
                } else {
                    div_dc.innerHTML = current_draw_call.toString();
                }
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

    // === Публичный API (делегирование сервисам) ===

    function clear_all_controls() {
        transform_mode_service.clear_all_controls();
    }

    function set_active_control(name: TransformButtonType) {
        transform_mode_service.set_active_mode(name);
    }

    function get_tree_graph(): TreeItem[] {
        return hierarchy_graph_service.get_tree_graph();
    }

    function update_graph(is_first = false, name = '', is_load_scene = false) {
        hierarchy_graph_service.update_graph(is_first, name, is_load_scene);
    }

    function get_current_scene_name(): string {
        return hierarchy_graph_service.get_current_scene_name();
    }

    function open_atlas_manager() {
        resource_dialog_service.open_atlas_manager();
    }

    function open_layer_manager() {
        resource_dialog_service.open_layer_manager();
    }

    init();

    return {
        clear_all_controls,
        set_active_control,
        get_tree_graph,
        update_graph,
        get_current_scene_name,
        open_atlas_manager,
        open_layer_manager,
        inc_draw_calls,
        clear_draw_calls,
    };
}
