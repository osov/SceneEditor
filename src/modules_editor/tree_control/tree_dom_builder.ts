/**
 * Генерация HTML для дерева
 *
 * Функции для построения HTML разметки элементов дерева
 */

import { IObjectTypes } from '../../render_engine/types';
import type { TreeItem } from '../../editor/hierarchy';
import type { TreeItemWithChildren, TreeContexts } from './types';

/**
 * Генерирует HTML для всего дерева
 */
export function get_tree_html(
    e: TreeItemWithChildren[] | TreeItemWithChildren,
    cut_list: number[]
): string {
    const list = Array.isArray(e) ? e[0] : e;
    let result = '<ul id="treeDemo" class="tree">';
    if (list?.children.length > 0) {
        result += `<li class="active">
                        ${get_tree_btn_html()}
                        ${get_tree_item_html(list, cut_list)}
                        ${get_tree_sub_html(list.children, cut_list, {}, '')}
                    </li>`;
    } else {
        result += `<li>
                        ${get_tree_item_html(list, cut_list)}
                    </li>`;
    }
    result += '</ul>';
    return result;
}

/**
 * Генерирует HTML для вложенного списка
 */
export function get_tree_sub_html(
    list: TreeItemWithChildren[],
    cut_list: number[],
    contexts: TreeContexts,
    current_scene_name: string
): string {
    let result = '<ul class="tree_sub">';
    list.forEach((item) => {
        if (item?.children.length > 0) {
            const is_active = contexts[current_scene_name]?.[item.id] !== false;
            result += `<li class="li_line ${is_active ? 'active' : ''}">
                            ${get_tree_btn_html()}
                            ${get_tree_item_html(item, cut_list)}
                            ${get_tree_sub_html(item.children, cut_list, contexts, current_scene_name)}
                        </li>`;
        } else {
            result += `<li>
                            ${get_tree_item_html(item, cut_list)}
                        </li>`;
        }
    });
    result += '</ul>';
    return result;
}

/**
 * Генерирует HTML для кнопки раскрытия
 */
export function get_tree_btn_html(): string {
    return `<span class="tree__btn">
                <svg class="svg_icon">
                    <use class="use_trglF" href="./img/sprite.svg#triangle_filled"></use>
                    <use class="use_trgl" href="./img/sprite.svg#triangle"></use>
                </svg>
            </span>`;
}

/**
 * Генерирует HTML для элемента дерева
 */
export function get_tree_item_html(item: TreeItem | TreeItemWithChildren, cut_list: number[]): string {
    return `<a class="tree__item ${item?.selected ? 'selected' : ''} ${cut_list.includes(item.id) ? 'isCut' : ''}" ${set_attrs(item)}>
                <span class="tree__item_bg"></span>
                ${get_tree_ico_html(item.icon)}
                <span class="tree__item_name">${item.name}</span>
            </a>`;
}

/**
 * Формирует data-атрибуты для элемента
 */
export function set_attrs(item: TreeItem | TreeItemWithChildren): string {
    if (item === undefined || item === null) return '';
    let result = '';
    result += item.id !== undefined ? ` data-id="${item.id}" ` : '';
    result += item.pid !== undefined ? ` data-pid="${item.pid}" ` : '';
    result += item.icon !== undefined ? ` data-icon="${item.icon}" ` : '';
    result += item.visible !== undefined ? ` data-visible="${item.visible}" ` : '';
    result += item.no_drop !== undefined ? ` data-no_drop="${item.no_drop}" ` : '';
    result += item.no_drag !== undefined ? ` data-no_drag="${item.no_drag}" ` : '';
    result += item.no_rename !== undefined ? ` data-no_rename="${item.no_rename}" ` : '';
    result += item.no_remove !== undefined ? ` data-no_remove="${item.no_remove}" ` : '';
    return result;
}

/**
 * Генерирует HTML для иконки
 */
export function get_tree_ico_html(icon: string): string {
    return `<span class="tree__ico"><svg class="svg_icon"><use href="./img/sprite.svg#${get_id_ico(icon)}"></use></svg></span>`;
}

/**
 * Получает ID иконки по типу
 */
export function get_id_ico(icon: string): string {
    if (icon === undefined || icon === null || icon === '') return 'cube';
    if (icon === 'scene') return 'cubes_stacked';

    if (icon === IObjectTypes.GUI_CONTAINER) return 'box_align_top_left';
    if (icon === IObjectTypes.GUI_BOX) return 'rectangle';
    if (icon === IObjectTypes.GUI_TEXT) return 'typography';

    if (icon === IObjectTypes.GO_CONTAINER) return 'cube';
    if (icon === IObjectTypes.GO_SPRITE_COMPONENT) return 'texture';
    if (icon === IObjectTypes.GO_LABEL_COMPONENT) return 'tag';
    if (icon === IObjectTypes.GO_ANIMATED_MODEL_COMPONENT) return 'box_model';

    if (icon === IObjectTypes.EMPTY) return 'percentage_0';
    if (icon === IObjectTypes.ENTITY) return 'ghost_3';
    if (icon === IObjectTypes.SLICE9_PLANE) return 'photo_sensor';
    if (icon === IObjectTypes.TEXT) return 'letter_t';

    return 'cube';
}
