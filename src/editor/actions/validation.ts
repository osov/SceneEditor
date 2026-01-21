/**
 * Actions Validation - валидация действий редактора
 */

import type { ISceneObject } from '@editor/engine/types';
import { ObjectTypes } from '@editor/core/render/types';
import { GUI_TYPES, GO_TYPES } from './constants';

/** Определить мир объекта (gui/go) */
export function get_object_world(obj: ISceneObject): 'gui' | 'go' | 'unknown' {
    const type = obj.mesh_data.type as ObjectTypes;
    if ((GUI_TYPES as readonly ObjectTypes[]).includes(type)) return 'gui';
    if ((GO_TYPES as readonly ObjectTypes[]).includes(type)) return 'go';
    return 'unknown';
}

/** Проверить что все объекты из одного мира */
export function is_same_world(objects: ISceneObject[]): boolean {
    if (objects.length <= 1) return true;

    const first_world = get_object_world(objects[0]);
    return objects.every(obj => get_object_world(obj) === first_world);
}

/** Проверить валидность действия */
export function validate_action(
    target: ISceneObject | undefined,
    objects: ISceneObject[],
    _as_child = false,
    is_move = false
): boolean {
    if (objects.length === 0) return false;
    if (target === undefined) return true;

    // Проверяем что объекты из одного мира
    if (!is_same_world([target, ...objects])) {
        return false;
    }

    // Проверяем что не пытаемся переместить объект в себя или потомка
    if (is_move) {
        for (const obj of objects) {
            if (obj === target) return false;
            // Проверка что target не является потомком obj
            let parent = target.parent as ISceneObject | null;
            while (parent !== null) {
                if (parent === obj) return false;
                parent = parent.parent as ISceneObject | null;
            }
        }
    }

    return true;
}
