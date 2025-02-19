import { Pane, TpChangeEvent } from 'tweakpane';
import { BindingApi, BindingParams, ButtonParams, FolderApi } from '@tweakpane/core';
import { IBaseMeshDataAndThree, IObjectTypes } from '../render_engine/types';
import * as TweakpaneImagePlugin from 'tweakpane4-image-list-plugin';
import * as TweakpaneSearchListPlugin from 'tweakpane4-search-list-plugin';
import * as TextareaPlugin from '@pangenerator/tweakpane-textarea-plugin';
import * as ExtendedPointNdInputPlugin from 'tweakpane4-extended-vector-plugin';
import { Vector2 } from 'three';

// TODO: add slider
// TODO: add params to entities
// TODO: check all property emmit change event

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
    [PropertyType.NUMBER]: { min?: number, max?: number, step?: number }; // formater for symbols after comma
    [PropertyType.VECTOR_2]: { x: { disabled?: boolean, min?: number, max?: number, step?: number }, y: { disabled?: boolean, min?: number, max?: number, step?: number } };
    [PropertyType.VECTOR_3]: { x: { disabled?: boolean, min?: number, max?: number, step?: number }, y: { disabled?: boolean, min?: number, max?: number, step?: number }, z: { disabled?: boolean, min?: number, max?: number, step?: number } };
    [PropertyType.VECTOR_4]: { x: { disabled?: boolean, min?: number, max?: number, step?: number }, y: { disabled?: boolean, min?: number, max?: number, step?: number }, z: { disabled?: boolean, min?: number, max?: number, step?: number }, w: { disabled?: boolean, min?: number, max?: number, step?: number } };
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
    data: PropertyData<PropertyType>;
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

type Entities = Folder | Button | Entity;

interface ObjectInfo {
    field: PropertyData<PropertyType>;
    property: PropertyItem<PropertyType>;
}


