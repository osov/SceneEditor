/**
 * Proxy Manager - управление proxy-объектом для трансформаций
 */

import { Object3D, Vector3 } from 'three';
import type { TransformableObject } from './types';

/** Вычислить среднюю точку объектов */
export function calculate_average_point(objects: TransformableObject[]): Vector3 {
    if (objects.length === 0) {
        return new Vector3();
    }

    const sum = new Vector3(0, 0, 0);
    const tmp_vec3 = new Vector3();

    for (const obj of objects) {
        obj.getWorldPosition(tmp_vec3);
        sum.add(tmp_vec3);
    }

    return sum.divideScalar(objects.length);
}

/** Установить proxy в среднюю точку объектов */
export function set_proxy_in_average_point(
    proxy: Object3D,
    start_position: Vector3,
    objects: TransformableObject[]
): void {
    if (objects.length === 0) return;

    const average_point = calculate_average_point(objects);

    // Сохраняем _position для каждого объекта
    for (const object of objects) {
        object._position = object.position.clone();
    }

    proxy.position.copy(average_point);
    start_position.copy(average_point);
}

/** Инициализировать proxy по первому объекту */
export function init_proxy_from_object(
    proxy: Object3D,
    prev_scale: Vector3,
    start_position: Vector3,
    average_point: Vector3,
    mesh: TransformableObject
): void {
    proxy.position.copy(mesh.position);
    proxy.rotation.copy(mesh.rotation);
    proxy.scale.copy(mesh.scale);
    prev_scale.copy(mesh.scale);
    start_position.copy(average_point);
}
