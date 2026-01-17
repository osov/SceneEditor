/**
 * InspectorEntityFactory - фабрика сущностей инспектора
 *
 * Конвертирует PropertyData в InspectorEntity для рендеринга.
 */

import { PropertyType, PropertyData, PropertyParams } from '@editor/core/inspector/types';
import { FLOAT_PRECISION } from '../../config';
import type { InspectorEntity, InspectorFolder, InspectorButton, InspectorField, ChangeEvent } from './InspectorRenderer';
import type { UniqueField } from './InspectorDataProcessor';

/** Информация перед изменением */
export interface BeforeChangeInfo {
    ids: number[];
    field: PropertyData<PropertyType>;
}

/** Информация об изменении */
export interface ChangeInfo {
    ids: number[];
    data: {
        field: PropertyData<PropertyType>;
        event: ChangeEvent;
    };
}

/** Параметры фабрики */
export interface InspectorEntityFactoryParams {
    /** Callback перед изменением */
    on_before_change?: (info: BeforeChangeInfo) => void;
    /** Callback при изменении */
    on_change?: (info: ChangeInfo) => void;
    /** Callback при ошибке */
    on_error?: (message: string) => void;
}

/** Интерфейс фабрики */
export interface IInspectorEntityFactory {
    /** Конвертировать уникальные поля в сущности */
    create_entities(unique_fields: UniqueField[]): InspectorEntity[];
}

