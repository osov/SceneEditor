/**
 * BaseHandler - обработчик базовых свойств объекта
 *
 * Обрабатывает: name, active, visible
 */

import { Property } from '../../../core/inspector/IInspectable';
import {
    type IPropertyHandler,
    type ReadContext,
    type ReadResult,
    type UpdateContext,
    type HandlerParams,
} from './types';

/** Интерфейс для mesh с активностью */
interface IMeshWithActive {
    mesh_data: { id: number };
    get_active(): boolean;
    set_active(active: boolean): void;
    children: IMeshWithActive[];
}

/** Создать BaseHandler */
export function create_base_handler(params?: HandlerParams): IPropertyHandler {
    const properties: Property[] = [
        Property.NAME,
        Property.ACTIVE,
        Property.VISIBLE,
    ];

    function read(property: Property, context: ReadContext): ReadResult<unknown> {
        switch (property) {
            case Property.NAME:
                return read_name(context);
            case Property.ACTIVE:
                return read_active(context);
            case Property.VISIBLE:
                return read_visible(context);
            default:
                return { value: undefined, values_by_id: new Map(), has_differences: false };
        }
    }

    function update(property: Property, context: UpdateContext): void {
        switch (property) {
            case Property.NAME:
                update_name(context);
                break;
            case Property.ACTIVE:
                update_active(context);
                break;
            case Property.VISIBLE:
                update_visible(context);
                break;
        }
    }

    // === Name ===

    function read_name(context: ReadContext): ReadResult<string> {
        const { meshes } = context;
        const values_by_id = new Map<number, string>();

        let first_name: string | undefined;
        let has_differences = false;

        for (const mesh of meshes) {
            const name = mesh.name;
            values_by_id.set(mesh.mesh_data.id, name);

            if (first_name === undefined) {
                first_name = name;
            } else if (first_name !== name) {
                has_differences = true;
            }
        }

        return {
            value: has_differences ? undefined : first_name,
            values_by_id,
            has_differences,
        };
    }

    function update_name(context: UpdateContext): void {
        const { meshes, value } = context;
        const name = value as string;

        for (const mesh of meshes) {
            mesh.name = name;
        }

        params?.on_update_ui?.();
    }

    // === Active ===

    function read_active(context: ReadContext): ReadResult<boolean> {
        const { meshes } = context;
        const values_by_id = new Map<number, boolean>();

        let first_active: boolean | undefined;
        let has_differences = false;

        for (const mesh of meshes) {
            const mesh_with_active = mesh as unknown as IMeshWithActive;
            if (typeof mesh_with_active.get_active !== 'function') continue;

            const active = mesh_with_active.get_active();
            values_by_id.set(mesh.mesh_data.id, active);

            if (first_active === undefined) {
                first_active = active;
            } else if (first_active !== active) {
                has_differences = true;
            }
        }

        return {
            value: has_differences ? undefined : first_active,
            values_by_id,
            has_differences,
        };
    }

    function update_active(context: UpdateContext): void {
        const { meshes, value } = context;
        const active = value as boolean;

        for (const mesh of meshes) {
            const mesh_with_active = mesh as unknown as IMeshWithActive;
            if (typeof mesh_with_active.set_active !== 'function') continue;

            mesh_with_active.set_active(active);

            // Рекурсивно обновить детей
            update_children_active(mesh_with_active.children, active);
        }

        params?.on_update_ui?.();
    }

    function update_children_active(children: IMeshWithActive[], state: boolean): void {
        for (const child of children) {
            if (typeof child.set_active === 'function') {
                child.set_active(state);
                update_children_active(child.children, state);
            }
        }
    }

    // === Visible ===

    function read_visible(context: ReadContext): ReadResult<boolean> {
        const { meshes } = context;
        const values_by_id = new Map<number, boolean>();

        let first_visible: boolean | undefined;
        let has_differences = false;

        for (const mesh of meshes) {
            const visible = mesh.visible;
            values_by_id.set(mesh.mesh_data.id, visible);

            if (first_visible === undefined) {
                first_visible = visible;
            } else if (first_visible !== visible) {
                has_differences = true;
            }
        }

        return {
            value: has_differences ? undefined : first_visible,
            values_by_id,
            has_differences,
        };
    }

    function update_visible(context: UpdateContext): void {
        const { meshes, value } = context;
        const visible = value as boolean;

        for (const mesh of meshes) {
            mesh.visible = visible;
        }

        params?.on_update_ui?.();
    }

    return {
        properties,
        read,
        update,
    };
}
