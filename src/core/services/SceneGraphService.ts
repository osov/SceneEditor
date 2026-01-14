/**
 * Сервис управления графом сцены
 *
 * Отвечает за логику работы с иерархией объектов сцены:
 * - Хранение и преобразование данных графа
 * - Управление выделением
 * - Управление буфером обмена (cut/copy)
 * - Генерация событий изменения
 *
 * Этот сервис отделён от UI (TreeControl) для:
 * - Тестируемости логики
 * - Возможности переиспользования в разных UI
 * - Соответствия принципу отделения логики от представления
 */

import type { ILogger } from '../di/types';

/**
 * Элемент дерева сцены
 */
export interface SceneGraphItem {
    /** Уникальный идентификатор */
    id: number;
    /** ID родителя (-1 для корневых) */
    pid: number;
    /** Отображаемое имя */
    name: string;
    /** Тип объекта (для иконки) */
    type: string;
    /** Активен ли объект */
    active: boolean;
    /** Видим ли объект */
    visible: boolean;
    /** Можно ли перетаскивать */
    draggable: boolean;
    /** Можно ли бросить внутрь */
    droppable: boolean;
    /** Можно ли переименовать */
    renamable: boolean;
    /** Можно ли удалить */
    removable: boolean;
}

/**
 * Событие изменения выделения
 */
export interface SelectionChangedEvent {
    /** Новый список выделенных ID */
    selected: number[];
    /** Предыдущий список выделенных ID */
    previous: number[];
}

/**
 * Событие изменения графа
 */
export interface GraphChangedEvent {
    /** Добавленные элементы */
    added: SceneGraphItem[];
    /** Удалённые ID */
    removed: number[];
    /** Изменённые элементы */
    modified: SceneGraphItem[];
}

/**
 * Параметры создания сервиса
 */
export interface SceneGraphServiceParams {
    logger?: ILogger;
}

/**
 * Интерфейс сервиса графа сцены
 */
export interface ISceneGraphService {
    // === Данные графа ===

    /** Получить все элементы графа */
    get_items(): SceneGraphItem[];

    /** Получить элемент по ID */
    get_item(id: number): SceneGraphItem | undefined;

    /** Установить данные графа */
    set_items(items: SceneGraphItem[]): void;

    /** Обновить элемент */
    update_item(id: number, changes: Partial<SceneGraphItem>): void;

    // === Выделение ===

    /** Получить выделенные ID */
    get_selected(): number[];

    /** Установить выделение */
    set_selected(ids: number[], clear_previous?: boolean): void;

    /** Добавить к выделению */
    add_to_selection(ids: number[]): void;

    /** Убрать из выделения */
    remove_from_selection(ids: number[]): void;

    /** Очистить выделение */
    clear_selection(): void;

    /** Выделить диапазон (для Shift+Click) */
    select_range(from_id: number, to_id: number): void;

    // === Буфер обмена ===

    /** Получить вырезанные ID */
    get_cut_list(): number[];

    /** Установить список вырезанных */
    set_cut_list(ids: number[]): void;

    /** Очистить список вырезанных */
    clear_cut_list(): void;

    // === Навигация ===

    /** Получить детей элемента */
    get_children(parent_id: number): SceneGraphItem[];

    /** Получить родителя */
    get_parent(id: number): SceneGraphItem | undefined;

    /** Получить путь до корня */
    get_path_to_root(id: number): SceneGraphItem[];

    /** Получить развёрнутые узлы */
    get_expanded(): number[];

    /** Установить развёрнутые узлы */
    set_expanded(ids: number[]): void;

    /** Развернуть узел */
    expand(id: number): void;

    /** Свернуть узел */
    collapse(id: number): void;

    /** Переключить состояние узла */
    toggle_expanded(id: number): void;

    // === Подписки ===

    /** Подписаться на изменение выделения */
    on_selection_changed(callback: (event: SelectionChangedEvent) => void): () => void;

    /** Подписаться на изменение графа */
    on_graph_changed(callback: (event: GraphChangedEvent) => void): () => void;
}

/**
 * Создаёт сервис графа сцены
 */
