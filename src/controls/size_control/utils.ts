/**
 * Утилитарные функции для SizeControl
 */

import { Vector2, Vector3 } from "three";
import { PivotX, PivotY } from "../../render_engine/types";

/**
 * Преобразование индекса pivot точки в координаты pivot
 */
export function index_to_pivot(id: number): Vector2 {
    if (id === 4) return new Vector2(PivotX.LEFT, PivotY.CENTER);
    if (id === 0) return new Vector2(PivotX.LEFT, PivotY.TOP);
    if (id === 6) return new Vector2(PivotX.CENTER, PivotY.TOP);
    if (id === 1) return new Vector2(PivotX.RIGHT, PivotY.TOP);
    if (id === 5) return new Vector2(PivotX.RIGHT, PivotY.CENTER);
    if (id === 2) return new Vector2(PivotX.RIGHT, PivotY.BOTTOM);
    if (id === 7) return new Vector2(PivotX.CENTER, PivotY.BOTTOM);
    if (id === 3) return new Vector2(PivotX.LEFT, PivotY.BOTTOM);
    if (id === 8) return new Vector2(PivotX.CENTER, PivotY.CENTER);
    return new Vector2(PivotX.CENTER, PivotY.CENTER);
}

/**
 * Преобразование координат pivot в индекс точки
 */
export function pivot_to_index(pivot: Vector2): number {
    for (let i = 0; i < 9; i++) {
        if (index_to_pivot(i).equals(pivot))
            return i;
    }
    return -1;
}

/**
 * Определение направления курсора относительно bounding box
 * Возвращает [dirX, dirY] где 0 = не на границе, 1 = на границе
 */
export function get_cursor_dir(wp: Vector3, bounds: number[], range = 7): [number, number] {
    const dist = Math.abs(bounds[2] - bounds[0]);
    range *= (dist / 300);
    const tmp_dir: [number, number] = [0, 0];
    document.body.style.cursor = 'default';

    if (wp.x > bounds[0] - range && wp.x < bounds[2] + range &&
        wp.y > bounds[3] - range && wp.y < bounds[1] + range) {

        if (Math.abs(bounds[0] - wp.x) < range) {
            document.body.style.cursor = 'e-resize';
            tmp_dir[0] = 1;
        }
        if (Math.abs(bounds[2] - wp.x) < range) {
            document.body.style.cursor = 'e-resize';
            tmp_dir[0] = 1;
        }
        if (Math.abs(bounds[1] - wp.y) < range) {
            document.body.style.cursor = 'n-resize';
            tmp_dir[1] = 1;
        }
        if (Math.abs(bounds[3] - wp.y) < range) {
            document.body.style.cursor = 'n-resize';
            tmp_dir[1] = 1;
        }
        if (Math.abs(bounds[0] - wp.x) < range && Math.abs(bounds[1] - wp.y) < range) {
            document.body.style.cursor = 'nw-resize';
            tmp_dir[0] = 1;
            tmp_dir[1] = 1;
        }
        if (Math.abs(bounds[0] - wp.x) < range && Math.abs(bounds[3] - wp.y) < range) {
            document.body.style.cursor = 'ne-resize';
            tmp_dir[0] = 1;
            tmp_dir[1] = 1;
        }
        if (Math.abs(bounds[2] - wp.x) < range && Math.abs(bounds[1] - wp.y) < range) {
            document.body.style.cursor = 'sw-resize';
            tmp_dir[0] = 1;
            tmp_dir[1] = 1;
        }
        if (Math.abs(bounds[2] - wp.x) < range && Math.abs(bounds[3] - wp.y) < range) {
            document.body.style.cursor = 'se-resize';
            tmp_dir[0] = 1;
            tmp_dir[1] = 1;
        }
    }
    return tmp_dir;
}

/**
 * Получение объединённого bounding box из списка мешей
 */
export function get_bounds_from_meshes(list: { get_bounds(): number[] }[]): number[] {
    if (list.length === 0) return [0, 0, 0, 0];

    const bb = list[0].get_bounds();
    for (let i = 1; i < list.length; i++) {
        const b = list[i].get_bounds();
        bb[0] = Math.min(bb[0], b[0]);
        bb[1] = Math.max(bb[1], b[1]);
        bb[2] = Math.max(bb[2], b[2]);
        bb[3] = Math.min(bb[3], b[3]);
    }
    return bb;
}

/**
 * Расчёт масштаба для debug точек относительно bounding box
 */
export function calc_debug_sub_scalar(bb: number[], point_radius: number, config: {
    max_size_percent: number;
    size_max: number;
    size_min: number;
}): number {
    const height = Math.abs(bb[3] - bb[1]);
    const width = Math.abs(bb[2] - bb[0]);
    const dist = Math.min(width, height);
    const size = ((dist * config.max_size_percent) / point_radius * 2);
    return Math.max(Math.min(size, config.size_max), config.size_min);
}
