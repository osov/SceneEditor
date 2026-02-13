/**
 * TreeControl - UI контрол для отображения иерархии сцены
 *
 * Управляет деревом объектов, drag-drop, контекстное меню.
 * Разбит на модули для лучшей организации кода.
 */

import { deepClone } from '../../modules/utils';
import { Services } from '@editor/core';
import {
    has_update as diff_has_update,
    get_changes as diff_get_changes,
    TreeSelectionServiceCreate,
    TreeContextMenuServiceCreate,
    type TreeItem,
} from '../../editor/hierarchy';

// Импорт локальных модулей
import { create_tree_state } from './state';
import { create_element_cache } from './tree_element_cache';
import { create_tree_highlight } from './tree_highlight';
import { create_tree_visibility } from './tree_visibility';
import { create_tree_selection_ui } from './tree_selection_ui';
import { create_tree_rename } from './tree_rename';
import { create_tree_drag_drop } from './tree_drag_drop';
import { create_tree_texture_drop } from './tree_texture_drop';
import { create_tree_dom_updater } from './tree_dom_updater';
import { create_tree_input_handler } from './tree_input_handler';
import { create_tree_context_menu_handler } from './tree_context_menu_handler';
import { get_tree_html, get_id_ico } from './tree_dom_builder';
import { build_tree, items_to_scene_objects, item_to_scene_object } from './tree_data_utils';
import { scroll_to_last_selected, open_tree_with_selected } from './tree_scroll_utils';

// Реэкспорт типов
export type { TreeItem } from '../../editor/hierarchy';
export type { TreeMeshObject, TreeContexts, MovedListResult, TreeState } from './types';

/** Тип TreeControl */
export type TreeControlType = ReturnType<typeof TreeControlCreate>;

/**
 * Создаёт TreeControl
 */
