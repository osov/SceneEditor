/**
 * TransformHandler - обработчик трансформационных свойств
 *
 * Обрабатывает: position, rotation, scale, size, pivot, anchor
 */

import { Vector2, Vector3, MathUtils } from 'three';
import { Property } from '../../../core/inspector/IInspectable';
import { degToRad } from '../../../modules/utils';

const { radToDeg } = MathUtils;
import {
    type IPropertyHandler,
    type ReadContext,
    type ReadResult,
    type UpdateContext,
    type HandlerParams,
    compute_average_vector3,
    compute_average_vector2,
    has_vector3_differences,
    has_vector2_differences,
} from './types';
import {
    ScreenPointPreset,
    get_property_converters,
} from '../PropertyConvertersService';

/** Создать TransformHandler */
export function create_transform_handler(params?: HandlerParams): IPropertyHandler {
    const converters = get_property_converters();

    const properties: Property[] = [
        Property.POSITION,
        Property.ROTATION,
        Property.SCALE,
        Property.SIZE,
        Property.PIVOT,
        Property.ANCHOR,
        Property.ANCHOR_PRESET,
    ];

    function read(property: Property, context: ReadContext): ReadResult<unknown> {
        switch (property) {
            case Property.POSITION:
                return read_position(context);
            case Property.ROTATION:
                return read_rotation(context);
            case Property.SCALE:
                return read_scale(context);
            case Property.SIZE:
                return read_size(context);
            case Property.PIVOT:
                return read_pivot(context);
            case Property.ANCHOR:
                return read_anchor(context);
            case Property.ANCHOR_PRESET:
                return read_anchor_preset(context);
            default:
                return { value: undefined, values_by_id: new Map(), has_differences: false };
        }
    }

    function update(property: Property, context: UpdateContext): void {
        switch (property) {
            case Property.POSITION:
                update_position(context);
                break;
            case Property.ROTATION:
                update_rotation(context);
                break;
            case Property.SCALE:
                update_scale(context);
                break;
            case Property.SIZE:
                update_size(context);
                break;
            case Property.PIVOT:
                update_pivot(context);
                break;
            case Property.ANCHOR:
                update_anchor(context);
                break;
            case Property.ANCHOR_PRESET:
                update_anchor_preset(context);
                break;
        }
    }

    // === Position ===

    function read_position(context: ReadContext): ReadResult<Vector3> {
        const { meshes } = context;
        const values_by_id = new Map<number, Vector3>();

        for (const mesh of meshes) {
            values_by_id.set(mesh.mesh_data.id, mesh.get_position().clone());
        }

        const diffs = has_vector3_differences(meshes, (m) => m.get_position());
        const has_differences = diffs.diff_x || diffs.diff_y || diffs.diff_z;

        const value = compute_average_vector3(meshes, (m) => m.get_position());

        return { value, values_by_id, has_differences };
    }

    function update_position(context: UpdateContext): void {
        const { meshes, value, axis_info } = context;
        const pos = value as Vector3;

        // Вычисляем среднюю позицию для multi-select
        const average = compute_average_vector3(meshes, (m) => m.get_position());

        for (const mesh of meshes) {
            const current = mesh.get_position();

            const x = axis_info.dragged_x
                ? current.x + (pos.x - average.x)
                : axis_info.changed_x
                    ? pos.x
                    : current.x;

            const y = axis_info.dragged_y
                ? current.y + (pos.y - average.y)
                : axis_info.changed_y
                    ? pos.y
                    : current.y;

            const z = axis_info.dragged_z
                ? current.z + (pos.z - average.z)
                : axis_info.changed_z
                    ? pos.z
                    : current.z;

            mesh.set_position(x, y, z);
        }

        params?.on_transform_changed?.();
        params?.on_size_changed?.();
    }

    // === Rotation ===

    function read_rotation(context: ReadContext): ReadResult<Vector3> {
        const { meshes } = context;
        const values_by_id = new Map<number, Vector3>();

        for (const mesh of meshes) {
            // Конвертируем радианы в градусы для UI
            const rot = mesh.rotation;
            values_by_id.set(mesh.mesh_data.id, new Vector3(
                radToDeg(rot.x),
                radToDeg(rot.y),
                radToDeg(rot.z)
            ));
        }

        const diffs = has_vector3_differences(meshes, (m) => new Vector3(m.rotation.x, m.rotation.y, m.rotation.z));
        const has_differences = diffs.diff_x || diffs.diff_y || diffs.diff_z;

        const avg = compute_average_vector3(meshes, (m) => new Vector3(m.rotation.x, m.rotation.y, m.rotation.z));
        const value = new Vector3(radToDeg(avg.x), radToDeg(avg.y), radToDeg(avg.z));

        return { value, values_by_id, has_differences };
    }

    function update_rotation(context: UpdateContext): void {
        const { meshes, value, axis_info } = context;
        const raw_rot = value as Vector3;
        // Конвертируем градусы в радианы
        const rot = new Vector3(degToRad(raw_rot.x), degToRad(raw_rot.y), degToRad(raw_rot.z));

        for (const mesh of meshes) {
            const x = axis_info.changed_x ? rot.x : mesh.rotation.x;
            const y = axis_info.changed_y ? rot.y : mesh.rotation.y;
            const z = axis_info.changed_z ? rot.z : mesh.rotation.z;

            mesh.rotation.set(x, y, z);
            mesh.transform_changed();
        }

        params?.on_transform_changed?.();
        params?.on_size_changed?.();
    }

    // === Scale ===

    function read_scale(context: ReadContext): ReadResult<Vector3> {
        const { meshes } = context;
        const values_by_id = new Map<number, Vector3>();

        for (const mesh of meshes) {
            values_by_id.set(mesh.mesh_data.id, mesh.scale.clone());
        }

        const diffs = has_vector3_differences(meshes, (m) => m.scale);
        const has_differences = diffs.diff_x || diffs.diff_y || diffs.diff_z;

        const value = compute_average_vector3(meshes, (m) => m.scale);

        return { value, values_by_id, has_differences };
    }

    function update_scale(context: UpdateContext): void {
        const { meshes, value, axis_info } = context;
        const scale = value as Vector3;

        for (const mesh of meshes) {
            const x = axis_info.changed_x ? scale.x : mesh.get_scale().x;
            const y = axis_info.changed_y ? scale.y : mesh.get_scale().y;

            mesh.scale.set(x, y, 1);
            mesh.transform_changed();
        }

        params?.on_transform_changed?.();
        params?.on_size_changed?.();
    }

    // === Size ===

    function read_size(context: ReadContext): ReadResult<Vector2> {
        const { meshes } = context;
        const values_by_id = new Map<number, Vector2>();

        for (const mesh of meshes) {
            values_by_id.set(mesh.mesh_data.id, mesh.get_size().clone());
        }

        const diffs = has_vector2_differences(meshes, (m) => m.get_size());
        const has_differences = diffs.diff_x || diffs.diff_y;

        const value = compute_average_vector2(meshes, (m) => m.get_size());

        return { value, values_by_id, has_differences };
    }

    function update_size(context: UpdateContext): void {
        const { meshes, value, axis_info } = context;
        const size = value as Vector2;

        // Вычисляем средний размер для multi-select
        const average = compute_average_vector2(meshes, (m) => m.get_size());

        for (const mesh of meshes) {
            const current = mesh.get_size();

            const x = axis_info.dragged_x
                ? current.x + (size.x - average.x)
                : axis_info.changed_x
                    ? size.x
                    : current.x;

            const y = axis_info.dragged_y
                ? current.y + (size.y - average.y)
                : axis_info.changed_y
                    ? size.y
                    : current.y;

            mesh.set_size(x, y);
        }

        params?.on_size_changed?.();
    }

    // === Pivot ===

    function read_pivot(context: ReadContext): ReadResult<ScreenPointPreset> {
        const { meshes } = context;
        const values_by_id = new Map<number, ScreenPointPreset>();

        let first_preset: ScreenPointPreset | undefined;
        let has_differences = false;

        for (const mesh of meshes) {
            const pivot = mesh.get_pivot();
            const preset = converters.anchor_to_screen_preset(pivot); // Pivot использует ту же логику
            values_by_id.set(mesh.mesh_data.id, preset);

            if (first_preset === undefined) {
                first_preset = preset;
            } else if (first_preset !== preset) {
                has_differences = true;
            }
        }

        return {
            value: has_differences ? undefined : first_preset,
            values_by_id,
            has_differences,
        };
    }

    function update_pivot(context: UpdateContext): void {
        const { meshes, value } = context;
        const preset = value as ScreenPointPreset;
        const pivot = converters.screen_preset_to_pivot(preset);

        for (const mesh of meshes) {
            mesh.set_pivot(pivot.x, pivot.y, true);
        }

        params?.on_size_changed?.();
    }

    // === Anchor ===

    function read_anchor(context: ReadContext): ReadResult<Vector2> {
        const { meshes } = context;
        const values_by_id = new Map<number, Vector2>();

        for (const mesh of meshes) {
            values_by_id.set(mesh.mesh_data.id, mesh.get_anchor().clone());
        }

        const diffs = has_vector2_differences(meshes, (m) => m.get_anchor());
        const has_differences = diffs.diff_x || diffs.diff_y;

        const value = compute_average_vector2(meshes, (m) => m.get_anchor());

        return { value, values_by_id, has_differences };
    }

    function update_anchor(context: UpdateContext): void {
        const { meshes, value, axis_info } = context;
        const anchor = value as Vector2;

        for (const mesh of meshes) {
            const current = mesh.get_anchor();
            const x = axis_info.changed_x ? anchor.x : current.x;
            const y = axis_info.changed_y ? anchor.y : current.y;

            mesh.set_anchor(x, y);
        }

        params?.on_size_changed?.();
    }

    // === Anchor Preset ===

    function read_anchor_preset(context: ReadContext): ReadResult<ScreenPointPreset> {
        const { meshes } = context;
        const values_by_id = new Map<number, ScreenPointPreset>();

        let first_preset: ScreenPointPreset | undefined;
        let has_differences = false;

        for (const mesh of meshes) {
            const anchor = mesh.get_anchor();
            const preset = converters.anchor_to_screen_preset(anchor);
            values_by_id.set(mesh.mesh_data.id, preset);

            if (first_preset === undefined) {
                first_preset = preset;
            } else if (first_preset !== preset) {
                has_differences = true;
            }
        }

        return {
            value: has_differences ? undefined : first_preset,
            values_by_id,
            has_differences,
        };
    }

    function update_anchor_preset(context: UpdateContext): void {
        const { meshes, value } = context;
        const preset = value as ScreenPointPreset;
        const anchor = converters.screen_preset_to_anchor(preset);

        for (const mesh of meshes) {
            mesh.set_anchor(anchor.x, anchor.y);
        }

        params?.on_size_changed?.();
    }

    return {
        properties,
        read,
        update,
    };
}
