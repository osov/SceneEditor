/**
 * Хелперы для сериализации/десериализации объектов сцены
 * Устраняет дублирование кода в slice9.ts, multiple_material_mesh.ts
 */

import { ShaderMaterial, Texture } from 'three';
import { MaterialUniformType } from '../../resource_manager';
import { hex2rgba, rgb2hex } from '@editor/defold/utils';
import { get_file_name } from '../../helpers/utils';
import { Services } from '@editor/core';

/**
 * Минимальный интерфейс MaterialInfo для сериализации
 * Совместим с MaterialInfo из core/render/types и resource_manager
 */
export interface SerializationMaterialInfo {
    uniforms: Record<string, unknown>;
    material_hash_to_changed_uniforms: Record<string, string[]>;
}

/** Функция получения данных текстуры (atlas, texture_name) по ключу uniform */
export type TextureDataGetter = (uniform_key: string) => [string, string];

/** Функция установки текстуры */
export type TextureSetter = (name: string, atlas: string, uniform_key: string) => void;

/** Функция установки uniform */
export type UniformSetter = (key: string, value: unknown) => void;

/**
 * Сериализует изменённые uniforms материала
 *
 * @param material - Шейдерный материал
 * @param material_info - Информация о материале из ResourceManager
 * @param hash - Хеш материала для меша
 * @param get_texture_data - Функция получения данных текстуры для uniform ключа
 * @returns Объект с изменёнными uniforms или undefined если нет изменений
 */
export function serialize_material_uniforms(
    material: ShaderMaterial,
    material_info: SerializationMaterialInfo,
    hash: string,
    get_texture_data: TextureDataGetter
): { [key: string]: unknown } | undefined {
    const changed_uniforms = material_info.material_hash_to_changed_uniforms[hash];
    if (changed_uniforms === undefined || changed_uniforms.length === 0) {
        return undefined;
    }

    const modified_uniforms: { [key: string]: unknown } = {};

    for (const uniform_name of changed_uniforms) {
        const uniform = material.uniforms[uniform_name];
        if (uniform === undefined) continue;

        if (uniform.value instanceof Texture) {
            // Для текстур сохраняем как "atlas/texture_name"
            const [atlas, texture_name] = get_texture_data(uniform_name);
            // Если нет данных текстуры, берём из userData.path
            if (texture_name !== '') {
                modified_uniforms[uniform_name] = `${atlas}/${texture_name}`;
            } else {
                const path = uniform.value.userData.path as string | undefined;
                if (path !== undefined && path !== '') {
                    const name = get_file_name(path);
                    const found_atlas = Services.resources.get_atlas_by_texture_name(name) || '';
                    modified_uniforms[uniform_name] = `${found_atlas}/${name}`;
                }
            }
        } else {
            // Для остальных типов
            const uniform_info = material_info.uniforms[uniform_name] as { type?: string } | undefined;
            if (uniform_info?.type === MaterialUniformType.COLOR) {
                modified_uniforms[uniform_name] = rgb2hex(uniform.value);
            } else {
                modified_uniforms[uniform_name] = uniform.value;
            }
        }
    }

    return Object.keys(modified_uniforms).length > 0 ? modified_uniforms : undefined;
}

/**
 * Десериализует uniforms материала
 *
 * @param uniforms_data - Объект с сериализованными uniforms
 * @param material_name - Имя материала
 * @param set_texture - Функция установки текстуры
 * @param set_uniform - Функция установки uniform
 */
export function deserialize_material_uniforms(
    uniforms_data: { [key: string]: unknown },
    material_name: string,
    set_texture: TextureSetter,
    set_uniform: UniformSetter
): void {
    const material_info = Services.resources.get_material_info(material_name);
    if (material_info === undefined) return;

    for (const [key, value] of Object.entries(uniforms_data)) {
        const uniform_info = material_info.uniforms[key] as { type?: string } | undefined;
        if (uniform_info === undefined) continue;

        if (uniform_info.type === MaterialUniformType.SAMPLER2D && typeof value === 'string') {
            // Текстура в формате "atlas/texture_name"
            const parts = value.split('/');
            const atlas = parts[0];
            const texture_name = parts[1] || '';
            set_texture(texture_name, atlas, key);
        } else if (uniform_info.type === MaterialUniformType.COLOR && typeof value === 'string') {
            set_uniform(key, hex2rgba(value));
        } else {
            set_uniform(key, value);
        }
    }
}

/**
 * Сериализует blending если отличается от NormalBlending
 *
 * @param blending - Текущий режим blending
 * @param normal_blending - Значение NormalBlending (по умолчанию 1)
 * @returns blending или undefined если равен normal
 */
export function serialize_blending_if_changed(
    blending: number,
    normal_blending = 1
): number | undefined {
    return blending !== normal_blending ? blending : undefined;
}

/**
 * Сериализует layers.mask если отличается от дефолтного
 *
 * @param mask - Текущая маска слоёв
 * @param default_mask - Дефолтная маска (по умолчанию -2147483647 для slice9)
 * @returns mask или undefined если равен дефолтному
 */
export function serialize_layers_if_changed(
    mask: number,
    default_mask = -2147483647
): number | undefined {
    return mask !== default_mask ? mask : undefined;
}
