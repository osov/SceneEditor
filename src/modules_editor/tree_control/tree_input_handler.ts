/**
 * Обработка ввода (мышь, клавиатура) для дерева
 */

import { Services } from '@editor/core';
import type { TreeState } from './types';
import type { ElementCacheFactory } from './tree_element_cache';
import { scroll_to_elem_in_parent, is_element_in_viewport } from './tree_scroll_utils';

/**
 * Параметры для создания input handler
 */
export interface TreeInputHandlerParams {
    state: TreeState;
    element_cache: ElementCacheFactory;
}

/**
 * Создаёт фабрику для обработки ввода
 */
export function create_tree_input_handler(params: TreeInputHandlerParams) {
    const { state } = params;

    /**
     * Получает текущий активный элемент
     */
    function get_current_active_element(): HTMLElement | null {
        const selected_element = document.querySelector('.tree__item.selected') as HTMLElement | null;
        if (selected_element !== null) return selected_element;

        const focused_element = document.activeElement?.closest('.tree__item') as HTMLElement | null;
        if (focused_element !== null) return focused_element;

        const first_element = document.querySelector('.tree__item') as HTMLElement | null;
        if (first_element !== null) return first_element;

        return null;
    }

    /**
     * Получает предыдущий видимый элемент
     */
    function get_previous_element(current_element: HTMLElement): HTMLElement | null {
        const all_elements = Array.from(document.querySelectorAll('.tree__item')) as HTMLElement[];
        const current_index = all_elements.indexOf(current_element);

        if (current_index <= 0) return null;

        for (let i = current_index - 1; i >= 0; i--) {
            const element = all_elements[i];
            if (is_element_visible(element)) {
                return element;
            }
        }

        return null;
    }

    /**
     * Получает следующий видимый элемент
     */
    function get_next_element(current_element: HTMLElement): HTMLElement | null {
        const all_elements = Array.from(document.querySelectorAll('.tree__item')) as HTMLElement[];
        const current_index = all_elements.indexOf(current_element);

        if (current_index === -1 || current_index >= all_elements.length - 1) return null;

        for (let i = current_index + 1; i < all_elements.length; i++) {
            const element = all_elements[i];
            if (is_element_visible(element)) {
                return element;
            }
        }

        return null;
    }

    /**
     * Получает родительский элемент
     */
    function get_parent_element(current_element: HTMLElement): HTMLElement | null {
        const tree_list = state.get_tree_list();
        const current_id = Number(current_element.getAttribute('data-id'));
        if (current_id === 0) return null;

        const current_item = tree_list.find(item => item.id === current_id);
        if (current_item === undefined || current_item.pid === -2) return null;

        const parent_element = document.querySelector(`.tree__item[data-id="${current_item.pid}"]`) as HTMLElement | null;
        return parent_element;
    }

    /**
     * Проверяет видимость элемента (не скрыт ли родитель)
     */
    function is_element_visible(element: HTMLElement): boolean {
        let parent = element.parentElement;
        let idx = 0;
        while (parent !== null) {
            if (idx !== 0 && parent.classList.contains('li_line') && !parent.classList.contains('active')) {
                return false;
            }
            parent = parent.parentElement;
            idx++;
        }
        return true;
    }

    /**
     * Выделяет элемент
     */
    function select_element(element: HTMLElement): void {
        const div_tree = state.get_div_tree();
        const all_elements = document.querySelectorAll('.tree__item');
        all_elements.forEach(el => el.classList.remove('selected'));

        element.classList.add('selected');

        const element_id = Number(element.getAttribute('data-id'));
        if (element_id !== 0) {
            state.set_list_selected([element_id]);
            state.set_shift_anchor_id(element_id);

            Services.event_bus.emit('hierarchy:selected', { list: [element_id] });
        }

        if (!is_element_in_viewport(div_tree, element)) {
            scroll_to_elem_in_parent(div_tree, element);
        }

        element.focus();
    }

    /**
     * Навигация к предыдущему элементу
     */
    function navigate_to_previous(): void {
        const current_element = get_current_active_element();
        if (current_element === null) {
            const first_element = document.querySelector('.tree__item') as HTMLElement | null;
            if (first_element !== null) {
                select_element(first_element);
            }
            return;
        }

        const previous_element = get_previous_element(current_element);
        if (previous_element !== null && previous_element.closest('.tree__item')?.getAttribute('data-id') !== '-1') {
            select_element(previous_element);
        }
    }

    /**
     * Навигация к следующему элементу
     */
    function navigate_to_next(): void {
        const current_element = get_current_active_element();
        if (current_element === null) {
            const first_element = document.querySelector('.tree__item') as HTMLElement | null;
            if (first_element !== null) {
                select_element(first_element);
            }
            return;
        }

        const next_element = get_next_element(current_element);
        if (next_element !== null) {
            select_element(next_element);
        }
    }

    /**
     * Навигация к родительскому элементу
     */
    function navigate_to_parent(): void {
        const current_element = get_current_active_element();
        if (current_element === null) return;

        const parent_element = get_parent_element(current_element);
        if (parent_element !== null && parent_element.closest('.tree__item')?.getAttribute('data-id') !== '-1') {
            select_element(parent_element);
        }
    }

    /**
     * Обработчик нажатия клавиш
     */
    function on_key_down(event: KeyboardEvent): void {
        const target = event.target as HTMLElement;

        if (!(target.closest('.tree_div') !== null || target.tagName === 'BODY')) {
            return;
        }

        if (target.closest('.tree__item_name[contenteditable="true"]') !== null) {
            return;
        }

        const current_element = get_current_active_element();
        if (current_element === null && target.closest('.tree_div') !== null) {
            const first_element = document.querySelector('.tree__item') as HTMLElement | null;
            if (first_element !== null) {
                select_element(first_element);
            }
        }

        switch (event.key) {
            case 'ArrowUp':
                navigate_to_previous();
                break;
            case 'ArrowDown':
                navigate_to_next();
                break;
            case 'ArrowLeft':
                navigate_to_parent();
                break;
        }
    }

    return {
        get_current_active_element,
        get_previous_element,
        get_next_element,
        get_parent_element,
        is_element_visible,
        select_element,
        navigate_to_previous,
        navigate_to_next,
        navigate_to_parent,
        on_key_down,
    };
}

/**
 * Тип для фабрики input handler
 */
export type TreeInputHandlerFactory = ReturnType<typeof create_tree_input_handler>;
