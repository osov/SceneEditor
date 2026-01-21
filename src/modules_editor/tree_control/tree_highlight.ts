/**
 * Подсветка и поиск в дереве
 *
 * Функции для подсветки дублирующихся имён и результатов поиска
 */

import type { TreeItem } from '../../editor/hierarchy';
import type { TreeContexts } from './types';
import { add_class_active, scroll_to_elem_in_parent } from './tree_scroll_utils';
import { get_identical_names } from './tree_data_utils';

/**
 * Параметры для создания highlighter
 */
export interface TreeHighlightParams {
    div_tree: HTMLElement;
    get_tree_list: () => TreeItem[];
    get_contexts: () => TreeContexts;
    get_current_scene_name: () => string;
}

/**
 * Создаёт фабрику для подсветки элементов
 */
export function create_tree_highlight(params: TreeHighlightParams) {
    const { div_tree, get_tree_list, get_contexts, get_current_scene_name } = params;

    /**
     * Подсветка идентичных имён в дереве
     * @param expand - раскрывать ли ветки с дубликатами
     */
    function paint_identical(expand = false): void {
        const tree_list = get_tree_list();
        const list_name: string[] = [];
        tree_list.forEach((item) => list_name.push(item?.name));
        const identical_names = get_identical_names(list_name);
        if (identical_names.length === 0) return;

        const items_name = document.querySelectorAll('a.tree__item .tree__item_name') as NodeListOf<HTMLElement>;
        if (items_name.length === 0) return;

        const contexts = get_contexts();
        const current_scene_name = get_current_scene_name();

        items_name.forEach((item) => {
            if (identical_names.includes(item?.textContent ?? '')) {
                item.classList.add('color_red');
                if (expand) {
                    // раскрываем все, где есть идентичные имена
                    add_class_active(
                        item.closest('.li_line') as HTMLElement | null,
                        item.closest('.tree__item')?.getAttribute('data-pid') ?? null,
                        contexts,
                        current_scene_name
                    );
                }
            } else {
                item.classList.remove('color_red');
            }
        });
    }

    /**
     * Подсветка результатов поиска
     */
    function paint_search_node(class_name: string): void {
        const input = document.querySelector('.searchInTree') as HTMLInputElement | null;
        if (input === null) return;
        const name = input.value?.trim() ?? '';
        if (name === '') return;

        const spans = document.querySelectorAll('a.tree__item .tree__item_name') as NodeListOf<HTMLElement>;
        if (spans.length === 0) return;

        spans.forEach((s) => {
            s.classList.remove(class_name);
            if (name.length > 0 && (s.textContent ?? '').includes(name)) {
                s.classList.add(class_name);
            }
        });
    }

    /**
     * Подсветка в реальном времени при вводе
     */
    function paint_identical_live(
        field_selector: string,
        selector_all: string,
        class_name: string,
        delay: number
    ): void {
        const field = document.querySelector(field_selector) as HTMLInputElement | null;
        if (field === null) return;

        const id_field = field_selector === '.searchInTree'
            ? -20
            : +(field.closest('.tree__item')?.getAttribute('data-id') ?? '0');

        if (id_field === 0) return;

        let timer: ReturnType<typeof setTimeout>;
        const contexts = get_contexts();
        const current_scene_name = get_current_scene_name();

        field.addEventListener('keyup', (event: KeyboardEvent) => {
            const target = event.target as HTMLInputElement | HTMLElement;
            const name = 'value' in target
                ? (target.value?.trim() ?? '')
                : (target.textContent?.trim() ?? '');

            if (name === null || name === undefined) return;

            clearTimeout(timer);

            timer = setTimeout(() => {
                const spans = document.querySelectorAll(selector_all) as NodeListOf<HTMLElement>;
                spans.forEach((s) => {
                    s.classList.remove(class_name);
                    const id_s = +(s.closest('.tree__item')?.getAttribute('data-id') ?? '0');
                    const is_rename = name.length > 0 && s.textContent === name && id_s !== id_field;
                    const is_search = name.length > 0 && (s.textContent ?? '').includes(name);
                    const is_paint = field_selector === '.searchInTree' ? is_search : is_rename;

                    if (is_paint) {
                        s.classList.add(class_name);
                        add_class_active(
                            s.closest('.li_line') as HTMLElement | null,
                            s.closest('.tree__item')?.getAttribute('data-pid') ?? null,
                            contexts,
                            current_scene_name
                        );
                        scroll_to_elem_in_parent(div_tree, s);
                    }
                });
            }, delay);
        });
    }

    return {
        paint_identical,
        paint_search_node,
        paint_identical_live,
    };
}

/**
 * Тип для фабрики highlight
 */
export type TreeHighlightFactory = ReturnType<typeof create_tree_highlight>;
