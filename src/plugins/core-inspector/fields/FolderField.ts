/**
 * Обработчик папок (группировка полей)
 *
 * Поддерживает тип: FOLDER
 */

import type { FolderApi } from '@tweakpane/core';
import {
    PropertyType,
    type IFieldTypeHandler,
    type CreateBindingParams,
    type BindingResult,
} from '../../../core/inspector/types';

/** Создать обработчик папки */
export function create_folder_field_handler(): IFieldTypeHandler {
    return {
        type: PropertyType.FOLDER,

        create_binding(params: CreateBindingParams): BindingResult | undefined {
            const { field, folder } = params;
            const pane_folder = folder as FolderApi;

            const folder_params = field.params as { expanded: boolean } | undefined;

            // Создаём папку
            const sub_folder = pane_folder.addFolder({
                title: field.title ?? field.key,
                expanded: folder_params?.expanded ?? true,
            });

            // ПРИМЕЧАНИЕ: Дочерние поля находятся в field.value
            // Они должны быть добавлены через реестр в InspectorController

            return {
                binding: sub_folder,
                dispose: () => sub_folder.dispose(),
            };
        },
    };
}
