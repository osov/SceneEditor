import { Pane, TpChangeEvent } from 'tweakpane';
import { BindingApi, BindingParams, ButtonParams, FolderApi } from '@tweakpane/core';
import * as TweakpaneImagePlugin from 'tweakpane4-image-list-plugin';
import * as TweakpaneSearchListPlugin from 'tweakpane4-search-list-plugin';
import * as TextareaPlugin from '@pangenerator/tweakpane-textarea-plugin';
import * as ExtendedPointNdInputPlugin from 'tweakpane4-extended-vector-plugin';
import * as TweakpaneExtendedBooleanPlugin from 'tweakpane4-extended-boolean-plugin';
import { deepClone } from '../modules/utils';
import { Vector2, Vector3, Vector4 } from 'three';
import { FLOAT_PRECISION } from '../config';


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
    BUTTON,
    POINT_2D,
    LOG_DATA,
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
    [PropertyType.BUTTON]: {};
    [PropertyType.POINT_2D]: { x: { min: number, max: number, step?: number, format?: (value: number) => string, disabled?: boolean }, y: { min: number, max: number, step?: number, format?: (value: number) => string, disabled?: boolean } };
    [PropertyType.LOG_DATA]: {};
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
    [PropertyType.LIST_TEXT]: string; //  selected key
    [PropertyType.LIST_TEXTURES]: string; // selected key;
    [PropertyType.BUTTON]: (...args: any[]) => void;
    [PropertyType.POINT_2D]: { x: number, y: number };
    [PropertyType.LOG_DATA]: string;
}

export interface PropertyItem<T extends PropertyType> {
    name: string;
    title: string;
    type: T;
    params?: PropertyParams[T];
    readonly?: boolean;
    onBeforeChange?: OnBeforeChangeCallback;
    onChange?: OnChangeCallback;
    onRefresh?: OnRefreshCallback<T>;
}

export interface InspectorGroup {
    name: string;
    title: string;
    property_list: PropertyItem<PropertyType>[];
}

export interface PropertyData<T extends PropertyType> {
    name: string;
    data: PropertyValues[T];
}

export interface ObjectData {
    id: number;
    data: PropertyData<PropertyType>[];
}

export interface BeforeChangeInfo {
    ids: number[];
    field: PropertyData<PropertyType>;
    property: PropertyItem<PropertyType>;
}

export interface ChangeInfo {
    ids: number[];
    data: {
        field: PropertyData<PropertyType>;
        property: PropertyItem<PropertyType>;
        event: ChangeEvent;
    }
}

export type ChangeEvent = TpChangeEvent<unknown, BindingApi<unknown, unknown>>;

export type OnBeforeChangeCallback = (info: BeforeChangeInfo) => void;
export type OnChangeCallback = (info: ChangeInfo) => void;
export type OnRefreshCallback<T extends PropertyType> = (ids: number[]) => PropertyValues[T] | undefined;

type Property = string;

interface Folder {
    title: string;
    childrens: Entities[];
}

interface Button {
    title: string;
    params: ButtonParams;
    onClick: (...args: any[]) => void;
}

interface Entity {
    obj: any;
    key: string;
    params?: BindingParams;
    onBeforeChange?: (event: any) => void;
    onChange?: (event: ChangeEvent) => void;
}

interface ObjectInfo {
    field: PropertyData<PropertyType>;
    property: PropertyItem<PropertyType>;
}

type Entities = Folder | Button | Entity;


