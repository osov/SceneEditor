import { Pane, TpChangeEvent } from 'tweakpane';
import { BindingApi, BindingParams, bindValue, BladeState, ButtonParams, FolderApi } from '@tweakpane/core';
import { IBaseMeshDataAndThree, IObjectTypes } from '../render_engine/types';
import * as TweakpaneImagePlugin from 'tweakpane4-image-list-plugin';
import * as TweakpaneSearchListPlugin from 'tweakpane4-search-list-plugin';
import * as TextareaPlugin from '@pangenerator/tweakpane-textarea-plugin';
import * as ExtendedPointNdInputPlugin from 'tweakpane4-extended-vector-plugin';
import { Vector2, Vector3 } from 'three';
import { TextMesh } from '../render_engine/objects/text';
import { Slice9Mesh } from '../render_engine/objects/slice9';
import { deepClone, degToRad } from '../modules/utils';
import { radToDeg } from 'three/src/math/MathUtils';
import { PositionEventData, RotationEventData, ScaleEventData } from './types';


declare global {
    const InspectorControl: ReturnType<typeof InspectorControlCreate>;
}

export function register_inspector_control() {
    (window as any).InspectorControl = InspectorControlCreate();
}

/*
    TODO: возможно лучше было бы если на обновлении конкретных полей просто отправлялся ивент
        и уже необходимый контрол слушал изменения  (вне зависимости активный он или нет)
        и обновлял информацию в своей зоне ответсвенности

        + Меньше связанность
        + Не будут торчать лишьние методы наружу у контролов
        + Инспектор будет отвечать только за изменение и обновления своих полей не зная о других контролах

        Где будут обновляться поля которые не контролируются контролами ? (color, textures и тп.)
            Оставить изменение таких полей напрямую в инспекторе
            Предоставить callback-и которые будут обвновлять такие поля
            В отдельном контроле/ах для таких полей

    TODO: определять полей из списка выделенных обьектов за пределами инспектора
        + Меньше связанность, инспектор не будет знать о внешних типах и будет получать только список обьектов ObjectData

    TODO: вынести обновление конкретных полей
        (которые нужно обновлять вручную / вызывать функции для получения обновленных данных mesh-а) в отдельный callback

- в цвете кроме хекс кода и зоны выбора цвета не нужен раздел снизу где можно переключить RGB/HSL
- slice9 тож можно сделать с зоной выбора
- размер шрифта шаг должен был 1, а щас не целый
- при выборе любого свойства(цвет, выпадающий) - он не отменяется при клике на пустое место, 
    если открыть например шрифт и выбор не отменяется, затем можно еще и открыть выравнивание, те получается
    что раскрыто два списка как баг
*/

export enum Property {
    ID = 'id',
    TYPE = 'type',
    NAME = 'name',
    VISIBLE = 'visible',
    ACTIVE = 'active',
    POSITION = 'position',
    ROTATION = 'rotation',
    SCALE = 'scale',
    SIZE = 'size',
    PIVOT = 'pivot',
    ANCHOR = 'anchor',
    ANCHOR_PRESET = 'anchor_preset',
    COLOR = 'color',
    TEXTURE = 'texture',
    SLICE9 = 'slice9',
    TEXT = 'text',
    FONT = 'font',
    FONT_SIZE = 'font_size',
    TEXT_ALIGN = 'text_align'
}

export enum ScreenPointPreset {
    NONE = 'None',
    CENTER = 'Center',
    TOP_LEFT = 'Top Left',
    TOP_CENTER = 'Top Center',
    TOP_RIGHT = 'Top Right',
    LEFT_CENTER = 'Left Center',
    RIGHT_CENTER = 'Right Center',
    BOTTOM_LEFT = 'Bottom Left',
    BOTTOM_CENTER = 'Bottom Center',
    BOTTOM_RIGHT = 'Bottom Right',
    CUSTOM = 'Custom'
}

export enum ComponentType {
    MESH,
    FILE
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
    [PropertyType.VECTOR_2]: { x: { min: number, max: number, step?: number, disabled?: boolean }, y: { min: number, max: number, step?: number, disabled?: boolean } };
    [PropertyType.VECTOR_3]: { x: { min: number, max: number, step?: number, disabled?: boolean }, y: { min: number, max: number, step?: number, disabled?: boolean }, z: { min: number, max: number, step?: number, disabled?: boolean } };
    [PropertyType.VECTOR_4]: { x: { min: number, max: number, step?: number, disabled?: boolean }, y: { min: number, max: number, step?: number, disabled?: boolean }, z: { min: number, max: number, step?: number, disabled?: boolean }, w: { min: number, max: number, step?: number, disabled?: boolean } };
    [PropertyType.BOOLEAN]: {};
    [PropertyType.COLOR]: {};
    [PropertyType.STRING]: {};
    [PropertyType.SLIDER]: { min: number, max: number, step: number };
    [PropertyType.LIST_TEXT]: { [key in string]: string };
    [PropertyType.LIST_TEXTURES]: { value: string, src: string }[];
    [PropertyType.BUTTON]: {};
    [PropertyType.POINT_2D]: { x: { min: number, max: number, step?: number, disabled?: boolean }, y: { min: number, max: number, step?: number, disabled?: boolean } };
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
    params?: PropertyParams[T]; // зависит от типа
    readonly?: boolean;
}

export interface InspectorGroup {
    name: string;
    title: string;
    property_list: PropertyItem<PropertyType>[];
}

export interface PropertyData<T extends PropertyType> {
    name: string;
    data: PropertyValues[T]; // values 
}

export interface ObjectData {
    id: number;
    data: PropertyData<PropertyType>[];
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
    onChange?: (event: ChangeEvent) => void;
}

interface ObjectInfo {
    field: PropertyData<PropertyType>;
    property: PropertyItem<PropertyType>;
}

type Entities = Folder | Button | Entity;


