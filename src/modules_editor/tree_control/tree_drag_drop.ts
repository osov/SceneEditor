/**
 * Drag-and-drop элементов дерева
 *
 * Перетаскивание и перемещение элементов в иерархии
 */

import { Services } from '@editor/core';
import type { TreeItem } from '../../editor/hierarchy';
import type { TreeState, MovedListResult, DropPositionType } from './types';
import type { TreeHighlightFactory } from './tree_highlight';
import {
    items_to_scene_objects,
    item_to_scene_object,
    is_child,
    is_parent_no_drop,
    has_position_changed,
    find_next_id_item_by_pid
} from './tree_data_utils';
import { update_contexts } from './tree_scroll_utils';

/**
 * Параметры для создания drag-drop handler
 */
export interface TreeDragDropParams {
    state: TreeState;
    highlight: TreeHighlightFactory;
}

/**
 * Создаёт фабрику для drag-drop
 */
export function create_tree_drag_drop(params: TreeDragDropParams) {
    const { state, highlight } = params;

    /**
     * Очищает состояние drag-drop
     */
    function clear(): void {
        const box_dd = state.get_box_dd();
        const current_droppable = state.get_current_droppable();

        state.set_dd_visible(false);
        box_dd.classList.remove('pos');
        box_dd.removeAttribute('style');
        current_droppable?.classList.remove('droppable');
        state.set_is_move_item_drag(false);
        state.set_is_edit_item(false);
        state.set_is_current_only(false);
        state.set_current_drop_position(null);
        state.set_tree_item(null);
        state.set_item_drag(null);
        state.set_item_drop(null);
        state.set_is_drop(false);
        state.set_count_move(0);

        const items = document.querySelectorAll('.tree__item') as NodeListOf<HTMLElement>;
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            item.classList.remove('top', 'bg', 'bottom');
        }
    }

    /**
     * Проверяет, началось ли движение
     */
    function is_move(offset_x: number, offset_y: number, start_x: number, start_y: number): boolean {
        return Math.abs(offset_x - start_x) > 12 || Math.abs(offset_y - start_y) > 8;
    }

    /**
     * Получает результат перемещения
     */
    function get_moved_list(
        list: number[],
        drag: TreeItem,
        drop: TreeItem,
        type: string
    ): MovedListResult | null {
        if (list.length === 0 || drag === null || drop === null || type === '' || !list.includes(drag.id)) {
            return null;
        }

        if (!has_position_changed(drag, drop, type)) return null;

        const tree_list = state.get_tree_list();

        if (type === 'top') {
            return { pid: drop.pid, next_id: drop.id, id_mesh_list: list };
        }
        if (type === 'bg') {
            return drop.no_drop === true ? null : { pid: drop.id, next_id: -1, id_mesh_list: list };
        }
        if (type === 'bottom') {
            const next_id = find_next_id_item_by_pid(tree_list, drop.id, drop.pid) ?? -1;
            return { pid: drop.pid, next_id, id_mesh_list: list };
        }

        return null;
    }

    /**
     * Переключает класс для позиции drop
     */
    function switch_class_item(elem: HTMLElement | null, page_x: number, page_y: number): void {
        if (elem === null) return;

        const items = document.querySelectorAll('.tree__item') as NodeListOf<HTMLElement>;
        items.forEach(i => i.classList.remove('top', 'bg', 'bottom'));

        const pos_in_item = get_pos_mouse_in_block(elem, page_x, page_y);
        if (pos_in_item === false || pos_in_item === null) {
            elem.classList.remove('top', 'bg', 'bottom');
            state.set_current_drop_position(null);
            return;
        }

        elem.classList.add(pos_in_item);
        state.set_current_drop_position(pos_in_item);
        state.set_can_be_opened(false);

        if (pos_in_item === 'top' || pos_in_item === 'bottom') {
            put_around();
        }
        if (pos_in_item === 'bg') {
            state.set_can_be_opened(true);
            put_inside();
        }
    }

    /**
     * Определяет позицию мыши в блоке
     */
    function get_pos_mouse_in_block(elem: HTMLElement, page_x: number, page_y: number): DropPositionType {
        if (elem === null) return false;

        const item = elem.classList.contains('tree__item') ? elem : elem.closest('.tree__item') as HTMLElement | null;
        if (item === null) return false;

        const item_bg = item.querySelector('.tree__item_bg') as HTMLElement | null;
        if (item_bg === null) return false;

        const mouse_y = page_y;
        const mouse_x = page_x;

        const item_top = item.getBoundingClientRect().top;
        const item_bottom = item_top + item.clientHeight;
        const item_left = item_bg.getBoundingClientRect().left;
        const item_right = item_left + item_bg.clientWidth;

        const head_item = item_top + (item.clientHeight * 0.2);
        const foot_item = item_top + (item.clientHeight * 0.8);

        if (mouse_x >= item_left && mouse_x <= item_right) {
            if (mouse_y >= item_top && mouse_y <= head_item) return 'top';
            if (mouse_y >= foot_item && mouse_y <= item_bottom) return 'bottom';
            if (mouse_y > head_item && mouse_y < foot_item) return 'bg';
            return false;
        }

        return false;
    }

    /**
     * Перемещает элемент drag-drop за курсором
     */
    function move_at(page_x: number, page_y: number): void {
        const item_drop = state.get_item_drop();
        const item_drag = state.get_item_drag();
        const tree_item = state.get_tree_item();
        const box_dd = state.get_box_dd();
        const is_dragging = state.get_is_dragging();

        if (item_drop === null || item_drag?.id === item_drop?.id) {
            state.set_dd_visible(false);
            box_dd.classList.remove('pos');
            return;
        }

        if (tree_item !== null && is_dragging && item_drag?.no_drag !== true) {
            state.set_dd_visible(true);
            box_dd.classList.add('pos');
            box_dd.style.left = page_x - 22 + 'px';
            box_dd.style.top = page_y + 'px';
        }
    }

    /**
     * Переключает класс droppable
     */
    function toggle_current_box(droppable_below: HTMLElement | null): void {
        const current_droppable = state.get_current_droppable();
        const is_move_item_drag = state.get_is_move_item_drag();

        if (current_droppable !== droppable_below) {
            if (current_droppable !== null) {
                current_droppable.classList.remove('droppable');
            }
            state.set_current_droppable(droppable_below);
            if (droppable_below !== null && is_move_item_drag) {
                droppable_below.classList.add('droppable');
            }
        }
    }

    /**
     * Обработка drop внутрь элемента
     */
    function put_inside(): void {
        const current_droppable = state.get_current_droppable();
        const tree_list = state.get_tree_list();
        const list_selected = state.get_list_selected();
        const item_drag = state.get_item_drag();
        const tree_item = state.get_tree_item();
        const box_dd = state.get_box_dd();
        const dd_visible = state.get_dd_visible();

        const item_drop = tree_list.find(e => e.id === +(current_droppable?.getAttribute('data-id') ?? '0')) ?? null;
        state.set_item_drop(item_drop);

        const item_selected = tree_list.filter((e) => e.id === list_selected[0]);
        const can_be_moved = Services.actions.is_valid_action(
            item_to_scene_object(item_drop),
            items_to_scene_objects(item_selected),
            true,
            true
        );

        if (
            (list_selected.length === 1 && current_droppable === tree_item)
            || item_drag?.no_drag === true
            || can_be_moved === false
        ) {
            current_droppable?.classList.remove('success');
            box_dd.classList.remove('active');
            state.set_is_drop(false);
        } else {
            if (dd_visible) box_dd.classList.add('pos');

            if (
                (item_drop?.no_drop === true && item_drag !== null)
                || (item_drop !== null && item_drag !== null && is_child(tree_list, item_drag.id, item_drop.pid) && list_selected.length === 1)
            ) {
                box_dd.classList.remove('active');
                current_droppable?.classList.remove('success');
                state.set_is_drop(false);
            } else {
                box_dd.classList.add('active');
                current_droppable?.classList.add('success');
                state.set_is_drop(true);
            }
        }
    }

    /**
     * Обработка drop рядом с элементом
     */
    function put_around(): void {
        const current_droppable = state.get_current_droppable();
        const tree_list = state.get_tree_list();
        const list_selected = state.get_list_selected();
        const item_drag = state.get_item_drag();
        const tree_item = state.get_tree_item();
        const box_dd = state.get_box_dd();
        const dd_visible = state.get_dd_visible();
        const current_drop_position = state.get_current_drop_position();

        const item_drop = tree_list.find(e => e.id === +(current_droppable?.getAttribute('data-id') ?? '0')) ?? null;
        state.set_item_drop(item_drop);

        const list_selected_full = tree_list.filter((e) => list_selected.includes(e.id));
        const parent_drop = tree_list.filter((e) => e.id === item_drop?.pid);
        const can_be_moved = Services.actions.is_valid_action(
            item_to_scene_object(parent_drop[0] ?? null),
            items_to_scene_objects(list_selected_full),
            false,
            true
        );

        if (
            (list_selected.length === 1 && current_droppable === tree_item)
            || (item_drop?.pid ?? 0) < -2
            || item_drag?.no_drag === true
            || can_be_moved === false
        ) {
            current_droppable?.classList.remove('success');
            box_dd.classList.remove('pos');
            state.set_is_drop(false);
        } else {
            if (dd_visible) box_dd.classList.add('pos');

            const should_block_drop =
                item_drop?.pid === -2
                || (item_drop !== null && item_drag !== null && is_child(tree_list, item_drag.id, item_drop.pid) && list_selected.length === 1)
                || (current_drop_position === 'bottom' && item_drag !== null && item_drop !== null && is_parent_no_drop(tree_list, item_drag, item_drop));

            if (should_block_drop) {
                box_dd.classList.remove('active');
                current_droppable?.classList.remove('success');
                state.set_is_drop(false);
            } else {
                box_dd.classList.add('active');
                current_droppable?.classList.add('success');
                state.set_is_drop(true);
            }
        }
    }

    /**
     * Добавляет обработчик hover с задержкой для раскрытия
     */
    function add_hover_delay_event_listener(element: HTMLElement, delay = 1200): void {
        const contexts = state.get_contexts();
        const current_scene_name = state.get_current_scene_name();

        element.addEventListener('mouseover', () => {
            if (element.classList.contains('active')) return;
            const item_drag = state.get_item_drag();
            if (item_drag === null) return;

            state.set_hover_start(Date.now());
            state.set_hover_end(null);

            const timer = setTimeout(() => {
                const hover_end = state.get_hover_end();
                const can_be_opened = state.get_can_be_opened();
                if (hover_end === null && can_be_opened) {
                    element.classList.add('active');
                    update_contexts(contexts, current_scene_name, element, true);
                    highlight.paint_identical();
                }
            }, delay);

            state.set_hover_timer(timer);
        });

        element.addEventListener('mouseout', () => {
            if (element.classList.contains('active')) return;
            const item_drag = state.get_item_drag();
            if (item_drag === null) return;

            state.set_hover_end(Date.now());
            const hover_start = state.get_hover_start();
            const hover_end = state.get_hover_end()!;
            const hover_time = hover_end - hover_start;

            const hover_timer = state.get_hover_timer();
            if (hover_timer !== null) {
                clearTimeout(hover_timer);
            }

            if (hover_time < delay) {
                element.classList.remove('active');
                update_contexts(contexts, current_scene_name, element, false);
            }
        });
    }

    /**
     * Добавляет обработчик клика по кнопке раскрытия
     */
    function add_tree_btn_event_listener(btn: HTMLElement): void {
        const contexts = state.get_contexts();
        const current_scene_name = state.get_current_scene_name();

        btn.addEventListener('click', () => {
            const li = btn.closest('li');
            if (li === null) return;

            const tree_sub = li.querySelector('.tree_sub') as HTMLElement | null;
            if (tree_sub === null) return;

            tree_sub.style.height = 'auto';
            const height_sub = tree_sub.clientHeight + 'px';
            tree_sub.style.height = height_sub;

            if (li.classList.contains('active')) {
                setTimeout(() => { tree_sub.style.height = '0px'; }, 0);
                li.classList.remove('active');
                update_contexts(contexts, current_scene_name, li, false);
            } else {
                tree_sub.style.height = '0px';
                setTimeout(() => { tree_sub.style.height = height_sub; }, 0);
                li.classList.add('active');
                update_contexts(contexts, current_scene_name, li, true);
                highlight.paint_identical();
            }

            setTimeout(() => { tree_sub.removeAttribute('style'); }, 160);
        });
    }

    return {
        clear,
        is_move,
        get_moved_list,
        switch_class_item,
        get_pos_mouse_in_block,
        move_at,
        toggle_current_box,
        put_inside,
        put_around,
        add_hover_delay_event_listener,
        add_tree_btn_event_listener,
    };
}

/**
 * Тип для фабрики drag-drop
 */
export type TreeDragDropFactory = ReturnType<typeof create_tree_drag_drop>;
