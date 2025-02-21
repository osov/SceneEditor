import { Pane, TpChangeEvent } from 'tweakpane';
import { BindingApi, BindingParams, ButtonParams, FolderApi } from '@tweakpane/core';
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
    COLOR = 'color',
    TEXTURE = 'texture',
    SLICE9 = 'slice9',
    TEXT = 'text',
    FONT = 'font',
    FONT_SIZE = 'font_size',
    TEXT_ALIGN = 'text_align'
}

export enum ComponentType {
    MESH,
    FILE
}

export enum PropertyType {
    NUMBER,
    VECTOR_2, // https://tweakpane.github.io/docs/input-bindings/#pointnd
    VECTOR_3,
    VECTOR_4,
    BOOLEAN,
    COLOR,  //   view: 'color'
    STRING,
    SLIDER, // https://tweakpane.github.io/docs/input-bindings/#number_step
    LIST_TEXT, // https://github.com/hirohe/tweakpane-plugin-search-list
    LIST_TEXTURES, // https://github.com/donmccurdy/tweakpane-plugin-thumbnail-list
    BUTTON,
    POINT_2D, // inverted: true
    LOG_DATA, // https://tweakpane.github.io/docs/monitor-bindings/#multiline или https://github.com/panGenerator/tweakpane-textarea-plugin
}

