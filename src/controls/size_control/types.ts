/**
 * Типы и константы для SizeControl
 */

import type { Vector2, Vector3 } from "three";

/** Минимальный размер точки (не зависит от расстояния) */
export const DEBUG_BB_POINT_SIZE_MIN = 0.03;

/** Максимальный размер точки в процентах от расстояния */
export const DEBUG_BB_POINT_MAX_SIZE_PERCENT = 0.04;

/** Самый большой возможный размер точки (не от расстояния) */
export const DEBUG_BB_POINT_SIZE_MAX = 0.1;

/** Информация о свойстве меша */
export interface MeshPropertyInfo<T> {
    mesh_id: number;
    value: T;
}

/** Данные для истории размера */
export interface SizeHistoryData {
    size: Vector2;
    pos: Vector3;
}

/** Интерфейс SizeControl */
export interface ISizeControl {
    set_selected_list(list: unknown[]): void;
    detach(): void;
    set_active(val: boolean): void;
    draw(): void;
}