export function create_scene_graph_service(params: SceneGraphServiceParams = {}): ISceneGraphService {
    const { logger } = params;

    // === Состояние ===
    let _items: SceneGraphItem[] = [];
    let _items_map = new Map<number, SceneGraphItem>();
    let _selected: number[] = [];
    let _cut_list: number[] = [];
    let _expanded = new Set<number>();

    // === Подписчики ===
    const _selection_listeners: Array<(event: SelectionChangedEvent) => void> = [];
    const _graph_listeners: Array<(event: GraphChangedEvent) => void> = [];

    // === Вспомогательные функции ===

    function rebuild_map() {
        _items_map.clear();
        for (const item of _items) {
            _items_map.set(item.id, item);
        }
    }

    function emit_selection_changed(previous: number[]) {
        const event: SelectionChangedEvent = {
            selected: [..._selected],
            previous,
        };
        for (const listener of _selection_listeners) {
            try {
                listener(event);
            } catch (e) {
                logger?.error('Ошибка в обработчике selection_changed:', e);
            }
        }
    }

    function emit_graph_changed(added: SceneGraphItem[], removed: number[], modified: SceneGraphItem[]) {
        const event: GraphChangedEvent = { added, removed, modified };
        for (const listener of _graph_listeners) {
            try {
                listener(event);
            } catch (e) {
                logger?.error('Ошибка в обработчике graph_changed:', e);
            }
        }
    }

    // === Публичные методы ===

    function get_items(): SceneGraphItem[] {
        return [..._items];
    }

    function get_item(id: number): SceneGraphItem | undefined {
        return _items_map.get(id);
    }

    function set_items(items: SceneGraphItem[]) {
        const old_ids = new Set(_items.map(i => i.id));
        const new_ids = new Set(items.map(i => i.id));

        const added = items.filter(i => !old_ids.has(i.id));
        const removed = _items.filter(i => !new_ids.has(i.id)).map(i => i.id);

        _items = [...items];
        rebuild_map();

        if (added.length > 0 || removed.length > 0) {
            emit_graph_changed(added, removed, []);
        }

        logger?.debug('Граф обновлён:', { total: items.length, added: added.length, removed: removed.length });
    }

    function update_item(id: number, changes: Partial<SceneGraphItem>) {
        const item = _items_map.get(id);
        if (item === undefined) {
            logger?.warn('Элемент не найден для обновления:', id);
            return;
        }

        Object.assign(item, changes);
        emit_graph_changed([], [], [item]);
    }

    function get_selected(): number[] {
        return [..._selected];
    }

    function set_selected(ids: number[], clear_previous = true) {
        const previous = [..._selected];

        if (clear_previous) {
            _selected = [...ids];
        } else {
            // Добавляем уникальные
            const current_set = new Set(_selected);
            for (const id of ids) {
                if (!current_set.has(id)) {
                    _selected.push(id);
                }
            }
        }

        emit_selection_changed(previous);
    }

    function add_to_selection(ids: number[]) {
        set_selected(ids, false);
    }

    function remove_from_selection(ids: number[]) {
        const previous = [..._selected];
        const to_remove = new Set(ids);
        _selected = _selected.filter(id => !to_remove.has(id));

        if (_selected.length !== previous.length) {
            emit_selection_changed(previous);
        }
    }

    function clear_selection() {
        if (_selected.length === 0) return;

        const previous = [..._selected];
        _selected = [];
        emit_selection_changed(previous);
    }

    function select_range(from_id: number, to_id: number) {
        // Находим индексы в плоском списке
        const from_idx = _items.findIndex(i => i.id === from_id);
        const to_idx = _items.findIndex(i => i.id === to_id);

        if (from_idx === -1 || to_idx === -1) return;

        const start = Math.min(from_idx, to_idx);
        const end = Math.max(from_idx, to_idx);

        const ids = _items.slice(start, end + 1).map(i => i.id);
        set_selected(ids);
    }

    function get_cut_list(): number[] {
        return [..._cut_list];
    }

    function set_cut_list(ids: number[]) {
        _cut_list = [...ids];
    }

    function clear_cut_list() {
        _cut_list = [];
    }

    function get_children(parent_id: number): SceneGraphItem[] {
        return _items.filter(i => i.pid === parent_id);
    }

    function get_parent(id: number): SceneGraphItem | undefined {
        const item = _items_map.get(id);
        if (item === undefined) return undefined;
        return _items_map.get(item.pid);
    }

    function get_path_to_root(id: number): SceneGraphItem[] {
        const path: SceneGraphItem[] = [];
        let current = _items_map.get(id);

        while (current !== undefined) {
            path.push(current);
            current = _items_map.get(current.pid);
        }

        return path;
    }

    function get_expanded(): number[] {
        return [..._expanded];
    }

    function set_expanded(ids: number[]) {
        _expanded = new Set(ids);
    }

    function expand(id: number) {
        _expanded.add(id);
    }

    function collapse(id: number) {
        _expanded.delete(id);
    }

    function toggle_expanded(id: number) {
        if (_expanded.has(id)) {
            _expanded.delete(id);
        } else {
            _expanded.add(id);
        }
    }

    function on_selection_changed(callback: (event: SelectionChangedEvent) => void): () => void {
        _selection_listeners.push(callback);
        return () => {
            const idx = _selection_listeners.indexOf(callback);
            if (idx !== -1) {
                _selection_listeners.splice(idx, 1);
            }
        };
    }

    function on_graph_changed(callback: (event: GraphChangedEvent) => void): () => void {
        _graph_listeners.push(callback);
        return () => {
            const idx = _graph_listeners.indexOf(callback);
            if (idx !== -1) {
                _graph_listeners.splice(idx, 1);
            }
        };
    }

    logger?.info('SceneGraphService создан');

    return {
        get_items,
        get_item,
        set_items,
        update_item,

        get_selected,
        set_selected,
        add_to_selection,
        remove_from_selection,
        clear_selection,
        select_range,

        get_cut_list,
        set_cut_list,
        clear_cut_list,

        get_children,
        get_parent,
        get_path_to_root,
        get_expanded,
        set_expanded,
        expand,
        collapse,
        toggle_expanded,

        on_selection_changed,
        on_graph_changed,
    };
}
