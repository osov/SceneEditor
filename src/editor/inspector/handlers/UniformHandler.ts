/**
 * UniformHandler - обработчик uniform свойств материалов
 *
 * Обрабатывает: uniform_sampler2d, uniform_float, uniform_range, uniform_vec2,
 *              uniform_vec3, uniform_vec4, uniform_color
 *
 * Uniforms - гибридный случай:
 * - Когда mesh выбран в сцене, обновляем uniform для конкретного mesh
 * - Когда материал выбран в Asset Browser, обновляем uniform для оригинального материала
 */

import { Color, Vector2, Vector3, Vector4 } from 'three';
import { Property } from '../../../core/inspector/IInspectable';
import type {
    IPropertyHandler,
    ReadContext,
    ReadResult,
    UpdateContext,
    HandlerParams,
} from './types';
import { get_basename, get_file_name } from '../../../render_engine/helpers/utils';
import { Services } from '@editor/core';
import type { IBaseMeshAndThree } from '../../../render_engine/types';
import { MultipleMaterialMesh } from '../../../render_engine/objects/multiple_material_mesh';
import type { Slice9Mesh } from '../../../render_engine/objects/slice9';

/** Данные действия для uniform (action_data) */
export interface UniformActionData {
    /** Имя uniform свойства */
    uniform_name: string;
    /** Индекс слота материала (для MultipleMaterialMesh) */
    slot_index?: number;
}

/** Параметры UniformHandler */
export interface UniformHandlerParams extends HandlerParams {
    /** Получить список выбранных материалов */
    get_selected_materials?: () => string[];
}

