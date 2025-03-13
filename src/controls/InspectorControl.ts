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

TODO: попробовать упростить через дженерики, как минимум для записи в историю по типу

*/


import { Pane, TpChangeEvent } from 'tweakpane';
import { BindingApi, BindingParams, BladeState, ButtonParams, FolderApi } from '@tweakpane/core';
import { IBaseMeshAndThree, IObjectTypes } from '../render_engine/types';
import * as TweakpaneImagePlugin from 'tweakpane4-image-list-plugin';
import * as TweakpaneSearchListPlugin from 'tweakpane4-search-list-plugin';
import * as TextareaPlugin from '@pangenerator/tweakpane-textarea-plugin';
import * as ExtendedPointNdInputPlugin from 'tweakpane4-extended-vector-plugin';
import * as TweakpaneExtendedBooleanPlugin from 'tweakpane4-extended-boolean-plugin';
import { Vector2, Vector3 } from 'three';
import { TextMesh } from '../render_engine/objects/text';
import { Slice9Mesh } from '../render_engine/objects/slice9';
import { deepClone, degToRad } from '../modules/utils';
import { radToDeg } from 'three/src/math/MathUtils';
import { ActiveEventData, AnchorEventData, ColorEventData, FontEventData, FontSizeEventData, NameEventData, PivotEventData, PositionEventData, RotationEventData, ScaleEventData, SizeEventData, SliceEventData, TextAlignEventData, TextEventData, TextureEventData, VisibleEventData } from './types';
import { TextureInfo } from '../render_engine/resource_manager';
import { SERVER_URL } from '../config';


declare global {
    const InspectorControl: ReturnType<typeof InspectorControlCreate>;
}

export function register_inspector_control() {
    (window as any).InspectorControl = InspectorControlCreate();
}

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

export enum TextAlign {
    NONE = 'None',
    CENTER = 'center',
    LEFT = 'left',
    RIGHT = 'right',
    JUSTIFY = 'justify'
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

export interface BeforeChangeInfo {
    ids: number[];
    field: PropertyData<PropertyType>;
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
    onBeforeChange?: (event: any) => void;
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
    let _selected_list: IBaseMeshAndThree[];
    let _data: ObjectData[];

    let _is_first = true;
    let _is_refreshed = false;

    function init() {
        _inspector = new Pane({
            container: document.querySelector('.menu_right .inspector__body') as HTMLDivElement
        });
        _inspector.registerPlugin(TweakpaneImagePlugin);
        _inspector.registerPlugin(TweakpaneSearchListPlugin);
        _inspector.registerPlugin(TextareaPlugin);
        _inspector.registerPlugin(ExtendedPointNdInputPlugin);
        _inspector.registerPlugin(TweakpaneExtendedBooleanPlugin);
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

        const textureFiles = document.querySelectorAll<HTMLElement>(".file");
        textureFiles.forEach((file) => {
            file.addEventListener("dragstart", (event: DragEvent) => {
                if (!event.dataTransfer)
                    return;
                event.dataTransfer.clearData();

                const path = file.getAttribute("data-path") || '';
                const data = ResourceManager.get_all_textures().find((info) => {
                    return (info.data.texture as any).path == `${SERVER_URL}/assets/${path}`;
                });

                event.dataTransfer.setData("text/plain", `${data?.atlas}/${data?.name}`);
            });
        });
    }

    function set_selected_list(list: IBaseMeshAndThree[]) {
        _selected_list = list;

        // обновляем конфиг текстур
        _config.forEach((group) => {
            const property = group.property_list.find((property) => property.name == Property.TEXTURE);
            if (!property) return;
            (property.params as PropertyParams[PropertyType.LIST_TEXTURES]) = ResourceManager.get_all_textures().map(castTextureInfo);
        });

        // обновляем конфиг шрифтов
        _config.forEach((group) => {
            const property = group.property_list.find((property) => property.name == Property.FONT);
            if (!property) return;
            (property.params as PropertyParams[PropertyType.LIST_TEXT]) = ResourceManager.get_all_fonts();
        });

        // IDEA: в значение пихать callback который будет отвечать за обновление
        /* TODO: все значения должны быть копиями, чтобы инспектор не мог их изменять на прямую, а только самому в ивенте обновления
                 при этом также нужно будет еще обновлять и при рефреше */
        const data = list.map((value) => {
            const fields = [];

            fields.push({ name: Property.ID, data: value.mesh_data.id });
            fields.push({ name: Property.TYPE, data: value.type });
            fields.push({ name: Property.NAME, data: value.name });
            fields.push({ name: Property.VISIBLE, data: value.get_visible() });
            fields.push({ name: Property.ACTIVE, data: value.get_active() });
            fields.push({ name: Property.POSITION, data: value.get_position() });

            const raw = value.rotation;
            const rotation = new Vector3(radToDeg(raw.x), radToDeg(raw.y), radToDeg(raw.z));
            fields.push({ name: Property.ROTATION, data: rotation });

            fields.push({ name: Property.SCALE, data: value.get_scale() });
            fields.push({ name: Property.SIZE, data: value.get_size() });

            if ([IObjectTypes.GUI_CONTAINER, IObjectTypes.GUI_BOX, IObjectTypes.GUI_TEXT].includes(value.type)) {
                const pivot_preset = pivotToScreenPreset(value.get_pivot());
                fields.push({ name: Property.PIVOT, data: pivot_preset });
            }

            const anchor_preset = anchorToScreenPreset(value.get_anchor());
            fields.push({ name: Property.ANCHOR_PRESET, data: anchor_preset });
            fields.push({ name: Property.ANCHOR, data: value.get_anchor() });

            if ([IObjectTypes.SLICE9_PLANE, IObjectTypes.GUI_BOX, IObjectTypes.GO_SPRITE_COMPONENT].includes(value.type)) {
                fields.push({ name: Property.COLOR, data: value.get_color() });
            }

            if ([IObjectTypes.SLICE9_PLANE, IObjectTypes.GUI_BOX, IObjectTypes.GO_SPRITE_COMPONENT].includes(value.type)) {
                fields.push({ name: Property.TEXTURE, data: `${(value as Slice9Mesh).get_texture()[1]}/${(value as Slice9Mesh).get_texture()[0]}` });
                fields.push({ name: Property.SLICE9, data: (value as Slice9Mesh).get_slice() });
            }

            if ([IObjectTypes.TEXT, IObjectTypes.GUI_TEXT, IObjectTypes.GO_LABEL_COMPONENT].includes(value.type)) {
                fields.push({ name: Property.TEXT, data: (value as TextMesh).text });
                fields.push({ name: Property.FONT, data: (value as TextMesh).font || '' });

                const delta = new Vector3(1 * value.scale.x, 1 * value.scale.y);
                const max_delta = Math.max(delta.x, delta.y);
                const font_size = (value as TextMesh).fontSize * max_delta;

                fields.push({ name: Property.FONT_SIZE, data: font_size });
                fields.push({ name: Property.TEXT_ALIGN, data: (value as TextMesh).textAlign });
            }

            return { id: value.mesh_data.id, data: fields };
        });

        clear();
        setData(data);
    }

