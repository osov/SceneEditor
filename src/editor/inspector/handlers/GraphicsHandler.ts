/**
 * GraphicsHandler - обработчик графических свойств
 *
 * Обрабатывает: color, alpha, texture, material, blend_mode, slice9
 */

import { Vector2, type Blending } from 'three';
import type { IBaseMeshAndThree } from '../../../render_engine/types';
import { Property } from '../../../core/inspector/IInspectable';
import {
    type IPropertyHandler,
    type ReadContext,
    type ReadResult,
    type UpdateContext,
    type HandlerParams,
} from './types';
import {
    BlendMode,
    get_property_converters,
} from '../PropertyConvertersService';

/** Интерфейс для mesh с alpha */
interface IMeshWithAlpha extends IBaseMeshAndThree {
    get_alpha(): number;
    set_alpha(alpha: number): void;
    fillOpacity?: number;
}

/** Интерфейс для mesh с текстурой */
interface IMeshWithTexture extends IBaseMeshAndThree {
    get_texture(): [string, string];
    set_texture(name: string, atlas?: string): void;
}

/** Интерфейс для mesh со slice9 */
interface IMeshWithSlice9 extends IBaseMeshAndThree {
    get_slice(): Vector2;
    set_slice(x: number, y: number): void;
}

/** Интерфейс для mesh с материалом */
interface IMeshWithMaterial extends IBaseMeshAndThree {
    material?: { blending?: Blending; needsUpdate?: boolean };
    get_material_name?: () => string;
    set_material?: (name: string) => void;
}

