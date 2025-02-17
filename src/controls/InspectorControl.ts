import { Pane, TpChangeEvent } from 'tweakpane';
import { BindingApi, BindingParams, ButtonParams, FolderApi } from '@tweakpane/core';
import * as TweakpaneImagePlugin from 'tweakpane4-image-list-plugin';
import * as TweakpaneSearchListPlugin from 'tweakpane4-search-list-plugin';
import * as TextareaPlugin from '@pangenerator/tweakpane-textarea-plugin';
import * as ExtendedPointNdInputPlugin from 'tweakpane4-extended-vector-plugin';


declare global {
    const InspectorControl: ReturnType<typeof InspectorControlCreate>;
}

export function register_inspector_control() {
    (window as any).InspectorControl = InspectorControlCreate();
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
    [PropertyType.NUMBER]: { min?: number, max?: number, step?: number };
    [PropertyType.VECTOR_2]: { x: { min?: number, max?: number, step?: number }, y: { min?: number, max?: number, step?: number } };
    [PropertyType.VECTOR_3]: { x: { min?: number, max?: number, step?: number }, y: { min?: number, max?: number, step?: number }, z: { min?: number, max?: number, step?: number } };
    [PropertyType.VECTOR_4]: { x: { min?: number, max?: number, step?: number }, y: { min?: number, max?: number, step?: number }, z: { min?: number, max?: number, step?: number }, w: { min?: number, max?: number, step?: number } };
    [PropertyType.BOOLEAN]: {};
    [PropertyType.COLOR]: {};
    [PropertyType.STRING]: {};
    [PropertyType.SLIDER]: { min: number, max: number, step: number };
    [PropertyType.LIST_TEXT]: { [key in string]: string };
    [PropertyType.LIST_TEXTURES]: { key: string; text: string, src: string }[];
    [PropertyType.BUTTON]: {};
    [PropertyType.POINT_2D]: { x: { min?: number, max?: number, step?: number }, y: { min?: number, max?: number, step?: number } };
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
    [PropertyType.LIST_TEXTURES]: string;// selected key;
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
    data: PropertyData<PropertyType>;
}

export type ChangeEvent = TpChangeEvent<unknown, BindingApi<unknown, unknown>>;

export interface EntityData {
    obj: any;
    key: string;
    params?: BindingParams | ButtonParams;
}

export interface Folder {
    title: string;
    childrens: Entities[];
}

export interface Button {
    title: string;
    params: ButtonParams;
    onClick: (...args: any[]) => void;
}

export interface Entity {
    obj: any;
    key: string;
    params?: BindingParams;
    onChange?: (event: ChangeEvent) => void;
}

export type Entities = Folder | Button | Entity;


