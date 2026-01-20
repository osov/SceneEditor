/**
 * MaterialAssetHandler - обработчик свойств материальных ассетов
 *
 * Обрабатывает: vertex_program, fragment_program, transparent
 * Эти свойства работают с материалами выбранными в Asset Browser, а не с mesh объектами.
 */

import { Property } from '../../../core/inspector/IInspectable';
import type {
    IMaterialAssetHandler,
    MaterialAssetReadContext,
    MaterialAssetReadResult,
    MaterialAssetUpdateContext,
    HandlerParams,
} from './types';
import { get_basename, get_file_name } from '../../../render_engine/helpers/utils';
import { Services } from '@editor/core';

/** Создать MaterialAssetHandler */
export function create_material_asset_handler(_params?: HandlerParams): IMaterialAssetHandler {
    const properties: Property[] = [
        Property.VERTEX_PROGRAM,
        Property.FRAGMENT_PROGRAM,
        Property.TRANSPARENT,
    ];

    function read(property: Property, context: MaterialAssetReadContext): MaterialAssetReadResult<unknown> {
        switch (property) {
            case Property.VERTEX_PROGRAM:
                return read_vertex_program(context);
            case Property.FRAGMENT_PROGRAM:
                return read_fragment_program(context);
            case Property.TRANSPARENT:
                return read_transparent(context);
            default:
                return { value: undefined, values_by_id: new Map(), has_differences: false };
        }
    }

    function update(property: Property, context: MaterialAssetUpdateContext): void {
        switch (property) {
            case Property.VERTEX_PROGRAM:
                update_vertex_program(context);
                break;
            case Property.FRAGMENT_PROGRAM:
                update_fragment_program(context);
                break;
            case Property.TRANSPARENT:
                update_transparent(context);
                break;
        }
    }

    // === Vertex Program ===

    function read_vertex_program(context: MaterialAssetReadContext): MaterialAssetReadResult<string> {
        const { material_paths } = context;
        const values_by_id = new Map<number, string>();

        let first_value: string | undefined;
        let has_differences = false;

        material_paths.forEach((path, id) => {
            const material_name = get_file_name(get_basename(path));
            const material = Services.resources.get_material_info(material_name);

            if (material !== undefined) {
                const shader = material.vertexShader;
                values_by_id.set(id, shader);

                if (first_value === undefined) {
                    first_value = shader;
                } else if (first_value !== shader) {
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

    function update_vertex_program(context: MaterialAssetUpdateContext): void {
        const { ids, material_paths, value } = context;
        const program = value as string;

        ids.forEach((id) => {
            const material_path = material_paths[id];
            if (material_path === undefined) {
                Services.logger.error('[MaterialAssetHandler.update_vertex_program] Material path not found for id:', id);
                return;
            }

            const material_name = get_file_name(get_basename(material_path));
            Services.resources.set_material_shader_for_original(material_name, 'vertex', program);

            Services.event_bus.emit('materials:changed', {
                material_name: material_name,
                property: 'vertexShader',
                value: program,
            });
        });
    }

    // === Fragment Program ===

    function read_fragment_program(context: MaterialAssetReadContext): MaterialAssetReadResult<string> {
        const { material_paths } = context;
        const values_by_id = new Map<number, string>();

        let first_value: string | undefined;
        let has_differences = false;

        material_paths.forEach((path, id) => {
            const material_name = get_file_name(get_basename(path));
            const material = Services.resources.get_material_info(material_name);

            if (material !== undefined) {
                const shader = material.fragmentShader;
                values_by_id.set(id, shader);

                if (first_value === undefined) {
                    first_value = shader;
                } else if (first_value !== shader) {
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

    function update_fragment_program(context: MaterialAssetUpdateContext): void {
        const { ids, material_paths, value } = context;
        const program = value as string;

        ids.forEach((id) => {
            const material_path = material_paths[id];
            if (material_path === undefined) {
                Services.logger.error('[MaterialAssetHandler.update_fragment_program] Material path not found for id:', id);
                return;
            }

            const material_name = get_file_name(get_basename(material_path));
            Services.resources.set_material_shader_for_original(material_name, 'fragment', program);

            Services.event_bus.emit('materials:changed', {
                material_name: material_name,
                property: 'fragmentShader',
                value: program,
            });
        });
    }

    // === Transparent ===

    function read_transparent(context: MaterialAssetReadContext): MaterialAssetReadResult<boolean> {
        const { material_paths } = context;
        const values_by_id = new Map<number, boolean>();

        let first_value: boolean | undefined;
        let has_differences = false;

        material_paths.forEach((path, id) => {
            const material_name = get_file_name(get_basename(path));
            const material = Services.resources.get_material_info(material_name);

            if (material !== undefined) {
                // Получаем transparent из оригинального ShaderMaterial экземпляра
                const origin_material = material.instances[material.origin];
                const transparent = origin_material !== undefined ? origin_material.transparent : false;
                values_by_id.set(id, transparent);

                if (first_value === undefined) {
                    first_value = transparent;
                } else if (first_value !== transparent) {
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

    function update_transparent(context: MaterialAssetUpdateContext): void {
        const { ids, material_paths, value } = context;
        const transparent = value as boolean;

        ids.forEach((id) => {
            const material_path = material_paths[id];
            if (material_path === undefined) {
                Services.logger.error('[MaterialAssetHandler.update_transparent] Material path not found for id:', id);
                return;
            }

            const material_name = get_file_name(get_basename(material_path));
            // TODO: реализовать сохранение transparent в материале
            Services.logger.warn(`[MaterialAssetHandler.update_transparent] Setting transparent=${transparent} for ${material_name} not implemented yet`);

            Services.event_bus.emit('materials:changed', {
                material_name: material_name,
                property: 'transparent',
                value: transparent,
            });
        });
    }

    return {
        properties,
        read,
        update,
    };
}
