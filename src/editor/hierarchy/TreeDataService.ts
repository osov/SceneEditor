/**
 * TreeDataService - сервис данных дерева иерархии
 *
 * Управляет данными дерева без прямой работы с DOM.
 * Предоставляет чистый интерфейс для работы с иерархией.
 */

import type { ISceneObject } from '@editor/engine/types';
import { Services } from '@editor/core';

/** Элемент дерева иерархии */
export interface TreeItem {
    /** Уникальный ID элемента */
    id: number;
    /** ID родителя (0 = корень) */
    pid: number;
    /** Отображаемое имя */
    name: string;
    /** Видимость в редакторе */
    visible: boolean;
    /** Выделен ли элемент */
    selected: boolean;
    /** Иконка элемента */
    icon: string;
    /** Раскрыт ли узел */
    expanded: boolean;
    /** Запретить перетаскивание */
    no_drag: boolean;
    /** Запретить drop внутрь */
    no_drop: boolean;
    /** Запретить переименование */
    no_rename: boolean;
    /** Запретить удаление */
    no_remove: boolean;
    /** Глубина в дереве */
    depth: number;
}

/** Информация об изменениях в дереве */
export interface TreeChangesInfo {
    /** Изменилась ли структура дерева */
    structure_changed: boolean;
    /** Изменённые элементы */
    modified_items: TreeItem[];
    /** Новые элементы */
    new_items: TreeItem[];
    /** Удалённые ID */
    deleted_ids: number[];
}

/** Параметры сервиса */
export interface TreeDataServiceParams {
    /** Имя текущей сцены */
    scene_name?: string;
}

/** Интерфейс сервиса данных дерева */
export interface ITreeDataService {
    /** Получить все элементы дерева */
    get_items(): TreeItem[];

    /** Получить элемент по ID */
    get_item(id: number): TreeItem | undefined;

    /** Получить дочерние элементы */
    get_children(parent_id: number): TreeItem[];

    /** Получить родителя элемента */
    get_parent(id: number): TreeItem | undefined;

    /** Получить путь до элемента (от корня) */
    get_path(id: number): TreeItem[];

    /** Получить выделенные элементы */
    get_selected(): TreeItem[];

    /** Получить ID выделенных элементов */
    get_selected_ids(): number[];

    /** Выделить элементы */
    select(ids: number[]): void;

    /** Добавить к выделению */
    add_to_selection(ids: number[]): void;

    /** Убрать из выделения */
    remove_from_selection(ids: number[]): void;

    /** Очистить выделение */
    clear_selection(): void;

    /** Переключить раскрытие узла */
    toggle_expanded(id: number): void;

    /** Раскрыть узел и всех родителей */
    expand_to(id: number): void;

    /** Свернуть узел */
    collapse(id: number): void;

    /** Обновить данные из SceneService */
    sync_from_scene(): TreeChangesInfo;

    /** Переместить элемент */
    move_item(item_id: number, new_parent_id: number, before_id: number | null): boolean;

    /** Переименовать элемент */
    rename_item(id: number, new_name: string): boolean;

    /** Удалить элемент */
    remove_item(id: number): boolean;

    /** Получить буфер вырезания */
    get_cut_buffer(): number[];

    /** Вырезать элементы */
    cut(ids: number[]): void;

    /** Очистить буфер вырезания */
    clear_cut_buffer(): void;

    /** Установить имя текущей сцены */
    set_scene_name(name: string): void;

    /** Получить имя текущей сцены */
    get_scene_name(): string;
}

