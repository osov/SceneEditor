/**
 * Drag-drop текстур и ассетов на элементы дерева
 */

import { Vector2, Mesh } from 'three';
import { Services } from '@editor/core';
import { worldGui, ParamsTexture } from '../../shared/types';
import { IObjectTypes } from '../../render_engine/types';
import { ASSET_SCENE_GRAPH } from '../modules_editor_const';
import { DEFOLD_LIMITS } from '../../config';
import type { TreeState, TreeMeshObject } from './types';

/**
 * Параметры для создания texture drop handler
 */
export interface TreeTextureDropParams {
    state: TreeState;
}

/**
 * Создаёт фабрику для drag-drop текстур
 */
export function create_tree_texture_drop(params: TreeTextureDropParams) {
    const { state } = params;

    /**
     * Переключает event listeners для drop текстур
     */
    function toggle_event_listener_texture(add = true): void {
        const selector = '.tree__item[data-icon="scene"], .tree__item[data-icon="go"], .tree__item[data-icon="gui"], .tree__item[data-icon="box"], .tree__item[data-icon="text"]';
        const list_drop = document.querySelectorAll(selector);

        if (list_drop.length > 0) {
            list_drop.forEach((item) => {
                if (add) {
                    const no_drop = item.getAttribute('data-no_drop');
                    if (no_drop === null) {
                        item.addEventListener('dragover', allow_drop_texture);
                        item.addEventListener('dragleave', on_drag_leave_texture);
                        item.addEventListener('drop', on_drop_texture);
                    }
                } else {
                    item.removeEventListener('dragover', allow_drop_texture);
                    item.removeEventListener('dragleave', on_drag_leave_texture);
                    item.removeEventListener('drop', on_drop_texture);
                }
            });
        }
    }

    /**
     * Разрешает drop текстуры
     */
    function allow_drop_texture(event: Event): void {
        event.preventDefault();
        const target = event.target as HTMLElement;
        const item = target.closest('.tree__item');
        if (item !== null) item.classList.add('drop_texture');
    }

    /**
     * Обрабатывает drag leave
     */
    function on_drag_leave_texture(event: Event): void {
        event.preventDefault();
        const target = event.target as HTMLElement;
        const item = target.closest('.tree__item');
        if (item !== null) item.classList.remove('drop_texture');
    }

    /**
     * Обрабатывает drop текстуры
     */
    function on_drop_texture(event: Event): void {
        event.preventDefault();
        const target = event.target as HTMLElement;
        const item = target.closest('.tree__item');
        if (item === null) return;

        item.classList.remove('drop_texture');
        const icon = item.getAttribute('data-icon');
        const item_id = item.getAttribute('data-id');
        if (icon === null || item_id === null) return;

        add_node_texture(event as DragEvent, false, icon, +item_id);
    }

    /**
     * Получает позицию мыши в мировых координатах
     */
    function get_mouse_pos(event: DragEvent): { x: number; y: number } {
        const canvas = document.querySelector('canvas#scene')!;
        const mp_n = new Vector2();
        mp_n.set(
            (event.pageX / canvas.clientWidth) * 2 - 1,
            -(event.pageY / canvas.clientHeight) * 2 + 1
        );
        return Services.camera.screen_to_world(mp_n.x, mp_n.y) ?? { x: 0, y: 0 };
    }

    /**
     * Инициализирует drop текстуры на canvas
     */
    function canvas_drop_texture(): void {
        const canvas = document.querySelector('canvas#scene')!;
        canvas.addEventListener('dragover', (e: Event) => e.preventDefault());
        canvas.addEventListener('drop', on_drop_texture_canvas);
    }

    /**
     * Обрабатывает drop текстуры на canvas
     */
    function on_drop_texture_canvas(event: Event): void {
        event.preventDefault();
        add_node_texture(event as DragEvent, true);
    }

    /**
     * Добавляет ноду с текстурой
     */
    function add_node_texture(event: DragEvent, is_pos: boolean, icon = '', id = -1): void {
        const data = event.dataTransfer?.getData('text/plain') ?? '';

        // Перетаскиваемый ассет может быть сохранённым графом сцены
        const asset_type = event.dataTransfer?.getData('asset_type');
        if (asset_type === ASSET_SCENE_GRAPH) {
            const mouse_up_pos = get_mouse_pos(event);
            const path = event.dataTransfer?.getData('path') ?? '';
            Services.assets.load_part_of_scene(path, mouse_up_pos);
            Services.ui.update_hierarchy();
            return;
        }

        if (data.length === 0 || data.includes('undefined/undefined')) {
            Services.popups.toast.open({ type: 'info', message: 'Нет текстуры!' });
            return;
        }

        const list = Services.selection.selected as TreeMeshObject[];
        if (list.length > 1 && is_pos) {
            Services.popups.toast.open({ type: 'info', message: 'Для этого действия нужно выбрать только 1 объект!' });
            return;
        }

        const n_type = is_pos && list.length > 0 ? list[0]?.type : icon;
        const mouse_up_pos = get_mouse_pos(event);
        const n_pos = is_pos && mouse_up_pos !== undefined ? new Vector2(mouse_up_pos.x, mouse_up_pos.y) : new Vector2(0, 0);
        const n_id = is_pos && list.length > 0 && list[0]?.mesh_data !== undefined ? list[0].mesh_data.id : id;

        const arr_size = (event.dataTransfer?.getData('textureSize') ?? '').split('x');
        const t_width = +arr_size[0];
        const t_height = +arr_size[1];
        const arr_data = data.split('/');

        const pt: ParamsTexture = {
            pid: n_id,
            texture: arr_data[1],
            atlas: arr_data[0],
            size: { w: t_width || 128, h: t_height || 128 },
            pos: n_pos
        };

        const tree_list = state.get_tree_list();
        const no_drop = tree_list.find((i) => i.id === pt.pid && i.no_drop);
        if (no_drop !== undefined) {
            Services.popups.toast.open({ type: 'info', message: 'В текущий объект запрещено добавлять дочерние!' });
            return;
        }

        const go = ['scene', IObjectTypes.GO_CONTAINER];
        if ((list.length === 0 && is_pos) || (n_type !== undefined && go.includes(n_type))) {
            if (!DEFOLD_LIMITS) {
                Services.actions.add_go_sprite(pt);
            } else {
                Services.actions.add_go_with_sprite(pt);
            }
            return;
        }

        if (n_type !== undefined && worldGui.includes(n_type)) {
            Services.actions.add_gui_box(pt);
            return;
        }

        Services.popups.toast.open({ type: 'info', message: 'Этому объекту нельзя добавлять текстуру!' });
    }

    /**
     * Получает позицию для создания объекта в видимой области
     */
    function get_position_view(): Vector2 {
        const list = Services.selection.selected as TreeMeshObject[];
        const cx = (0.5) * 2 - 1;
        const cy = -0.5 * 2 + 1;

        if (list.length === 0) {
            const wp = Services.camera.screen_to_world(cx, cy);
            return new Vector2(wp.x, wp.y);
        }

        if (list.length === 1) {
            if (!Services.camera.is_visible(list[0] as unknown as Mesh)) {
                const wp = Services.camera.screen_to_world(cx, cy);
                const lp = list[0].worldToLocal(wp);
                return new Vector2(lp.x, lp.y);
            }
        }

        return new Vector2();
    }

    return {
        toggle_event_listener_texture,
        allow_drop_texture,
        on_drag_leave_texture,
        on_drop_texture,
        get_mouse_pos,
        canvas_drop_texture,
        on_drop_texture_canvas,
        add_node_texture,
        get_position_view,
    };
}

/**
 * Тип для фабрики texture drop
 */
export type TreeTextureDropFactory = ReturnType<typeof create_tree_texture_drop>;
