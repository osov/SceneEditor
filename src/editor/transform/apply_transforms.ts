/**
 * Apply Transforms - функции применения трансформаций
 */

import { Object3D, Quaternion, Vector3 } from 'three';
import type { TransformableObject } from './types';

/** Применить перемещение к объектам */
export function apply_translate(
    proxy: Object3D,
    start_position: Vector3,
    objects: TransformableObject[]
): void {
    const delta_position = proxy.position.clone().sub(start_position);

    for (const element of objects) {
        const ws = new Vector3(1, 1, 1);
        if (element.parent !== null) {
            element.parent.getWorldScale(ws);
        }
        const tmp = delta_position.clone();
        tmp.divide(ws);
        if (element._position !== undefined) {
            element.set_position(
                element._position.x + tmp.x,
                element._position.y + tmp.y,
                element._position.z + tmp.z
            );
        }
    }
}

/** Применить вращение к объектам */
export function apply_rotate(
    proxy: Object3D,
    objects: TransformableObject[]
): void {
    const rotation = new Quaternion();
    rotation.copy(proxy.quaternion);

    for (const element of objects) {
        element.quaternion.copy(rotation);
        if (element.transform_changed !== undefined) {
            element.transform_changed();
        }
    }
}

/** Применить масштаб к объектам */
export function apply_scale(
    proxy: Object3D,
    prev_scale: Vector3,
    objects: TransformableObject[]
): Vector3 {
    const dt_scale = proxy.scale.clone().sub(prev_scale);
    const new_scale = proxy.scale.clone();

    for (const element of objects) {
        element.scale.add(dt_scale);
        if (element.transform_changed !== undefined) {
            element.transform_changed();
        }
    }

    return new_scale;
}

/** Сохранить позиции объектов */
export function save_positions(objects: TransformableObject[]): Vector3[] {
    return objects.map(obj => obj.position.clone());
}

/** Сохранить вращения объектов */
export function save_rotations(objects: TransformableObject[]): Quaternion[] {
    return objects.map(obj => obj.quaternion.clone());
}

/** Сохранить масштабы объектов */
export function save_scales(objects: TransformableObject[]): Vector3[] {
    return objects.map(obj => obj.scale.clone());
}
