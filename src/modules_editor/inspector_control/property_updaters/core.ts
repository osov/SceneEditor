/**
 * Обработчики обновления базовых свойств: Name, Active, Visible, Pivot, Anchor, AnchorPreset
 */

import { Vector2 } from 'three';
import { Services } from '@editor/core';
import { get_changed_info } from '../../inspector_module';
import {
    ScreenPointPreset,
    screen_preset_to_pivot_value,
    screen_preset_to_anchor_value,
} from '../../inspector_module';
import { Property } from '../../../core/inspector';
import type { ChangeInfo, UpdaterContext } from '../types';
import type { IBaseMeshAndThree } from '../../../render_engine/types';

/**
 * Обновляет имя объектов
 */
export function update_name(info: ChangeInfo, ctx: UpdaterContext) {
    for (const id of info.ids) {
        const mesh = find_mesh(ctx.selected_list, id);
        if (mesh === undefined) {
            ctx.log_error('[updateName] Mesh not found for id:', id);
            continue;
        }

        mesh.name = info.data.event.value as string;
        ctx.on_ui_changed?.();
    }
}

/**
 * Обновляет состояние детей (рекурсивно)
 */
function update_children_active(children: IBaseMeshAndThree[], state: boolean): { id: number; visible: boolean }[] {
    const result: { id: number; visible: boolean }[] = [];
    for (const child of children) {
        child.set_active(state);
        result.push({ id: child.mesh_data.id, visible: child.get_visible() });
        if (child.children.length > 0) {
            const child_results = update_children_active(child.children as IBaseMeshAndThree[], state);
            if (child_results.length > 0) result.push(...child_results);
        }
    }
    return result;
}

/**
 * Обновляет активность объектов
 */
export function update_active(info: ChangeInfo, ctx: UpdaterContext) {
    const ids: { id: number; visible: boolean }[] = [];
    const state = info.data.event.value as boolean;

    for (const id of info.ids) {
        const mesh = find_mesh(ctx.selected_list, id);
        if (mesh === undefined) {
            ctx.log_error('[updateActive] Mesh not found for id:', id);
            continue;
        }

        mesh.set_active(state);
        ids.push({ id, visible: mesh.get_visible() });
        if (mesh.children) {
            const children = update_children_active(mesh.children as IBaseMeshAndThree[], state);
            if (children.length > 0) ids.push(...children);
        }
    }

    Services.event_bus.emit('hierarchy:active', { list: ids, state });
}

/**
 * Обновляет видимость объектов
 */
export function update_visible(info: ChangeInfo, ctx: UpdaterContext) {
    const state = info.data.event.value as boolean;

    for (const id of info.ids) {
        const mesh = find_mesh(ctx.selected_list, id);
        if (mesh === undefined) {
            ctx.log_error('[updateVisible] Mesh not found for id:', id);
            continue;
        }

        mesh.set_visible(state);
    }

    Services.event_bus.emit('hierarchy:visibility_changed', { list: info.ids, state });
}

/**
 * Обновляет точку опоры объектов
 */
export function update_pivot(info: ChangeInfo, ctx: UpdaterContext) {
    for (const id of info.ids) {
        const mesh = find_mesh(ctx.selected_list, id);
        if (mesh === undefined) {
            ctx.log_error('[updatePivot] Mesh not found for id:', id);
            continue;
        }

        const pivot_preset = info.data.event.value as ScreenPointPreset;
        const pivot = screen_preset_to_pivot_value(pivot_preset);
        mesh.set_pivot(pivot.x, pivot.y, true);
    }

    ctx.on_size_changed?.();
}

/**
 * Обновляет якорь объектов
 */
export function update_anchor(info: ChangeInfo, ctx: UpdaterContext) {
    const [isChangedX, isChangedY] = get_changed_info(info);

    const anchor = info.data.event.value as Vector2;

    for (const id of info.ids) {
        const mesh = find_mesh(ctx.selected_list, id);
        if (mesh === undefined) {
            ctx.log_error('[updateAnchor] Mesh not found for id:', id);
            continue;
        }

        const x = isChangedX ? anchor.x : mesh.get_anchor().x;
        const y = isChangedY ? anchor.y : mesh.get_anchor().y;

        mesh.set_anchor(x, y);
    }

    ctx.on_size_changed?.();

    if (info.data.event.last === true) {
        ctx.on_refresh?.([Property.ANCHOR_PRESET]);
    }

    ctx.on_refresh?.([Property.ANCHOR]);
}

/**
 * Обновляет пресет якоря объектов
 */
export function update_anchor_preset(info: ChangeInfo, ctx: UpdaterContext) {
    for (const id of info.ids) {
        const mesh = find_mesh(ctx.selected_list, id);
        if (mesh === undefined) {
            ctx.log_error('[updateAnchorPreset] Mesh not found for id:', id);
            continue;
        }

        const anchor = screen_preset_to_anchor_value(info.data.event.value as ScreenPointPreset);
        if (anchor !== undefined) {
            mesh.set_anchor(anchor.x, anchor.y);
        }
    }

    ctx.on_size_changed?.();
    ctx.on_refresh?.([Property.ANCHOR]);
}

// ============================================================================
// Helpers
// ============================================================================

function find_mesh(list: IBaseMeshAndThree[], id: number): IBaseMeshAndThree | undefined {
    return list.find((item) => item.mesh_data.id === id);
}
