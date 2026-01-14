/**
 * Обработчики списковых полей
 *
 * Поддерживает типы: LIST_TEXT, LIST_TEXTURES, ITEM_LIST
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

/** Создать обработчик LIST_TEXT (выпадающий список) */
function create_list_text_handler(): IFieldTypeHandler {
    return {
        type: PropertyType.LIST_TEXT,

        create_binding(params: CreateBindingParams): BindingResult | undefined {
            const { field, object_ids, folder, target_object } = params;
            const pane_folder = folder as FolderApi;

            const list_options = field.params as Record<string, string> | undefined;

            // Преобразуем в формат для TweakPane
            const options: Array<{ text: string; value: string }> = [];
            if (list_options !== undefined) {
                for (const [text, value] of Object.entries(list_options)) {
                    options.push({ text, value });
                }
            }

            // Используем плагин search-list для поиска
            const binding = pane_folder.addBinding(
                target_object,
                field.key,
                {
                    label: field.title ?? field.key,
                    readonly: field.readonly,
                    view: 'search-list',
                    options,
                } as Record<string, unknown>
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

/** Создать обработчик LIST_TEXTURES (список текстур с превью) */
function create_list_textures_handler(): IFieldTypeHandler {
    return {
        type: PropertyType.LIST_TEXTURES,

        create_binding(params: CreateBindingParams): BindingResult | undefined {
            const { field, object_ids, folder, target_object } = params;
            const pane_folder = folder as FolderApi;

            const texture_options = field.params as Array<{ value: string; src: string }> | undefined;

            // Используем плагин image-list для превью текстур
            const binding = pane_folder.addBinding(
                target_object,
                field.key,
                {
                    label: field.title ?? field.key,
                    readonly: field.readonly,
                    view: 'thumbnail-list',
                    options: texture_options ?? [],
                } as Record<string, unknown>
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

/** Создать обработчик ITEM_LIST (список элементов) */
function create_item_list_handler(): IFieldTypeHandler {
    return {
        type: PropertyType.ITEM_LIST,

        create_binding(params: CreateBindingParams): BindingResult | undefined {
            const { field, object_ids, folder, target_object } = params;
            const pane_folder = folder as FolderApi;

            const item_params = field.params as {
                pick_text?: string;
                empty_text?: string;
                options: string[];
                on_option_click?: (option: string) => boolean;
            } | undefined;

            // Используем плагин item-list
            const binding = pane_folder.addBinding(
                target_object,
                field.key,
                {
                    label: field.title ?? field.key,
                    readonly: field.readonly,
                    view: 'item-list',
                    pickText: item_params?.pick_text ?? 'Добавить',
                    emptyText: item_params?.empty_text ?? 'Пусто',
                    options: item_params?.options ?? [],
                    onOptionClick: item_params?.on_option_click,
                } as Record<string, unknown>
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

/** Создать все обработчики списковых полей */
export function create_list_field_handlers(): IFieldTypeHandler[] {
    return [
        create_list_text_handler(),
        create_list_textures_handler(),
        create_item_list_handler(),
    ];
}
