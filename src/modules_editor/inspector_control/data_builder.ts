/**
 * Построение данных инспектора из mesh объектов
 */

import { Vector3, MathUtils } from 'three';
const { radToDeg } = MathUtils;
import { Services } from '@editor/core';
import type { IBaseMeshAndThree } from '../../render_engine/types';
import type { TextMesh } from '../../render_engine/objects/text';
import type { Slice9Mesh } from '../../render_engine/objects/slice9';
import type { AudioMesh } from '../../render_engine/objects/audio_mesh';
import type { MultipleMaterialMesh } from '../../render_engine/objects/multiple_material_mesh';
import type { AnimatedMesh } from '../../render_engine/objects/animated_mesh';
import { FlipMode, type GoSprite } from '../../render_engine/objects/sub_types';
import {
    Property,
    is_inspectable,
    get_field_definitions,
    type InspectorFieldDefinition,
} from '../../core/inspector';
import type { IOptionsProviders } from '../../editor/inspector/options';
import type { ISelectionOptionsUpdater } from '../inspector_module';
import {
    pivot_to_screen_preset,
    anchor_to_screen_preset,
    convert_threejs_blending_to_blend_mode,
} from '../inspector_module';
import {
    PropertyType,
    type PropertyData,
    type PropertyValues,
    type PropertyParams,
    type ObjectData,
    type ObjectInfo,
    type PropertyItem,
} from './types';

// ============================================================================
// Property Value Getters
// ============================================================================

/**
 * Получить значение свойства из объекта
 * Конвертирует внутренние данные объекта в формат для инспектора
 */
export function get_property_value(obj: IBaseMeshAndThree, property: Property): unknown {
    switch (property) {
        case Property.TYPE:
            return obj.type;
        case Property.NAME:
            return obj.name;
        case Property.ACTIVE:
            return obj.get_active();
        case Property.VISIBLE:
            return obj.get_visible();
        case Property.POSITION:
            return obj.get_position();
        case Property.ROTATION: {
            const raw = obj.rotation;
            return new Vector3(radToDeg(raw.x), radToDeg(raw.y), radToDeg(raw.z));
        }
        case Property.SCALE:
            return obj.get_scale();
        case Property.SIZE:
            return obj.get_size();
        case Property.PIVOT:
            return pivot_to_screen_preset(obj.get_pivot());
        case Property.ANCHOR:
            return obj.get_anchor();
        case Property.ANCHOR_PRESET:
            return anchor_to_screen_preset(obj.get_anchor());
        case Property.COLOR:
            return obj.get_color();
        case Property.ALPHA:
            return (obj as Slice9Mesh).get_alpha();
        case Property.ATLAS: {
            const texture_info = (obj as Slice9Mesh).get_texture();
            return texture_info !== undefined ? texture_info[1] : ''; // atlas
        }
        case Property.TEXTURE: {
            // MultipleMaterialMesh и Slice9Mesh имеют разные форматы get_texture
            if ('textures' in obj) {
                // MultipleMaterialMesh - возвращает [name, atlas, uniform_key]
                const texture_info = (obj as unknown as MultipleMaterialMesh).get_texture(0);
                return texture_info !== undefined ? texture_info[0] : '';
            }
            // Slice9Mesh - возвращает [name, atlas]
            const texture_info = (obj as Slice9Mesh).get_texture();
            return texture_info !== undefined ? texture_info[0] : ''; // texture name
        }
        case Property.MATERIAL: {
            // MultipleMaterialMesh имеет массив материалов
            if ('get_materials' in obj && typeof (obj as unknown as MultipleMaterialMesh).get_materials === 'function') {
                const materials = (obj as unknown as MultipleMaterialMesh).get_materials();
                return materials.length > 0 ? (materials[0].name || '') : '';
            }
            return (obj as Slice9Mesh).material.name || '';
        }
        case Property.BLEND_MODE:
            return convert_threejs_blending_to_blend_mode((obj as Slice9Mesh).material.blending);
        case Property.SLICE9:
            return (obj as Slice9Mesh).get_slice();
        case Property.TEXT:
            return (obj as unknown as TextMesh).text;
        case Property.FONT:
            return (obj as unknown as TextMesh).get_font_name();
        case Property.FONT_SIZE: {
            const delta = new Vector3(1 * obj.scale.x, 1 * obj.scale.y);
            const max_delta = Math.max(delta.x, delta.y);
            return (obj as unknown as TextMesh).fontSize * max_delta;
        }
        case Property.TEXT_ALIGN:
            return (obj as unknown as TextMesh).textAlign;
        case Property.LINE_HEIGHT: {
            const line_height = (obj as unknown as TextMesh).lineHeight;
            return line_height === 'normal' ? 1 : line_height;
        }
        case Property.FLIP_VERTICAL:
            return (obj as GoSprite).get_flip() === FlipMode.VERTICAL;
        case Property.FLIP_HORIZONTAL:
            return (obj as GoSprite).get_flip() === FlipMode.HORIZONTAL;
        case Property.FLIP_DIAGONAL:
            return (obj as GoSprite).get_flip() === FlipMode.DIAGONAL;
        // Аудио свойства
        case Property.SOUND:
            return (obj as unknown as AudioMesh).get_sound();
        case Property.VOLUME:
            return (obj as unknown as AudioMesh).get_volume();
        case Property.LOOP:
            return (obj as unknown as AudioMesh).get_loop();
        case Property.PAN:
            return (obj as unknown as AudioMesh).get_pan();
        case Property.SPEED:
            return (obj as unknown as AudioMesh).get_speed();
        case Property.SOUND_RADIUS:
            return (obj as unknown as AudioMesh).get_sound_radius();
        case Property.MAX_VOLUME_RADIUS:
            return (obj as unknown as AudioMesh).get_max_volume_radius();
        case Property.SOUND_FUNCTION:
            return (obj as unknown as AudioMesh).get_sound_function();
        case Property.ZONE_TYPE:
            return (obj as unknown as AudioMesh).get_zone_type();
        case Property.PAN_NORMALIZATION:
            return (obj as unknown as AudioMesh).get_pan_normalization_distance();
        case Property.RECTANGLE_WIDTH:
            return (obj as unknown as AudioMesh).get_rectangle_width();
        case Property.RECTANGLE_HEIGHT:
            return (obj as unknown as AudioMesh).get_rectangle_height();
        case Property.RECTANGLE_MAX_WIDTH:
            return (obj as unknown as AudioMesh).get_rectangle_max_volume_width();
        case Property.RECTANGLE_MAX_HEIGHT:
            return (obj as unknown as AudioMesh).get_rectangle_max_volume_height();
        case Property.FADE_IN_TIME:
            return (obj as unknown as AudioMesh).get_fade_in_time();
        case Property.FADE_OUT_TIME:
            return (obj as unknown as AudioMesh).get_fade_out_time();
        case Property.AUDIO_PLAY_PAUSE:
            // Кнопка воспроизведения/паузы - возвращаем callback
            return () => {
                const audio = obj as AudioMesh;
                if (audio.is_playing()) {
                    audio.pause();
                } else if (audio.is_paused()) {
                    audio.resume();
                } else {
                    audio.play();
                }
            };
        case Property.AUDIO_STOP:
            // Кнопка стоп - возвращаем callback
            return () => {
                (obj as unknown as AudioMesh).stop();
            };
        // 3D модели
        case Property.MESH_NAME:
            return (obj as unknown as MultipleMaterialMesh).get_mesh_name();
        case Property.MODEL_SCALE:
            return (obj as unknown as MultipleMaterialMesh).get_scale().x;
        case Property.MODEL_MATERIALS:
            return (obj as unknown as MultipleMaterialMesh).get_materials().map(m => m.name);
        case Property.ANIMATIONS:
            return Object.keys((obj as unknown as AnimatedMesh).get_animation_list());
        case Property.CURRENT_ANIMATION:
            return (obj as unknown as AnimatedMesh).get_animation();
        default:
            Services.logger.warn(`[get_property_value] Неизвестное свойство: ${property}`);
            return undefined;
    }
}

