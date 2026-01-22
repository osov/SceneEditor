import { Pane, TpChangeEvent } from 'tweakpane';
import { BindingApi, BindingParams, FolderApi } from '@tweakpane/core';
import * as TweakpaneItemListPlugin from 'tweakpane4-item-list-plugin';
import * as TweakpaneImagePlugin from 'tweakpane4-image-list-plugin';
import * as TweakpaneSearchListPlugin from 'tweakpane4-search-list-plugin';
import * as TextareaPlugin from '@pangenerator/tweakpane-textarea-plugin';
import * as ExtendedPointNdInputPlugin from 'tweakpane4-extended-vector-plugin';
import * as TweakpaneExtendedBooleanPlugin from 'tweakpane4-extended-boolean-plugin';
import { Refreshable } from '@tweakpane/core/dist/blade/common/api/refreshable';

// Import from new modules
import { filterUniqueFields, tryAddToUniqueField, UniqueField } from './inspector/data_provider/UniqueFieldsResolver';
import { castProperty, Entity, isFolder, isButton, Property } from './inspector/ui_renderer/PropertyCaster';
import { handleBeforeChange, handleChange, tryDisabledVectorValueByAxis } from './inspector/event_handlers/FieldChangeHandler';


declare global {
    const Inspector: ReturnType<typeof InspectorModule>;
}

export function register_inspector() {
    (window as any).Inspector = InspectorModule();
}

export enum PropertyType {
    NUMBER,
    VECTOR_2,
    VECTOR_3,
    VECTOR_4,
    BOOLEAN,
    COLOR,
    STRING,
    SLIDER,
    LIST_TEXT,
    LIST_TEXTURES,
    ITEM_LIST,
    BUTTON,
    POINT_2D,
    LOG_DATA,
    FOLDER
}

export type PropertyParams = {
    [PropertyType.NUMBER]: { min?: number, max?: number, step?: number, format?: (value: number) => string }; // formater for symbols after comma
    [PropertyType.VECTOR_2]: { x: { min?: number, max?: number, step?: number, format?: (value: number) => string, disabled?: boolean }, y: { min?: number, max?: number, step?: number, format?: (value: number) => string, disabled?: boolean } };
    [PropertyType.VECTOR_3]: { x: { min?: number, max?: number, step?: number, format?: (value: number) => string, disabled?: boolean }, y: { min?: number, max?: number, step?: number, format?: (value: number) => string, disabled?: boolean }, z: { min?: number, max?: number, step?: number, format?: (value: number) => string, disabled?: boolean } };
    [PropertyType.VECTOR_4]: { x: { min?: number, max?: number, step?: number, format?: (value: number) => string, disabled?: boolean }, y: { min?: number, max?: number, step?: number, format?: (value: number) => string, disabled?: boolean }, z: { min?: number, max?: number, step?: number, format?: (value: number) => string, disabled?: boolean }, w: { min?: number, max?: number, step?: number, format?: (value: number) => string, disabled?: boolean } };
    [PropertyType.BOOLEAN]: { disabled: boolean };
    [PropertyType.COLOR]: {};
    [PropertyType.STRING]: {};
    [PropertyType.SLIDER]: { min: number, max: number, step: number };
    [PropertyType.LIST_TEXT]: { [key in string]: string };
    [PropertyType.LIST_TEXTURES]: { value: string, src: string }[];
    [PropertyType.ITEM_LIST]: { pickText?: string, emptyText?: string, options: string[], onOptionClick?: (option: string) => boolean };
    [PropertyType.BUTTON]: {};
    [PropertyType.POINT_2D]: { x: { min: number, max: number, step?: number, format?: (value: number) => string, disabled?: boolean }, y: { min: number, max: number, step?: number, format?: (value: number) => string, disabled?: boolean } };
    [PropertyType.LOG_DATA]: {};
    [PropertyType.FOLDER]: { expanded: boolean };
}

export type PropertyValues = {
    [PropertyType.NUMBER]: number;
    [PropertyType.VECTOR_2]: { x: number, y: number };
    [PropertyType.VECTOR_3]: { x: number, y: number, z: number };
    [PropertyType.VECTOR_4]: { x: number, y: number, z: number, w: number };
    [PropertyType.BOOLEAN]: boolean;
    [PropertyType.COLOR]: { hex: string };
    [PropertyType.STRING]: string;
    [PropertyType.SLIDER]: number;
    [PropertyType.LIST_TEXT]: string;
    [PropertyType.LIST_TEXTURES]: string;
    [PropertyType.ITEM_LIST]: string[];
    [PropertyType.BUTTON]: (...args: unknown[]) => void;
    [PropertyType.POINT_2D]: { x: number, y: number };
    [PropertyType.LOG_DATA]: string;
    [PropertyType.FOLDER]: PropertyData<PropertyType>[]
}

