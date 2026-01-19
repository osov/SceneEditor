/**
 * FlipHandler - обработчик свойств отражения
 *
 * Обрабатывает: flip_vertical, flip_horizontal, flip_diagonal
 *
 * Примечание: FlipMode не поддерживает комбинации (BOTH),
 * поэтому каждый режим исключает другие.
 */

import type { IBaseMeshAndThree } from '../../../render_engine/types';
import { Property } from '../../../core/inspector/IInspectable';
import { FlipMode } from '../../../render_engine/objects/sub_types';
import {
    type IPropertyHandler,
    type ReadContext,
    type ReadResult,
    type UpdateContext,
    type HandlerParams,
} from './types';

/** Интерфейс для mesh с отражением */
interface IMeshWithFlip extends IBaseMeshAndThree {
    get_flip(): FlipMode;
    set_flip(mode: FlipMode): void;
}

/** Создать FlipHandler */
export function create_flip_handler(_params?: HandlerParams): IPropertyHandler {
    const properties: Property[] = [
        Property.FLIP_VERTICAL,
        Property.FLIP_HORIZONTAL,
        Property.FLIP_DIAGONAL,
    ];

    function read(property: Property, context: ReadContext): ReadResult<unknown> {
        switch (property) {
            case Property.FLIP_VERTICAL:
                return read_flip_vertical(context);
            case Property.FLIP_HORIZONTAL:
                return read_flip_horizontal(context);
            case Property.FLIP_DIAGONAL:
                return read_flip_diagonal(context);
            default:
                return { value: undefined, values_by_id: new Map(), has_differences: false };
        }
    }

    function update(property: Property, context: UpdateContext): void {
        switch (property) {
            case Property.FLIP_VERTICAL:
                update_flip_vertical(context);
                break;
            case Property.FLIP_HORIZONTAL:
                update_flip_horizontal(context);
                break;
            case Property.FLIP_DIAGONAL:
                update_flip_diagonal(context);
                break;
        }
    }

    function is_flip_mesh(mesh: IBaseMeshAndThree): mesh is IMeshWithFlip {
        return typeof (mesh as IMeshWithFlip).get_flip === 'function';
    }

    // === Flip Vertical ===

    function read_flip_vertical(context: ReadContext): ReadResult<boolean> {
        const { meshes } = context;
        const values_by_id = new Map<number, boolean>();

        let first_value: boolean | undefined;
        let has_differences = false;

        for (const mesh of meshes) {
            if (!is_flip_mesh(mesh)) continue;

            const flip = mesh.get_flip();
            const is_vertical = flip === FlipMode.VERTICAL;
            values_by_id.set(mesh.mesh_data.id, is_vertical);

            if (first_value === undefined) {
                first_value = is_vertical;
            } else if (first_value !== is_vertical) {
                has_differences = true;
            }
        }

        return {
            value: has_differences ? undefined : first_value,
            values_by_id,
            has_differences,
        };
    }

    function update_flip_vertical(context: UpdateContext): void {
        const { meshes, value } = context;
        const vertical = value as boolean;

        for (const mesh of meshes) {
            if (!is_flip_mesh(mesh)) continue;

            mesh.set_flip(vertical ? FlipMode.VERTICAL : FlipMode.NONE);
        }
    }

    // === Flip Horizontal ===

    function read_flip_horizontal(context: ReadContext): ReadResult<boolean> {
        const { meshes } = context;
        const values_by_id = new Map<number, boolean>();

        let first_value: boolean | undefined;
        let has_differences = false;

        for (const mesh of meshes) {
            if (!is_flip_mesh(mesh)) continue;

            const flip = mesh.get_flip();
            const is_horizontal = flip === FlipMode.HORIZONTAL;
            values_by_id.set(mesh.mesh_data.id, is_horizontal);

            if (first_value === undefined) {
                first_value = is_horizontal;
            } else if (first_value !== is_horizontal) {
                has_differences = true;
            }
        }

        return {
            value: has_differences ? undefined : first_value,
            values_by_id,
            has_differences,
        };
    }

    function update_flip_horizontal(context: UpdateContext): void {
        const { meshes, value } = context;
        const horizontal = value as boolean;

        for (const mesh of meshes) {
            if (!is_flip_mesh(mesh)) continue;

            mesh.set_flip(horizontal ? FlipMode.HORIZONTAL : FlipMode.NONE);
        }
    }

    // === Flip Diagonal ===

    function read_flip_diagonal(context: ReadContext): ReadResult<boolean> {
        const { meshes } = context;
        const values_by_id = new Map<number, boolean>();

        let first_value: boolean | undefined;
        let has_differences = false;

        for (const mesh of meshes) {
            if (!is_flip_mesh(mesh)) continue;

            const flip = mesh.get_flip();
            const is_diagonal = flip === FlipMode.DIAGONAL;
            values_by_id.set(mesh.mesh_data.id, is_diagonal);

            if (first_value === undefined) {
                first_value = is_diagonal;
            } else if (first_value !== is_diagonal) {
                has_differences = true;
            }
        }

        return {
            value: has_differences ? undefined : first_value,
            values_by_id,
            has_differences,
        };
    }

    function update_flip_diagonal(context: UpdateContext): void {
        const { meshes, value } = context;
        const diagonal = value as boolean;

        for (const mesh of meshes) {
            if (!is_flip_mesh(mesh)) continue;

            mesh.set_flip(diagonal ? FlipMode.DIAGONAL : FlipMode.NONE);
        }
    }

    return {
        properties,
        read,
        update,
    };
}
