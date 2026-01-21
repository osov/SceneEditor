/**
 * Фабрика для создания UI entities инспектора
 */

import { Services } from '@editor/core';
import {
    create_folder,
    create_button,
    is_folder,
    type Entities,
    type Entity,
    type Folder,
    type ChangeEvent,
} from '../../editor/inspector/ui';
import type { IOptionsProviders } from '../../editor/inspector/options';
import {
    PropertyType,
    type PropertyData,
    type PropertyItem,
    type PropertyParams,
    type InspectorGroup,
    type ChangeInfo,
    type BeforeChangeInfo,
} from './types';

// ============================================================================
// Entity Creation
// ============================================================================

export interface EntityFactoryCallbacks {
    /** Вызывается перед изменением значения */
    on_before_change: (info: BeforeChangeInfo) => void;
    /** Вызывается при изменении значения */
    on_change: (info: ChangeInfo) => void;
    /** Вызывается для проверки disabled осей */
    on_try_disabled_axis: (info: ChangeInfo) => void;
}

export interface EntityFactoryState {
    is_first: boolean;
    is_refresh: boolean;
}

/**
 * Преобразует PropertyData в Entity для TweakPane
 */
export function cast_property<T extends PropertyType>(
    _ids: number[],
    field: PropertyData<T>,
    property: PropertyItem<T>,
    options_providers: IOptionsProviders
): Entities | undefined {
    switch (property.type) {
        case PropertyType.STRING:
            return { obj: field as unknown as Record<string, unknown>, key: 'data', params: { label: property.title, ...(property.readonly === true ? { readonly: true } : {}) } };
        case PropertyType.BOOLEAN:
            return {
                obj: field as unknown as Record<string, unknown>,
                key: 'data',
                params: {
                    label: property.title,
                    ...(property.readonly === true ? { readonly: true } : {}),
                    unset: (property as PropertyItem<PropertyType.BOOLEAN>)?.params?.disabled
                }
            };
        case PropertyType.NUMBER: {
            const number_prop = property as PropertyItem<PropertyType.NUMBER>;
            return {
                obj: field as unknown as Record<string, unknown>,
                key: 'data',
                params: {
                    label: property.title,
                    ...(property.readonly === true ? { readonly: true } : {}),
                    format: number_prop?.params?.format,
                    min: number_prop?.params?.min,
                    max: number_prop?.params?.max,
                    step: number_prop?.params?.step
                }
            };
        }
        case PropertyType.VECTOR_2: {
            const vec2_prop = property as PropertyItem<PropertyType.VECTOR_2>;
            return {
                obj: field as unknown as Record<string, unknown>,
                key: 'data',
                params: {
                    label: property.title,
                    ...(property.readonly === true ? { readonly: true } : {}),
                    x: vec2_prop.params?.x,
                    y: vec2_prop.params?.y,
                }
            };
        }
        case PropertyType.VECTOR_3: {
            const vec3_prop = property as PropertyItem<PropertyType.VECTOR_3>;
            return {
                obj: field as unknown as Record<string, unknown>,
                key: 'data',
                params: {
                    label: property.title,
                    ...(property.readonly === true ? { readonly: true } : {}),
                    x: vec3_prop.params?.x,
                    y: vec3_prop.params?.y,
                    z: vec3_prop.params?.z,
                }
            };
        }
        case PropertyType.VECTOR_4: {
            const vec4_prop = property as PropertyItem<PropertyType.VECTOR_4>;
            return {
                obj: field as unknown as Record<string, unknown>,
                key: 'data',
                params: {
                    label: property.title,
                    ...(property.readonly === true ? { readonly: true } : {}),
                    x: vec4_prop.params?.x,
                    y: vec4_prop.params?.y,
                    z: vec4_prop.params?.z,
                    w: vec4_prop.params?.w,
                }
            };
        }
        case PropertyType.POINT_2D: {
            const point2_prop = property as PropertyItem<PropertyType.POINT_2D>;
            return {
                obj: field as unknown as Record<string, unknown>,
                key: 'data',
                params: {
                    label: property.title,
                    ...(property.readonly === true ? { readonly: true as const } : {}),
                    picker: 'popup',
                    expanded: false,
                    x: point2_prop.params?.x,
                    y: { ...point2_prop.params?.y, inverted: true }
                }
            } as Entity;
        }
        case PropertyType.COLOR:
            return {
                obj: field as unknown as Record<string, unknown>,
                key: 'data',
                params: {
                    label: property.title,
                    ...(property.readonly === true ? { readonly: true } : {}),
                    picker: 'popup',
                    expanded: false
                }
            };
        case PropertyType.LIST_TEXTURES: {
            // Плагин thumbnail-list автоматически добавляет опцию "None" для пустого значения
            const texture_options = (property.params as Array<{ value: string; src: string; path: string }>) ?? [];
            return {
                obj: field as unknown as Record<string, unknown>,
                key: 'data',
                params: {
                    label: property.title,
                    ...(property.readonly === true ? { readonly: true as const } : {}),
                    view: 'thumbnail-list',
                    options: texture_options
                }
            } as Entity;
        }
        case PropertyType.LIST_TEXT:
            // search-list ожидает объект {key: value}, НЕ массив
            return {
                obj: field as unknown as Record<string, unknown>,
                key: 'data',
                params: {
                    label: property.title,
                    ...(property.readonly === true ? { readonly: true as const } : {}),
                    view: 'search-list',
                    options: property.params
                }
            } as Entity;
        case PropertyType.LOG_DATA:
            return {
                obj: field as unknown as Record<string, unknown>,
                key: 'data',
                params: {
                    label: property.title,
                    ...(property.readonly === true ? { readonly: true } : {}),
                    view: 'textarea',
                    rows: 6,
                    placeholder: 'Type here...'
                }
            };
        case PropertyType.SLIDER: {
            const slider_prop = property as PropertyItem<PropertyType.SLIDER>;
            return {
                obj: field as unknown as Record<string, unknown>,
                key: 'data',
                params: {
                    label: property.title,
                    ...(property.readonly === true ? { readonly: true } : {}),
                    step: slider_prop.params?.step,
                    min: slider_prop.params?.min,
                    max: slider_prop.params?.max
                }
            };
        }
        case PropertyType.BUTTON:
            return create_button(property.title, (field as PropertyData<PropertyType.BUTTON>).data, { title: property.title });
        case PropertyType.ITEM_LIST: {
            // ITEM_LIST отображает список элементов (например материалы) где каждый можно изменить
            const item_list_params = property.params as PropertyParams[PropertyType.ITEM_LIST];
            // Для MODEL_MATERIALS используем все доступные материалы как options
            const all_materials = Object.values(options_providers.get_material_options());
            return {
                obj: field as unknown as Record<string, unknown>,
                key: 'data',
                params: {
                    label: property.title,
                    ...(property.readonly === true ? { readonly: true as const } : {}),
                    view: 'item-list',
                    pickText: item_list_params?.pickText ?? 'Выбрать',
                    emptyText: item_list_params?.emptyText ?? 'Нет элементов',
                    options: all_materials,
                    onOptionClick: item_list_params?.onOptionClick
                }
            } as Entity;
        }
        default:
            Services.logger.error(`Unable to cast ${field.name}`);
            return undefined;
    }
}

