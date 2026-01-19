/**
 * Конвертеры для preset значений инспектора
 *
 * Преобразования между ScreenPointPreset и Vector2 для pivot/anchor
 */

import { Vector2 } from 'three';

/**
 * Пресеты позиции на экране
 * Значения используются в UI как labels
 */
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

/**
 * Преобразовать pivot в preset
 */
export function pivot_to_screen_preset(pivot: Vector2): ScreenPointPreset {
    if (pivot.x === 0.5 && pivot.y === 0.5) {
        return ScreenPointPreset.CENTER;
    } else if (pivot.x === 0 && pivot.y === 1) {
        return ScreenPointPreset.TOP_LEFT;
    } else if (pivot.x === 0.5 && pivot.y === 1) {
        return ScreenPointPreset.TOP_CENTER;
    } else if (pivot.x === 1 && pivot.y === 1) {
        return ScreenPointPreset.TOP_RIGHT;
    } else if (pivot.x === 0 && pivot.y === 0.5) {
        return ScreenPointPreset.LEFT_CENTER;
    } else if (pivot.x === 1 && pivot.y === 0.5) {
        return ScreenPointPreset.RIGHT_CENTER;
    } else if (pivot.x === 0 && pivot.y === 0) {
        return ScreenPointPreset.BOTTOM_LEFT;
    } else if (pivot.x === 0.5 && pivot.y === 0) {
        return ScreenPointPreset.BOTTOM_CENTER;
    } else if (pivot.x === 1 && pivot.y === 0) {
        return ScreenPointPreset.BOTTOM_RIGHT;
    }

    return ScreenPointPreset.CENTER;
}

/**
 * Преобразовать preset в pivot value
 */
export function screen_preset_to_pivot_value(preset: ScreenPointPreset): Vector2 {
    switch (preset) {
        case ScreenPointPreset.CENTER: return new Vector2(0.5, 0.5);
        case ScreenPointPreset.TOP_LEFT: return new Vector2(0, 1);
        case ScreenPointPreset.TOP_CENTER: return new Vector2(0.5, 1);
        case ScreenPointPreset.TOP_RIGHT: return new Vector2(1, 1);
        case ScreenPointPreset.LEFT_CENTER: return new Vector2(0, 0.5);
        case ScreenPointPreset.RIGHT_CENTER: return new Vector2(1, 0.5);
        case ScreenPointPreset.BOTTOM_LEFT: return new Vector2(0, 0);
        case ScreenPointPreset.BOTTOM_CENTER: return new Vector2(0.5, 0);
        case ScreenPointPreset.BOTTOM_RIGHT: return new Vector2(1, 0);
        default: return new Vector2(0.5, 0.5);
    }
}

/**
 * Преобразовать anchor в preset
 */
export function anchor_to_screen_preset(anchor: Vector2): ScreenPointPreset {
    if (anchor.x === 0.5 && anchor.y === 0.5) {
        return ScreenPointPreset.CENTER;
    } else if (anchor.x === 0 && anchor.y === 1) {
        return ScreenPointPreset.TOP_LEFT;
    } else if (anchor.x === 0.5 && anchor.y === 1) {
        return ScreenPointPreset.TOP_CENTER;
    } else if (anchor.x === 1 && anchor.y === 1) {
        return ScreenPointPreset.TOP_RIGHT;
    } else if (anchor.x === 0 && anchor.y === 0.5) {
        return ScreenPointPreset.LEFT_CENTER;
    } else if (anchor.x === 1 && anchor.y === 0.5) {
        return ScreenPointPreset.RIGHT_CENTER;
    } else if (anchor.x === 0 && anchor.y === 0) {
        return ScreenPointPreset.BOTTOM_LEFT;
    } else if (anchor.x === 0.5 && anchor.y === 0) {
        return ScreenPointPreset.BOTTOM_CENTER;
    } else if (anchor.x === 1 && anchor.y === 0) {
        return ScreenPointPreset.BOTTOM_RIGHT;
    } else if (anchor.x === -1 && anchor.y === -1) {
        return ScreenPointPreset.NONE;
    }

    return ScreenPointPreset.CUSTOM;
}

/**
 * Преобразовать preset в anchor value
 */
export function screen_preset_to_anchor_value(preset: ScreenPointPreset): Vector2 {
    switch (preset) {
        case ScreenPointPreset.CENTER: return new Vector2(0.5, 0.5);
        case ScreenPointPreset.TOP_LEFT: return new Vector2(0, 1);
        case ScreenPointPreset.TOP_CENTER: return new Vector2(0.5, 1);
        case ScreenPointPreset.TOP_RIGHT: return new Vector2(1, 1);
        case ScreenPointPreset.LEFT_CENTER: return new Vector2(0, 0.5);
        case ScreenPointPreset.RIGHT_CENTER: return new Vector2(1, 0.5);
        case ScreenPointPreset.BOTTOM_LEFT: return new Vector2(0, 0);
        case ScreenPointPreset.BOTTOM_CENTER: return new Vector2(0.5, 0);
        case ScreenPointPreset.BOTTOM_RIGHT: return new Vector2(1, 0);
        case ScreenPointPreset.NONE: return new Vector2(-1, -1);
        default: return new Vector2(0.5, 0.5);
    }
}
