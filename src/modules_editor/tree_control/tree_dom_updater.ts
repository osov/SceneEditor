/**
 * Обновление DOM дерева
 *
 * Функции для инкрементного обновления структуры дерева
 */

import type { TreeItem } from '../../editor/hierarchy';
import type { TDictionary } from '../modules_editor_const';
import type { TreeContexts, TreeItemWithChildren } from './types';
import type { ElementCacheFactory } from './tree_element_cache';
import { get_tree_btn_html, get_tree_item_html, get_tree_sub_html, set_attrs, get_id_ico } from './tree_dom_builder';
import { get_children_recursive, get_topological_order } from './tree_data_utils';

/**
 * Параметры для создания DOM updater
 */
export interface TreeDomUpdaterParams {
    div_tree: HTMLElement;
    get_tree_list: () => TreeItem[];
    get_cut_list: () => number[];
    get_contexts: () => TreeContexts;
    get_current_scene_name: () => string;
    element_cache: ElementCacheFactory;
    add_tree_btn_event_listener: (btn: HTMLElement) => void;
    add_hover_delay_event_listener: (li: HTMLElement) => void;
}

/**
 * Создаёт фабрику для обновления DOM дерева
 */
export function create_tree_dom_updater(params: TreeDomUpdaterParams) {
    const {
        div_tree,
        get_tree_list,
        get_cut_list,
        get_contexts,
        get_current_scene_name,
        element_cache,
        add_tree_btn_event_listener,
        add_hover_delay_event_listener,
    } = params;

    /**
     * Обновляет отдельный элемент дерева
     */
    function update_item(item: TreeItem): void {
        const existing_item = element_cache.get_element_by_id(item.id);

        if (existing_item === null) {
            const existing_in_dom = document.querySelector(`.tree__item[data-id="${item.id}"]`) as HTMLElement | null;
            if (existing_in_dom !== null) {
                element_cache.set_element(item.id, existing_in_dom);
                update_item_attributes(existing_in_dom, item);
                update_item_classes(existing_in_dom, item);
                return;
            }

            create_new_tree_item(item);
            return;
        }

        const name_element = existing_item.querySelector('.tree__item_name');
        if (name_element !== null && name_element.textContent !== item.name) {
            name_element.textContent = item.name;
        }

        const icon_element = existing_item.querySelector('.tree__ico use');
        if (icon_element !== null) {
            icon_element.setAttribute('href', `./img/sprite.svg#${get_id_ico(item.icon)}`);
        }

        update_item_attributes(existing_item, item);
        update_item_classes(existing_item, item);

        element_cache.set_element(item.id, existing_item);
    }

    /**
     * Создаёт новый элемент дерева
     */
    function create_new_tree_item(item: TreeItem): void {
        const tree_list = get_tree_list();
        const cut_list = get_cut_list();
        const has_children = tree_list.some(child => child.pid === item.id);
        const existing_element = element_cache.get_element_by_id(item.id);
        if (existing_element !== null) return;

        const existing_in_dom = document.querySelector(`.tree__item[data-id="${item.id}"]`) as HTMLElement | null;
        if (existing_in_dom !== null) {
            element_cache.set_element(item.id, existing_in_dom);
            return;
        }

        if (has_children) {
            const item_with_children: TreeItemWithChildren = { ...item, children: [] };
            item_with_children.children = get_children_recursive(tree_list, item.id);

            const item_html = get_tree_item_html(item_with_children, cut_list);
            const children_html = get_tree_sub_html(item_with_children.children, cut_list, get_contexts(), get_current_scene_name());

            const temp_div = document.createElement('div');
            temp_div.innerHTML = `<li class="li_line active">${get_tree_btn_html()}${item_html}${children_html}</li>`;
            const new_item = temp_div.firstElementChild as HTMLElement;

            const parent_element = find_parent_element(item.pid);
            if (parent_element !== null) {
                insert_item_in_correct_position(parent_element, new_item, item);

                const btn = new_item.querySelector('.tree__btn') as HTMLElement | null;
                if (btn !== null) {
                    add_tree_btn_event_listener(btn);
                }

                add_hover_delay_event_listener(new_item);

                const tree_item_element = new_item.querySelector('.tree__item') as HTMLElement | null;
                if (tree_item_element !== null) {
                    element_cache.set_element(item.id, tree_item_element);
                }
            }
        } else {
            const item_html = get_tree_item_html(item, cut_list);
            const temp_div = document.createElement('div');
            temp_div.innerHTML = item_html;
            const new_item = temp_div.firstElementChild as HTMLElement;

            const parent_element = find_parent_element(item.pid);
            if (parent_element !== null) {
                insert_item_in_correct_position(parent_element, new_item, item);
                const li_element = new_item.closest('li');
                if (li_element !== null && li_element.classList.contains('li_line')) {
                    add_hover_delay_event_listener(li_element);
                }

                element_cache.set_element(item.id, new_item);
            }
        }
    }

    /**
     * Находит родительский элемент для вставки
     */
    function find_parent_element(pid: number): HTMLElement | null {
        if (pid === -2) {
            return div_tree.querySelector('.tree > li');
        }

        const parent_item = document.querySelector(`.tree__item[data-id="${pid}"]`);
        if (parent_item === null) return null;

        const parent_li = parent_item.closest('li');
        if (parent_li === null) return null;

        let tree_sub = parent_li.querySelector('.tree_sub');
        if (tree_sub === null) {
            tree_sub = document.createElement('ul');
            tree_sub.className = 'tree_sub';
            parent_li.appendChild(tree_sub);

            if (parent_li.querySelector('.tree__btn') === null) {
                const btn_html = get_tree_btn_html();
                const temp_div = document.createElement('div');
                temp_div.innerHTML = btn_html;
                const btn = temp_div.firstElementChild as HTMLElement;
                parent_li.insertBefore(btn, parent_li.firstChild);
                parent_li.classList.add('active');
                add_tree_btn_event_listener(btn);
                if (parent_li.classList.contains('li_line')) {
                    add_hover_delay_event_listener(parent_li);
                }
            }
        }

        return tree_sub as HTMLElement;
    }

    /**
     * Вставляет элемент в правильную позицию
     */
    function insert_item_in_correct_position(parent_element: HTMLElement, new_item: HTMLElement, item: TreeItem): void {
        const tree_list = get_tree_list();

        if (new_item.tagName === 'LI') {
            const siblings = tree_list.filter(sibling => sibling.pid === item.pid);
            const item_index = siblings.findIndex(sibling => sibling.id === item.id);

            if (item_index === -1) {
                parent_element.appendChild(new_item);
                return;
            }

            const next_sibling = siblings[item_index + 1];
            if (next_sibling !== undefined) {
                const next_element = parent_element.querySelector(`.tree__item[data-id="${next_sibling.id}"]`)?.closest('li');
                if (next_element !== undefined && next_element !== null) {
                    parent_element.insertBefore(new_item, next_element);
                    return;
                }
            }

            parent_element.appendChild(new_item);
        } else {
            const li = document.createElement('li');
            li.appendChild(new_item);

            const siblings = tree_list.filter(sibling => sibling.pid === item.pid);
            const item_index = siblings.findIndex(sibling => sibling.id === item.id);

            if (item_index === -1) {
                parent_element.appendChild(li);
                return;
            }

            const next_sibling = siblings[item_index + 1];
            if (next_sibling !== undefined) {
                const next_element = parent_element.querySelector(`.tree__item[data-id="${next_sibling.id}"]`)?.closest('li');
                if (next_element !== undefined && next_element !== null) {
                    parent_element.insertBefore(li, next_element);
                    return;
                }
            }

            parent_element.appendChild(li);
        }
    }

    /**
     * Обновляет атрибуты элемента
     */
    function update_item_attributes(element: HTMLElement, item: TreeItem): void {
        const attrs = set_attrs(item);
        const attr_regex = /data-(\w+)="([^"]*)"/g;
        let match;
        while ((match = attr_regex.exec(attrs)) !== null) {
            element.setAttribute(`data-${match[1]}`, match[2]);
        }
    }

    /**
     * Обновляет классы элемента
     */
    function update_item_classes(element: HTMLElement, item: TreeItem): void {
        const cut_list = get_cut_list();
        if (item.selected === true) {
            element.classList.add('selected');
        } else {
            element.classList.remove('selected');
        }
        if (cut_list.includes(item.id)) {
            element.classList.add('isCut');
        } else {
            element.classList.remove('isCut');
        }
    }

    /**
     * Удаляет удалённые элементы из DOM
     */
    function remove_deleted_items(current_list: TreeItem[]): void {
        const existing_items = document.querySelectorAll('.tree__item') as NodeListOf<HTMLElement>;
        const current_ids: TDictionary<boolean> = {};
        current_list.forEach(item => {
            current_ids[item.id] = true;
        });

        existing_items.forEach(item => {
            const item_id = Number(item.getAttribute('data-id') ?? '0');
            if (current_ids[item_id] === undefined) {
                const li = item.closest('li');
                if (li !== null) {
                    li.remove();
                }
                element_cache.remove_element(item_id);
            }
        });
    }

    /**
     * Обновляет структуру дерева
     */
    function update_structure(list: TreeItem[]): void {
        const item_map: TDictionary<TreeItem> = {};
        list.forEach(item => {
            item_map[item.id] = item;
        });

        // Группируем по pid
        const parent_groups: TDictionary<TreeItem[]> = {};
        list.forEach(item => {
            if (parent_groups[item.pid] === undefined) {
                parent_groups[item.pid] = [];
            }
            parent_groups[item.pid]!.push(item);
        });

        // Определяем правильный порядок обновления (от корня к листьям)
        const sorted_parent_ids = get_topological_order(parent_groups, item_map);

        // Обновляем структуру для каждого pid в правильном порядке
        for (const parent_id of sorted_parent_ids) {
            if (parent_groups[parent_id] !== undefined) {
                update_parent_structure(Number(parent_id), parent_groups[parent_id]!, item_map);
            }
        }

        list.forEach(item => {
            const parent = element_cache.get_element_by_id(item.id)?.closest('li') as HTMLElement | null;
            if (parent === null) return;
            cleanup_empty_parent(parent);
        });
    }

    /**
     * Обновляет структуру для конкретного родителя
     */
    function update_parent_structure(parent_id: number, children: TreeItem[], item_map: TDictionary<TreeItem>): void {
        if (parent_id === -2) return;

        const parent_element = element_cache.get_element_by_id(parent_id)?.closest('li');
        if (parent_element === undefined || parent_element === null) return;

        let tree_sub = parent_element.querySelector('.tree_sub');

        // Если нету, то создаем
        if (tree_sub === null) {
            tree_sub = document.createElement('ul');
            tree_sub.className = 'tree_sub';
            parent_element.appendChild(tree_sub);
            if (parent_element.querySelector('.tree__btn') === null) {
                const btn_html = get_tree_btn_html();
                const temp_div = document.createElement('div');
                temp_div.innerHTML = btn_html;
                const btn = temp_div.firstElementChild as HTMLElement;
                parent_element.insertBefore(btn, parent_element.firstChild);
                parent_element.classList.add('active');
                add_tree_btn_event_listener(btn);
                if (parent_element.classList.contains('li_line')) {
                    add_hover_delay_event_listener(parent_element);
                }
            }
        }

        // Определяем контейнер для вставки элементов
        const insert_container = tree_sub;
        const current_elements = Array.from(insert_container.children) as HTMLElement[];

        children.forEach((child, index) => {
            const child_element = element_cache.get_element_by_id(child.id)?.closest('li') as HTMLElement | null;
            if (child_element === null) {
                const existing_element = document.querySelector(`.tree__item[data-id="${child.id}"]`) as HTMLElement | null;
                if (existing_element !== null) {
                    const existing_li = existing_element.closest('li');
                    if (existing_li !== null && existing_li.parentElement !== insert_container) {
                        const target_index = Math.min(index, insert_container.children.length);
                        if (target_index === insert_container.children.length) {
                            insert_container.appendChild(existing_li);
                        } else {
                            insert_container.insertBefore(existing_li, insert_container.children[target_index]);
                        }
                    }
                } else {
                    create_new_tree_item(child);
                }
                return;
            }

            if (child_element.parentElement === insert_container) {
                const current_index = Array.from(insert_container.children).indexOf(child_element);
                if (current_index === index) return;
            }

            const target_index = Math.min(index, insert_container.children.length);
            if (target_index === insert_container.children.length) {
                insert_container.appendChild(child_element);
            } else {
                insert_container.insertBefore(child_element, insert_container.children[target_index]);
            }
        });

        current_elements.forEach(el => {
            const item_element = el.querySelector('.tree__item');
            if (item_element === null) return;

            const item_id = Number(item_element.getAttribute('data-id') ?? '0');
            const item = item_map[item_id];

            if (item === undefined || item.pid !== parent_id) {
                el.remove();
                element_cache.remove_element(item_id);
            }
        });

        cleanup_empty_parent(parent_element);
    }

    /**
     * Очищает пустого родителя (удаляет кнопку и tree_sub)
     */
    function cleanup_empty_parent(parent_element: HTMLElement): void {
        const tree_sub = parent_element.querySelector('.tree_sub');
        if (tree_sub !== null && tree_sub.children.length === 0) {
            tree_sub.remove();
            const btn = parent_element.querySelector('.tree__btn');
            if (btn !== null) btn.remove();
            parent_element.classList.remove('active');
            const item_id = parent_element.querySelector('.tree__item')?.getAttribute('data-id');
            const contexts = get_contexts();
            const current_scene_name = get_current_scene_name();
            if (item_id !== null && item_id !== undefined && contexts[current_scene_name] !== undefined) {
                contexts[current_scene_name][+item_id] = false;
            }
        }
    }

    return {
        update_item,
        create_new_tree_item,
        find_parent_element,
        insert_item_in_correct_position,
        update_item_attributes,
        update_item_classes,
        remove_deleted_items,
        update_structure,
        update_parent_structure,
        cleanup_empty_parent,
    };
}

/**
 * Тип для фабрики DOM updater
 */
export type TreeDomUpdaterFactory = ReturnType<typeof create_tree_dom_updater>;
