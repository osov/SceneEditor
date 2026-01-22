import {
    PropertyType,
    PropertyData,
    PropertyParams,
    ChangeEvent
} from '../../Inspector';
import { ButtonParams, BindingParams } from '@tweakpane/core';

export interface Folder {
    title: string;
    childrens: Entity[];
    expanded: boolean;
}

export interface Button {
    title: string;
    params: ButtonParams;
    onClick: (...args: unknown[]) => void;
}

export interface Property {
    obj: PropertyData<PropertyType>;
    key: string;
    params?: BindingParams;
    onBeforeChange?: (event: unknown) => void;
    onChange?: (event: ChangeEvent) => void;
}

export type Entity = Folder | Button | Property;

export function isFolder(obj: Entity): obj is Folder {
    const has_title = (obj as Folder).title != undefined;
    const has_childrens = (obj as Folder).childrens != undefined;
    return (has_title && has_childrens);
}

export function isButton(obj: Entity): obj is Button {
    const has_title = (obj as Button).title != undefined;
    const has_onClick = (obj as Button).onClick != undefined;
    return (has_title && has_onClick);
}

export function createFolder(title: string, childrens: Entity[], expanded: boolean): Folder {
    return {
        title,
        childrens,
        expanded
    };
}

export function createButton(field: PropertyData<PropertyType.BUTTON>, params?: ButtonParams): Button {
    return {
        title: field.title ?? field.key,
        onClick: field.value,
        params: params ?? { title: field.title ?? field.key }
    };
}

export interface CreateEntityOptions {
    ids: number[];
    field: PropertyData<PropertyType>;
    entityCreator: (ids: number[], field: PropertyData<PropertyType>, params?: BindingParams) => Property;
}

/**
 * Casts a property to its appropriate UI entity representation
 */
export function castProperty<T extends PropertyType>(
    ids: number[],
    field: PropertyData<T>,
    entityCreator: (ids: number[], field: PropertyData<PropertyType>, params?: BindingParams) => Property
): Entity | undefined {
    switch (field.type) {
        case PropertyType.FOLDER:
            const fields = field.value as PropertyData<PropertyType>[];
            const childrens: Entity[] = [];
            fields.forEach((f) => {
                const child = castProperty(ids, f, entityCreator);
                if (!child) return;
                childrens.push(child);
            });
            return createFolder(field.key, childrens, (field.params as PropertyParams[PropertyType.FOLDER])?.expanded);

        case PropertyType.BUTTON:
            return createButton(field as PropertyData<PropertyType.BUTTON>);

        case PropertyType.STRING:
            return entityCreator(ids, field);

        case PropertyType.BOOLEAN:
            const bool_field = field as PropertyData<PropertyType.BOOLEAN>;
            return entityCreator(ids, field, {
                unset: bool_field?.params?.disabled
            });

        case PropertyType.NUMBER:
            const num_field = field as PropertyData<PropertyType.NUMBER>;
            return entityCreator(ids, field, {
                format: num_field?.params?.format,
                step: num_field?.params?.step
            });

        case PropertyType.VECTOR_2:
            const vec2_field = field as PropertyData<PropertyType.VECTOR_2>;
            return entityCreator(ids, field, {
                x: vec2_field?.params?.x,
                y: vec2_field?.params?.y,
            });

        case PropertyType.VECTOR_3:
            const vec3_field = field as PropertyData<PropertyType.VECTOR_3>;
            return entityCreator(ids, field, {
                x: vec3_field?.params?.x,
                y: vec3_field?.params?.y,
                z: vec3_field?.params?.z,
            });

        case PropertyType.VECTOR_4:
            const vec4_field = field as PropertyData<PropertyType.VECTOR_4>;
            return entityCreator(ids, field, {
                x: vec4_field?.params?.x,
                y: vec4_field?.params?.y,
                z: vec4_field?.params?.z,
                w: vec4_field?.params?.w,
            });

        case PropertyType.POINT_2D:
            const point2_field = field as PropertyData<PropertyType.POINT_2D>;
            return entityCreator(ids, field, {
                picker: 'popup',
                expanded: false,
                x: point2_field?.params?.x,
                y: { ...point2_field?.params?.y, inverted: true }
            });

        case PropertyType.COLOR:
            return entityCreator(ids, field, {
                picker: 'popup',
                expanded: false
            });

        case PropertyType.ITEM_LIST:
            const item_list_params = field?.params as PropertyParams[PropertyType.ITEM_LIST];
            return entityCreator(ids, field, {
                view: 'item-list',
                options: item_list_params?.options,
                pickText: item_list_params?.pickText,
                emptyText: item_list_params?.emptyText,
                onOptionClick: item_list_params?.onOptionClick
            });

        case PropertyType.LIST_TEXTURES:
            return entityCreator(ids, field, {
                view: 'thumbnail-list',
                options: field?.params
            });

        case PropertyType.LIST_TEXT:
            return entityCreator(ids, field, {
                view: 'search-list',
                options: field?.params
            });

        case PropertyType.LOG_DATA:
            return entityCreator(ids, field, {
                view: 'textarea',
                rows: 6,
                placeholder: 'Type here...'
            });

        case PropertyType.SLIDER:
            const slider_field = field as PropertyData<PropertyType.SLIDER>;
            return entityCreator(ids, field, {
                label: slider_field.title ?? slider_field.key,
                step: slider_field.params?.step,
                min: slider_field.params?.min,
                max: slider_field.params?.max
            });

        default:
            Log.error(`Unable to cast ${field.key}`);
            return undefined;
    }
}