function InspectorControlCreate() {
    let _config: InspectorGroup[];
    let _inspector: Pane;
    let _unique_fields: { ids: number[], field: PropertyData<PropertyType>, property: PropertyItem<PropertyType> }[];
    let _selected_list: IBaseMeshDataAndThree[];
    let _data: ObjectData[];
    let _last_state: BladeState;

    let _refreshed = false;
    let _is_first = true;

    function init() {
        _inspector = new Pane({
            container: document.querySelector('.menu_right .inspector__body') as HTMLDivElement
        });
        _inspector.registerPlugin(TweakpaneImagePlugin);
        _inspector.registerPlugin(TweakpaneSearchListPlugin);
        _inspector.registerPlugin(TextareaPlugin);
        _inspector.registerPlugin(ExtendedPointNdInputPlugin);

        EventBus.on('SYS_DATA_UPDATED', refresh);
    }

    function refresh() {
        _selected_list.forEach((item) => {
            const obj = _data.find((obj) => obj.id == item.mesh_data.id);
            if (!obj) return;
            [
                Property.ROTATION,
                Property.SIZE,
                Property.PIVOT,
                Property.ANCHOR,
                Property.ANCHOR_PRESET,
                Property.SLICE9,
                Property.TEXTURE,
                Property.FONT_SIZE
            ].forEach((property) => {
                const value = obj.data.find((p) => p.name == property);
                if (!value) return;
                switch (property) {
                    case Property.SIZE: value.data = item.get_size(); break;
                    case Property.PIVOT: value.data = item.get_pivot(); break;
                    case Property.ANCHOR: value.data = item.get_anchor(); break;
                    case Property.ANCHOR_PRESET:
                        value.data = anchorToScreenPreset(item.get_anchor());
                        break;
                    case Property.SLICE9: value.data = (item as Slice9Mesh).get_slice(); break;
                    case Property.ROTATION:
                        const raw = item.rotation;
                        value.data = new Vector3(radToDeg(raw.x), radToDeg(raw.y), radToDeg(raw.z));
                        break;
                    case Property.FONT_SIZE:
                        const delta = new Vector3(1 * item.scale.x, 1 * item.scale.y);
                        const max_delta = Math.max(delta.x, delta.y);
                        const font_size = (item as TextMesh).fontSize * max_delta;
                        value.data = font_size;
                        break;
                }
            });
        });

        _refreshed = true;
        _inspector.refresh();
    }

    function clear() {
        _inspector.children.forEach((value) => {
            value.dispose();
        });
    }

    function setupConfig(config: InspectorGroup[]) { //, type: ComponentType) {
        _config = config;
    }

    function setData(list_data: ObjectData[]) {
        _unique_fields = [];
        _data = list_data;
        list_data.forEach((obj, index) => {
            const info: ObjectInfo[] = [];
            for (const field of obj.data) {
                // ищем информацию о поле в соответсвующем конфиге
                const property: PropertyItem<PropertyType> | undefined = getPropertyItemByName(field.name);
                if (!property) continue; // пропускаем в случае ошибки

                info.push({ field, property });
            }

            // удаляем предыдущие поля если их нету в текущем обьекте
            filterUniqueFields(info);

            info.forEach((data) => {
                // запоминаем поле с проверкой на то что все поля между объектами одинаковые
                tryAddToUniqueField(index, obj, data.field, data.property);
            });
        });

        const entities: Entities[] = [];
        for (const unique_field of _unique_fields) {
            // перобразование полей
            const entity = castProperty(unique_field.ids, unique_field.field, unique_field.property);
            if (!entity) continue; // пропускаем в случае ошибки

            // формирование групп
            addToFolder(unique_field.field, entity, entities);
        }

        // добавляем поля в инспектор
        renderEntities(entities);

        const tp_slo = document.querySelector('.tp-search-listv_options') as HTMLDivElement;
        if (tp_slo) tp_slo.classList.add('my_scroll');
        const tp_to = document.querySelector('.tp-thumbv_ovl') as HTMLDivElement;
        if (tp_to) tp_to.classList.add('my_scroll');
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

    // TODO: refactoring
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
            return true;
        } else _unique_fields[index].ids.push(obj.id);

        if (property.type === PropertyType.VECTOR_2 || PropertyType.POINT_2D || property.type === PropertyType.VECTOR_3 || property.type === PropertyType.VECTOR_4) {
            type T = PropertyValues[PropertyType.VECTOR_2];
            const field_data = field.data as T;
            const unique_field_data = _unique_fields[index].field.data as T;

            if (property.type === PropertyType.VECTOR_2 || property.type === PropertyType.POINT_2D || property.type === PropertyType.VECTOR_3 || property.type === PropertyType.VECTOR_4) {
                let disabled_x = false;
                if (field_data.x !== unique_field_data.x) {
                    const params = _unique_fields[index].property.params;
                    if (params) {
                        const v2p = (params as PropertyParams[PropertyType.VECTOR_2]);
                        if (v2p.x) v2p.x.disabled = true;
                    } else _unique_fields[index].property.params = { x: { disabled: true } };
                    disabled_x = true;
                }

                let disabled_y = false;
                if (field_data.y !== unique_field_data.y) {
                    const params = _unique_fields[index].property.params;
                    if (params) {
                        const v2p = (params as PropertyParams[PropertyType.VECTOR_2]);
                        if (v2p.y) v2p.y.disabled = true;
                    } else _unique_fields[index].property.params = { y: { disabled: true } };
                    disabled_y = true;
                }

                if (disabled_x && disabled_y) {
                    _unique_fields.splice(index, 1);
                    return false;
                }
            }

            if (property.type === PropertyType.VECTOR_3 || property.type === PropertyType.VECTOR_4) {
                type T = PropertyValues[PropertyType.VECTOR_3];
                const field_data = field.data as T;
                const unique_field_data = _unique_fields[index].field.data as T;

                if (field_data.z !== unique_field_data.z) {
                    const params = _unique_fields[index].property.params;
                    if (params) {
                        const v3p = (params as PropertyParams[PropertyType.VECTOR_3]);
                        if (v3p.z) v3p.z.disabled = true;
                    } else _unique_fields[index].property.params = { z: { disabled: true } };
                }
            }

            if (property.type === PropertyType.VECTOR_4) {
                type T = PropertyValues[PropertyType.VECTOR_4];
                const field_data = field.data as T;
                const unique_field_data = _unique_fields[index].field.data as T;

                if (field_data.w !== unique_field_data.w) {
                    const params = _unique_fields[index].property.params;
                    if (params) {
                        const v4p = (params as PropertyParams[PropertyType.VECTOR_4]);
                        if (v4p.w) v4p.w.disabled = true;
                    } else _unique_fields[index].property.params = { w: { disabled: true } };
                }
            }
        } else if (field.data != _unique_fields[index].field.data) {
            _unique_fields.splice(index, 1);
        }

        return true;
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
            if (entity.onChange) binding.on('change', entity.onChange);
        }
    }

    // TODO: refactoring
    function castProperty<T extends PropertyType>(ids: number[], field: PropertyData<T>, property: PropertyItem<T>): Entities | undefined {
        switch (property.type) {
            case PropertyType.STRING:
            case PropertyType.BOOLEAN:
                return createEntity(ids, field, property);
            case PropertyType.NUMBER:
                const number_property = property as PropertyItem<PropertyType.NUMBER>;
                return createEntity(ids, field, property, {
                    format: number_property?.params?.format,
                    min: number_property?.params?.min,
                    max: number_property?.params?.max,
                    step: number_property?.params?.step
                });
            case PropertyType.VECTOR_2:
                const vec2_property = property as PropertyItem<PropertyType.VECTOR_2>;
                return createEntity(ids, field, property, {
                    x: vec2_property.params?.x,
                    y: vec2_property.params?.y,
                });
            case PropertyType.VECTOR_3:
                const vec3_property = property as PropertyItem<PropertyType.VECTOR_3>;
                return createEntity(ids, field, property, {
                    x: vec3_property.params?.x,
                    y: vec3_property.params?.y,
                    z: vec3_property.params?.z,
                });
            case PropertyType.VECTOR_4:
                const vec4_params = property?.params;
                const vec4_x_params = vec4_params ? (vec4_params as PropertyParams[PropertyType.VECTOR_4]).x : undefined;
                const vec4_y_params = vec4_params ? (vec4_params as PropertyParams[PropertyType.VECTOR_4]).y : undefined;
                const vec4_z_params = vec4_params ? (vec4_params as PropertyParams[PropertyType.VECTOR_4]).z : undefined;
                const vec4_w_params = vec4_params ? (vec4_params as PropertyParams[PropertyType.VECTOR_4]).w : undefined;
                return createEntity(ids, field, property, {
                    x: vec4_x_params,
                    y: vec4_y_params,
                    z: vec4_z_params,
                    w: vec4_w_params,
                });
            case PropertyType.POINT_2D:
                const point2_params = property?.params;
                const point2_x_params = point2_params ? (point2_params as PropertyParams[PropertyType.POINT_2D]).x : undefined;
                const point2_y_params = point2_params ? (point2_params as PropertyParams[PropertyType.POINT_2D]).y : undefined;
                return createEntity(ids, field, property, {
                    picker: 'popup',
                    expanded: false,
                    x: point2_x_params,
                    y: { ...point2_y_params, inverted: true }
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
                const slider_params = property.params;
                const step = slider_params ? (slider_params as PropertyParams[PropertyType.SLIDER]).step : undefined;
                const min = slider_params ? (slider_params as PropertyParams[PropertyType.SLIDER]).min : undefined;
                const max = slider_params ? (slider_params as PropertyParams[PropertyType.SLIDER]).max : undefined;
                return createEntity(ids, field, property, {
                    label: property.title,
                    step,
                    min,
                    max
                });
            case PropertyType.BUTTON:
                return createButton(field as PropertyData<PropertyType.BUTTON>, property as PropertyItem<PropertyType.BUTTON>, { title: property.title });
            default:
                Log.error(`Unable to cast ${field.name}`)
                return undefined;
        }
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

    function getPropertyItemByName(name: string): PropertyItem<PropertyType> | undefined {
        for (const group of _config) {
            const result = group.property_list.find((property) => {
                return property.name == name;
            });
            if (result) {
                const copy = deepClone(result);
                if (result.type == PropertyType.NUMBER) {
                    const number_params = (result.params as PropertyParams[PropertyType.NUMBER]);
                    if (result.params && (result.params as PropertyParams[PropertyType.NUMBER]).format) {
                        copy.params.format = number_params.format;
                    }
                }
                return copy;
            }
        }

        Log.error(`Not found ${name}`);
        return undefined;
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
            entity.onChange = (event: ChangeEvent) => {
                console.log(event.target.controller.value);
                onUpdatedValue({
                    ids,
                    data: {
                        field,
                        property,
                        event
                    }
                });
            };
        }

        return entity;
    }

    function set_selected_list(list: IBaseMeshDataAndThree[]) {
        _selected_list = list;
        // TransformControl.set_proxy_in_average_point(list);

        const data = list.map((value) => {
            const raw = value.rotation;
            const rotation = new Vector3(radToDeg(raw.x), radToDeg(raw.y), radToDeg(raw.z));

            // TODO: использовать index для расположения поля
            // TODO: в значение пихать callback который будет отвечать за обновление

            const pivot_preset = pivotToScreenPreset(value.get_pivot());
            const anchor_preset = anchorToScreenPreset(value.get_anchor());

            const fields = [
                { name: Property.ID, data: value.mesh_data.id },
                { name: Property.TYPE, data: value.type },
                { name: Property.NAME, data: value.name },
                { name: Property.VISIBLE, data: value.get_visible() },
                { name: Property.ACTIVE, data: value.get_active() },
                { name: Property.POSITION, data: value.position },
                { name: Property.ROTATION, data: rotation },
                { name: Property.SCALE, data: value.scale },
                { name: Property.SIZE, data: value.get_size() },
                { name: Property.PIVOT, data: pivot_preset },
                { name: Property.ANCHOR_PRESET, data: anchor_preset },
                { name: Property.ANCHOR, data: value.get_anchor() },
                { name: Property.COLOR, data: value.get_color() },
            ];

            // обновляем конфиг текстур
            _config.forEach((group) => {
                const property = group.property_list.find((property) => property.name == Property.TEXTURE);
                if (!property) return;
                (property.params as PropertyParams[PropertyType.LIST_TEXTURES]) = ResourceManager.get_all_textures().map((info) => {
                    return {
                        value: `${info.atlas}/${info.name}`,
                        // FIXME: нужно оптимизировать если хотим с картинками
                        src: ''//info.data.texture.source.toJSON().url as string
                    };
                });
            });

            // обновляем конфиг шрифтов
            _config.forEach((group) => {
                const property = group.property_list.find((property) => property.name == Property.FONT);
                if (!property) return;
                (property.params as PropertyParams[PropertyType.LIST_TEXT]) = ResourceManager.get_all_fonts();
            });


            switch (value.type) {
                case IObjectTypes.SLICE9_PLANE:
                    fields.push({ name: Property.TEXTURE, data: `${(value as Slice9Mesh).get_texture()[1]}/${(value as Slice9Mesh).get_texture()[0]}` });
                    fields.push({ name: Property.SLICE9, data: (value as Slice9Mesh).get_slice() });
                    break;
                case IObjectTypes.GO_TEXT: case IObjectTypes.TEXT:
                    fields.push({ name: Property.TEXT, data: (value as TextMesh).text });
                    fields.push({ name: Property.FONT, data: (value as TextMesh).font || '' });

                    const delta = new Vector3(1 * value.scale.x, 1 * value.scale.y);
                    const max_delta = Math.max(delta.x, delta.y);
                    const font_size = (value as TextMesh).fontSize * max_delta;

                    fields.push({ name: Property.FONT_SIZE, data: font_size });
                    fields.push({ name: Property.TEXT_ALIGN, data: (value as TextMesh).textAlign });
                    break;
            }

            return { id: value.mesh_data.id, data: fields };
        });


        clear();
        setData(data);
        _last_state = deepClone(_inspector.exportState());
    }

    function pivotToScreenPreset(pivot: Vector2) {
        if (pivot.x == 0.5 && pivot.y == 0.5) {
            return ScreenPointPreset.CENTER;
        } else if (pivot.x == 0 && pivot.y == 1) {
            return ScreenPointPreset.TOP_LEFT;
        } else if (pivot.x == 0.5 && pivot.y == 1) {
            return ScreenPointPreset.TOP_CENTER;
        } else if (pivot.x == 1 && pivot.y == 1) {
            return ScreenPointPreset.TOP_RIGHT;
        } else if (pivot.x == 0 && pivot.y == 0.5) {
            return ScreenPointPreset.LEFT_CENTER;
        } else if (pivot.x == 1 && pivot.y == 0.5) {
            return ScreenPointPreset.RIGHT_CENTER;
        } else if (pivot.x == 0 && pivot.y == 0) {
            return ScreenPointPreset.BOTTOM_LEFT;
        } else if (pivot.x == 0.5 && pivot.y == 0) {
            return ScreenPointPreset.BOTTOM_CENTER;
        } else if (pivot.x == 1 && pivot.y == 0) {
            return ScreenPointPreset.BOTTOM_RIGHT;
        }

        return ScreenPointPreset.CENTER;
    }

    function screenPresetToPivotValue(preset: ScreenPointPreset) {
        switch (preset) {
            case ScreenPointPreset.CENTER: return new Vector2(0.5, 0.5);
            case ScreenPointPreset.TOP_LEFT: return new Vector2(0, 1);
            case ScreenPointPreset.TOP_CENTER: return new Vector2(0.5, 1);
            case ScreenPointPreset.TOP_RIGHT: return new Vector2(1, 1);
            case ScreenPointPreset.LEFT_CENTER: return new Vector2(0, 0.5);
            case ScreenPointPreset.RIGHT_CENTER: return new Vector2(1, 0.5);
            case ScreenPointPreset.BOTTOM_LEFT: return new Vector2(0, 0);
            case ScreenPointPreset.BOTTOM_CENTER: return new Vector2(0.5, 0);
            case ScreenPointPreset.BOTTOM_RIGHT: return new Vector2(1, 0);
            default: return new Vector2(0.5, 0.5);
        }
    }

    function anchorToScreenPreset(anchor: Vector2) {
        if (anchor.x == 0.5 && anchor.y == 0.5) {
            return ScreenPointPreset.CENTER;
        } else if (anchor.x == 0 && anchor.y == 1) {
            return ScreenPointPreset.TOP_LEFT;
        } else if (anchor.x == 0.5 && anchor.y == 1) {
            return ScreenPointPreset.TOP_CENTER;
        } else if (anchor.x == 1 && anchor.y == 1) {
            return ScreenPointPreset.TOP_RIGHT;
        } else if (anchor.x == 0 && anchor.y == 0.5) {
            return ScreenPointPreset.LEFT_CENTER;
        } else if (anchor.x == 1 && anchor.y == 0.5) {
            return ScreenPointPreset.RIGHT_CENTER;
        } else if (anchor.x == 0 && anchor.y == 0) {
            return ScreenPointPreset.BOTTOM_LEFT;
        } else if (anchor.x == 0.5 && anchor.y == 0) {
            return ScreenPointPreset.BOTTOM_CENTER;
        } else if (anchor.x == 1 && anchor.y == 0) {
            return ScreenPointPreset.BOTTOM_RIGHT;
        } else if (anchor.x == -1 && anchor.y == -1) {
            return ScreenPointPreset.NONE;
        }

        return ScreenPointPreset.CUSTOM;
    }

    function screenPresetToAnchorValue(preset: ScreenPointPreset) {
        switch (preset) {
            case ScreenPointPreset.CENTER: return new Vector2(0.5, 0.5);
            case ScreenPointPreset.TOP_LEFT: return new Vector2(0, 1);
            case ScreenPointPreset.TOP_CENTER: return new Vector2(0.5, 1);
            case ScreenPointPreset.TOP_RIGHT: return new Vector2(1, 1);
            case ScreenPointPreset.LEFT_CENTER: return new Vector2(0, 0.5);
            case ScreenPointPreset.RIGHT_CENTER: return new Vector2(1, 0.5);
            case ScreenPointPreset.BOTTOM_LEFT: return new Vector2(0, 0);
            case ScreenPointPreset.BOTTOM_CENTER: return new Vector2(0.5, 0);
            case ScreenPointPreset.BOTTOM_RIGHT: return new Vector2(1, 0);
            case ScreenPointPreset.NONE: return new Vector2(-1, -1);
            default: return new Vector2(0.5, 0.5);
        }
    }

    function detach() {
        clear();
    }

    function searchFieldInLastState(property: PropertyItem<PropertyType>) {
        function search(state: BladeState, property: PropertyItem<PropertyType>) {
            for (const [key, value] of Object.entries(state)) {
                if (key == "children") {
                    return search(value as BladeState, property);
                }

                for (const [k, v] of Object.entries(value as any)) {
                    if (k == "children") {
                        return search(v as BladeState, property);
                    }

                    if (k == "label" && v === property.title) {
                        return (value as any).binding.value;
                    }
                }
            }
        }

        return search(_last_state, property);
    }

    // FIXME: вынести сохранение за пределы проходы по мешам, чтобы схранять сразу
    //        для массива а не для каждого по отдельности, так как изменяется все срзу
    function onUpdatedValue(value: ChangeInfo) {
        if (_refreshed) {
            _refreshed = false;
            return;
        }

        console.log("STATE: ", _last_state);

        switch (value.data.field.name) {
            case Property.NAME:
                value.ids.forEach((id) => {
                    const mesh = _selected_list.find((item) => {
                        return item.mesh_data.id == id;
                    });

                    if (!mesh) return;

                    if (_is_first) {
                        HistoryControl.add('MESH_NAME', [{ id_mesh: id, name: mesh.name }]);
                    }

                    mesh.name = value.data.event.value as string;
                    ControlManager.update_graph();
                });
                break;
            case Property.ACTIVE:
                value.ids.forEach((id) => {
                    const mesh = _selected_list.find((item) => {
                        return item.mesh_data.id == id;
                    });

                    if (!mesh) return;

                    if (_is_first) {
                        HistoryControl.add('MESH_ACTIVE', [{ id_mesh: id, state: mesh.get_active() }]);
                    }

                    const state = value.data.event.value as boolean;
                    mesh.set_active(state);
                });
                break;
            case Property.VISIBLE:
                value.ids.forEach((id) => {
                    const mesh = _selected_list.find((item) => {
                        return item.mesh_data.id == id;
                    });

                    if (!mesh) return;

                    if (_is_first) {
                        HistoryControl.add('MESH_VISIBLE', [{ id_mesh: id, state: mesh.visible }]);
                    }

                    const state = value.data.event.value as boolean;
                    mesh.set_visible(state);
                });
                break;

            case Property.POSITION:
                const oldPosition = searchFieldInLastState(value.data.property);

                if (_is_first) {
                    const oldPositions: PositionEventData[] = [];
                    value.ids.forEach((id) => {
                        const mesh = _selected_list.find((item) => {
                            return item.mesh_data.id == id;
                        });

                        if (!mesh) return;

                        oldPositions.push({ id_mesh: mesh.mesh_data.id, position: oldPosition });
                    });

                    TransformControl.write_positions_in_history(oldPositions);
                }

                value.ids.forEach((id) => {
                    const mesh = _selected_list.find((item) => {
                        return item.mesh_data.id == id;
                    });

                    if (!mesh) return;

                    const position_property = value.data.property as PropertyItem<PropertyType.VECTOR_3>;
                    const pos = value.data.event.value as Vector3;

                    if (position_property.params?.x.disabled) {
                        pos.x = oldPosition.x;
                    }

                    if (position_property.params?.y.disabled) {
                        pos.y = oldPosition.y;
                    }

                    if (position_property.params?.z.disabled) {
                        pos.z = oldPosition.z;
                    }

                    mesh.set_position(pos.x, pos.y, pos.z);
                });

                // перерисовывать дебаг TransformControl-а
                TransformControl.set_proxy_in_average_point(_selected_list);
                // перерисовываем дебаг SizeControl-а
                SizeControl.draw();
                break;

            case Property.ROTATION:
                const oldRotation = searchFieldInLastState(value.data.property);

                if (_is_first) {
                    const oldRotations: RotationEventData[] = [];
                    value.ids.forEach((id) => {
                        const mesh = _selected_list.find((item) => {
                            return item.mesh_data.id == id;
                        });

                        if (!mesh) return;

                        oldRotations.push({ id_mesh: id, rotation: oldRotation });
                    });

                    TransformControl.write_rotations_in_history(oldRotations);
                }

                value.ids.forEach((id) => {
                    const mesh = _selected_list.find((item) => {
                        return item.mesh_data.id == id;
                    });

                    if (!mesh) return;

                    const rotation_property = value.data.property as PropertyItem<PropertyType.VECTOR_3>;
                    const raw_rot = value.data.event.value as Vector3;
                    const rot = new Vector3(degToRad(raw_rot.x), degToRad(raw_rot.y), degToRad(raw_rot.z));

                    if (rotation_property.params?.x.disabled) {
                        rot.x = oldRotation.x;
                    }

                    if (rotation_property.params?.y.disabled) {
                        rot.y = oldRotation.y;
                    }

                    if (rotation_property.params?.z.disabled) {
                        rot.z = oldRotation.z;
                    }

                    mesh.rotation.set(rot.x, rot.y, rot.z);
                    mesh.transform_changed();
                });

                // обновляем визуал контролов
                TransformControl.set_proxy_in_average_point(_selected_list);
                SizeControl.draw();
                break;
            case Property.SCALE:
                const oldScale = searchFieldInLastState(value.data.property);

                if (_is_first) {
                    const oldScales: ScaleEventData[] = [];
                    value.ids.forEach((id) => {
                        const mesh = _selected_list.find((item) => {
                            return item.mesh_data.id == id;
                        });

                        if (!mesh) return;

                        oldScales.push({ id_mesh: id, scale: oldScale })
                    });

                    TransformControl.write_scales_in_history(oldScales);
                }

                value.ids.forEach((id) => {
                    const mesh = _selected_list.find((item) => {
                        return item.mesh_data.id == id;
                    });

                    if (!mesh) return;

                    const scale_property = value.data.property as PropertyItem<PropertyType.VECTOR_3>;
                    const scale = value.data.event.value as Vector3;

                    if (scale_property.params?.x.disabled) {
                        scale.x = oldScale.x;
                    }

                    if (scale_property.params?.y.disabled) {
                        scale.y = oldScale.y;
                    }

                    if (scale_property.params?.z.disabled) {
                        scale.z = oldScale.z;
                    }

                    (mesh as any).scale.copy(scale);
                    mesh.transform_changed();

                    // если это текстовы меш, то от скейла зависит размер шрифта
                    if ((mesh as TextMesh).fontSize) {
                        const delta = new Vector3(1 * scale.x, 1 * scale.y, scale.z);
                        const max_delta = Math.max(delta.x, delta.y);

                        (mesh as TextMesh).fontSize * max_delta;
                    }
                });

                // обновляем визуал контролов
                TransformControl.set_proxy_in_average_point(_selected_list);
                SizeControl.draw();

                // для обновления размере шрифта
                refresh();
                break;
            case Property.SIZE:
                // TODO: change logic
                value.ids.forEach((id) => {
                    const mesh = _selected_list.find((item) => {
                        return item.mesh_data.id == id;
                    });

                    if (!mesh) return;

                    if (_is_first) {
                        HistoryControl.add('MESH_SIZE', [{
                            id_mesh: id,
                            position: mesh.get_position(),
                            size: mesh.get_size()
                        }]);
                    }

                    const size = value.data.event.value as Vector2;
                    mesh.set_size(size.x, size.y);
                });

                // обновляем визуал контролов
                SizeControl.draw();
                break;
            case Property.PIVOT:
                value.ids.forEach((id) => {
                    const mesh = _selected_list.find((item) => {
                        return item.mesh_data.id == id;
                    });

                    if (!mesh) return;

                    if (_is_first) {
                        HistoryControl.add('MESH_PIVOT', [{ id_mesh: id, pivot: mesh.get_pivot() }]);
                    }

                    const pivot_preset = value.data.event.value as ScreenPointPreset;
                    const pivot = screenPresetToPivotValue(pivot_preset);
                    mesh.set_pivot(pivot.x, pivot.y, true);
                });

                // обновляем визуал контролов
                SizeControl.draw();
                break;
            case Property.ANCHOR:
                value.ids.forEach((id) => {
                    const mesh = _selected_list.find((item) => {
                        return item.mesh_data.id == id;
                    });

                    if (!mesh) return;

                    if (_is_first) {
                        HistoryControl.add('MESH_ANCHOR', [{ id_mesh: id, anchor: mesh.get_anchor() }]);
                    }

                    const anchor = value.data.event.value as Vector2;
                    mesh.set_anchor(anchor.x, anchor.y);
                });

                // обновляем визуал контролов
                SizeControl.draw();
                if (value.data.event.last) {
                    refresh();
                }
                break;
            case Property.ANCHOR_PRESET:
                value.ids.forEach((id) => {
                    const mesh = _selected_list.find((item) => {
                        return item.mesh_data.id == id;
                    });

                    if (!mesh) return;

                    if (_is_first) {
                        HistoryControl.add('MESH_ANCHOR', [{ id_mesh: id, anchor: mesh.get_anchor() }]);
                    }

                    const anchor = screenPresetToAnchorValue(value.data.event.value as ScreenPointPreset);
                    if (anchor) {
                        mesh.set_anchor(anchor.x, anchor.y);
                    }
                });

                SizeControl.draw();
                refresh();
                break;
            case Property.COLOR:
                value.ids.forEach((id) => {
                    const mesh = _selected_list.find((item) => {
                        return item.mesh_data.id == id;
                    });

                    if (!mesh) return;

                    if (_is_first) {
                        HistoryControl.add('MESH_COLOR', [{ id_mesh: id, color: mesh.get_color() }]);
                    }

                    const color = value.data.event.value as string;
                    (mesh as Slice9Mesh).set_color(color);
                });
                break;
            case Property.TEXTURE:
                value.ids.forEach((id) => {
                    const mesh = _selected_list.find((item) => {
                        return item.mesh_data.id == id;
                    });

                    if (!mesh) return;

                    if (_is_first) {
                        const texture_data = (mesh as Slice9Mesh).get_texture();
                        const texture = `${texture_data[1]}/${texture_data[0]}`;
                        HistoryControl.add('MESH_TEXTURE', [{ id_mesh: id, texture }]);
                    }

                    const texture_data = (value.data.event.value as any).value.split('/');
                    (mesh as Slice9Mesh).set_texture(texture_data[1], texture_data[0]);
                });
                break;
            case Property.SLICE9:
                value.ids.forEach((id) => {
                    const mesh = _selected_list.find((item) => {
                        return item.mesh_data.id == id;
                    });

                    if (!mesh) return;

                    if (_is_first) {
                        HistoryControl.add('MESH_SLICE', [{ id_mesh: id, slice: (mesh as Slice9Mesh).get_slice() }]);
                    }

                    const slice = value.data.event.value as Vector2;
                    (mesh as Slice9Mesh).set_slice(slice.x, slice.y);
                });
                break;
            case Property.TEXT:
                value.ids.forEach((id) => {
                    const mesh = _selected_list.find((item) => {
                        return item.mesh_data.id == id;
                    });

                    if (!mesh) return;

                    if (_is_first) {
                        HistoryControl.add('MESH_TEXT', [{ id_mesh: id, text: (mesh as TextMesh).text }]);
                    }

                    const text = value.data.event.value as string;
                    (mesh as TextMesh).text = text;
                });
                break;
            case Property.FONT:
                value.ids.forEach((id) => {
                    const mesh = _selected_list.find((item) => {
                        return item.mesh_data.id == id;
                    });

                    if (!mesh) return;

                    if (_is_first) {
                        HistoryControl.add('MESH_FONT', [{ id_mesh: id, font: (mesh as TextMesh).font || '' }]);
                    }

                    const font = value.data.event.value as string;
                    (mesh as TextMesh).font = font;
                });
                break;
            case Property.FONT_SIZE:
                value.ids.forEach((id) => {
                    const mesh = _selected_list.find((item) => {
                        return item.mesh_data.id == id;
                    });

                    if (!mesh) return;

                    if (_is_first) {
                        HistoryControl.add('MESH_FONT_SIZE', [{ id_mesh: id, scale: mesh.scale.clone() }]);
                    }

                    const font_size = value.data.event.value as number;
                    const delta = font_size / (mesh as TextMesh).fontSize;

                    mesh.scale.set(1 * delta, 1 * delta, mesh.scale.z);
                    mesh.transform_changed();

                    // обновляем визуал контролов
                    TransformControl.set_proxy_in_average_point(_selected_list);
                    SizeControl.draw();
                    refresh();
                });
                break;
            case Property.TEXT_ALIGN:
                value.ids.forEach((id) => {
                    const mesh = _selected_list.find((item) => {
                        return item.mesh_data.id == id;
                    });
                    if (!mesh) return;

                    if (_is_first) {
                        HistoryControl.add('MESH_TEXT_ALIGN', [{ id_mesh: id, text_align: (mesh as TextMesh).textAlign }]);
                    }

                    const text_align = value.data.event.value as any;;
                    (mesh as TextMesh).textAlign = text_align;
                });
                break;
        }

        if (_is_first) _is_first = false;
        if (value.data.event.last) {
            _is_first = true;
            _last_state = deepClone(_inspector.exportState());
        }
    }

    init();
    return { setupConfig, setData, set_selected_list, detach }
}

export function getDefaultInspectorConfig() {
    return [
        {
            name: 'base',
            title: '',
            property_list: [
                { name: Property.ID, title: 'ID', type: PropertyType.NUMBER, readonly: true, params: { format: (v: number) => v.toFixed(0) } },
                { name: Property.TYPE, title: 'Тип', type: PropertyType.STRING, readonly: true },
                { name: Property.NAME, title: 'Название', type: PropertyType.STRING },
                { name: Property.VISIBLE, title: 'Видимый', type: PropertyType.BOOLEAN },
                { name: Property.ACTIVE, title: 'Активный', type: PropertyType.BOOLEAN }
            ]
        },
        {
            name: 'transform',
            title: 'Трансформ',
            property_list: [
                {
                    name: Property.POSITION, title: 'Позиция', type: PropertyType.VECTOR_3, params: {
                        x: { step: 0.5 },
                        y: { step: 0.5 },
                        z: { step: 0.001 }
                    }
                },
                { name: Property.ROTATION, title: 'Вращение', type: PropertyType.VECTOR_3 },
                { name: Property.SCALE, title: 'Маштаб', type: PropertyType.VECTOR_2 },
                { name: Property.SIZE, title: 'Размер', type: PropertyType.VECTOR_2 },
                {
                    name: Property.PIVOT, title: 'Точка опоры', type: PropertyType.LIST_TEXT, params: {
                        'Центр': ScreenPointPreset.CENTER,
                        'Левый Верхний': ScreenPointPreset.TOP_LEFT,
                        'Центр Сверху': ScreenPointPreset.TOP_CENTER,
                        'Правый Верхний': ScreenPointPreset.TOP_RIGHT,
                        'Центр Слева': ScreenPointPreset.LEFT_CENTER,
                        'Центр Справа': ScreenPointPreset.RIGHT_CENTER,
                        'Левый Нижний': ScreenPointPreset.BOTTOM_LEFT,
                        'Центр Снизу': ScreenPointPreset.BOTTOM_CENTER,
                        'Правый Нижний': ScreenPointPreset.BOTTOM_RIGHT
                    }
                }
            ]
        },
        {
            name: 'anchor',
            title: 'Якорь',
            property_list: [
                {
                    name: Property.ANCHOR, title: 'Значение', type: PropertyType.POINT_2D, params: {
                        x: { min: -1, max: 1 },
                        y: { min: -1, max: 1 }
                    }
                },
                {
                    name: Property.ANCHOR_PRESET, title: 'Пресет', type: PropertyType.LIST_TEXT, params: {
                        'Не выбрано': ScreenPointPreset.NONE,
                        'Центр': ScreenPointPreset.CENTER,
                        'Левый Верхний': ScreenPointPreset.TOP_LEFT,
                        'Центр Сверху': ScreenPointPreset.TOP_CENTER,
                        'Правый Верхний': ScreenPointPreset.TOP_RIGHT,
                        'Центр Слева': ScreenPointPreset.LEFT_CENTER,
                        'Центр Справа': ScreenPointPreset.RIGHT_CENTER,
                        'Левый Нижний': ScreenPointPreset.BOTTOM_LEFT,
                        'Центр Снизу': ScreenPointPreset.BOTTOM_CENTER,
                        'Правый Нижний': ScreenPointPreset.BOTTOM_RIGHT,
                        'Индивидуальный': ScreenPointPreset.CUSTOM
                    }
                }
            ]
        },
        {
            name: 'graphics',
            title: 'Настройки визуала',
            property_list: [
                { name: Property.COLOR, title: 'Цвет', type: PropertyType.COLOR },
                {
                    name: Property.TEXTURE, title: 'Текстура', type: PropertyType.LIST_TEXTURES, params: ResourceManager.get_all_textures().map((info) => {
                        return {
                            key: `${info.atlas}/${info.name}`,
                            text: `${info.atlas}/${info.name}`,
                            // FIXME: нужно оптимизировать если хотим с картинками
                            src: ''//info.data.texture.source.toJSON().url as string
                        };
                    })
                },
                {
                    name: Property.SLICE9, title: 'Slice9', type: PropertyType.POINT_2D, params: {
                        x: { min: 0, max: 100 },
                        y: { min: 0, max: 100 }
                    }
                },
            ]
        },
        {
            name: 'text',
            title: 'Настройки текста',
            property_list: [
                { name: Property.TEXT, title: 'Текст', type: PropertyType.LOG_DATA },
                {
                    name: Property.FONT, title: 'Шрифт', type: PropertyType.LIST_TEXT, params: ResourceManager.get_all_fonts()
                },
                {
                    name: Property.FONT_SIZE, title: 'Размер шрифта', type: PropertyType.NUMBER, params: {
                        min: 8, step: 1, format: (v: number) => v.toFixed(0)
                    }
                },
                {
                    name: Property.TEXT_ALIGN, title: 'Выравнивание', type: PropertyType.LIST_TEXT, params: {
                        'Центр': 'center',
                        'Слева': 'left',
                        'Справа': 'right',
                        'По ширине': 'justify'
                    }
                },
            ]
        }
    ];
}

/*
 
Модуль должен быть независимой системой и не иметь или иметь минимум зависимостей от других.
 
есть библиотека https://github.com/repalash/uiconfig-tweakpane которая вроде как делает то что нам нужно, те по данным генерит визуал, не понятно какой она плюс отдельно даст
если можно и без нее делать все это, но при этом тут уже есть типы векторов и связка с ThreeJS может быть удобно, надо пощупать
 
еще для LIST надо бы юзать не стандартную библиотеку, а типа такой, где есть поиск:
    https://github.com/hirohe/tweakpane-plugin-search-list
 
есть еще селект плагин с превью какой-то:
    https://github.com/cosmicshelter/tweakpane-plugin-preview-select
 
вот этот интересный и нужный, превью картинок(для текстур нужно будет), но не хватает конечно поиска в нем:
    https://github.com/donmccurdy/tweakpane-plugin-thumbnail-list
 
 
на каждое изменение свойства срабатывает событие с данными аналогичные содержимому ObjectData[], но лишь измененные, а не все сразу
но для сохранения истории изменений скажем если юзер таскал ползунок, то сохраняем до первого таскания состояние и затем лишь после отпускания, те не нужны все промежуточные
 
этот контрол может управлять сразу несколькими выделенными объектами, если среди них есть разные свойства, например у Slice9Mesh есть свойство slice(get_slice/set_slice),
а мы выделили одновременно и текстовый блок и картинку, то прятать данные эти хоть и в конфиге они есть
также хороший пример если у 2х объектов например позиции х одинаковая, а y отличается, то нужно рисовать прочерк в этом поле(те поведение большинства редакторов игр)
 
 
Не все свойства рисовать через визуальное отображение, те где плюсик нажимаем и появляется поле. 
делать так только для свойств где указано visual.
* - эти свойства только у типа IObjectTypes.SLICE9_PLANE
** - доступно только для типа IObjectTypes.TEXT
 
Основные свойства:
 
ID - число, не изменяемое | mesh_data.id
Тип - строка, не изменяемое | type
Имя - строка | name
Видимый(Visible) - boolean | get_visble/set_visible
Активный(Active) - boolean | get_active/set_active
 
Позиция vec3 | метод get_position/set_position, шаг для x,y = 0.5, z = 0.001
Вращение vec3(градусы, эйлеры) | свойство rotation - хранится изначально в радианах
Масштаб vec3 | свойство scale
Размер vec2 | метод get_size/set_size
 
Точка опоры(Pivot) vec2(visual) | get_pivot/set_pivot(X, Y, true), шаг 0.5, значения 0, 0.5, 1
Якорь(Anchor) - checkBox+vec2(visual) | get_anchor/set_anchor, значения 0..1, но если якорь не задан то вернет/задаем -1, -1, те например объединить - checkBox + vec2, те активен ли якорь и если чебокс снят то скидывать значение в -1, -1, если стоит то ставить в 0.5, 0.5 при клике
 
Цвет color | метод get_color/set_color
Текстура* string(выпадающий) | метод get_texture(вернет массив, - имя текстуры, атлас)/set_texture(имя, атлас), пустая строка если не задано либо строка вида atlas/texture_name текстуры
Slice9* vec2 | метод get_slice/set_slice, минимум 0
 
Текст** string | метод set_text/свойство text для чтения
Шрифт** string(выпадающий список из ключей от ResourceManager.get_all_fonts()) | метод set_font/свойство parameters.font для чтения
Размер шрифта** int | шаг 1, минимум 8 делаем как в дефолде, как бы управляем тут числом, но по факту меняем scale пропорционально, а отталкиваться от стартового значения из свойства fontSize, скажем шрифт 32 по умолчанию. и пишем тут что сейчас стоит скажем 32, но если начнем крутить то скейлим уже, но свойство не трогаем
Выравнивание** string выпадающий из списка - [center, left, right, justify]/[Центр, Слева, Справа, По ширине] | свойство textAlign
 
*/


export function run_debug_inpector() {
    // InspectorControl.setupConfig([
    //     {
    //         name: 'base',
    //         title: '',
    //         property_list: [
    //             { name: 'id', title: 'ID', type: PropertyType.NUMBER, readonly: true },
    //             { name: 'name', title: 'Название', type: PropertyType.STRING, }
    //         ]
    //     },
    //     {
    //         name: 'transform',
    //         title: 'Трансформ',
    //         property_list: [
    //             { name: 'position', title: 'Позиция', type: PropertyType.VECTOR_3 },
    //             { name: 'rotation', title: 'Вращение', type: PropertyType.VECTOR_3 },
    //             { name: 'scale', title: 'Маштаб', type: PropertyType.VECTOR_3 }
    //         ]
    //     },
    //     {
    //         name: 'test',
    //         title: 'Тестовые',
    //         property_list: [
    //             { name: 'point', title: 'Поинт', type: PropertyType.POINT_2D },
    //             { name: 'vec2', title: 'Вектор2', type: PropertyType.VECTOR_2 },
    //             { name: 'vec4', title: 'Вектор4', type: PropertyType.VECTOR_4 },
    //             { name: 'checkbox', title: 'Чек', type: PropertyType.BOOLEAN },
    //             { name: 'color', title: 'Цвет', type: PropertyType.COLOR },
    //             { name: 'click', title: 'Кликнуть', type: PropertyType.BUTTON },
    //             {
    //                 name: 'textures', title: 'Текстура', type: PropertyType.LIST_TEXTURES, params: [
    //                     { value: 'test', src: './img/2.png' },
    //                     { value: 'img_1', src: 'https://images.freeimages.com/image/previews/b48/nature-stroke-png-design-5690476.png?fmt=webp&w=500' },
    //                     { value: 'img_2', src: 'https://images.freeimages.com/image/previews/50b/japanese-bonsai-nature-hand-png-5692400.png?fmt=webp&w=500' }
    //                 ]
    //             },
    //             {
    //                 name: 'list', title: 'Лист', type: PropertyType.LIST_TEXT, params: {
    //                     'C++': 'C++',
    //                     Test: 'Test',
    //                     Key: 'Key'
    //                 }
    //             },
    //             { name: 'mult', title: 'Текст', type: PropertyType.LOG_DATA },
    //             { name: 'slider', title: 'Слайдер', type: PropertyType.SLIDER, params: { min: 0, max: 1, step: 0.1 } }
    //         ]
    //     }
    // ]);

    // InspectorControl.setData([
    //     {
    //         id: 1, data: [
    //             { name: 'id', data: 1 },
    //             { name: 'name', data: 'test1' },
    //             { name: 'position', data: new Vector3(0, 5, 0) },
    //             { name: 'rotation', data: new Vector3(0, 0, 0) },
    //             { name: 'scale', data: new Vector3(1, 1, 1) },
    //             { name: 'point', data: new Vector2(134, 234) },
    //             { name: 'vec2', data: new Vector2(134, 234) },
    //             { name: 'vec4', data: new Vector4(1, 343, 1, 6565) },
    //             { name: 'checkbox', data: true },
    //             { name: 'color', data: "#ff0000" },
    //             { name: 'click', data: () => log('click') },
    //             { name: 'textures', data: '' },
    //             { name: 'mult', data: 'text1\ntext2' },
    //             { name: 'list', data: 'C++' },
    //             { name: 'slider', data: 0.5 }
    //         ]
    //     },
    //     {
    //         id: 2, data: [
    //             { name: 'id', data: 1 },
    //             { name: 'name', data: 'test1' },
    //             { name: 'position', data: new Vector3(0, 10, 0) },
    //             { name: 'rotation', data: new Vector3(1, 0, 0) },
    //             { name: 'scale', data: new Vector3(1, 1, 1) },
    //             { name: 'point', data: new Vector2(134, 234) },
    //             { name: 'vec2', data: new Vector2(134, 234) },
    //             { name: 'vec4', data: new Vector4(1, 343, 0, 6565) },
    //             { name: 'checkbox', data: true },
    //             { name: 'color', data: "#ff0000" },
    //             { name: 'click', data: () => log('click') },
    //             { name: 'textures', data: '' },
    //             { name: 'mult', data: 'text1\ntext2' },
    //             { name: 'list', data: 'C++' },
    //             { name: 'slider', data: 0.5 }
    //         ]
    //     },
    //     // {
    //     //     id: 5, data: [
    //     //         { name: 'textures', data: '' }
    //     //     ]
    //     // }
    // ]);
}