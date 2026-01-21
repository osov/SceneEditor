/**
 * Обработчики обновления визуальных свойств: Color, Alpha, Texture, Slice, BlendMode, Material, Flip
 */

import { Vector2 } from 'three';
import { Services } from '@editor/core';
import { IObjectTypes, type IBaseMeshAndThree } from '../../../render_engine/types';
import type { TextMesh } from '../../../render_engine/objects/text';
import type { Slice9Mesh } from '../../../render_engine/objects/slice9';
import { FlipMode, type GoSprite } from '../../../render_engine/objects/sub_types';
import { convert_blend_mode_to_threejs, type BlendMode } from '../../inspector_module';
import { get_changed_info } from '../../inspector_module';
import { Property } from '../../../core/inspector';
import type { ChangeInfo, UpdaterContext } from '../types';

/**
 * Обновляет цвет объектов
 */
export function update_color(info: ChangeInfo, ctx: UpdaterContext) {
    for (const id of info.ids) {
        const mesh = find_mesh(ctx.selected_list, id);
        if (mesh === undefined) {
            ctx.log_error('[updateColor] Mesh not found for id:', id);
            continue;
        }

        const color = info.data.event.value as string;
        mesh.set_color(color);
    }
}

/**
 * Обновляет альфа-канал объектов
 */
export function update_alpha(info: ChangeInfo, ctx: UpdaterContext) {
    for (const id of info.ids) {
        const mesh = find_mesh(ctx.selected_list, id);
        if (mesh === undefined) {
            ctx.log_error('[updateAlpha] Mesh not found for id:', id);
            continue;
        }

        const alpha = info.data.event.value as number;
        if (mesh.type === IObjectTypes.TEXT || mesh.type === IObjectTypes.GUI_TEXT || mesh.type === IObjectTypes.GO_LABEL_COMPONENT) {
            (mesh as unknown as TextMesh).fillOpacity = alpha;
        } else if (mesh.type === IObjectTypes.SLICE9_PLANE || mesh.type === IObjectTypes.GUI_BOX || mesh.type === IObjectTypes.GO_SPRITE_COMPONENT) {
            (mesh as Slice9Mesh).set_alpha(alpha);
        }
    }
}

/**
 * Обновляет текстуру объектов
 */
export function update_texture(info: ChangeInfo, ctx: UpdaterContext) {
    for (const id of info.ids) {
        const mesh = find_mesh(ctx.selected_list, id);
        if (mesh === undefined) {
            ctx.log_error('[updateTexture] Mesh not found for id:', id);
            continue;
        }

        if (info.data.event.value !== undefined && info.data.event.value !== null && info.data.event.value !== '') {
            const texture_name = info.data.event.value as string;
            // Ищем текстуру во всех атласах, т.к. dropdown передаёт только имя
            const all_textures = Services.resources.get_all_textures();
            const found = all_textures.find(t => t.name === texture_name);
            const atlas = found?.atlas ?? '';
            (mesh as Slice9Mesh).set_texture(texture_name, atlas);
        } else {
            (mesh as Slice9Mesh).set_texture('');
        }
    }
}

/**
 * Обновляет slice9 объектов
 */
export function update_slice(info: ChangeInfo, ctx: UpdaterContext) {
    const [isChangedX, isChangedY] = get_changed_info(info);

    const slice = info.data.event.value as Vector2;

    for (const id of info.ids) {
        const mesh = find_mesh(ctx.selected_list, id);
        if (mesh === undefined) {
            ctx.log_error('[updateSlice] Mesh not found for id:', id);
            continue;
        }

        const x = isChangedX ? slice.x : (mesh as Slice9Mesh).get_slice().x;
        const y = isChangedY ? slice.y : (mesh as Slice9Mesh).get_slice().y;

        (mesh as Slice9Mesh).set_slice(x, y);
    }
}

/**
 * Обновляет атлас объектов
 */