function InspectorControlCreate() {
    let _config: InspectorGroup[];
    let _inspector: Pane;
    let _unique_fields: { ids: number[], field: PropertyData<PropertyType>, property: PropertyItem<PropertyType> }[];

    function init() {
        _inspector = new Pane({
            container: document.querySelector('.menu_right') as HTMLDivElement
        });
        _inspector.registerPlugin(TweakpaneImagePlugin);
        _inspector.registerPlugin(TweakpaneSearchListPlugin);
        _inspector.registerPlugin(TextareaPlugin);
        _inspector.registerPlugin(ExtendedPointNdInputPlugin);
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


        if (property.type === PropertyType.VECTOR_2 || property.type === PropertyType.VECTOR_3 || property.type === PropertyType.VECTOR_4) {
            type T = PropertyValues[PropertyType.VECTOR_2];
            const field_data = field.data as T;
            const unique_field_data = _unique_fields[index].field.data as T;

            if (field_data.x !== unique_field_data.x) {
                const params = _unique_fields[index].property.params;
                if (params) (params as PropertyParams[PropertyType.VECTOR_2]).x.disabled = true;
                else _unique_fields[index].property.params = { x: { disabled: true } };
            }

            if (field_data.y !== unique_field_data.y) {
                const params = _unique_fields[index].property.params;
                if (params) (params as PropertyParams[PropertyType.VECTOR_2]).y.disabled = true;
                else _unique_fields[index].property.params = { y: { disabled: true } };
            }

            if (property.type === PropertyType.VECTOR_3 || property.type === PropertyType.VECTOR_4) {
                type T = PropertyValues[PropertyType.VECTOR_3];
                const field_data = field.data as T;
                const unique_field_data = _unique_fields[index].field.data as T;

                if (field_data.z !== unique_field_data.z) {
                    const params = _unique_fields[index].property.params;
                    if (params) (params as PropertyParams[PropertyType.VECTOR_3]).z.disabled = true;
                    else _unique_fields[index].property.params = { z: { disabled: true } };
                }
            }

            if (property.type === PropertyType.VECTOR_4) {
                type T = PropertyValues[PropertyType.VECTOR_4];
                const field_data = field.data as T;
                const unique_field_data = _unique_fields[index].field.data as T;

                if (field_data.w !== unique_field_data.w) {
                    const params = _unique_fields[index].property.params;
                    if (params) (params as PropertyParams[PropertyType.VECTOR_4]).w.disabled = true;
                    else _unique_fields[index].property.params = { w: { disabled: true } };
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

    // TODO: add/cast params from property
    function castProperty<T extends PropertyType>(ids: number[], field: PropertyData<T>, property: PropertyItem<T>): Entities | undefined {
        switch (property.type) {
            case PropertyType.STRING:
            case PropertyType.NUMBER:
            case PropertyType.BOOLEAN:
                return createEntity(ids, field, property);
            case PropertyType.VECTOR_2:
                const vec2_params = property?.params;
                const vec2_x_params = vec2_params ? (vec2_params as PropertyParams[PropertyType.VECTOR_2]).x : undefined;
                const vec2_y_params = vec2_params ? (vec2_params as PropertyParams[PropertyType.VECTOR_2]).y : undefined;
                return createEntity(ids, field, property, {
                    picker: 'inline',
                    expanded: false,
                    x: vec2_x_params,
                    y: vec2_y_params,
                });
            case PropertyType.VECTOR_3:
                const vec3_params = property?.params;
                const vec3_x_params = vec3_params ? (vec3_params as PropertyParams[PropertyType.VECTOR_3]).x : undefined;
                const vec3_y_params = vec3_params ? (vec3_params as PropertyParams[PropertyType.VECTOR_3]).y : undefined;
                const vec3_z_params = vec3_params ? (vec3_params as PropertyParams[PropertyType.VECTOR_3]).z : undefined;
                return createEntity(ids, field, property, {
                    x: vec3_x_params,
                    y: vec3_y_params,
                    z: vec3_z_params,
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
                return createEntity(ids, field, property, {
                    y: { inverted: true },
                    picker: 'inline',
                    expanded: false
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

    function set_selected_list(list: IBaseMeshDataAndThree[]) {
        clear();
        setData(list.map((value) => {
            const fields = [
                { name: 'id', data: value.mesh_data.id },
                { name: 'name', data: value.name },
                { name: 'visible', data: value.get_visible() },
                { name: 'active', data: value.get_active() },
                { name: 'position', data: value.get_position() },
                { name: 'rotation', data: value.rotation },
                { name: 'scale', data: value.get_scale() },
                { name: 'size', data: value.get_size() },
                { name: 'pivot', data: value.get_pivot() },
                { name: 'anchor', data: value.get_anchor() },
                { name: 'color', data: value.get_color() },
            ];

            switch (value.type) {
                case IObjectTypes.SLICE9_PLANE:
                    fields.push({ name: 'texture', data: '' });
                    fields.push({ name: 'slice9', data: new Vector2(0, 0) });
                    break;
                case IObjectTypes.GO_TEXT: case IObjectTypes.TEXT:
                    fields.push({ name: 'text', data: 'Hello world' });
                    fields.push({ name: 'font', data: 'Default' });
                    fields.push({ name: 'font_size', data: 8 });
                    fields.push({ name: 'text_align', data: 'center' });
                    break;
            }

            return { id: value.mesh_data.id, data: fields };
        }));
    }

    function detach() {
        clear();
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
                { name: 'id', title: 'ID', type: PropertyType.NUMBER, readonly: true },
                { name: 'type', title: 'Тип', type: PropertyType.STRING, readonly: true },
                { name: 'name', title: 'Название', type: PropertyType.STRING },
                { name: 'visible', title: 'Видимый', type: PropertyType.BOOLEAN },
                { name: 'active', title: 'Активный', type: PropertyType.BOOLEAN }
            ]
        },
        {
            name: 'transform',
            title: 'Трансформ',
            property_list: [
                { name: 'position', title: 'Позиция', type: PropertyType.VECTOR_3 },
                { name: 'rotation', title: 'Вращение', type: PropertyType.VECTOR_3 },
                { name: 'scale', title: 'Маштаб', type: PropertyType.VECTOR_3 },
                { name: 'size', title: 'Размер', type: PropertyType.VECTOR_2 },
                {
                    name: 'pivot', title: 'Точка опоры', type: PropertyType.VECTOR_2, params: {
                        x: { min: 0, max: 1, step: 0.5 },
                        y: { min: 0, max: 1, step: 0.5 }
                    }
                },
                {
                    name: 'anchor', title: 'Якорь', type: PropertyType.VECTOR_2, params: {
                        x: { min: 0, max: 1 },
                        y: { min: 0, max: 1 }
                    }
                }
            ]
        },
        {
            name: 'graphics',
            title: 'Настройки визуала',
            property_list: [
                { name: 'color', title: 'Цвет', type: PropertyType.COLOR },
                {
                    name: 'texture', title: 'Текстура', type: PropertyType.LIST_TEXTURES, params: [
                        // TODO: add real textures from get_textures
                    ]
                },
                {
                    name: 'slice9', title: 'Slice9', type: PropertyType.VECTOR_2, params: {
                        x: { min: 0 },
                        y: { min: 0 }
                    }
                },
            ]
        },
        {
            name: 'text',
            title: 'Настройки текста',
            property_list: [
                { name: 'text', title: 'Текст', type: PropertyType.LOG_DATA },
                {
                    name: 'font', title: 'Шрифт', type: PropertyType.LIST_TEXT, params: {
                        'Стандартный': 'Default'
                        // TODO: add real keys from get_all_fonts
                    }
                },
                {
                    name: 'font_size', title: 'Размер шрифта', type: PropertyType.NUMBER, params: {
                        min: 8, step: 1
                    }
                },
                {
                    name: 'text_align', title: 'Выравнивание', type: PropertyType.LIST_TEXT, params: {
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
    // const spriteFiles = document.querySelectorAll<HTMLElement>("#sprite-file");
    // spriteFiles.forEach((file) => {
    //     file.addEventListener("dragstart", (event: DragEvent) => {
    //         if (!event.dataTransfer)
    //             return;
    //         event.dataTransfer.clearData();
    //         event.dataTransfer.setData("text/plain", file.getAttribute("data-value") || '');
    //     });
    // });

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

    EventBus.on('SYS_INSPECTOR_UPDATED_VALUE', (data: ChangeInfo) => {
        console.log('UPDATED VALUE: ', data);
    });
}