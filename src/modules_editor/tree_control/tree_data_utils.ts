/**
 * Утилиты для работы с данными дерева
 *
 * Чистые функции без побочных эффектов
 */

import { Services } from '@editor/core';
import type { ISceneObject } from '@editor/engine/types';
import type { TreeItem } from '../../editor/hierarchy';
import type { TDictionary } from '../modules_editor_const';
import type { TreeItemWithChildren, TreeContexts } from './types';

/**
 * Преобразует список ID или Item[] в массив ISceneObject[]
 */
export function items_to_scene_objects(items: number[] | TreeItem[]): ISceneObject[] {
    const result: ISceneObject[] = [];
    for (const item of items) {
        const id = typeof item === 'number' ? item : item.id;
        const obj = Services.scene.get_by_id(id);
        if (obj !== undefined) {
            result.push(obj);
        }
    }
    return result;
}

/**
 * Получить ISceneObject из TreeItem
 */
export function item_to_scene_object(item: TreeItem | null): ReturnType<typeof Services.scene.get_by_id> | undefined {
    if (item === null) return undefined;
    return Services.scene.get_by_id(item.id);
}

/**
 * Строит древовидную структуру из плоского списка
 */
export function build_tree(
    list: TreeItem[],
    contexts: TreeContexts,
    _current_scene_name: string,
    scene_name?: string
): { tree: TreeItemWithChildren[]; list_selected: number[] } {
    const tree_map: TDictionary<TreeItemWithChildren> = {};
    const tree: TreeItemWithChildren[] = [];
    const list_selected: number[] = [];

    const root_list = [...list];

    root_list.forEach((node) => {
        tree_map[node.id] = { ...node, children: [] };
        if (node?.selected === true) {
            list_selected.push(node.id);
        }
    });

    root_list.forEach((node) => {
        if (node.pid !== -2) {
            const parent = tree_map[node.pid];
            if (parent !== undefined) {
                parent.children.push(tree_map[node.id]!);
            }
        } else {
            tree.push(tree_map[node.id]!);
        }
    });

    if (scene_name !== undefined) {
        Object.values(tree_map).forEach((node) => {
            if (node !== undefined && node.children.length > 0) {
                contexts[scene_name][+node.id] = false;
            }
        });
    }

    return { tree, list_selected };
}

/**
 * Получает всех детей рекурсивно
 */
export function get_children_recursive(tree_list: TreeItem[], parent_id: number): TreeItemWithChildren[] {
    const children = tree_list.filter(child => child.pid === parent_id);
    return children.map(child => {
        const child_with_children: TreeItemWithChildren = { ...child, children: [] };
        const has_grand_children = tree_list.some(grand_child => grand_child.pid === child.id);
        if (has_grand_children) {
            child_with_children.children = get_children_recursive(tree_list, child.id);
        }
        return child_with_children;
    });
}

/**
 * Находит следующий ID элемента по parent ID
 */
export function find_next_id_item_by_pid(tree_list: TreeItem[], id: number, pid: number): number | undefined {
    const list_pid = tree_list.filter(e => e.pid === pid);
    for (let i = 0; i < list_pid.length - 1; i++) {
        if (list_pid[i]?.id === id) {
            return list_pid[i + 1]?.id ?? list_pid[i]?.id;
        }
    }
    return undefined;
}

/**
 * Получает уровень элемента в дереве
 */
export function get_item_level_in_tree(item_id: number, item_map: TDictionary<TreeItem>): number {
    let level = 0;
    let current_id = item_id;

    while (current_id !== -2 && current_id !== 0) {
        const item = item_map[current_id];
        if (item === undefined) break;
        current_id = item.pid;
        level++;
    }

    return level;
}

/**
 * Получает топологический порядок обновления родителей
 */
export function get_topological_order(
    parent_groups: TDictionary<TreeItem[]>,
    item_map: TDictionary<TreeItem>
): number[] {
    const parent_ids = Object.keys(parent_groups).map(Number);
    const visited = new Set<number>();
    const temp_visited = new Set<number>();
    const result: number[] = [];

    function visit(parent_id: number) {
        if (temp_visited.has(parent_id)) {
            return;
        }

        if (visited.has(parent_id)) {
            return;
        }

        temp_visited.add(parent_id);

        const children = parent_groups[parent_id] ?? [];
        for (const child of children) {
            const child_id = child.id;
            if (parent_groups[child_id] !== undefined) {
                visit(child_id);
            }
        }

        temp_visited.delete(parent_id);
        visited.add(parent_id);
        result.push(parent_id);
    }

    for (const parent_id of parent_ids) {
        if (!visited.has(parent_id)) {
            visit(parent_id);
        }
    }

    result.sort((a, b) => {
        const level_a = get_item_level_in_tree(a, item_map);
        const level_b = get_item_level_in_tree(b, item_map);
        return level_a - level_b;
    });

    return result;
}

/**
 * Получает плоский список элементов из DOM
 */
export function get_flat_items_list(): TreeItem[] {
    const result: TreeItem[] = [];

    const tree_items = document.querySelectorAll('.tree__item') as NodeListOf<HTMLElement>;
    tree_items.forEach(item => {
        const id_attr = item.getAttribute('data-id');
        const pid_attr = item.getAttribute('data-pid');
        const name = item.querySelector('.tree__item_name')?.textContent ?? '';
        const icon = item.getAttribute('data-icon') ?? '';
        const visible = item.getAttribute('data-visible') === 'true';
        const no_drag = item.getAttribute('data-no_drag') === 'true';
        const no_drop = item.getAttribute('data-no_drop') === 'true';
        const no_rename = item.getAttribute('data-no_rename') === 'true';
        const no_remove = item.getAttribute('data-no_remove') === 'true';

        if (id_attr !== null) {
            result.push({
                id: +id_attr,
                pid: pid_attr !== null ? +pid_attr : 0,
                name,
                visible,
                icon,
                no_drag,
                no_drop,
                no_rename,
                no_remove
            });
        }
    });

    return result;
}

/**
 * Получает имена которые дублируются в списке
 */
export function get_identical_names(list: string[]): string[] {
    return list.filter((item, index) => list.indexOf(item) !== index);
}

/**
 * Проверяет является ли элемент дочерним (рекурсивно)
 */
export function is_child(list: TreeItem[], parent_id: number, current_pid: number): boolean {
    let step = current_pid;

    while (step > -1) {
        const parent = list.find(item => item.id === step);
        if (parent === undefined) return false;

        if (parent.id === parent_id) return true;
        step = parent.pid;
    }

    return false;
}

/**
 * Проверяет запрещён ли drop в родителя
 */
export function is_parent_no_drop(list: TreeItem[], drag: TreeItem, drop: TreeItem): boolean {
    // внутри родителя можно перемещать
    if (drag.pid === drop.pid) {
        return false;
    }
    // если разные родители
    const parent = list.find(item => item.id === drop.pid);
    if (parent !== undefined && parent.no_drop === true) {
        return true;
    }
    return false;
}

/**
 * Проверяет изменилась ли позиция
 */
export function has_position_changed(drag: TreeItem, drop: TreeItem, type: string): boolean {
    if (drag.id === drop.id) return false;

    if (type === 'bg') {
        return drag.pid !== drop.id;
    }

    if (drag.pid !== drop.pid) return true;

    return true;
}
