/**
 * MaterialFieldProvider - провайдер полей инспектора для материальных uniforms
 *
 * Выносит логику обработки uniforms кастомных материалов из InspectorControl
 * в отдельный модуль для лучшей организации кода.
 */

import type { Vector2, Vector3, Vector4 } from 'three';
import { MaterialUniformType, type MaterialUniformParams } from '../../render_engine/resource_manager';
import { Property, type InspectorFieldDefinition, type InspectorFieldGroup } from './IInspectable';
import { PropertyType } from './types';
import { get_file_name } from '../../render_engine/helpers/utils';
import { rgbToHex } from '../../modules/utils';
import { Services } from '../index';

/** Информация о uniform для инспектора */
export interface UniformFieldInfo {
    /** Ключ uniform в шейдере */
    key: string;
    /** Тип uniform */
    type: MaterialUniformType;
    /** Текущее значение */
    value: unknown;
    /** Параметры (min, max, step и т.д.) */
    params?: Record<string, unknown>;
    /** Скрыто ли поле */
    hidden: boolean;
}

/** Данные поля uniform для инспектора */
export interface UniformPropertyData {
    /** Имя свойства (Property enum) */
    name: string;
    /** Значение */
    data: unknown;
    /** Заголовок поля (имя uniform) */
    title: string;
    /** Параметры для UI */
    params?: Record<string, unknown>;
}

/**
 * Получить информацию о uniforms материала
 */
function get_material_uniforms(
    material_name: string,
    material_uniforms: Record<string, { value: unknown }>
): UniformFieldInfo[] {
    const material_info = Services.resources.get_material_info(material_name);
    // Проверяем что material_info существует (может быть undefined или null)
    if (material_info === undefined || material_info === null) {
        return [];
    }

    // Проверяем наличие uniforms в конфигурации материала
    if (material_info.uniforms === undefined || material_info.uniforms === null) {
        return [];
    }

    const result: UniformFieldInfo[] = [];

    type UniformEntry = { type: MaterialUniformType; params?: Record<string, unknown>; hide?: boolean };
    const uniforms_config = material_info.uniforms as Record<string, UniformEntry>;

    for (const [key, uniform_def] of Object.entries(uniforms_config)) {
        const uniform_value = material_uniforms[key]?.value;

        result.push({
            key,
            type: uniform_def.type,
            value: uniform_value,
            params: uniform_def.params,
            hidden: uniform_def.hide === true
        });
    }

    return result;
}

/**
 * Преобразовать uniform в данные для инспектора
 */
function uniform_to_property_data(info: UniformFieldInfo): UniformPropertyData | undefined {
    if (info.hidden) {
        return undefined;
    }

    switch (info.type) {
        case MaterialUniformType.SAMPLER2D: {
            const texture_path = (info.value as { path?: string } | null)?.path ?? '';
            const texture_name = get_file_name(texture_path);
            const texture_atlas = Services.resources.get_atlas_by_texture_name(texture_name) || '';
            return {
                name: Property.UNIFORM_SAMPLER2D,
                data: texture_path !== '' ? `${texture_atlas}/${texture_name}` : '',
                title: info.key
            };
        }

        case MaterialUniformType.FLOAT: {
            const params = info.params as { min?: number; max?: number; step?: number } | undefined;
            return {
                name: Property.UNIFORM_FLOAT,
                data: info.value as number,
                title: info.key,
                params: {
                    min: params?.min ?? 0,
                    max: params?.max ?? 1,
                    step: params?.step ?? 0.01
                }
            };
        }

        case MaterialUniformType.RANGE: {
            const params = info.params as MaterialUniformParams[MaterialUniformType.RANGE] | undefined;
            return {
                name: Property.UNIFORM_RANGE,
                data: info.value as number,
                title: info.key,
                params: {
                    min: params?.min ?? 0,
                    max: params?.max ?? 1,
                    step: params?.step ?? 0.01
                }
            };
        }

        case MaterialUniformType.VEC2:
            return {
                name: Property.UNIFORM_VEC2,
                data: info.value as Vector2,
                title: info.key
            };

        case MaterialUniformType.VEC3:
            return {
                name: Property.UNIFORM_VEC3,
                data: info.value as Vector3,
                title: info.key
            };

        case MaterialUniformType.VEC4:
            return {
                name: Property.UNIFORM_VEC4,
                data: info.value as Vector4,
                title: info.key
            };

        case MaterialUniformType.COLOR: {
            const color_vec = info.value as Vector3 | undefined;
            const color_hex = color_vec !== undefined ? rgbToHex(color_vec) : '#ffffff';
            return {
                name: Property.UNIFORM_COLOR,
                data: color_hex,
                title: info.key
            };
        }

        default:
            Services.logger.warn(`[MaterialFieldProvider] Неизвестный тип uniform: ${info.type}`);
            return undefined;
    }
}

