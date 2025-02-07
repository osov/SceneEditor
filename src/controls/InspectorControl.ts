import { UI } from 'uiconfig-tweakpane';
import { Pane } from 'tweakpane';
import { ChangeEvent, UiObjectConfig } from 'uiconfig.js';
import { OnClickReturnType } from 'uiconfig.js/dist/types';
import * as TweakpaneThumbnailListPlugin from 'tweakpane-plugin-thumbnail-list';
// import TweakpaneSearchListPlugin from 'tweakpane-plugin-search-list';


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
    [PropertyType.LIST_TEXT]: { key: string; text: string }[];
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
    [PropertyType.BUTTON]: ((...args: any[]) => OnClickReturnType) | ((...args: any[]) => Promise<OnClickReturnType>);
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
    data: PropertyData<PropertyType>[]
}

// для установки своего контейнера и плагинов
class Inspector extends UI {
    protected _createUiContainer(): HTMLDivElement {
        const container = document.querySelector('.menu_right') as HTMLDivElement;
        this._root = new Pane({ container });
        this._root.registerPlugin(TweakpaneThumbnailListPlugin.plugin);
        // this._root.registerPlugin(TweakpaneSearchListPlugin); 
        return container;
    }
}

function InspectorControlCreate() {
    let _inspector: Inspector;
    let _config: InspectorGroup[];

    function init() {
        _inspector = new Inspector();
    }

    function setup_config(config: InspectorGroup[]) { //, type: ComponentType) {
        _config = config;
    }

    function set_data(list_data: ObjectData[]) {
        let fields: UiObjectConfig[] = [];
        const uneque_fields = [] as string[];
        for (const obj of list_data) {
            // TODO: делать преобразование один раз, после выяснения общего набора полей
            fields = [];
            for (const field of obj.data) {

                // ищем информацию о поле в соответсвующем конфиге
                const property: PropertyItem<PropertyType> | undefined = getPropertyItemByName(field.name);
                if (!property) {
                    Log.error(`Not found ${field.name}`);
                    continue;
                }

                // проверка на то что все поля одинаковые (без учета содержимого)
                if (!uneque_fields.includes(property.name)) {
                    uneque_fields.push(property.name);
                }

                // перобразование полей
                let view = {} as UiObjectConfig;
                switch (property.type) {
                    case PropertyType.STRING: case PropertyType.LOG_DATA:
                        view = string_view(obj, field, property);
                        break;
                    case PropertyType.NUMBER:
                        view = viewByType("number", obj, field, property);
                        break;
                    case PropertyType.BOOLEAN:
                        view = viewByType("checkbox", obj, field, property);
                        break;
                    case PropertyType.VECTOR_2:
                        view = viewByType("vec2", obj, field, property);
                        break;
                    case PropertyType.VECTOR_3:
                        view = viewByType("vec3", obj, field, property);
                        break;
                    case PropertyType.VECTOR_4:
                        view = viewByType("vec4", obj, field, property);
                        break;
                    case PropertyType.COLOR:
                        // FIXME: type need to be 'color'
                        view = viewByType("number", obj, field, property);
                        break;
                    case PropertyType.LIST_TEXTURES:
                        view = textures_view(obj, field, property);
                        break;
                    case PropertyType.BUTTON:
                        view = button_view(field, property);
                        break;
                }

                // формированик групп
                const group = getInspectorGroupByName(field.name);
                if (group && group.title != '') {
                    let folder = fields.find((value: UiObjectConfig) => {
                        return (value.type == "folder") && (value.label == group.title);
                    });
                    if (!folder) {
                        folder = {
                            type: "folder",
                            label: group.title,
                            children: [],
                            expanded: true,
                        };
                    }
                    folder.children?.push(view);
                    fields.push(folder);
                } else fields.push(view);
            }
        }

        // добавляем поля в инспектор
        for (const field of fields) {
            _inspector.appendChild(field);
        }
    }

    function getPropertyItemByName(name: string): PropertyItem<PropertyType> | undefined {
        for (const group of _config) {
            const result = group.property_list.find((property) => {
                return property.name == name;
            });
            if (result)
                return result;
        }
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


    function viewByType<T extends PropertyType>(type: string, obj: ObjectData, field: PropertyData<T>, property: PropertyItem<T>): UiObjectConfig {
        return {
            type,
            label: property.title,
            value: field.data,
            readOnly: property.readonly,
            onChange: (data: ChangeEvent) => {
                if (!data.last)
                    return;
                EventBus.send('SYS_INSPECTOR_UPDATED_VALUE', {
                    id: obj.id,
                    data: [
                        {
                            name: field.name,
                            data: data.value
                        }
                    ]
                })
            }
        };
    }

    function string_view<T extends PropertyType>(obj: ObjectData, field: PropertyData<T>, property: PropertyItem<T>): UiObjectConfig {
        return {
            type: "input",
            label: property.title,
            property: [field, 'data'],
            readOnly: property.readonly,
            onChange: (data: ChangeEvent) => {
                console.log(data);
                EventBus.send('SYS_INSPECTOR_UPDATED_VALUE', {
                    id: obj.id,
                    data: [
                        {
                            name: field.name,
                            data: data.value
                        }
                    ]
                })
            }
        };
    }

    function textures_view<T extends PropertyType>(obj: ObjectData, field: PropertyData<T>, property: PropertyItem<T>): UiObjectConfig {
        return {};
    }

    function button_view<T extends PropertyType>(field: PropertyData<T>, property: PropertyItem<T>): UiObjectConfig {
        return {
            type: "button",
            label: property.title,
            onClick: field.data as PropertyValues[PropertyType.BUTTON]
        };
    }

    init();
    return { setup_config, set_data }
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