/**
 * TreeSelectionService - логика выделения элементов в дереве иерархии
 *
 * Извлечено из TreeControl.ts (Фаза 17)
 * Отделяет логику выделения от DOM-манипуляций
 */

import type { TreeItem, ITreeSelectionService } from './types';

/**
 * Режим выделения
 */
export enum SelectionMode {
    /** Обычный клик - заменяет выделение */
    SINGLE = 'single',
    /** Ctrl+клик - добавляет/убирает из выделения */
    TOGGLE = 'toggle',
    /** Shift+клик - выделяет диапазон */
    RANGE = 'range'
}

/**
 * Результат обработки клика по выделению
 */
export interface SelectionResult {
    /** Новый список выделенных ID */
    selected: number[];
    /** ID для якоря Shift-выделения */
    shift_anchor: number | null;
    /** ID которые были добавлены */
    added: number[];
    /** ID которые были убраны */
    removed: number[];
    /** Нужно ли отправить событие hierarchy:selected */
    should_emit: boolean;
}

/**
 * Конфигурация для получения элементов между двумя ID
 */
export interface ItemsBetweenConfig {
    /** Функция проверки развёрнут ли родитель */
    is_parent_expanded: (parentId: number) => boolean;
}

/**
 * Создаёт сервис выделения элементов дерева
 */
