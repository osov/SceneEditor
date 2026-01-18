/**
 * TextHandler - обработчик текстовых свойств
 *
 * Обрабатывает: text, font, font_size, text_align, line_height
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

/** Интерфейс для текстового mesh */
interface ITextMesh extends IBaseMeshAndThree {
    text: string;
    font: string;
    fontSize: number;
    textAlign: 'left' | 'right' | 'center' | 'justify';
    lineHeight: number;
    set_text?: (text: string) => void;
    set_font?: (name: string, is_sync?: boolean) => void;
    get_font_name?: () => string;
}

/** Создать TextHandler */
export function create_text_handler(params?: HandlerParams): IPropertyHandler {
    const properties: Property[] = [
        Property.TEXT,
        Property.FONT,
        Property.FONT_SIZE,
        Property.TEXT_ALIGN,
        Property.LINE_HEIGHT,
    ];

    function read(property: Property, context: ReadContext): ReadResult<unknown> {
        switch (property) {
            case Property.TEXT:
                return read_text(context);
            case Property.FONT:
                return read_font(context);
            case Property.FONT_SIZE:
                return read_font_size(context);
            case Property.TEXT_ALIGN:
                return read_text_align(context);
            case Property.LINE_HEIGHT:
                return read_line_height(context);
            default:
                return { value: undefined, values_by_id: new Map(), has_differences: false };
        }
    }

    function update(property: Property, context: UpdateContext): void {
        switch (property) {
            case Property.TEXT:
                update_text(context);
                break;
            case Property.FONT:
                update_font(context);
                break;
            case Property.FONT_SIZE:
                update_font_size(context);
                break;
            case Property.TEXT_ALIGN:
                update_text_align(context);
                break;
            case Property.LINE_HEIGHT:
                update_line_height(context);
                break;
        }
    }

    function is_text_mesh(mesh: IBaseMeshAndThree): mesh is ITextMesh {
        return 'text' in mesh && 'fontSize' in mesh;
    }

    // === Text ===

    function read_text(context: ReadContext): ReadResult<string> {
        const { meshes } = context;
        const values_by_id = new Map<number, string>();

        let first_text: string | undefined;
        let has_differences = false;

        for (const mesh of meshes) {
            if (!is_text_mesh(mesh)) continue;

            values_by_id.set(mesh.mesh_data.id, mesh.text);

            if (first_text === undefined) {
                first_text = mesh.text;
            } else if (first_text !== mesh.text) {
                has_differences = true;
            }
        }

        return {
            value: has_differences ? undefined : first_text,
            values_by_id,
            has_differences,
        };
    }

    function update_text(context: UpdateContext): void {
        const { meshes, value } = context;
        const text = value as string;

        for (const mesh of meshes) {
            if (!is_text_mesh(mesh)) continue;

            if (typeof mesh.set_text === 'function') {
                mesh.set_text(text);
            } else {
                mesh.text = text;
            }
        }
    }

    // === Font ===

    function read_font(context: ReadContext): ReadResult<string> {
        const { meshes } = context;
        const values_by_id = new Map<number, string>();

        let first_font: string | undefined;
        let has_differences = false;

        for (const mesh of meshes) {
            if (!is_text_mesh(mesh)) continue;

            // Используем get_font_name() для получения имени шрифта
            const font = typeof mesh.get_font_name === 'function'
                ? mesh.get_font_name()
                : '';
            values_by_id.set(mesh.mesh_data.id, font);

            if (first_font === undefined) {
                first_font = font;
            } else if (first_font !== font) {
                has_differences = true;
            }
        }

        return {
            value: has_differences ? undefined : first_font,
            values_by_id,
            has_differences,
        };
    }

    function update_font(context: UpdateContext): void {
        const { meshes, value } = context;
        const font_name = value as string;

        for (const mesh of meshes) {
            if (!is_text_mesh(mesh)) continue;

            // Вызываем set_font() вместо прямого присваивания
            if (typeof mesh.set_font === 'function') {
                mesh.set_font(font_name);
            }
        }
    }

    // === Font Size ===

    function read_font_size(context: ReadContext): ReadResult<number> {
        const { meshes } = context;
        const values_by_id = new Map<number, number>();

        let first_size: number | undefined;
        let has_differences = false;

        for (const mesh of meshes) {
            if (!is_text_mesh(mesh)) continue;

            // Вычисляем эффективный размер шрифта учитывая scale
            const scale = Math.max(mesh.scale.x, mesh.scale.y);
            const effective_size = mesh.fontSize * scale;
            values_by_id.set(mesh.mesh_data.id, effective_size);

            if (first_size === undefined) {
                first_size = effective_size;
            } else if (Math.abs(first_size - effective_size) > 0.01) {
                has_differences = true;
            }
        }

        return {
            value: has_differences ? undefined : first_size,
            values_by_id,
            has_differences,
        };
    }

    function update_font_size(context: UpdateContext): void {
        const { meshes, value } = context;
        const font_size = value as number;

        for (const mesh of meshes) {
            if (!is_text_mesh(mesh)) continue;

            // Размер шрифта меняется через scale
            const delta = font_size / mesh.fontSize;
            mesh.scale.set(delta, delta, mesh.scale.z);
            mesh.transform_changed();
        }

        params?.on_transform_changed?.();
        params?.on_size_changed?.();
    }

    // === Text Align ===

    function read_text_align(context: ReadContext): ReadResult<string> {
        const { meshes } = context;
        const values_by_id = new Map<number, string>();

        let first_align: string | undefined;
        let has_differences = false;

        for (const mesh of meshes) {
            if (!is_text_mesh(mesh)) continue;

            const align = mesh.textAlign;
            values_by_id.set(mesh.mesh_data.id, align);

            if (first_align === undefined) {
                first_align = align;
            } else if (first_align !== align) {
                has_differences = true;
            }
        }

        return {
            value: has_differences ? undefined : first_align,
            values_by_id,
            has_differences,
        };
    }

    function update_text_align(context: UpdateContext): void {
        const { meshes, value } = context;
        const align = value as 'left' | 'right' | 'center' | 'justify';

        for (const mesh of meshes) {
            if (!is_text_mesh(mesh)) continue;
            mesh.textAlign = align;
        }
    }

    // === Line Height ===

    function read_line_height(context: ReadContext): ReadResult<number> {
        const { meshes } = context;
        const values_by_id = new Map<number, number>();

        let first_height: number | undefined;
        let has_differences = false;

        for (const mesh of meshes) {
            if (!is_text_mesh(mesh)) continue;

            const height = mesh.lineHeight ?? 1;
            values_by_id.set(mesh.mesh_data.id, height);

            if (first_height === undefined) {
                first_height = height;
            } else if (Math.abs(first_height - height) > 0.001) {
                has_differences = true;
            }
        }

        return {
            value: has_differences ? undefined : first_height,
            values_by_id,
            has_differences,
        };
    }

    function update_line_height(context: UpdateContext): void {
        const { meshes, value } = context;
        const height = value as number;

        for (const mesh of meshes) {
            if (!is_text_mesh(mesh)) continue;
            mesh.lineHeight = height;
        }
    }

    return {
        properties,
        read,
        update,
    };
}
