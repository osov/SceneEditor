/**
 * ModelHandler - обработчик свойств 3D моделей
 *
 * Обрабатывает: mesh_name
 */

import type { IBaseMeshAndThree } from '../../../render_engine/types';
import { Property } from '../../../core/inspector/IInspectable';
import {
    type IPropertyHandler,
    type ReadContext,
    type ReadResult,
    type UpdateContext,
    type HandlerParams,
} from './types';

import type { ShaderMaterial, Vector2 } from 'three';

/** Интерфейс для модели */
interface IModelMesh extends IBaseMeshAndThree {
    get_mesh_name(): string;
    set_mesh(name: string): void;
    get_scale(): Vector2;
    set_scale(x: number, y: number): void;
    get_materials(): ShaderMaterial[];
    set_material(name: string, index?: number): void;
}

/** Создать ModelHandler */
export function create_model_handler(params?: HandlerParams): IPropertyHandler {
    const properties: Property[] = [
        Property.MESH_NAME,
        Property.MODEL_SCALE,
        Property.MODEL_MATERIALS,
    ];

    const on_refresh_inspector = params?.on_refresh_inspector;

    function read(property: Property, context: ReadContext): ReadResult<unknown> {
        switch (property) {
            case Property.MESH_NAME:
                return read_mesh_name(context);
            case Property.MODEL_SCALE:
                return read_model_scale(context);
            case Property.MODEL_MATERIALS:
                return read_model_materials(context);
            default:
                return { value: undefined, values_by_id: new Map(), has_differences: false };
        }
    }

    function update(property: Property, context: UpdateContext): void {
        switch (property) {
            case Property.MESH_NAME:
                update_mesh_name(context);
                break;
            case Property.MODEL_SCALE:
                update_model_scale(context);
                break;
            case Property.MODEL_MATERIALS:
                update_model_materials(context);
                break;
        }
    }

    function is_model_mesh(mesh: IBaseMeshAndThree): mesh is IModelMesh {
        return typeof (mesh as IModelMesh).get_mesh_name === 'function';
    }

    // === Mesh Name ===

    function read_mesh_name(context: ReadContext): ReadResult<string> {
        const { meshes } = context;
        const values_by_id = new Map<number, string>();

        let first_value: string | undefined;
        let has_differences = false;

        for (const mesh of meshes) {
            if (!is_model_mesh(mesh)) continue;

            const name = mesh.get_mesh_name();
            values_by_id.set(mesh.mesh_data.id, name);

            if (first_value === undefined) {
                first_value = name;
            } else if (first_value !== name) {
                has_differences = true;
            }
        }

        return {
            value: has_differences ? undefined : first_value,
            values_by_id,
            has_differences,
        };
    }

    function update_mesh_name(context: UpdateContext): void {
        const { meshes, value } = context;
        const name = value as string;

        for (const mesh of meshes) {
            if (!is_model_mesh(mesh)) continue;
            mesh.set_mesh(name);
        }

        // NOTE: Полностью обновить инспектор после смены меша
        // т.к. меняются доступные анимации, текстуры и другие свойства модели
        if (on_refresh_inspector !== undefined) {
            // Используем requestAnimationFrame чтобы дать модели время обновиться
            requestAnimationFrame(() => on_refresh_inspector());
        }
    }

    // === Model Scale ===

    function read_model_scale(context: ReadContext): ReadResult<number> {
        const { meshes } = context;
        const values_by_id = new Map<number, number>();

        let first_value: number | undefined;
        let has_differences = false;

        for (const mesh of meshes) {
            if (!is_model_mesh(mesh)) continue;

            // Для 3D моделей scale uniform - берём x компоненту
            const scale = mesh.get_scale();
            const uniform_scale = scale.x;
            values_by_id.set(mesh.mesh_data.id, uniform_scale);

            if (first_value === undefined) {
                first_value = uniform_scale;
            } else if (Math.abs(first_value - uniform_scale) > 0.001) {
                has_differences = true;
            }
        }

        return {
            value: has_differences ? undefined : first_value,
            values_by_id,
            has_differences,
        };
    }

    function update_model_scale(context: UpdateContext): void {
        const { meshes, value } = context;
        const scale = value as number;

        for (const mesh of meshes) {
            if (!is_model_mesh(mesh)) continue;
            mesh.set_scale(scale, scale);
        }
    }

    // === Model Materials ===

    function read_model_materials(context: ReadContext): ReadResult<string[]> {
        const { meshes } = context;
        const values_by_id = new Map<number, string[]>();

        let first_value: string[] | undefined;
        let has_differences = false;

        for (const mesh of meshes) {
            if (!is_model_mesh(mesh)) continue;

            const materials = mesh.get_materials();
            const material_names = materials.map(m => m.name);
            values_by_id.set(mesh.mesh_data.id, material_names);

            if (first_value === undefined) {
                first_value = material_names;
            } else if (!arrays_equal(first_value, material_names)) {
                has_differences = true;
            }
        }

        return {
            value: has_differences ? undefined : first_value,
            values_by_id,
            has_differences,
        };
    }

    function update_model_materials(context: UpdateContext): void {
        const { meshes, value, action_data } = context;

        // action_data содержит информацию о изменении материала по индексу
        if (action_data !== undefined) {
            const action = action_data as { index: number; name: string };
            for (const mesh of meshes) {
                if (!is_model_mesh(mesh)) continue;
                mesh.set_material(action.name, action.index);
            }
        } else {
            // Прямая установка списка материалов (по индексам)
            const names = value as string[];
            for (const mesh of meshes) {
                if (!is_model_mesh(mesh)) continue;
                names.forEach((name, index) => {
                    mesh.set_material(name, index);
                });
            }
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
