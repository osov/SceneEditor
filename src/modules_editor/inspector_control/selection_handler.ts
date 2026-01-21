/**
 * Обработчики выделения текстур и материалов
 */

import { Vector2, Vector3, Vector4, NearestFilter, LinearFilter } from 'three';
import { Services } from '@editor/core';
import { Property } from '../../core/inspector';
import { get_control_manager } from '../ControlManager';
import { get_basename, get_file_name } from '../../render_engine/helpers/utils';
import { MaterialUniformType, type MaterialUniformParams } from '../../render_engine/resource_manager';
import type { TextureOptionData } from '../../editor/inspector/options';
import { rgbToHex } from '../../modules/utils';
import {
    FilterMode,
    type ObjectData,
    type InspectorGroup,
} from './types';

// ============================================================================
// Texture Selection
// ============================================================================

export interface TextureSelectionContext {
    config: InspectorGroup[];
    update_atlas_options: () => void;
}

/**
 * Строит данные инспектора для выбранных текстур
 */
export function build_texture_selection_data(
    textures_paths: string[],
    ctx: TextureSelectionContext
): ObjectData[] {
    ctx.update_atlas_options();

    return textures_paths.map((path, id) => {
        const result: ObjectData = { id, data: [] };

        const texture_name = get_file_name(get_basename(path));
        const atlas = Services.resources.get_atlas_by_texture_name(texture_name);

        if (atlas === null) {
            Services.logger.error(`[set_selected_textures] Atlas for texture ${texture_name} not found`);
            return { id, data: [] };
        }

        result.data.push({ name: Property.ASSET_ATLAS, data: atlas });
        result.data.push({
            name: Property.ATLAS_BUTTON, data: () => {
                get_control_manager().open_atlas_manager();
            }
        });

        const min_filter = convert_threejs_filter_to_filter_mode(Services.resources.get_texture(texture_name, atlas).texture.minFilter);
        const mag_filter = convert_threejs_filter_to_filter_mode(Services.resources.get_texture(texture_name, atlas).texture.magFilter);

        result.data.push({ name: Property.MIN_FILTER, data: min_filter });
        result.data.push({ name: Property.MAG_FILTER, data: mag_filter });

        return result;
    });
}

// ============================================================================
// Material Selection
// ============================================================================

export interface MaterialSelectionContext {
    config: InspectorGroup[];
    update_texture_options: (properties: Property[], method?: () => TextureOptionData[]) => void;
    update_vertex_program_options: () => void;
    update_fragment_program_options: () => void;
    get_uniform_texture_options: () => TextureOptionData[];
}

/**
 * Строит данные инспектора для выбранных материалов
 */