export type PropertyParams = {
    [PropertyType.NUMBER]: { min?: number, max?: number, step?: number }; // formater for symbols after comma
    [PropertyType.VECTOR_2]: { x: { min: number, max: number, step?: number, disabled?: boolean }, y: { min: number, max: number, step?: number, disabled?: boolean } };
    [PropertyType.VECTOR_3]: { x: { min: number, max: number, step?: number, disabled?: boolean }, y: { min: number, max: number, step?: number, disabled?: boolean }, z: { min: number, max: number, step?: number, disabled?: boolean } };
    [PropertyType.VECTOR_4]: { x: { min: number, max: number, step?: number, disabled?: boolean }, y: { min: number, max: number, step?: number, disabled?: boolean }, z: { min: number, max: number, step?: number, disabled?: boolean }, w: { min: number, max: number, step?: number, disabled?: boolean } };
    [PropertyType.BOOLEAN]: {};
    [PropertyType.COLOR]: {};
    [PropertyType.STRING]: {};
    [PropertyType.SLIDER]: { min: number, max: number, step: number };
    [PropertyType.LIST_TEXT]: { [key in string]: string };
    [PropertyType.LIST_TEXTURES]: { key: string; text: string, src: string }[];
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

    let _refreshed = false;
    let _is_first = true;

    function init() {
        _inspector = new Pane({
            container: document.querySelector('.menu_right') as HTMLDivElement
        });
        _inspector.registerPlugin(TweakpaneImagePlugin);
        _inspector.registerPlugin(TweakpaneSearchListPlugin);
        _inspector.registerPlugin(TextareaPlugin);
        _inspector.registerPlugin(ExtendedPointNdInputPlugin);

        EventBus.on('SYS_DATA_UPDATED', refresh);
    }

    function refresh() {
        // обновления для скопированых полей
        _selected_list.forEach((item) => {
            const obj = _data.find((obj) => obj.id == item.mesh_data.id);
            if (!obj) return;
            [Property.ROTATION, Property.SIZE, Property.PIVOT, Property.ANCHOR, Property.SLICE9].forEach((property) => {
                const value = obj.data.find((p) => p.name == property);
                if (!value) return;
                switch (property) {
                    case Property.SIZE: value.data = item.get_size(); break;
                    case Property.PIVOT: value.data = item.get_pivot(); break;
                    case Property.ANCHOR: value.data = item.get_anchor(); break;
                    case Property.SLICE9: value.data = (item as Slice9Mesh).get_slice(); break;
                    case Property.ROTATION:
                        const raw = TransformControl.get_proxy().rotation;
                        value.data = new Vector3(radToDeg(raw.x), radToDeg(raw.y), radToDeg(raw.z));
                        break;
                }
            });
        });

        _inspector.refresh();
        _refreshed = true;
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

            if (property.type === PropertyType.VECTOR_2 || property.type === PropertyType.POINT_2D) {
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
            case PropertyType.NUMBER:
            case PropertyType.BOOLEAN:
                return createEntity(ids, field, property);
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
                    picker: 'inline',
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
            if (result)
                return deepClone(result);
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
        TransformControl.set_proxy_in_average_point(list);

        const data = list.map((value) => {
            const raw = TransformControl.get_proxy().rotation;
            const rotation = new Vector3(radToDeg(raw.x), radToDeg(raw.y), radToDeg(raw.z));

            // TODO: использовать index для расположения поля
            // TODO: в значение пихать callback который будет отвечать за обновление

            const fields = [
                { name: Property.ID, data: value.mesh_data.id },
                { name: Property.TYPE, data: value.type },
                { name: Property.NAME, data: value.name },
                { name: Property.VISIBLE, data: value.get_visible() },
                { name: Property.ACTIVE, data: value.get_active() },
                { name: Property.POSITION, data: TransformControl.get_proxy().position },
                { name: Property.ROTATION, data: rotation },
                { name: Property.SCALE, data: TransformControl.get_proxy().scale },
                { name: Property.SIZE, data: value.get_size() },
                { name: Property.PIVOT, data: value.get_pivot() },
                { name: Property.ANCHOR, data: value.get_anchor() },
                { name: Property.COLOR, data: value.get_color() },
            ];

            switch (value.type) {
                case IObjectTypes.SLICE9_PLANE:
                    fields.push({ name: Property.TEXTURE, data: `${(value as Slice9Mesh).get_texture()[1]}/${(value as Slice9Mesh).get_texture()[0]}` });
                    fields.push({ name: Property.SLICE9, data: (value as Slice9Mesh).get_slice() });
                    break;
                case IObjectTypes.GO_TEXT: case IObjectTypes.TEXT:
                    fields.push({ name: Property.TEXT, data: (value as TextMesh).text });
                    fields.push({ name: Property.FONT, data: (value as TextMesh).font || '' });
                    fields.push({ name: Property.FONT_SIZE, data: (value as TextMesh).fontSize });
                    fields.push({ name: Property.TEXT_ALIGN, data: (value as TextMesh).textAlign });
                    break;
            }

            return { id: value.mesh_data.id, data: fields };
        });


        clear();
        setData(data);
    }

    function detach() {
        clear();
    }

    function onUpdatedValue(value: ChangeInfo) {
        if (_refreshed) {
            _refreshed = false;
            return;
        }

        switch (value.data.field.name) {
            case Property.NAME:
                // записываем текущие значения в историю
                if (_is_first) {
                    value.ids.forEach((id) => {
                        const mesh = _selected_list.find((item) => {
                            return item.mesh_data.id == id;
                        });
                        if (!mesh) return;
                        HistoryControl.add('MESH_NAME', [{ id_mesh: id, name: mesh.name }]);
                    });
                }

                // обновляем значения в меше
                value.ids.forEach((id) => {
                    const mesh = _selected_list.find((item) => {
                        return item.mesh_data.id == id;
                    });
                    if (!mesh) return;
                    mesh.name = value.data.event.value as string;
                    ControlManager.update_graph();
                });
                break;
            case Property.ACTIVE:
                // записываем текущие значения в историю
                if (_is_first) {
                    value.ids.forEach((id) => {
                        const mesh = _selected_list.find((item) => {
                            return item.mesh_data.id == id;
                        });
                        if (!mesh) return;
                        HistoryControl.add('MESH_ACTIVE', [{ id_mesh: id, state: mesh.get_active() }]);
                    });
                }

                // обновляем значения в меше
                value.ids.forEach((id) => {
                    const mesh = _selected_list.find((item) => {
                        return item.mesh_data.id == id;
                    });
                    if (!mesh) return;
                    const state = value.data.event.value as boolean;
                    mesh.set_active(state);
                });
                break;
            case Property.VISIBLE:
                // записываем текущие значения в историю
                if (_is_first) {
                    value.ids.forEach((id) => {
                        const mesh = _selected_list.find((item) => {
                            return item.mesh_data.id == id;
                        });
                        if (!mesh) return;
                        HistoryControl.add('MESH_VISIBLE', [{ id_mesh: id, state: mesh.visible }]);
                    });
                }

                // обновляем значения в меше
                value.ids.forEach((id) => {
                    const mesh = _selected_list.find((item) => {
                        return item.mesh_data.id == id;
                    });
                    if (!mesh) return;
                    const state = value.data.event.value as boolean;
                    mesh.set_visible(state);
                });
                break;
            case Property.POSITION:
                if (_is_first) {
                    TransformControl.save_previous_positions(_selected_list);
                    TransformControl.write_previous_positions_in_historty(_selected_list);
                }

                const position = value.data.event.value as Vector3;
                TransformControl.set_proxy_position(position.x, position.y, position.z, _selected_list);
                // перерисовываем дебаг SizeControl-а
                SizeControl.draw();
                break;
            case Property.ROTATION:
                if (_is_first) {
                    TransformControl.save_previous_rotations(_selected_list);
                    TransformControl.write_previous_rotations_in_historty(_selected_list);
                }

                const rotation = value.data.event.value as Vector3;
                TransformControl.set_proxy_rotation(degToRad(rotation.x), degToRad(rotation.y), degToRad(rotation.z), _selected_list);
                // перерисовываем дебаг SizeControl-а
                SizeControl.draw();
                break;
            case Property.SCALE:
                if (_is_first) {
                    TransformControl.save_previous_scales(_selected_list);
                    TransformControl.write_previous_scales_in_historty(_selected_list);
                }

                const scale = value.data.event.value as Vector3;
                TransformControl.set_proxy_scale(scale.x, scale.y, scale.z, _selected_list);
                // перерисовываем дебаг SizeControl-а
                SizeControl.draw();
                break;
            case Property.SIZE:
                if (_is_first) {
                    value.ids.forEach((id) => {
                        const mesh = _selected_list.find((item) => {
                            return item.mesh_data.id == id;
                        });
                        if (!mesh) return;
                        HistoryControl.add('MESH_SIZE', [{
                            id_mesh: id,
                            position: mesh.get_position(),
                            size: mesh.get_size()
                        }]);
                    });
                }
                value.ids.forEach((id) => {
                    const mesh = _selected_list.find((item) => {
                        return item.mesh_data.id == id;
                    });
                    if (!mesh) return;
                    // TODO: use SizeControl
                    const size = value.data.event.value as Vector2;
                    mesh.set_size(size.x, size.y);
                });
                // перерисовываем дебаг SizeControl-а
                SizeControl.draw();
                break;
            case Property.PIVOT:
                if (_is_first) {
                    value.ids.forEach((id) => {
                        const mesh = _selected_list.find((item) => {
                            return item.mesh_data.id == id;
                        });
                        if (!mesh) return;
                        HistoryControl.add('MESH_PIVOT', [{ id_mesh: id, pivot: mesh.get_pivot() }]);
                    });
                }
                value.ids.forEach((id) => {
                    const mesh = _selected_list.find((item) => {
                        return item.mesh_data.id == id;
                    });
                    if (!mesh) return;
                    const pivot = value.data.event.value as Vector2;
                    mesh.set_pivot(pivot.x, pivot.y);
                });
                // перерисовываем дебаг SizeControl-а
                SizeControl.draw();
                break;
            case Property.ANCHOR:
                if (_is_first) {
                    value.ids.forEach((id) => {
                        const mesh = _selected_list.find((item) => {
                            return item.mesh_data.id == id;
                        });
                        if (!mesh) return;
                        HistoryControl.add('MESH_ANCHOR', [{ id_mesh: id, anchor: mesh.get_anchor() }]);
                    });
                }
                value.ids.forEach((id) => {
                    const mesh = _selected_list.find((item) => {
                        return item.mesh_data.id == id;
                    });
                    if (!mesh) return;
                    const anchor = value.data.event.value as Vector2;
                    mesh.set_anchor(anchor.x, anchor.y);
                });
                // перерисовываем дебаг SizeControl-а
                SizeControl.draw();
                break;
            case Property.COLOR:
                // записываем текущие значения в историю
                if (_is_first) {
                    value.ids.forEach((id) => {
                        const mesh = _selected_list.find((item) => {
                            return item.mesh_data.id == id;
                        });
                        if (!mesh) return;
                        HistoryControl.add('MESH_COLOR', [{ id_mesh: id, color: mesh.get_color() }]);
                    });
                }

                // обновляем значения в меше
                value.ids.forEach((id) => {
                    const mesh = _selected_list.find((item) => {
                        return item.mesh_data.id == id;
                    });
                    if (!mesh) return;
                    const color = value.data.event.value as string;
                    (mesh as Slice9Mesh).set_color(color);
                });
                break;
            case Property.TEXTURE:
                if (_is_first) {
                    value.ids.forEach((id) => {
                        const mesh = _selected_list.find((item) => {
                            return item.mesh_data.id == id;
                        });
                        if (!mesh) return;
                        const texture_data = (mesh as Slice9Mesh).get_texture();
                        const texture = `${texture_data[1]}/${texture_data[0]}`;
                        HistoryControl.add('MESH_TEXTURE', [{ id_mesh: id, texture }]);
                    });
                }

                value.ids.forEach((id) => {
                    const mesh = _selected_list.find((item) => {
                        return item.mesh_data.id == id;
                    });
                    if (!mesh) return;
                    const texture = value.data.event.value as string;
                    (mesh as Slice9Mesh).set_texture(texture);
                });
                break;
            case Property.SLICE9:
                if (_is_first) {
                    value.ids.forEach((id) => {
                        const mesh = _selected_list.find((item) => {
                            return item.mesh_data.id == id;
                        });
                        if (!mesh) return;
                        HistoryControl.add('MESH_SLICE', [{ id_mesh: id, slice: (mesh as Slice9Mesh).get_slice() }]);
                    });
                }
                value.ids.forEach((id) => {
                    const mesh = _selected_list.find((item) => {
                        return item.mesh_data.id == id;
                    });
                    if (!mesh) return;
                    const slice = value.data.event.value as Vector2;
                    (mesh as Slice9Mesh).set_slice(slice.x, slice.y);
                });
                break;
            case Property.TEXT:
                if (_is_first) {
                    value.ids.forEach((id) => {
                        const mesh = _selected_list.find((item) => {
                            return item.mesh_data.id == id;
                        });
                        if (!mesh) return;
                        HistoryControl.add('MESH_TEXT', [{ id_mesh: id, text: (mesh as TextMesh).text }]);
                    });
                }
                value.ids.forEach((id) => {
                    const mesh = _selected_list.find((item) => {
                        return item.mesh_data.id == id;
                    });
                    if (!mesh) return;
                    const text = value.data.event.value as string;
                    (mesh as TextMesh).text = text;
                });
                break;
            case Property.FONT:
                if (_is_first) {
                    value.ids.forEach((id) => {
                        const mesh = _selected_list.find((item) => {
                            return item.mesh_data.id == id;
                        });
                        if (!mesh) return;
                        HistoryControl.add('MESH_FONT', [{ id_mesh: id, font: (mesh as TextMesh).font || '' }]);
                    });
                }
                value.ids.forEach((id) => {
                    const mesh = _selected_list.find((item) => {
                        return item.mesh_data.id == id;
                    });
                    if (!mesh) return;
                    const font = value.data.event.value as string;
                    (mesh as TextMesh).font = font;
                });
                break;
            case Property.FONT_SIZE:
                if (_is_first) {
                    value.ids.forEach((id) => {
                        const mesh = _selected_list.find((item) => {
                            return item.mesh_data.id == id;
                        });
                        if (!mesh) return;
                        HistoryControl.add('MESH_FONT_SIZE', [{ id_mesh: id, font_size: (mesh as TextMesh).fontSize }]);
                    });
                }
                value.ids.forEach((id) => {
                    const mesh = _selected_list.find((item) => {
                        return item.mesh_data.id == id;
                    });
                    if (!mesh) return;
                    // TODO: change scale instead of change fontSize
                    const font_size = value.data.event.value as number;
                    (mesh as TextMesh).fontSize = font_size;
                });
                break;
            case Property.TEXT_ALIGN:
                if (_is_first) {
                    value.ids.forEach((id) => {
                        const mesh = _selected_list.find((item) => {
                            return item.mesh_data.id == id;
                        });
                        if (!mesh) return;
                        HistoryControl.add('MESH_TEXT_ALIGN', [{ id_mesh: id, text_align: (mesh as TextMesh).textAlign }]);
                    });
                }
                value.ids.forEach((id) => {
                    const mesh = _selected_list.find((item) => {
                        return item.mesh_data.id == id;
                    });
                    if (!mesh) return;
                    const text_align = value.data.event.value as any;;
                    (mesh as TextMesh).textAlign = text_align;
                });
                break;
        }

        if (_is_first) _is_first = false;
        if (value.data.event.last) _is_first = true;
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
                { name: Property.ID, title: 'ID', type: PropertyType.NUMBER, readonly: true },
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
                { name: Property.POSITION, title: 'Позиция', type: PropertyType.VECTOR_3 },
                { name: Property.ROTATION, title: 'Вращение', type: PropertyType.VECTOR_3 },
                { name: Property.SCALE, title: 'Маштаб', type: PropertyType.VECTOR_2 },
                { name: Property.SIZE, title: 'Размер', type: PropertyType.VECTOR_2 },
                {
                    name: Property.PIVOT, title: 'Точка опоры', type: PropertyType.POINT_2D, params: {
                        x: { min: 0, max: 1, step: 0.5 },
                        y: { min: 0, max: 1, step: 0.5 }
                    }
                },
                {
                    name: Property.ANCHOR, title: 'Якорь', type: PropertyType.POINT_2D, params: {
                        x: { min: -1, max: 1 },
                        y: { min: -1, max: 1 }
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
                    name: Property.TEXTURE, title: 'Текстура', type: PropertyType.LIST_TEXTURES, params: ResourceManager.get_all_textures() // FIXME: here textures not loaded yet
                },
                {
                    name: Property.SLICE9, title: 'Slice9', type: PropertyType.VECTOR_2, params: {
                        x: { min: 0, max: 0xffffffff },
                        y: { min: 0, max: 0xffffffff }
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
                        min: 8, step: 1
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