/**
 * Преобразовать InspectorFieldDefinition в PropertyData для инспектора
 */
export function field_definition_to_property_data(
    def: InspectorFieldDefinition,
    obj: IBaseMeshAndThree
): PropertyData<PropertyType> {
    const value = get_property_value(obj, def.property);
    return {
        name: def.property,
        data: value as PropertyValues[PropertyType],
        // Приведение типа нужно из-за дублирования PropertyType в core/inspector/types.ts
        type: def.type as unknown as PropertyType,
        params: def.params as PropertyParams[PropertyType]
    };
}

/**
 * Построить данные инспектора используя IInspectable
 */
export function build_inspector_data_from_inspectable(
    obj: IBaseMeshAndThree,
    options_providers: IOptionsProviders,
    selection_options_updater: ISelectionOptionsUpdater<IBaseMeshAndThree>
): PropertyData<PropertyType>[] {
    if (!is_inspectable(obj)) {
        Services.logger.warn(`[build_inspector_data] Объект ${obj.type} не реализует IInspectable`);
        return [];
    }

    // Получаем определения полей с заполненными динамическими параметрами
    const field_defs = get_field_definitions(
        obj,
        (property) => get_property_value(obj, property),
        options_providers,
        {
            // Callback для анимаций - специфично для AnimatedMesh
            get_animation_list: 'get_animation_list' in obj
                ? () => Object.keys((obj as unknown as AnimatedMesh).get_animation_list())
                : undefined
        }
    );

    // Обновляем опции UI (TweakPane) для синхронизации с конфигом (Phase 23)
    selection_options_updater.update_options_from_field_defs(field_defs, obj, get_property_value);

    // Преобразуем определения полей в данные
    const fields: PropertyData<PropertyType>[] = [];
    for (const def of field_defs) {
        const property_data = field_definition_to_property_data(def, obj);
        fields.push(property_data);
    }

    return fields;
}