function InspectorModule() {
    let _config: InspectorGroup[];
    let _inspector: Pane;
    let _unique_fields: { ids: number[], field: PropertyData<PropertyType>, property: PropertyItem<PropertyType> }[];
    let _data: ObjectData[];

    // NOTE: Track vector fields that need to be checked for different values
    let _vector_fields: { field: PropertyData<PropertyType>, property: PropertyItem<PropertyType> }[] = []

    let _is_first = true;
    let _is_refresh = false;

    function init() {
        _inspector = new Pane({
            container: document.querySelector('.inspector__body') as HTMLElement,
        });

        registerPlugins();
    }

    function registerPlugins() {
        _inspector.registerPlugin(TweakpaneImagePlugin);
        _inspector.registerPlugin(TweakpaneSearchListPlugin);
        _inspector.registerPlugin(TextareaPlugin);
        _inspector.registerPlugin(ExtendedPointNdInputPlugin);
        _inspector.registerPlugin(TweakpaneExtendedBooleanPlugin);
    }

    function setData(list_data: ObjectData[], config: InspectorGroup[]) {
        _config = config;
        _data = list_data;
        _unique_fields = [];

        list_data.forEach((obj, index) => {
            const info: ObjectInfo[] = [];
            for (const field of obj.data) {
                // NOTE: ищем информацию о поле в соответсвующем конфиге
                const property: PropertyItem<PropertyType> | undefined = getPropertyItemByName(field.name);
                if (!property) {
                    Log.warn(`Not found property: ${field.name}`);
                    continue; // пропускаем в случае ошибки
                }

                info.push({ field, property });
            }

            // NOTE: удаляем предыдущие поля если их нету в текущем обьекте
            filterUniqueFields(info);

            info.forEach((data) => {
                // NOTE: запоминаем поле с проверкой на то что все поля между объектами одинаковые
                tryAddToUniqueField(index, obj, data.field, data.property);
            });
        });

        const entities: Entities[] = [];
        for (const unique_field of _unique_fields) {
            // NOTE: перобразование полей
            const entity = castProperty(unique_field.ids, unique_field.field, unique_field.property);
            if (!entity) continue; // пропускаем в случае ошибки

            // NOTE: формирование групп
            addToFolder(unique_field.field, entity, entities);
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
        const thumbnails = document.querySelectorAll('.tp-thumbv_sopt .tp-thumbv_sthmb .tp-thumbv_img');
        thumbnails.forEach(thumb => {
            const img = thumb as HTMLElement;
            if (img.style.backgroundImage) {
                img.style.cursor = 'pointer';
                img.addEventListener('click', () => {
                    const path = img.style.backgroundImage
                        .replace('url("', '')
                        .replace('")', '')
                        .replace(/^https?:\/\/[^\/]+/, '')
                        .replace(/assets\//, '');
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



    function refresh(properties: Property[]) {
        properties.forEach((property) => {
            const unique_field = _unique_fields.find(field => field.property.name === property);
            if (!unique_field) return;

            const { ids, property: property_item, field } = unique_field;
            if (property_item.onRefresh) {
                const data = property_item.onRefresh(ids);
                if (data) {
                    field.data = data;
                }
            }

            const pane = searchPaneInFolderByProperty(_inspector, property);
            if (pane) {
                _is_refresh = true;
                pane.refresh();
                _is_refresh = false;
            }
        });
    }

    function searchPaneInFolderByProperty(folder: FolderApi, property: Property): Pane | undefined {
        if (folder.children == undefined) {
            Log.error("Not folder: ", folder);
            return undefined;
        }

        for (const child of folder.children) {
            if ((child as FolderApi).children != undefined) {
                const folder = child as FolderApi;
                const result = searchPaneInFolderByProperty(folder, property);
                if (result != undefined) return result;
            }

            let title = '';
            for (const group of _config) {
                const item = group.property_list.find((item) => item.name == property);
                if (item) {
                    title = item.title;
                    break;
                }
            }

            if (child.element.querySelector('.tp-lblv_l')?.textContent == title) {
                return child as Pane;
            }
        }

        return undefined;
    }

    function clear() {
        // Log.log('CLEAR');
        _inspector.children.forEach((value) => {
            value.dispose();
        });
    }

    function getPropertyItemByName(name: string): PropertyItem<PropertyType> | undefined {
        for (const group of _config) {
            const result = group.property_list.find((property) => {
                return property.name == name;
            });
            if (result) {
                // копируем чтобы не менялось в конфиге
                const copy = deepClone(result);
                copy.onBeforeChange = result.onBeforeChange;
                copy.onChange = result.onChange;
                copy.onRefresh = result.onRefresh;
                // отдельно копируем callback, он есть только в NUMBER и в PointNd поэтому пока тут
                if (result.type == PropertyType.NUMBER) {
                    const number_params = (result.params as PropertyParams[PropertyType.NUMBER]);
                    if (result.params && (result.params as PropertyParams[PropertyType.NUMBER]).format) {
                        (copy.params! as PropertyParams[PropertyType.NUMBER]).format = number_params.format;
                    }
                }

                if (result.type == PropertyType.VECTOR_2 || result.type == PropertyType.VECTOR_3 || result.type == PropertyType.VECTOR_4 || result.type == PropertyType.POINT_2D) {
                    const v2p = (result.params as PropertyParams[PropertyType.VECTOR_2]);
                    if (result.params && (result.params as PropertyParams[PropertyType.VECTOR_2]).x && (result.params as PropertyParams[PropertyType.VECTOR_2]).x.format) {
                        (copy.params! as PropertyParams[PropertyType.VECTOR_2]).x.format = v2p.x.format;
                    }
                    if (result.params && (result.params as PropertyParams[PropertyType.VECTOR_2]).y && (result.params as PropertyParams[PropertyType.VECTOR_2]).y.format) {
                        (copy.params! as PropertyParams[PropertyType.VECTOR_2]).y.format = v2p.y.format;
                    }
                }

                if (result.type == PropertyType.VECTOR_3 || result.type == PropertyType.VECTOR_4) {
                    const v3p = (result.params as PropertyParams[PropertyType.VECTOR_3]);
                    if (result.params && (result.params as PropertyParams[PropertyType.VECTOR_3]).z && (result.params as PropertyParams[PropertyType.VECTOR_3]).z.format) {
                        (copy.params! as PropertyParams[PropertyType.VECTOR_3]).z.format = v3p.z.format;
                    }
                }

                if (result.type == PropertyType.VECTOR_4) {
                    const v4p = (result.params as PropertyParams[PropertyType.VECTOR_4]);
                    if (result.params && (result.params as PropertyParams[PropertyType.VECTOR_4]).w && (result.params as PropertyParams[PropertyType.VECTOR_4]).w.format) {
                        (copy.params! as PropertyParams[PropertyType.VECTOR_4]).w.format = v4p.w.format;
                    }
                }

                return copy;
            }
        }

        Log.error(`Not found ${name}`);
        return undefined;
    }

    function filterUniqueFields(info: ObjectInfo[]) {
        const buffer: number[] = [];
        _unique_fields.forEach((unique_field, index) => {
            const result = info.findIndex((data) => {
                return data.property.name == unique_field.property.name;
            });
            if (result == -1) {
                buffer.push(index);
            }
        });

        for (let i = buffer.length - 1; i >= 0; i--) {
            const index = buffer[i];
            _unique_fields.splice(index, 1);
        }
    }

    function tryAddToUniqueField(obj_index: number, obj: ObjectData, field: PropertyData<PropertyType>, property: PropertyItem<PropertyType>): boolean {
        const index = _unique_fields.findIndex((value) => {
            return value.property.name == property.name;
        });

        if (index == -1) {
            if (obj_index != 0) {
                return false;
            }

            // добавляем если это первый обьект
            _unique_fields.push({
                ids: [obj.id],
                field,
                property
            });

            // Track vector fields for later use
            if (property.type == PropertyType.VECTOR_2 ||
                property.type == PropertyType.VECTOR_3 ||
                property.type == PropertyType.VECTOR_4) {
                _vector_fields.push({ field, property });
            }

            return true;

        } else _unique_fields[index].ids.push(obj.id);

        if (property.type == PropertyType.VECTOR_2 || property.type == PropertyType.POINT_2D || property.type == PropertyType.VECTOR_3 || property.type == PropertyType.VECTOR_4) {
            type T = PropertyValues[PropertyType.VECTOR_2];
            const field_data = field.data as T;
            const unique_field_data = _unique_fields[index].field.data as T;

            if (property.type == PropertyType.VECTOR_2 || property.type == PropertyType.POINT_2D || property.type == PropertyType.VECTOR_3 || property.type == PropertyType.VECTOR_4) {
                if (field_data.x != unique_field_data.x) {
                    const params = _unique_fields[index].property.params;
                    if (params) {
                        const v2p = (params as PropertyParams[PropertyType.VECTOR_2]);
                        if (v2p.x) v2p.x.disabled = true;
                        else v2p.x = { disabled: true };
                    } else _unique_fields[index].property.params = { x: { disabled: true } };
                    unique_field_data.x = (unique_field_data.x + field_data.x) / 2;
                }

                if (field_data.y != unique_field_data.y) {
                    const params = _unique_fields[index].property.params;
                    if (params) {
                        const v2p = (params as PropertyParams[PropertyType.VECTOR_2]);
                        if (v2p.y) v2p.y.disabled = true;
                        else v2p.y = { disabled: true };
                    } else _unique_fields[index].property.params = { y: { disabled: true } };
                    unique_field_data.y = (unique_field_data.y + field_data.y) / 2;
                }
            }

            if (property.type == PropertyType.VECTOR_3 || property.type == PropertyType.VECTOR_4) {
                type T = PropertyValues[PropertyType.VECTOR_3];
                const field_data = field.data as T;
                const unique_field_data = _unique_fields[index].field.data as T;

                if (field_data.z != unique_field_data.z) {
                    const params = _unique_fields[index].property.params;
                    if (params) {
                        const v3p = (params as PropertyParams[PropertyType.VECTOR_3]);
                        if (v3p.z) v3p.z.disabled = true;
                        else v3p.z = { disabled: true };
                    } else _unique_fields[index].property.params = { z: { disabled: true } };
                    unique_field_data.z = (unique_field_data.z + field_data.z) / 2;
                }
            }

            if (property.type == PropertyType.VECTOR_4) {
                type T = PropertyValues[PropertyType.VECTOR_4];
                const field_data = field.data as T;
                const unique_field_data = _unique_fields[index].field.data as T;

                if (field_data.w != unique_field_data.w) {
                    const params = _unique_fields[index].property.params;
                    if (params) {
                        const v4p = (params as PropertyParams[PropertyType.VECTOR_4]);
                        if (v4p.w) v4p.w.disabled = true;
                        else v4p.w = { disabled: true };
                    } else _unique_fields[index].property.params = { w: { disabled: true } };
                }
                unique_field_data.w = (unique_field_data.w + field_data.w) / 2;
            }
        } else {
            if (field.data != _unique_fields[index].field.data) {
                // для кнопок всегда показываем
                if (property.type == PropertyType.BUTTON) {
                    return true;
                }
                if ([PropertyType.LIST_TEXT, PropertyType.LIST_TEXTURES, PropertyType.LOG_DATA].includes(property.type)) {
                    // для выпадающего списка и текстовых полей если между обьектами разные значения
                    _unique_fields[index].field.data = "";
                } else if (property.type == PropertyType.COLOR) {
                    // для цвета если между обьектами разные значения
                    _unique_fields[index].field.data = "#000000";
                } else if (property.type == PropertyType.BOOLEAN) {
                    // для чекбокса если между обьектами разные значения
                    _unique_fields[index].field.data = false;
                    _unique_fields[index].property.params = { disabled: true };
                } else {
                    // в ином случае просто убираем поле
                    _unique_fields.splice(index, 1);
                    return false;
                }
            }
        }

        return true;
    }

    function castProperty<T extends PropertyType>(ids: number[], field: PropertyData<T>, property: PropertyItem<T>): Entities | undefined {
        switch (property.type) {
            case PropertyType.STRING:
                return createEntity(ids, field, property);
            case PropertyType.BOOLEAN:
                return createEntity(ids, field, property, {
                    unset: (property as PropertyItem<PropertyType.BOOLEAN>)?.params?.disabled
                });
            case PropertyType.NUMBER:
                const number_prop = property as PropertyItem<PropertyType.NUMBER>;
                return createEntity(ids, field, property, {
                    format: number_prop?.params?.format,
                    min: number_prop?.params?.min,
                    max: number_prop?.params?.max,
                    step: number_prop?.params?.step
                });
            case PropertyType.VECTOR_2:
                const vec2_prop = property as PropertyItem<PropertyType.VECTOR_2>;
                return createEntity(ids, field, property, {
                    x: vec2_prop.params?.x,
                    y: vec2_prop.params?.y,
                });
            case PropertyType.VECTOR_3:
                const vec3_prop = property as PropertyItem<PropertyType.VECTOR_3>;
                return createEntity(ids, field, property, {
                    x: vec3_prop.params?.x,
                    y: vec3_prop.params?.y,
                    z: vec3_prop.params?.z,
                });
            case PropertyType.VECTOR_4:
                const vec4_prop = property as PropertyItem<PropertyType.VECTOR_4>;
                return createEntity(ids, field, property, {
                    x: vec4_prop.params?.x,
                    y: vec4_prop.params?.y,
                    z: vec4_prop.params?.z,
                    w: vec4_prop.params?.w,
                });
            case PropertyType.POINT_2D:
                const point2_prop = property as PropertyItem<PropertyType.POINT_2D>;
                return createEntity(ids, field, property, {
                    picker: 'popup',
                    expanded: false,
                    x: point2_prop.params?.x,
                    y: { ...point2_prop.params?.y, inverted: true }
                });
            case PropertyType.COLOR:
                return createEntity(ids, field, property, {
                    picker: 'popup',
                    expanded: false
                });
            case PropertyType.LIST_TEXTURES:
                return createEntity(ids, field, property, {
                    view: 'thumbnail-list',
                    options: property.params
                });
            case PropertyType.LIST_TEXT:
                return createEntity(ids, field, property, {
                    view: 'search-list',
                    options: property.params
                });
            case PropertyType.LOG_DATA:
                return createEntity(ids, field, property, {
                    view: 'textarea',
                    rows: 6,
                    placeholder: 'Type here...'
                });
            case PropertyType.SLIDER:
                const slider_prop = property as PropertyItem<PropertyType.SLIDER>;
                return createEntity(ids, field, property, {
                    label: property.title,
                    step: slider_prop.params?.step,
                    min: slider_prop.params?.min,
                    max: slider_prop.params?.max
                });
            case PropertyType.BUTTON:
                return createButton(field as PropertyData<PropertyType.BUTTON>, property as PropertyItem<PropertyType.BUTTON>, { title: property.title });
            default:
                Log.error(`Unable to cast ${field.name}`);
                return undefined;
        }
    }

    function isFolder(obj: Entities): obj is Folder {
        const has_title = (obj as Folder).title !== undefined;
        const has_childrens = (obj as Folder).childrens !== undefined;
        return (has_title && has_childrens);
    }

    function isButton(obj: Entities): obj is Button {
        const has_title = (obj as Button).title !== undefined;
        const has_onClick = (obj as Button).onClick !== undefined;
        return (has_title && has_onClick);
    }

    function addToFolder<T extends PropertyType>(field: PropertyData<T>, entity: Entities, entities: Entities[]) {
        const group = getInspectorGroupByName(field.name);
        if (group && group.title != '') {
            let folder = entities.find((value) => {
                return (isFolder(value)) && (value.title == group.title);
            }) as Folder | undefined;
            if (!folder) {
                folder = createFolder(group.title, []);
                entities.push(folder);
            }
            folder.childrens.push(entity);
        } else entities.push(entity);
    }

    function getInspectorGroupByName(name: string): InspectorGroup | undefined {
        for (const group of _config) {
            const result = group.property_list.find((property) => {
                return property.name == name;
            });
            if (result)
                return group;
        }
        return undefined;
    }

    function createFolder(title: string, childrens: Entities[]) {
        return {
            title,
            childrens
        };
    }

    function createButton(field: PropertyData<PropertyType.BUTTON>, property: PropertyItem<PropertyType.BUTTON>, params: ButtonParams): Button {
        return {
            title: property.title,
            onClick: field.data,
            params
        }
    }

    function createEntity<T extends PropertyType>(ids: number[], field: PropertyData<T>, property: PropertyItem<T>, params?: any): Entity {
        const entity: Entity = {
            obj: field,
            key: 'data',
            params: {
                label: property.title,
                readonly: property.readonly,
                ...params
            }
        };

        if (!property.readonly) {
            entity.onBeforeChange = () => {
                if (!_is_first || _is_refresh) {
                    return;
                }

                _is_first = false;

                onBeforeChange({
                    ids,
                    field,
                    property
                });
            };

            entity.onChange = (event: ChangeEvent) => {
                // NOTE: не обновляем только что измененные значения из вне(после refresh)
                if (_is_refresh) {
                    tryDisabledVectorValueByAxis({
                        ids,
                        data: {
                            field,
                            property,
                            event
                        }
                    });
                    return;
                }

                onChange({
                    ids,
                    data: {
                        field,
                        property,
                        event
                    }
                });

                if (event.last) {
                    tryDisabledVectorValueByAxis({
                        ids,
                        data: {
                            field,
                            property,
                            event
                        }
                    });

                    // Update the field after a short delay
                    setTimeout(() => {
                        tryDisabledVectorValueByAxis({
                            ids,
                            data: {
                                field,
                                property,
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

    function renderEntities(entities: Entities[], place: FolderApi = _inspector) {
        for (const entity of entities) {
            // папка
            if (isFolder(entity)) {
                // рекурсивно добавляем дочерние entities
                const folder = place.addFolder({ title: entity.title });
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
        }
    }

    function tryDisabledVectorValueByAxis(info: ChangeInfo) {
        const isVectorField = info.data.property.type === PropertyType.VECTOR_2 ||
            info.data.property.type === PropertyType.VECTOR_3 ||
            info.data.property.type === PropertyType.VECTOR_4;

        if (!isVectorField || !info.data.event.target.controller.view.valueElement) {
            return;
        }

        const inputs = info.data.event.target.controller.view.valueElement.querySelectorAll('input');
        const axisCount = inputs.length;

        const differentAxes = new Array(axisCount).fill(false);

        const firstObj = _data.find(obj => obj.id === info.ids[0]);
        if (!firstObj) {
            Log.warn('[tryDisabledVectorValueByAxis] First object not found for id:', info.ids[0]);
            return;
        }

        const firstField = firstObj.data.find(field => field.name === info.data.field.name);
        if (!firstField) {
            Log.warn('[tryDisabledVectorValueByAxis] Field not found in first object:', info.data.field.name);
            return;
        }

        const referenceValue = firstField.data as { x: number, y: number, z?: number, w?: number };

        for (let i = 1; i < info.ids.length; i++) {
            const currentObj = _data.find(obj => obj.id === info.ids[i]);
            if (!currentObj) {
                Log.warn('[tryDisabledVectorValueByAxis] Object not found for id:', info.ids[i]);
                continue;
            }

            const currentField = currentObj.data.find(field => field.name === info.data.field.name);
            if (!currentField) {
                Log.warn('[tryDisabledVectorValueByAxis] Field not found in object:', info.data.field.name);
                continue;
            }

            const currentValue = currentField.data as { x: number, y: number, z?: number, w?: number };

            if (axisCount >= 1 && !differentAxes[0] && currentValue.x !== referenceValue.x) {
                differentAxes[0] = true;
            }
            if (axisCount >= 2 && !differentAxes[1] && currentValue.y !== referenceValue.y) {
                differentAxes[1] = true;
            }
            if (axisCount >= 3 && !differentAxes[2] && currentValue.z !== referenceValue.z) {
                differentAxes[2] = true;
            }
            if (axisCount >= 4 && !differentAxes[3] && currentValue.w !== referenceValue.w) {
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
        const unique_field = _unique_fields.find(field => field.field == info.field);
        if (unique_field && unique_field.property.onBeforeChange) {
            unique_field.property.onBeforeChange(info);
        }
    }

    function onChange(info: ChangeInfo) {
        const unique_field = _unique_fields.find(field => field.field == info.data.field);
        if (unique_field && unique_field.property.onChange) {
            cut_float_precision(info, unique_field);
            unique_field.property.onChange(info);
        }
    }

    // NOTE: округляем значения для того чтобы не сохранять излишние знаки после запятой
    function cut_float_precision(info: ChangeInfo, unique_field: { field: PropertyData<PropertyType>, property: PropertyItem<PropertyType> }) {
        switch (unique_field.property.type) {
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