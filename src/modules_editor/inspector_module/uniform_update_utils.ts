/**
 * Утилиты для обновления uniform-ов материалов
 *
 * Консолидирует повторяющийся код updateUniform* функций
 */

import { Vector2, Vector3, Vector4, Color, Texture } from 'three';
import type { IBaseMeshAndThree } from '../../render_engine/types';
import type { Slice9Mesh } from '../../render_engine/objects/slice9';
import { get_file_name, get_basename } from '../../render_engine/helpers/utils';

/**
 * Контекст для обновления uniform-ов
 */
export interface UniformUpdateContext {
    selected_list: IBaseMeshAndThree[];
    selected_materials: { [key: number]: string };
    resources: {
        get_texture: (name: string, atlas: string) => { texture: Texture };
        get_material_info: (name: string) => MaterialInfo | undefined;
        set_material_uniform_for_mesh: (mesh: IBaseMeshAndThree, name: string, value: unknown) => void;
        set_material_uniform_for_original: (material_name: string, name: string, value: unknown) => void;
    };
    event_bus: {
        emit: (event: string, data: unknown) => void;
    };
}

interface MaterialInfo {
    name: string;
    origin: string;
    instances: { [key: string]: { uniforms?: { [key: string]: { value: unknown } }; needsUpdate: boolean } };
}

/**
 * Информация об изменении uniform-а
 */
export interface UniformChangeInfo {
    ids: number[];
    data: {
        property: { title: string };
        event: { value: unknown };
    };
}

/**
 * Обновить uniform (базовая функция)
 */
function update_uniform_value(
    info: UniformChangeInfo,
    value: unknown,
    ctx: UniformUpdateContext
): void {
    info.ids.forEach((id) => {
        // Проверяем, есть ли объект в _selected_list (режим объекта)
        const mesh = ctx.selected_list.find((item) => item.mesh_data.id === id);

        if (mesh !== undefined) {
            // Режим объекта - обновляем uniform на материале объекта
            ctx.resources.set_material_uniform_for_mesh(mesh, info.data.property.title, value);
            const meshMaterial = (mesh as Slice9Mesh).material;
            if (meshMaterial !== undefined) {
                meshMaterial.needsUpdate = true;
                ctx.event_bus.emit('materials:changed', {
                    material_name: meshMaterial.name,
                    property: info.data.property.title,
                    value: value
                });
            }
        } else {
            // Режим материала в ассетах
            const material_name = get_file_name(get_basename(ctx.selected_materials[id]));
            const material = ctx.resources.get_material_info(material_name);
            if (material === undefined) return;

            const instance = material.instances[material.origin];
            if (instance?.uniforms !== undefined) {
                const uniform = instance.uniforms[info.data.property.title] as { value: unknown };
                if (uniform !== undefined) {
                    uniform.value = value;
                }
                instance.needsUpdate = true;
            }
            // Сохраняем uniform в оригинальный материал
            ctx.resources.set_material_uniform_for_original(material.name, info.data.property.title, value);
            ctx.event_bus.emit('materials:changed', {
                material_name: material.name,
                property: info.data.property.title,
                value: value
            });
        }
    });
}

/**
 * Обновить uniform типа sampler2D (текстура)
 */
export function update_uniform_sampler2d(
    info: UniformChangeInfo,
    ctx: UniformUpdateContext
): void {
    const textureValue = info.data.event.value as string;
    const atlas = textureValue.split('/')[0];
    const texture_name = textureValue.split('/')[1];
    const texture = ctx.resources.get_texture(texture_name, atlas ?? '').texture;
    update_uniform_value(info, texture, ctx);
}

/**
 * Обновить uniform типа float
 */
export function update_uniform_float(
    info: UniformChangeInfo,
    ctx: UniformUpdateContext
): void {
    const value = info.data.event.value as number;
    update_uniform_value(info, value, ctx);
}

/**
 * Обновить uniform типа range (аналогично float)
 */
export function update_uniform_range(
    info: UniformChangeInfo,
    ctx: UniformUpdateContext
): void {
    const value = info.data.event.value as number;
    update_uniform_value(info, value, ctx);
}

/**
 * Обновить uniform типа vec2
 */
export function update_uniform_vec2(
    info: UniformChangeInfo,
    ctx: UniformUpdateContext
): void {
    const value = info.data.event.value as Vector2;
    update_uniform_value(info, value, ctx);
}

/**
 * Обновить uniform типа vec3
 */
export function update_uniform_vec3(
    info: UniformChangeInfo,
    ctx: UniformUpdateContext
): void {
    const value = info.data.event.value as Vector3;
    update_uniform_value(info, value, ctx);
}

/**
 * Обновить uniform типа vec4
 */
export function update_uniform_vec4(
    info: UniformChangeInfo,
    ctx: UniformUpdateContext
): void {
    const value = info.data.event.value as Vector4;
    update_uniform_value(info, value, ctx);
}

/**
 * Обновить uniform типа color (конвертируется в vec3)
 */
export function update_uniform_color(
    info: UniformChangeInfo,
    ctx: UniformUpdateContext
): void {
    const color = new Color(info.data.event.value as string);
    const value = new Vector3(color.r, color.g, color.b);
    update_uniform_value(info, value, ctx);
}
