/**
 * Обработчики векторных полей
 *
 * Поддерживает типы: VECTOR_2, VECTOR_3, VECTOR_4, POINT_2D
 */

import type { FolderApi, BindingApi } from '@tweakpane/core';
import {
    PropertyType,
    type IFieldTypeHandler,
    type CreateBindingParams,
    type BindingResult,
    type NumberFormatParams,
} from '../../../core/inspector/types';

/** Расширенный тип привязки с поддержкой beforechange */
type ExtendedBinding = BindingApi<unknown, unknown> & {
    on(event: 'beforechange', handler: () => void): void;
};

/** Создать обработчик VECTOR_2 */
function create_vector2_handler(): IFieldTypeHandler {
    return {
        type: PropertyType.VECTOR_2,

        create_binding(params: CreateBindingParams): BindingResult | undefined {
            const { field, object_ids, folder, target_object } = params;
            const pane_folder = folder as FolderApi;

            const vector_params = field.params as { x: NumberFormatParams; y: NumberFormatParams } | undefined;

            const binding = pane_folder.addBinding(
                target_object,
                field.key,
                {
                    label: field.title ?? field.key,
                    readonly: field.readonly,
                    x: vector_params?.x ?? {},
                    y: vector_params?.y ?? {},
                }
            ) as ExtendedBinding;

            if (field.on_before_change !== undefined) {
                (binding as ExtendedBinding).on('beforechange', () => {
                    field.on_before_change?.({ ids: object_ids, field });
                });
            }

            if (field.on_change !== undefined) {
                binding.on('change', (event) => {
                    field.on_change?.({
                        ids: object_ids,
                        data: { field, event },
                    });
                });
            }

            return {
                binding,
                dispose: () => binding.dispose(),
            };
        },
    };
}

/** Создать обработчик VECTOR_3 */
function create_vector3_handler(): IFieldTypeHandler {
    return {
        type: PropertyType.VECTOR_3,

        create_binding(params: CreateBindingParams): BindingResult | undefined {
            const { field, object_ids, folder, target_object } = params;
            const pane_folder = folder as FolderApi;

            const vector_params = field.params as {
                x: NumberFormatParams;
                y: NumberFormatParams;
                z: NumberFormatParams;
            } | undefined;

            const binding = pane_folder.addBinding(
                target_object,
                field.key,
                {
                    label: field.title ?? field.key,
                    readonly: field.readonly,
                    x: vector_params?.x ?? {},
                    y: vector_params?.y ?? {},
                    z: vector_params?.z ?? {},
                }
            ) as ExtendedBinding;

            if (field.on_before_change !== undefined) {
                (binding as ExtendedBinding).on('beforechange', () => {
                    field.on_before_change?.({ ids: object_ids, field });
                });
            }

            if (field.on_change !== undefined) {
                binding.on('change', (event) => {
                    field.on_change?.({
                        ids: object_ids,
                        data: { field, event },
                    });
                });
            }

            return {
                binding,
                dispose: () => binding.dispose(),
            };
        },
    };
}

/** Создать обработчик VECTOR_4 */
function create_vector4_handler(): IFieldTypeHandler {
    return {
        type: PropertyType.VECTOR_4,

        create_binding(params: CreateBindingParams): BindingResult | undefined {
            const { field, object_ids, folder, target_object } = params;
            const pane_folder = folder as FolderApi;

            const vector_params = field.params as {
                x: NumberFormatParams;
                y: NumberFormatParams;
                z: NumberFormatParams;
                w: NumberFormatParams;
            } | undefined;

            const binding = pane_folder.addBinding(
                target_object,
                field.key,
                {
                    label: field.title ?? field.key,
                    readonly: field.readonly,
                    x: vector_params?.x ?? {},
                    y: vector_params?.y ?? {},
                    z: vector_params?.z ?? {},
                    w: vector_params?.w ?? {},
                }
            ) as ExtendedBinding;

            if (field.on_before_change !== undefined) {
                (binding as ExtendedBinding).on('beforechange', () => {
                    field.on_before_change?.({ ids: object_ids, field });
                });
            }

            if (field.on_change !== undefined) {
                binding.on('change', (event) => {
                    field.on_change?.({
                        ids: object_ids,
                        data: { field, event },
                    });
                });
            }

            return {
                binding,
                dispose: () => binding.dispose(),
            };
        },
    };
}

/** Создать обработчик POINT_2D (с 2D пикером) */
function create_point2d_handler(): IFieldTypeHandler {
    return {
        type: PropertyType.POINT_2D,

        create_binding(params: CreateBindingParams): BindingResult | undefined {
            const { field, object_ids, folder, target_object } = params;
            const pane_folder = folder as FolderApi;

            const point_params = field.params as {
                x: { min: number; max: number; step?: number; format?: (v: number) => string; disabled?: boolean };
                y: { min: number; max: number; step?: number; format?: (v: number) => string; disabled?: boolean };
            } | undefined;

            // Используем плагин extended-vector для 2D пикера
            const binding = pane_folder.addBinding(
                target_object,
                field.key,
                {
                    label: field.title ?? field.key,
                    readonly: field.readonly,
                    view: 'extended-point-nd',
                    x: point_params?.x ?? { min: 0, max: 1 },
                    y: point_params?.y ?? { min: 0, max: 1 },
                }
            ) as ExtendedBinding;

            if (field.on_before_change !== undefined) {
                (binding as ExtendedBinding).on('beforechange', () => {
                    field.on_before_change?.({ ids: object_ids, field });
                });
            }

            if (field.on_change !== undefined) {
                binding.on('change', (event) => {
                    field.on_change?.({
                        ids: object_ids,
                        data: { field, event },
                    });
                });
            }

            return {
                binding,
                dispose: () => binding.dispose(),
            };
        },
    };
}

/** Создать все обработчики векторных полей */
export function create_vector_field_handlers(): IFieldTypeHandler[] {
    return [
        create_vector2_handler(),
        create_vector3_handler(),
        create_vector4_handler(),
        create_point2d_handler(),
    ];
}
