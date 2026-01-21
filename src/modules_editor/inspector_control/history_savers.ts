/**
 * Функции сохранения в историю для специальных случаев:
 * - Текстурные ассеты (saveAssetAtlas, saveMinFilter, saveMagFilter)
 * - UV координаты (saveUV)
 * - Uniforms материалов (saveUniform)
 */

import type { MinificationTextureFilter, MagnificationTextureFilter } from 'three';
import { Services } from '@editor/core';
import { deepClone } from '../../modules/utils';
import { get_basename, get_file_name } from '../../render_engine/helpers/utils';
import { IObjectTypes, type IBaseMeshAndThree } from '../../render_engine/types';
import type { GoSprite } from '../../render_engine/objects/sub_types';
import { MultipleMaterialMesh } from '../../render_engine/objects/multiple_material_mesh';
import { HistoryOwner } from '../modules_editor_const';
import type {
    MinFilterEventData,
    MagFilterEventData,
    TextureAtlasEventData,
    UVEventData,
} from '../InspectorTypes';
import type { PropertyData, PropertyType, HistorySaverContext } from './types';

// ============================================================================
// Internal Types
// ============================================================================

/** Данные для отмены изменения uniform */
interface UniformEventData {
    id_mesh: number;
    uniform_name: string;
    slot_index?: number;
    value: unknown;
}

// ============================================================================
// Texture Asset History Savers
// ============================================================================

/**
 * Сохраняет текущий атлас текстуры для истории
 */
export function save_asset_atlas(ids: number[], ctx: HistorySaverContext) {
    const atlases: TextureAtlasEventData[] = [];

    for (const id of ids) {
        const texture_path = ctx.selected_textures[id];
        if (texture_path === undefined) {
            Services.logger.error('[saveAssetAtlas] Texture path not found for id:', id);
            continue;
        }

        const texture_name = get_file_name(get_basename(texture_path));
        const oldAtlas = Services.resources.get_atlas_by_texture_name(texture_name);
        atlases.push({ texture_path, atlas: oldAtlas !== null ? oldAtlas : '' });
    }

    Services.history.push({
        type: 'TEXTURE_ATLAS',
        description: 'Изменение атласа текстуры',
        data: { items: atlases, owner: HistoryOwner.INSPECTOR_CONTROL },
        undo: (d) => {
            for (const item of d.items as TextureAtlasEventData[]) {
                const texture_name = get_file_name(get_basename(item.texture_path));
                const current_atlas = Services.resources.get_atlas_by_texture_name(texture_name) || '';
                Services.resources.override_atlas_texture(current_atlas, item.atlas, texture_name);
            }
        },
        redo: () => { },
    });
}

/**
 * Сохраняет текущий minFilter текстуры для истории
 */
export function save_min_filter(ids: number[], ctx: HistorySaverContext) {
    const minFilters: MinFilterEventData[] = [];

    for (const id of ids) {
        const texture_path = ctx.selected_textures[id];
        if (texture_path === undefined) {
            Services.logger.error('[saveMinFilter] Texture path not found for id:', id);
            continue;
        }

        const texture_name = get_file_name(get_basename(texture_path));
        const atlas = Services.resources.get_atlas_by_texture_name(texture_name);
        if (atlas === null) {
            Services.logger.error('[saveMinFilter] Atlas not found for texture:', texture_name);
            continue;
        }

        const texture_data = Services.resources.get_texture(texture_name, atlas);
        minFilters.push({
            texture_path,
            filter: texture_data.texture.minFilter as MinificationTextureFilter
        });
    }

    Services.history.push({
        type: 'TEXTURE_MIN_FILTER',
        description: 'Изменение минификационного фильтра',
        data: { items: minFilters, owner: HistoryOwner.INSPECTOR_CONTROL },
        undo: (d) => {
            for (const item of d.items as MinFilterEventData[]) {
                const texture_name = get_file_name(get_basename(item.texture_path));
                const atlas = Services.resources.get_atlas_by_texture_name(texture_name);
                if (atlas !== null) {
                    const texture_data = Services.resources.get_texture(texture_name, atlas);
                    texture_data.texture.minFilter = item.filter;
                }
            }
            Services.resources.write_metadata();
        },
        redo: () => { },
    });
}

/**
 * Сохраняет текущий magFilter текстуры для истории
 */
export function save_mag_filter(ids: number[], ctx: HistorySaverContext) {
    const magFilters: MagFilterEventData[] = [];

    for (const id of ids) {
        const texture_path = ctx.selected_textures[id];
        if (texture_path === undefined) {
            Services.logger.error('[saveMagFilter] Texture path not found for id:', id);
            continue;
        }

        const texture_name = get_file_name(get_basename(texture_path));
        const atlas = Services.resources.get_atlas_by_texture_name(texture_name);
        if (atlas === null) {
            Services.logger.error('[saveMagFilter] Atlas not found for texture:', texture_name);
            continue;
        }

        const texture_data = Services.resources.get_texture(texture_name, atlas);
        magFilters.push({
            texture_path,
            filter: texture_data.texture.magFilter as MagnificationTextureFilter
        });
    }

    Services.history.push({
        type: 'TEXTURE_MAG_FILTER',
        description: 'Изменение магнификационного фильтра',
        data: { items: magFilters, owner: HistoryOwner.INSPECTOR_CONTROL },
        undo: (d) => {
            for (const item of d.items as MagFilterEventData[]) {
                const texture_name = get_file_name(get_basename(item.texture_path));
                const atlas = Services.resources.get_atlas_by_texture_name(texture_name);
                if (atlas !== null) {
                    const texture_data = Services.resources.get_texture(texture_name, atlas);
                    texture_data.texture.magFilter = item.filter;
                }
            }
            Services.resources.write_metadata();
        },
        redo: () => { },
    });
}

