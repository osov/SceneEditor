/**
 * Обработчики обновления текстовых свойств: Text, Font, FontSize, TextAlign, LineHeight
 */

import type { TextMesh } from '../../../render_engine/objects/text';
import type { IBaseMeshAndThree } from '../../../render_engine/types';
import { Property } from '../../../core/inspector';
import type { ChangeInfo, UpdaterContext } from '../types';

/**
 * Обновляет текст объектов
 */
export function update_text(info: ChangeInfo, ctx: UpdaterContext) {
    for (const id of info.ids) {
        const mesh = find_mesh(ctx.selected_list, id);
        if (mesh === undefined) {
            ctx.log_error('[updateText] Mesh not found for id:', id);
            continue;
        }

        const text = info.data.event.value as string;
        (mesh as unknown as TextMesh).text = text;
    }
}

/**
 * Обновляет шрифт объектов
 */
export function update_font(info: ChangeInfo, ctx: UpdaterContext) {
    for (const id of info.ids) {
        const mesh = find_mesh(ctx.selected_list, id);
        if (mesh === undefined) {
            ctx.log_error('[updateFont] Mesh not found for id:', id);
            continue;
        }

        const font = info.data.event.value as string;
        (mesh as unknown as TextMesh).font = font;
    }
}

/**
 * Обновляет размер шрифта объектов
 */
export function update_font_size(info: ChangeInfo, ctx: UpdaterContext) {
    for (const id of info.ids) {
        const mesh = find_mesh(ctx.selected_list, id);
        if (mesh === undefined) {
            ctx.log_error('[updateFontSize] Mesh not found for id:', id);
            continue;
        }

        const font_size = info.data.event.value as number;
        const delta = font_size / (mesh as unknown as TextMesh).fontSize;

        mesh.scale.set(1 * delta, 1 * delta, mesh.scale.z);
        mesh.transform_changed();
    }

    ctx.on_transform_changed?.();
    ctx.on_size_changed?.();
    ctx.on_refresh?.([Property.SCALE]);
}

/**
 * Обновляет выравнивание текста объектов
 */
export function update_text_align(info: ChangeInfo, ctx: UpdaterContext) {
    for (const id of info.ids) {
        const mesh = find_mesh(ctx.selected_list, id);
        if (mesh === undefined) {
            ctx.log_error('[updateTextAlign] Mesh not found for id:', id);
            continue;
        }

        const text_align = info.data.event.value as 'left' | 'right' | 'center' | 'justify';
        (mesh as unknown as TextMesh).textAlign = text_align;
    }
}

/**
 * Обновляет межстрочный интервал объектов
 */
export function update_line_height(info: ChangeInfo, ctx: UpdaterContext) {
    for (const id of info.ids) {
        const mesh = find_mesh(ctx.selected_list, id);
        if (mesh === undefined) {
            ctx.log_error('[updateLineHeight] Mesh not found for id:', id);
            continue;
        }

        const line_height = info.data.event.value as number;
        (mesh as unknown as TextMesh).lineHeight = line_height;
    }
}

// ============================================================================
// Helpers
// ============================================================================

function find_mesh(list: IBaseMeshAndThree[], id: number): IBaseMeshAndThree | undefined {
    return list.find((item) => item.mesh_data.id === id);
}
