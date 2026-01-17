/**
 * PropertyConvertersService - сервис конвертации значений свойств
 *
 * Централизованные функции преобразования между форматами редактора и Three.js.
 * Включает конвертацию BlendMode, FilterMode и ScreenPointPreset.
 */

import {
    NormalBlending,
    AdditiveBlending,
    MultiplyBlending,
    SubtractiveBlending,
    NearestFilter,
    LinearFilter,
    Vector2,
    type Blending,
    type MinificationTextureFilter,
    type MagnificationTextureFilter,
} from 'three';

/** Режим смешивания (редактор) */
export enum BlendMode {
    NORMAL = 'normal',
    ADD = 'add',
    MULTIPLY = 'multiply',
    SUBTRACT = 'subtract',
}

/** Режим фильтрации текстуры (редактор) */
export enum FilterMode {
    NEAREST = 'nearest',
    LINEAR = 'linear',
}

/** Пресет точки на экране (anchor/pivot) */
export enum ScreenPointPreset {
    NONE = 'None',
    CENTER = 'Center',
    TOP_LEFT = 'Top Left',
    TOP_CENTER = 'Top Center',
    TOP_RIGHT = 'Top Right',
    LEFT_CENTER = 'Left Center',
    RIGHT_CENTER = 'Right Center',
    BOTTOM_LEFT = 'Bottom Left',
    BOTTOM_CENTER = 'Bottom Center',
    BOTTOM_RIGHT = 'Bottom Right',
    CUSTOM = 'Custom',
}

/** Выравнивание текста */
export enum TextAlign {
    NONE = 'None',
    CENTER = 'center',
    LEFT = 'left',
    RIGHT = 'right',
    JUSTIFY = 'justify',
}

/** Интерфейс сервиса конвертеров */
export interface IPropertyConvertersService {
    /** Конвертация BlendMode редактора в Blending Three.js */
    blend_mode_to_threejs(mode: BlendMode): Blending;
    /** Конвертация Blending Three.js в BlendMode редактора */
    threejs_blending_to_blend_mode(blending: Blending): BlendMode;

    /** Конвертация FilterMode редактора в Filter Three.js */
    filter_mode_to_threejs(mode: FilterMode): MinificationTextureFilter | MagnificationTextureFilter;
    /** Конвертация Filter Three.js в FilterMode редактора */
    threejs_filter_to_filter_mode(filter: number): FilterMode;

    /** Получить значение Vector2 из пресета точки экрана */
    screen_preset_to_anchor(preset: ScreenPointPreset): Vector2;
    /** Получить пресет из значения anchor */
    anchor_to_screen_preset(anchor: Vector2): ScreenPointPreset;
    /** Получить значение pivot из пресета */
    screen_preset_to_pivot(preset: ScreenPointPreset): Vector2;
}

/** Создать PropertyConvertersService */
export function create_property_converters_service(): IPropertyConvertersService {
    function blend_mode_to_threejs(mode: BlendMode): Blending {
        switch (mode) {
            case BlendMode.NORMAL:
                return NormalBlending;
            case BlendMode.ADD:
                return AdditiveBlending;
            case BlendMode.MULTIPLY:
                return MultiplyBlending;
            case BlendMode.SUBTRACT:
                return SubtractiveBlending;
            default:
                return NormalBlending;
        }
    }

    function threejs_blending_to_blend_mode(blending: Blending): BlendMode {
        switch (blending) {
            case NormalBlending:
                return BlendMode.NORMAL;
            case AdditiveBlending:
                return BlendMode.ADD;
            case MultiplyBlending:
                return BlendMode.MULTIPLY;
            case SubtractiveBlending:
                return BlendMode.SUBTRACT;
            default:
                return BlendMode.NORMAL;
        }
    }

    function filter_mode_to_threejs(mode: FilterMode): MinificationTextureFilter | MagnificationTextureFilter {
        switch (mode) {
            case FilterMode.NEAREST:
                return NearestFilter;
            case FilterMode.LINEAR:
                return LinearFilter;
            default:
                return LinearFilter;
        }
    }

    function threejs_filter_to_filter_mode(filter: number): FilterMode {
        switch (filter) {
            case NearestFilter:
                return FilterMode.NEAREST;
            case LinearFilter:
                return FilterMode.LINEAR;
            default:
                return FilterMode.LINEAR;
        }
    }

    function screen_preset_to_anchor(preset: ScreenPointPreset): Vector2 {
        switch (preset) {
            case ScreenPointPreset.CENTER:
                return new Vector2(0.5, 0.5);
            case ScreenPointPreset.TOP_LEFT:
                return new Vector2(0, 1);
            case ScreenPointPreset.TOP_CENTER:
                return new Vector2(0.5, 1);
            case ScreenPointPreset.TOP_RIGHT:
                return new Vector2(1, 1);
            case ScreenPointPreset.LEFT_CENTER:
                return new Vector2(0, 0.5);
            case ScreenPointPreset.RIGHT_CENTER:
                return new Vector2(1, 0.5);
            case ScreenPointPreset.BOTTOM_LEFT:
                return new Vector2(0, 0);
            case ScreenPointPreset.BOTTOM_CENTER:
                return new Vector2(0.5, 0);
            case ScreenPointPreset.BOTTOM_RIGHT:
                return new Vector2(1, 0);
            case ScreenPointPreset.NONE:
                return new Vector2(-1, -1);
            default:
                return new Vector2(0.5, 0.5);
        }
    }

    function anchor_to_screen_preset(anchor: Vector2): ScreenPointPreset {
        const { x, y } = anchor;

        if (x === 0.5 && y === 0.5) return ScreenPointPreset.CENTER;
        if (x === 0 && y === 1) return ScreenPointPreset.TOP_LEFT;
        if (x === 0.5 && y === 1) return ScreenPointPreset.TOP_CENTER;
        if (x === 1 && y === 1) return ScreenPointPreset.TOP_RIGHT;
        if (x === 0 && y === 0.5) return ScreenPointPreset.LEFT_CENTER;
        if (x === 1 && y === 0.5) return ScreenPointPreset.RIGHT_CENTER;
        if (x === 0 && y === 0) return ScreenPointPreset.BOTTOM_LEFT;
        if (x === 0.5 && y === 0) return ScreenPointPreset.BOTTOM_CENTER;
        if (x === 1 && y === 0) return ScreenPointPreset.BOTTOM_RIGHT;
        if (x === -1 && y === -1) return ScreenPointPreset.NONE;

        return ScreenPointPreset.CUSTOM;
    }

    function screen_preset_to_pivot(preset: ScreenPointPreset): Vector2 {
        // Pivot использует ту же логику что и anchor
        return screen_preset_to_anchor(preset);
    }

    return {
        blend_mode_to_threejs,
        threejs_blending_to_blend_mode,
        filter_mode_to_threejs,
        threejs_filter_to_filter_mode,
        screen_preset_to_anchor,
        anchor_to_screen_preset,
        screen_preset_to_pivot,
    };
}

/** Singleton экземпляр сервиса */
let converters_instance: IPropertyConvertersService | undefined;

/** Получить singleton экземпляр PropertyConvertersService */
export function get_property_converters(): IPropertyConvertersService {
    if (converters_instance === undefined) {
        converters_instance = create_property_converters_service();
    }
    return converters_instance;
}
