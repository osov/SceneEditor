/**
 * Утилиты для парсеров Defold
 */

import { Vector3 } from 'three';
import { hexToRGB } from '../../../modules/utils';
import { PivotX, PivotY } from '../../../render_engine/types';
import { DefoldClippingMode, DefoldPivot } from '../defold_encoder';

/** Получить имя из пути (без расширения и директорий) */
export function getNameFromPath(data: string): string {
    data = data.split('.')[0];
    const match = data.match(/\/([^\/]+)$/);
    return match ? match[1] : 'error';
}

/** Конвертировать hex цвет в Vector3 */
export function castColor(hex_rgb: string): Vector3 {
    const color = hexToRGB(hex_rgb);
    return new Vector3(color.x, color.y, color.z);
}

/** Конвертировать pivot массив в DefoldPivot */
export function castPivot(data: number[]): DefoldPivot {
    const x = data[0];
    const y = data[1];

    const is_n = (x === PivotX.CENTER) && (y === PivotY.TOP);
    if (is_n) return DefoldPivot.PIVOT_N;

    const is_ne = (x === PivotX.RIGHT) && (y === PivotY.TOP);
    if (is_ne) return DefoldPivot.PIVOT_NE;

    const is_e = (x === PivotX.RIGHT) && (y === PivotY.CENTER);
    if (is_e) return DefoldPivot.PIVOT_E;

    const is_se = (x === PivotX.RIGHT) && (y === PivotY.BOTTOM);
    if (is_se) return DefoldPivot.PIVOT_SE;

    const is_s = (x === PivotX.CENTER) && (y === PivotY.BOTTOM);
    if (is_s) return DefoldPivot.PIVOT_S;

    const is_sw = (x === PivotX.LEFT) && (y === PivotY.BOTTOM);
    if (is_sw) return DefoldPivot.PIVOT_SW;

    const is_w = (x === PivotX.LEFT) && (y === PivotY.CENTER);
    if (is_w) return DefoldPivot.PIVOT_W;

    const is_nw = (x === PivotX.LEFT) && (y === PivotY.TOP);
    if (is_nw) return DefoldPivot.PIVOT_NW;

    return DefoldPivot.PIVOT_CENTER;
}

/** Конвертировать stencil флаг в DefoldClippingMode */
export function castStencil(stencil: boolean): DefoldClippingMode {
    if (stencil) return DefoldClippingMode.CLIPPING_MODE_STENCIL;
    return DefoldClippingMode.CLIPPING_MODE_NONE;
}
