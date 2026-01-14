/**
 * Обработчик кнопок
 *
 * Поддерживает тип: BUTTON
 */

import type { FolderApi } from '@tweakpane/core';
import {
    PropertyType,
    type IFieldTypeHandler,
    type CreateBindingParams,
    type BindingResult,
} from '../../../core/inspector/types';

/** Создать обработчик кнопки */
export function create_button_field_handler(): IFieldTypeHandler {
    return {
        type: PropertyType.BUTTON,

        create_binding(params: CreateBindingParams): BindingResult | undefined {
            const { field, folder, target_object } = params;
            const pane_folder = folder as FolderApi;

            // Кнопка не использует binding, а addButton
            const button = pane_folder.addButton({
                title: field.title ?? field.key,
            });

            // Значение поля - это callback функция
            const on_click = target_object[field.key] as ((...args: unknown[]) => void) | undefined;

            if (on_click !== undefined) {
                button.on('click', () => {
                    on_click();
                });
            }

            return {
                binding: button,
                dispose: () => button.dispose(),
            };
        },
    };
}