/** Создать TreeDataService */
export function create_tree_data_service(params?: TreeDataServiceParams): ITreeDataService {
    let items: TreeItem[] = [];
    let selected_ids: number[] = [];
    let cut_buffer: number[] = [];
    let expanded_state: Map<number, boolean> = new Map();
    let scene_name = params?.scene_name ?? 'root';

    function get_items(): TreeItem[] {
        return items;
    }

    function get_item(id: number): TreeItem | undefined {
        return items.find(item => item.id === id);
    }

    function get_children(parent_id: number): TreeItem[] {
        return items.filter(item => item.pid === parent_id);
    }

    function get_parent(id: number): TreeItem | undefined {
        const item = get_item(id);
        if (item === undefined || item.pid === 0) return undefined;
        return get_item(item.pid);
    }

    function get_path(id: number): TreeItem[] {
        const path: TreeItem[] = [];
        let current = get_item(id);

        while (current !== undefined) {
            path.unshift(current);
            if (current.pid === 0) break;
            current = get_item(current.pid);
        }

        return path;
    }

    function get_selected(): TreeItem[] {
        return items.filter(item => selected_ids.includes(item.id));
    }

    function get_selected_ids(): number[] {
        return [...selected_ids];
    }

    function select(ids: number[]): void {
        // Обновляем состояние выделения
        for (const item of items) {
            item.selected = ids.includes(item.id);
        }
        selected_ids = [...ids];
    }

    function add_to_selection(ids: number[]): void {
        const new_ids = ids.filter(id => !selected_ids.includes(id));
        selected_ids.push(...new_ids);

        for (const id of new_ids) {
            const item = get_item(id);
            if (item !== undefined) {
                item.selected = true;
            }
        }
    }

    function remove_from_selection(ids: number[]): void {
        selected_ids = selected_ids.filter(id => !ids.includes(id));

        for (const id of ids) {
            const item = get_item(id);
            if (item !== undefined) {
                item.selected = false;
            }
        }
    }

    function clear_selection(): void {
        for (const item of items) {
            item.selected = false;
        }
        selected_ids = [];
    }

    function toggle_expanded(id: number): void {
        const current = expanded_state.get(id) ?? true;
        expanded_state.set(id, !current);

        const item = get_item(id);
        if (item !== undefined) {
            item.expanded = !current;
        }
    }

    function expand_to(id: number): void {
        const path = get_path(id);
        for (const item of path) {
            expanded_state.set(item.id, true);
            item.expanded = true;
        }
    }

    function collapse(id: number): void {
        expanded_state.set(id, false);
        const item = get_item(id);
        if (item !== undefined) {
            item.expanded = false;
        }
    }

    function calculate_depth(item_id: number, scene_objects: Map<number, ISceneObject>): number {
        let depth = 0;
        let current_id = item_id;

        while (true) {
            const obj = scene_objects.get(current_id);
            if (obj === undefined) break;

            const parent = obj.parent as ISceneObject | undefined;
            if (parent === undefined || parent.mesh_data === undefined) break;

            depth++;
            current_id = parent.mesh_data.id;
        }

        return depth;
    }

    function get_icon_for_type(type: string): string {
        // Маппинг типов на иконки
        const icon_map: Record<string, string> = {
            'GUI_CONTAINER': 'gg-folder',
            'GO_CONTAINER': 'gg-folder',
            'GUI_BOX': 'gg-image',
            'GUI_TEXT': 'gg-font-height',
            'GO_SPRITE_COMPONENT': 'gg-image',
            'GO_LABEL_COMPONENT': 'gg-font-height',
            'SLICE9_PLANE': 'gg-image',
            'TEXT': 'gg-font-height',
            'AUDIO': 'gg-music-note',
        };

        return icon_map[type] ?? 'gg-shape-square';
    }

    function sync_from_scene(): TreeChangesInfo {
        const old_items = new Map(items.map(item => [item.id, item]));
        const new_items: TreeItem[] = [];
        const modified_items: TreeItem[] = [];
        const deleted_ids: number[] = [];

        // Получаем все объекты сцены
        const scene_objects = new Map<number, ISceneObject>();
        const all_objects = Services.scene.get_all();

        for (const obj of all_objects) {
            if (obj.mesh_data !== undefined) {
                scene_objects.set(obj.mesh_data.id, obj);
            }
        }

        // Создаём новый список items
        const fresh_items: TreeItem[] = [];

        for (const [id, obj] of scene_objects) {
            const parent_id = (obj.parent as ISceneObject | undefined)?.mesh_data?.id ?? 0;
            const old_item = old_items.get(id);

            const item: TreeItem = {
                id,
                pid: parent_id,
                name: obj.name ?? `Object_${id}`,
                visible: obj.get_visible?.() ?? true,
                selected: selected_ids.includes(id),
                icon: get_icon_for_type(obj.type ?? ''),
                expanded: expanded_state.get(id) ?? true,
                no_drag: obj.no_removing ?? false,
                no_drop: false,
                no_rename: obj.no_removing ?? false,
                no_remove: obj.no_removing ?? false,
                depth: calculate_depth(id, scene_objects),
            };

            fresh_items.push(item);

            if (old_item === undefined) {
                new_items.push(item);
            } else if (
                old_item.name !== item.name ||
                old_item.pid !== item.pid ||
                old_item.visible !== item.visible
            ) {
                modified_items.push(item);
            }
        }

        // Находим удалённые элементы
        for (const [id] of old_items) {
            if (!scene_objects.has(id)) {
                deleted_ids.push(id);
            }
        }

        // Сортируем по глубине для правильного отображения
        fresh_items.sort((a, b) => a.depth - b.depth);

        items = fresh_items;

        const structure_changed = new_items.length > 0 || deleted_ids.length > 0 || modified_items.some(
            item => old_items.get(item.id)?.pid !== item.pid
        );

        return {
            structure_changed,
            modified_items,
            new_items,
            deleted_ids,
        };
    }

    function move_item(item_id: number, new_parent_id: number, _before_id: number | null): boolean {
        const item = get_item(item_id);
        if (item === undefined) return false;

        // Проверяем что не перемещаем в своего потомка
        let check_id = new_parent_id;
        while (check_id !== 0) {
            if (check_id === item_id) return false;
            const check_item = get_item(check_id);
            if (check_item === undefined) break;
            check_id = check_item.pid;
        }

        item.pid = new_parent_id;
        return true;
    }

    function rename_item(id: number, new_name: string): boolean {
        const item = get_item(id);
        if (item === undefined || item.no_rename) return false;

        item.name = new_name;

        // Обновляем в сцене
        const obj = Services.scene.get_by_id(id);
        if (obj !== undefined) {
            obj.name = new_name;
        }

        return true;
    }

    function remove_item(id: number): boolean {
        const item = get_item(id);
        if (item === undefined || item.no_remove) return false;

        // Удаляем из списка
        items = items.filter(i => i.id !== id);

        // Удаляем из выделения
        remove_from_selection([id]);

        return true;
    }

    function get_cut_buffer(): number[] {
        return [...cut_buffer];
    }

    function cut(ids: number[]): void {
        cut_buffer = [...ids];
    }

    function clear_cut_buffer(): void {
        cut_buffer = [];
    }

    function set_scene_name(name: string): void {
        scene_name = name;
    }

    function get_scene_name(): string {
        return scene_name;
    }

    return {
        get_items,
        get_item,
        get_children,
        get_parent,
        get_path,
        get_selected,
        get_selected_ids,
        select,
        add_to_selection,
        remove_from_selection,
        clear_selection,
        toggle_expanded,
        expand_to,
        collapse,
        sync_from_scene,
        move_item,
        rename_item,
        remove_item,
        get_cut_buffer,
        cut,
        clear_cut_buffer,
        set_scene_name,
        get_scene_name,
    };
}