/** Создать GraphicsHandler */
export function create_graphics_handler(_params?: HandlerParams): IPropertyHandler {
    const converters = get_property_converters();

    const properties: Property[] = [
        Property.COLOR,
        Property.ALPHA,
        Property.TEXTURE,
        Property.SLICE9,
        Property.BLEND_MODE,
        Property.MATERIAL,
    ];

    function read(property: Property, context: ReadContext): ReadResult<unknown> {
        switch (property) {
            case Property.COLOR:
                return read_color(context);
            case Property.ALPHA:
                return read_alpha(context);
            case Property.TEXTURE:
                return read_texture(context);
            case Property.SLICE9:
                return read_slice9(context);
            case Property.BLEND_MODE:
                return read_blend_mode(context);
            case Property.MATERIAL:
                return read_material(context);
            default:
                return { value: undefined, values_by_id: new Map(), has_differences: false };
        }
    }

    function update(property: Property, context: UpdateContext): void {
        switch (property) {
            case Property.COLOR:
                update_color(context);
                break;
            case Property.ALPHA:
                update_alpha(context);
                break;
            case Property.TEXTURE:
                update_texture(context);
                break;
            case Property.SLICE9:
                update_slice9(context);
                break;
            case Property.BLEND_MODE:
                update_blend_mode(context);
                break;
            case Property.MATERIAL:
                update_material(context);
                break;
        }
    }

    // === Color ===

    function read_color(context: ReadContext): ReadResult<string> {
        const { meshes } = context;
        const values_by_id = new Map<number, string>();

        let first_color: string | undefined;
        let has_differences = false;

        for (const mesh of meshes) {
            const color = mesh.get_color();
            values_by_id.set(mesh.mesh_data.id, color);

            if (first_color === undefined) {
                first_color = color;
            } else if (first_color !== color) {
                has_differences = true;
            }
        }

        return {
            value: has_differences ? undefined : first_color,
            values_by_id,
            has_differences,
        };
    }

    function update_color(context: UpdateContext): void {
        const { meshes, value } = context;
        const color = value as string;

        for (const mesh of meshes) {
            mesh.set_color(color);
        }
    }

    // === Alpha ===

    function read_alpha(context: ReadContext): ReadResult<number> {
        const { meshes } = context;
        const values_by_id = new Map<number, number>();

        let first_alpha: number | undefined;
        let has_differences = false;

        for (const mesh of meshes) {
            const alpha = get_alpha(mesh);
            if (alpha !== undefined) {
                values_by_id.set(mesh.mesh_data.id, alpha);

                if (first_alpha === undefined) {
                    first_alpha = alpha;
                } else if (first_alpha !== alpha) {
                    has_differences = true;
                }
            }
        }

        return {
            value: has_differences ? undefined : first_alpha,
            values_by_id,
            has_differences,
        };
    }

    function get_alpha(mesh: IBaseMeshAndThree): number | undefined {
        const mesh_with_alpha = mesh as IMeshWithAlpha;

        // Для текстовых mesh используем fillOpacity
        if (mesh_with_alpha.fillOpacity !== undefined) {
            return mesh_with_alpha.fillOpacity;
        }

        // Для остальных используем get_alpha
        if (typeof mesh_with_alpha.get_alpha === 'function') {
            return mesh_with_alpha.get_alpha();
        }

        return undefined;
    }

    function set_alpha(mesh: IBaseMeshAndThree, alpha: number): void {
        const mesh_with_alpha = mesh as IMeshWithAlpha;

        // Для текстовых mesh используем fillOpacity
        if (mesh_with_alpha.fillOpacity !== undefined) {
            mesh_with_alpha.fillOpacity = alpha;
            return;
        }

        // Для остальных используем set_alpha
        if (typeof mesh_with_alpha.set_alpha === 'function') {
            mesh_with_alpha.set_alpha(alpha);
        }
    }

    function update_alpha(context: UpdateContext): void {
        const { meshes, value } = context;
        const alpha = value as number;

        for (const mesh of meshes) {
            set_alpha(mesh, alpha);
        }
    }

    // === Texture ===

    function read_texture(context: ReadContext): ReadResult<string> {
        const { meshes } = context;
        const values_by_id = new Map<number, string>();

        let first_texture: string | undefined;
        let has_differences = false;

        for (const mesh of meshes) {
            const mesh_with_texture = mesh as IMeshWithTexture;
            if (typeof mesh_with_texture.get_texture !== 'function') continue;

            const [name] = mesh_with_texture.get_texture();
            values_by_id.set(mesh.mesh_data.id, name);

            if (first_texture === undefined) {
                first_texture = name;
            } else if (first_texture !== name) {
                has_differences = true;
            }
        }

        return {
            value: has_differences ? undefined : first_texture,
            values_by_id,
            has_differences,
        };
    }

    function update_texture(context: UpdateContext): void {
        const { meshes, value } = context;
        const texture = value as string;

        for (const mesh of meshes) {
            const mesh_with_texture = mesh as IMeshWithTexture;
            if (typeof mesh_with_texture.set_texture !== 'function') continue;

            if (texture !== undefined && texture !== '') {
                // Сохраняем текущий атлас
                const [, atlas] = mesh_with_texture.get_texture();
                mesh_with_texture.set_texture(texture, atlas);
            } else {
                mesh_with_texture.set_texture('');
            }
        }
    }

    // === Slice9 ===

    function read_slice9(context: ReadContext): ReadResult<Vector2> {
        const { meshes } = context;
        const values_by_id = new Map<number, Vector2>();

        let first_slice: Vector2 | undefined;
        let has_differences = false;

        for (const mesh of meshes) {
            const mesh_with_slice = mesh as IMeshWithSlice9;
            if (typeof mesh_with_slice.get_slice !== 'function') continue;

            const slice = mesh_with_slice.get_slice();
            values_by_id.set(mesh.mesh_data.id, slice.clone());

            if (first_slice === undefined) {
                first_slice = slice;
            } else if (first_slice.x !== slice.x || first_slice.y !== slice.y) {
                has_differences = true;
            }
        }

        return {
            value: first_slice,
            values_by_id,
            has_differences,
        };
    }

    function update_slice9(context: UpdateContext): void {
        const { meshes, value, axis_info } = context;
        const slice = value as Vector2;

        for (const mesh of meshes) {
            const mesh_with_slice = mesh as IMeshWithSlice9;
            if (typeof mesh_with_slice.set_slice !== 'function') continue;

            const current = mesh_with_slice.get_slice();
            const x = axis_info.changed_x ? slice.x : current.x;
            const y = axis_info.changed_y ? slice.y : current.y;

            mesh_with_slice.set_slice(x, y);
        }
    }

    // === Blend Mode ===

    function read_blend_mode(context: ReadContext): ReadResult<BlendMode> {
        const { meshes } = context;
        const values_by_id = new Map<number, BlendMode>();

        let first_mode: BlendMode | undefined;
        let has_differences = false;

        for (const mesh of meshes) {
            const mesh_with_material = mesh as IMeshWithMaterial;
            if (mesh_with_material.material?.blending === undefined) continue;

            const mode = converters.threejs_blending_to_blend_mode(mesh_with_material.material.blending);
            values_by_id.set(mesh.mesh_data.id, mode);

            if (first_mode === undefined) {
                first_mode = mode;
            } else if (first_mode !== mode) {
                has_differences = true;
            }
        }

        return {
            value: has_differences ? undefined : first_mode,
            values_by_id,
            has_differences,
        };
    }

    function update_blend_mode(context: UpdateContext): void {
        const { meshes, value } = context;
        const mode = value as BlendMode;
        const blending = converters.blend_mode_to_threejs(mode);

        for (const mesh of meshes) {
            const mesh_with_material = mesh as IMeshWithMaterial;
            if (mesh_with_material.material === undefined) continue;

            mesh_with_material.material.blending = blending;
            mesh_with_material.material.needsUpdate = true;
        }
    }

    // === Material ===

    function read_material(context: ReadContext): ReadResult<string> {
        const { meshes } = context;
        const values_by_id = new Map<number, string>();

        let first_material: string | undefined;
        let has_differences = false;

        for (const mesh of meshes) {
            const mesh_with_material = mesh as IMeshWithMaterial;
            if (typeof mesh_with_material.get_material_name !== 'function') continue;

            const name = mesh_with_material.get_material_name();
            values_by_id.set(mesh.mesh_data.id, name);

            if (first_material === undefined) {
                first_material = name;
            } else if (first_material !== name) {
                has_differences = true;
            }
        }

        return {
            value: has_differences ? undefined : first_material,
            values_by_id,
            has_differences,
        };
    }

    function update_material(context: UpdateContext): void {
        const { meshes, value } = context;
        const material = value as string;

        for (const mesh of meshes) {
            const mesh_with_material = mesh as IMeshWithMaterial;
            if (typeof mesh_with_material.set_material !== 'function') continue;

            mesh_with_material.set_material(material);
        }
    }

    return {
        properties,
        read,
        update,
    };
}
