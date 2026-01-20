/**
 * Конфигурация инспектора по умолчанию
 *
 * Определяет группы свойств и их параметры для отображения в инспекторе
 */

import { Property } from '../../core/inspector/IInspectable';
import type { IOptionsProviders } from '../../editor/inspector/options';
import { ScreenPointPreset, BlendMode } from './index';

/**
 * Типы свойств инспектора (дублирование для избежания циклической зависимости)
 */
export enum PropertyType {
    NUMBER,
    VECTOR_2,
    VECTOR_3,
    VECTOR_4,
    BOOLEAN,
    COLOR,
    STRING,
    SLIDER,
    LIST_TEXT,
    LIST_TEXTURES,
    ITEM_LIST,
    BUTTON,
    POINT_2D,
    LOG_DATA,
}

/**
 * Режим фильтрации текстур
 */
export enum FilterMode {
    NEAREST = 'nearest',
    LINEAR = 'linear'
}

/**
 * Выравнивание текста
 */
export enum TextAlign {
    NONE = 'None',
    CENTER = 'center',
    LEFT = 'left',
    RIGHT = 'right',
    JUSTIFY = 'justify'
}

/**
 * Создать конфигурацию инспектора по умолчанию
 */
export function create_default_inspector_config(options_providers: IOptionsProviders) {
    return [
        {
            name: 'base',
            title: '',
            property_list: [
                { name: Property.TYPE, title: 'Тип', type: PropertyType.STRING, readonly: true },
                { name: Property.NAME, title: 'Название', type: PropertyType.STRING },
                { name: Property.ACTIVE, title: 'Активный', type: PropertyType.BOOLEAN },
                {
                    name: Property.ASSET_ATLAS, title: 'Атлас', type: PropertyType.LIST_TEXT, params: options_providers.get_atlas_options()
                },
                { name: Property.ATLAS_BUTTON, title: 'Атлас менеджер', type: PropertyType.BUTTON },
                {
                    name: Property.MIN_FILTER, title: 'Фильтр уменьшения', type: PropertyType.LIST_TEXT, params: {
                        'nearest': FilterMode.NEAREST,
                        'linear': FilterMode.LINEAR
                    }
                },
                {
                    name: Property.MAG_FILTER, title: 'Фильтр увеличения', type: PropertyType.LIST_TEXT, params: {
                        'nearest': FilterMode.NEAREST,
                        'linear': FilterMode.LINEAR
                    }
                },
                {
                    name: Property.VERTEX_PROGRAM,
                    title: 'Vertex Program',
                    type: PropertyType.LIST_TEXT,
                    params: options_providers.get_vertex_program_options()
                },
                {
                    name: Property.FRAGMENT_PROGRAM,
                    title: 'Fragment Program',
                    type: PropertyType.LIST_TEXT,
                    params: options_providers.get_fragment_program_options()
                },
                {
                    name: Property.TRANSPARENT,
                    title: 'Transparent',
                    type: PropertyType.BOOLEAN
                }
            ]
        },
        {
            name: 'transform',
            title: 'Трансформ',
            property_list: [
                {
                    name: Property.POSITION, title: 'Позиция', type: PropertyType.VECTOR_3, params: {
                        x: { format: (v: number) => v.toFixed(2), step: 0.1 },
                        y: { format: (v: number) => v.toFixed(2), step: 0.1 },
                        z: { format: (v: number) => v.toFixed(2), step: 0.1 },
                    }
                },
                {
                    name: Property.ROTATION, title: 'Вращение', type: PropertyType.VECTOR_3, params: {
                        x: { format: (v: number) => v.toFixed(2) },
                        y: { format: (v: number) => v.toFixed(2) },
                        z: { format: (v: number) => v.toFixed(2) }
                    }
                },
                {
                    name: Property.SCALE, title: 'Маштаб', type: PropertyType.VECTOR_2, params: {
                        x: { format: (v: number) => v.toFixed(2) },
                        y: { format: (v: number) => v.toFixed(2) },
                    }
                },
                {
                    name: Property.PIVOT, title: 'Точка опоры', type: PropertyType.LIST_TEXT, params: {
                        'Центр': ScreenPointPreset.CENTER,
                        'Левый Верхний': ScreenPointPreset.TOP_LEFT,
                        'Центр Сверху': ScreenPointPreset.TOP_CENTER,
                        'Правый Верхний': ScreenPointPreset.TOP_RIGHT,
                        'Центр Слева': ScreenPointPreset.LEFT_CENTER,
                        'Центр Справа': ScreenPointPreset.RIGHT_CENTER,
                        'Левый Нижний': ScreenPointPreset.BOTTOM_LEFT,
                        'Центр Снизу': ScreenPointPreset.BOTTOM_CENTER,
                        'Правый Нижний': ScreenPointPreset.BOTTOM_RIGHT
                    }
                },
                {
                    name: Property.SIZE, title: 'Размер', type: PropertyType.VECTOR_2, params: {
                        x: { min: 0, max: 0xFFFFFFFF, step: 1, format: (v: number) => v.toFixed(2) },
                        y: { min: 0, max: 0xFFFFFFFF, step: 1, format: (v: number) => v.toFixed(2) },
                    }
                }
            ]
        },
        {
            name: 'anchor',
            title: 'Якорь',
            property_list: [
                {
                    name: Property.ANCHOR, title: 'Значение', type: PropertyType.POINT_2D, params: {
                        x: { min: -1, max: 1, format: (v: number) => v.toFixed(2) },
                        y: { min: -1, max: 1, format: (v: number) => v.toFixed(2) }
                    }
                },
                {
                    name: Property.ANCHOR_PRESET, title: 'Пресет', type: PropertyType.LIST_TEXT, params: {
                        'Не выбрано': ScreenPointPreset.NONE,
                        'Центр': ScreenPointPreset.CENTER,
                        'Левый Верхний': ScreenPointPreset.TOP_LEFT,
                        'Центр Сверху': ScreenPointPreset.TOP_CENTER,
                        'Правый Верхний': ScreenPointPreset.TOP_RIGHT,
                        'Центр Слева': ScreenPointPreset.LEFT_CENTER,
                        'Центр Справа': ScreenPointPreset.RIGHT_CENTER,
                        'Левый Нижний': ScreenPointPreset.BOTTOM_LEFT,
                        'Центр Снизу': ScreenPointPreset.BOTTOM_CENTER,
                        'Правый Нижний': ScreenPointPreset.BOTTOM_RIGHT,
                        'Индивидуальный': ScreenPointPreset.CUSTOM
                    }
                }
            ]
        },
        {
            name: 'graphics',
            title: 'Визуал',
            property_list: [
                { name: Property.COLOR, title: 'Цвет', type: PropertyType.COLOR },
                { name: Property.ALPHA, title: 'Прозрачность', type: PropertyType.NUMBER, params: { min: 0, max: 1, step: 0.1 } },
                { name: Property.ATLAS, title: 'Атлас', type: PropertyType.LIST_TEXT, params: options_providers.get_atlas_options() },
                {
                    name: Property.TEXTURE, title: 'Текстура', type: PropertyType.LIST_TEXTURES, params: options_providers.get_texture_options()
                },
                {
                    name: Property.MATERIAL, title: 'Материал', type: PropertyType.LIST_TEXT, params: options_providers.get_material_options()
                },
                {
                    name: Property.SLICE9, title: 'Slice9', type: PropertyType.POINT_2D, params: {
                        x: { min: 0, max: 100, format: (v: number) => v.toFixed(2) },
                        y: { min: 0, max: 100, format: (v: number) => v.toFixed(2) }
                    }
                },
                {
                    name: Property.BLEND_MODE, title: 'Режим смешивания', type: PropertyType.LIST_TEXT, params: {
                        'Нормальный': BlendMode.NORMAL,
                        'Сложение': BlendMode.ADD,
                        'Умножение': BlendMode.MULTIPLY,
                        'Вычитание': BlendMode.SUBTRACT,
                    }
                },
            ]
        },
        {
            name: 'flip',
            title: 'Отражение',
            property_list: [
                { name: Property.FLIP_VERTICAL, title: 'По вертикали', type: PropertyType.BOOLEAN },
                { name: Property.FLIP_HORIZONTAL, title: 'По горизонтали', type: PropertyType.BOOLEAN },
                { name: Property.FLIP_DIAGONAL, title: 'По диагонали', type: PropertyType.BOOLEAN }
            ]
        },
        {
            name: 'text',
            title: 'Текст',
            property_list: [
                { name: Property.TEXT, title: 'Текст', type: PropertyType.LOG_DATA },
                {
                    name: Property.FONT, title: 'Шрифт', type: PropertyType.LIST_TEXT, params: options_providers.get_font_options()
                },
                {
                    name: Property.FONT_SIZE, title: 'Размер шрифта', type: PropertyType.NUMBER, params: {
                        min: 8, step: 1, format: (v: number) => v.toFixed(0)
                    }
                },
                {
                    name: Property.TEXT_ALIGN, title: 'Выравнивание', type: PropertyType.LIST_TEXT, params: {
                        'Центр': TextAlign.CENTER,
                        'Слева': TextAlign.LEFT,
                        'Справа': TextAlign.RIGHT,
                        'По ширине': TextAlign.JUSTIFY
                    }
                },
                {
                    name: Property.LINE_HEIGHT, title: 'Высота строки', type: PropertyType.NUMBER, params: {
                        min: 0.5, max: 3, step: 0.1, format: (v: number) => v.toFixed(2)
                    }
                }
            ]
        },
        {
            name: 'uniforms',
            title: 'Uniforms',
            property_list: [
                {
                    name: Property.UNIFORM_SAMPLER2D,
                    title: 'Sampler2D',
                    type: PropertyType.LIST_TEXTURES,
                    // Для uniforms используем формат atlas/texture
                    params: options_providers.get_uniform_texture_options()
                },
                {
                    name: Property.UNIFORM_FLOAT,
                    title: 'Float',
                    type: PropertyType.NUMBER,
                    params: {
                        min: 0,
                        max: 1,
                        step: 0.1,
                        format: (v: number) => v.toFixed(2)
                    }
                },
                {
                    name: Property.UNIFORM_RANGE,
                    title: 'Range',
                    type: PropertyType.SLIDER,
                    params: {
                        min: 0,
                        max: 100,
                        step: 0.1
                    }
                },
                {
                    name: Property.UNIFORM_VEC2,
                    title: 'Vec2',
                    type: PropertyType.VECTOR_2,
                    params: {
                        x: { min: -1000, max: 1000, step: 0.1, format: (v: number) => v.toFixed(2) },
                        y: { min: -1000, max: 1000, step: 0.1, format: (v: number) => v.toFixed(2) }
                    }
                },
                {
                    name: Property.UNIFORM_VEC3,
                    title: 'Vec3',
                    type: PropertyType.VECTOR_3,
                    params: {
                        x: { min: -1000, max: 1000, step: 0.1, format: (v: number) => v.toFixed(2) },
                        y: { min: -1000, max: 1000, step: 0.1, format: (v: number) => v.toFixed(2) },
                        z: { min: -1000, max: 1000, step: 0.1, format: (v: number) => v.toFixed(2) }
                    }
                },
                {
                    name: Property.UNIFORM_VEC4,
                    title: 'Vec4',
                    type: PropertyType.VECTOR_4,
                    params: {
                        x: { min: -1000, max: 1000, step: 0.1, format: (v: number) => v.toFixed(2) },
                        y: { min: -1000, max: 1000, step: 0.1, format: (v: number) => v.toFixed(2) },
                        z: { min: -1000, max: 1000, step: 0.1, format: (v: number) => v.toFixed(2) },
                        w: { min: -1000, max: 1000, step: 0.1, format: (v: number) => v.toFixed(2) }
                    }
                },
                {
                    name: Property.UNIFORM_COLOR,
                    title: 'Color',
                    type: PropertyType.COLOR
                }
            ]
        },
        {
            name: 'model',
            title: 'Модель',
            property_list: [
                {
                    name: Property.MESH_NAME,
                    title: 'Меш',
                    type: PropertyType.LIST_TEXT,
                    params: options_providers.get_mesh_options()
                },
                {
                    name: Property.MODEL_SCALE,
                    title: 'Масштаб',
                    type: PropertyType.NUMBER,
                    params: { min: 0.01, step: 0.1, format: (v: number) => v.toFixed(2) }
                },
                {
                    name: Property.MODEL_MATERIALS,
                    title: 'Материалы',
                    type: PropertyType.ITEM_LIST,
                    params: { options: [], pickText: 'Выбрать материал', emptyText: 'Нет материалов' }
                },
                {
                    name: Property.SLOT_MATERIAL,
                    title: 'Материал',
                    type: PropertyType.LIST_TEXT,
                    params: options_providers.get_material_options()
                },
                {
                    name: Property.CURRENT_ANIMATION,
                    title: 'Анимация',
                    type: PropertyType.LIST_TEXT,
                    params: options_providers.get_animation_options([])
                }
            ]
        },
        {
            name: 'audio',
            title: 'Аудио',
            property_list: [
                {
                    name: Property.SOUND,
                    title: 'Звук',
                    type: PropertyType.LIST_TEXT,
                    params: options_providers.get_sound_options()
                },
                {
                    name: Property.VOLUME,
                    title: 'Громкость',
                    type: PropertyType.SLIDER,
                    params: { min: 0, max: 1, step: 0.01 }
                },
                {
                    name: Property.LOOP,
                    title: 'Зацикливание',
                    type: PropertyType.BOOLEAN
                },
                {
                    name: Property.PAN,
                    title: 'Панорама',
                    type: PropertyType.SLIDER,
                    params: { min: -1, max: 1, step: 0.01 }
                },
                {
                    name: Property.SPEED,
                    title: 'Скорость',
                    type: PropertyType.NUMBER,
                    params: { min: 0.1, max: 10, step: 0.1, format: (v: number) => v.toFixed(1) }
                },
                {
                    name: Property.AUDIO_PLAY_PAUSE,
                    title: '▶ Играть / ⏹ Стоп',
                    type: PropertyType.BUTTON
                },
                {
                    name: Property.AUDIO_STOP,
                    title: '⏹ Стоп',
                    type: PropertyType.BUTTON
                },
                {
                    name: Property.SOUND_RADIUS,
                    title: 'Радиус звука',
                    type: PropertyType.NUMBER,
                    params: { min: 0, step: 1, format: (v: number) => v.toFixed(0) }
                },
                {
                    name: Property.MAX_VOLUME_RADIUS,
                    title: 'Радиус макс. громкости',
                    type: PropertyType.NUMBER,
                    params: { min: 0, step: 1, format: (v: number) => v.toFixed(0) }
                },
                {
                    name: Property.SOUND_FUNCTION,
                    title: 'Функция затухания',
                    type: PropertyType.LIST_TEXT,
                    params: options_providers.get_sound_function_options()
                },
                {
                    name: Property.ZONE_TYPE,
                    title: 'Тип зоны',
                    type: PropertyType.LIST_TEXT,
                    params: options_providers.get_zone_type_options()
                },
                {
                    name: Property.PAN_NORMALIZATION,
                    title: 'Нормализация панорамы',
                    type: PropertyType.NUMBER,
                    params: { min: 0, step: 1, format: (v: number) => v.toFixed(0) }
                },
                {
                    name: Property.RECTANGLE_WIDTH,
                    title: 'Ширина зоны',
                    type: PropertyType.NUMBER,
                    params: { min: 0, step: 1, format: (v: number) => v.toFixed(0) }
                },
                {
                    name: Property.RECTANGLE_HEIGHT,
                    title: 'Высота зоны',
                    type: PropertyType.NUMBER,
                    params: { min: 0, step: 1, format: (v: number) => v.toFixed(0) }
                },
                {
                    name: Property.RECTANGLE_MAX_WIDTH,
                    title: 'Ширина макс. громкости',
                    type: PropertyType.NUMBER,
                    params: { min: 0, step: 1, format: (v: number) => v.toFixed(0) }
                },
                {
                    name: Property.RECTANGLE_MAX_HEIGHT,
                    title: 'Высота макс. громкости',
                    type: PropertyType.NUMBER,
                    params: { min: 0, step: 1, format: (v: number) => v.toFixed(0) }
                },
                {
                    name: Property.FADE_IN_TIME,
                    title: 'Время нарастания',
                    type: PropertyType.NUMBER,
                    params: { min: 0, step: 0.1, format: (v: number) => v.toFixed(1) }
                },
                {
                    name: Property.FADE_OUT_TIME,
                    title: 'Время затухания',
                    type: PropertyType.NUMBER,
                    params: { min: 0, step: 0.1, format: (v: number) => v.toFixed(1) }
                }
            ]
        }
    ];
}
