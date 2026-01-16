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
Шрифт** string(выпадающий список из ключей от generateFontOptions()) | метод set_font/свойство parameters.font для чтения
Размер шрифта** int | шаг 1, минимум 8 делаем как в дефолде, как бы управляем тут числом, но по факту меняем scale пропорционально, а отталкиваться от стартового значения из свойства fontSize, скажем шрифт 32 по умолчанию. и пишем тут что сейчас стоит скажем 32, но если начнем крутить то скейлим уже, но свойство не трогаем
Выравнивание** string выпадающий из списка - [center, left, right, justify]/[Центр, Слева, Справа, По ширине] | свойство textAlign
 
TODO: определять поля из списка выделенных обьектов за пределами инспектора
    + Меньше связанность, инспектор не будет знать о внешних типах и будет получать только список обьектов ObjectData

TODO: вынести обновление конкретных полей
    (которые нужно обновлять вручную / вызывать функции для получения обновленных данных mesh-а) в отдельный callback

TODO: попробовать упростить через дженерики, как минимум для записи в историю по типу

*/


import { Pane, TpChangeEvent } from 'tweakpane';
import { BindingApi, BindingParams, ButtonParams, FolderApi } from '@tweakpane/core';
import { IBaseMesh, IBaseMeshAndThree, IObjectTypes } from '../render_engine/types';
import * as TweakpaneImagePlugin from 'tweakpane4-image-list-plugin';
import * as TweakpaneSearchListPlugin from 'tweakpane4-search-list-plugin';
import * as TextareaPlugin from '@pangenerator/tweakpane-textarea-plugin';
import * as ExtendedPointNdInputPlugin from 'tweakpane4-extended-vector-plugin';
import * as TweakpaneExtendedBooleanPlugin from 'tweakpane4-extended-boolean-plugin';
import { Vector2, Vector3, NormalBlending, AdditiveBlending, MultiplyBlending, SubtractiveBlending, NearestFilter, LinearFilter, MinificationTextureFilter, MagnificationTextureFilter, Vector4, Color } from 'three';
import { TextMesh } from '../render_engine/objects/text';
import { Slice9Mesh } from '../render_engine/objects/slice9';
import { deepClone, degToRad } from '../modules/utils';
import { radToDeg } from 'three/src/math/MathUtils';
import { ActiveEventData, AlphaEventData, AnchorEventData, ColorEventData, FontEventData, FontSizeEventData, NameEventData, PivotEventData, PositionEventData, RotationEventData, ScaleEventData, SizeEventData, SliceEventData, TextAlignEventData, TextEventData, TextureEventData, VisibleEventData, LineHeightEventData, BlendModeEventData, MinFilterEventData, MagFilterEventData, UVEventData, MaterialEventData, MeshAtlasEventData, TextureAtlasEventData } from './InspectorTypes';
import { MaterialUniformParams, MaterialUniformType, TextureInfo } from '../render_engine/resource_manager';
import { get_basename, get_file_name } from "../render_engine/helpers/utils";
import { GoSprite, FlipMode } from '../render_engine/objects/sub_types';
import { HistoryOwner } from './modules_editor_const';
import { Services } from '@editor/core';
import { get_control_manager } from './ControlManager';

// SizeControl мигрирован на Services.size

/** Тип InspectorControl */
export type InspectorControlType = ReturnType<typeof InspectorControlCreate>;

/** Модульный instance для использования через импорт */
let inspector_control_instance: InspectorControlType | undefined;

/** Получить instance InspectorControl */
export function get_inspector_control(): InspectorControlType {
    if (inspector_control_instance === undefined) {
        throw new Error('InspectorControl не инициализирован. Вызовите register_inspector_control() сначала.');
    }
    return inspector_control_instance;
}

