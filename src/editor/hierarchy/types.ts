/**
 * Типы для системы иерархии (TreeControl)
 *
 * Извлечено из TreeControl.ts (Фаза 17)
 */

/**
 * Элемент дерева иерархии
 */
export interface TreeItem {
    id: number;
    /** parent id родителя или 0 если это верх иерархии */
    pid: number;
    name: string;
    /** визуально отображаем чуть затемненным (что отключено) */
    visible: boolean;
    /** выделен ли */
    selected?: boolean;
    /** значок */
    icon: string;
    /** нельзя брать тащить */
    no_drag?: boolean;
    /** нельзя положить внутрь */
    no_drop?: boolean;
    /** нельзя переименовывать (для префабов или корня сцены) */
    no_rename?: boolean;
    /** нельзя удалить */
    no_remove?: boolean;
}

/**
 * Контексты раскрытия/свёртывания по сценам
 */
export interface TreeContexts {
    [scene: string]: { [id: number]: boolean };
}

/**
 * Информация об изменениях в дереве
 */
export interface TreeChangesInfo {
    /** Изменилась ли структура (родительские связи) */
    structureChanged: boolean;
    /** Изменённые элементы */
    modifiedItems: TreeItem[];
    /** Новые элементы */
    newItems: TreeItem[];
    /** Удалённые элементы (ID) */
    deletedItems: number[];
}

/**
 * Тип позиции при drag-drop
 */
export type DropPosition = 'before' | 'after' | 'inside' | false;

/**
 * Результат перемещения элементов
 */
export interface MoveResult {
    list: TreeItem[];
    changed: boolean;
}

/**
 * Интерфейс сервиса данных дерева
 */
export interface ITreeDataService {
    /** Получить плоский список элементов */
    get_flat_list(): TreeItem[];
    /** Проверить есть ли изменения */
    has_update(newList: TreeItem[], oldList: TreeItem[]): boolean;
    /** Получить детальную информацию об изменениях */
    get_changes(newList: TreeItem[], oldList: TreeItem[]): TreeChangesInfo;
    /** Получить элементы между двумя ID */
    get_items_between(startId: number, endId: number): number[];
    /** Проверить развёрнут ли родитель */
    is_parent_expanded(parentId: number): boolean;
    /** Получить уровень элемента в иерархии */
    get_item_level(item: TreeItem, flatItems: TreeItem[]): number;
}

/**
 * Интерфейс сервиса выделения
 */
export interface ITreeSelectionService {
    /** Получить список выделенных ID */
    get_selected(): number[];
    /** Установить выделенные элементы */
    set_selected(ids: number[]): void;
    /** Добавить к выделению */
    add_to_selection(id: number): void;
    /** Убрать из выделения */
    remove_from_selection(id: number): void;
    /** Очистить выделение */
    clear_selection(): void;
    /** Переключить выделение элемента */
    toggle_selection(id: number): void;
}