export function build_material_selection_data(
    materials_paths: string[],
    ctx: MaterialSelectionContext
): ObjectData[] {
    // Обновляем конфиг текстур и программ
    ctx.update_texture_options([Property.TEXTURE]);
    // Для UNIFORM_SAMPLER2D используем формат atlas/texture
    ctx.update_texture_options([Property.UNIFORM_SAMPLER2D], ctx.get_uniform_texture_options);
    ctx.update_vertex_program_options();
    ctx.update_fragment_program_options();

    return materials_paths.map((path, id) => {
        const result: ObjectData = { id, data: [] };

        const material_name = get_file_name(get_basename(path));
        const material = Services.resources.get_material_info(material_name);
        if (material === undefined) return result;

        result.data.push({ name: Property.VERTEX_PROGRAM, data: material.vertexShader });
        result.data.push({ name: Property.FRAGMENT_PROGRAM, data: material.fragmentShader });

        // Получаем transparent из оригинального материала
        const origin_material = material.instances[material.origin];
        const transparent_value = origin_material?.transparent ?? false;
        result.data.push({ name: Property.TRANSPARENT, data: transparent_value });

        type UniformEntry = { type: MaterialUniformType; params?: Record<string, unknown>; hide?: boolean };
        Object.entries(material.uniforms as Record<string, UniformEntry>).forEach(([key, value]) => {
            // Пропускаем скрытые uniforms (например, u_texture)
            if (value.hide === true) return;

            switch (value.type) {
                case MaterialUniformType.SAMPLER2D:
                    update_uniform_config(ctx.config, Property.UNIFORM_SAMPLER2D, key);
                    const textureValue = (material.instances[material.origin]?.uniforms as Record<string, { value: unknown }>)?.[key]?.value;
                    const texturePath = (textureValue as { path?: string } | null)?.path ?? '';
                    const textureName = get_file_name(texturePath);
                    const textureAtlas = Services.resources.get_atlas_by_texture_name(textureName) || '';
                    result.data.push({ name: Property.UNIFORM_SAMPLER2D, data: texturePath !== '' ? `${textureAtlas}/${textureName}` : '' });
                    break;
                case MaterialUniformType.FLOAT:
                    update_uniform_config_with_params(ctx.config, Property.UNIFORM_FLOAT, key, material.uniforms[key] as { params?: { min?: number; max?: number; step?: number } }, {
                        min: 0, max: 1, step: 0.01
                    });
                    const float_value = (material.instances[material.origin]?.uniforms as Record<string, { value: unknown }>)?.[key]?.value as unknown;
                    result.data.push({ name: Property.UNIFORM_FLOAT, data: float_value as number });
                    break;
                case MaterialUniformType.RANGE:
                    update_uniform_config_with_params(ctx.config, Property.UNIFORM_RANGE, key, material.uniforms[key] as { params?: MaterialUniformParams[MaterialUniformType.RANGE] }, {
                        min: 0, max: 1, step: 0.01
                    });
                    const range_value = (material.instances[material.origin]?.uniforms as Record<string, { value: unknown }>)?.[key]?.value as unknown;
                    result.data.push({ name: Property.UNIFORM_RANGE, data: range_value as number });
                    break;
                case MaterialUniformType.VEC2:
                    update_uniform_vec_config(ctx.config, Property.UNIFORM_VEC2, key, material.uniforms[key] as { params?: MaterialUniformParams[MaterialUniformType.VEC2] }, ['x', 'y']);
                    const vec2_value = (material.instances[material.origin]?.uniforms as Record<string, { value: unknown }>)?.[key]?.value as unknown;
                    result.data.push({ name: Property.UNIFORM_VEC2, data: vec2_value as Vector2 });
                    break;
                case MaterialUniformType.VEC3:
                    update_uniform_vec_config(ctx.config, Property.UNIFORM_VEC3, key, material.uniforms[key] as { params?: MaterialUniformParams[MaterialUniformType.VEC3] }, ['x', 'y', 'z']);
                    const vec3_value = (material.instances[material.origin]?.uniforms as Record<string, { value: unknown }>)?.[key]?.value as unknown;
                    result.data.push({ name: Property.UNIFORM_VEC3, data: vec3_value as Vector3 });
                    break;
                case MaterialUniformType.VEC4:
                    update_uniform_vec_config(ctx.config, Property.UNIFORM_VEC4, key, material.uniforms[key] as { params?: MaterialUniformParams[MaterialUniformType.VEC4] }, ['x', 'y', 'z', 'w']);
                    const vec4_value = (material.instances[material.origin]?.uniforms as Record<string, { value: unknown }>)?.[key]?.value as unknown;
                    result.data.push({ name: Property.UNIFORM_VEC4, data: vec4_value as Vector4 });
                    break;
                case MaterialUniformType.COLOR:
                    update_uniform_config(ctx.config, Property.UNIFORM_COLOR, key);
                    const colorVec = (material.instances[material.origin]?.uniforms as Record<string, { value: unknown }>)?.[key]?.value as Vector3 | undefined;
                    const colorHex = colorVec !== undefined ? rgbToHex(colorVec) : '#ffffff';
                    result.data.push({ name: Property.UNIFORM_COLOR, data: colorHex });
                    break;
            }
        });

        return result;
    });
}

// ============================================================================
// Helpers
// ============================================================================

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

function update_uniform_config(config: InspectorGroup[], property: Property, title: string) {
    config.forEach((group) => {
        const prop = group.property_list.find((p) => p.name === property);
        if (prop !== undefined) {
            prop.title = title;
        }
    });
}

function update_uniform_config_with_params<T extends { min?: number; max?: number; step?: number }>(
    config: InspectorGroup[],
    property: Property,
    title: string,
    uniformData: { params?: T },
    defaults: T
) {
    config.forEach((group) => {
        const prop = group.property_list.find((p) => p.name === property);
        if (prop === undefined) return;
        prop.title = title;
        const params = uniformData?.params ?? defaults;
        prop.params = {
            min: params.min ?? defaults.min,
            max: params.max ?? defaults.max,
            step: params.step ?? defaults.step
        };
    });
}

function update_uniform_vec_config(
    config: InspectorGroup[],
    property: Property,
    title: string,
    uniformData: { params?: Record<string, { min?: number; max?: number; step?: number }> },
    axes: string[]
) {
    const defaultRange = { min: 0, max: 1, step: 0.01 };
    config.forEach((group) => {
        const prop = group.property_list.find((p) => p.name === property);
        if (prop === undefined) return;
        prop.title = title;
        const defaultParams: Record<string, { min: number; max: number; step: number }> = {};
        axes.forEach(axis => { defaultParams[axis] = defaultRange; });
        const params = uniformData?.params ?? defaultParams;
        const result: Record<string, { min: number; max: number; step: number }> = {};
        axes.forEach(axis => {
            const p = params[axis] ?? defaultRange;
            result[axis] = {
                min: p.min ?? defaultRange.min,
                max: p.max ?? defaultRange.max,
                step: p.step ?? defaultRange.step
            };
        });
        prop.params = result;
    });
}