export function register_inspector_control() {
    inspector_control_instance = InspectorControlCreate();
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
    ALPHA = 'alpha',
    TEXTURE = 'texture',
    SLICE9 = 'slice9',
    TEXT = 'text',
    FONT = 'font',
    FONT_SIZE = 'font_size',
    TEXT_ALIGN = 'text_align',
    ATLAS = 'atlas',
    ASSET_ATLAS = 'asset_atlas',
    ATLAS_BUTTON = 'atlas_button',
    LINE_HEIGHT = 'line_height',
    BLEND_MODE = 'blend_mode',
    MIN_FILTER = 'min_filter',
    MAG_FILTER = 'mag_filter',
    FLIP_VERTICAL = 'flip_vertical',
    FLIP_HORIZONTAL = 'flip_horizontal',
    FLIP_DIAGONAL = 'flip_diagonal',
    MATERIAL = 'material',
    VERTEX_PROGRAM = 'vertex_program',
    FRAGMENT_PROGRAM = 'fragment_program',
    TRANSPARENT = 'transparent',
    UNIFORM_SAMPLER2D = 'uniform_sampler2d',
    UNIFORM_FLOAT = 'uniform_float',
    UNIFORM_RANGE = 'uniform_range',
    UNIFORM_VEC2 = 'uniform_vec2',
    UNIFORM_VEC3 = 'uniform_vec3',
    UNIFORM_VEC4 = 'uniform_vec4',
    UNIFORM_COLOR = 'uniform_color'
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

export enum BlendMode {
    NORMAL = 'normal',
    ADD = 'add',
    MULTIPLY = 'multiply',
    SUBTRACT = 'subtract',
    // CUSTOM = 'custom'
}

export enum FilterMode {
    NEAREST = 'nearest',
    LINEAR = 'linear'
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
    let _selected_list: IBaseMeshAndThree[] = [];
    let _selected_textures: string[] = [];
    let _selected_materials: string[] = [];
    let _data: ObjectData[];

    let _is_first = true;
    let _is_refresh = false;

    function init() {
        _inspector = new Pane({
            container: document.querySelector('.inspector__body') as HTMLElement,
        });

        registerPlugins();
        setupConfig(getDefaultInspectorConfig());
        subscribeEvents();
    }

    function registerPlugins() {
        _inspector.registerPlugin(TweakpaneImagePlugin);
        _inspector.registerPlugin(TweakpaneSearchListPlugin);
        _inspector.registerPlugin(TextareaPlugin);
        _inspector.registerPlugin(ExtendedPointNdInputPlugin);
        _inspector.registerPlugin(TweakpaneExtendedBooleanPlugin);
    }

    function setupConfig(config: InspectorGroup[]) {
        _config = config;
    }

    function subscribeEvents() {
        Services.event_bus.on('selection:mesh_list', (data) => {
            const e = data as { list: IBaseMeshAndThree[] };
            set_selected_list(e.list);
        });

        Services.event_bus.on('selection:cleared', () => {
            clear();
        });

        Services.event_bus.on('assets:textures_selected', (data) => {
            const e = data as { paths: string[] };
            set_selected_textures(e.paths);
        });

        Services.event_bus.on('assets:materials_selected', (data) => {
            const e = data as { paths: string[] };
            set_selected_materials(e.paths);
        });

        Services.event_bus.on('assets:selection_cleared', () => {
            clear();
        });

        Services.event_bus.on('assets:atlas_changed', () => {
            if (_selected_textures.length > 0) {
                // NOTE: пока просто пересоздаем поля занаво, так как нет возможности обновить параметры биндинга
                set_selected_textures(_selected_textures);
            }
        });

        // Обновление инспектора при изменении трансформации через гизмо
        Services.event_bus.on('transform:changed', (data) => {
            const e = data as { type: 'translate' | 'rotate' | 'scale' };
            if (_selected_list.length === 0) return;

            switch (e.type) {
                case 'translate':
                    refresh([Property.POSITION]);
                    break;
                case 'rotate':
                    refresh([Property.ROTATION]);
                    break;
                case 'scale':
                    refresh([Property.SCALE, Property.SIZE, Property.FONT_SIZE]);
                    break;
            }
        });

        // Обработчик undo для MESH_NAME из InspectorControl
        Services.event_bus.on('history:undone', (data) => {
            const event = data as { type: string; data: unknown[]; owner?: number };
            // Обрабатываем только события без owner (созданные InspectorControl)
            // или с owner === undefined
            if (event.owner !== undefined) return;

            if (event.type === 'MESH_NAME') {
                const names = event.data as NameEventData[];
                for (const item of names) {
                    const mesh = Services.scene.get_by_id(item.id_mesh);
                    if (mesh !== undefined) {
                        Services.scene.set_name(mesh, item.name);
                    }
                }
                Services.ui.update_hierarchy();
                // Обновляем инспектор если объект выбран
                if (_selected_list.length > 0) {
                    Services.selection.set_selected(_selected_list as unknown as import('@editor/engine/types').ISceneObject[]);
                }
            }
        });
    }

    function setData(list_data: ObjectData[]) {
        _unique_fields = [];
        _data = list_data;

        list_data.forEach((obj, index) => {
            const info: ObjectInfo[] = [];
            for (const field of obj.data) {
                // NOTE: ищем информацию о поле в соответсвующем конфиге
                const property: PropertyItem<PropertyType> | undefined = getPropertyItemByName(field.name);
                if (!property) continue; // пропускаем в случае ошибки

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
    }

    // NOTE: возможно лучше принимать имена текстур вместо путей
    function set_selected_textures(textures_paths: string[]) {
        _selected_textures = textures_paths;

        // NOTE: обновляем конфиг атласов
        update_atlas_options();

        const data = _selected_textures.map((path, id) => {
            const result = { id, data: [] as PropertyData<PropertyType>[] };

            const texture_name = get_file_name(get_basename(path));
            const atlas = Services.resources.get_atlas_by_texture_name(texture_name);

            if (atlas == null) {
                Services.logger.error(`[set_selected_textures] Atlas for texture ${texture_name} not found`);
                return { id, data: [] };
            }

            result.data.push({ name: Property.ASSET_ATLAS, data: atlas });
            result.data.push({
                name: Property.ATLAS_BUTTON, data: () => {
                    get_control_manager().open_atlas_manager();
                }
            });

            const min_filter = convertThreeJSFilterToFilterMode(Services.resources.get_texture(texture_name, atlas).texture.minFilter);
            const mag_filter = convertThreeJSFilterToFilterMode(Services.resources.get_texture(texture_name, atlas).texture.magFilter);

            result.data.push({ name: Property.MIN_FILTER, data: min_filter });
            result.data.push({ name: Property.MAG_FILTER, data: mag_filter });

            return result;
        });

        clear();
        setData(data);
    }
    
    function set_selected_materials(materials_paths: string[]) {
        _selected_materials = materials_paths;
        
        // NOTE: обновляем конфиг текстур
        update_texture_options([Property.TEXTURE, Property.UNIFORM_SAMPLER2D]);

        const data = _selected_materials.map((path, id) => {
            const result = {id, data: [] as PropertyData<PropertyType>[]}; 

            const material_name = get_file_name(get_basename(path));
            const material = Services.resources.get_material_info(material_name);
            if (material === undefined) return result;

            result.data.push({ name: Property.VERTEX_PROGRAM, data: material.vertexShader });
            result.data.push({ name: Property.FRAGMENT_PROGRAM, data: material.fragmentShader });
            result.data.push({ name: Property.TRANSPARENT, data: false }); // TODO: восстановить transparent

            type UniformEntry = { type: MaterialUniformType; params?: Record<string, unknown> };
            Object.entries(material.uniforms as Record<string, UniformEntry>).forEach(([key, value]) => {
                switch (value.type) {
                    case MaterialUniformType.SAMPLER2D:
                        _config.forEach((group) => {
                            const property = group.property_list.find((property) => property.name == Property.UNIFORM_SAMPLER2D);
                            if (!property) return;
                            property.title = key;
                        });
                        const texture = (material.instances[material.origin]?.uniforms as Record<string, { value: unknown }>)?.[key]?.value as unknown;
                        result.data.push({ name: Property.UNIFORM_SAMPLER2D, data: `/${get_file_name(texture as string)}` });
                        break;
                    case MaterialUniformType.FLOAT:
                        _config.forEach((group) => {
                            const property = group.property_list.find((property) => property.name == Property.UNIFORM_FLOAT);
                            if (!property) return;
                            property.title = key;
                            const uniformData = material.uniforms[key] as { params?: { min?: number; max?: number; step?: number } };
                            const params = uniformData?.params ?? {};
                            property.params = {
                                min: params.min ?? 0,
                                max: params.max ?? 1,
                                step: params.step ?? 0.01
                            };
                        });
                        const float = (material.instances[material.origin]?.uniforms as Record<string, { value: unknown }>)?.[key]?.value as unknown;
                        result.data.push({ name: Property.UNIFORM_FLOAT, data: float as number });
                        break;
                    case MaterialUniformType.RANGE:
                        _config.forEach((group) => {
                            const property = group.property_list.find((property) => property.name == Property.UNIFORM_RANGE);
                            if (!property) return;
                            property.title = key;
                            const uniformData = material.uniforms[key] as { params?: MaterialUniformParams[MaterialUniformType.RANGE] };
                            const params = uniformData?.params ?? { min: 0, max: 1, step: 0.01 };
                            property.params = {
                                min: params.min,
                                max: params.max,
                                step: params.step
                            };
                        });
                        const range = (material.instances[material.origin]?.uniforms as Record<string, { value: unknown }>)?.[key]?.value as unknown;
                        result.data.push({ name: Property.UNIFORM_RANGE, data: range as number });
                        break;
                    case MaterialUniformType.VEC2:
                        _config.forEach((group) => {
                            const property = group.property_list.find((property) => property.name == Property.UNIFORM_VEC2);
                            if (!property) return;
                            property.title = key;
                            const uniformData = material.uniforms[key] as { params?: MaterialUniformParams[MaterialUniformType.VEC2] };
                            const params = uniformData?.params ?? { x: { min: 0, max: 1, step: 0.01 }, y: { min: 0, max: 1, step: 0.01 } };
                            property.params = {
                                x: {
                                    min: params.x.min,
                                    max: params.x.max,
                                    step: params.x.step
                                },
                                y: {
                                    min: params.y.min,
                                    max: params.y.max,
                                    step: params.y.step
                                }
                            };
                        });
                        const vec2 = (material.instances[material.origin]?.uniforms as Record<string, { value: unknown }>)?.[key]?.value as unknown;
                        result.data.push({ name: Property.UNIFORM_VEC2, data: vec2 as Vector2 });
                        break;
                    case MaterialUniformType.VEC3:
                        _config.forEach((group) => {
                            const property = group.property_list.find((property) => property.name == Property.UNIFORM_VEC3);
                            if (!property) return;
                            property.title = key;
                            const uniformData = material.uniforms[key] as { params?: MaterialUniformParams[MaterialUniformType.VEC3] };
                            const defaultRange = { min: 0, max: 1, step: 0.01 };
                            const params = uniformData?.params ?? { x: defaultRange, y: defaultRange, z: defaultRange };
                            property.params = {
                                x: {
                                    min: params.x.min,
                                    max: params.x.max,
                                    step: params.x.step
                                },
                                y: {
                                    min: params.y.min,
                                    max: params.y.max,
                                    step: params.y.step
                                },
                                z: {
                                    min: params.z.min,
                                    max: params.z.max,
                                    step: params.z.step
                                }
                            };
                        });
                        const vec3 = (material.instances[material.origin]?.uniforms as Record<string, { value: unknown }>)?.[key]?.value as unknown;
                        result.data.push({ name: Property.UNIFORM_VEC3, data: vec3 as Vector3 });
                        break;
                    case MaterialUniformType.VEC4:
                        _config.forEach((group) => {
                            const property = group.property_list.find((property) => property.name == Property.UNIFORM_VEC4);
                            if (!property) return;
                            property.title = key;
                            const uniformData = material.uniforms[key] as { params?: MaterialUniformParams[MaterialUniformType.VEC4] };
                            const defaultRange = { min: 0, max: 1, step: 0.01 };
                            const params = uniformData?.params ?? { x: defaultRange, y: defaultRange, z: defaultRange, w: defaultRange };
                            property.params = {
                                x: {
                                    min: params.x.min,
                                    max: params.x.max,
                                    step: params.x.step
                                },
                                y: {
                                    min: params.y.min,
                                    max: params.y.max,
                                    step: params.y.step
                                },
                                z: {
                                    min: params.z.min,
                                    max: params.z.max,
                                    step: params.z.step
                                },
                                w: {
                                    min: params.w.min,
                                    max: params.w.max,
                                    step: params.w.step
                                }
                            };
                        });
                        const vec4 = (material.instances[material.origin]?.uniforms as Record<string, { value: unknown }>)?.[key]?.value as unknown;
                        result.data.push({ name: Property.UNIFORM_VEC4, data: vec4 as Vector4 });
                        break;
                    case MaterialUniformType.COLOR:
                        _config.forEach((group) => {
                            const property = group.property_list.find((property) => property.name == Property.UNIFORM_COLOR);
                            if (!property) return;
                            property.title = key;
                        });
                        const color = (material.instances[material.origin]?.uniforms as Record<string, { value: unknown }>)?.[key]?.value as unknown;
                        result.data.push({ name: Property.UNIFORM_COLOR, data: color as string });
                        break;
                }
            });

            return result;
        });

        clear();
        setData(data);
    }

    function set_selected_list(list: IBaseMeshAndThree[]) {
        _selected_list = list;

        // IDEA: в значение пихать callback который будет отвечать за обновление
        /* TODO: все значения должны быть копиями, чтобы инспектор не мог их изменять на прямую, а только самому в ивенте обновления
                 при этом также нужно будет еще обновлять и при рефреше */
        const data = list.map((value) => {
            const fields = [];

            fields.push({ name: Property.TYPE, data: value.type });
            fields.push({ name: Property.NAME, data: value.name });
            // fields.push({ name: Property.VISIBLE, data: value.get_visible() });
            fields.push({ name: Property.ACTIVE, data: value.get_active() });

            // NOTE: исключаем gui контейнер
            if (value.type != IObjectTypes.GUI_CONTAINER) {

                // NOTE: трансформация
                {
                    fields.push({ name: Property.POSITION, data: value.get_position() });

                    const raw = value.rotation;
                    const rotation = new Vector3(radToDeg(raw.x), radToDeg(raw.y), radToDeg(raw.z));
                    fields.push({ name: Property.ROTATION, data: rotation });

                    fields.push({ name: Property.SCALE, data: value.get_scale() });
                }

                // NOTE: gui поля
                if ([IObjectTypes.GUI_BOX, IObjectTypes.GUI_TEXT].includes(value.type)) {
                    fields.push({ name: Property.SIZE, data: value.get_size() });

                    const pivot_preset = pivotToScreenPreset(value.get_pivot());
                    fields.push({ name: Property.PIVOT, data: pivot_preset });

                    const anchor_preset = anchorToScreenPreset(value.get_anchor());
                    fields.push({ name: Property.ANCHOR_PRESET, data: anchor_preset });
                    fields.push({ name: Property.ANCHOR, data: value.get_anchor() });
                } else if (IObjectTypes.GO_SPRITE_COMPONENT == value.type || IObjectTypes.GO_LABEL_COMPONENT == value.type) {
                    fields.push({ name: Property.SIZE, data: value.get_size() });
                }

                // NOTE: визуальные поля
                if ([IObjectTypes.SLICE9_PLANE, IObjectTypes.GUI_BOX, IObjectTypes.GO_SPRITE_COMPONENT].includes(value.type)) {
                    fields.push({ name: Property.COLOR, data: value.get_color() });
                    fields.push({ name: Property.ALPHA, data: (value as Slice9Mesh).get_alpha() });

                    const atlas = (value as Slice9Mesh).get_texture()[1];
                    const texture = (value as Slice9Mesh).get_texture()[0];
                    
                    // NOTE: обновляем конфиг атласов
                    update_atlas_options();

                    // NOTE: обновляем конфиг текстур только для выбранного атласа
                    update_texture_options([Property.TEXTURE], () => {
                        const list: any[] = [];
                        Services.resources.get_all_textures().forEach((info) => {
                            if(info.atlas != atlas) {
                                return;
                            }
                            list.push(castTextureInfo(info));
                        });
                        return list;
                    });

                    // NOTE: обновляем конфиг материалов
                    update_material_options();

                    fields.push({ name: Property.ATLAS, data: atlas });
                    fields.push({ name: Property.TEXTURE, data: texture });
                    fields.push({ name: Property.MATERIAL, data: (value as Slice9Mesh).material.name || '' });
                    fields.push({ name: Property.BLEND_MODE, data: convertThreeJSBlendingToBlendMode((value as Slice9Mesh).material.blending) });
                    fields.push({ name: Property.SLICE9, data: (value as Slice9Mesh).get_slice() });

                    // NOTE: отражение только для спрайта
                    if (value.type === IObjectTypes.GO_SPRITE_COMPONENT) {
                        const sprite = value as GoSprite;
                        const currentFlip = sprite.get_flip();

                        switch (currentFlip) {
                            case FlipMode.NONE:
                                fields.push({ name: Property.FLIP_DIAGONAL, data: false });
                                fields.push({ name: Property.FLIP_VERTICAL, data: false });
                                fields.push({ name: Property.FLIP_HORIZONTAL, data: false });
                                break;
                            case FlipMode.VERTICAL:
                                fields.push({ name: Property.FLIP_DIAGONAL, data: false });
                                fields.push({ name: Property.FLIP_VERTICAL, data: true });
                                fields.push({ name: Property.FLIP_HORIZONTAL, data: false });
                                break;
                            case FlipMode.HORIZONTAL:
                                fields.push({ name: Property.FLIP_DIAGONAL, data: false });
                                fields.push({ name: Property.FLIP_VERTICAL, data: false });
                                fields.push({ name: Property.FLIP_HORIZONTAL, data: true });
                                break;
                            case FlipMode.DIAGONAL:
                                fields.push({ name: Property.FLIP_DIAGONAL, data: true });
                                fields.push({ name: Property.FLIP_VERTICAL, data: false });
                                fields.push({ name: Property.FLIP_HORIZONTAL, data: false });
                                break;
                        }
                    }
                }

                // NOTE: обновляем конфиг шрифтов
                update_font_options();

                // NOTE: текстовые поля
                if ([IObjectTypes.TEXT, IObjectTypes.GUI_TEXT, IObjectTypes.GO_LABEL_COMPONENT].includes(value.type)) {
                    fields.push({ name: Property.TEXT, data: (value as TextMesh).text });
                    fields.push({ name: Property.FONT, data: (value as TextMesh).font || '' });
                    fields.push({ name: Property.COLOR, data: value.get_color() });
                    fields.push({ name: Property.ALPHA, data: (value as TextMesh).fillOpacity });

                    const delta = new Vector3(1 * value.scale.x, 1 * value.scale.y);
                    const max_delta = Math.max(delta.x, delta.y);
                    const font_size = (value as TextMesh).fontSize * max_delta;

                    fields.push({ name: Property.FONT_SIZE, data: font_size });
                    fields.push({ name: Property.TEXT_ALIGN, data: (value as TextMesh).textAlign });

                    const line_height = (value as TextMesh).lineHeight;
                    if (line_height == 'normal') fields.push({ name: Property.LINE_HEIGHT, data: 1 });
                    else fields.push({ name: Property.LINE_HEIGHT, data: line_height });
                }
            }

            return { id: value.mesh_data.id, data: fields };
        });

        clear();
        setData(data);
    }

    function update_atlas_options() {
        _config.forEach((group) => {
            const properties = [Property.ASSET_ATLAS, Property.ATLAS];
            const property = group.property_list.find((property) => properties.includes(property.name as Property));
            if (!property) return;
            (property.params as PropertyParams[PropertyType.LIST_TEXT]) = generateAtlasOptions();
        });
    }

    function update_material_options() {
        _config.forEach((group) => {
            const property = group.property_list.find((property) => property.name == Property.MATERIAL);
            if (!property) return;
            (property.params as PropertyParams[PropertyType.LIST_TEXT]) = generateMaterialOptions();
        });
    }

    function update_texture_options(properties: Property[], method = generateTextureOptions) {
        _config.forEach((group) => {
            const property = group.property_list.find((property) => properties.includes(property.name as Property));
            if (!property) return;
            (property.params as PropertyParams[PropertyType.LIST_TEXTURES]) = method();
        });
    }

    function update_font_options() {
        _config.forEach((group) => {
            const property = group.property_list.find((property) => property.name == Property.FONT);
            if (!property) return;
            (property.params as PropertyParams[PropertyType.LIST_TEXT]) = generateFontOptions();
        });
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
                    case Property.FLIP_VERTICAL:
                        value.data = (item as GoSprite).get_flip() == FlipMode.VERTICAL;
                        break;
                    case Property.FLIP_HORIZONTAL:
                        value.data = (item as GoSprite).get_flip() == FlipMode.HORIZONTAL;
                        break;
                    case Property.FLIP_DIAGONAL:
                        value.data = (item as GoSprite).get_flip() == FlipMode.DIAGONAL;
                        break;
                }
            });
        });

        properties.forEach((property) => {
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
            Services.logger.error("Not folder: ", folder);
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
        // Services.logger.debug('CLEAR');
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
                if (result.type == PropertyType.NUMBER && copy.params !== undefined) {
                    const number_params = result.params as PropertyParams[PropertyType.NUMBER];
                    const copy_params = copy.params as PropertyParams[PropertyType.NUMBER];
                    if (number_params?.format !== undefined) {
                        copy_params.format = number_params.format;
                    }
                }

                if ((result.type == PropertyType.VECTOR_2 || result.type == PropertyType.VECTOR_3 || result.type == PropertyType.VECTOR_4 || result.type == PropertyType.POINT_2D) && copy.params !== undefined) {
                    const v2p = result.params as PropertyParams[PropertyType.VECTOR_2];
                    const copy_params = copy.params as PropertyParams[PropertyType.VECTOR_2];
                    if (v2p?.x?.format !== undefined && copy_params?.x !== undefined) {
                        copy_params.x.format = v2p.x.format;
                    }
                    if (v2p?.y?.format !== undefined && copy_params?.y !== undefined) {
                        copy_params.y.format = v2p.y.format;
                    }
                }

                if ((result.type == PropertyType.VECTOR_3 || result.type == PropertyType.VECTOR_4) && copy.params !== undefined) {
                    const v3p = result.params as PropertyParams[PropertyType.VECTOR_3];
                    const copy_params = copy.params as PropertyParams[PropertyType.VECTOR_3];
                    if (v3p?.z?.format !== undefined && copy_params?.z !== undefined) {
                        copy_params.z.format = v3p.z.format;
                    }
                }

                if (result.type == PropertyType.VECTOR_4 && copy.params !== undefined) {
                    const v4p = result.params as PropertyParams[PropertyType.VECTOR_4];
                    const copy_params = copy.params as PropertyParams[PropertyType.VECTOR_4];
                    if (v4p?.w?.format !== undefined && copy_params?.w !== undefined) {
                        copy_params.w.format = v4p.w.format;
                    }
                }

                return copy;
            }
        }

        Services.logger.error(`Not found ${name}`);
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
                } else if (property.type == PropertyType.BUTTON) {
                    // для кнопок всегда показываем
                    return true;
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
                Services.logger.error(`Unable to cast ${field.name}`);
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

                saveValue({
                    ids,
                    field
                });
            };

            entity.onChange = (event: ChangeEvent) => {
                // NOTE: не обновляем только что измененные значения из вне(после refresh)
                if (_is_refresh) {
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

                    // NOTE: перезаписываем прочерки на изменненой оси в следующем кадре
                    // потому что на изменненой оси запись значения будет в конце обновления
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

            if (mesh == undefined) {
                Services.logger.error('[tryDisabledPositionValueByAxis] Mesh not found for id:', id);
                return;
            }

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

            if (mesh == undefined) {
                Services.logger.error('[tryDisabledRotationValueByAxis] Mesh not found for id:', id);
                return;
            }

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

            if (mesh == undefined) {
                Services.logger.error('[tryDisabledScaleValueByAxis] Mesh not found for id:', id);
                return;
            }

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

            if (mesh == undefined) {
                Services.logger.error('[tryDisabledSizeValueByAxis] Mesh not found for id:', id);
                return;
            }

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

            if (mesh == undefined) {
                Services.logger.error('[tryDisabledAnchorValueByAxis] Mesh not found for id:', id);
                return;
            }

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

            if (mesh == undefined) {
                Services.logger.error('[tryDisabledSliceValueByAxis] Mesh not found for id:', id);
                return;
            }

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
        // Services.logger.debug("SAVED: ", info.field.name);

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
            case Property.ALPHA: saveAlpha(info.ids); break;
            case Property.TEXTURE: saveTexture(info.ids); break;
            case Property.SLICE9: saveSlice(info.ids); break;
            case Property.TEXT: saveText(info.ids); break;
            case Property.FONT: saveFont(info.ids); break;
            case Property.FONT_SIZE: saveFontSize(info.ids); break;
            case Property.TEXT_ALIGN: saveTextAlign(info.ids); break;
            case Property.ATLAS: saveAtlas(info.ids); break;
            case Property.ASSET_ATLAS: saveAssetAtlas(info.ids); break;
            case Property.LINE_HEIGHT: saveLineHeight(info.ids); break;
            case Property.BLEND_MODE: saveBlendMode(info.ids); break;
            case Property.MIN_FILTER: saveMinFilter(info.ids); break;
            case Property.MAG_FILTER: saveMagFilter(info.ids); break;
            case Property.MATERIAL: saveMaterial(info.ids); break;
        }
    }

    function updatedValue(info: ChangeInfo) {
        // Services.logger.debug("UPDATED: ", info);

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
            case Property.ALPHA: updateAlpha(info); break;
            case Property.TEXTURE: updateTexture(info); break;
            case Property.SLICE9: updateSlice(info); break;
            case Property.TEXT: updateText(info); break;
            case Property.FONT: updateFont(info); break;
            case Property.FONT_SIZE: updateFontSize(info); break;
            case Property.TEXT_ALIGN: updateTextAlign(info); break;
            case Property.ATLAS: updateAtlas(info); break;
            case Property.ASSET_ATLAS: updateAssetAtlas(info); break;
            case Property.LINE_HEIGHT: updateLineHeight(info); break;
            case Property.BLEND_MODE: updateBlendMode(info); break;
            case Property.MIN_FILTER: updateMinFilter(info); break;
            case Property.MAG_FILTER: updateMagFilter(info); break;
            case Property.MATERIAL: updateMaterial(info); break;
            case Property.VERTEX_PROGRAM: updateMaterialVertexProgram(info); break;
            case Property.FRAGMENT_PROGRAM: updateMaterialFragmentProgram(info); break;
            case Property.UNIFORM_SAMPLER2D: updateUniformSampler2D(info); break;
            case Property.UNIFORM_FLOAT: updateUniformFloat(info); break;
            case Property.UNIFORM_RANGE: updateUniformRange(info); break;
            case Property.UNIFORM_VEC2: updateUniformVec2(info); break;
            case Property.UNIFORM_VEC3: updateUniformVec3(info); break;
            case Property.UNIFORM_VEC4: updateUniformVec4(info); break;
            case Property.UNIFORM_COLOR: updateUniformColor(info); break;
            case Property.FLIP_VERTICAL: updateFlipVertical(info); break;
            case Property.FLIP_HORIZONTAL: updateFlipHorizontal(info); break;
            case Property.FLIP_DIAGONAL: updateFlipDiagonal(info); break;
        }
    }

    function saveName(ids: number[]) {
        const names: NameEventData[] = [];
        ids.forEach((id) => {
            const mesh = _selected_list.find((item) => {
                return item.mesh_data.id == id;
            });

            if (mesh == undefined) {
                Services.logger.error('[saveName] Mesh not found for id:', id);
                return;
            }

            names.push({ id_mesh: id, name: mesh.name });
        });

        Services.history.push({
            type: 'MESH_NAME',
            description: 'Изменение имени',
            data: { items: names, owner: HistoryOwner.INSPECTOR_CONTROL },
            undo: (d) => {
                for (const item of d.items as NameEventData[]) {
                    const m = Services.scene.get_by_id(item.id_mesh) as IBaseMeshAndThree | undefined;
                    if (m !== undefined) {
                        m.name = item.name;
                    }
                }
                Services.ui.update_hierarchy();
            },
            redo: () => {},
        });
    }

    function updateName(info: ChangeInfo) {
        info.ids.forEach((id) => {
            const mesh = _selected_list.find((item) => {
                return item.mesh_data.id == id;
            });

            if (mesh == undefined) {
                Services.logger.error('[updateName] Mesh not found for id:', id);
                return;
            }

            mesh.name = info.data.event.value as string;
            Services.ui.update_hierarchy();
        });
    }

    function getChildrenActive(list: any[], state: boolean) {
        let result: ActiveEventData[] = [];

        list.forEach((item: any) => {
            result.push({ id_mesh: item.mesh_data.id, state: item.get_active() });
            if (item.children.length > 0) {
                const children = getChildrenActive(item.children, state);
                if (children.length > 0) result.push(...children);
            }
        });
        return result;
    }

    function saveActive(ids: number[]) {
        const actives: ActiveEventData[] = [];
        ids.forEach((id) => {
            const mesh = _selected_list.find((item) => {
                return item.mesh_data.id == id;
            });

            if (mesh == undefined) {
                Services.logger.error('[saveActive] Mesh not found for id:', id);
                return;
            }

            actives.push({ id_mesh: id, state: mesh.get_active() });
            
            if (mesh.children.length > 0) {
                const children = getChildrenActive(mesh.children, mesh.get_active());
                if (children.length > 0) actives.push(...children);
            }
            
        });

        Services.history.push({
            type: 'MESH_ACTIVE',
            description: 'Изменение активности',
            data: { items: actives, owner: HistoryOwner.INSPECTOR_CONTROL },
            undo: (d) => {
                for (const item of d.items as ActiveEventData[]) {
                    const m = Services.scene.get_by_id(item.id_mesh) as IBaseMeshAndThree | undefined;
                    if (m !== undefined) {
                        m.set_active(item.state);
                    }
                }
                Services.ui.update_hierarchy();
            },
            redo: () => {},
        });
    }

    function updateChildrenActive(children: any[], state: boolean) {
        const result: { id: number, visible: boolean }[] = [];
        children.forEach((child: any) => {
            child.set_active(state);
            result.push({ id: child.mesh_data.id, visible: child.get_visible() });
            if (child.children.length > 0) {
                const children = updateChildrenActive(child.children, state); 
                if (children.length > 0) result.push(...children);
            }
        });
        return result;
    }

    function updateActive(info: ChangeInfo) {
        const ids: { id: number, visible: boolean }[] = [];
        const state = info.data.event.value as boolean;
        info.ids.forEach((id) => {
            const mesh = _selected_list.find((item) => {
                return item.mesh_data.id == id;
            });

            if (mesh == undefined) {
                Services.logger.error('[updateActive] Mesh not found for id:', id);
                return;
            }

            mesh.set_active(state);
            ids.push({id, visible: mesh.get_visible()});
            if (mesh.children) {
                const children = updateChildrenActive(mesh.children, state); 
                if (children.length > 0) ids.push(...children);
            }
        });

        Services.event_bus.emit("hierarchy:active", {list: ids, state});
    }

    function saveVisible(ids: number[]) {
        const visibles: VisibleEventData[] = [];
        ids.forEach((id) => {
            const mesh = _selected_list.find((item) => {
                return item.mesh_data.id == id;
            });

            if (mesh == undefined) {
                Services.logger.error('[saveVisible] Mesh not found for id:', id);
                return;
            }

            visibles.push({ id_mesh: id, state: mesh.get_visible() });
        });

        Services.history.push({
            type: 'MESH_VISIBLE',
            description: 'Изменение видимости',
            data: { items: visibles, owner: HistoryOwner.INSPECTOR_CONTROL },
            undo: (d) => {
                for (const item of d.items as VisibleEventData[]) {
                    const m = Services.scene.get_by_id(item.id_mesh) as IBaseMeshAndThree | undefined;
                    if (m !== undefined) {
                        m.set_visible(item.state);
                    }
                }
                Services.ui.update_hierarchy();
            },
            redo: () => {},
        });
    }

    function updateVisible(info: ChangeInfo) {
        const state = info.data.event.value as boolean;

        info.ids.forEach((id) => {
            const mesh = _selected_list.find((item) => {
                return item.mesh_data.id == id;
            });

            if (mesh == undefined) {
                Services.logger.error('[updateVisible] Mesh not found for id:', id);
                return;
            }

            mesh.set_visible(state);
        });

        Services.event_bus.emit("hierarchy:visibility_changed", {list: info.ids, state});
    }

    function savePosition(ids: number[]) {
        const oldPositions: PositionEventData[] = [];
        ids.forEach((id) => {
            const mesh = _selected_list.find((item) => {
                return item.mesh_data.id == id;
            });

            if (mesh == undefined) {
                Services.logger.error('[savePosition] Mesh not found for id:', id);
                return;
            }

            oldPositions.push({ id_mesh: mesh.mesh_data.id, position: deepClone(mesh.position) });
        });

        Services.history.push({
            type: 'MESH_TRANSLATE',
            description: 'Перемещение объектов',
            data: { items: oldPositions, owner: HistoryOwner.INSPECTOR_CONTROL },
            undo: (d) => {
                for (const item of d.items as PositionEventData[]) {
                    const m = Services.scene.get_by_id(item.id_mesh) as IBaseMeshAndThree | undefined;
                    if (m !== undefined) {
                        m.position.copy(item.position);
                        m.transform_changed();
                    }
                }
                Services.transform.set_proxy_in_average_point(Services.selection.selected as IBaseMeshAndThree[]);
                Services.ui.update_hierarchy();
            },
            redo: () => {},
        });
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

                if (mesh == undefined) {
                    Services.logger.error('[updatePosition] Mesh not found for id:', id);
                    return;
                }

                sum.add(mesh.get_position());
            });

            averagePoint.copy(sum.divideScalar(info.ids.length));
        }

        info.ids.forEach((id) => {
            const mesh = _selected_list.find((item) => {
                return item.mesh_data.id == id;
            });

            if (mesh == undefined) {
                Services.logger.error('[updatePosition] Mesh not found for id:', id);
                return;
            }

            /* NOTE: высчитываем разницу среднего значения позиции и измененного значения в инспекторе
                     (оно уже там стоит в среднем значени, ставиться на этапе сравнения осей в векторах) */
            const x = isDraggedX ? mesh.get_position().x + (pos.x - averagePoint.x) : isChangedX ? pos.x : mesh.get_position().x;
            const y = isDraggedY ? mesh.get_position().y + (pos.y - averagePoint.y) : isChangedY ? pos.y : mesh.get_position().y;
            const z = isDraggedZ ? mesh.get_position().z + (pos.z - averagePoint.z) : isChangedZ ? pos.z : mesh.get_position().z;

            mesh.set_position(x, y, z);
        });

        Services.transform.set_proxy_in_average_point(_selected_list);
        Services.size.draw();
    }

    function saveRotation(ids: number[]) {
        const oldRotations: RotationEventData[] = [];
        ids.forEach((id) => {
            const mesh = _selected_list.find((item) => {
                return item.mesh_data.id == id;
            });

            if (mesh == undefined) {
                Services.logger.error('[saveRotation] Mesh not found for id:', id);
                return;
            }

            oldRotations.push({ id_mesh: id, rotation: deepClone(mesh.rotation) });
        });

        Services.history.push({
            type: 'MESH_ROTATE',
            description: 'Вращение объектов',
            data: { items: oldRotations, owner: HistoryOwner.INSPECTOR_CONTROL },
            undo: (d) => {
                for (const item of d.items as RotationEventData[]) {
                    const m = Services.scene.get_by_id(item.id_mesh) as IBaseMeshAndThree | undefined;
                    if (m !== undefined) {
                        m.rotation.copy(item.rotation);
                        m.transform_changed();
                    }
                }
                Services.transform.set_proxy_in_average_point(Services.selection.selected as IBaseMeshAndThree[]);
                Services.ui.update_hierarchy();
            },
            redo: () => {},
        });
    }

    function updateRotation(info: ChangeInfo) {
        const [isChangedX, isChangedY, isChangedZ] = getChangedInfo(info);

        const rawRot = info.data.event.value as Vector3;
        const rot = new Vector3(degToRad(rawRot.x), degToRad(rawRot.y), degToRad(rawRot.z));

        info.ids.forEach((id) => {
            const mesh = _selected_list.find((item) => {
                return item.mesh_data.id == id;
            });

            if (mesh == undefined) {
                Services.logger.error('[updateRotation] Mesh not found for id:', id);
                return;
            }

            const x = isChangedX ? rot.x : mesh.rotation.x;
            const y = isChangedY ? rot.y : mesh.rotation.y;
            const z = isChangedZ ? rot.z : mesh.rotation.z;

            mesh.rotation.set(x, y, z);
            mesh.transform_changed();
        });

        Services.transform.set_proxy_in_average_point(_selected_list);
        Services.size.draw();
    }

    function saveScale(ids: number[]) {
        const oldScales: ScaleEventData[] = [];
        ids.forEach((id) => {
            const mesh = _selected_list.find((item) => {
                return item.mesh_data.id == id;
            });

            if (mesh == undefined) {
                Services.logger.error('[saveScale] Mesh not found for id:', id);
                return;
            }

            oldScales.push({ id_mesh: id, scale: deepClone(mesh.scale) });
        });

        Services.history.push({
            type: 'MESH_SCALE',
            description: 'Масштабирование объектов',
            data: { items: oldScales, owner: HistoryOwner.INSPECTOR_CONTROL },
            undo: (d) => {
                for (const item of d.items as ScaleEventData[]) {
                    const m = Services.scene.get_by_id(item.id_mesh) as IBaseMeshAndThree | undefined;
                    if (m !== undefined) {
                        m.scale.copy(item.scale);
                        m.transform_changed();
                    }
                }
                Services.transform.set_proxy_in_average_point(Services.selection.selected as IBaseMeshAndThree[]);
                Services.ui.update_hierarchy();
            },
            redo: () => {},
        });
    }

    function updateScale(info: ChangeInfo) {
        const [isChangedX, isChangedY] = getChangedInfo(info);

        const scale = info.data.event.value as Vector3;

        info.ids.forEach((id) => {
            const mesh = _selected_list.find((item) => {
                return item.mesh_data.id == id;
            });

            if (mesh == undefined) {
                Services.logger.error('[updateScale] Mesh not found for id:', id);
                return;
            }

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

        Services.transform.set_proxy_in_average_point(_selected_list);
        Services.size.draw();

        // для обновления размера шрифта
        refresh([Property.FONT_SIZE]);
    }

    function saveSize(ids: number[]) {
        const oldSizes: SizeEventData[] = [];
        ids.forEach((id) => {
            const mesh = _selected_list.find((item) => {
                return item.mesh_data.id == id;
            });

            if (mesh == undefined) {
                Services.logger.error('[saveSize] Mesh not found for id:', id);
                return;
            }

            oldSizes.push({ id_mesh: id, position: mesh.get_position(), size: mesh.get_size() });
        });

        Services.history.push({
            type: 'MESH_SIZE',
            description: 'Изменение размера',
            data: { items: oldSizes, owner: HistoryOwner.INSPECTOR_CONTROL },
            undo: (d) => {
                for (const item of d.items as SizeEventData[]) {
                    const m = Services.scene.get_by_id(item.id_mesh) as IBaseMeshAndThree | undefined;
                    if (m !== undefined) {
                        m.position.copy(item.position);
                        m.set_size(item.size.x, item.size.y);
                        m.transform_changed();
                    }
                }
                Services.transform.set_proxy_in_average_point(Services.selection.selected as IBaseMeshAndThree[]);
                Services.ui.update_hierarchy();
            },
            redo: () => {},
        });
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

                if (mesh == undefined) {
                    Services.logger.error('[updateSize] Mesh not found for id:', id);
                    return;
                }

                sum.add(mesh.get_size());
            });

            averageSize.copy(sum.divideScalar(info.ids.length));
        }

        info.ids.forEach((id) => {
            const mesh = _selected_list.find((item) => {
                return item.mesh_data.id == id;
            });

            if (mesh == undefined) {
                Services.logger.error('[updateSize] Mesh not found for id:', id);
                return;
            }

            const x = isDraggedX ? mesh.get_size().x + (size.x - averageSize.x) : isChangedX ? size.x : mesh.get_size().x;
            const y = isDraggedY ? mesh.get_size().y + (size.y - averageSize.y) : isChangedY ? size.y : mesh.get_size().y;

            mesh.set_size(x, y);
        });

        Services.size.draw();
    }

    function savePivot(ids: number[]) {
        const pivots: PivotEventData[] = [];
        ids.forEach((id) => {
            const mesh = _selected_list.find((item) => {
                return item.mesh_data.id == id;
            });

            if (mesh == undefined) {
                Services.logger.error('[savePivot] Mesh not found for id:', id);
                return;
            }

            pivots.push({ id_mesh: id, pivot: mesh.get_pivot() });
        });

        Services.history.push({
            type: 'MESH_PIVOT',
            description: 'Изменение точки опоры',
            data: { items: pivots, owner: HistoryOwner.INSPECTOR_CONTROL },
            undo: (d) => {
                for (const item of d.items as PivotEventData[]) {
                    const m = Services.scene.get_by_id(item.id_mesh) as IBaseMeshAndThree | undefined;
                    if (m !== undefined) {
                        m.set_pivot(item.pivot.x, item.pivot.y, true);
                        m.transform_changed();
                    }
                }
                Services.ui.update_hierarchy();
            },
            redo: () => {},
        });
    }

    function updatePivot(info: ChangeInfo) {
        info.ids.forEach((id) => {
            const mesh = _selected_list.find((item) => {
                return item.mesh_data.id == id;
            });

            if (mesh == undefined) {
                Services.logger.error('[updatePivot] Mesh not found for id:', id);
                return;
            }

            const pivot_preset = info.data.event.value as ScreenPointPreset;
            const pivot = screenPresetToPivotValue(pivot_preset);
            mesh.set_pivot(pivot.x, pivot.y, true);
        });

        Services.size.draw();
    }

    function saveAnchor(ids: number[]) {
        const anchors: AnchorEventData[] = [];
        ids.forEach((id) => {
            const mesh = _selected_list.find((item) => {
                return item.mesh_data.id == id;
            });

            if (mesh == undefined) {
                Services.logger.error('[saveAnchor] Mesh not found for id:', id);
                return;
            }

            anchors.push({ id_mesh: id, anchor: mesh.get_anchor() });
        });

        Services.history.push({
            type: 'MESH_ANCHOR',
            description: 'Изменение якоря',
            data: { items: anchors, owner: HistoryOwner.INSPECTOR_CONTROL },
            undo: (d) => {
                for (const item of d.items as AnchorEventData[]) {
                    const m = Services.scene.get_by_id(item.id_mesh) as IBaseMeshAndThree | undefined;
                    if (m !== undefined) {
                        m.set_anchor(item.anchor.x, item.anchor.y);
                    }
                }
                Services.ui.update_hierarchy();
            },
            redo: () => {},
        });
    }

    function updateAnchor(info: ChangeInfo) {
        const [isChangedX, isChangedY] = getChangedInfo(info);

        const anchor = info.data.event.value as Vector2;

        info.ids.forEach((id) => {
            const mesh = _selected_list.find((item) => {
                return item.mesh_data.id == id;
            });

            if (mesh == undefined) {
                Services.logger.error('[updateAnchor] Mesh not found for id:', id);
                return;
            }

            const x = isChangedX ? anchor.x : mesh.get_anchor().x;
            const y = isChangedY ? anchor.y : mesh.get_anchor().y;

            mesh.set_anchor(x, y);
        });

        Services.size.draw();

        if (info.data.event.last) {
            refresh([Property.ANCHOR_PRESET]);
        }

        refresh([Property.ANCHOR]);
    }

    function saveAnchorPreset(ids: number[]) {
        const anchors: AnchorEventData[] = [];
        ids.forEach((id) => {
            const mesh = _selected_list.find((item) => {
                return item.mesh_data.id == id;
            });

            if (mesh == undefined) {
                Services.logger.error('[saveAnchorPreset] Mesh not found for id:', id);
                return;
            }

            anchors.push({ id_mesh: id, anchor: mesh.get_anchor() });
        });

        Services.history.push({
            type: 'MESH_ANCHOR',
            description: 'Изменение якоря (пресет)',
            data: { items: anchors, owner: HistoryOwner.INSPECTOR_CONTROL },
            undo: (d) => {
                for (const item of d.items as AnchorEventData[]) {
                    const m = Services.scene.get_by_id(item.id_mesh) as IBaseMeshAndThree | undefined;
                    if (m !== undefined) {
                        m.set_anchor(item.anchor.x, item.anchor.y);
                    }
                }
                Services.ui.update_hierarchy();
            },
            redo: () => {},
        });
    }

    function updateAnchorPreset(info: ChangeInfo) {
        info.ids.forEach((id) => {
            const mesh = _selected_list.find((item) => {
                return item.mesh_data.id == id;
            });

            if (mesh == undefined) {
                Services.logger.error('[updateAnchorPreset] Mesh not found for id:', id);
                return;
            }

            const anchor = screenPresetToAnchorValue(info.data.event.value as ScreenPointPreset);
            if (anchor) {
                mesh.set_anchor(anchor.x, anchor.y);
            }
        });

        Services.size.draw();
        refresh([Property.ANCHOR]);
    }

    function saveColor(ids: number[]) {
        const colors: ColorEventData[] = [];
        ids.forEach((id) => {
            const mesh = _selected_list.find((item) => {
                return item.mesh_data.id == id;
            });

            if (mesh == undefined) {
                Services.logger.error('[saveColor] Mesh not found for id:', id);
                return;
            }

            colors.push({ id_mesh: id, color: mesh.get_color() });
        });

        Services.history.push({
            type: 'MESH_COLOR',
            description: 'Изменение цвета',
            data: { items: colors, owner: HistoryOwner.INSPECTOR_CONTROL },
            undo: (d) => {
                for (const item of d.items as ColorEventData[]) {
                    const m = Services.scene.get_by_id(item.id_mesh) as IBaseMeshAndThree | undefined;
                    if (m !== undefined) {
                        m.set_color(item.color);
                    }
                }
            },
            redo: () => {},
        });
    }

    function updateColor(info: ChangeInfo) {
        info.ids.forEach((id) => {
            const mesh = _selected_list.find((item) => {
                return item.mesh_data.id == id;
            });

            if (mesh == undefined) {
                Services.logger.error('[updateColor] Mesh not found for id:', id);
                return;
            }

            const color = info.data.event.value as string;
            mesh.set_color(color);
        });
    }

    function saveAlpha(ids: number[]) {
        const alphas: AlphaEventData[] = [];
        ids.forEach((id) => {
            const mesh = _selected_list.find((item) => {
                return item.mesh_data.id == id;
            });

            if (mesh == undefined) {
                Services.logger.error('[saveAlpha] Mesh not found for id:', id);
                return;
            }

            if (mesh.type === IObjectTypes.TEXT || mesh.type === IObjectTypes.GUI_TEXT || mesh.type === IObjectTypes.GO_LABEL_COMPONENT) {
                alphas.push({ id_mesh: id, alpha: deepClone((mesh as TextMesh).fillOpacity) });
            } else if (mesh.type === IObjectTypes.SLICE9_PLANE || mesh.type === IObjectTypes.GUI_BOX || mesh.type === IObjectTypes.GO_SPRITE_COMPONENT) {
                alphas.push({ id_mesh: id, alpha: deepClone((mesh as Slice9Mesh).get_alpha()) });
            }
        });

        Services.history.push({
            type: 'MESH_ALPHA',
            description: 'Изменение прозрачности',
            data: { items: alphas, owner: HistoryOwner.INSPECTOR_CONTROL },
            undo: (d) => {
                for (const item of d.items as AlphaEventData[]) {
                    const m = Services.scene.get_by_id(item.id_mesh) as IBaseMeshAndThree | undefined;
                    if (m !== undefined) {
                        if (m.type === IObjectTypes.TEXT || m.type === IObjectTypes.GUI_TEXT || m.type === IObjectTypes.GO_LABEL_COMPONENT) {
                            (m as TextMesh).fillOpacity = item.alpha;
                        } else if (m.type === IObjectTypes.SLICE9_PLANE || m.type === IObjectTypes.GUI_BOX || m.type === IObjectTypes.GO_SPRITE_COMPONENT) {
                            (m as Slice9Mesh).set_alpha(item.alpha);
                        }
                    }
                }
            },
            redo: () => {},
        });
    }

    function updateAlpha(info: ChangeInfo) {
        info.ids.forEach((id) => {
            const mesh = _selected_list.find((item) => {
                return item.mesh_data.id == id;
            });

            if (mesh == undefined) {
                Services.logger.error('[updateAlpha] Mesh not found for id:', id);
                return;
            }

            const alpha = info.data.event.value as number;
            if (mesh.type === IObjectTypes.TEXT || mesh.type === IObjectTypes.GUI_TEXT || mesh.type === IObjectTypes.GO_LABEL_COMPONENT) {
                (mesh as TextMesh).fillOpacity = alpha;
            } else if (mesh.type === IObjectTypes.SLICE9_PLANE || mesh.type === IObjectTypes.GUI_BOX || mesh.type === IObjectTypes.GO_SPRITE_COMPONENT) {
                (mesh as Slice9Mesh).set_alpha(alpha);
            }
        });
    }

    function saveTexture(ids: number[]) {
        const textures: TextureEventData[] = [];
        ids.forEach((id) => {
            const mesh = _selected_list.find((item) => {
                return item.mesh_data.id == id;
            });

            if (mesh == undefined) {
                Services.logger.error('[saveTexture] Mesh not found for id:', id);
                return;
            }

            const texture = mesh.get_texture()[0];
            textures.push({ id_mesh: id, texture });
        });

        Services.history.push({
            type: 'MESH_TEXTURE',
            description: 'Изменение текстуры',
            data: { items: textures, owner: HistoryOwner.INSPECTOR_CONTROL },
            undo: (d) => {
                for (const item of d.items as TextureEventData[]) {
                    const m = Services.scene.get_by_id(item.id_mesh) as IBaseMeshAndThree | undefined;
                    if (m !== undefined) {
                        const atlas = m.get_texture()[1];
                        m.set_texture(item.texture, atlas);
                    }
                }
            },
            redo: () => {},
        });
    }

    function updateTexture(info: ChangeInfo) {
        info.ids.forEach((id) => {
            const mesh = _selected_list.find((item) => {
                return item.mesh_data.id == id;
            });

            if (mesh == undefined) {
                Services.logger.error('[updateTexture] Mesh not found for id:', id);
                return;
            }

            if (info.data.event.value) {
                const atlas = (mesh as Slice9Mesh).get_texture()[1];
                const texture = info.data.event.value as string;
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

            if (mesh == undefined) {
                Services.logger.error('[saveSlice] Mesh not found for id:', id);
                return;
            }

            slices.push({ id_mesh: id, slice: (mesh as Slice9Mesh).get_slice() });
        });

        Services.history.push({
            type: 'MESH_SLICE',
            description: 'Изменение slice',
            data: { items: slices, owner: HistoryOwner.INSPECTOR_CONTROL },
            undo: (d) => {
                for (const item of d.items as SliceEventData[]) {
                    const m = Services.scene.get_by_id(item.id_mesh) as Slice9Mesh | undefined;
                    if (m !== undefined) {
                        m.set_slice(item.slice.x, item.slice.y);
                    }
                }
            },
            redo: () => {},
        });
    }

    function updateSlice(info: ChangeInfo) {
        const [isChangedX, isChangedY] = getChangedInfo(info);

        const slice = info.data.event.value as Vector2;

        info.ids.forEach((id) => {
            const mesh = _selected_list.find((item) => {
                return item.mesh_data.id == id;
            });

            if (mesh == undefined) {
                Services.logger.error('[updateSlice] Mesh not found for id:', id);
                return;
            }

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

            if (mesh == undefined) {
                Services.logger.error('[saveText] Mesh not found for id:', id);
                return;
            }

            texts.push({ id_mesh: id, text: deepClone((mesh as TextMesh).text) });
        });

        Services.history.push({
            type: 'MESH_TEXT',
            description: 'Изменение текста',
            data: { items: texts, owner: HistoryOwner.INSPECTOR_CONTROL },
            undo: (d) => {
                for (const item of d.items as TextEventData[]) {
                    const m = Services.scene.get_by_id(item.id_mesh) as TextMesh | undefined;
                    if (m !== undefined) {
                        m.text = item.text;
                    }
                }
            },
            redo: () => {},
        });
    }

    function updateText(info: ChangeInfo) {
        info.ids.forEach((id) => {
            const mesh = _selected_list.find((item) => {
                return item.mesh_data.id == id;
            });

            if (mesh == undefined) {
                Services.logger.error('[updateText] Mesh not found for id:', id);
                return;
            }

            const text = info.data.event.value as string;
            (mesh as TextMesh).text = text;
        });
    }

    function saveFont(ids: number[]) {
        const fonts: FontEventData[] = [];
        ids.forEach((id) => {
            const mesh = _selected_list.find((item) => {
                return item.mesh_data.id == id;
            });

            if (mesh == undefined) {
                Services.logger.error('[saveFont] Mesh not found for id:', id);
                return;
            }

            const oldFont = deepClone((mesh as TextMesh).font);
            fonts.push({ id_mesh: id, font: oldFont ? oldFont : '' });
        });

        Services.history.push({
            type: 'MESH_FONT',
            description: 'Изменение шрифта',
            data: { items: fonts, owner: HistoryOwner.INSPECTOR_CONTROL },
            undo: (d) => {
                for (const item of d.items as FontEventData[]) {
                    const m = Services.scene.get_by_id(item.id_mesh) as TextMesh | undefined;
                    if (m !== undefined) {
                        m.font = item.font;
                    }
                }
            },
            redo: () => {},
        });
    }

    function updateFont(info: ChangeInfo) {
        info.ids.forEach((id) => {
            const mesh = _selected_list.find((item) => {
                return item.mesh_data.id == id;
            });

            if (mesh == undefined) {
                Services.logger.error('[updateFont] Mesh not found for id:', id);
                return;
            }

            const font = info.data.event.value as string;
            (mesh as TextMesh).font = font;
        });
    }

    function saveFontSize(ids: number[]) {
        const fontSizes: FontSizeEventData[] = [];
        ids.forEach((id) => {
            const mesh = _selected_list.find((item) => {
                return item.mesh_data.id == id;
            });

            if (mesh == undefined) {
                Services.logger.error('[saveFontSize] Mesh not found for id:', id);
                return;
            }

            const oldScale = mesh.get_scale();
            fontSizes.push({ id_mesh: id, scale: new Vector3(oldScale.x, oldScale.y, 1) });
        });

        Services.history.push({
            type: 'MESH_FONT_SIZE',
            description: 'Изменение размера шрифта',
            data: { items: fontSizes, owner: HistoryOwner.INSPECTOR_CONTROL },
            undo: (d) => {
                for (const item of d.items as ScaleEventData[]) {
                    const m = Services.scene.get_by_id(item.id_mesh) as IBaseMeshAndThree | undefined;
                    if (m !== undefined) {
                        m.scale.copy(item.scale);
                        m.transform_changed();
                    }
                }
                Services.transform.set_proxy_in_average_point(Services.selection.selected as IBaseMeshAndThree[]);
            },
            redo: () => {},
        });
    }

    function updateFontSize(info: ChangeInfo) {
        info.ids.forEach((id) => {
            const mesh = _selected_list.find((item) => {
                return item.mesh_data.id == id;
            });

            if (mesh == undefined) {
                Services.logger.error('[updateFontSize] Mesh not found for id:', id);
                return;
            }

            const font_size = info.data.event.value as number;
            const delta = font_size / (mesh as TextMesh).fontSize;

            mesh.scale.set(1 * delta, 1 * delta, mesh.scale.z);
            mesh.transform_changed();
        });

        Services.transform.set_proxy_in_average_point(_selected_list);
        Services.size.draw();
        refresh([Property.SCALE]);
    }

    function saveTextAlign(ids: number[]) {
        const textAligns: TextAlignEventData[] = [];
        ids.forEach((id) => {
            const mesh = _selected_list.find((item) => {
                return item.mesh_data.id == id;
            });
            if (mesh == undefined) {
                Services.logger.error('[saveTextAlign] Mesh not found for id:', id);
                return;
            }

            textAligns.push({ id_mesh: id, text_align: deepClone((mesh as TextMesh).textAlign) });
        });

        Services.history.push({
            type: 'MESH_TEXT_ALIGN',
            description: 'Изменение выравнивания текста',
            data: { items: textAligns, owner: HistoryOwner.INSPECTOR_CONTROL },
            undo: (d) => {
                for (const item of d.items as TextAlignEventData[]) {
                    const m = Services.scene.get_by_id(item.id_mesh) as TextMesh | undefined;
                    if (m !== undefined) {
                        m.textAlign = item.text_align;
                    }
                }
            },
            redo: () => {},
        });
    }

    function updateTextAlign(info: ChangeInfo) {
        info.ids.forEach((id) => {
            const mesh = _selected_list.find((item) => {
                return item.mesh_data.id == id;
            });
            if (mesh == undefined) {
                Services.logger.error('[updateTextAlign] Mesh not found for id:', id);
                return;
            }

            const text_align = info.data.event.value as any;
            (mesh as TextMesh).textAlign = text_align;
        });
    }

    function saveLineHeight(ids: number[]) {
        const lineHeights: LineHeightEventData[] = [];
        ids.forEach((id) => {
            const mesh = _selected_list.find((item) => {
                return item.mesh_data.id == id;
            });
            if (mesh == undefined) {
                Services.logger.error('[saveLineHeight] Mesh not found for id:', id);
                return;
            }

            const lh = (mesh as TextMesh).lineHeight;
            lineHeights.push({ id_mesh: id, line_height: typeof lh === 'number' ? lh : 1 });
        });

        Services.history.push({
            type: 'MESH_LINE_HEIGHT',
            description: 'Изменение межстрочного интервала',
            data: { items: lineHeights, owner: HistoryOwner.INSPECTOR_CONTROL },
            undo: (d) => {
                for (const item of d.items as LineHeightEventData[]) {
                    const m = Services.scene.get_by_id(item.id_mesh) as TextMesh | undefined;
                    if (m !== undefined) {
                        m.lineHeight = item.line_height;
                    }
                }
            },
            redo: () => {},
        });
    }

    function updateLineHeight(info: ChangeInfo) {
        info.ids.forEach((id) => {
            const mesh = _selected_list.find((item) => {
                return item.mesh_data.id == id;
            });
            if (mesh == undefined) {
                Services.logger.error('[updateLineHeight] Mesh not found for id:', id);
                return;
            }

            const line_height = info.data.event.value as number;
            (mesh as TextMesh).lineHeight = line_height;
        });
    }

    function saveAtlas(ids: number[]) {
        const atlases: MeshAtlasEventData[] = [];
        ids.forEach((id) => {
            const mesh = _selected_list.find((item) => {
                return item.mesh_data.id == id;
            });

            if (mesh == undefined) {
                Services.logger.error('[saveAtlas] Mesh not found for id:', id);
                return;
            }

            const atlas = mesh.get_texture()[1];
            const texture = mesh.get_texture()[0];
            atlases.push({ id_mesh: id, atlas, texture });
        });

        Services.history.push({
            type: 'MESH_ATLAS',
            description: 'Изменение атласа меша',
            data: { items: atlases, owner: HistoryOwner.INSPECTOR_CONTROL },
            undo: (d) => {
                for (const item of d.items as MeshAtlasEventData[]) {
                    const m = Services.scene.get_by_id(item.id_mesh) as IBaseMeshAndThree | undefined;
                    if (m !== undefined) {
                        m.set_texture(item.texture, item.atlas);
                    }
                }
            },
            redo: () => {},
        });
    }

    function updateAtlas(info: ChangeInfo) {
        Services.logger.debug('update atlas');
        const atlas = info.data.event.value as string;
        info.ids.forEach((id) => {
            const mesh = _selected_list.find((item) => {
                return item.mesh_data.id == id;
            });

            if (mesh == undefined) {
                Services.logger.error('[updateAtlas] Mesh not found for id:', id);
                return;
            }

            (mesh as Slice9Mesh).set_texture('', atlas);
        });

        // NOTE: на следующем кадре обновляем список выбранных мешей чтобы обновились опции текстур
        // моментально обновить не можем так как мы сейчас в событии обновления поля которое под копотом делает dispose
        // поэтому очистить инспектор и собрать поля занаво можно будет только после обновления поля
        setTimeout(() => set_selected_list(_selected_list));
    }

    function saveAssetAtlas(ids: number[]) {
        const atlases: TextureAtlasEventData[] = [];
        ids.forEach((id) => {
            const texture_path = _selected_textures[id];
            if (texture_path == null) {
                Services.logger.error('[saveAtlas] Texture path not found for id:', id);
                return;
            }

            const texture_name = get_file_name(get_basename(texture_path));
            const oldAtlas = Services.resources.get_atlas_by_texture_name(texture_name);
            atlases.push({ texture_path, atlas: oldAtlas ? oldAtlas : '' });
        });

        Services.history.push({
            type: 'TEXTURE_ATLAS',
            description: 'Изменение атласа текстуры',
            data: { items: atlases, owner: HistoryOwner.INSPECTOR_CONTROL },
            undo: (d) => {
                for (const item of d.items as TextureAtlasEventData[]) {
                    const texture_name = get_file_name(get_basename(item.texture_path));
                    const current_atlas = Services.resources.get_atlas_by_texture_name(texture_name) || '';
                    Services.resources.override_atlas_texture(current_atlas, item.atlas, texture_name);
                }
            },
            redo: () => {},
        });
    }

    function updateAssetAtlas(info: ChangeInfo) {
        const atlas = info.data.event.value as string;

        info.ids.forEach((id) => {
            const texture_path = _selected_textures[id];
            if (texture_path == null) {
                Services.logger.error('[updateAtlas] Texture path not found for id:', id);
                return;
            }

            const texture_name = get_file_name(get_basename(texture_path));
            const old_atlas = Services.resources.get_atlas_by_texture_name(texture_name) || '';
            Services.resources.override_atlas_texture(old_atlas, atlas, texture_name);

            // NOTE: возможно обновление текстур в мешах должно быть в override_atlas_texture
            Services.scene.get_all().forEach((mesh) => {
                const mesh_any = mesh as { type?: IObjectTypes };
                const is_type = mesh_any.type === IObjectTypes.GO_SPRITE_COMPONENT || mesh_any.type === IObjectTypes.GUI_BOX;
                if (!is_type) return;

                const mesh_typed = mesh as unknown as IBaseMesh;
                const mesh_texture = mesh_typed.get_texture();
                const is_atlas = mesh_texture.includes(old_atlas);
                const is_texture = mesh_texture.includes(texture_name);

                if (is_atlas && is_texture) {
                    mesh_typed.set_texture(texture_name, atlas);
                }
            });
        });

        Services.resources.write_metadata();
    }

    function saveBlendMode(ids: number[]) {
        const blendModes: BlendModeEventData[] = [];
        ids.forEach((id) => {
            const mesh = _selected_list.find((item) => {
                return item.mesh_data.id == id;
            });

            if (mesh == undefined) {
                Services.logger.error('[saveBlendMode] Mesh not found for id:', id);
                return;
            }

            blendModes.push({
                id_mesh: id,
                blend_mode: (mesh as any).material.blending
            });
        });

        Services.history.push({
            type: 'MESH_BLEND_MODE',
            description: 'Изменение режима смешивания',
            data: { items: blendModes, owner: HistoryOwner.INSPECTOR_CONTROL },
            undo: (d) => {
                for (const item of d.items as BlendModeEventData[]) {
                    const m = Services.scene.get_by_id(item.id_mesh) as IBaseMeshAndThree | undefined;
                    if (m !== undefined && (m as any).material !== undefined) {
                        (m as any).material.blending = item.blend_mode;
                    }
                }
            },
            redo: () => {},
        });
    }

    function updateBlendMode(info: ChangeInfo) {
        info.ids.forEach((id) => {
            const mesh = _selected_list.find((item) => {
                return item.mesh_data.id == id;
            });

            if (mesh == undefined) {
                Services.logger.error('[updateBlendMode] Mesh not found for id:', id);
                return;
            }

            const blend_mode = info.data.event.value as BlendMode;
            const threeBlendMode = convertBlendModeToThreeJS(blend_mode);
            (mesh as any).material.blending = threeBlendMode;
        });
    }

    function saveMinFilter(ids: number[]) {
        const minFilters: MinFilterEventData[] = [];
        ids.forEach((id) => {
            const texture_path = _selected_textures[id];
            if (texture_path == null) {
                Services.logger.error('[saveMinFilter] Texture path not found for id:', id);
                return;
            }

            const texture_name = get_file_name(get_basename(texture_path));
            const atlas = Services.resources.get_atlas_by_texture_name(texture_name);
            if (atlas == null) {
                Services.logger.error('[saveMinFilter] Atlas not found for texture:', texture_name);
                return;
            }

            const texture_data = Services.resources.get_texture(texture_name, atlas);
            minFilters.push({
                texture_path,
                filter: texture_data.texture.minFilter as MinificationTextureFilter
            });
        });

        Services.history.push({
            type: 'TEXTURE_MIN_FILTER',
            description: 'Изменение минификационного фильтра',
            data: { items: minFilters, owner: HistoryOwner.INSPECTOR_CONTROL },
            undo: (d) => {
                for (const item of d.items as MinFilterEventData[]) {
                    const texture_name = get_file_name(get_basename(item.texture_path));
                    const atlas = Services.resources.get_atlas_by_texture_name(texture_name);
                    if (atlas !== null) {
                        const texture_data = Services.resources.get_texture(texture_name, atlas);
                        texture_data.texture.minFilter = item.filter;
                    }
                }
                Services.resources.write_metadata();
            },
            redo: () => {},
        });
    }

    function updateMinFilter(info: ChangeInfo) {
        info.ids.forEach((id) => {
            const texture_path = _selected_textures[id];
            if (texture_path == null) {
                Services.logger.error('[updateMinFilter] Texture path not found for id:', id);
                return;
            }

            const texture_name = get_file_name(get_basename(texture_path));
            const atlas = Services.resources.get_atlas_by_texture_name(texture_name);
            if (atlas == null) {
                Services.logger.error('[updateMinFilter] Atlas not found for texture:', texture_name);
                return;
            }

            const filter_mode = info.data.event.value as FilterMode;
            const threeFilterMode = convertFilterModeToThreeJS(filter_mode) as MinificationTextureFilter;
            const texture_data = Services.resources.get_texture(texture_name, atlas);
            texture_data.texture.minFilter = threeFilterMode;
        });

        Services.resources.write_metadata();
    }

    function saveMagFilter(ids: number[]) {
        const magFilters: MagFilterEventData[] = [];
        ids.forEach((id) => {
            const texture_path = _selected_textures[id];
            if (texture_path == null) {
                Services.logger.error('[saveMagFilter] Texture path not found for id:', id);
                return;
            }

            const texture_name = get_file_name(get_basename(texture_path));
            const atlas = Services.resources.get_atlas_by_texture_name(texture_name);
            if (atlas == null) {
                Services.logger.error('[saveMagFilter] Atlas not found for texture:', texture_name);
                return;
            }

            const texture_data = Services.resources.get_texture(texture_name, atlas);
            magFilters.push({
                texture_path,
                filter: texture_data.texture.magFilter as MagnificationTextureFilter
            });
        });

        Services.history.push({
            type: 'TEXTURE_MAG_FILTER',
            description: 'Изменение магнификационного фильтра',
            data: { items: magFilters, owner: HistoryOwner.INSPECTOR_CONTROL },
            undo: (d) => {
                for (const item of d.items as MagFilterEventData[]) {
                    const texture_name = get_file_name(get_basename(item.texture_path));
                    const atlas = Services.resources.get_atlas_by_texture_name(texture_name);
                    if (atlas !== null) {
                        const texture_data = Services.resources.get_texture(texture_name, atlas);
                        texture_data.texture.magFilter = item.filter;
                    }
                }
                Services.resources.write_metadata();
            },
            redo: () => {},
        });
    }

    function updateMagFilter(info: ChangeInfo) {
        info.ids.forEach((id) => {
            const texture_path = _selected_textures[id];
            if (texture_path == null) {
                Services.logger.error('[updateMagFilter] Texture path not found for id:', id);
                return;
            }

            const texture_name = get_file_name(get_basename(texture_path));
            const atlas = Services.resources.get_atlas_by_texture_name(texture_name);
            if (atlas == null) {
                Services.logger.error('[updateMagFilter] Atlas not found for texture:', texture_name);
                return;
            }

            const filter_mode = info.data.event.value as FilterMode;
            const threeFilterMode = convertFilterModeToThreeJS(filter_mode) as MagnificationTextureFilter;
            const texture_data = Services.resources.get_texture(texture_name, atlas);
            texture_data.texture.magFilter = threeFilterMode;
        });

        Services.resources.write_metadata();
    }

    function convertFilterModeToThreeJS(filter_mode: FilterMode): number {
        switch (filter_mode) {
            case FilterMode.NEAREST:
                return NearestFilter;
            case FilterMode.LINEAR:
                return LinearFilter;
            default:
                return LinearFilter;
        }
    }

    function convertThreeJSFilterToFilterMode(filter: number): FilterMode {
        switch (filter) {
            case NearestFilter:
                return FilterMode.NEAREST;
            case LinearFilter:
                return FilterMode.LINEAR;
            default:
                return FilterMode.LINEAR;
        }
    }

    function saveUV(ids: number[]) {
        const uvs: UVEventData[] = [];
        ids.forEach((id) => {
            const mesh = _selected_list.find((item) => {
                return item.mesh_data.id == id;
            });

            if (mesh == undefined) {
                Services.logger.error('[saveUV] Mesh not found for id:', id);
                return;
            }

            if (mesh.type === IObjectTypes.GO_SPRITE_COMPONENT) {
                const sprite = mesh as GoSprite;
                uvs.push({
                    id_mesh: id,
                    uv: sprite.get_uv()
                });
            }
        });

        Services.history.push({
            type: 'MESH_UV',
            description: 'Изменение UV координат',
            data: { items: uvs, owner: HistoryOwner.INSPECTOR_CONTROL },
            undo: (d) => {
                for (const item of d.items as UVEventData[]) {
                    const m = Services.scene.get_by_id(item.id_mesh) as GoSprite | undefined;
                    if (m !== undefined && m.type === IObjectTypes.GO_SPRITE_COMPONENT) {
                        m.set_uv(item.uv);
                    }
                }
            },
            redo: () => {},
        });
    }

    function saveMaterial(ids: number[]) {
        const materials: MaterialEventData[] = [];
        ids.forEach((id) => {
            const mesh = _selected_list.find((item) => {
                return item.mesh_data.id == id;
            });

            if (mesh == undefined) {
                Services.logger.error('[saveMaterial] Mesh not found for id:', id);
                return;
            }

            materials.push({ id_mesh: id, material: (mesh as any).material.name });
        });

        Services.history.push({
            type: 'MESH_MATERIAL',
            description: 'Изменение материала',
            data: { items: materials, owner: HistoryOwner.INSPECTOR_CONTROL },
            undo: (d) => {
                for (const item of d.items as MaterialEventData[]) {
                    const m = Services.scene.get_by_id(item.id_mesh) as (IBaseMeshAndThree & { set_material(name: string): void }) | undefined;
                    if (m !== undefined) {
                        m.set_material(item.material);
                    }
                }
            },
            redo: () => {},
        });
    }

    function updateMaterial(info: ChangeInfo) {
        info.ids.forEach((id) => {
            const mesh = _selected_list.find((item) => {
                return item.mesh_data.id == id;
            });

            if (mesh == undefined) {
                Services.logger.error('[updateMaterial] Mesh not found for id:', id);
                return;
            }

            const material_name = info.data.event.value as string;
            const material_info = Services.resources.get_material_info(material_name);
            if (material_info !== undefined) {
                (mesh as unknown as { material: unknown }).material = material_info.instances[material_info.origin];
            }
        });
    }

    function updateMaterialVertexProgram(info: ChangeInfo) {
        const program = info.data.event.value as string;
        info.ids.forEach((id) => {
            const material = Services.resources.get_material_info(_selected_materials[id]);
            if (material === undefined) return;
            material.vertexShader = program;
            const instance = material.instances[material.origin];
            if (instance !== undefined) {
                instance.needsUpdate = true;
            }
            Services.event_bus.emit('materials:changed', {
                material_name: material.name,
                property: 'vertexShader',
                value: program
            });
        });
    }

    function updateMaterialFragmentProgram(info: ChangeInfo) {
        const program = info.data.event.value as string;
        info.ids.forEach((id) => {
            const material = Services.resources.get_material_info(_selected_materials[id]);
            if (material === undefined) return;
            material.fragmentShader = program;
            const instance = material.instances[material.origin];
            if (instance !== undefined) {
                instance.needsUpdate = true;
            }
            Services.event_bus.emit('materials:changed', {
                material_name: material.name,
                property: 'fragmentShader',
                value: program
            });
        });
    }

    function updateUniformSampler2D(info: ChangeInfo) {
        const atlas = (info.data.event.value as string).split('/')[0];
        const texture_name = (info.data.event.value as string).split('/')[1];
        info.ids.forEach((id) => {
            const material = Services.resources.get_material_info(_selected_materials[id]);
            if (material === undefined) return;

            const instance = material.instances[material.origin];
            if (instance?.uniforms !== undefined) {
                const uniform = instance.uniforms[info.data.property.title] as { value: unknown };
                if (uniform !== undefined) {
                    uniform.value = Services.resources.get_texture(texture_name, atlas ?? '').texture;
                }
                instance.needsUpdate = true;
            }
            Services.event_bus.emit('materials:changed', {
                material_name: material.name,
                property: info.data.property.title,
                value: info.data.event.value
            });
        });
    }

    function updateUniformFloat(info: ChangeInfo) {
        info.ids.forEach((id) => {
            const material = Services.resources.get_material_info(_selected_materials[id]);
            if (material === undefined) return;
            const instance = material.instances[material.origin];
            if (instance?.uniforms !== undefined) {
                const uniform = instance.uniforms[info.data.property.title] as { value: unknown };
                if (uniform !== undefined) {
                    uniform.value = info.data.event.value as number;
                }
                instance.needsUpdate = true;
            }
            Services.event_bus.emit('materials:changed', {
                material_name: material.name,
                property: info.data.property.title,
                value: info.data.event.value
            });
        });
    }

    function updateUniformRange(info: ChangeInfo) {
        info.ids.forEach((id) => {
            const material = Services.resources.get_material_info(_selected_materials[id]);
            if (material === undefined) return;
            const instance = material.instances[material.origin];
            if (instance?.uniforms !== undefined) {
                const uniform = instance.uniforms[info.data.property.title] as { value: unknown };
                if (uniform !== undefined) {
                    uniform.value = info.data.event.value as number;
                }
                instance.needsUpdate = true;
            }
            Services.event_bus.emit('materials:changed', {
                material_name: material.name,
                property: info.data.property.title,
                value: info.data.event.value
            });
        });
    }

    function updateUniformVec2(info: ChangeInfo) {
        info.ids.forEach((id) => {
            const material = Services.resources.get_material_info(_selected_materials[id]);
            if (material === undefined) return;
            const instance = material.instances[material.origin];
            if (instance?.uniforms !== undefined) {
                const uniform = instance.uniforms[info.data.property.title] as { value: unknown };
                if (uniform !== undefined) {
                    uniform.value = info.data.event.value as Vector2;
                }
                instance.needsUpdate = true;
            }
            Services.event_bus.emit('materials:changed', {
                material_name: material.name,
                property: info.data.property.title,
                value: info.data.event.value
            });
        });
    }

    function updateUniformVec3(info: ChangeInfo) {
        info.ids.forEach((id) => {
            const material = Services.resources.get_material_info(_selected_materials[id]);
            if (material === undefined) return;
            const instance = material.instances[material.origin];
            if (instance?.uniforms !== undefined) {
                const uniform = instance.uniforms[info.data.property.title] as { value: unknown };
                if (uniform !== undefined) {
                    uniform.value = info.data.event.value as Vector3;
                }
                instance.needsUpdate = true;
            }
            Services.event_bus.emit('materials:changed', {
                material_name: material.name,
                property: info.data.property.title,
                value: info.data.event.value
            });
        });
    }

    function updateUniformVec4(info: ChangeInfo) {
        info.ids.forEach((id) => {
            const material = Services.resources.get_material_info(_selected_materials[id]);
            if (material === undefined) return;
            const instance = material.instances[material.origin];
            if (instance?.uniforms !== undefined) {
                const uniform = instance.uniforms[info.data.property.title] as { value: unknown };
                if (uniform !== undefined) {
                    uniform.value = info.data.event.value as Vector4;
                }
                instance.needsUpdate = true;
            }
            Services.event_bus.emit('materials:changed', {
                material_name: material.name,
                property: info.data.property.title,
                value: info.data.event.value
            });
        });
    }

    function updateUniformColor(info: ChangeInfo) {
        info.ids.forEach((id) => {
            const material = Services.resources.get_material_info(_selected_materials[id]);
            if (material === undefined) return;
            const color = new Color(info.data.event.value as string);
            const instance = material.instances[material.origin];
            if (instance?.uniforms !== undefined) {
                const uniform = instance.uniforms[info.data.property.title] as { value: unknown };
                if (uniform !== undefined) {
                    uniform.value = new Vector3(color.r, color.g, color.b);
                }
                instance.needsUpdate = true;
            }
            Services.event_bus.emit('materials:changed', {
                material_name: material.name,
                property: info.data.property.title,
                value: info.data.event.value
            });
        });
    }

    function updateFlipVertical(info: ChangeInfo) {
        saveUV(info.ids);
        _selected_list.forEach((item) => {
            if (item.type === IObjectTypes.GO_SPRITE_COMPONENT) {
                const sprite = item as GoSprite;
                sprite.set_flip(FlipMode.NONE);
                if(info.data.event.value) { 
                    sprite.set_flip(FlipMode.VERTICAL);
                }
            }
        });

        refresh([Property.FLIP_DIAGONAL, Property.FLIP_HORIZONTAL]);
    }

    function updateFlipHorizontal(info: ChangeInfo) {
        saveUV(info.ids);
        _selected_list.forEach((item) => {
            if (item.type === IObjectTypes.GO_SPRITE_COMPONENT) {
                const sprite = item as GoSprite;
                sprite.set_flip(FlipMode.NONE);
                if(info.data.event.value) { 
                    sprite.set_flip(FlipMode.HORIZONTAL);
                }
            }
        });

        refresh([Property.FLIP_DIAGONAL, Property.FLIP_VERTICAL]);
    }

    function updateFlipDiagonal(info: ChangeInfo) {
        saveUV(info.ids);
        _selected_list.forEach((item) => {
            if (item.type === IObjectTypes.GO_SPRITE_COMPONENT) {
                const sprite = item as GoSprite;
                sprite.set_flip(FlipMode.NONE);
                if(info.data.event.value) { 
                    sprite.set_flip(FlipMode.DIAGONAL);
                }
            }
        });

        refresh([Property.FLIP_VERTICAL, Property.FLIP_HORIZONTAL]);
    }

    init();
    return { setupConfig, setData, set_selected_textures, set_selected_materials, set_selected_list, refresh, clear }
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

function convertBlendModeToThreeJS(blend_mode: BlendMode): number {
    switch (blend_mode) {
        case BlendMode.NORMAL:
            return NormalBlending;
        case BlendMode.ADD:
            return AdditiveBlending;
        case BlendMode.MULTIPLY:
            return MultiplyBlending;
        case BlendMode.SUBTRACT:
            return SubtractiveBlending;
        // case BlendMode.CUSTOM:
        //     return CustomBlending;
        default:
            return NormalBlending;
    }
}

function convertThreeJSBlendingToBlendMode(blending: number): BlendMode {
    switch (blending) {
        case NormalBlending:
            return BlendMode.NORMAL;
        case AdditiveBlending:
            return BlendMode.ADD;
        case MultiplyBlending:
            return BlendMode.MULTIPLY;
        case SubtractiveBlending:
            return BlendMode.SUBTRACT;
        default:
            return BlendMode.NORMAL;
    }
}

function generateTextureOptions() {
    return Services.resources.get_all_textures().map(castTextureInfo);
}

function castTextureInfo(info: TextureInfo) {
    const data = {
        value: info.name,
        src: (info.data.texture as any).path ?? ''
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

function generateMaterialOptions() {
    const materialOptions: { [key: string]: string } = {};
    Services.resources.get_all_materials().forEach(material => {
        materialOptions[material] = material;
    });
    return materialOptions;
}

function generateAtlasOptions() {
    const data: {[key in string]: string} = {};
    Services.resources.get_all_atlases().forEach((atlas) => {
        return data[atlas == '' ? 'Без атласа' : atlas] = atlas;
    });
    return data;
}

function generateFontOptions() {
    const data: {[key in string]: string} = {};
    Services.resources.get_all_fonts().forEach((font) => {
        data[font] = font;
    });
    return data;
}

export function getDefaultInspectorConfig() {

    return [
        {
            name: 'base',
            title: '',
            property_list: [
                { name: Property.TYPE, title: 'Тип', type: PropertyType.STRING, readonly: true },
                { name: Property.NAME, title: 'Название', type: PropertyType.STRING },
                // { name: Property.VISIBLE, title: 'Видимый', type: PropertyType.BOOLEAN },
                { name: Property.ACTIVE, title: 'Активный', type: PropertyType.BOOLEAN },
                {
                    name: Property.ASSET_ATLAS, title: 'Атлас', type: PropertyType.LIST_TEXT, params: generateAtlasOptions()
                },
                { name: Property.ATLAS_BUTTON, title: 'Атлас менеджер', type: PropertyType.BUTTON },
                {
                    name: Property.MIN_FILTER, title: 'Фильтр уменьшения', type: PropertyType.LIST_TEXT, params: {
                        'nearest': FilterMode.NEAREST,
                        'linear': FilterMode.LINEAR
                    }
                },
                {
                    name: Property.MAG_FILTER, title: 'Фильтр увеличения', type: PropertyType.LIST_TEXT, params: {
                        'nearest': FilterMode.NEAREST,
                        'linear': FilterMode.LINEAR
                    }
                },
                {
                    name: Property.VERTEX_PROGRAM, 
                    title: 'Vertex Program', 
                    type: PropertyType.LIST_TEXT, 
                    params: {}
                },
                {
                    name: Property.FRAGMENT_PROGRAM, 
                    title: 'Fragment Program', 
                    type: PropertyType.LIST_TEXT, 
                    params: {}
                },
                {
                    name: Property.TRANSPARENT, 
                    title: 'Transparent', 
                    type: PropertyType.BOOLEAN
                }
            ]
        },
        {
            name: 'transform',
            title: 'Трансформ',
            property_list: [
                {
                    name: Property.POSITION, title: 'Позиция', type: PropertyType.VECTOR_3, params: {
                        x: { format: (v: number) => v.toFixed(2), step: 0.1 },
                        y: { format: (v: number) => v.toFixed(2), step: 0.1 },
                        z: { format: (v: number) => v.toFixed(2), step: 0.1 },
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
                },
                {
                    name: Property.SIZE, title: 'Размер', type: PropertyType.VECTOR_2, params: {
                        x: { min: 0, max: 0xFFFFFFFF, step: 1, format: (v: number) => v.toFixed(2) },
                        y: { min: 0, max: 0xFFFFFFFF, step: 1, format: (v: number) => v.toFixed(2) },
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
            title: 'Визуал',
            property_list: [
                { name: Property.COLOR, title: 'Цвет', type: PropertyType.COLOR },
                { name: Property.ALPHA, title: 'Прозрачность', type: PropertyType.NUMBER, params: { min: 0, max: 1, step: 0.1 } },
                { name: Property.ATLAS, title: 'Атлас', type: PropertyType.LIST_TEXT, params: generateAtlasOptions() },
                {
                    name: Property.TEXTURE, title: 'Текстура', type: PropertyType.LIST_TEXTURES, params: generateTextureOptions()
                },
                {
                    name: Property.MATERIAL, title: 'Материал', type: PropertyType.LIST_TEXT, params: generateMaterialOptions()
                },
                {
                    name: Property.SLICE9, title: 'Slice9', type: PropertyType.POINT_2D, params: {
                        x: { min: 0, max: 100, format: (v: number) => v.toFixed(2) },
                        y: { min: 0, max: 100, format: (v: number) => v.toFixed(2) }
                    }
                },
                {
                    name: Property.BLEND_MODE, title: 'Режим смешивания', type: PropertyType.LIST_TEXT, params: {
                        'Нормальный': BlendMode.NORMAL,
                        'Сложение': BlendMode.ADD,
                        'Умножение': BlendMode.MULTIPLY,
                        'Вычитание': BlendMode.SUBTRACT,
                        // 'Пользовательский': BlendMode.CUSTOM
                    }
                },
            ]
        },
        {
            name: 'flip',
            title: 'Отражение',
            property_list: [
                { name: Property.FLIP_VERTICAL, title: 'По вертикали', type: PropertyType.BOOLEAN },
                { name: Property.FLIP_HORIZONTAL, title: 'По горизонтали', type: PropertyType.BOOLEAN },
                { name: Property.FLIP_DIAGONAL, title: 'По диагонали', type: PropertyType.BOOLEAN }
            ]
        },
        {
            name: 'text',
            title: 'Текст',
            property_list: [
                { name: Property.TEXT, title: 'Текст', type: PropertyType.LOG_DATA },
                {
                    name: Property.FONT, title: 'Шрифт', type: PropertyType.LIST_TEXT, params: generateFontOptions()
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
                {
                    name: Property.LINE_HEIGHT, title: 'Высота строки', type: PropertyType.NUMBER, params: {
                        min: 0.5, max: 3, step: 0.1, format: (v: number) => v.toFixed(2)
                    }
                }
            ]
        },
        {
            name: 'uniforms',
            title: 'Uniforms',
            property_list: [
                {
                    name: Property.UNIFORM_SAMPLER2D,
                    title: 'Sampler2D',
                    type: PropertyType.LIST_TEXTURES,
                    params: generateTextureOptions()
                },
                {
                    name: Property.UNIFORM_FLOAT,
                    title: 'Float',
                    type: PropertyType.NUMBER,
                    params: {
                        min: 0,
                        max: 1,
                        step: 0.1,
                        format: (v: number) => v.toFixed(2)
                    }
                },
                {
                    name: Property.UNIFORM_RANGE,
                    title: 'Range',
                    type: PropertyType.SLIDER,
                    params: {
                        min: 0,
                        max: 100,
                        step: 0.1
                    }
                },
                {
                    name: Property.UNIFORM_VEC2,
                    title: 'Vec2',
                    type: PropertyType.VECTOR_2,
                    params: {
                        x: { min: -1000, max: 1000, step: 0.1, format: (v: number) => v.toFixed(2) },
                        y: { min: -1000, max: 1000, step: 0.1, format: (v: number) => v.toFixed(2) }
                    }
                },
                {
                    name: Property.UNIFORM_VEC3,
                    title: 'Vec3',
                    type: PropertyType.VECTOR_3,
                    params: {
                        x: { min: -1000, max: 1000, step: 0.1, format: (v: number) => v.toFixed(2) },
                        y: { min: -1000, max: 1000, step: 0.1, format: (v: number) => v.toFixed(2) },
                        z: { min: -1000, max: 1000, step: 0.1, format: (v: number) => v.toFixed(2) }
                    }
                },
                {
                    name: Property.UNIFORM_VEC4,
                    title: 'Vec4',
                    type: PropertyType.VECTOR_4,
                    params: {
                        x: { min: -1000, max: 1000, step: 0.1, format: (v: number) => v.toFixed(2) },
                        y: { min: -1000, max: 1000, step: 0.1, format: (v: number) => v.toFixed(2) },
                        z: { min: -1000, max: 1000, step: 0.1, format: (v: number) => v.toFixed(2) },
                        w: { min: -1000, max: 1000, step: 0.1, format: (v: number) => v.toFixed(2) }
                    }
                },
                {
                    name: Property.UNIFORM_COLOR,
                    title: 'Color',
                    type: PropertyType.COLOR
                }
            ]
        }
    ];
}