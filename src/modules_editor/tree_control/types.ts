/**
 * Локальные типы для TreeControl
 *
 * Переиспользуем TreeItem из hierarchy, добавляем специфичные типы
 */

import type { TDictionary } from '../modules_editor_const';

// Реэкспорт базового типа из hierarchy
export type { TreeItem, TreeChangesInfo } from '../../editor/hierarchy';

/**
 * Типы для Three.js объектов в дереве
 */
export interface TreeMeshObject {
    type?: string;
    mesh_data?: { id: number };
    worldToLocal(v: { x: number; y: number; z: number }): { x: number; y: number; z: number };
}

/**
 * Контексты раскрытия/свёртывания по сценам
 */
export interface TreeContexts {
    [scene: string]: { [id: number]: boolean };
}

/**
 * Позиция drop при перетаскивании
 */
export type DropPositionType = 'top' | 'bg' | 'bottom' | false | null;

/**
 * Результат перемещения элементов
 */
export interface MovedListResult {
    pid: number;
    next_id: number;
    id_mesh_list: number[];
}

/**
 * Элемент дерева с детьми (для рендеринга)
 */
export interface TreeItemWithChildren {
    id: number;
    pid: number;
    name: string;
    visible: boolean;
    selected?: boolean;
    icon: string;
    no_drag?: boolean;
    no_drop?: boolean;
    no_rename?: boolean;
    no_remove?: boolean;
    children: TreeItemWithChildren[];
}

/**
 * Кэш элементов DOM по ID
 */
export type ElementCache = TDictionary<HTMLElement>;

/**
 * Конфигурация состояния дерева
 */
export interface TreeStateConfig {
    /** Начальное имя сцены */
    initial_scene_name?: string;
}

/**
 * API состояния дерева
 */
export interface TreeState {
    // Данные дерева
    get_tree_list(): import('../../editor/hierarchy').TreeItem[];
    set_tree_list(list: import('../../editor/hierarchy').TreeItem[]): void;
    get_contexts(): TreeContexts;
    get_current_scene_name(): string;
    set_current_scene_name(name: string): void;

    // Выделение
    get_list_selected(): number[];
    set_list_selected(list: number[]): void;
    get_prev_list_selected(): number[];
    set_prev_list_selected(list: number[]): void;
    get_cut_list(): number[];
    set_cut_list(list: number[]): void;
    get_shift_anchor_id(): number | null;
    set_shift_anchor_id(id: number | null): void;

    // Состояние мыши/драга
    get_is_mousedown(): boolean;
    set_is_mousedown(value: boolean): void;
    get_is_dragging(): boolean;
    set_is_dragging(value: boolean): void;
    get_is_move_item_drag(): boolean;
    set_is_move_item_drag(value: boolean): void;
    get_is_edit_item(): boolean;
    set_is_edit_item(value: boolean): void;
    get_is_current_only(): boolean;
    set_is_current_only(value: boolean): void;

    // DOM элементы
    get_div_tree(): HTMLElement;
    get_tree_item(): HTMLElement | null;
    set_tree_item(item: HTMLElement | null): void;
    get_current_droppable(): HTMLElement | null;
    set_current_droppable(item: HTMLElement | null): void;
    get_copy_item_drag(): import('../../editor/hierarchy').TreeItem | null;
    set_copy_item_drag(item: import('../../editor/hierarchy').TreeItem | null): void;
    get_item_drag(): import('../../editor/hierarchy').TreeItem | null;
    set_item_drag(item: import('../../editor/hierarchy').TreeItem | null): void;
    get_item_drop(): import('../../editor/hierarchy').TreeItem | null;
    set_item_drop(item: import('../../editor/hierarchy').TreeItem | null): void;

    // Drag-drop состояние
    get_is_drop(): boolean;
    set_is_drop(value: boolean): void;
    get_count_move(): number;
    set_count_move(value: number): void;
    increment_count_move(): void;

    // Hover состояние
    get_hover_start(): number;
    set_hover_start(value: number): void;
    get_hover_end(): number | null;
    set_hover_end(value: number | null): void;
    get_hover_timer(): ReturnType<typeof setTimeout> | null;
    set_hover_timer(timer: ReturnType<typeof setTimeout> | null): void;
    get_can_be_opened(): boolean;
    set_can_be_opened(value: boolean): void;

    // Позиции мыши
    get_start_y(): number;
    set_start_y(value: number): void;
    get_start_x(): number;
    set_start_x(value: number): void;
    get_item_drag_rename_id(): number | null;
    set_item_drag_rename_id(id: number | null): void;

    // Box drag-drop
    get_box_dd(): HTMLElement;
    get_dd_visible(): boolean;
    set_dd_visible(value: boolean): void;
    get_current_drop_position(): DropPositionType;
    set_current_drop_position(value: DropPositionType): void;

    // Кэш элементов
    get_element_cache(): ElementCache;
    set_element_cache(cache: ElementCache): void;
    clear_element_cache(): void;
}