/** Создать UniformHandler */
export function create_uniform_handler(params?: UniformHandlerParams): IPropertyHandler {
    const properties: Property[] = [
        Property.UNIFORM_SAMPLER2D,
        Property.UNIFORM_FLOAT,
        Property.UNIFORM_RANGE,
        Property.UNIFORM_VEC2,
        Property.UNIFORM_VEC3,
        Property.UNIFORM_VEC4,
        Property.UNIFORM_COLOR,
    ];

    const get_selected_materials = params?.get_selected_materials;

    function read(_property: Property, _context: ReadContext): ReadResult<unknown> {
        // Uniforms читаются динамически из MaterialFieldProvider
        // В контексте handler мы только обновляем значения
        return { value: undefined, values_by_id: new Map(), has_differences: false };
    }

    function update(property: Property, context: UpdateContext): void {
        switch (property) {
            case Property.UNIFORM_SAMPLER2D:
                update_uniform_sampler2d(context);
                break;
            case Property.UNIFORM_FLOAT:
                update_uniform_float(context);
                break;
            case Property.UNIFORM_RANGE:
                update_uniform_range(context);
                break;
            case Property.UNIFORM_VEC2:
                update_uniform_vec2(context);
                break;
            case Property.UNIFORM_VEC3:
                update_uniform_vec3(context);
                break;
            case Property.UNIFORM_VEC4:
                update_uniform_vec4(context);
                break;
            case Property.UNIFORM_COLOR:
                update_uniform_color(context);
                break;
        }
    }

    // === Uniform Internal Helper ===

    /**
     * Парсит action_data в формат UniformActionData
     * Поддерживает как старый формат (строка) так и новый (объект)
     */
    function parse_action_data(action_data: unknown): UniformActionData | undefined {
        // Новый формат: объект с uniform_name и slot_index
        if (typeof action_data === 'object' && action_data !== null) {
            const data = action_data as Record<string, unknown>;
            if (typeof data.uniform_name === 'string') {
                return {
                    uniform_name: data.uniform_name,
                    slot_index: typeof data.slot_index === 'number' ? data.slot_index : undefined
                };
            }
        }
        // Старый формат: строка (только имя uniform)
        if (typeof action_data === 'string') {
            return { uniform_name: action_data };
        }
        return undefined;
    }

    function update_uniform_internal(context: UpdateContext, uniform_value: unknown, event_value?: unknown): void {
        const { ids, meshes, action_data } = context;

        const parsed = parse_action_data(action_data);
        if (parsed === undefined) {
            Services.logger.error('[UniformHandler.update_uniform_internal] invalid action_data:', action_data);
            return;
        }

        const { uniform_name, slot_index } = parsed;
        const emit_value = event_value ?? uniform_value;

        for (const id of ids) {
            const mesh = meshes.find((m) => m.mesh_data.id === id);

            if (mesh !== undefined) {
                // Режим mesh: обновляем uniform для конкретного mesh
                update_mesh_uniform(mesh, uniform_name, uniform_value, emit_value, slot_index);
            } else {
                // Режим материала: обновляем uniform для оригинального материала
                update_material_asset_uniform(id, uniform_name, uniform_value, emit_value);
            }
        }
    }

    function update_mesh_uniform(
        mesh: IBaseMeshAndThree,
        uniform_name: string,
        uniform_value: unknown,
        emit_value: unknown,
        slot_index?: number
    ): void {
        // Для моделей (MultipleMaterialMesh/AnimatedMesh)
        if (mesh instanceof MultipleMaterialMesh) {
            const materials = mesh.get_materials();

            if (slot_index !== undefined) {
                // Применяем только к указанному слоту
                if (slot_index >= 0 && slot_index < materials.length) {
                    Services.resources.set_material_uniform_for_multiple_material_mesh(
                        mesh as unknown as Parameters<typeof Services.resources.set_material_uniform_for_multiple_material_mesh>[0],
                        slot_index,
                        uniform_name,
                        uniform_value
                    );
                    Services.event_bus.emit('materials:changed', {
                        material_name: materials[slot_index].name,
                        property: uniform_name,
                        value: emit_value,
                        slot_index,
                    });
                } else {
                    Services.logger.warn('[UniformHandler] Invalid slot_index:', slot_index, 'materials count:', materials.length);
                }
            } else {
                // Старое поведение: применяем ко всем материалам
                for (let i = 0; i < materials.length; i++) {
                    Services.resources.set_material_uniform_for_multiple_material_mesh(
                        mesh as unknown as Parameters<typeof Services.resources.set_material_uniform_for_multiple_material_mesh>[0],
                        i,
                        uniform_name,
                        uniform_value
                    );
                }
                if (materials.length > 0) {
                    Services.event_bus.emit('materials:changed', {
                        material_name: materials[0].name,
                        property: uniform_name,
                        value: emit_value,
                    });
                }
            }
        } else {
            // Для обычных mesh (Slice9Mesh, etc.)
            Services.resources.set_material_uniform_for_mesh(mesh, uniform_name, uniform_value);
            const mesh_material = (mesh as Slice9Mesh).material;
            if (mesh_material !== undefined) {
                mesh_material.needsUpdate = true;
                Services.event_bus.emit('materials:changed', {
                    material_name: mesh_material.name,
                    property: uniform_name,
                    value: emit_value,
                });
            }
        }
    }

    function update_material_asset_uniform(
        id: number,
        uniform_name: string,
        uniform_value: unknown,
        emit_value: unknown
    ): void {
        // Получаем список выбранных материалов
        const selected_materials = get_selected_materials?.() ?? [];
        const material_path = selected_materials[id];

        if (material_path === undefined) {
            Services.logger.error('[UniformHandler] Material path not found for id:', id);
            return;
        }

        const material_name = get_file_name(get_basename(material_path));
        const material = Services.resources.get_material_info(material_name);

        if (material === undefined) {
            Services.logger.error('[UniformHandler] Material not found:', material_name);
            return;
        }

        // Обновляем uniform в инстансе материала
        const instance = material.instances[material.origin];
        if (instance?.uniforms !== undefined) {
            const uniform = instance.uniforms[uniform_name] as { value: unknown } | undefined;
            if (uniform !== undefined) {
                uniform.value = uniform_value;
            }
            instance.needsUpdate = true;
        }

        // Сохраняем в оригинальный материал
        Services.resources.set_material_uniform_for_original(material.name, uniform_name, uniform_value);

        Services.event_bus.emit('materials:changed', {
            material_name: material.name,
            property: uniform_name,
            value: emit_value,
        });
    }

    // === Uniform Type Handlers ===

    function update_uniform_sampler2d(context: UpdateContext): void {
        const texture_value = context.value as string;
        const parts = texture_value.split('/');
        // Если есть '/', то первая часть - atlas, вторая - texture_name
        // Если нет '/', то всё значение - texture_name, atlas пустой
        const texture_name = parts.length > 1 ? parts[1] : parts[0];
        const atlas = parts.length > 1 ? parts[0] : '';
        const texture = Services.resources.get_texture(texture_name, atlas).texture;
        update_uniform_internal(context, texture, context.value);
    }

    function update_uniform_float(context: UpdateContext): void {
        update_uniform_internal(context, context.value as number);
    }

    function update_uniform_range(context: UpdateContext): void {
        update_uniform_internal(context, context.value as number);
    }

    function update_uniform_vec2(context: UpdateContext): void {
        update_uniform_internal(context, context.value as Vector2);
    }

    function update_uniform_vec3(context: UpdateContext): void {
        update_uniform_internal(context, context.value as Vector3);
    }

    function update_uniform_vec4(context: UpdateContext): void {
        update_uniform_internal(context, context.value as Vector4);
    }

    function update_uniform_color(context: UpdateContext): void {
        const color = new Color(context.value as string);
        const value = new Vector3(color.r, color.g, color.b);
        update_uniform_internal(context, value, context.value);
    }

    return {
        properties,
        read,
        update,
    };
}