function InspectorControlCreate() {
    let _config: InspectorGroup[];
    let _inspector: Pane;
    let _unique_fields: { field: PropertyData<PropertyType>, property: PropertyItem<PropertyType> }[];

    function init() {
        _inspector = new Pane({
            container: document.querySelector('.menu_right') as HTMLDivElement
        });
        _inspector.registerPlugin(TweakpaneImagePlugin);
        _inspector.registerPlugin(TweakpaneSearchListPlugin);
        _inspector.registerPlugin(TextareaPlugin);
        _inspector.registerPlugin(ExtendedPointNdInputPlugin);
    }

    function setupConfig(config: InspectorGroup[]) { //, type: ComponentType) {
        _config = config;
    }

    function setData(list_data: ObjectData[]) {
        _unique_fields = [];

        let i = 0;
        const ids: number[] = [];
        for (const obj of list_data) {
            for (const field of obj.data) {
                // ищем информацию о поле в соответсвующем конфиге
                const property: PropertyItem<PropertyType> | undefined = getPropertyItemByName(field.name);
                if (!property) continue; // пропускаем в случае ошибки

                // запоминаем поле с проверкой на то что все поля между объектами одинаковые
                tryAddToUniqueField(i, field, property);

                //TODO: добавлять нужные id
            }
            ++i;
        }

        const entities: Entities[] = [];
        for (const unique_field of _unique_fields) {
            // перобразование полей
            const entity = castProperty(ids, unique_field.field, unique_field.property);
            if (!entity) continue; // пропускаем в случае ошибки

            // формирование групп
            addToFolder(unique_field.field, entity, entities);
        }

        // добавляем поля в инспектор
        renderEntities(entities);
    }

    function tryAddToUniqueField(obj_index: number, field: PropertyData<PropertyType>, property: PropertyItem<PropertyType>): boolean {
        const index = _unique_fields.findIndex((value) => {
            return value.property.name == property.name;
        });

        if (index == -1) {
            if (obj_index != 0) {
                return false;
            }
            _unique_fields.push({ field, property });
        }

        return true;

        // FIXME: проверять поля по значению

        // if (_unique_fields[index].field == field) {
        //     return true;
        // }

        // _unique_fields.splice(index, 1);
        // return false;
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
                place.addButton(entity.params as ButtonParams).on('click', entity.onClick);
                continue;
            }

            // обычное поле
            const binding = place.addBinding(entity.obj, entity.key, entity.params);
            if (entity.onChange) binding.on('change', entity.onChange);
        }
    }

    // TODO: add/cast params from property
    function castProperty<T extends PropertyType>(ids: number[], field: PropertyData<T>, property: PropertyItem<T>): Entities | undefined {
        switch (property.type) {
            case PropertyType.STRING:
            case PropertyType.NUMBER:
            case PropertyType.BOOLEAN:
            case PropertyType.VECTOR_3:
            case PropertyType.VECTOR_4:
                return createEntity(ids, field, property, { label: property.title, readonly: property.readonly });
            case PropertyType.LOG_DATA:
                const multiline_params = { label: property.title, view: 'textarea', rows: 6, placeholder: 'Type here...' };
                return createEntity(ids, field, property, multiline_params as BindingParams);
            case PropertyType.VECTOR_2:
                const vec2_params = { label: property.title, readonly: property.readonly, picker: 'inline', expanded: false };
                return createEntity(ids, field, property, vec2_params as BindingParams);
            case PropertyType.POINT_2D:
                const point2d_params = { label: property.title, readonly: property.readonly, y: { inverted: true }, picker: 'inline', expanded: false };
                return createEntity(ids, field, property, point2d_params as BindingParams);
            case PropertyType.COLOR:
                const color_params = { label: property.title, readonly: property.readonly, picker: 'inline', expanded: false };
                return createEntity(ids, field, property, color_params as BindingParams);
            case PropertyType.BUTTON:
                return createButton(field as PropertyData<PropertyType.BUTTON>, property as PropertyItem<PropertyType.BUTTON>, { title: property.title });
            case PropertyType.LIST_TEXTURES:
                const textures_params = { label: property.title, view: 'thumbnail-list', options: property.params };
                return createEntity(ids, field, property, textures_params as BindingParams);
            case PropertyType.LIST_TEXT:
                const lsit_params = { label: property.title, view: 'search-list', options: property.params };
                return createEntity(ids, field, property, lsit_params as BindingParams);
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
                return result;
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

    function createEntity<T extends PropertyType>(ids: number[], field: PropertyData<T>, property: PropertyItem<T>, params?: BindingParams): Entity {
        const entity: Entity = {
            obj: field,
            key: 'data',
            params,
        };

        if (!property.readonly) {
            entity.onChange = (event: ChangeEvent) => {
                if (!event.last)
                    return;
                EventBus.send('SYS_INSPECTOR_UPDATED_VALUE', {
                    ids,
                    data: {
                        name: field.name,
                        data: event.value as PropertyValues[T]
                    }
                });
            };
        }

        return entity;
    }

    init();
    return { setup_config: setupConfig, set_data: setData }
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



InspectorControl.setup_config([
    {
        name: 'base',
        title: 'Основные свойства',
        property_list: [
            { name: 'name', title: 'Название', type: PropertyType.STRING, },
            { name: 'id', title: 'ID', type: PropertyType.NUMBER, readonly: true },
            { name: 'visible', title: 'Видимость', type: PropertyType.BOOLEAN },
            { name: 'position', title: 'Позиция', type: PropertyType.VECTOR_3 },
            { name: 'rotation', title: 'Вращение', type: PropertyType.VECTOR_3 },
            { name: 'scale', title: 'Масштаб', type: PropertyType.VECTOR_3 },
        ]
    }
]);

InspectorControl.set_data([
    {
        id: 1, data: [
            { name: 'position', data: { x: 10, y: 20, z: 0 } },
            { name: 'rotation', data: { x: 10, y: 0, z: 30 } },
            { name: 'scale', data: { x: 1, y: 1, z: 1 } },
            { name: 'visible', data: true },
            { name: 'name', data: 'test1' },
            { name: 'id', data: 1 }
        ]
    },

    {
        id: 2, data: [
            { name: 'position', data: { x: 10, y: 0, z: 0 } },
            { name: 'rotation', data: { x: 10, y: 0, z: 30 } },
            { name: 'scale', data: { x: 1, y: 1, z: 1 } },
            { name: 'visible', data: true },
            { name: 'name', data: 'test2' },
            { name: 'id', data: 2 }
        ]
    },
]);

*/