export interface PropertyData<T extends PropertyType> {
    // NOTE/TODO: uid/pid - for finding which folder the field belongs to
    key: string;
    title?: string;
    value: PropertyValues[T];
    type: T;

    params?: PropertyParams[T];
    readonly?: boolean;
    onBeforeChange?: OnBeforeChangeCallback;
    onChange?: OnChangeCallback;
    onRefresh?: OnRefreshCallback<T>;

    // NOTE: for additional specific data
    data?: unknown;
}

export interface ObjectData {
    id: number;
    fields: PropertyData<PropertyType>[];
}

export interface BeforeChangeInfo {
    ids: number[];
    field: PropertyData<PropertyType>;
}

export interface ChangeInfo {
    ids: number[];
    data: {
        field: PropertyData<PropertyType>;
        event: ChangeEvent;
    }
}

export type ChangeEvent = TpChangeEvent<unknown, BindingApi<unknown, unknown>>;

export type OnBeforeChangeCallback = (info: BeforeChangeInfo) => void;
export type OnChangeCallback = (info: ChangeInfo) => void;
export type OnRefreshCallback<T extends PropertyType> = (ids: number[]) => PropertyValues[T] | undefined;


function InspectorModule() {
    let _inspector: Pane;
    let _data: ObjectData[];
    let _unique_fields: UniqueField[];
    // NOTE: Track vector fields that need to be checked for different values
    let _vector_fields: PropertyData<PropertyType>[] = [];
    let _field_name_to_pane: { [key: string]: Refreshable } = {};
    let _is_first = true;
    let _is_refresh = false;

    function init() {
        _inspector = new Pane({
            container: document.querySelector('.inspector__body') as HTMLElement,
        });

        registerPlugins();
    }

    function registerPlugins() {
        _inspector.registerPlugin(TweakpaneItemListPlugin);
        _inspector.registerPlugin(TweakpaneImagePlugin);
        _inspector.registerPlugin(TweakpaneSearchListPlugin);
        _inspector.registerPlugin(TextareaPlugin);
        _inspector.registerPlugin(ExtendedPointNdInputPlugin);
        _inspector.registerPlugin(TweakpaneExtendedBooleanPlugin);
    }

    function setData(list_data: ObjectData[]) {
        _data = list_data;
        _unique_fields = [];
        _vector_fields = [];

        list_data.forEach((obj, index) => {
            const fields: PropertyData<PropertyType>[] = [];
            for (const field of obj.fields) {
                fields.push(field);
            }

            // NOTE: remove previous fields if they don't exist in the current object
            filterUniqueFields(_unique_fields, fields);

            fields.forEach((field) => {
                // NOTE: remember field with check that all fields between objects are the same
                tryAddToUniqueField(index, obj, _unique_fields, field, _vector_fields);
            });
        });

        const entities: Entity[] = [];
        for (const unique_field of _unique_fields) {
            // NOTE: transform fields
            const entity = castProperty(unique_field.ids, unique_field.data, createEntity);
            if (!entity) continue; // skip on error
            entities.push(entity);
        }

        // NOTE: add fields to inspector
        renderEntities(entities);

        // NOTE: fixes after rendering
        afterRenderEntities();
    }

    function afterRenderEntities() {
        const tp_slo = document.querySelector('.tp-search-listv_options') as HTMLDivElement;
        if (tp_slo) tp_slo.classList.add('my_scroll');
        const tp_to = document.querySelector('.tp-thumbv_ovl') as HTMLDivElement;
        if (tp_to) tp_to.classList.add('my_scroll');

        document.querySelectorAll(".tp-lblv").forEach(el => {
            const label = el.querySelector(".tp-lblv_l")! as HTMLElement;
            const value = el.querySelector(".tp-lblv_v")! as HTMLElement;
            if (label && value && label.textContent!.trim() === "Позиция")
                value.style.width = "225px";
        });

        // Find all texture preview thumbnails and add click handlers
        // TODO: move to plugin as callback
        const thumbnails = document.querySelectorAll('.tp-thumbv_sopt .tp-thumbv_sthmb .tp-thumbv_img');
        thumbnails.forEach(thumb => {
            const img = thumb as HTMLElement;
            if (img.style.backgroundImage) {
                img.style.cursor = 'pointer';
                img.addEventListener('click', () => {
                    const path = img.getAttribute('path')
                        ?.replace(/.*?\/assets\//, '')
                        .replace('")', '') ?? '';
                    AssetControl.select_file(path);
                });
            }
        });

        // Find selected option and scroll to it when list opens
        const thumbnail_input = document.querySelectorAll('.tp-txtv.tp-thumbv_slbl');
        thumbnail_input.forEach(input => {
            input.addEventListener('click', () => {
                setTimeout(() => {
                    const list = input.parentElement?.parentElement;
                    const selectedOption = list?.querySelector('.tp-thumbv_opt[aria-selected="true"]') as Element;
                    if (selectedOption) {
                        selectedOption.scrollIntoView({
                            behavior: 'auto',
                            block: 'start'
                        });
                    }
                }, 100);
            });
        });
    }


    // TODO: refactoring - problem with same field names, all will be updated, need to identify field not by name, or at least not only by name, but by folder membership or unique identifier
    function refresh(fields: string[]) {
        fields.forEach((property) => {
            const matchingFields: UniqueField[] = [];

            function findFieldsRecursively(uniqueFields: UniqueField[]) {
                for (const uniqueField of uniqueFields) {
                    if (uniqueField.data.key == property) {
                        matchingFields.push(uniqueField);
                    }

                    if (uniqueField.data.type == PropertyType.FOLDER) {
                        const folderFields = (uniqueField.data.value as PropertyData<PropertyType>[]).map(field => ({
                            ids: uniqueField.ids,
                            data: field
                        }));
                        findFieldsRecursively(folderFields);
                    }
                }
            }

            findFieldsRecursively(_unique_fields);

            matchingFields.forEach(uniqueField => {
                if (uniqueField.data.onRefresh) {
                    const data = uniqueField.data.onRefresh(uniqueField.ids);
                    if (data) {
                        uniqueField.data.value = data;
                        _data.filter(item => uniqueField.ids.includes(item.id)).forEach(item => {
                            item.fields.filter(field => field.key == uniqueField.data.key).forEach(field => {
                                field.value = data;
                            });
                        });
                    }
                }

                const pane = _field_name_to_pane[uniqueField.data.key];
                if (pane) {
                    _is_refresh = true;
                    pane.refresh();
                    _is_refresh = false;
                }
            });
        });
    }

    function clear() {
        _inspector.children.forEach((value) => {
            value.dispose();
        });
    }

    function createEntity<T extends PropertyType>(ids: number[], field: PropertyData<T>, params?: BindingParams): Property {
        const baseParams: BindingParams = {
            label: field.title ?? field.key,
            ...params
        };
        if (field.readonly) {
            baseParams.readonly = true;
        }
        const entity: Property = {
            obj: field,
            key: 'value',
            params: baseParams
        };

        if (!field.readonly) {
            entity.onBeforeChange = () => {
                if (!_is_first || _is_refresh) {
                    return;
                }

                _is_first = false;

                handleBeforeChange({
                    ids,
                    field
                });
            };

            entity.onChange = (event: ChangeEvent) => {
                // NOTE: don't update values that were just changed from outside (after refresh)
                if (_is_refresh) {
                    tryDisabledVectorValueByAxis({
                        ids,
                        data: {
                            field,
                            event
                        }
                    }, _data);
                    return;
                }

                handleChange({
                    ids,
                    data: {
                        field,
                        event
                    }
                }, _data);

                if (event.last) {
                    tryDisabledVectorValueByAxis({
                        ids,
                        data: {
                            field,
                            event
                        }
                    }, _data);

                    // Update the field after a short delay
                    setTimeout(() => {
                        tryDisabledVectorValueByAxis({
                            ids,
                            data: {
                                field,
                                event
                            }
                        }, _data);
                    });

                    _is_first = true;
                }
            };
        }

        return entity;
    }

    function renderEntities(entities: Entity[], place: FolderApi = _inspector) {
        for (const entity of entities) {
            // folder
            if (isFolder(entity)) {
                // recursively add child entities
                const folder = place.addFolder({ title: entity.title, expanded: entity.expanded });
                renderEntities(entity.childrens!, folder);
                continue;
            }

            // button
            if (isButton(entity)) {
                place.addButton(entity.params).on('click', entity.onClick);
                continue;
            }

            // regular field
            const binding = place.addBinding(entity.obj, entity.key as keyof typeof entity.obj, entity.params);
            if (entity.onBeforeChange) binding.controller.value.emitter.on('beforechange', entity.onBeforeChange);
            if (entity.onChange) binding.on('change', entity.onChange);
            _field_name_to_pane[(entity.obj as PropertyData<PropertyType>).key] = binding as Refreshable;
        }
    }

    init();
    return { setData, refresh, clear }
}