    function refresh(properties: Property[]) {
        _selected_list.forEach((item) => {
            const obj = _data.find((obj) => obj.id == item.mesh_data.id);
            if (!obj) return;
            properties.forEach((property) => {
                const value = obj.data.find((p) => p.name == property);
                if (!value) return;

                // NOTE: для полей которые не по ссылке или требуют обработки
                switch (property) {
                    case Property.POSITION: value.data = item.get_position(); break;
                    case Property.ROTATION:
                        const raw = item.rotation;
                        value.data = new Vector3(radToDeg(raw.x), radToDeg(raw.y), radToDeg(raw.z));
                        break;
                    case Property.SCALE: value.data = item.get_scale(); break;
                    case Property.SIZE: value.data = item.get_size(); break;
                    case Property.PIVOT: value.data = pivotToScreenPreset(item.get_pivot()); break;
                    case Property.ANCHOR: value.data = item.get_anchor(); break;
                    case Property.ANCHOR_PRESET: value.data = anchorToScreenPreset(item.get_anchor()); break;
                    case Property.SLICE9: value.data = (item as Slice9Mesh).get_slice(); break;
                    case Property.FONT_SIZE:
                        const delta = new Vector3(1 * item.scale.x, 1 * item.scale.y);
                        const max_delta = Math.max(delta.x, delta.y);
                        const font_size = (item as TextMesh).fontSize * max_delta;
                        value.data = font_size;
                        break;
                }
            });
        });

        properties.forEach((property) => {
            const pane = searchPaneInFolderByProperty(_inspector, property);
            if (pane) {
                _is_refreshed = true;
                pane.refresh();
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
                // отдельно копируем callback, он есть только в NUMBER и в PointNd поэтому пока тут
                if (result.type == PropertyType.NUMBER) {
                    const number_params = (result.params as PropertyParams[PropertyType.NUMBER]);
                    if (result.params && (result.params as PropertyParams[PropertyType.NUMBER]).format) {
                        copy.params.format = number_params.format;
                    }
                }

                if (result.type == PropertyType.VECTOR_2 || result.type == PropertyType.VECTOR_3 || result.type == PropertyType.VECTOR_4 || result.type == PropertyType.POINT_2D) {
                    const v2p = (result.params as PropertyParams[PropertyType.VECTOR_2]);
                    if (result.params && (result.params as PropertyParams[PropertyType.VECTOR_2]).x && (result.params as PropertyParams[PropertyType.VECTOR_2]).x.format) {
                        copy.params.x.format = v2p.x.format;
                    }
                    if (result.params && (result.params as PropertyParams[PropertyType.VECTOR_2]).y && (result.params as PropertyParams[PropertyType.VECTOR_2]).y.format) {
                        copy.params.y.format = v2p.y.format;
                    }
                }

                if (result.type == PropertyType.VECTOR_3 || result.type == PropertyType.VECTOR_4) {
                    const v3p = (result.params as PropertyParams[PropertyType.VECTOR_3]);
                    if (result.params && (result.params as PropertyParams[PropertyType.VECTOR_3]).z && (result.params as PropertyParams[PropertyType.VECTOR_3]).z.format) {
                        copy.params.z.format = v3p.z.format;
                    }
                }

                if (result.type == PropertyType.VECTOR_4) {
                    const v4p = (result.params as PropertyParams[PropertyType.VECTOR_4]);
                    if (result.params && (result.params as PropertyParams[PropertyType.VECTOR_4]).w && (result.params as PropertyParams[PropertyType.VECTOR_4]).w.format) {
                        copy.params.w.format = v4p.w.format;
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
                Log.error(`Unable to cast ${field.name}`)
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
                if (!_is_first || _is_refreshed) {
                    return;
                }

                _is_first = false;

                saveValue({
                    ids,
                    field
                });
            };

            entity.onChange = (event: ChangeEvent) => {
                // NOTE: не обновляем только что измененные значения из вне(после refresh)
                if (_is_refreshed) {
                    _is_refreshed = false;

                    tryDisabledValueByAxis({
                        ids,
                        data: {
                            field,
                            property,
                            event
                        }
                    });

                    return;
                }

                updatedValue({
                    ids,
                    data: {
                        field,
                        property,
                        event
                    }
                });

                if (event.last) {
                    // NOTE: ставим прочерки на осях если разные значения 
                    tryDisabledValueByAxis({
                        ids,
                        data: {
                            field,
                            property,
                            event
                        }
                    });

                    // NOTE: еще раз ставим прочерки на изменненой оси, потому что на изменненой оси запись значения будет после этого ивента 
                    setTimeout(() => {
                        tryDisabledValueByAxis({
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

    // NOTE: проверяем нужно ли поставить прочерк в случае разных значений
    function tryDisabledValueByAxis(info: ChangeInfo) {
        // TODO: сделать проверку на прочерк для всех векторных полей, использую функцию которя будет возвращать значения из меша по принемаемому Property
        tryDisabledPositionValueByAxis(info);
        tryDisabledRotationValueByAxis(info);
        tryDisabledScaleValueByAxis(info);
        tryDisabledSizeValueByAxis(info);
        tryDisabledAnchorValueByAxis(info);
        tryDisabledSliceValueByAxis(info);
    }

    function tryDisabledPositionValueByAxis(info: ChangeInfo) {
        if (info.data.field.name != Property.POSITION) {
            return;
        }

        let combX, combY, combZ = false;

        // NOTE: ищем несовпадения по осям
        let prevPosition: Vector3;
        for (let i = 0; i < info.ids.length; i++) {
            const id = info.ids[i];
            const mesh = _selected_list.find((item) => {
                return item.mesh_data.id == id;
            });

            if (!mesh) return;

            if (i == 0) {
                prevPosition = new Vector3();
                prevPosition.copy(mesh.position);
            } else {
                if (!combX) combX = prevPosition!.x != mesh.position.x;
                if (!combY) combY = prevPosition!.y != mesh.position.y;
                if (!combZ) combZ = prevPosition!.z != mesh.position.z;

                if (combX && combY && combZ) {
                    break;
                }

                prevPosition!.copy(mesh.position);
            }
        }

        // NOTE: рисуем '-' в нужном input теге
        const inputs = info.data.event.target.controller.view.valueElement.querySelectorAll('input');
        if (combX) inputs[0].value = '-';
        if (combY) inputs[1].value = '-';
        if (combZ) inputs[2].value = '-';
    }

    function tryDisabledRotationValueByAxis(info: ChangeInfo) {
        if (info.data.field.name != Property.ROTATION) {
            return;
        }

        let combX, combY, combZ = false;

        // NOTE: ищем несовпадения по осям
        let prevRotation: Vector3;
        for (let i = 0; i < info.ids.length; i++) {
            const id = info.ids[i];
            const mesh = _selected_list.find((item) => {
                return item.mesh_data.id == id;
            });

            if (!mesh) return;

            if (i == 0) {
                prevRotation = new Vector3();
                prevRotation.copy(mesh.rotation);
            } else {
                if (!combX) combX = prevRotation!.x != mesh.rotation.x;
                if (!combY) combY = prevRotation!.y != mesh.rotation.y;
                if (!combZ) combZ = prevRotation!.z != mesh.rotation.z;

                if (combX && combY && combZ) {
                    break;
                }

                prevRotation!.copy(mesh.rotation);
            }
        }

        // NOTE: рисуем '-' в нужном input теге
        const inputs = info.data.event.target.controller.view.valueElement.querySelectorAll('input');
        if (combX) inputs[0].value = '-';
        if (combY) inputs[1].value = '-';
        if (combZ) inputs[2].value = '-';
    }

    function tryDisabledScaleValueByAxis(info: ChangeInfo) {
        if (info.data.field.name != Property.SCALE) {
            return;
        }

        let combX, combY;

        // NOTE: ищем несовпадения по осям
        let prevScale: Vector2;
        for (let i = 0; i < info.ids.length; i++) {
            const id = info.ids[i];
            const mesh = _selected_list.find((item) => {
                return item.mesh_data.id == id;
            });

            if (!mesh) return;

            if (i == 0) {
                prevScale = new Vector2();
                prevScale.copy(mesh.get_scale());
            } else {
                if (!combX) combX = prevScale!.x != mesh.get_scale().x;
                if (!combY) combY = prevScale!.y != mesh.get_scale().y;

                if (combX && combY) {
                    break;
                }

                prevScale!.copy(mesh.get_scale());
            }
        }

        // NOTE: рисуем '-' в нужном input теге
        const inputs = info.data.event.target.controller.view.valueElement.querySelectorAll('input');
        if (combX) inputs[0].value = '-';
        if (combY) inputs[1].value = '-';
    }

    function tryDisabledSizeValueByAxis(info: ChangeInfo) {
        if (info.data.field.name != Property.SIZE) {
            return;
        }

        let combX, combY;

        // NOTE: ищем несовпадения по осям
        let prevSize: Vector2;
        for (let i = 0; i < info.ids.length; i++) {
            const id = info.ids[i];
            const mesh = _selected_list.find((item) => {
                return item.mesh_data.id == id;
            });

            if (!mesh) return;

            if (i == 0) {
                prevSize = new Vector2();
                prevSize.copy(mesh.get_size());
            } else {
                if (!combX) combX = prevSize!.x != mesh.get_size().x;
                if (!combY) combY = prevSize!.y != mesh.get_size().y;

                if (combX && combY) {
                    break;
                }

                prevSize!.copy(mesh.get_size());
            }
        }

        // NOTE: рисуем '-' в нужном input теге
        const inputs = info.data.event.target.controller.view.valueElement.querySelectorAll('input');
        if (combX) inputs[0].value = '-';
        if (combY) inputs[1].value = '-';
    }

    function tryDisabledAnchorValueByAxis(info: ChangeInfo) {
        if (info.data.field.name != Property.ANCHOR) {
            return;
        }

        let combX, combY;

        // NOTE: ищем несовпадения по осям
        let prevAnchor: Vector2;
        for (let i = 0; i < info.ids.length; i++) {
            const id = info.ids[i];
            const mesh = _selected_list.find((item) => {
                return item.mesh_data.id == id;
            });

            if (!mesh) return;

            if (i == 0) {
                prevAnchor = new Vector2();
                prevAnchor.copy(mesh.get_anchor());
            } else {
                if (!combX) combX = prevAnchor!.x != mesh.get_anchor().x;
                if (!combY) combY = prevAnchor!.y != mesh.get_anchor().y;

                if (combX && combY) {
                    break;
                }

                prevAnchor!.copy(mesh.get_anchor());
            }
        }

        // NOTE: рисуем '-' в нужном input теге
        const inputs = info.data.event.target.controller.view.valueElement.querySelectorAll('input');
        if (combX) inputs[0].value = '-';
        if (combY) inputs[1].value = '-';
    }

    function tryDisabledSliceValueByAxis(info: ChangeInfo) {
        if (info.data.field.name != Property.SLICE9) {
            return;
        }

        let combX, combY;

        // NOTE: ищем несовпадения по осям
        let prevSlice: Vector2;
        for (let i = 0; i < info.ids.length; i++) {
            const id = info.ids[i];
            const mesh = _selected_list.find((item) => {
                return item.mesh_data.id == id;
            });

            if (!mesh) return;

            if (i == 0) {
                prevSlice = new Vector2();
                prevSlice.copy((mesh as Slice9Mesh).get_slice());
            } else {
                if (!combX) combX = prevSlice!.x != (mesh as Slice9Mesh).get_slice().x;
                if (!combY) combY = prevSlice!.y != (mesh as Slice9Mesh).get_slice().y;

                if (combX && combY) {
                    break;
                }

                prevSlice!.copy((mesh as Slice9Mesh).get_slice());
            }
        }

        // NOTE: рисуем '-' в нужном input теге
        const inputs = info.data.event.target.controller.view.valueElement.querySelectorAll('input');
        if (combX) inputs[0].value = '-';
        if (combY) inputs[1].value = '-';
    }

    function saveValue(info: BeforeChangeInfo) {
        console.log("SAVED: ", info);

        switch (info.field.name) {
            case Property.NAME: saveName(info.ids); break;
            case Property.ACTIVE: saveActive(info.ids); break;
            case Property.VISIBLE: saveVisible(info.ids); break;
            case Property.POSITION: savePosition(info.ids); break;
            case Property.ROTATION: saveRotation(info.ids); break;
            case Property.SCALE: saveScale(info.ids); break;
            case Property.SIZE: saveSize(info.ids); break;
            case Property.PIVOT: savePivot(info.ids); break;
            case Property.ANCHOR: saveAnchor(info.ids); break;
            case Property.ANCHOR_PRESET: saveAnchorPreset(info.ids); break;
            case Property.COLOR: saveColor(info.ids); break;
            case Property.TEXTURE: saveTexture(info.ids); break;
            case Property.SLICE9: saveSlice(info.ids); break;
            case Property.TEXT: saveText(info.ids); break;
            case Property.FONT: saveFont(info.ids); break;
            case Property.FONT_SIZE: saveFontSize(info.ids); break;
            case Property.TEXT_ALIGN: saveTextAlign(info.ids); break;
        }
    }

    function updatedValue(info: ChangeInfo) {
        console.log("UPDATED: ", info);

        switch (info.data.field.name) {
            case Property.NAME: updateName(info); break;
            case Property.ACTIVE: updateActive(info); break;
            case Property.VISIBLE: updateVisible(info); break;
            case Property.POSITION: updatePosition(info); break;
            case Property.ROTATION: updateRotation(info); break;
            case Property.SCALE: updateScale(info); break;
            case Property.SIZE: updateSize(info); break;
            case Property.PIVOT: updatePivot(info); break;
            case Property.ANCHOR: updateAnchor(info); break;
            case Property.ANCHOR_PRESET: updateAnchorPreset(info); break;
            case Property.COLOR: updateColor(info); break;
            case Property.TEXTURE: updateTexture(info); break;
            case Property.SLICE9: updateSlice(info); break;
            case Property.TEXT: updateText(info); break;
            case Property.FONT: updateFont(info); break;
            case Property.FONT_SIZE: updateFontSize(info); break;
            case Property.TEXT_ALIGN: updateTextAlign(info); break;
        }
    }

    function saveName(ids: number[]) {
        const names: NameEventData[] = [];
        ids.forEach((id) => {
            const mesh = _selected_list.find((item) => {
                return item.mesh_data.id == id;
            });

            if (!mesh) return;

            names.push({ id_mesh: id, name: mesh.name });
        });

        HistoryControl.add('MESH_NAME', names);
    }

    function updateName(value: ChangeInfo) {
        value.ids.forEach((id) => {
            const mesh = _selected_list.find((item) => {
                return item.mesh_data.id == id;
            });

            if (!mesh) return;

            mesh.name = value.data.event.value as string;
            ControlManager.update_graph();
        });
    }

    function saveActive(ids: number[]) {
        const actives: ActiveEventData[] = [];
        ids.forEach((id) => {
            const mesh = _selected_list.find((item) => {
                return item.mesh_data.id == id;
            });

            if (!mesh) return;

            actives.push({ id_mesh: id, state: mesh.get_active() });
        });

        HistoryControl.add('MESH_ACTIVE', actives);
    }

    function updateActive(value: ChangeInfo) {
        value.ids.forEach((id) => {
            const mesh = _selected_list.find((item) => {
                return item.mesh_data.id == id;
            });

            if (!mesh) return;

            const state = value.data.event.value as boolean;
            mesh.set_active(state);
        });
    }

    function saveVisible(ids: number[]) {
        const visibles: VisibleEventData[] = [];
        ids.forEach((id) => {
            const mesh = _selected_list.find((item) => {
                return item.mesh_data.id == id;
            });

            if (!mesh) return;

            visibles.push({ id_mesh: id, state: mesh.get_visible() });
        });

        HistoryControl.add('MESH_VISIBLE', visibles);
    }

    function updateVisible(value: ChangeInfo) {
        value.ids.forEach((id) => {
            const mesh = _selected_list.find((item) => {
                return item.mesh_data.id == id;
            });

            if (!mesh) return;

            const state = value.data.event.value as boolean;
            mesh.set_visible(state);
        });
    }

    function savePosition(ids: number[]) {
        const oldPositions: PositionEventData[] = [];
        ids.forEach((id) => {
            const mesh = _selected_list.find((item) => {
                return item.mesh_data.id == id;
            });

            if (!mesh) return;

            oldPositions.push({ id_mesh: mesh.mesh_data.id, position: deepClone(mesh.position) });
        });

        HistoryControl.add("MESH_TRANSLATE", oldPositions);
    }

    function updatePosition(info: ChangeInfo) {
        const [isDraggedX, isDraggedY, isDraggedZ] = getDraggedInfo(info);
        const [isChangedX, isChangedY, isChangedZ] = getChangedInfo(info);

        const pos = info.data.event.value as Vector3;

        const averagePoint = new Vector3();
        averagePoint.copy(pos);

        // NOTE: вычесляем среднее значение позиции между всеми обьектами
        if (isDraggedX || isDraggedY || isDraggedZ) {
            const sum = new Vector3(0, 0, 0);
            info.ids.forEach((id) => {
                const mesh = _selected_list.find((item) => {
                    return item.mesh_data.id == id;
                });

                if (!mesh) return;

                sum.add(mesh.get_position());
            });

            averagePoint.copy(sum.divideScalar(info.ids.length));
        }

        info.ids.forEach((id) => {
            const mesh = _selected_list.find((item) => {
                return item.mesh_data.id == id;
            });

            if (!mesh) return;

            /* NOTE: высчитываем разницу среднего значения позиции и измененного значения в инспекторе
                     (оно уже там стоит в среднем значени, ставиться на этапе сравнения осей в векторах) */
            const x = isDraggedX ? mesh.get_position().x + (pos.x - averagePoint.x) : isChangedX ? pos.x : mesh.get_position().x;
            const y = isDraggedY ? mesh.get_position().y + (pos.y - averagePoint.y) : isChangedY ? pos.y : mesh.get_position().y;
            const z = isDraggedZ ? mesh.get_position().z + (pos.z - averagePoint.z) : isChangedZ ? pos.z : mesh.get_position().z;

            mesh.set_position(x, y, z);
        });

        TransformControl.set_proxy_in_average_point(_selected_list);
        SizeControl.draw();
    }

    function saveRotation(ids: number[]) {
        const oldRotations: RotationEventData[] = [];
        ids.forEach((id) => {
            const mesh = _selected_list.find((item) => {
                return item.mesh_data.id == id;
            });

            if (!mesh) return;

            oldRotations.push({ id_mesh: id, rotation: deepClone(mesh.rotation) });
        });

        HistoryControl.add("MESH_ROTATE", oldRotations);
    }

    function updateRotation(info: ChangeInfo) {
        const [isChangedX, isChangedY, isChangedZ] = getChangedInfo(info);

        const rawRot = info.data.event.value as Vector3;
        const rot = new Vector3(degToRad(rawRot.x), degToRad(rawRot.y), degToRad(rawRot.z));

        info.ids.forEach((id) => {
            const mesh = _selected_list.find((item) => {
                return item.mesh_data.id == id;
            });

            if (!mesh) return;

            const x = isChangedX ? rot.x : mesh.rotation.x;
            const y = isChangedY ? rot.y : mesh.rotation.y;
            const z = isChangedZ ? rot.z : mesh.rotation.z;

            mesh.rotation.set(x, y, z);
            mesh.transform_changed();
        });

        TransformControl.set_proxy_in_average_point(_selected_list);
        SizeControl.draw();
    }

    function saveScale(ids: number[]) {
        const oldScales: ScaleEventData[] = [];
        ids.forEach((id) => {
            const mesh = _selected_list.find((item) => {
                return item.mesh_data.id == id;
            });

            if (!mesh) return;

            oldScales.push({ id_mesh: id, scale: deepClone(mesh.scale) });
        });

        HistoryControl.add("MESH_SCALE", oldScales);
    }

    function updateScale(info: ChangeInfo) {
        const [isChangedX, isChangedY] = getChangedInfo(info);

        const scale = info.data.event.value as Vector3;

        info.ids.forEach((id) => {
            const mesh = _selected_list.find((item) => {
                return item.mesh_data.id == id;
            });

            if (!mesh) return;

            const x = isChangedX ? scale.x : mesh.get_scale().x;
            const y = isChangedY ? scale.y : mesh.get_scale().y;

            mesh.scale.set(x, y, 1);
            mesh.transform_changed();

            // если это текстовы меш, то от скейла зависит размер шрифта
            if ((mesh as TextMesh).fontSize) {
                const delta = new Vector3(1 * scale.x, 1 * scale.y, scale.z);
                const max_delta = Math.max(delta.x, delta.y);

                (mesh as TextMesh).fontSize * max_delta;
            }
        });

        TransformControl.set_proxy_in_average_point(_selected_list);
        SizeControl.draw();

        // для обновления размера шрифта
        refresh([Property.FONT_SIZE]);
    }

    function saveSize(ids: number[]) {
        const oldSizes: SizeEventData[] = [];
        ids.forEach((id) => {
            const mesh = _selected_list.find((item) => {
                return item.mesh_data.id == id;
            });

            if (!mesh) return;

            oldSizes.push({ id_mesh: id, position: mesh.get_position(), size: mesh.get_size() });
        });

        HistoryControl.add('MESH_SIZE', oldSizes);
    }

    function updateSize(info: ChangeInfo) {
        const [isDraggedX, isDraggedY] = getDraggedInfo(info);
        const [isChangedX, isChangedY] = getChangedInfo(info);

        const size = info.data.event.value as Vector2;

        const averageSize = new Vector2();
        averageSize.copy(size);

        if (isDraggedX || isDraggedY) {
            const sum = new Vector2(0, 0);
            info.ids.forEach((id) => {
                const mesh = _selected_list.find((item) => {
                    return item.mesh_data.id == id;
                });

                if (!mesh) return;

                sum.add(mesh.get_size());
            });

            averageSize.copy(sum.divideScalar(info.ids.length));
        }

        info.ids.forEach((id) => {
            const mesh = _selected_list.find((item) => {
                return item.mesh_data.id == id;
            });

            if (!mesh) return;

            const x = isDraggedX ? mesh.get_size().x + (size.x - averageSize.x) : isChangedX ? size.x : mesh.get_size().x;
            const y = isDraggedY ? mesh.get_size().y + (size.y - averageSize.y) : isChangedY ? size.y : mesh.get_size().y;

            mesh.set_size(x, y);
        });

        SizeControl.draw();
    }

    function savePivot(ids: number[]) {
        const pivots: PivotEventData[] = [];
        ids.forEach((id) => {
            const mesh = _selected_list.find((item) => {
                return item.mesh_data.id == id;
            });

            if (!mesh) return;

            pivots.push({ id_mesh: id, pivot: mesh.get_pivot() });
        });

        HistoryControl.add('MESH_PIVOT', pivots);
    }

    function updatePivot(value: ChangeInfo) {
        value.ids.forEach((id) => {
            const mesh = _selected_list.find((item) => {
                return item.mesh_data.id == id;
            });

            if (!mesh) return;

            const pivot_preset = value.data.event.value as ScreenPointPreset;
            const pivot = screenPresetToPivotValue(pivot_preset);
            mesh.set_pivot(pivot.x, pivot.y, true);
        });

        SizeControl.draw();
    }

    function saveAnchor(ids: number[]) {
        const anchors: AnchorEventData[] = [];
        ids.forEach((id) => {
            const mesh = _selected_list.find((item) => {
                return item.mesh_data.id == id;
            });

            if (!mesh) return;

            anchors.push({ id_mesh: id, anchor: mesh.get_anchor() });
        });

        HistoryControl.add('MESH_ANCHOR', anchors);
    }

    function updateAnchor(info: ChangeInfo) {
        const [isChangedX, isChangedY] = getChangedInfo(info);

        const anchor = info.data.event.value as Vector2;

        info.ids.forEach((id) => {
            const mesh = _selected_list.find((item) => {
                return item.mesh_data.id == id;
            });

            if (!mesh) return;

            const x = isChangedX ? anchor.x : mesh.get_anchor().x;
            const y = isChangedY ? anchor.y : mesh.get_anchor().y;

            mesh.set_anchor(x, y);
        });

        SizeControl.draw();

        if (info.data.event.last) {
            refresh([Property.ANCHOR_PRESET]);
        }
    }

    function saveAnchorPreset(ids: number[]) {
        const anchors: AnchorEventData[] = [];
        ids.forEach((id) => {
            const mesh = _selected_list.find((item) => {
                return item.mesh_data.id == id;
            });

            if (!mesh) return;

            anchors.push({ id_mesh: id, anchor: mesh.get_anchor() });
        });

        HistoryControl.add('MESH_ANCHOR', anchors);
    }

    function updateAnchorPreset(value: ChangeInfo) {
        value.ids.forEach((id) => {
            const mesh = _selected_list.find((item) => {
                return item.mesh_data.id == id;
            });

            if (!mesh) return;

            const anchor = screenPresetToAnchorValue(value.data.event.value as ScreenPointPreset);
            if (anchor) {
                mesh.set_anchor(anchor.x, anchor.y);
            }
        });

        SizeControl.draw();
        refresh([Property.ANCHOR]);
    }

    function saveColor(ids: number[]) {
        const colors: ColorEventData[] = [];
        ids.forEach((id) => {
            const mesh = _selected_list.find((item) => {
                return item.mesh_data.id == id;
            });

            if (!mesh) return;

            colors.push({ id_mesh: id, color: mesh.get_color() });
        });

        HistoryControl.add('MESH_COLOR', colors);
    }

    function updateColor(value: ChangeInfo) {
        value.ids.forEach((id) => {
            const mesh = _selected_list.find((item) => {
                return item.mesh_data.id == id;
            });

            if (!mesh) return;
            const color = value.data.event.value as string;
            (mesh as Slice9Mesh).set_color(color);
        });
    }

    function saveTexture(ids: number[]) {
        const textures: TextureEventData[] = [];
        ids.forEach((id) => {
            const mesh = _selected_list.find((item) => {
                return item.mesh_data.id == id;
            });

            if (!mesh) return;

            const texture = `${mesh.get_texture()[1]}/${mesh.get_texture()[0]}`;
            textures.push({ id_mesh: id, texture });
        });

        HistoryControl.add('MESH_TEXTURE', textures);
    }

    function updateTexture(value: ChangeInfo) {
        value.ids.forEach((id) => {
            const mesh = _selected_list.find((item) => {
                return item.mesh_data.id == id;
            });

            if (!mesh) return;

            if (value.data.event.value) {
                const atlas = (value.data.event.value as string).split('/')[0];
                const texture = (value.data.event.value as string).split('/')[1];
                (mesh as Slice9Mesh).set_texture(texture, atlas);
            } else (mesh as Slice9Mesh).set_texture('');
        });
    }

    function saveSlice(ids: number[]) {
        const slices: SliceEventData[] = [];
        ids.forEach((id) => {
            const mesh = _selected_list.find((item) => {
                return item.mesh_data.id == id;
            });

            if (!mesh) return;

            slices.push({ id_mesh: id, slice: (mesh as Slice9Mesh).get_slice() });
        });

        HistoryControl.add('MESH_SLICE', slices);
    }

    function updateSlice(info: ChangeInfo) {
        const [isChangedX, isChangedY] = getChangedInfo(info);

        const slice = info.data.event.value as Vector2;

        info.ids.forEach((id) => {
            const mesh = _selected_list.find((item) => {
                return item.mesh_data.id == id;
            });

            if (!mesh) return;

            const x = isChangedX ? slice.x : (mesh as Slice9Mesh).get_slice().x;
            const y = isChangedY ? slice.y : (mesh as Slice9Mesh).get_slice().y;

            (mesh as Slice9Mesh).set_slice(x, y);
        });
    }

    function saveText(ids: number[]) {
        const texts: TextEventData[] = [];
        ids.forEach((id) => {
            const mesh = _selected_list.find((item) => {
                return item.mesh_data.id == id;
            });

            if (!mesh) return;

            texts.push({ id_mesh: id, text: deepClone((mesh as TextMesh).text) });
        });

        HistoryControl.add('MESH_TEXT', texts);
    }

    function updateText(value: ChangeInfo) {
        value.ids.forEach((id) => {
            const mesh = _selected_list.find((item) => {
                return item.mesh_data.id == id;
            });

            if (!mesh) return;

            const text = value.data.event.value as string;
            (mesh as TextMesh).text = text;
        });
    }

    function saveFont(ids: number[]) {
        const fonts: FontEventData[] = [];
        ids.forEach((id) => {
            const mesh = _selected_list.find((item) => {
                return item.mesh_data.id == id;
            });

            if (!mesh) return;

            const oldFont = deepClone((mesh as TextMesh).font);
            fonts.push({ id_mesh: id, font: oldFont ? oldFont : '' });
        });

        HistoryControl.add('MESH_FONT', fonts);
    }

    function updateFont(value: ChangeInfo) {
        value.ids.forEach((id) => {
            const mesh = _selected_list.find((item) => {
                return item.mesh_data.id == id;
            });

            if (!mesh) return;

            const font = value.data.event.value as string;
            (mesh as TextMesh).font = font;
        });
    }

    function saveFontSize(ids: number[]) {
        const fontSizes: FontSizeEventData[] = [];
        ids.forEach((id) => {
            const mesh = _selected_list.find((item) => {
                return item.mesh_data.id == id;
            });

            if (!mesh) return;

            const oldScale = mesh.get_scale();
            fontSizes.push({ id_mesh: id, scale: new Vector3(oldScale.x, oldScale.y, 1) });
        });

        HistoryControl.add('MESH_FONT_SIZE', fontSizes);
    }

    function updateFontSize(value: ChangeInfo) {
        value.ids.forEach((id) => {
            const mesh = _selected_list.find((item) => {
                return item.mesh_data.id == id;
            });

            if (!mesh) return;

            const font_size = value.data.event.value as number;
            const delta = font_size / (mesh as TextMesh).fontSize;

            mesh.scale.set(1 * delta, 1 * delta, mesh.scale.z);
            mesh.transform_changed();
        });

        TransformControl.set_proxy_in_average_point(_selected_list);
        SizeControl.draw();
        refresh([Property.SCALE]);
    }

    function saveTextAlign(ids: number[]) {
        const textAligns: TextAlignEventData[] = [];
        ids.forEach((id) => {
            const mesh = _selected_list.find((item) => {
                return item.mesh_data.id == id;
            });
            if (!mesh) return;

            textAligns.push({ id_mesh: id, text_align: deepClone((mesh as TextMesh).textAlign) });
        });

        HistoryControl.add('MESH_TEXT_ALIGN', textAligns);
    }

    function updateTextAlign(value: ChangeInfo) {
        value.ids.forEach((id) => {
            const mesh = _selected_list.find((item) => {
                return item.mesh_data.id == id;
            });
            if (!mesh) return;

            const text_align = value.data.event.value as any;;
            (mesh as TextMesh).textAlign = text_align;
        });
    }

    init();
    return { setupConfig, setData, set_selected_list, refresh, detach: clear }
}

function getChangedInfo(info: ChangeInfo) {
    let isChangedX = false;
    let isChangedY = false;
    let isChangedZ = false;
    let isChangedW = false;

    // NOTE: варинат как получить какие либо значения из tweakpane не переписывая половину либы
    const valueController = info.data.event.target.controller.labelController.valueController as any;

    // NOTE: для 2D пикера
    const picker = valueController.pickerC_;
    if (picker && picker.is_changed) {
        isChangedX = true;
        isChangedY = true;
        return [isChangedX, isChangedY];
    }

    // NOTE: учитываем что если Point2D то NumberTextController-ы будут в textC_.acs_, а если 3D/4D то сразу в acs_ 
    const acs = !valueController.acs_ ? valueController.textC_.acs_ : valueController.acs_;
    acs.forEach((ac: any, index: number) => {
        if (!ac.is_changed) return;
        switch (index) {
            case 0: isChangedX = true; break;
            case 1: isChangedY = true; break;
            case 2: isChangedZ = true; break;
            case 3: isChangedW = true; break;
        }
    });

    return [isChangedX, isChangedY, isChangedZ, isChangedW];
}

function getDraggedInfo(info: ChangeInfo) {
    let isDraggedX = false;
    let isDraggedY = false;
    let isDraggedZ = false;
    let isDraggedW = false;

    // NOTE: варинат как получить какие либо значения из tweakpane не переписывая половину либы
    // учитываем что если Point2D то NumberTextController-ы будут в textC_.acs_, а если 3D/4D то сразу в acs_ 
    const valueController = info.data.event.target.controller.labelController.valueController as any;
    const acs = !valueController.acs_ ? valueController.textC_.acs_ : valueController.acs_;
    acs.forEach((ac: any, index: number) => {
        if (!ac.is_drag) return;
        switch (index) {
            case 0: isDraggedX = true; break;
            case 1: isDraggedY = true; break;
            case 2: isDraggedZ = true; break;
            case 3: isDraggedW = true; break;
        }
    });

    return [isDraggedX, isDraggedY, isDraggedZ, isDraggedW];
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

function castTextureInfo(info: TextureInfo) {
    const data = {
        value: `${info.atlas}/${info.name}`,
        src: (info.data.texture as any).path
    } as any;

    if (info.atlas != '') {
        const sizeX = info.data.texture.image.width;
        const sizeY = info.data.texture.image.height;

        data.offset = {
            posX: -(sizeX * info.data.uvOffset.x),
            posY: -(sizeY - (sizeY * info.data.uvOffset.y)),
            width: info.data.size.x,
            height: info.data.size.y,
            sizeX,
            sizeY
        };

        if (info.data.size.x > info.data.size.y) {
            // по ширине
            if (info.data.size.x > 40) {
                const delta = info.data.size.x / 40;
                data.offset.posX /= delta;
                data.offset.posY /= delta;
                data.offset.width = 40;
                data.offset.height = info.data.size.y / delta;
                data.offset.sizeX = sizeX / delta;
                data.offset.sizeY = sizeY / delta;
            }
        } else {
            // по высоте
            if (info.data.size.y > 40) {
                const delta = info.data.size.y / 40;
                data.offset.posX /= delta;
                data.offset.posY /= delta;
                data.offset.width = info.data.size.x / delta;
                data.offset.height = 40;
                data.offset.sizeX = sizeX / delta;
                data.offset.sizeY = sizeY / delta;
            }
        }

        data.offset.posY += data.offset.height;
    }

    return data;
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
                        x: { format: (v: number) => v.toFixed(2) },
                        y: { format: (v: number) => v.toFixed(2) },
                        z: { step: 0.001, format: (v: number) => v.toFixed(3) }
                    }
                },
                {
                    name: Property.ROTATION, title: 'Вращение', type: PropertyType.VECTOR_3, params: {
                        x: { format: (v: number) => v.toFixed(2) },
                        y: { format: (v: number) => v.toFixed(2) },
                        z: { format: (v: number) => v.toFixed(2) }
                    }
                },
                {
                    name: Property.SCALE, title: 'Маштаб', type: PropertyType.VECTOR_2, params: {
                        x: { format: (v: number) => v.toFixed(2) },
                        y: { format: (v: number) => v.toFixed(2) },
                    }
                },
                {
                    name: Property.SIZE, title: 'Размер', type: PropertyType.VECTOR_2, params: {
                        x: { format: (v: number) => v.toFixed(2) },
                        y: { format: (v: number) => v.toFixed(2) },
                    }
                },
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
                        x: { min: -1, max: 1, format: (v: number) => v.toFixed(2) },
                        y: { min: -1, max: 1, format: (v: number) => v.toFixed(2) }
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
                    name: Property.TEXTURE, title: 'Текстура', type: PropertyType.LIST_TEXTURES, params: ResourceManager.get_all_textures().map(castTextureInfo)
                },
                {
                    name: Property.SLICE9, title: 'Slice9', type: PropertyType.POINT_2D, params: {
                        x: { min: 0, max: 100, format: (v: number) => v.toFixed(2) },
                        y: { min: 0, max: 100, format: (v: number) => v.toFixed(2) }
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
                        'Центр': TextAlign.CENTER,
                        'Слева': TextAlign.LEFT,
                        'Справа': TextAlign.RIGHT,
                        'По ширине': TextAlign.JUSTIFY
                    }
                },
            ]
        }
    ];
}