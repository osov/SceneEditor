/**
 * Обработчик контекстного меню дерева
 */

import { deepClone } from '../../modules/utils';
import { Services } from '@editor/core';
import { NodeAction } from '../../shared/types';
import { ComponentType } from '../../render_engine/components/container_component';
import { contextMenuItem, get_contextmenu } from '../ContextMenu';
import type { TreeContextMenuServiceType } from '../../editor/hierarchy';
import type { TreeState } from './types';
import type { TreeRenameFactory } from './tree_rename';
import type { TreeTextureDropFactory } from './tree_texture_drop';

/**
 * Параметры для создания context menu handler
 */
export interface TreeContextMenuHandlerParams {
    state: TreeState;
    context_menu_service: TreeContextMenuServiceType;
    rename: TreeRenameFactory;
    texture_drop: TreeTextureDropFactory;
}

/**
 * Создаёт фабрику для контекстного меню
 */
export function create_tree_context_menu_handler(params: TreeContextMenuHandlerParams) {
    const { state, context_menu_service, rename, texture_drop } = params;

    /**
     * Открывает контекстное меню
     */
    function open_menu_context(event: { target: EventTarget | null }): void {
        const item_drag = state.get_item_drag();
        const div_tree = state.get_div_tree();
        const target = event.target as HTMLElement;

        if (item_drag === null) return;
        if (target.closest('.tree__item') === null) return;

        // Запрет скроллинга при контекстном меню
        if (div_tree.scrollHeight > div_tree.clientHeight) {
            div_tree.classList.add('no_scrolling');
        }

        const menu_items = context_menu_service.get_menu_items(item_drag);
        get_contextmenu().open(menu_items as contextMenuItem[], event, menu_context_click);
    }

    /**
     * Устанавливает cut list
     */
    function set_cut_list(is_clear = false): void {
        const list_selected = state.get_list_selected();

        if (!is_clear) {
            state.set_cut_list(deepClone(list_selected));
            add_class_is_cut();
        } else {
            state.set_cut_list([]);
        }
    }

    /**
     * Добавляет класс isCut к элементам
     */
    function add_class_is_cut(): void {
        const cut_list = state.get_cut_list();
        if (cut_list.length === 0) return;

        cut_list.forEach((i) => {
            const item = document.querySelector(`.tree__item[data-id="${i}"]`) as HTMLElement | null;
            if (item !== null) item.classList.add('isCut');
        });
    }

    /**
     * Обработчик клика по пункту меню
     */
    function menu_context_click(success: boolean, action?: number | string): void {
        const div_tree = state.get_div_tree();
        const copy_item_drag = state.get_copy_item_drag();

        div_tree.classList.remove('no_scrolling');

        if (!success || action === undefined || action === null || copy_item_drag === null) return;

        if (action === NodeAction.CTRL_X) {
            Services.actions.cut();
        }
        if (action === NodeAction.CTRL_C) {
            Services.actions.copy();
        }
        if (action === NodeAction.CTRL_V) {
            // isDuplication для возможности вставки в корень из меню
            Services.actions.paste(false, copy_item_drag.id === -1);
        }
        if (action === NodeAction.CTRL_B) {
            // isDuplication для возможности вставки в корень из меню
            Services.actions.paste(true, copy_item_drag.id === -1);
        }
        if (action === NodeAction.CTRL_D) {
            Services.actions.duplicate();
        }
        if (action === NodeAction.rename) {
            rename.pre_rename();
        }
        if (action === NodeAction.remove) {
            Services.actions.delete_selected();
        }
        if (action === NodeAction.add_gui_container) {
            Services.actions.add_gui_container({ pid: copy_item_drag.id, pos: texture_drop.get_position_view() });
        }
        if (action === NodeAction.add_gui_box) {
            Services.actions.add_gui_box({
                pid: copy_item_drag.id,
                texture: '2',
                atlas: '',
                pos: texture_drop.get_position_view(),
                size: { w: 128, h: 40 }
            });
        }
        if (action === NodeAction.add_gui_text) {
            Services.actions.add_gui_text({ pid: copy_item_drag.id, pos: texture_drop.get_position_view() });
        }
        if (action === NodeAction.add_go_container) {
            Services.actions.add_go_container({ pid: copy_item_drag.id, pos: texture_drop.get_position_view() });
        }
        if (action === NodeAction.add_go_sprite_component) {
            Services.actions.add_go_sprite({
                pid: copy_item_drag.id,
                texture: 'arrow1',
                atlas: 'example_atlas',
                pos: texture_drop.get_position_view(),
                size: { w: 64, h: 64 }
            });
        }
        if (action === NodeAction.add_go_label_component) {
            Services.actions.add_go_label({ pid: copy_item_drag.id, pos: texture_drop.get_position_view() });
        }
        if (action === NodeAction.add_go_model_component) {
            Services.actions.add_go_model({ pid: copy_item_drag.id, pos: texture_drop.get_position_view() });
        }
        if (action === NodeAction.add_go_animated_model_component) {
            Services.actions.add_go_animated_model({ pid: copy_item_drag.id, pos: texture_drop.get_position_view() });
        }
        if (action === NodeAction.add_go_audio_component) {
            Services.actions.add_go_audio({ pid: copy_item_drag.id, pos: texture_drop.get_position_view() });
        }
        if (action === NodeAction.add_component_spline) {
            Services.actions.add_component({ pid: copy_item_drag.id, pos: texture_drop.get_position_view() }, ComponentType.SPLINE);
        }
        if (action === NodeAction.add_component_mover) {
            Services.actions.add_component({ pid: copy_item_drag.id, pos: texture_drop.get_position_view() }, ComponentType.MOVER);
        }

        state.set_copy_item_drag(null);
    }

    return {
        open_menu_context,
        set_cut_list,
        add_class_is_cut,
        menu_context_click,
    };
}

/**
 * Тип для фабрики context menu handler
 */
export type TreeContextMenuHandlerFactory = ReturnType<typeof create_tree_context_menu_handler>;