// ============================================================================
// Unique Fields Processing
// ============================================================================

/** Типы векторных свойств */
const VECTOR_TYPES = [PropertyType.VECTOR_2, PropertyType.POINT_2D, PropertyType.VECTOR_3, PropertyType.VECTOR_4];

/** Типы свойств с пустым значением по умолчанию при различии */
const EMPTY_DEFAULT_TYPES = [PropertyType.LIST_TEXT, PropertyType.LIST_TEXTURES, PropertyType.LOG_DATA];

/**
 * Обрабатывает ось вектора: если значения различаются - отключает ось и усредняет значение
 */
export function process_vector_axis(
    axis: 'x' | 'y' | 'z' | 'w',
    field_data: { x: number; y: number; z?: number; w?: number },
    unique_field: { field: PropertyData<PropertyType>; property: PropertyItem<PropertyType> }
) {
    const unique_data = unique_field.field.data as { x: number; y: number; z?: number; w?: number };
    const field_value = field_data[axis];
    const unique_value = unique_data[axis];

    if (field_value === undefined || unique_value === undefined) return;
    if (field_value === unique_value) return;

    // Отключаем ось в параметрах
    const params = unique_field.property.params as Record<string, { disabled?: boolean }> | undefined;
    if (params !== undefined) {
        if (params[axis] !== undefined) {
            params[axis].disabled = true;
        } else {
            params[axis] = { disabled: true };
        }
    } else {
        unique_field.property.params = { [axis]: { disabled: true } } as PropertyParams[PropertyType];
    }

    // Усредняем значение
    (unique_data as Record<string, number>)[axis] = (unique_value + field_value) / 2;
}

/**
 * Объединяет векторные данные между объектами
 */
export function merge_vector_fields(
    property_type: PropertyType,
    field_data: { x: number; y: number; z?: number; w?: number },
    unique_field: { field: PropertyData<PropertyType>; property: PropertyItem<PropertyType> }
) {
    // Все векторные типы имеют x и y
    process_vector_axis('x', field_data, unique_field);
    process_vector_axis('y', field_data, unique_field);

    // vec3 и vec4 имеют z
    if (property_type === PropertyType.VECTOR_3 || property_type === PropertyType.VECTOR_4) {
        process_vector_axis('z', field_data, unique_field);
    }

    // vec4 имеет w
    if (property_type === PropertyType.VECTOR_4) {
        process_vector_axis('w', field_data, unique_field);
    }
}

/**
 * Пытается добавить поле в список уникальных полей или объединить с существующим
 */
export function try_add_to_unique_field(
    obj_index: number,
    obj: ObjectData,
    field: PropertyData<PropertyType>,
    property: PropertyItem<PropertyType>,
    unique_fields: { ids: number[]; field: PropertyData<PropertyType>; property: PropertyItem<PropertyType> }[]
): boolean {
    const index = unique_fields.findIndex((value) => value.property.name === property.name);

    // Если поле не найдено - добавляем только для первого объекта
    if (index === -1) {
        if (obj_index !== 0) {
            return false;
        }
        unique_fields.push({ ids: [obj.id], field, property });
        return true;
    }

    // Добавляем id объекта к существующему полю
    unique_fields[index].ids.push(obj.id);

    // Обработка векторных типов
    if (VECTOR_TYPES.includes(property.type)) {
        const field_data = field.data as { x: number; y: number; z?: number; w?: number };
        merge_vector_fields(property.type, field_data, unique_fields[index]);
        return true;
    }

    // Обработка невекторных типов с различающимися значениями
    if (field.data !== unique_fields[index].field.data) {
        if (EMPTY_DEFAULT_TYPES.includes(property.type)) {
            // Списки и текстовые поля - пустое значение
            unique_fields[index].field.data = "";
        } else if (property.type === PropertyType.COLOR) {
            // Цвет - черный
            unique_fields[index].field.data = "#000000";
        } else if (property.type === PropertyType.BOOLEAN) {
            // Чекбокс - отключен
            unique_fields[index].field.data = false;
            unique_fields[index].property.params = { disabled: true };
        } else if (property.type === PropertyType.BUTTON) {
            // Кнопки всегда показываем
            return true;
        } else {
            // Остальные - удаляем поле
            unique_fields.splice(index, 1);
            return false;
        }
    }

    return true;
}

/**
 * Фильтрует unique_fields, удаляя поля которых нет в текущем объекте
 */
export function filter_unique_fields(
    info: ObjectInfo[],
    unique_fields: { ids: number[]; field: PropertyData<PropertyType>; property: PropertyItem<PropertyType> }[]
) {
    const buffer: number[] = [];
    unique_fields.forEach((unique_field, index) => {
        const result = info.findIndex((data) => {
            return data.property.name === unique_field.property.name;
        });
        if (result === -1) {
            buffer.push(index);
        }
    });

    for (let i = buffer.length - 1; i >= 0; i--) {
        const index = buffer[i];
        unique_fields.splice(index, 1);
    }
}
