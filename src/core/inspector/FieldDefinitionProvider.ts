/**
 * FieldDefinitionProvider - логика определения и обновления параметров полей инспектора
 *
 * Выносит логику заполнения динамических параметров полей (опции текстур, материалов и т.д.)
 * из InspectorControl.ts в отдельный модуль.
 */

import { Services } from '../ServiceProvider';
import type { IOptionsProviders, ListOptions, TextureOptionData } from '../../editor/inspector/options/types';
import type { InspectorFieldDefinition, IInspectable } from './IInspectable';
import { Property } from './IInspectable';

/**
 * Callback для получения значения свойства объекта
 */
export type GetPropertyValueFn = (property: Property) => unknown;

/**
 * Callback для получения списка анимаций (специфично для AnimatedMesh)
 */
export type GetAnimationListFn = () => string[];

/**
 * Опции для получения определений полей
 */
export interface GetFieldDefinitionsOptions {
    /** Callback для получения списка анимаций */
    get_animation_list?: GetAnimationListFn;
}

/**
 * Получить определения полей с заполненными динамическими параметрами
 *
 * Обходит поля из IInspectable и заполняет params для полей с динамическими опциями:
 * - TEXTURE: фильтрует по выбранному атласу
 * - ATLAS: список доступных атласов
 * - MATERIAL: список доступных материалов
 * - FONT: список доступных шрифтов
 * - SOUND: список доступных звуков
 * - SOUND_FUNCTION: тип функции затухания звука
 * - ZONE_TYPE: тип зоны звука
 * - MESH_NAME: список доступных 3D моделей
 * - CURRENT_ANIMATION: список анимаций из объекта
 * - VERTEX_PROGRAM: список вершинных шейдеров
 * - FRAGMENT_PROGRAM: список фрагментных шейдеров
 *
 * @param obj - объект реализующий IInspectable
 * @param get_value - функция для получения текущего значения свойства
 * @param options_providers - провайдер опций для списков
 * @param options - дополнительные опции (например get_animation_list)
 * @returns массив определений полей с заполненными params
 */
export function get_field_definitions(
    obj: IInspectable,
    get_value: GetPropertyValueFn,
    options_providers: IOptionsProviders,
    options?: GetFieldDefinitionsOptions
): InspectorFieldDefinition[] {
    const defs = obj.get_inspector_fields();

    for (const def of defs) {
        const params = get_dynamic_field_params(def.property, get_value, options_providers, options);
        if (params !== undefined) {
            def.params = params;
        }
    }

    return defs;
}

/**
 * Получить динамические параметры для конкретного поля
 *
 * @param property - ключ свойства
 * @param get_value - функция для получения текущего значения
 * @param options_providers - провайдер опций
 * @param options - дополнительные опции
 * @returns параметры поля или undefined если поле не динамическое
 */
function get_dynamic_field_params(
    property: Property,
    get_value: GetPropertyValueFn,
    options_providers: IOptionsProviders,
    options?: GetFieldDefinitionsOptions
): ListOptions | TextureOptionData[] | undefined {
    switch (property) {
        // Графика
        case Property.TEXTURE: {
            const atlas = get_value(Property.ATLAS) as string;
            return get_texture_options_for_atlas(atlas, options_providers);
        }

        case Property.ATLAS:
            return options_providers.get_atlas_options();

        case Property.MATERIAL:
            return options_providers.get_material_options();

        case Property.VERTEX_PROGRAM:
            return options_providers.get_vertex_program_options();

        case Property.FRAGMENT_PROGRAM:
            return options_providers.get_fragment_program_options();

        // Текст
        case Property.FONT:
            return options_providers.get_font_options();

        // Аудио
        case Property.SOUND:
            return options_providers.get_sound_options();

        case Property.SOUND_FUNCTION:
            return options_providers.get_sound_function_options();

        case Property.ZONE_TYPE:
            return options_providers.get_zone_type_options();

        // 3D модели
        case Property.MESH_NAME:
            return options_providers.get_mesh_options();

        case Property.CURRENT_ANIMATION: {
            if (options?.get_animation_list !== undefined) {
                const anim_list = options.get_animation_list();
                return options_providers.get_animation_options(anim_list);
            }
            return undefined;
        }

        default:
            return undefined;
    }
}

/**
 * Получить опции текстур отфильтрованные по атласу
 *
 * @param atlas - имя атласа для фильтрации (пустая строка = все текстуры без атласа)
 * @param options_providers - провайдер опций
 * @returns массив данных текстур для thumbnail-list
 */
function get_texture_options_for_atlas(
    atlas: string,
    options_providers: IOptionsProviders
): TextureOptionData[] {
    const all_textures = Services.resources.get_all_textures();

    // Если атлас не выбран - возвращаем все текстуры
    if (atlas === '') {
        return all_textures.map((info) => options_providers.cast_texture_info(info));
    }

    // Фильтруем по атласу
    return all_textures
        .filter((info) => info.atlas === atlas)
        .map((info) => options_providers.cast_texture_info(info));
}

/**
 * Проверить, является ли поле динамическим (требует обновления params)
 *
 * @param property - ключ свойства
 * @returns true если поле динамическое
 */
export function is_dynamic_field(property: Property): boolean {
    return DYNAMIC_FIELDS.includes(property);
}

/**
 * Список всех динамических полей (требующих обновления params из ресурсов)
 */
export const DYNAMIC_FIELDS: Property[] = [
    // Графика
    Property.TEXTURE,
    Property.ATLAS,
    Property.MATERIAL,
    Property.VERTEX_PROGRAM,
    Property.FRAGMENT_PROGRAM,
    // Текст
    Property.FONT,
    // Аудио
    Property.SOUND,
    Property.SOUND_FUNCTION,
    Property.ZONE_TYPE,
    // 3D модели
    Property.MESH_NAME,
    Property.CURRENT_ANIMATION,
];