export function update_atlas(info: ChangeInfo, ctx: UpdaterContext) {
    Services.logger.debug('update atlas');
    const atlas = info.data.event.value as string;

    for (const id of info.ids) {
        const mesh = find_mesh(ctx.selected_list, id);
        if (mesh === undefined) {
            ctx.log_error('[updateAtlas] Mesh not found for id:', id);
            continue;
        }

        (mesh as Slice9Mesh).set_texture('', atlas);
    }

    // на следующем кадре обновляем список выбранных мешей чтобы обновились опции текстур
    setTimeout(() => ctx.on_rebuild_inspector?.());
}

/**
 * Обновляет режим смешивания объектов
 */
export function update_blend_mode(info: ChangeInfo, ctx: UpdaterContext) {
    for (const id of info.ids) {
        const mesh = find_mesh(ctx.selected_list, id);
        if (mesh === undefined) {
            ctx.log_error('[updateBlendMode] Mesh not found for id:', id);
            continue;
        }

        const blend_mode = info.data.event.value as BlendMode;
        const threeBlendMode = convert_blend_mode_to_threejs(blend_mode);
        (mesh as unknown as { material: { blending: number } }).material.blending = threeBlendMode;
    }
}

/**
 * Обновляет материал объектов
 */
export function update_material(info: ChangeInfo, ctx: UpdaterContext) {
    const new_material_name = info.data.event.value as string;

    for (const id of info.ids) {
        const mesh = find_mesh(ctx.selected_list, id);
        if (mesh === undefined) {
            ctx.log_error('[updateMaterial] Mesh not found for id:', id);
            continue;
        }

        // Используем set_material для корректного применения материала и переприменения текстуры
        if ('set_material' in mesh && typeof mesh.set_material === 'function') {
            mesh.set_material(new_material_name);
        } else {
            // Fallback для объектов без set_material
            const material_info = Services.resources.get_material_info(new_material_name);
            if (material_info !== undefined) {
                (mesh as unknown as { material: unknown }).material = material_info.instances[material_info.origin];
            }
        }
    }

    // Обновляем инспектор для отображения новых uniforms материала
    ctx.on_rebuild_inspector?.();
}

/**
 * Обновляет вертикальный флип
 */
export function update_flip_vertical(info: ChangeInfo, ctx: UpdaterContext, save_uv: (ids: number[]) => void) {
    save_uv(info.ids);
    for (const item of ctx.selected_list) {
        if (item.type === IObjectTypes.GO_SPRITE_COMPONENT) {
            const sprite = item as GoSprite;
            sprite.set_flip(FlipMode.NONE);
            if (info.data.event.value === true) {
                sprite.set_flip(FlipMode.VERTICAL);
            }
        }
    }
    ctx.on_refresh?.([Property.FLIP_DIAGONAL, Property.FLIP_HORIZONTAL]);
}

/**
 * Обновляет горизонтальный флип
 */
export function update_flip_horizontal(info: ChangeInfo, ctx: UpdaterContext, save_uv: (ids: number[]) => void) {
    save_uv(info.ids);
    for (const item of ctx.selected_list) {
        if (item.type === IObjectTypes.GO_SPRITE_COMPONENT) {
            const sprite = item as GoSprite;
            sprite.set_flip(FlipMode.NONE);
            if (info.data.event.value === true) {
                sprite.set_flip(FlipMode.HORIZONTAL);
            }
        }
    }
    ctx.on_refresh?.([Property.FLIP_DIAGONAL, Property.FLIP_VERTICAL]);
}

/**
 * Обновляет диагональный флип
 */
export function update_flip_diagonal(info: ChangeInfo, ctx: UpdaterContext, save_uv: (ids: number[]) => void) {
    save_uv(info.ids);
    for (const item of ctx.selected_list) {
        if (item.type === IObjectTypes.GO_SPRITE_COMPONENT) {
            const sprite = item as GoSprite;
            sprite.set_flip(FlipMode.NONE);
            if (info.data.event.value === true) {
                sprite.set_flip(FlipMode.DIAGONAL);
            }
        }
    }
    ctx.on_refresh?.([Property.FLIP_VERTICAL, Property.FLIP_HORIZONTAL]);
}

// ============================================================================
// Helpers
// ============================================================================

function find_mesh(list: IBaseMeshAndThree[], id: number): IBaseMeshAndThree | undefined {
    return list.find((item) => item.mesh_data.id === id);
}
