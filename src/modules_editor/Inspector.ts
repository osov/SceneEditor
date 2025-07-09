import { Pane, TpChangeEvent } from 'tweakpane';
import { BindingApi, BindingParams, ButtonParams, FolderApi } from '@tweakpane/core';
import * as TweakpaneItemListPlugin from 'tweakpane4-item-list-plugin';
import * as TweakpaneImagePlugin from 'tweakpane4-image-list-plugin';
import * as TweakpaneSearchListPlugin from 'tweakpane4-search-list-plugin';
import * as TextareaPlugin from '@pangenerator/tweakpane-textarea-plugin';
import * as ExtendedPointNdInputPlugin from 'tweakpane4-extended-vector-plugin';
import * as TweakpaneExtendedBooleanPlugin from 'tweakpane4-extended-boolean-plugin';
import { Vector2, Vector3, Vector4 } from 'three';
import { FLOAT_PRECISION } from '../config';
import { Refreshable } from '@tweakpane/core/dist/blade/common/api/refreshable';


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
    [PropertyType.BUTTON]: (...args: any[]) => void;
    [PropertyType.POINT_2D]: { x: number, y: number };
    [PropertyType.LOG_DATA]: string;
    [PropertyType.FOLDER]: PropertyData<PropertyType>[]
}

export interface PropertyData<T extends PropertyType> {
    // NOTE/TODO: uid/pid - для нахождения к какой папке относится поле
    key: string;
    title?: string;
    value: PropertyValues[T];
    type: T;

    params?: PropertyParams[T];
    readonly?: boolean;
    onBeforeChange?: OnBeforeChangeCallback;
    onChange?: OnChangeCallback;
    onRefresh?: OnRefreshCallback<T>;

    // NOTE: для дополнительных специфических данных
    data?: any;
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

interface Folder {
    title: string;
    childrens: Entity[];
    expanded: boolean;
}

interface Button {
    title: string;
    params: ButtonParams;
    onClick: (...args: any[]) => void;
}

interface Property {
    obj: any;
    key: string;
    params?: BindingParams;
    onBeforeChange?: (event: any) => void;
    onChange?: (event: ChangeEvent) => void;
}

type Entity = Folder | Button | Property;


function InspectorModule() {
    let _inspector: Pane;
    let _data: ObjectData[];
    let _unique_fields: { ids: number[], data: PropertyData<PropertyType> }[];
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

        list_data.forEach((obj, index) => {
            const fields: PropertyData<PropertyType>[] = [];
            for (const field of obj.fields) {
                fields.push(field);
            }

            // NOTE: удаляем предыдущие поля если их нету в текущем обьекте
            filterUniqueFields(_unique_fields, fields);

            fields.forEach((field) => {
                // NOTE: запоминаем поле с проверкой на то что все поля между объектами одинаковые
                tryAddToUniqueField(index, obj, _unique_fields, field);
            });
        });

        const entities: Entity[] = [];
        for (const unique_field of _unique_fields) {
            // NOTE: перобразование полей
            const entity = castProperty(unique_field.ids, unique_field.data);
            if (!entity) continue; // пропускаем в случае ошибки
            entities.push(entity);
        }

        // NOTE: добавляем поля в инспектор
        renderEntities(entities);

        // NOTE: правки после рендеринга
        afterRenderEntities();
    }

