/**
 * Утилиты для скроллинга дерева
 */

import type { TreeItem } from '../../editor/hierarchy';
import type { TreeContexts } from './types';

/**
 * Скроллит до элемента в родительском блоке
 */
export function scroll_to_elem_in_parent(parent_block: HTMLElement, elem: HTMLElement): void {
    if (parent_block === null || elem === null || is_element_in_viewport(parent_block, elem)) return;

    if (parent_block.scrollHeight + 52 > window.innerHeight) {
        elem.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

/**
 * Проверяет находится ли элемент в видимой области
 */
export function is_element_in_viewport(parent_block: HTMLElement, elem: HTMLElement): boolean {
    if (parent_block === null || elem === null) return false;

    const parent_rect = parent_block.getBoundingClientRect();
    const elem_rect = elem.getBoundingClientRect();

    const padding = 20;

    return elem_rect.top >= parent_rect.top + padding &&
        elem_rect.bottom <= parent_rect.bottom - padding;
}

/**
 * Скроллит до последнего выделенного элемента
 */
export function scroll_to_last_selected(
    div_tree: HTMLElement,
    tree_list: TreeItem[],
    prev_list_selected: number[]
): void {
    const selected_items = tree_list.filter(item => item.selected);
    const id_last_selected = selected_items.find(item => !prev_list_selected.includes(item.id))?.id;
    if (id_last_selected === undefined) return;

    const last_selected = document.querySelector(`.tree__item[data-id="${id_last_selected}"]`) as HTMLElement | null;
    if (last_selected === null) return;
    scroll_to_elem_in_parent(div_tree, last_selected);
}

/**
 * Раскрывает дерево до выделенных элементов
 */
export function open_tree_with_selected(
    tree_list: TreeItem[],
    get_element_by_id: (id: number) => HTMLElement | null,
    contexts: TreeContexts,
    current_scene_name: string
): void {
    const selected_items = tree_list.filter(item => item.selected);
    if (selected_items.length > 0) {
        selected_items.forEach((item) => {
            const element = get_element_by_id(item.id);
            if (element !== null) {
                add_class_active(
                    element.closest('.li_line') as HTMLElement | null,
                    element.closest('.tree__item')?.getAttribute('data-pid') ?? null,
                    contexts,
                    current_scene_name
                );
            }
        });
    }
}

/**
 * Добавляет класс active рекурсивно к родителям
 */
export function add_class_active(
    e_li: HTMLElement | null,
    item_pid: string | null,
    contexts: TreeContexts,
    current_scene_name: string
): void {
    if (e_li === null) return;
    if (item_pid === null || +item_pid <= -1) return;

    const li_pid = e_li.querySelector('a.tree__item')?.getAttribute('data-pid');
    if (li_pid !== null && li_pid === item_pid) {
        const li_line = e_li.closest('ul')?.closest('.li_line') as HTMLElement | null;
        if (li_line === null) return;
        if (!li_line.classList.contains('active')) {
            li_line.classList.add('active');
            update_contexts(contexts, current_scene_name, li_line, true);
        }
        add_class_active(
            li_line.closest('ul')?.closest('.li_line') as HTMLElement | null,
            item_pid,
            contexts,
            current_scene_name
        );
    } else {
        if (!e_li.classList.contains('active')) {
            e_li.classList.add('active');
            update_contexts(contexts, current_scene_name, e_li, true);
        }
        add_class_active(
            e_li.closest('ul')?.closest('.li_line') as HTMLElement | null,
            item_pid,
            contexts,
            current_scene_name
        );
    }
}

/**
 * Обновляет контексты раскрытия
 */
export function update_contexts(
    contexts: TreeContexts,
    scene: string,
    li: HTMLElement,
    state: boolean
): void {
    const item_id = li.querySelector('a.tree__item')?.getAttribute('data-id');
    if (item_id === null || item_id === undefined) return;
    contexts[scene][+item_id] = state;
}