/** Создать InspectorEntityFactory */
export function create_inspector_entity_factory(params?: InspectorEntityFactoryParams): IInspectorEntityFactory {
    const { on_before_change, on_change, on_error } = params ?? {};

    let is_first_change = true;
    let is_refreshing = false;

    function create_entities(unique_fields: UniqueField[]): InspectorEntity[] {
        is_first_change = true;
        const entities: InspectorEntity[] = [];

        for (const uf of unique_fields) {
            const entity = create_entity(uf.ids, uf.data);
            if (entity !== undefined) {
                entities.push(entity);
            }
        }

        return entities;
    }

    function create_entity(ids: number[], field: PropertyData<PropertyType>): InspectorEntity | undefined {
        switch (field.type) {
            case PropertyType.FOLDER:
                return create_folder(ids, field);

            case PropertyType.BUTTON:
                return create_button(field as PropertyData<PropertyType.BUTTON>);

            case PropertyType.STRING:
                return create_field(ids, field, {});

            case PropertyType.BOOLEAN:
                return create_field(ids, field, {
                    unset: (field.params as PropertyParams[PropertyType.BOOLEAN] | undefined)?.disabled,
                });

            case PropertyType.NUMBER:
                return create_field(ids, field, {
                    format: (field.params as PropertyParams[PropertyType.NUMBER] | undefined)?.format,
                    step: (field.params as PropertyParams[PropertyType.NUMBER] | undefined)?.step,
                });

            case PropertyType.VECTOR_2:
                return create_field(ids, field, {
                    x: (field.params as PropertyParams[PropertyType.VECTOR_2] | undefined)?.x,
                    y: (field.params as PropertyParams[PropertyType.VECTOR_2] | undefined)?.y,
                });

            case PropertyType.VECTOR_3:
                return create_field(ids, field, {
                    x: (field.params as PropertyParams[PropertyType.VECTOR_3] | undefined)?.x,
                    y: (field.params as PropertyParams[PropertyType.VECTOR_3] | undefined)?.y,
                    z: (field.params as PropertyParams[PropertyType.VECTOR_3] | undefined)?.z,
                });

            case PropertyType.VECTOR_4:
                return create_field(ids, field, {
                    x: (field.params as PropertyParams[PropertyType.VECTOR_4] | undefined)?.x,
                    y: (field.params as PropertyParams[PropertyType.VECTOR_4] | undefined)?.y,
                    z: (field.params as PropertyParams[PropertyType.VECTOR_4] | undefined)?.z,
                    w: (field.params as PropertyParams[PropertyType.VECTOR_4] | undefined)?.w,
                });

            case PropertyType.POINT_2D:
                return create_field(ids, field, {
                    picker: 'popup',
                    expanded: false,
                    x: (field.params as PropertyParams[PropertyType.POINT_2D] | undefined)?.x,
                    y: {
                        ...(field.params as PropertyParams[PropertyType.POINT_2D] | undefined)?.y,
                        inverted: true,
                    },
                });

            case PropertyType.COLOR:
                return create_field(ids, field, {
                    picker: 'popup',
                    expanded: false,
                });

            case PropertyType.ITEM_LIST:
                const item_list_params = field.params as PropertyParams[PropertyType.ITEM_LIST] | undefined;
                return create_field(ids, field, {
                    view: 'item-list',
                    options: item_list_params?.options,
                    pickText: item_list_params?.pick_text,
                    emptyText: item_list_params?.empty_text,
                    onOptionClick: item_list_params?.on_option_click,
                });

            case PropertyType.LIST_TEXTURES:
                return create_field(ids, field, {
                    view: 'thumbnail-list',
                    options: field.params,
                });

            case PropertyType.LIST_TEXT:
                return create_field(ids, field, {
                    view: 'search-list',
                    options: field.params,
                });

            case PropertyType.LOG_DATA:
                return create_field(ids, field, {
                    view: 'textarea',
                    rows: 6,
                    placeholder: 'Type here...',
                });

            case PropertyType.SLIDER:
                const slider_params = field.params as PropertyParams[PropertyType.SLIDER] | undefined;
                return create_field(ids, field, {
                    label: field.title ?? field.key,
                    step: slider_params?.step,
                    min: slider_params?.min,
                    max: slider_params?.max,
                });

            default:
                on_error?.(`Unable to create entity for field: ${field.key}`);
                return undefined;
        }
    }

    function create_folder(ids: number[], field: PropertyData<PropertyType>): InspectorFolder {
        const folder_fields = field.value as PropertyData<PropertyType>[];
        const children: InspectorEntity[] = [];

        for (const folder_field of folder_fields) {
            const child = create_entity(ids, folder_field);
            if (child !== undefined) {
                children.push(child);
            }
        }

        const folder_params = field.params as PropertyParams[PropertyType.FOLDER] | undefined;

        return {
            type: 'folder',
            title: field.title ?? field.key,
            expanded: folder_params?.expanded ?? true,
            children,
        };
    }

    function create_button(field: PropertyData<PropertyType.BUTTON>): InspectorButton {
        return {
            type: 'button',
            title: field.title ?? field.key,
            params: { title: field.title ?? field.key },
            on_click: field.value,
        };
    }

    function create_field(ids: number[], field: PropertyData<PropertyType>, extra_params: Record<string, unknown>): InspectorField {
        // Создаём объект-обёртку для значения
        const value_wrapper: Record<string, unknown> = {
            value: field.value,
        };

        const result: InspectorField = {
            type: 'field',
            key: field.key,
            label: field.title ?? field.key,
            object: value_wrapper,
            params: extra_params,
            readonly: field.readonly,
        };

        if (field.readonly !== true) {
            result.on_before_change = () => {
                if (!is_first_change || is_refreshing) {
                    return;
                }

                is_first_change = false;

                field.on_before_change?.({ ids, field });
                on_before_change?.({ ids, field });
            };

            result.on_change = (event: ChangeEvent) => {
                // Не обрабатываем события при refresh
                if (is_refreshing) {
                    return;
                }

                // Обрезаем точность для float
                cut_float_precision(event, field.type);

                // Обновляем значение в поле
                field.value = event.value as PropertyData<PropertyType>['value'];
                value_wrapper.value = event.value;

                // Вызываем callbacks
                const change_info: ChangeInfo = {
                    ids,
                    data: { field, event },
                };

                field.on_change?.(change_info);
                on_change?.(change_info);

                if (event.last) {
                    is_first_change = true;
                }
            };
        }

        return result;
    }

    function cut_float_precision(event: ChangeEvent, type: PropertyType): void {
        const value = event.value;

        switch (type) {
            case PropertyType.NUMBER:
            case PropertyType.SLIDER:
                if (typeof value === 'number') {
                    (event as { value: number }).value = Number(value.toFixed(FLOAT_PRECISION));
                }
                break;

            case PropertyType.VECTOR_2:
            case PropertyType.POINT_2D:
                if (typeof value === 'object' && value !== null && 'x' in value && 'y' in value) {
                    const v = value as { x: number; y: number };
                    v.x = Number(v.x.toFixed(FLOAT_PRECISION));
                    v.y = Number(v.y.toFixed(FLOAT_PRECISION));
                }
                break;

            case PropertyType.VECTOR_3:
                if (typeof value === 'object' && value !== null && 'x' in value && 'y' in value && 'z' in value) {
                    const v = value as { x: number; y: number; z: number };
                    v.x = Number(v.x.toFixed(FLOAT_PRECISION));
                    v.y = Number(v.y.toFixed(FLOAT_PRECISION));
                    v.z = Number(v.z.toFixed(FLOAT_PRECISION));
                }
                break;

            case PropertyType.VECTOR_4:
                if (typeof value === 'object' && value !== null && 'x' in value && 'y' in value && 'z' in value && 'w' in value) {
                    const v = value as { x: number; y: number; z: number; w: number };
                    v.x = Number(v.x.toFixed(FLOAT_PRECISION));
                    v.y = Number(v.y.toFixed(FLOAT_PRECISION));
                    v.z = Number(v.z.toFixed(FLOAT_PRECISION));
                    v.w = Number(v.w.toFixed(FLOAT_PRECISION));
                }
                break;
        }
    }

    return {
        create_entities,
    };
}
