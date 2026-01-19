/**
 * TreeDiffService - определение изменений в дереве иерархии
 *
 * Извлечено из TreeControl.ts (Фаза 17)
 */

import type { TreeItem, TreeChangesInfo } from './types';

type ItemMap = { [id: number]: TreeItem };
type ItemGroup = { [pid: number]: TreeItem[] };
type PositionMap = { [id: number]: number };

/**
 * Проверяет равенство двух элементов дерева
 */
export function items_equal(item1: TreeItem, item2: TreeItem): boolean {
    return item1.name === item2.name &&
        item1.pid === item2.pid &&
        item1.selected === item2.selected &&
        item1.icon === item2.icon &&
        item1.visible === item2.visible &&
        item1.no_drag === item2.no_drag &&
        item1.no_drop === item2.no_drop &&
        item1.no_rename === item2.no_rename &&
        item1.no_remove === item2.no_remove;
}

/**
 * Создаёт map из списка элементов по id
 */
function create_item_map(list: TreeItem[]): ItemMap {
    const map: ItemMap = {};
    for (const item of list) {
        map[item.id] = item;
    }
    return map;
}

/**
 * Группирует элементы по родительскому id
 */
function group_by_parent(list: TreeItem[]): ItemGroup {
    const groups: ItemGroup = {};
    for (const item of list) {
        if (groups[item.pid] === undefined) {
            groups[item.pid] = [];
        }
        groups[item.pid].push(item);
    }
    return groups;
}

/**
 * Создаёт map позиций элементов
 */
function create_position_map(items: TreeItem[]): PositionMap {
    const positions: PositionMap = {};
    for (let i = 0; i < items.length; i++) {
        positions[items[i].id] = i;
    }
    return positions;
}

/**
 * Проверяет изменился ли порядок элементов в группах
 */
function has_order_changed(oldGroups: ItemGroup, newGroups: ItemGroup): boolean {
    for (const pid in newGroups) {
        const oldGroup = oldGroups[pid] ?? [];
        const newGroup = newGroups[pid];

        if (oldGroup.length !== newGroup.length) {
            return true;
        }

        const oldPositions = create_position_map(oldGroup);
        const newPositions = create_position_map(newGroup);

        for (const itemId in oldPositions) {
            if (oldPositions[itemId] !== newPositions[itemId]) {
                return true;
            }
        }
    }
    return false;
}

/**
 * Проверяет есть ли изменения между двумя списками элементов
 */
export function has_update(newList: TreeItem[], oldList: TreeItem[]): boolean {
    // Быстрая проверка длины
    if (newList.length !== oldList.length) {
        return true;
    }

    const oldMap = create_item_map(oldList);
    const newMap = create_item_map(newList);

    // Проверяем новые и изменённые элементы
    for (const id in newMap) {
        const newItem = newMap[id];
        const oldItem = oldMap[id];

        if (oldItem === undefined) {
            return true;
        }

        if (!items_equal(newItem, oldItem)) {
            return true;
        }
    }

    // Проверяем удалённые элементы
    for (const id in oldMap) {
        if (newMap[id] === undefined) {
            return true;
        }
    }

    // Проверяем порядок в группах
    const oldGroups = group_by_parent(oldList);
    const newGroups = group_by_parent(newList);

    return has_order_changed(oldGroups, newGroups);
}

/**
 * Получает детальную информацию об изменениях между списками
 */
export function get_changes(newList: TreeItem[], oldList: TreeItem[]): TreeChangesInfo {
    const oldMap = create_item_map(oldList);
    const newMap = create_item_map(newList);

    const modifiedItems: TreeItem[] = [];
    const newItems: TreeItem[] = [];
    const deletedItems: number[] = [];

    let structureChanged = false;

    // Находим новые и изменённые элементы
    for (const id in newMap) {
        const newItem = newMap[id];
        const oldItem = oldMap[id];

        if (oldItem === undefined) {
            // Новый элемент
            newItems.push(newItem);
        } else {
            // Проверяем изменение родителя
            if (newItem.pid !== oldItem.pid) {
                structureChanged = true;
            }

            // Проверяем изменение свойств
            if (!items_equal(newItem, oldItem)) {
                modifiedItems.push(newItem);
            }
        }
    }

    // Находим удалённые элементы
    for (const id in oldMap) {
        if (newMap[id] === undefined) {
            deletedItems.push(Number(id));
            structureChanged = true;
        }
    }

    // Проверяем изменение порядка в группах
    if (!structureChanged) {
        const oldGroups = group_by_parent(oldList);
        const newGroups = group_by_parent(newList);

        for (const pid in newGroups) {
            const oldGroup = oldGroups[pid] ?? [];
            const newGroup = newGroups[pid];

            // Изменился размер группы
            if (oldGroup.length !== newGroup.length) {
                structureChanged = true;
                break;
            }

            // Изменился порядок в группе
            const oldPositions = create_position_map(oldGroup);
            const newPositions = create_position_map(newGroup);

            for (const itemId in oldPositions) {
                if (oldPositions[itemId] !== newPositions[itemId]) {
                    structureChanged = true;
                    break;
                }
            }

            if (structureChanged) {
                break;
            }
        }
    }

    return {
        structureChanged,
        modifiedItems,
        newItems,
        deletedItems
    };
}

/**
 * Интерфейс сервиса
 */
export interface ITreeDiffService {
    items_equal: typeof items_equal;
    has_update: typeof has_update;
    get_changes: typeof get_changes;
}

/**
 * Создаёт сервис определения изменений в дереве
 */
export function TreeDiffServiceCreate(): ITreeDiffService {
    return {
        items_equal,
        has_update,
        get_changes
    };
}
