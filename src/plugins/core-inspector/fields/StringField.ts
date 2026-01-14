/**
 * Обработчик строковых полей
 *
 * Поддерживает типы: STRING, LOG_DATA
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

/** Создать обработчик строкового поля */
export function create_string_field_handler(): IFieldTypeHandler {
    return {
        type: PropertyType.STRING,

        create_binding(params: CreateBindingParams): BindingResult | undefined {
            const { field, object_ids, folder, target_object } = params;
            const pane_folder = folder as FolderApi;

            const binding = pane_folder.addBinding(
                target_object,
                field.key,
                {
                    label: field.title ?? field.key,
                    readonly: field.readonly,
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

/** Создать обработчик многострочного текста (LOG_DATA) */
export function create_log_data_field_handler(): IFieldTypeHandler {
    return {
        type: PropertyType.LOG_DATA,

        create_binding(params: CreateBindingParams): BindingResult | undefined {
            const { field, object_ids, folder, target_object } = params;
            const pane_folder = folder as FolderApi;

            // Используем плагин textarea
            const binding = pane_folder.addBinding(
                target_object,
                field.key,
                {
                    label: field.title ?? field.key,
                    readonly: field.readonly,
                    view: 'textarea',
                    rows: 5,
                }
            ) as BindingApi<unknown, unknown>;

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