export function TreeSelectionServiceCreate(): ITreeSelectionService & {
    /** Обработать клик с учётом модификаторов */
    handle_click: (
        clicked_id: number,
        mode: SelectionMode,
        flat_items: TreeItem[],
        config: ItemsBetweenConfig
    ) => SelectionResult;
    /** Получить элементы между двумя ID */
    get_items_between: (
        start_id: number,
        end_id: number,
        flat_items: TreeItem[],
        config: ItemsBetweenConfig
    ) => number[];
    /** Получить якорь для Shift-выделения */
    get_shift_anchor: () => number | null;
    /** Установить якорь для Shift-выделения */
    set_shift_anchor: (id: number | null) => void;
    /** Получить предыдущий список выделенных */
    get_previous_selected: () => number[];
    /** Сохранить текущее выделение как предыдущее */
    save_previous_selection: () => void;
} {
    let selected_ids: number[] = [];
    let previous_selected: number[] = [];
    let shift_anchor_id: number | null = null;

    function get_selected(): number[] {
        return [...selected_ids];
    }

    function set_selected(ids: number[]): void {
        selected_ids = [...ids];
    }

    function add_to_selection(id: number): void {
        if (!selected_ids.includes(id)) {
            selected_ids.push(id);
        }
    }

    function remove_from_selection(id: number): void {
        selected_ids = selected_ids.filter(item => item !== id);
    }

    function clear_selection(): void {
        selected_ids = [];
    }

    function toggle_selection(id: number): void {
        if (selected_ids.includes(id)) {
            remove_from_selection(id);
        } else {
            add_to_selection(id);
        }
    }

    function get_shift_anchor(): number | null {
        return shift_anchor_id;
    }

    function set_shift_anchor(id: number | null): void {
        shift_anchor_id = id;
    }

    function get_previous_selected(): number[] {
        return [...previous_selected];
    }

    function save_previous_selection(): void {
        previous_selected = [...selected_ids];
    }

    /**
     * Получает уровень элемента в иерархии
     */
    function get_item_level(item: TreeItem, flat_items: TreeItem[]): number {
        let level = 0;
        let current_item = item;

        while (current_item.pid !== -2 && current_item.pid !== 0) {
            const parent = flat_items.find(p => p.id === current_item.pid);
            if (parent === undefined) break;
            current_item = parent;
            level++;
        }

        return level;
    }

    /**
     * Получает предков элемента
     */
    function get_ancestors(item: TreeItem, flat_items: TreeItem[]): TreeItem[] {
        const ancestors: TreeItem[] = [];
        let current_item = item;

        while (current_item.pid !== -2 && current_item.pid !== 0) {
            const parent = flat_items.find(p => p.id === current_item.pid);
            if (parent === undefined) break;
            ancestors.push(parent);
            current_item = parent;
        }

        return ancestors;
    }

    /**
     * Получает общий уровень иерархии для двух элементов
     */
    function get_common_hierarchy_level(
        start_item: TreeItem,
        end_item: TreeItem,
        flat_items: TreeItem[]
    ): number {
        if (start_item.pid === end_item.pid) {
            return get_item_level(start_item, flat_items);
        }

        const start_ancestors = get_ancestors(start_item, flat_items);
        const end_ancestors = get_ancestors(end_item, flat_items);

        for (let i = 0; i < start_ancestors.length; i++) {
            const ancestor = start_ancestors[i];
            if (end_ancestors.some(end_ancestor => end_ancestor.id === ancestor.id)) {
                return get_item_level(ancestor, flat_items);
            }
        }

        return 0;
    }

    /**
     * Проверяет находится ли элемент в диапазоне
     */
    function is_item_in_range(
        item: TreeItem,
        start_item: TreeItem,
        end_item: TreeItem,
        flat_items: TreeItem[]
    ): boolean {
        const start_index = flat_items.findIndex(i => i.id === start_item.id);
        const end_index = flat_items.findIndex(i => i.id === end_item.id);
        const item_index = flat_items.findIndex(i => i.id === item.id);

        if (start_index === -1 || end_index === -1 || item_index === -1) {
            return false;
        }

        const min_index = Math.min(start_index, end_index);
        const max_index = Math.max(start_index, end_index);
        return item_index >= min_index && item_index <= max_index;
    }

    /**
     * Проверяет можно ли включить элемент в иерархическое выделение
     */
    function can_include_in_hierarchical_selection(
        item: TreeItem,
        start_item: TreeItem,
        end_item: TreeItem,
        common_level: number,
        flat_items: TreeItem[],
        config: ItemsBetweenConfig
    ): boolean {
        const item_level = get_item_level(item, flat_items);

        if (item_level === common_level) {
            return true;
        }

        if (item_level > common_level) {
            let parent = item;
            let current_level = item_level;
            while (current_level > common_level) {
                const parent_item = flat_items.find(p => p.id === parent.pid);
                if (parent_item === undefined) break;
                parent = parent_item;
                current_level--;
            }

            const parent_in_range = is_item_in_range(parent, start_item, end_item, flat_items);
            const parent_expanded = config.is_parent_expanded(parent.id);
            return parent_in_range && parent_expanded;
        }

        return false;
    }

    /**
     * Получает ID элементов между двумя элементами (для Shift-выделения)
     */
    function get_items_between(
        start_id: number,
        end_id: number,
        flat_items: TreeItem[],
        config: ItemsBetweenConfig
    ): number[] {
        const result: number[] = [];

        if (flat_items.length === 0) {
            return [start_id, end_id];
        }

        const start_index = flat_items.findIndex(item => item.id === start_id);
        const end_index = flat_items.findIndex(item => item.id === end_id);

        if (start_index === -1 || end_index === -1) {
            return [start_id, end_id];
        }

        const min_index = Math.min(start_index, end_index);
        const max_index = Math.max(start_index, end_index);

        const start_item = flat_items[start_index];
        const end_item = flat_items[end_index];
        const common_level = get_common_hierarchy_level(start_item, end_item, flat_items);

        for (let i = min_index; i <= max_index; i++) {
            const item = flat_items[i];

            if (can_include_in_hierarchical_selection(item, start_item, end_item, common_level, flat_items, config)) {
                result.push(item.id);
            }
        }

        return result;
    }

    /**
     * Обрабатывает клик по элементу с учётом модификаторов
     */
    function handle_click(
        clicked_id: number,
        mode: SelectionMode,
        flat_items: TreeItem[],
        config: ItemsBetweenConfig
    ): SelectionResult {
        const added: number[] = [];
        const removed: number[] = [];
        let should_emit = true;

        if (mode === SelectionMode.TOGGLE) {
            // Ctrl+клик - переключаем выделение элемента
            if (selected_ids.includes(clicked_id)) {
                removed.push(clicked_id);
                selected_ids = selected_ids.filter(id => id !== clicked_id);
                // Если был единственный - отправляем пустой список
                should_emit = removed.length === 1 && selected_ids.length === 0;
            } else {
                added.push(clicked_id);
                selected_ids.push(clicked_id);
            }
            shift_anchor_id = clicked_id;
        } else if (mode === SelectionMode.RANGE && selected_ids.length > 0) {
            // Shift+клик - выделяем диапазон
            const anchor = shift_anchor_id !== null ? shift_anchor_id : selected_ids[0];
            const items_to_select = get_items_between(anchor, clicked_id, flat_items, config);

            for (const id of items_to_select) {
                if (!selected_ids.includes(id)) {
                    added.push(id);
                    selected_ids.push(id);
                }
            }
        } else {
            // Обычный клик - заменяем выделение
            if (selected_ids.length === 0) {
                added.push(clicked_id);
                selected_ids = [clicked_id];
            } else if (selected_ids.includes(clicked_id)) {
                // Клик по уже выделенному
                if (selected_ids.length > 1) {
                    // Если несколько выделено - оставляем только текущий
                    removed.push(...selected_ids.filter(id => id !== clicked_id));
                    selected_ids = [clicked_id];
                }
                // Если один - ничего не делаем (можно включить редактирование)
                should_emit = selected_ids.length > 1;
            } else {
                // Клик по невыделенному
                removed.push(...selected_ids);
                added.push(clicked_id);
                selected_ids = [clicked_id];
            }
            shift_anchor_id = clicked_id;
        }

        return {
            selected: get_selected(),
            shift_anchor: shift_anchor_id,
            added,
            removed,
            should_emit
        };
    }

    return {
        get_selected,
        set_selected,
        add_to_selection,
        remove_from_selection,
        clear_selection,
        toggle_selection,
        handle_click,
        get_items_between,
        get_shift_anchor,
        set_shift_anchor,
        get_previous_selected,
        save_previous_selection
    };
}

/**
 * Тип сервиса выделения
 */
export type TreeSelectionServiceType = ReturnType<typeof TreeSelectionServiceCreate>;