/**
 * Создаёт Entity с обработчиками событий
 */
export function create_entity<T extends PropertyType>(
    ids: number[],
    field: PropertyData<T>,
    property: PropertyItem<T>,
    params: unknown,
    callbacks: EntityFactoryCallbacks,
    state: EntityFactoryState
): Entity {
    const entity: Entity = {
        obj: field as unknown as Record<string, unknown>,
        key: 'data',
        params: {
            label: property.title,
            ...(property.readonly === true ? { readonly: true } : {}),
            ...(params as Record<string, unknown>)
        }
    };

    if (property.readonly !== true) {
        entity.onBeforeChange = () => {
            if (!state.is_first || state.is_refresh) {
                return;
            }

            state.is_first = false;

            callbacks.on_before_change({
                ids,
                field
            });
        };

        entity.onChange = (event: ChangeEvent) => {
            // не обновляем только что измененные значения из вне(после refresh)
            if (state.is_refresh) {
                callbacks.on_try_disabled_axis({
                    ids,
                    data: {
                        field,
                        property,
                        event
                    }
                });
                return;
            }

            callbacks.on_change({
                ids,
                data: {
                    field,
                    property,
                    event
                }
            });

            if (event.last === true) {
                // ставим прочерки на осях если разные значения
                callbacks.on_try_disabled_axis({
                    ids,
                    data: {
                        field,
                        property,
                        event
                    }
                });

                // перезаписываем прочерки на изменненой оси в следующем кадре
                setTimeout(() => {
                    callbacks.on_try_disabled_axis({
                        ids,
                        data: {
                            field,
                            property,
                            event
                        }
                    });
                });

                state.is_first = true;
            }
        };
    }

    return entity;
}

// ============================================================================
// Folder Management
// ============================================================================

/**
 * Добавляет entity в соответствующую папку
 */
export function add_to_folder<T extends PropertyType>(
    field: PropertyData<T>,
    entity: Entities,
    entities: Entities[],
    config: InspectorGroup[]
) {
    // Если задана кастомная папка, используем её
    if (field.folder !== undefined && field.folder !== '') {
        let folder = entities.find((value) => {
            return (is_folder(value)) && (value.title === field.folder);
        }) as Folder | undefined;
        if (folder === undefined) {
            folder = create_folder(field.folder, []);
            entities.push(folder);
        }
        folder.childrens.push(entity);
        return;
    }

    // Иначе используем группу из config
    const group = get_inspector_group_by_name(field.name, config);
    if (group !== undefined && group.title !== '') {
        let folder = entities.find((value) => {
            return (is_folder(value)) && (value.title === group.title);
        }) as Folder | undefined;
        if (folder === undefined) {
            folder = create_folder(group.title, []);
            entities.push(folder);
        }
        folder.childrens.push(entity);
    } else {
        entities.push(entity);
    }
}

/**
 * Получить группу инспектора по имени свойства
 */
export function get_inspector_group_by_name(name: string, config: InspectorGroup[]): InspectorGroup | undefined {
    for (const group of config) {
        const result = group.property_list.find((property) => {
            return property.name === name;
        });
        if (result !== undefined) return group;
    }
    return undefined;
}
