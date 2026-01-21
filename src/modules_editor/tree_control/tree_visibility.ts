/**
 * Управление видимостью элементов дерева
 *
 * Обновление data-visible атрибутов при изменении видимости
 */

import type { TreeItem } from '../../editor/hierarchy';
import type { ElementCacheFactory } from './tree_element_cache';

/**
 * Параметры для создания visibility handler
 */
export interface TreeVisibilityParams {
    get_tree_list: () => TreeItem[];
    get_list_selected: () => number[];
    element_cache: ElementCacheFactory;
}

/**
 * Создаёт фабрику для управления видимостью
 */
export function create_tree_visibility(params: TreeVisibilityParams) {
    const { get_tree_list, get_list_selected, element_cache } = params;

    /**
     * Обновляет data-visible атрибут для элемента
     */
    function update_data_visible(id: number, value: string): void {
        const item = element_cache.get_element_by_id(id);
        if (item !== null) {
            item.setAttribute('data-visible', value);
        }
    }

    /**
     * Обрабатывает событие hierarchy:active
     */
    function update_active(e: { list: Array<{ id: number; visible: boolean }>; state: boolean }): void {
        const { list, state } = e;
        const tree_list = get_tree_list();
        const list_selected = get_list_selected();

        list.forEach((item) => {
            if (!state) {
                update_data_visible(item.id, 'false');
                return;
            }

            let is_visible = 'true';
            const parent_includes = check_parents_visible(tree_list, item.id, list);
            const parent_is_visible = check_parents_visible(tree_list, item.id);
            const parent_includes_ls = check_parents_visible(tree_list, item.id, [], list_selected);

            if (parent_is_visible) {
                if (!parent_includes || item.visible === false) is_visible = 'false';
                if (parent_includes) is_visible = parent_includes_ls ? 'false' : 'true';
            } else {
                is_visible = 'true';
            }

            update_data_visible(item.id, is_visible);
        });
    }

    /**
     * Проверяет видимость родителей рекурсивно
     */
    function check_parents_visible(
        tree_list: TreeItem[],
        id: number,
        ids: Array<{ id: number; visible: boolean }> = [],
        ls: number[] = []
    ): boolean {
        const item = tree_list.find((i) => i.id === id);
        if (item === undefined) return false;
        if (item.pid === -1) return false;

        const parent = tree_list.find((i) => i.id === item.pid);
        if (parent === undefined) return false;

        if (ls.length > 0) {
            if (ls.includes(parent.id)) {
                const pr = tree_list.find((i) => i.id === parent.pid);
                if (pr === undefined || pr.id === -1) return false;
                return parent.visible === false;
            }
            return check_parents_visible(tree_list, parent.id, [], ls);
        }

        if (ids.length > 0) {
            if (ids.find((i) => i.id === parent.id) !== undefined) return true;
            return check_parents_visible(tree_list, parent.id, ids);
        }

        if (parent.visible === false) return true;
        return check_parents_visible(tree_list, parent.id);
    }

    /**
     * Обрабатывает событие hierarchy:visibility_changed
     */
    function update_visible(e: { list: number[]; state: string }): void {
        const { list, state } = e;
        list.forEach((id) => {
            update_data_visible(id, state);
        });
    }

    return {
        update_data_visible,
        update_active,
        check_parents_visible,
        update_visible,
    };
}

/**
 * Тип для фабрики visibility
 */
export type TreeVisibilityFactory = ReturnType<typeof create_tree_visibility>;
