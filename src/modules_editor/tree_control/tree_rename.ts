/**
 * Логика переименования элементов дерева
 */

import { Services } from '@editor/core';
import type { TreeState } from './types';
import type { TreeHighlightFactory } from './tree_highlight';

/**
 * Параметры для создания rename handler
 */
export interface TreeRenameParams {
    state: TreeState;
    highlight: TreeHighlightFactory;
}

/**
 * Создаёт фабрику для переименования
 */
export function create_tree_rename(params: TreeRenameParams) {
    const { state, highlight } = params;

    /**
     * Начинает переименование элемента
     */
    function pre_rename(): void {
        const copy_item_drag = state.get_copy_item_drag();
        if (copy_item_drag === null) return;

        const item_name = document.querySelector(
            `.tree__item[data-id='${copy_item_drag.id}'] .tree__item_name`
        ) as HTMLElement | null;

        if (item_name === null || copy_item_drag.no_rename === true) return;

        item_name.setAttribute('contenteditable', 'true');
        item_name.focus();
        document.execCommand('selectAll', false, undefined);
        rename_item(copy_item_drag.id, item_name);
    }

    /**
     * Обрабатывает переименование элемента
     */
    function rename_item(id: number, item_name: HTMLElement): void {
        if (item_name === null || id === 0) return;

        // Подсвечиваем имя если не уникальное
        highlight.paint_identical_live(
            `.tree__item[data-id='${id}'] .tree__item_name`,
            '#wr_tree .tree__item_name',
            'color_red',
            555
        );

        function f_keypress(e: KeyboardEvent) {
            if (e.key === 'Enter') {
                e.preventDefault();
                f_blur();
            }
        }

        function f_blur() {
            item_name.removeEventListener('blur', f_blur);
            item_name.removeEventListener('keypress', f_keypress);
            item_name.removeAttribute('contenteditable');

            const name = 'value' in item_name
                ? ((item_name as HTMLInputElement).value?.trim() ?? '')
                : (item_name.textContent?.trim() ?? '');

            if (name === null || name === undefined) return;
            if (name.length === 0) return;

            Services.event_bus.emit('hierarchy:renamed', { id, name });
        }

        item_name.addEventListener('blur', f_blur);
        item_name.addEventListener('keypress', f_keypress);
    }

    /**
     * Устанавливает contenteditable при клике с задержкой
     */
    function set_contend_edit_able(event: { target: EventTarget | null }): void {
        const is_move_item_drag = state.get_is_move_item_drag();
        const is_edit_item = state.get_is_edit_item();
        const item_drag = state.get_item_drag();
        const item_drag_rename_id = state.get_item_drag_rename_id();

        if (is_move_item_drag) return; // если движение было
        if (!is_edit_item) return; // если выбран НЕ 1
        if (item_drag?.no_rename === true) return; // разрешено ли редактирование

        const target = event.target as HTMLElement;
        const current_item = target.closest('a.tree__item.selected') as HTMLElement | null;
        if (current_item === null) return;

        const current_id = +(current_item.getAttribute('data-id') ?? '0');
        if (current_id === 0) return;

        setTimeout(() => {
            // Проверяем, что это тот же элемент
            if (item_drag_rename_id !== current_id) return;
            pre_rename();
        }, 1200);
    }

    return {
        pre_rename,
        rename_item,
        set_contend_edit_able,
    };
}

/**
 * Тип для фабрики rename
 */
export type TreeRenameFactory = ReturnType<typeof create_tree_rename>;
