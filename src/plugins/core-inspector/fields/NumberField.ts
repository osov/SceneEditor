/**
 * Обработчик числовых полей
 *
 * Поддерживает типы: NUMBER, SLIDER
 */

import type { FolderApi, BindingApi } from '@tweakpane/core';
import {
    PropertyType,
    type IFieldTypeHandler,
    type CreateBindingParams,
    type BindingResult,
} from '../../../core/inspector/types';

/** Расширенный тип привязки с поддержкой beforechange */
type ExtendedBinding = BindingApi<unknown, unknown> & {
    on(event: 'beforechange', handler: () => void): void;
};

/** Создать обработчик числового поля */
export function create_number_field_handler(): IFieldTypeHandler {
    return {
        type: PropertyType.NUMBER,

        create_binding(params: CreateBindingParams): BindingResult | undefined {
            const { field, object_ids, folder, target_object } = params;
            const pane_folder = folder as FolderApi;

            const binding_params: Record<string, unknown> = {
                label: field.title ?? field.key,
                readonly: field.readonly,
            };

            // Добавляем параметры min/max/step если есть
            if (field.params !== undefined) {
                const p = field.params as { min?: number; max?: number; step?: number; format?: (v: number) => string };
                if (p.min !== undefined) binding_params.min = p.min;
                if (p.max !== undefined) binding_params.max = p.max;
                if (p.step !== undefined) binding_params.step = p.step;
                if (p.format !== undefined) binding_params.format = p.format;
            }

            const binding = pane_folder.addBinding(
                target_object,
                field.key,
                binding_params
            ) as ExtendedBinding;

            // Обработка событий
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

/** Создать обработчик слайдера */
export function create_slider_field_handler(): IFieldTypeHandler {
    return {
        type: PropertyType.SLIDER,

        create_binding(params: CreateBindingParams): BindingResult | undefined {
            const { field, object_ids, folder, target_object } = params;
            const pane_folder = folder as FolderApi;

            const slider_params = field.params as { min: number; max: number; step: number } | undefined;

            const binding = pane_folder.addBinding(
                target_object,
                field.key,
                {
                    label: field.title ?? field.key,
                    readonly: field.readonly,
                    min: slider_params?.min ?? 0,
                    max: slider_params?.max ?? 1,
                    step: slider_params?.step ?? 0.01,
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
