/**
 * Состояние TreeControl
 *
 * Централизованное управление всеми переменными состояния дерева
 */

import type { TreeItem } from '../../editor/hierarchy';
import type { TreeContexts, DropPositionType, ElementCache, TreeState, TreeStateConfig } from './types';

/**
 * Создаёт объект состояния для TreeControl
 */
export function create_tree_state(config: TreeStateConfig = {}): TreeState {
    // Данные дерева
    let tree_list: TreeItem[] = [];
    const contexts: TreeContexts = {};
    let current_scene_name = config.initial_scene_name ?? 'root';

    // Выделение
    let prev_list_selected: number[] = [];
    let list_selected: number[] = [];
    let cut_list: number[] = [];
    let shift_anchor_id: number | null = null;

    // Состояние мыши
    let _is_mousedown = false;
    let _is_dragging = true;
    let _is_move_item_drag = false;
    let _is_edit_item = false;
    let _is_current_only = false;

    // DOM элементы
    const div_tree = document.querySelector('#wr_tree') as HTMLElement;
    let tree_item: HTMLElement | null = null;
    let current_droppable: HTMLElement | null = null;
    let copy_item_drag: TreeItem | null = null;
    let item_drag: TreeItem | null = null;
    let item_drop: TreeItem | null = null;

    // Drag-drop состояние
    let is_drop = false;
    let count_move = 0;

    // Hover состояние
    let hover_start = 0;
    let hover_end: number | null = null;
    let hover_timer: ReturnType<typeof setTimeout> | null = null;
    let can_be_opened = false;

    // Позиции мыши
    let start_y = 0;
    let start_x = 0;
    let item_drag_rename_id: number | null = null;

    // Box drag-drop
    const box_dd = document.querySelector('.drag_and_drop') as HTMLElement;
    let dd_visible = false;
    let current_drop_position: DropPositionType = null;

    // Кэш элементов
    let element_cache: ElementCache = {};

    // === API ===

    function get_tree_list(): TreeItem[] {
        return tree_list;
    }

    function set_tree_list(list: TreeItem[]): void {
        tree_list = list;
    }

    function get_contexts(): TreeContexts {
        return contexts;
    }

    function get_current_scene_name(): string {
        return current_scene_name;
    }

    function set_current_scene_name(name: string): void {
        current_scene_name = name;
    }

    function get_list_selected(): number[] {
        return list_selected;
    }

    function set_list_selected(list: number[]): void {
        list_selected = list;
    }

    function get_prev_list_selected(): number[] {
        return prev_list_selected;
    }

    function set_prev_list_selected(list: number[]): void {
        prev_list_selected = list;
    }

    function get_cut_list(): number[] {
        return cut_list;
    }

    function set_cut_list(list: number[]): void {
        cut_list = list;
    }

    function get_shift_anchor_id(): number | null {
        return shift_anchor_id;
    }

    function set_shift_anchor_id(id: number | null): void {
        shift_anchor_id = id;
    }

    function get_is_mousedown(): boolean {
        return _is_mousedown;
    }

    function set_is_mousedown(value: boolean): void {
        _is_mousedown = value;
    }

    function get_is_dragging(): boolean {
        return _is_dragging;
    }

    function set_is_dragging(value: boolean): void {
        _is_dragging = value;
    }

    function get_is_move_item_drag(): boolean {
        return _is_move_item_drag;
    }

    function set_is_move_item_drag(value: boolean): void {
        _is_move_item_drag = value;
    }

    function get_is_edit_item(): boolean {
        return _is_edit_item;
    }

    function set_is_edit_item(value: boolean): void {
        _is_edit_item = value;
    }

    function get_is_current_only(): boolean {
        return _is_current_only;
    }

    function set_is_current_only(value: boolean): void {
        _is_current_only = value;
    }

    function get_div_tree(): HTMLElement {
        return div_tree;
    }

    function get_tree_item(): HTMLElement | null {
        return tree_item;
    }

    function set_tree_item(item: HTMLElement | null): void {
        tree_item = item;
    }

    function get_current_droppable(): HTMLElement | null {
        return current_droppable;
    }

    function set_current_droppable(item: HTMLElement | null): void {
        current_droppable = item;
    }

    function get_copy_item_drag(): TreeItem | null {
        return copy_item_drag;
    }

    function set_copy_item_drag(item: TreeItem | null): void {
        copy_item_drag = item;
    }

    function get_item_drag(): TreeItem | null {
        return item_drag;
    }

    function set_item_drag(item: TreeItem | null): void {
        item_drag = item;
    }

    function get_item_drop(): TreeItem | null {
        return item_drop;
    }

    function set_item_drop(item: TreeItem | null): void {
        item_drop = item;
    }

    function get_is_drop(): boolean {
        return is_drop;
    }

    function set_is_drop(value: boolean): void {
        is_drop = value;
    }

    function get_count_move(): number {
        return count_move;
    }

    function set_count_move(value: number): void {
        count_move = value;
    }

    function increment_count_move(): void {
        count_move++;
    }

    function get_hover_start(): number {
        return hover_start;
    }

    function set_hover_start(value: number): void {
        hover_start = value;
    }

    function get_hover_end(): number | null {
        return hover_end;
    }

    function set_hover_end(value: number | null): void {
        hover_end = value;
    }

    function get_hover_timer(): ReturnType<typeof setTimeout> | null {
        return hover_timer;
    }

    function set_hover_timer(timer: ReturnType<typeof setTimeout> | null): void {
        hover_timer = timer;
    }

    function get_can_be_opened(): boolean {
        return can_be_opened;
    }

    function set_can_be_opened(value: boolean): void {
        can_be_opened = value;
    }

    function get_start_y(): number {
        return start_y;
    }

    function set_start_y(value: number): void {
        start_y = value;
    }

    function get_start_x(): number {
        return start_x;
    }

    function set_start_x(value: number): void {
        start_x = value;
    }

    function get_item_drag_rename_id(): number | null {
        return item_drag_rename_id;
    }

    function set_item_drag_rename_id(id: number | null): void {
        item_drag_rename_id = id;
    }

    function get_box_dd(): HTMLElement {
        return box_dd;
    }

    function get_dd_visible(): boolean {
        return dd_visible;
    }

    function set_dd_visible(value: boolean): void {
        dd_visible = value;
    }

    function get_current_drop_position(): DropPositionType {
        return current_drop_position;
    }

    function set_current_drop_position(value: DropPositionType): void {
        current_drop_position = value;
    }

    function get_element_cache(): ElementCache {
        return element_cache;
    }

    function set_element_cache(cache: ElementCache): void {
        element_cache = cache;
    }

    function clear_element_cache(): void {
        element_cache = {};
    }

    return {
        get_tree_list,
        set_tree_list,
        get_contexts,
        get_current_scene_name,
        set_current_scene_name,
        get_list_selected,
        set_list_selected,
        get_prev_list_selected,
        set_prev_list_selected,
        get_cut_list,
        set_cut_list,
        get_shift_anchor_id,
        set_shift_anchor_id,
        get_is_mousedown,
        set_is_mousedown,
        get_is_dragging,
        set_is_dragging,
        get_is_move_item_drag,
        set_is_move_item_drag,
        get_is_edit_item,
        set_is_edit_item,
        get_is_current_only,
        set_is_current_only,
        get_div_tree,
        get_tree_item,
        set_tree_item,
        get_current_droppable,
        set_current_droppable,
        get_copy_item_drag,
        set_copy_item_drag,
        get_item_drag,
        set_item_drag,
        get_item_drop,
        set_item_drop,
        get_is_drop,
        set_is_drop,
        get_count_move,
        set_count_move,
        increment_count_move,
        get_hover_start,
        set_hover_start,
        get_hover_end,
        set_hover_end,
        get_hover_timer,
        set_hover_timer,
        get_can_be_opened,
        set_can_be_opened,
        get_start_y,
        set_start_y,
        get_start_x,
        set_start_x,
        get_item_drag_rename_id,
        set_item_drag_rename_id,
        get_box_dd,
        get_dd_visible,
        set_dd_visible,
        get_current_drop_position,
        set_current_drop_position,
        get_element_cache,
        set_element_cache,
        clear_element_cache,
    };
}