export function TreeControlCreate() {
    // === Инициализация состояния и модулей ===

    const state = create_tree_state();
    const element_cache = create_element_cache();

    // Сервис управления выделением
    const selection_service = TreeSelectionServiceCreate();

    // Сервис контекстного меню
    const context_menu_service = TreeContextMenuServiceCreate({
        is_valid_paste: (target_item) => {
            if (target_item === null) return false;
            if (target_item.pid === -1) {
                const copy_list = Services.actions.copy_list;
                return Services.actions.is_valid_action(
                    item_to_scene_object(target_item),
                    copy_list,
                    true
                ) !== false;
            }
            return Services.actions.is_valid_action(item_to_scene_object(target_item)) !== false;
        },
        is_valid_paste_child: (target_item) => {
            if (target_item === null) return false;
            const copy_list = Services.actions.copy_list;
            return Services.actions.is_valid_action(
                item_to_scene_object(target_item),
                copy_list,
                true
            ) !== false;
        }
    });

    // Создание модулей с зависимостями
    const highlight = create_tree_highlight({
        div_tree: state.get_div_tree(),
        get_tree_list: () => state.get_tree_list(),
        get_contexts: () => state.get_contexts(),
        get_current_scene_name: () => state.get_current_scene_name(),
    });

    const visibility = create_tree_visibility({
        get_tree_list: () => state.get_tree_list(),
        get_list_selected: () => state.get_list_selected(),
        element_cache,
    });

    const rename = create_tree_rename({
        state,
        highlight,
    });

    const texture_drop = create_tree_texture_drop({
        state,
    });

    const drag_drop = create_tree_drag_drop({
        state,
        highlight,
    });

    const selection_ui = create_tree_selection_ui({
        state,
        element_cache,
        selection_service,
    });

    const dom_updater = create_tree_dom_updater({
        div_tree: state.get_div_tree(),
        get_tree_list: () => state.get_tree_list(),
        get_cut_list: () => state.get_cut_list(),
        get_contexts: () => state.get_contexts(),
        get_current_scene_name: () => state.get_current_scene_name(),
        element_cache,
        add_tree_btn_event_listener: drag_drop.add_tree_btn_event_listener,
        add_hover_delay_event_listener: drag_drop.add_hover_delay_event_listener,
    });

    const input_handler = create_tree_input_handler({
        state,
        element_cache,
    });

    const context_menu_handler = create_tree_context_menu_handler({
        state,
        context_menu_service,
        rename,
        texture_drop,
    });

    // === Инициализация ===

    function init(): void {
        highlight.paint_identical_live('.searchInTree', '#wr_tree .tree__item_name', 'color_green', 777);
        texture_drop.canvas_drop_texture();

        const params = new URLSearchParams(document.location.search);
        const hide_menu = params.get('hide_menu');
        if (hide_menu !== null) {
            const menu_section = document.querySelectorAll('.menu_section');
            menu_section.forEach((ms) => {
                ms?.classList.add('hide_menu');
                ms?.classList.remove('active');
            });
        }

        document.addEventListener('dblclick', (e) => {
            const target = e.target as HTMLElement;
            const item = target.closest('.tree__item');
            if (item !== null) {
                const item_id = item.getAttribute('data-id');
                if (item_id !== null) {
                    state.set_item_drag_rename_id(null);
                    Services.event_bus.emit('hierarchy:clicked', { id: item_id });
                }
            }
        }, false);

        document.querySelector('#wr_tree')?.addEventListener('contextmenu', (event) => {
            event.preventDefault();
        });

        subscribe();
    }

    function subscribe(): void {
        Services.event_bus.on('hierarchy:active', visibility.update_active);
        Services.event_bus.on('hierarchy:visibility_changed', visibility.update_visible);

        Services.event_bus.on('input:pointer_down', on_mouse_down);
        Services.event_bus.on('input:pointer_move', on_mouse_move);
        Services.event_bus.on('input:pointer_up', on_mouse_up);
        Services.event_bus.on('input:key_down', input_handler.on_key_down);

        Services.event_bus.on('scene:object_removed', () => {
            const tree_list = state.get_tree_list();
            tree_list.forEach(item => {
                const parent = element_cache.get_element_by_id(item.id)?.closest('li') as HTMLElement | null;
                if (parent === null) return;
                dom_updater.cleanup_empty_parent(parent);
            });
        });

        Services.event_bus.on('selection:cleared', () => {
            const list_selected = state.get_list_selected();
            for (const item_id of list_selected) {
                const element = document.querySelector(`.tree__item[data-id="${item_id}"]`) as HTMLElement | null;
                if (element !== null) element.classList.remove('selected');
            }
            state.set_list_selected([]);
        });
    }

    // === Обработчики событий мыши ===

    function on_mouse_down(event: { target: EventTarget | null; button: number; offset_x: number; offset_y: number }): void {
        const target = event.target as HTMLElement;
        if (target.closest('.tree_div') === null) return;

        if (event.button === 0 || event.button === 2) {
            if (event.button === 0) state.set_is_mousedown(true);

            const item = target.closest('a.tree__item.selected .tree__item_name[contenteditable="true"]');
            if (item !== null) return;

            selection_ui.toggle_class_selected(event);

            state.set_start_y(event.offset_y);
            state.set_start_x(event.offset_x);
            const tree_item = target.closest('.tree__item') as HTMLElement | null;
            state.set_tree_item(tree_item);

            if (tree_item !== null && state.get_is_dragging()) {
                const tree_list = state.get_tree_list();
                const item_drag = tree_list.find(e => e.id === +(tree_item.getAttribute('data-id') ?? '0')) ?? null;
                state.set_item_drag(item_drag);
                state.set_item_drag_rename_id(item_drag?.id ?? null);
                state.set_copy_item_drag(item_drag !== null ? deepClone(item_drag) : null);

                if (item_drag !== null && item_drag.no_drag !== true) {
                    const box_dd = state.get_box_dd();
                    const name_el = box_dd.querySelector('.tree__item_name');
                    if (name_el !== null) name_el.textContent = item_drag.name;
                    const ico_use = box_dd.querySelector('.tree__ico use');
                    if (ico_use !== null) ico_use.setAttribute('href', `./img/sprite.svg#${get_id_ico(item_drag.icon)}`);
                }
            }
        }
    }

    function on_mouse_move(event: { target: EventTarget | null; offset_x: number; offset_y: number }): void {
        const is_mousedown = state.get_is_mousedown();
        if (!is_mousedown) return;

        const tree_item = state.get_tree_item();
        const is_dragging = state.get_is_dragging();
        const is_move_item_drag = state.get_is_move_item_drag();
        const start_x = state.get_start_x();
        const start_y = state.get_start_y();
        const list_selected = state.get_list_selected();

        const new_is_move = is_move_item_drag ? true : drag_drop.is_move(event.offset_x, event.offset_y, start_x, start_y);
        state.set_is_move_item_drag(new_is_move);

        if (tree_item !== null && is_dragging) {
            state.increment_count_move();
            const count_move = state.get_count_move();
            const can_move = Services.actions.is_same_world(items_to_scene_objects(list_selected));

            if (!can_move && count_move === 2) {
                Services.popups.toast.open({
                    type: 'info',
                    message: 'Нельзя одновременно перемещать элементы из GUI и GO!'
                });
            }

            if (can_move) {
                drag_drop.move_at(event.offset_x, event.offset_y);
            }

            if (Services.input.is_control() && list_selected.length > 0) {
                tree_item.classList.add('selected');
            }

            if (can_move) {
                const target = event.target as HTMLElement;
                drag_drop.toggle_current_box(target.closest('.tree__item'));
                drag_drop.switch_class_item(target.closest('.tree__item'), event.offset_x, event.offset_y);
            }
        }
    }

    function on_mouse_up(event: { target: EventTarget | null; button: number; offset_x: number; offset_y: number }): void {
        const target = event.target as HTMLElement;

        // show/hide block menu
        const btn_menu = target.closest('.btn_menu');
        if (btn_menu !== null) {
            const menu_section = btn_menu.closest('.menu_section');
            menu_section?.classList.remove('hide_menu');
            menu_section?.classList.toggle('active');
        }

        if (event.button === 0 || event.button === 2) {
            const item_drag = state.get_item_drag();
            const list_selected = state.get_list_selected();

            if (target.closest('.filemanager') !== null && item_drag !== null && list_selected.length === 1) {
                Services.event_bus.emit('hierarchy:dropped_in_assets', list_selected[0]);
            }

            if (target.closest('.tree_div') === null) {
                if (item_drag !== null) drag_drop.clear();
                state.set_item_drag_rename_id(null);
                return;
            }

            state.set_is_mousedown(false);

            if (event.button === 0) rename.set_contend_edit_able(event);
            selection_ui.send_list_selected(event);

            if (event.button === 2) {
                context_menu_handler.open_menu_context(event);
                return;
            }

            const item_drop = state.get_item_drop();
            if (item_drag === null || item_drop === null) {
                drag_drop.clear();
                return;
            }

            drag_drop.toggle_current_box(target.closest('.tree__item'));
            drag_drop.switch_class_item(target.closest('.tree__item'), event.offset_x, event.offset_y);

            const current_droppable = state.get_current_droppable();
            const is_drop = state.get_is_drop();

            if (target.closest('.tree__item') !== null && current_droppable !== null && is_drop) {
                const pos_in_item = drag_drop.get_pos_mouse_in_block(target.closest('.tree__item')!, event.offset_x, event.offset_y);
                if (pos_in_item !== false && pos_in_item !== null) {
                    const moved_list = drag_drop.get_moved_list(list_selected, item_drag, item_drop, pos_in_item);
                    if (moved_list !== null) {
                        Services.event_bus.emit('hierarchy:moved', moved_list);

                        if (list_selected.length === 1 && item_drag !== null) {
                            state.set_shift_anchor_id(item_drag.id);
                        }
                    }
                }
            }

            drag_drop.clear();
        }
    }

    // === Основные функции ===

    function set_selected_items(list: number[]): void {
        selection_ui.set_selected_items(list);
    }

    function draw_graph(list: TreeItem[], scene_name?: string, is_hide_all_sub = false, is_clear_state = false, is_load_scene = false): void {
        const tree_list = state.get_tree_list();
        const new_tree_list = deepClone(list);
        const old_tree_list = deepClone(tree_list);

        const has_changes = diff_has_update(new_tree_list, old_tree_list);
        if (!has_changes && !is_clear_state) {
            return;
        }

        const current_scene_name = scene_name ?? state.get_current_scene_name();
        state.set_current_scene_name(current_scene_name);
        state.set_tree_list(new_tree_list);

        const contexts = state.get_contexts();
        if (is_clear_state) {
            contexts[current_scene_name] = {};
        }
        if (contexts[current_scene_name] === undefined) {
            contexts[current_scene_name] = {};
        }

        if (!is_tree_exists() || is_clear_state || is_load_scene) {
            setup_tree(new_tree_list, is_hide_all_sub);
        } else {
            update_tree(new_tree_list, old_tree_list);
        }

        Services.event_bus.emit('hierarchy:refresh_requested', { list: new_tree_list });

        scroll_to_last_selected(
            state.get_div_tree(),
            new_tree_list,
            state.get_prev_list_selected()
        );
    }

    function is_tree_exists(): boolean {
        const div_tree = state.get_div_tree();
        return div_tree.querySelector('.tree') !== null;
    }

    function setup_tree(list: TreeItem[], is_hide_all_sub: boolean): void {
        const div_tree = state.get_div_tree();
        const contexts = state.get_contexts();
        const current_scene_name = state.get_current_scene_name();
        const cut_list = state.get_cut_list();

        const scene_for_build = is_hide_all_sub ? current_scene_name : undefined;
        const { tree, list_selected } = build_tree(list, contexts, current_scene_name, scene_for_build);

        state.set_prev_list_selected(deepClone(state.get_list_selected()));
        state.set_list_selected(list_selected);

        const html = get_tree_html(tree, cut_list);
        div_tree.innerHTML = html;

        const btns = div_tree.querySelectorAll('.tree__btn') as NodeListOf<HTMLElement>;
        btns.forEach(btn => {
            drag_drop.add_tree_btn_event_listener(btn);
        });

        const li_lines = div_tree.querySelectorAll('.li_line') as NodeListOf<HTMLElement>;
        li_lines.forEach(li => {
            drag_drop.add_hover_delay_event_listener(li);
        });

        element_cache.setup_element_cache();
    }

    function update_tree(list: TreeItem[], old_list: TreeItem[]): void {
        if (!is_tree_exists()) return;

        state.set_prev_list_selected(deepClone(state.get_list_selected()));
        const new_list_selected: number[] = [];

        list.forEach(item => {
            if (item.selected === true) {
                new_list_selected.push(item.id);
            }
        });
        state.set_list_selected(new_list_selected);

        const changes = diff_get_changes(list, old_list);

        if (changes.deletedItems.length > 0) {
            dom_updater.remove_deleted_items(list);
        }

        changes.newItems.forEach(item => {
            dom_updater.create_new_tree_item(item);
        });

        if (changes.structureChanged) {
            dom_updater.update_structure(list);
        }

        changes.modifiedItems.forEach(item => {
            dom_updater.update_item(item);
        });

        open_tree_with_selected(
            list,
            element_cache.get_element_by_id,
            state.get_contexts(),
            state.get_current_scene_name()
        );

        highlight.paint_identical();
        highlight.paint_search_node('color_green');

        texture_drop.toggle_event_listener_texture();
    }

    function pre_rename(): void {
        rename.pre_rename();
    }

    function set_cut_list(is_clear = false): void {
        context_menu_handler.set_cut_list(is_clear);
    }

    function paint_identical(expand = false): void {
        highlight.paint_identical(expand);
    }

    // === Инициализация ===
    init();

    return {
        set_selected_items,
        draw_graph,
        preRename: pre_rename,
        setCutList: set_cut_list,
        paintIdentical: paint_identical,
    };
}