// ============================================================================
// UV History Saver
// ============================================================================

/**
 * Сохраняет текущие UV координаты для истории
 */
export function save_uv(ids: number[], ctx: HistorySaverContext) {
    const uvs: UVEventData[] = [];

    for (const id of ids) {
        const mesh = ctx.selected_list.find((item) => item.mesh_data.id === id);
        if (mesh === undefined) {
            Services.logger.error('[saveUV] Mesh not found for id:', id);
            continue;
        }

        if (mesh.type === IObjectTypes.GO_SPRITE_COMPONENT) {
            const sprite = mesh as GoSprite;
            uvs.push({
                id_mesh: id,
                uv: sprite.get_uv()
            });
        }
    }

    Services.history.push({
        type: 'MESH_UV',
        description: 'Изменение UV координат',
        data: { items: uvs, owner: HistoryOwner.INSPECTOR_CONTROL },
        undo: (d) => {
            for (const item of d.items as UVEventData[]) {
                const m = Services.scene.get_by_id(item.id_mesh) as GoSprite | undefined;
                if (m !== undefined && m.type === IObjectTypes.GO_SPRITE_COMPONENT) {
                    m.set_uv(item.uv);
                }
            }
        },
        redo: () => { },
    });
}

// ============================================================================
// Uniform History Saver
// ============================================================================

/**
 * Сохраняет текущее значение uniform для истории (Phase 21 - per-slot uniforms)
 */
export function save_uniform(
    ids: number[],
    field: PropertyData<PropertyType>,
    ctx: HistorySaverContext,
    on_rebuild_inspector: () => void
) {
    // Парсим action_data для получения uniform_name и slot_index
    const action_data = field.action_data;
    let uniform_name: string;
    let slot_index: number | undefined;

    if (typeof action_data === 'object' && action_data !== null) {
        const data = action_data as { uniform_name?: string; slot_index?: number };
        uniform_name = data.uniform_name ?? '';
        slot_index = data.slot_index;
    } else if (typeof action_data === 'string') {
        uniform_name = action_data;
    } else {
        Services.logger.warn('[saveUniform] Invalid action_data:', action_data);
        return;
    }

    if (uniform_name === '') {
        Services.logger.warn('[saveUniform] Empty uniform_name');
        return;
    }

    const uniform_data: UniformEventData[] = [];

    for (const id of ids) {
        const mesh = ctx.selected_list.find((item) => item.mesh_data.id === id);
        if (mesh === undefined) {
            Services.logger.error('[saveUniform] Mesh not found for id:', id);
            continue;
        }

        // Получаем текущее значение uniform
        let current_value: unknown;

        if (mesh instanceof MultipleMaterialMesh && slot_index !== undefined) {
            // MultipleMaterialMesh с указанным слотом
            const materials = mesh.get_materials();
            if (slot_index >= 0 && slot_index < materials.length) {
                const material = materials[slot_index];
                const uniforms = material.uniforms as Record<string, { value: unknown }>;
                current_value = uniforms[uniform_name]?.value;
            }
        } else if ('material' in mesh && !(mesh instanceof MultipleMaterialMesh)) {
            // Обычный меш с одним материалом (исключаем MultipleMaterialMesh)
            const material = (mesh as unknown as { material?: { uniforms: Record<string, { value: unknown }> } }).material;
            if (material !== undefined) {
                current_value = material.uniforms[uniform_name]?.value;
            }
        }

        // Клонируем значение для сохранения в историю
        const cloned_value = deepClone(current_value);

        uniform_data.push({
            id_mesh: id,
            uniform_name,
            slot_index,
            value: cloned_value
        });
    }

    if (uniform_data.length === 0) return;

    Services.history.push({
        type: 'MESH_UNIFORM',
        description: `Изменение uniform ${uniform_name}${slot_index !== undefined ? ` (слот ${slot_index})` : ''}`,
        data: { items: uniform_data, owner: HistoryOwner.INSPECTOR_CONTROL },
        undo: (d) => {
            for (const item of d.items as UniformEventData[]) {
                const scene_obj = Services.scene.get_by_id(item.id_mesh);
                if (scene_obj === undefined) continue;

                if (scene_obj instanceof MultipleMaterialMesh && item.slot_index !== undefined) {
                    // Восстанавливаем uniform для конкретного слота
                    Services.resources.set_material_uniform_for_multiple_material_mesh(
                        scene_obj as unknown as Parameters<typeof Services.resources.set_material_uniform_for_multiple_material_mesh>[0],
                        item.slot_index,
                        item.uniform_name,
                        item.value
                    );
                } else {
                    // Восстанавливаем uniform для обычного меша
                    Services.resources.set_material_uniform_for_mesh(
                        scene_obj as unknown as IBaseMeshAndThree,
                        item.uniform_name,
                        item.value
                    );
                }
            }
            // Обновляем инспектор для отображения восстановленных значений
            on_rebuild_inspector();
        },
        redo: () => { },
    });
}
