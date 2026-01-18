/**
 * HierarchyGraphService - сервис построения графа для дерева иерархии
 *
 * Отвечает за:
 * - Построение данных для TreeControl
 * - Определение видимости узлов (с учётом неактивных родителей)
 * - Обновление дерева при изменениях в сцене
 */

import { is_base_mesh } from '../render_engine/helpers/utils';
import { DEFOLD_LIMITS } from '../config';
import { componentsGo } from '../shared/types';
import type { IBaseMeshAndThree } from '../render_engine/types';
import type { TreeItem } from '../modules_editor/TreeControl';
import type { ILogger, IEventBus } from '@editor/core/di/types';

/** Интерфейс сервиса графа иерархии */
export interface IHierarchyGraphService {
    /** Получить данные для TreeControl */
    get_tree_graph(): TreeItem[];
    /** Обновить граф и уведомить TreeControl */
    update_graph(is_first?: boolean, name?: string, is_load_scene?: boolean): void;
    /** Получить текущее имя сцены */
    get_current_scene_name(): string;
    /** Установить имя сцены */
    set_scene_name(name: string): void;
}

/** Параметры создания сервиса */
export interface HierarchyGraphServiceParams {
    logger: ILogger;
    event_bus: IEventBus;
    scene_service: {
        make_graph(): Array<{ id: number; pid: number; name: string; type: string }>;
        get_all(): IBaseMeshAndThree[];
    };
    selection_service: {
        selected: { mesh_data: { id: number } }[];
    };
    camera_service: {
        load_scene_state(name: string): void;
    };
    tree_control: {
        draw_graph(items: TreeItem[], scene_id: string, is_first: boolean, flag: boolean, is_load_scene: boolean): void;
        set_selected_items(ids: number[]): void;
    };
}

/** Создать HierarchyGraphService */
export function create_hierarchy_graph_service(params: HierarchyGraphServiceParams): IHierarchyGraphService {
    const { scene_service, selection_service, camera_service, tree_control } = params;

    let current_scene_name = 'Сцена';

    /**
     * Проверить видимость элемента
     */
    function is_item_visible(item: IBaseMeshAndThree): boolean {
        return item.get_active() && item.get_visible();
    }

    /**
     * Получить ID детей неактивных родителей
     * Эти элементы должны отображаться как невидимые в дереве
     */
    function get_parent_inactive_children_ids(list: IBaseMeshAndThree[]): number[] {
        const ids: number[] = [];
        for (const item of list) {
            const is_inactive = !item.get_active() || ids.includes(item.mesh_data.id);
            if (is_inactive && item.children.length > 0) {
                for (const child of item.children) {
                    if (is_base_mesh(child)) {
                        ids.push((child as IBaseMeshAndThree).mesh_data.id);
                    }
                }
            }
        }
        return ids;
    }

    /**
     * Построить граф для TreeControl
     */
    function get_tree_graph(): TreeItem[] {
        const graph = scene_service.make_graph();
        const scene_list = scene_service.get_all();
        const parent_inactive_ids = get_parent_inactive_children_ids(scene_list);
        const selected_ids = selection_service.selected.map(m => m.mesh_data.id);

        const list: TreeItem[] = [];

        // Корневой элемент сцены
        list.push({
            id: -1,
            pid: -2,
            name: current_scene_name,
            icon: 'scene',
            selected: false,
            visible: true,
        });

        // Элементы сцены
        for (let i = 0; i < graph.length; i++) {
            const g_item = graph[i];
            const scene_item = scene_list[i];

            const item: TreeItem = {
                id: g_item.id,
                pid: g_item.pid,
                name: g_item.name,
                icon: g_item.type,
                selected: selected_ids.includes(g_item.id),
                visible: parent_inactive_ids.includes(g_item.id)
                    ? false
                    : is_item_visible(scene_item),
            };

            // Запрет drop для компонентов Go
            if (DEFOLD_LIMITS && componentsGo.includes(g_item.type)) {
                item.no_drop = true;
            }

            list.push(item);
        }

        return list;
    }

    /**
     * Обновить граф и перерисовать дерево
     */
    function update_graph(is_first = false, name = '', is_load_scene = false): void {
        if (name !== '') {
            current_scene_name = name;
            camera_service.load_scene_state(name);
        }
        tree_control.draw_graph(get_tree_graph(), 'test_scene', is_first, false, is_load_scene);
    }

    /**
     * Получить текущее имя сцены
     */
    function get_current_scene_name(): string {
        return current_scene_name;
    }

    /**
     * Установить имя сцены
     */
    function set_scene_name(name: string): void {
        current_scene_name = name;
    }

    return {
        get_tree_graph,
        update_graph,
        get_current_scene_name,
        set_scene_name,
    };
}
