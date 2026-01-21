/**
 * UI логика выделения элементов дерева
 *
 * Обработка кликов, ctrl/shift выделения
 */

import { Services } from '@editor/core';
import type { TreeSelectionServiceType, ItemsBetweenConfig } from '../../editor/hierarchy';
import type { TreeState } from './types';
import type { ElementCacheFactory } from './tree_element_cache';
import { get_flat_items_list } from './tree_data_utils';

/**
 * Параметры для создания selection UI handler
 */
export interface TreeSelectionUiParams {
    state: TreeState;
    element_cache: ElementCacheFactory;
    selection_service: TreeSelectionServiceType;
}

/**
 * Создаёт фабрику для UI выделения
 */
export function create_tree_selection_ui(params: TreeSelectionUiParams) {
    const { state, element_cache, selection_service } = params;

    /**
     * Конфигурация для сервиса выделения
     */
    const selection_config: ItemsBetweenConfig = {
        is_parent_expanded: (parent_id: number) => {
            const parent_element = element_cache.get_element_by_id(parent_id);
            if (parent_element === null) return false;

            const parent_li = parent_element.closest('li');
            if (parent_li === null) return false;

            return parent_li.classList.contains('active');
        }
    };

    /**
     * Получает ID элементов между двумя позициями для Shift-выделения
     */
    function get_items_between(start_id: number, end_id: number): number[] {
        const flat_items = get_flat_items_list();
        return selection_service.get_items_between(start_id, end_id, flat_items, selection_config);
    }

    /**
     * Обрабатывает клик для выделения
     */
    function toggle_class_selected(event: { target: EventTarget | null }): void {
        state.set_is_dragging(true);

        const target = event.target as HTMLElement;
        const btn = target.closest('.tree__btn');
        if (btn !== null) return;

        const current_item = target.closest('a.tree__item') as HTMLElement | null;
        if (current_item === null) return;

        const current_id = +(current_item.getAttribute('data-id') ?? '0');
        if (current_id === 0) return;

        // Убираем contenteditable у всех имён
        const items_name = document.querySelectorAll('a.tree__item .tree__item_name') as NodeListOf<HTMLElement>;
        for (let i = 0; i < items_name.length; i++) {
            items_name[i]?.removeAttribute('contenteditable');
        }

        const list_selected = state.get_list_selected();

        if (Services.input.is_control()) {
            // Ctrl зажат
            if (list_selected.includes(current_id)) {
                const is_one = list_selected.length === 1;
                state.set_is_dragging(list_selected.length > 1);
                current_item.classList.remove('selected');
                state.set_list_selected(list_selected.filter((item) => item !== current_id));
                state.set_is_current_only(true);

                if (is_one) {
                    Services.event_bus.emit('hierarchy:selected', { list: [] });
                }
            } else {
                current_item.classList.add('selected');
                list_selected.push(current_id);
                state.set_list_selected(list_selected);
            }
            state.set_shift_anchor_id(current_id);
        } else if (Services.input.is_shift() && list_selected.length > 0) {
            // Shift зажат
            const anchor_id = state.get_shift_anchor_id() ?? list_selected[0];
            const items_to_select = get_items_between(anchor_id, current_id);

            for (let i = 0; i < items_to_select.length; i++) {
                const id = items_to_select[i];
                if (!list_selected.includes(id)) {
                    const item = element_cache.get_element_by_id(id);
                    if (item !== null) {
                        item.classList.add('selected');
                        list_selected.push(id);
                    }
                }
            }
            state.set_list_selected(list_selected);
        } else {
            // Обычный клик
            if (list_selected.length === 0) {
                current_item.classList.add('selected');
                state.set_list_selected([current_id]);
            } else {
                if (list_selected.includes(current_id)) {
                    if (list_selected.length === 1) {
                        state.set_is_edit_item(true);
                    }
                    state.set_is_current_only(true);
                } else {
                    const menu_items = document.querySelectorAll('a.tree__item') as NodeListOf<HTMLElement>;
                    for (let i = 0; i < menu_items.length; i++) {
                        menu_items[i].classList.remove('selected');
                    }
                    current_item.classList.add('selected');
                    state.set_list_selected([current_id]);
                }
            }

            state.set_shift_anchor_id(current_id);
        }
    }

    /**
     * Отправляет событие выделения
     */
    function send_list_selected(event: { target: EventTarget | null; button: number }): void {
        const target = event.target as HTMLElement;
        const btn = target.closest('.tree__btn');
        if (btn !== null) return;

        const item_drag = state.get_item_drag();
        if (item_drag === null) return;
        if (event.button === 2 && target.closest('a.tree__item') === null) return;

        const list_selected = state.get_list_selected();
        const is_move_item_drag = state.get_is_move_item_drag();
        const is_current_only = state.get_is_current_only();
        const is_drop = state.get_is_drop();

        if (!is_move_item_drag) {
            // Если движения не было
            if (Services.input.is_control()) {
                Services.event_bus.emit('hierarchy:selected', { list: list_selected });
                return;
            }
            if (Services.input.is_shift()) {
                Services.event_bus.emit('hierarchy:selected', { list: list_selected });
                return;
            }
            if (list_selected.length > 1 && event.button === 0) {
                state.set_list_selected([item_drag.id]);
                Services.event_bus.emit('hierarchy:selected', { list: [item_drag.id] });
                return;
            }
            if (!is_current_only && list_selected.length <= 1) {
                Services.event_bus.emit('hierarchy:selected', { list: list_selected });
                return;
            }
        }

        // Если движение было
        if (Services.input.is_control() && is_current_only) {
            if (!list_selected.includes(item_drag.id)) {
                list_selected.push(item_drag.id);
                state.set_list_selected(list_selected);
            }
            return;
        }

        if (!is_current_only && list_selected.length <= 1 && !is_drop) {
            Services.event_bus.emit('hierarchy:selected', { list: list_selected });
            return;
        }
    }

    /**
     * Устанавливает выделенные элементы (для items которые не являются IBaseMeshAndThree)
     */
    function set_selected_items(list: number[]): void {
        for (const item_id of list) {
            const element = document.querySelector(`.tree__item[data-id="${item_id}"]`) as HTMLElement | null;
            if (element !== null) {
                element.classList.add('selected');
            }
        }
        state.set_list_selected(list);
    }

    return {
        get_items_between,
        toggle_class_selected,
        send_list_selected,
        set_selected_items,
        selection_config,
    };
}

/**
 * Тип для фабрики selection UI
 */
export type TreeSelectionUiFactory = ReturnType<typeof create_tree_selection_ui>;
