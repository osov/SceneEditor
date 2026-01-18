/**
 * AnimationHandler - обработчик свойств анимаций
 *
 * Обрабатывает: animations (ITEM_LIST), current_animation
 */

import type { AnimationAction } from 'three';
import type { IBaseMeshAndThree } from '../../../render_engine/types';
import { Property } from '../../../core/inspector/IInspectable';
import {
    type IPropertyHandler,
    type ReadContext,
    type ReadResult,
    type UpdateContext,
    type HandlerParams,
} from './types';

/** Интерфейс для анимированной модели */
interface IAnimatedMesh extends IBaseMeshAndThree {
    get_animation_list(): Record<string, AnimationAction>;
    get_animation(): string;
    set_animation(alias: string, offset?: number): void;
    add_animation(name: string): void;
    remove_animation(name: string): void;
}

/** Создать AnimationHandler */
export function create_animation_handler(_params?: HandlerParams): IPropertyHandler {
    const properties: Property[] = [
        Property.ANIMATIONS,
        Property.CURRENT_ANIMATION,
    ];

    function read(property: Property, context: ReadContext): ReadResult<unknown> {
        switch (property) {
            case Property.ANIMATIONS:
                return read_animations(context);
            case Property.CURRENT_ANIMATION:
                return read_current_animation(context);
            default:
                return { value: undefined, values_by_id: new Map(), has_differences: false };
        }
    }

    function update(property: Property, context: UpdateContext): void {
        switch (property) {
            case Property.ANIMATIONS:
                update_animations(context);
                break;
            case Property.CURRENT_ANIMATION:
                update_current_animation(context);
                break;
        }
    }

    function is_animated_mesh(mesh: IBaseMeshAndThree): mesh is IAnimatedMesh {
        return typeof (mesh as IAnimatedMesh).get_animation_list === 'function';
    }

    // === Animations (ITEM_LIST) ===

    function read_animations(context: ReadContext): ReadResult<string[]> {
        const { meshes } = context;
        const values_by_id = new Map<number, string[]>();

        let first_value: string[] | undefined;
        let has_differences = false;

        for (const mesh of meshes) {
            if (!is_animated_mesh(mesh)) continue;

            const animation_list = mesh.get_animation_list();
            const names = Object.keys(animation_list);
            values_by_id.set(mesh.mesh_data.id, names);

            if (first_value === undefined) {
                first_value = names;
            } else if (!arrays_equal(first_value, names)) {
                has_differences = true;
            }
        }

        return {
            value: has_differences ? undefined : first_value,
            values_by_id,
            has_differences,
        };
    }

    function update_animations(context: UpdateContext): void {
        const { meshes, value, action_data } = context;

        // action_data содержит информацию о добавлении/удалении
        if (action_data === undefined) {
            // Прямая установка списка анимаций
            const names = value as string[];
            for (const mesh of meshes) {
                if (!is_animated_mesh(mesh)) continue;

                // Получаем текущий список
                const current_list = Object.keys(mesh.get_animation_list());

                // Удаляем анимации которых нет в новом списке
                for (const name of current_list) {
                    if (!names.includes(name)) {
                        mesh.remove_animation(name);
                    }
                }

                // Добавляем новые анимации
                for (const name of names) {
                    if (!current_list.includes(name)) {
                        mesh.add_animation(name);
                    }
                }
            }
        } else {
            // Действие add/remove
            const action = action_data as { type: 'add' | 'remove'; name: string };
            for (const mesh of meshes) {
                if (!is_animated_mesh(mesh)) continue;

                if (action.type === 'add') {
                    mesh.add_animation(action.name);
                } else if (action.type === 'remove') {
                    mesh.remove_animation(action.name);
                }
            }
        }
    }

    // === Current Animation ===

    function read_current_animation(context: ReadContext): ReadResult<string> {
        const { meshes } = context;
        const values_by_id = new Map<number, string>();

        let first_value: string | undefined;
        let has_differences = false;

        for (const mesh of meshes) {
            if (!is_animated_mesh(mesh)) continue;

            const current = mesh.get_animation();
            values_by_id.set(mesh.mesh_data.id, current);

            if (first_value === undefined) {
                first_value = current;
            } else if (first_value !== current) {
                has_differences = true;
            }
        }

        return {
            value: has_differences ? undefined : first_value,
            values_by_id,
            has_differences,
        };
    }

    function update_current_animation(context: UpdateContext): void {
        const { meshes, value } = context;
        const animation = value as string;

        for (const mesh of meshes) {
            if (!is_animated_mesh(mesh)) continue;
            mesh.set_animation(animation);
        }
    }

    // Вспомогательная функция сравнения массивов
    function arrays_equal(a: string[], b: string[]): boolean {
        if (a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) {
            if (a[i] !== b[i]) return false;
        }
        return true;
    }

    return {
        properties,
        read,
        update,
    };
}
