/**
 * IInspectable - интерфейс для объектов поддерживающих инспектор
 *
 * Позволяет объектам самим описывать свои поля для отображения в инспекторе.
 * Это убирает хардкод из InspectorControl и делает систему расширяемой.
 */

import type { PropertyType, PropertyParams } from './types';

/** Группы полей инспектора */
export type InspectorFieldGroup =
    | 'base'       // Базовые свойства (тип, имя, активность)
    | 'transform'  // Трансформация (позиция, вращение, масштаб)
    | 'anchor'     // Якорь и пресеты (для GUI)
    | 'graphics'   // Визуал (цвет, текстура, материал, slice9)
    | 'flip'       // Отражение (только для GoSprite)
    | 'text'       // Текстовые свойства (шрифт, размер, выравнивание)
    | 'uniforms'   // Материальные юниформы
    | 'audio';     // Аудио свойства

/** Ключи свойств для инспектора */
export enum Property {
    // Базовые
    ID = 'id',
    TYPE = 'type',
    NAME = 'name',
    VISIBLE = 'visible',
    ACTIVE = 'active',

    // Трансформация
    POSITION = 'position',
    ROTATION = 'rotation',
    SCALE = 'scale',
    SIZE = 'size',
    PIVOT = 'pivot',

    // Якорь
    ANCHOR = 'anchor',
    ANCHOR_PRESET = 'anchor_preset',

    // Графика
    COLOR = 'color',
    ALPHA = 'alpha',
    TEXTURE = 'texture',
    ATLAS = 'atlas',
    ASSET_ATLAS = 'asset_atlas',
    ATLAS_BUTTON = 'atlas_button',
    MATERIAL = 'material',
    SLICE9 = 'slice9',
    BLEND_MODE = 'blend_mode',
    MIN_FILTER = 'min_filter',
    MAG_FILTER = 'mag_filter',
    VERTEX_PROGRAM = 'vertex_program',
    FRAGMENT_PROGRAM = 'fragment_program',
    TRANSPARENT = 'transparent',

    // Flip (GoSprite)
    FLIP_VERTICAL = 'flip_vertical',
    FLIP_HORIZONTAL = 'flip_horizontal',
    FLIP_DIAGONAL = 'flip_diagonal',

    // Текст
    TEXT = 'text',
    FONT = 'font',
    FONT_SIZE = 'font_size',
    TEXT_ALIGN = 'text_align',
    LINE_HEIGHT = 'line_height',

    // Материальные юниформы
    UNIFORM_SAMPLER2D = 'uniform_sampler2d',
    UNIFORM_FLOAT = 'uniform_float',
    UNIFORM_RANGE = 'uniform_range',
    UNIFORM_VEC2 = 'uniform_vec2',
    UNIFORM_VEC3 = 'uniform_vec3',
    UNIFORM_VEC4 = 'uniform_vec4',
    UNIFORM_COLOR = 'uniform_color',

    // Аудио
    SOUND = 'sound',
    VOLUME = 'volume',
    LOOP = 'loop',
    PAN = 'pan',
    SPEED = 'speed',
    SOUND_RADIUS = 'sound_radius',
    MAX_VOLUME_RADIUS = 'max_volume_radius',
    SOUND_FUNCTION = 'sound_function',
    ZONE_TYPE = 'zone_type',
}

/** Определение поля инспектора */
export interface InspectorFieldDefinition {
    /** Группа (секция) в инспекторе */
    group: InspectorFieldGroup;
    /** Ключ свойства */
    property: Property;
    /** Тип UI элемента */
    type: PropertyType;
    /** Заголовок поля (если отличается от property) */
    title?: string;
    /** Параметры типа (min, max, step, options, etc.) */
    params?: PropertyParams[PropertyType];
    /** Только для чтения */
    readonly?: boolean;
}

/** Интерфейс для объектов поддерживающих инспектор */
export interface IInspectable {
    /**
     * Получить определения полей для инспектора
     *
     * Возвращает массив определений полей которые должны отображаться
     * в инспекторе при выделении этого объекта.
     *
     * Наследники должны вызывать super.get_inspector_fields() и добавлять свои поля.
     */
    get_inspector_fields(): InspectorFieldDefinition[];
}

/**
 * Type guard для проверки реализации IInspectable
 */
export function is_inspectable(obj: unknown): obj is IInspectable {
    return obj !== null &&
           typeof obj === 'object' &&
           'get_inspector_fields' in obj &&
           typeof (obj as IInspectable).get_inspector_fields === 'function';
}

/** Группировать поля по секциям */
export function group_fields_by_section(
    fields: InspectorFieldDefinition[]
): Map<InspectorFieldGroup, InspectorFieldDefinition[]> {
    const grouped = new Map<InspectorFieldGroup, InspectorFieldDefinition[]>();

    for (const field of fields) {
        const group = grouped.get(field.group);
        if (group !== undefined) {
            group.push(field);
        } else {
            grouped.set(field.group, [field]);
        }
    }

    return grouped;
}

/** Названия групп на русском для отображения */
export const GROUP_TITLES: Record<InspectorFieldGroup, string> = {
    base: 'Базовые',
    transform: 'Трансформ',
    anchor: 'Якорь',
    graphics: 'Графика',
    flip: 'Отражение',
    text: 'Текст',
    uniforms: 'Материал',
    audio: 'Аудио',
};

/** Порядок групп в инспекторе */
export const GROUP_ORDER: InspectorFieldGroup[] = [
    'base',
    'transform',
    'anchor',
    'graphics',
    'flip',
    'text',
    'uniforms',
    'audio',
];
