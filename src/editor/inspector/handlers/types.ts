/**
 * Типы для handlers инспектора
 */

import type { Vector2, Vector3 } from 'three';
import type { IBaseMeshAndThree } from '../../../render_engine/types';
import { Property } from '../../../core/inspector/IInspectable';

/** Информация об изменении для multi-select */
export interface ChangeAxisInfo {
    /** Ось X изменена (drag или input) */
    changed_x: boolean;
    /** Ось Y изменена */
    changed_y: boolean;
    /** Ось Z изменена */
    changed_z: boolean;
    /** Ось X перетащена (drag) */
    dragged_x: boolean;
    /** Ось Y перетащена */
    dragged_y: boolean;
    /** Ось Z перетащена */
    dragged_z: boolean;
}

/** Контекст обновления свойства */
export interface UpdateContext {
    /** ID объектов */
    ids: number[];
    /** Список mesh для обновления */
    meshes: IBaseMeshAndThree[];
    /** Новое значение */
    value: unknown;
    /** Информация об изменении осей */
    axis_info: ChangeAxisInfo;
    /** Является ли последним событием в серии (отпускание мыши) */
    is_last: boolean;
    /** Дополнительные данные действия (для ITEM_LIST и других) */
    action_data?: unknown;
}

/** Контекст чтения свойства */
export interface ReadContext {
    /** Список mesh для чтения */
    meshes: IBaseMeshAndThree[];
}

/** Результат чтения свойства */
export interface ReadResult<T> {
    /** Значение (общее для всех mesh или undefined если различаются) */
    value: T | undefined;
    /** Значения для каждого mesh по id */
    values_by_id: Map<number, T>;
    /** Есть ли различия в значениях между mesh */
    has_differences: boolean;
}

/** Базовый интерфейс обработчика свойства */
export interface IPropertyHandler {
    /** Список свойств которые обрабатывает handler */
    readonly properties: Property[];

    /** Прочитать значение свойства из mesh */
    read(property: Property, context: ReadContext): ReadResult<unknown>;

    /** Применить новое значение свойства к mesh */
    update(property: Property, context: UpdateContext): void;
}

/** Параметры создания handler */
export interface HandlerParams {
    /** Callback для обновления UI после изменений */
    on_update_ui?: () => void;
    /** Callback для обновления proxy после трансформаций */
    on_transform_changed?: () => void;
    /** Callback для обновления размера */
    on_size_changed?: () => void;
}

/** Тип вычисления среднего для multi-select */
export function compute_average_vector3(meshes: IBaseMeshAndThree[], getter: (m: IBaseMeshAndThree) => Vector3): Vector3 {
    const sum = { x: 0, y: 0, z: 0 };
    for (const mesh of meshes) {
        const v = getter(mesh);
        sum.x += v.x;
        sum.y += v.y;
        sum.z += v.z;
    }
    const count = meshes.length;
    return { x: sum.x / count, y: sum.y / count, z: sum.z / count } as Vector3;
}

export function compute_average_vector2(meshes: IBaseMeshAndThree[], getter: (m: IBaseMeshAndThree) => Vector2): Vector2 {
    const sum = { x: 0, y: 0 };
    for (const mesh of meshes) {
        const v = getter(mesh);
        sum.x += v.x;
        sum.y += v.y;
    }
    const count = meshes.length;
    return { x: sum.x / count, y: sum.y / count } as Vector2;
}

/** Проверить есть ли различия в значениях */
export function has_vector3_differences(meshes: IBaseMeshAndThree[], getter: (m: IBaseMeshAndThree) => Vector3): {
    diff_x: boolean;
    diff_y: boolean;
    diff_z: boolean;
} {
    if (meshes.length <= 1) return { diff_x: false, diff_y: false, diff_z: false };

    const first = getter(meshes[0]);
    let diff_x = false;
    let diff_y = false;
    let diff_z = false;

    for (let i = 1; i < meshes.length; i++) {
        const v = getter(meshes[i]);
        if (v.x !== first.x) diff_x = true;
        if (v.y !== first.y) diff_y = true;
        if (v.z !== first.z) diff_z = true;
    }

    return { diff_x, diff_y, diff_z };
}

export function has_vector2_differences(meshes: IBaseMeshAndThree[], getter: (m: IBaseMeshAndThree) => Vector2): {
    diff_x: boolean;
    diff_y: boolean;
} {
    if (meshes.length <= 1) return { diff_x: false, diff_y: false };

    const first = getter(meshes[0]);
    let diff_x = false;
    let diff_y = false;

    for (let i = 1; i < meshes.length; i++) {
        const v = getter(meshes[i]);
        if (v.x !== first.x) diff_x = true;
        if (v.y !== first.y) diff_y = true;
    }

    return { diff_x, diff_y };
}
