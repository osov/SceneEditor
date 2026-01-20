/**
 * TextureAssetHandler - обработчик свойств текстурных ассетов
 *
 * Обрабатывает: asset_atlas, min_filter, mag_filter
 * Эти свойства работают с текстурами выбранными в Asset Browser, а не с mesh объектами.
 */

import { NearestFilter, LinearFilter, type MinificationTextureFilter, type MagnificationTextureFilter } from 'three';
import { Property } from '../../../core/inspector/IInspectable';
import type {
    ITextureAssetHandler,
    TextureReadContext,
    TextureReadResult,
    TextureUpdateContext,
    HandlerParams,
} from './types';
import { get_basename, get_file_name } from '../../../render_engine/helpers/utils';
import { Services } from '@editor/core';
import { IObjectTypes } from '../../../render_engine/types';
import type { IBaseMesh } from '../../../render_engine/types';

/** Режимы фильтрации текстур */
export enum FilterMode {
    NEAREST = 'nearest',
    LINEAR = 'linear',
}

/** Создать TextureAssetHandler */
export function create_texture_asset_handler(_params?: HandlerParams): ITextureAssetHandler {
    const properties: Property[] = [
        Property.ASSET_ATLAS,
        Property.MIN_FILTER,
        Property.MAG_FILTER,
    ];

    function read(property: Property, context: TextureReadContext): TextureReadResult<unknown> {
        switch (property) {
            case Property.ASSET_ATLAS:
                return read_asset_atlas(context);
            case Property.MIN_FILTER:
                return read_min_filter(context);
            case Property.MAG_FILTER:
                return read_mag_filter(context);
            default:
                return { value: undefined, values_by_id: new Map(), has_differences: false };
        }
    }

    function update(property: Property, context: TextureUpdateContext): void {
        switch (property) {
            case Property.ASSET_ATLAS:
                update_asset_atlas(context);
                break;
            case Property.MIN_FILTER:
                update_min_filter(context);
                break;
            case Property.MAG_FILTER:
                update_mag_filter(context);
                break;
        }
    }

    // === Asset Atlas ===

    function read_asset_atlas(context: TextureReadContext): TextureReadResult<string> {
        const { texture_paths } = context;
        const values_by_id = new Map<number, string>();

        let first_value: string | undefined;
        let has_differences = false;

        texture_paths.forEach((path, id) => {
            const texture_name = get_file_name(get_basename(path));
            const atlas = Services.resources.get_atlas_by_texture_name(texture_name);

            if (atlas != null) {
                values_by_id.set(id, atlas);

                if (first_value === undefined) {
                    first_value = atlas;
                } else if (first_value !== atlas) {
                    has_differences = true;
                }
            }
        });

        return {
            value: has_differences ? undefined : first_value,
            values_by_id,
            has_differences,
        };
    }

    function update_asset_atlas(context: TextureUpdateContext): void {
        const { ids, texture_paths, value } = context;
        const new_atlas = value as string;

        ids.forEach((id) => {
            const texture_path = texture_paths[id];
            if (texture_path === undefined) {
                Services.logger.error('[TextureAssetHandler.update_asset_atlas] Texture path not found for id:', id);
                return;
            }

            const texture_name = get_file_name(get_basename(texture_path));
            const old_atlas = Services.resources.get_atlas_by_texture_name(texture_name) || '';
            Services.resources.override_atlas_texture(old_atlas, new_atlas, texture_name);

            // Обновляем текстуры в мешах которые используют эту текстуру
            Services.scene.get_all().forEach((mesh) => {
                const mesh_any = mesh as { type?: IObjectTypes };
                const is_supported_type = mesh_any.type === IObjectTypes.GO_SPRITE_COMPONENT || mesh_any.type === IObjectTypes.GUI_BOX;
                if (!is_supported_type) return;

                const mesh_typed = mesh as unknown as IBaseMesh;
                const mesh_texture = mesh_typed.get_texture();
                const is_old_atlas = mesh_texture.includes(old_atlas);
                const is_texture = mesh_texture.includes(texture_name);

                if (is_old_atlas && is_texture) {
                    mesh_typed.set_texture(texture_name, new_atlas);
                }
            });
        });

        Services.resources.write_metadata();
    }

    // === Min Filter ===

    function read_min_filter(context: TextureReadContext): TextureReadResult<FilterMode> {
        const { texture_paths } = context;
        const values_by_id = new Map<number, FilterMode>();

        let first_value: FilterMode | undefined;
        let has_differences = false;

        texture_paths.forEach((path, id) => {
            const texture_name = get_file_name(get_basename(path));
            const atlas = Services.resources.get_atlas_by_texture_name(texture_name);

            if (atlas != null) {
                const texture_data = Services.resources.get_texture(texture_name, atlas);
                const filter_mode = convert_threejs_filter_to_filter_mode(texture_data.texture.minFilter);
                values_by_id.set(id, filter_mode);

                if (first_value === undefined) {
                    first_value = filter_mode;
                } else if (first_value !== filter_mode) {
                    has_differences = true;
                }
            }
        });

        return {
            value: has_differences ? undefined : first_value,
            values_by_id,
            has_differences,
        };
    }

    function update_min_filter(context: TextureUpdateContext): void {
        const { ids, texture_paths, value } = context;
        const filter_mode = value as FilterMode;
        const three_filter = convert_filter_mode_to_threejs(filter_mode) as MinificationTextureFilter;

        ids.forEach((id) => {
            const texture_path = texture_paths[id];
            if (texture_path === undefined) {
                Services.logger.error('[TextureAssetHandler.update_min_filter] Texture path not found for id:', id);
                return;
            }

            const texture_name = get_file_name(get_basename(texture_path));
            const atlas = Services.resources.get_atlas_by_texture_name(texture_name);

            if (atlas === null) {
                Services.logger.error('[TextureAssetHandler.update_min_filter] Atlas not found for texture:', texture_name);
                return;
            }

            const texture_data = Services.resources.get_texture(texture_name, atlas);
            texture_data.texture.minFilter = three_filter;
            texture_data.texture.needsUpdate = true;
        });

        Services.resources.write_metadata();
    }

    // === Mag Filter ===

    function read_mag_filter(context: TextureReadContext): TextureReadResult<FilterMode> {
        const { texture_paths } = context;
        const values_by_id = new Map<number, FilterMode>();

        let first_value: FilterMode | undefined;
        let has_differences = false;

        texture_paths.forEach((path, id) => {
            const texture_name = get_file_name(get_basename(path));
            const atlas = Services.resources.get_atlas_by_texture_name(texture_name);

            if (atlas != null) {
                const texture_data = Services.resources.get_texture(texture_name, atlas);
                const filter_mode = convert_threejs_filter_to_filter_mode(texture_data.texture.magFilter);
                values_by_id.set(id, filter_mode);

                if (first_value === undefined) {
                    first_value = filter_mode;
                } else if (first_value !== filter_mode) {
                    has_differences = true;
                }
            }
        });

        return {
            value: has_differences ? undefined : first_value,
            values_by_id,
            has_differences,
        };
    }

    function update_mag_filter(context: TextureUpdateContext): void {
        const { ids, texture_paths, value } = context;
        const filter_mode = value as FilterMode;
        const three_filter = convert_filter_mode_to_threejs(filter_mode) as MagnificationTextureFilter;

        ids.forEach((id) => {
            const texture_path = texture_paths[id];
            if (texture_path === undefined) {
                Services.logger.error('[TextureAssetHandler.update_mag_filter] Texture path not found for id:', id);
                return;
            }

            const texture_name = get_file_name(get_basename(texture_path));
            const atlas = Services.resources.get_atlas_by_texture_name(texture_name);

            if (atlas === null) {
                Services.logger.error('[TextureAssetHandler.update_mag_filter] Atlas not found for texture:', texture_name);
                return;
            }

            const texture_data = Services.resources.get_texture(texture_name, atlas);
            texture_data.texture.magFilter = three_filter;
            texture_data.texture.needsUpdate = true;
        });

        Services.resources.write_metadata();
    }

    // === Filter Mode Converters ===

    function convert_filter_mode_to_threejs(filter_mode: FilterMode): number {
        switch (filter_mode) {
            case FilterMode.NEAREST:
                return NearestFilter;
            case FilterMode.LINEAR:
                return LinearFilter;
        }
    }

    function convert_threejs_filter_to_filter_mode(filter: number): FilterMode {
        switch (filter) {
            case NearestFilter:
                return FilterMode.NEAREST;
            case LinearFilter:
                return FilterMode.LINEAR;
            default:
                return FilterMode.LINEAR;
        }
    }

    return {
        properties,
        read,
        update,
    };
}
