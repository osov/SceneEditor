/**
 * Режимы смешивания и функции конвертации
 */

import {
    AdditiveBlending,
    Blending,
    MultiplyBlending,
    NormalBlending,
    SubtractiveBlending,
} from 'three';

/**
 * Режимы смешивания
 */
export enum BlendMode {
    NORMAL = 'normal',
    ADD = 'add',
    MULTIPLY = 'multiply',
    SUBTRACT = 'subtract',
}

/**
 * Конвертировать BlendMode в Three.js Blending
 */
export function convert_blend_mode_to_threejs(blend_mode: BlendMode): Blending {
    switch (blend_mode) {
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

/**
 * Конвертировать Three.js Blending в BlendMode
 */
export function convert_threejs_to_blend_mode(blending: number): BlendMode {
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
