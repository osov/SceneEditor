/**
 * SelectionOptionsUpdater - логика обновления опций при изменении выделения
 *
 * Выносит логику update_ui_options_from_field_defs() из InspectorControl.ts
 * для уменьшения связанности и улучшения тестируемости.
 */

import { Services } from '@editor/core';
import { Property } from '@editor/core/inspector';
import type { InspectorFieldDefinition } from '@editor/core/inspector';
import type { IInspectorOptionsUpdater } from './InspectorOptionsUpdater';
import type { IOptionsProviders } from '../../editor/inspector/options/types';

/**
 * Интерфейс объекта с методом получения списка анимаций
 */
interface IWithAnimationList {
    get_animation_list(): Record<string, unknown>;
}

/**
 * Callback для получения значения свойства объекта
 */
export type GetPropertyValueCallback<T> = (obj: T, property: Property) => unknown;

/**
 * Интерфейс для обновления опций при изменении выделения
 */
export interface ISelectionOptionsUpdater<T> {
    /**
     * Обновить UI опции на основе определений полей
     *
     * @param field_defs - определения полей из IInspectable
     * @param obj - выбранный объект
     * @param get_property_value - callback для получения значения свойства
     */
    update_options_from_field_defs(
        field_defs: InspectorFieldDefinition[],
        obj: T,
        get_property_value: GetPropertyValueCallback<T>
    ): void;
}

/**
 * Проверяет, имеет ли объект метод get_animation_list
 */
function has_animation_list(obj: unknown): obj is IWithAnimationList {
    return obj !== null &&
           typeof obj === 'object' &&
           'get_animation_list' in obj &&
           typeof (obj as IWithAnimationList).get_animation_list === 'function';
}

/**
 * Создаёт updater для обновления опций при изменении выделения
 *
 * @param options_updater - обновлятор опций TweakPane
 * @param options_providers - провайдер опций
 * @returns объект с методом update_options_from_field_defs
 */
export function create_selection_options_updater<T>(
    options_updater: IInspectorOptionsUpdater,
    options_providers: IOptionsProviders
): ISelectionOptionsUpdater<T> {

    /**
     * Обновить UI опции на основе определений полей
     */
    function update_options_from_field_defs(
        field_defs: InspectorFieldDefinition[],
        obj: T,
        get_property_value: GetPropertyValueCallback<T>
    ): void {
        // Базовые опции всегда обновляем
        options_updater.update_atlas_options();
        options_updater.update_font_options();

        // Проверяем наличие полей и обновляем соответствующие опции UI
        const has_atlas = field_defs.some(f => f.property === Property.ATLAS);
        if (has_atlas) {
            const atlas = get_property_value(obj, Property.ATLAS) as string;
            options_updater.update_texture_options([Property.TEXTURE], () => {
                return Services.resources.get_all_textures()
                    .filter((info) => info.atlas === atlas)
                    .map((info) => options_providers.cast_texture_info(info));
            });
            options_updater.update_material_options();
        }

        // Аудио
        const has_sound = field_defs.some(f => f.property === Property.SOUND);
        if (has_sound) {
            options_updater.update_sound_options();
            options_updater.update_sound_function_options();
            options_updater.update_zone_type_options();
        }

        // Материалы
        const has_material = field_defs.some(f => f.property === Property.MATERIAL);
        if (has_material) {
            options_updater.update_material_options();
        }

        // Шейдеры (для редактора материалов)
        const has_shaders = field_defs.some(f =>
            f.property === Property.VERTEX_PROGRAM || f.property === Property.FRAGMENT_PROGRAM
        );
        if (has_shaders) {
            options_updater.update_vertex_program_options();
            options_updater.update_fragment_program_options();
        }

        // 3D модели
        const has_mesh = field_defs.some(f => f.property === Property.MESH_NAME);
        if (has_mesh) {
            options_updater.update_mesh_options();
        }

        // Анимации
        const has_animation = field_defs.some(f => f.property === Property.CURRENT_ANIMATION);
        if (has_animation && has_animation_list(obj)) {
            const anim_list = Object.keys(obj.get_animation_list());
            options_updater.update_animation_options(anim_list);
        }
    }

    return {
        update_options_from_field_defs,
    };
}