/**
 * Получить поля uniforms для объекта с материалом
 *
 * @param material_name - Имя материала
 * @param material_uniforms - Uniforms материала
 * @returns Массив данных полей для инспектора
 */
export function get_material_uniform_fields(
    material_name: string,
    material_uniforms: Record<string, { value: unknown }>
): UniformPropertyData[] {
    const uniforms = get_material_uniforms(material_name, material_uniforms);
    const fields: UniformPropertyData[] = [];

    for (const uniform of uniforms) {
        const property_data = uniform_to_property_data(uniform);
        if (property_data !== undefined) {
            fields.push(property_data);
        }
    }

    return fields;
}

/**
 * Получить InspectorFieldDefinition для uniforms материала
 * (для будущего использования с IInspectable)
 */
export function get_material_inspector_fields(
    material_name: string,
    material_uniforms: Record<string, { value: unknown }>
): InspectorFieldDefinition[] {
    const uniforms = get_material_uniforms(material_name, material_uniforms);
    const fields: InspectorFieldDefinition[] = [];

    for (const uniform of uniforms) {
        if (uniform.hidden) continue;

        const field = uniform_to_inspector_field(uniform);
        if (field !== undefined) {
            fields.push(field);
        }
    }

    return fields;
}

/**
 * Преобразовать uniform в InspectorFieldDefinition
 */
function uniform_to_inspector_field(info: UniformFieldInfo): InspectorFieldDefinition | undefined {
    const group: InspectorFieldGroup = 'uniforms';

    switch (info.type) {
        case MaterialUniformType.SAMPLER2D:
            return {
                group,
                property: Property.UNIFORM_SAMPLER2D,
                type: PropertyType.LIST_TEXTURES,
                title: info.key
            };

        case MaterialUniformType.FLOAT: {
            const params = info.params as { min?: number; max?: number; step?: number } | undefined;
            return {
                group,
                property: Property.UNIFORM_FLOAT,
                type: PropertyType.NUMBER,
                title: info.key,
                params: {
                    min: params?.min ?? 0,
                    max: params?.max ?? 1,
                    step: params?.step ?? 0.01
                }
            };
        }

        case MaterialUniformType.RANGE: {
            const params = info.params as MaterialUniformParams[MaterialUniformType.RANGE] | undefined;
            return {
                group,
                property: Property.UNIFORM_RANGE,
                type: PropertyType.SLIDER,
                title: info.key,
                params: {
                    min: params?.min ?? 0,
                    max: params?.max ?? 1,
                    step: params?.step ?? 0.01
                }
            };
        }

        case MaterialUniformType.VEC2:
            return {
                group,
                property: Property.UNIFORM_VEC2,
                type: PropertyType.VECTOR_2,
                title: info.key
            };

        case MaterialUniformType.VEC3:
            return {
                group,
                property: Property.UNIFORM_VEC3,
                type: PropertyType.VECTOR_3,
                title: info.key
            };

        case MaterialUniformType.VEC4:
            return {
                group,
                property: Property.UNIFORM_VEC4,
                type: PropertyType.VECTOR_4,
                title: info.key
            };

        case MaterialUniformType.COLOR:
            return {
                group,
                property: Property.UNIFORM_COLOR,
                type: PropertyType.COLOR,
                title: info.key
            };

        default:
            return undefined;
    }
}