    function afterRenderEntities() {
        const tp_slo = document.querySelector('.tp-search-listv_options') as HTMLDivElement;
        if (tp_slo) tp_slo.classList.add('my_scroll');
        const tp_to = document.querySelector('.tp-thumbv_ovl') as HTMLDivElement;
        if (tp_to) tp_to.classList.add('my_scroll');

        // Find all texture preview thumbnails and add click handlers
        // TODO: перенести в плагин как колбэк
        const thumbnails = document.querySelectorAll('.tp-thumbv_sopt .tp-thumbv_sthmb .tp-thumbv_img');
        thumbnails.forEach(thumb => {
            const img = thumb as HTMLElement;
            if (img.style.backgroundImage) {
                img.style.cursor = 'pointer';
                img.addEventListener('click', () => {
                    const path = img.style.backgroundImage
                        .replace(/^url\(".*?\/assets\//, '')
                        .replace('")', '');
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
                            behavior: 'instant',
                            block: 'start'
                        });
                    }
                }, 100);
            });
        });
    }


    // TODO: рефакторинг - проблема в случае одинаковых имен полей, будут обновляться все, нужно как то идентифицировать поле не по имени, по крайней мере не только по имени, а по принадлежанию к папке или по уникальному идентификатору, но по идентификатору не сработает, так так мы не будем знать его при вызове refresh, получается нужно как то изначально индетифицировать поля уникально, но при этом нужно учитывать что поля могут быть и сгенерироваными, возможно нужно принимать путь обновления, папка/поле и по нему уже тогда искать 
    function refresh(fields: string[]) {
        fields.forEach((property) => {
            const matchingFields: { ids: number[], data: PropertyData<PropertyType> }[] = [];

            function findFieldsRecursively(uniqueFields: { ids: number[], data: PropertyData<PropertyType> }[]) {
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

    function filterUniqueFields(unique_fields: { ids: number[], data: PropertyData<PropertyType> }[], fields: PropertyData<PropertyType>[]) {
        const tmp: number[] = [];
        unique_fields.forEach((unique_field, index) => {
            const result = fields.findIndex((field) => {
                return field.key == unique_field.data.key;
            });

            // NOTE: запоминаем поля которые не найдены
            if (result == -1) {
                tmp.push(index);
                return;
            }

            if (unique_field.data.type == PropertyType.FOLDER) {
                const r = filterUniqueFields((unique_field.data.value as PropertyData<PropertyType>[]).map((field) => {
                    return {
                        ids: unique_field.ids,
                        data: field
                    };
                }), fields[result].value as PropertyData<PropertyType>[]);
                for (let i = r.length - 1; i >= 0; i--) {
                    const index = r[i];
                    (unique_field.data.value as PropertyData<PropertyType>[]).splice(index, 1);
                }
            }
        });

        // NOTE: удаляем поля которые не найдены
        for (let i = tmp.length - 1; i >= 0; i--) {
            const index = tmp[i];
            unique_fields.splice(index, 1);
        }

        return tmp;
    }

    // TODO: рефакторинг - сложная логика
    function tryAddToUniqueField(obj_index: number, obj: ObjectData, unique_fields: { ids: number[], data: PropertyData<PropertyType> }[], field: PropertyData<PropertyType>): boolean {
        const index = unique_fields.findIndex((value) => {
            return value.data.key == field.key;
        });

        if (index == -1) {
            if (obj_index != 0) {
                return false;
            }

            // добавляем если это первый обьект
            unique_fields.push({
                ids: [obj.id],
                data: field
            });

            // Track vector fields for later use
            if ([PropertyType.VECTOR_2, PropertyType.VECTOR_3, PropertyType.VECTOR_4].includes(field.type)) {
                _vector_fields.push(field);
            }

            return true;
        }
        else {
            unique_fields[index].ids.push(obj.id);
        }

        // NOTE: проверяем поля на уникальность значений
        if (field.type == PropertyType.FOLDER) {
            let anyone_was_added = false;
            const folderFields = field.value as PropertyData<PropertyType>[];
            const uniqueFolderFields = unique_fields[index].data.value as PropertyData<PropertyType>[];

            for (const folderField of folderFields) {
                if (tryAddToUniqueField(obj_index, obj, uniqueFolderFields.map(f => ({
                    ids: unique_fields[index].ids,
                    data: f
                })), folderField)) {
                    anyone_was_added = true;
                }
            }

            if (anyone_was_added) {
                return true;
            }
        }

        // NOTE: для кнопок всегда показываем
        if (field.type == PropertyType.BUTTON) {
            return true;
        }

        if ([PropertyType.VECTOR_2, PropertyType.POINT_2D, PropertyType.VECTOR_3, PropertyType.VECTOR_4].includes(field.type)) {
            type T = PropertyValues[PropertyType.VECTOR_2];
            const field_data = field.value as T;
            const unique_field_data = unique_fields[index].data.value as T;

            if (typeof field_data !== typeof unique_field_data) return false;

            if ([PropertyType.VECTOR_2, PropertyType.POINT_2D, PropertyType.VECTOR_3, PropertyType.VECTOR_4].includes(field.type)) {
                if (field_data.x != unique_field_data.x) {
                    const params = unique_fields[index].data.params;
                    if (params) {
                        const v2p = (params as PropertyParams[PropertyType.VECTOR_2]);
                        if (v2p.x) v2p.x.disabled = true;
                        else v2p.x = { disabled: true };
                    } else unique_fields[index].data.params = { x: { disabled: true } };
                    unique_field_data.x = (unique_field_data.x + field_data.x) / 2;
                }

                if (field_data.y != unique_field_data.y) {
                    const params = unique_fields[index].data.params;
                    if (params) {
                        const v2p = (params as PropertyParams[PropertyType.VECTOR_2]);
                        if (v2p.y) v2p.y.disabled = true;
                        else v2p.y = { disabled: true };
                    } else unique_fields[index].data.params = { y: { disabled: true } };
                    unique_field_data.y = (unique_field_data.y + field_data.y) / 2;
                }
            }

            if ([PropertyType.VECTOR_3, PropertyType.VECTOR_4].includes(field.type)) {
                type T = PropertyValues[PropertyType.VECTOR_3];
                const field_data = field.value as T;
                const unique_field_data = unique_fields[index].data.value as T;

                if (field_data.z != unique_field_data.z) {
                    const params = unique_fields[index].data.params;
                    if (params) {
                        const v3p = (params as PropertyParams[PropertyType.VECTOR_3]);
                        if (v3p.z) v3p.z.disabled = true;
                        else v3p.z = { disabled: true };
                    } else unique_fields[index].data.params = { z: { disabled: true } };
                    unique_field_data.z = (unique_field_data.z + field_data.z) / 2;
                }
            }

            if (field.type == PropertyType.VECTOR_4) {
                type T = PropertyValues[PropertyType.VECTOR_4];
                const field_data = field.value as T;
                const unique_field_data = unique_fields[index].data.value as T;

                if (field_data.w != unique_field_data.w) {
                    const params = unique_fields[index].data.params;
                    if (params) {
                        const v4p = (params as PropertyParams[PropertyType.VECTOR_4]);
                        if (v4p.w) v4p.w.disabled = true;
                        else v4p.w = { disabled: true };
                    } else unique_fields[index].data.params = { w: { disabled: true } };
                }
                unique_field_data.w = (unique_field_data.w + field_data.w) / 2;
            }
        }
        else {
            if (field.value != unique_fields[index].data.value) {
                if ([PropertyType.LIST_TEXT, PropertyType.LIST_TEXTURES, PropertyType.LOG_DATA].includes(field.type)) {
                    // для выпадающего списка и текстовых полей если между обьектами разные значения
                    unique_fields[index].data.value = '';
                } else if (field.type == PropertyType.COLOR) {
                    // для цвета если между обьектами разные значения
                    unique_fields[index].data.value = "#000000";
                } else if (field.type == PropertyType.BOOLEAN) {
                    // для чекбокса если между обьектами разные значения
                    unique_fields[index].data.value = false;
                    unique_fields[index].data.params = { disabled: true };
                } else if (field.type == PropertyType.SLIDER) {
                    const min = (unique_fields[index].data.params as PropertyParams[PropertyType.SLIDER]).min;
                    unique_fields[index].data.value = min;
                } else {
                    // в ином случае просто убираем поле
                    unique_fields.splice(index, 1);
                    return false;
                }
            }
        }

        return true;
    }

    function castProperty<T extends PropertyType>(ids: number[], field: PropertyData<T>): Entity | undefined {
        switch (field.type) {
            case PropertyType.FOLDER:
                const fields = field.value as PropertyData<PropertyType>[];
                const childrens: Entity[] = [];
                fields.forEach((field) => {
                    const child = castProperty(ids, field);
                    if (!child) return;
                    childrens.push(child);
                });
                return createFolder(field.key, childrens, (field.params as PropertyParams[PropertyType.FOLDER])?.expanded);
            case PropertyType.BUTTON:
                return createButton(field as PropertyData<PropertyType.BUTTON>);

            case PropertyType.STRING:
                return createEntity(ids, field);
            case PropertyType.BOOLEAN:
                const bool_field = field as PropertyData<PropertyType.BOOLEAN>;
                return createEntity(ids, field, {
                    unset: bool_field?.params?.disabled
                });
            case PropertyType.NUMBER:
                const num_field = field as PropertyData<PropertyType.NUMBER>;
                return createEntity(ids, field, {
                    format: num_field?.params?.format,
                    step: num_field?.params?.step
                });
            case PropertyType.VECTOR_2:
                const vec2_field = field as PropertyData<PropertyType.VECTOR_2>;
                return createEntity(ids, field, {
                    x: vec2_field?.params?.x,
                    y: vec2_field?.params?.y,
                });
            case PropertyType.VECTOR_3:
                const vec3_field = field as PropertyData<PropertyType.VECTOR_3>;
                return createEntity(ids, field, {
                    x: vec3_field?.params?.x,
                    y: vec3_field?.params?.y,
                    z: vec3_field?.params?.z,
                });
            case PropertyType.VECTOR_4:
                const vec4_field = field as PropertyData<PropertyType.VECTOR_4>;
                return createEntity(ids, field, {
                    x: vec4_field?.params?.x,
                    y: vec4_field?.params?.y,
                    z: vec4_field?.params?.z,
                    w: vec4_field?.params?.w,
                });
            case PropertyType.POINT_2D:
                const point2_field = field as PropertyData<PropertyType.POINT_2D>;
                return createEntity(ids, field, {
                    picker: 'popup',
                    expanded: false,
                    x: point2_field?.params?.x,
                    y: { ...point2_field?.params?.y, inverted: true }
                });
            case PropertyType.COLOR:
                return createEntity(ids, field, {
                    picker: 'popup',
                    expanded: false
                });
            case PropertyType.ITEM_LIST:
                const item_list_params = field?.params as PropertyParams[PropertyType.ITEM_LIST];
                return createEntity(ids, field, {
                    view: 'item-list',
                    options: item_list_params?.options,
                    pickText: item_list_params?.pickText,
                    emptyText: item_list_params?.emptyText,
                    onOptionClick: item_list_params?.onOptionClick
                });
            case PropertyType.LIST_TEXTURES:
                return createEntity(ids, field, {
                    view: 'thumbnail-list',
                    options: field?.params
                });
            case PropertyType.LIST_TEXT:
                return createEntity(ids, field, {
                    view: 'search-list',
                    options: field?.params
                });
            case PropertyType.LOG_DATA:
                return createEntity(ids, field, {
                    view: 'textarea',
                    rows: 6,
                    placeholder: 'Type here...'
                });
            case PropertyType.SLIDER:
                const slider_field = field as PropertyData<PropertyType.SLIDER>;
                return createEntity(ids, field, {
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

    function isFolder(obj: Entity): obj is Folder {
        const has_title = (obj as Folder).title != undefined;
        const has_childrens = (obj as Folder).childrens != undefined;
        return (has_title && has_childrens);
    }

    function isButton(obj: Entity): obj is Button {
        const has_title = (obj as Button).title != undefined;
        const has_onClick = (obj as Button).onClick != undefined;
        return (has_title && has_onClick);
    }

    function createFolder(title: string, childrens: Entity[], expanded: boolean) {
        return {
            title,
            childrens,
            expanded
        };
    }

    function createButton(field: PropertyData<PropertyType.BUTTON>, params?: ButtonParams): Button {
        return {
            title: field.title ?? field.key,
            onClick: field.value,
            params: params ?? { title: field.title ?? field.key }
        }
    }

    function createEntity<T extends PropertyType>(ids: number[], field: PropertyData<T>, params?: any): Property {
        const entity: Property = {
            obj: field,
            key: 'value',
            params: {
                label: field.title ?? field.key,
                readonly: field.readonly,
                ...params
            }
        };

        if (!field.readonly) {
            entity.onBeforeChange = () => {
                if (!_is_first || _is_refresh) {
                    return;
                }

                _is_first = false;

                onBeforeChange({
                    ids,
                    field
                });
            };

            entity.onChange = (event: ChangeEvent) => {
                // NOTE: не обновляем только что измененные значения из вне(после refresh)
                if (_is_refresh) {
                    tryDisabledVectorValueByAxis({
                        ids,
                        data: {
                            field,
                            event
                        }
                    });
                    return;
                }

                onChange({
                    ids,
                    data: {
                        field,
                        event
                    }
                });

                if (event.last) {
                    tryDisabledVectorValueByAxis({
                        ids,
                        data: {
                            field,
                            event
                        }
                    });

                    // Update the field after a short delay
                    setTimeout(() => {
                        tryDisabledVectorValueByAxis({
                            ids,
                            data: {
                                field,
                                event
                            }
                        });
                    });

                    _is_first = true;
                }
            };
        }

        return entity;
    }

    function renderEntities(entities: Entity[], place: FolderApi = _inspector) {
        for (const entity of entities) {
            // папка
            if (isFolder(entity)) {
                // рекурсивно добавляем дочерние entities
                const folder = place.addFolder({ title: entity.title, expanded: entity.expanded });
                renderEntities(entity.childrens!, folder);
                continue;
            }

            // кнопка
            if (isButton(entity)) {
                place.addButton(entity.params).on('click', entity.onClick);
                continue;
            }

            // обычное поле
            const binding = place.addBinding(entity.obj, entity.key, entity.params);
            if (entity.onBeforeChange) binding.controller.value.emitter.on('beforechange', entity.onBeforeChange);
            if (entity.onChange) binding.on('change', entity.onChange);
            _field_name_to_pane[entity.obj.key] = binding as Refreshable;
        }
    }

    function findFieldRecursive(fields: PropertyData<PropertyType>[], name: string): PropertyData<PropertyType> | undefined {
        for (const field of fields) {
            if (field.key == name) {
                return field;
            }
            if (field.type == PropertyType.FOLDER) {
                const found = findFieldRecursive(field.value as PropertyData<PropertyType>[], name);
                if (found) return found;
            }
        }
        return undefined;
    }

    // FIXME: не находит вложенных полей
    function tryDisabledVectorValueByAxis(info: ChangeInfo) {
        const isVectorField = [PropertyType.VECTOR_2, PropertyType.VECTOR_3, PropertyType.VECTOR_4].includes(info.data.field.type);

        if (!isVectorField || !info.data.event.target.controller.view.valueElement) {
            return;
        }

        const inputs = info.data.event.target.controller.view.valueElement.querySelectorAll('input');
        const axisCount = inputs.length;

        const differentAxes = new Array(axisCount).fill(false);

        const firstObj = _data.find(obj => obj.id == info.ids[0]);
        if (!firstObj) {
            Log.warn('[tryDisabledVectorValueByAxis] First object not found for id:', info.ids[0]);
            return;
        }

        const firstField = findFieldRecursive(firstObj.fields, info.data.field.key);
        if (!firstField) {
            Log.warn('[tryDisabledVectorValueByAxis] Field not found in first object:', info.data.field.key);
            return;
        }

        const referenceValue = firstField.value as { x: number, y: number, z?: number, w?: number };

        for (let i = 1; i < info.ids.length; i++) {
            const currentObj = _data.find(obj => obj.id == info.ids[i]);
            if (!currentObj) {
                Log.warn('[tryDisabledVectorValueByAxis] Object not found for id:', info.ids[i]);
                continue;
            }

            const currentField = currentObj.fields.find(field => field.key == info.data.field.key);
            if (!currentField) {
                Log.warn('[tryDisabledVectorValueByAxis] Field not found in object:', info.data.field.key, currentObj);
                continue;
            }

            const currentValue = currentField.value as { x: number, y: number, z?: number, w?: number };

            if (axisCount >= 1 && !differentAxes[0] && currentValue.x != referenceValue.x) {
                differentAxes[0] = true;
            }
            if (axisCount >= 2 && !differentAxes[1] && currentValue.y != referenceValue.y) {
                differentAxes[1] = true;
            }
            if (axisCount >= 3 && !differentAxes[2] && currentValue.z != referenceValue.z) {
                differentAxes[2] = true;
            }
            if (axisCount >= 4 && !differentAxes[3] && currentValue.w != referenceValue.w) {
                differentAxes[3] = true;
            }

            if (differentAxes.every(axis => axis)) {
                break;
            }
        }

        for (let axis = 0; axis < axisCount; axis++) {
            if (differentAxes[axis]) {
                inputs[axis].value = '-';
            }
        }
    }

    function onBeforeChange(info: BeforeChangeInfo) {
        if (info.field.onBeforeChange) {
            info.field.onBeforeChange(info);
        }
    }

    function onChange(info: ChangeInfo) {
        if (info.data.field.onChange) {
            cut_float_precision(info, info.data.field);
            info.data.field.onChange(info);
        }
        _data.filter(item => info.ids.includes(item.id)).forEach(item => {
            item.fields.filter(field => field.key == info.data.field.key).forEach(field => {
                field.value = info.data.field.value;
            });
        });
    }

    function cut_float_precision(info: ChangeInfo, field: PropertyData<PropertyType>) {
        switch (field.type) {
            case PropertyType.NUMBER: case PropertyType.SLIDER:
                (info.data.event.value as number) = Number((info.data.event.value as number).toFixed(FLOAT_PRECISION));
                break;
            case PropertyType.VECTOR_2:
                (info.data.event.value as Vector2) = new Vector2(Number((info.data.event.value as Vector2).x.toFixed(FLOAT_PRECISION)), Number((info.data.event.value as Vector2).y.toFixed(FLOAT_PRECISION)));
                break;
            case PropertyType.VECTOR_3:
                (info.data.event.value as Vector3) = new Vector3(Number((info.data.event.value as Vector3).x.toFixed(FLOAT_PRECISION)), Number((info.data.event.value as Vector3).y.toFixed(FLOAT_PRECISION)), Number((info.data.event.value as Vector3).z.toFixed(FLOAT_PRECISION)));
                break;
            case PropertyType.VECTOR_4:
                (info.data.event.value as Vector4) = new Vector4(Number((info.data.event.value as Vector4).x.toFixed(FLOAT_PRECISION)), Number((info.data.event.value as Vector4).y.toFixed(FLOAT_PRECISION)), Number((info.data.event.value as Vector4).z.toFixed(FLOAT_PRECISION)), Number((info.data.event.value as Vector4).w.toFixed(FLOAT_PRECISION)));
                break;
        }
    }

    init();
    return { setData, refresh, clear }
}