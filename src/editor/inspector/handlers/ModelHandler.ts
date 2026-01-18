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

/** Интерфейс для модели */
interface IModelMesh extends IBaseMeshAndThree {
    get_mesh_name(): string;
    set_mesh(name: string): void;
}

/** Создать ModelHandler */
export function create_model_handler(_params?: HandlerParams): IPropertyHandler {
    const properties: Property[] = [
        Property.MESH_NAME,
    ];

    function read(property: Property, context: ReadContext): ReadResult<unknown> {
        switch (property) {
            case Property.MESH_NAME:
                return read_mesh_name(context);
            default:
                return { value: undefined, values_by_id: new Map(), has_differences: false };
        }
    }

    function update(property: Property, context: UpdateContext): void {
        switch (property) {
            case Property.MESH_NAME:
                update_mesh_name(context);
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
    }

    return {
        properties,
        read,
        update,
    };
}
