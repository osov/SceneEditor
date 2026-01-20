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
 
TODO: [низкий приоритет] определять поля из списка выделенных обьектов за пределами инспектора
    + Меньше связанность, инспектор не будет знать о внешних типах и будет получать только список обьектов ObjectData
    + Извлечь логику set_selected_list/set_selected_textures/set_selected_materials в отдельный FieldDefinitionProvider
    + [ЧАСТИЧНО РЕШЕНО Phase 22] Создан FieldDefinitionProvider для динамических параметров полей
    + [ЧАСТИЧНО РЕШЕНО Phase 14-20] handler-based архитектура

TODO: [низкий приоритет] вынести обновление конкретных полей в отдельный callback
    + Функции update_*_options вызываются для обновления опций списков
    + [ЧАСТИЧНО РЕШЕНО Phase 18] InspectorOptionsUpdater
    + [РЕШЕНО Phase 22-23] FieldDefinitionProvider + SelectionOptionsUpdater

TODO: [низкий приоритет] упростить типизацию записи в историю через дженерики
    + onChange принимает разные типы данных, можно унифицировать через generics
    + Частично реализовано через handler-based архитектуру (Phase 14)

*/


import { Pane } from 'tweakpane';
import { FolderApi } from '@tweakpane/core';
import { IBaseMesh, IBaseMeshAndThree, IObjectTypes } from '../render_engine/types';
import * as TweakpaneImagePlugin from 'tweakpane4-image-list-plugin';
import * as TweakpaneSearchListPlugin from 'tweakpane4-search-list-plugin';
import * as TweakpaneItemListPlugin from 'tweakpane4-item-list-plugin';
import * as TextareaPlugin from '@pangenerator/tweakpane-textarea-plugin';
import * as ExtendedPointNdInputPlugin from 'tweakpane4-extended-vector-plugin';
import * as TweakpaneExtendedBooleanPlugin from 'tweakpane4-extended-boolean-plugin';
import { Vector2, Vector3, NearestFilter, LinearFilter, MinificationTextureFilter, MagnificationTextureFilter, Vector4, Color, ShaderMaterial } from 'three';
import { TextMesh } from '../render_engine/objects/text';
import { Slice9Mesh } from '../render_engine/objects/slice9';
import { deepClone, degToRad, rgbToHex } from '../modules/utils';
import { radToDeg } from 'three/src/math/MathUtils';
import { ActiveEventData, AlphaEventData, AnchorEventData, ColorEventData, FontEventData, FontSizeEventData, NameEventData, PivotEventData, PositionEventData, RotationEventData, ScaleEventData, SizeEventData, SliceEventData, TextAlignEventData, TextEventData, TextureEventData, VisibleEventData, LineHeightEventData, BlendModeEventData, MinFilterEventData, MagFilterEventData, UVEventData, MaterialEventData, MeshAtlasEventData, TextureAtlasEventData, MeshModelNameEventData, ModelMaterialsEventData } from './InspectorTypes';
import { MaterialUniformParams, MaterialUniformType } from '../render_engine/resource_manager';
import { get_basename, get_file_name } from "../render_engine/helpers/utils";
import { GoSprite, FlipMode } from '../render_engine/objects/sub_types';
import { AudioMesh } from '../render_engine/objects/audio_mesh';
import { MultipleMaterialMesh } from '../render_engine/objects/multiple_material_mesh';
import { AnimatedMesh } from '../render_engine/objects/animated_mesh';
import { HistoryOwner } from './modules_editor_const';
import { Services } from '@editor/core';
import { get_control_manager } from './ControlManager';
import {
    is_inspectable,
    type InspectorFieldDefinition,
    Property,
    get_field_definitions,
} from '../core/inspector';
import { get_material_uniform_fields } from '../core/inspector/MaterialFieldProvider';
import {
    create_handler_registry,
    create_texture_asset_handler_registry,
    create_material_asset_handler_registry,
    create_uniform_handler,
    type IHandlerRegistry,
    type ITextureAssetHandlerRegistry,
    type IMaterialAssetHandlerRegistry,
    type UpdateContext,
    type TextureUpdateContext,
    type MaterialAssetUpdateContext,
    type ChangeAxisInfo,
} from '../editor/inspector/handlers';
import {
    get_options_providers,
    type IOptionsProviders,
} from '../editor/inspector/options';
import {
    create_folder,
    create_button,
    render_entities,
    is_folder,
    type Entities,
    type Entity,
    type Folder,
    type ChangeEvent,
} from '../editor/inspector/ui';
import {
    InspectorOptionsUpdaterCreate,
    type IInspectorOptionsUpdater,
    create_selection_options_updater,
    type ISelectionOptionsUpdater,
    // Preset converters (Phase 18)
    ScreenPointPreset,
    pivot_to_screen_preset,
    screen_preset_to_pivot_value,
    anchor_to_screen_preset,
    screen_preset_to_anchor_value,
    // Blend converters (Phase 18)
    BlendMode,
    convert_blend_mode_to_threejs,
    convert_threejs_blending_to_blend_mode,
    // TweakPane utils (Phase 18)
    get_changed_info,
    get_dragged_info,
    // Inspector config (Phase 18)
    create_default_inspector_config,
    // Axis disabled utils (Phase 18)
    try_disabled_value_by_axis,
    // Audio update utils (Phase 18)
    update_audio_sound_function,
    update_audio_zone_type,
} from './inspector_module';

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

// Property enum реэкспортирован из IInspectable для обратной совместимости
export { Property } from '../core/inspector/IInspectable';

// ScreenPointPreset и BlendMode реэкспортированы из inspector_module (Phase 18)
export { ScreenPointPreset, BlendMode } from './inspector_module';

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
    ITEM_LIST,
    BUTTON,
    POINT_2D,
    LOG_DATA,
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
    [PropertyType.ITEM_LIST]: { pickText?: string, emptyText?: string, options: string[], onOptionClick?: (option: string) => boolean };
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
    [PropertyType.ITEM_LIST]: string[];
    [PropertyType.BUTTON]: (...args: unknown[]) => void;
    [PropertyType.POINT_2D]: { x: number, y: number };
    [PropertyType.LOG_DATA]: string;
}


/**
 * Определение свойства в группе инспектора
 */
export interface PropertyItem<T extends PropertyType> {
    name: Property | string;
    title: string;
    type: T;
    params?: PropertyParams[T];
    readonly?: boolean;
}

/**
 * Группа свойств инспектора
 */
export interface InspectorGroup {
    name: string;
    title: string;
    property_list: PropertyItem<PropertyType>[];
}

export interface PropertyData<T extends PropertyType> {
    name: string;
    data: PropertyValues[T]; // values
    type?: T; // тип поля из InspectorFieldDefinition
    params?: PropertyParams[T]; // параметры из InspectorFieldDefinition
    /** Дополнительные данные для handler (например slot_index для uniform) */
    action_data?: unknown;
    /** Кастомная папка для группировки (вместо группы из _config) */
    folder?: string;
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

// Типы UI элементов импортируются из '../editor/inspector/ui'
// (Folder, Button, Entity, Entities, ChangeEvent)

interface ObjectInfo {
    field: PropertyData<PropertyType>;
    property: PropertyItem<PropertyType>;
}


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

    /** Реестр обработчиков свойств (Phase 14) */
    let _handler_registry: IHandlerRegistry;

    /** Реестр обработчиков текстурных ассетов (Phase 19) */
    let _texture_asset_handler_registry: ITextureAssetHandlerRegistry;

    /** Реестр обработчиков материальных ассетов (Phase 19) */
    let _material_asset_handler_registry: IMaterialAssetHandlerRegistry;

    /** Провайдер опций для списков (Phase 15) */
    let _options_providers: IOptionsProviders;

    /** Updater для опций списков (извлечено в Phase 18) */
    let _options_updater: IInspectorOptionsUpdater;

    /** Updater для обновления опций при изменении выделения (Phase 23) */
    let _selection_options_updater: ISelectionOptionsUpdater<IBaseMeshAndThree>;

    function init() {
        _inspector = new Pane({
            container: document.querySelector('.inspector__body') as HTMLElement,
        });

        // Инициализация реестра handlers (Phase 14)
        _handler_registry = create_handler_registry({
            on_transform_changed: () => {
                Services.transform.set_proxy_in_average_point(_selected_list);
            },
            on_size_changed: () => {
                Services.size.draw();
            },
            on_update_ui: () => {
                Services.ui.update_hierarchy();
            },
            on_refresh_inspector: () => {
                // Полное обновление инспектора при смене материала
                set_selected_list(_selected_list);
            },
        });

        // Регистрация UniformHandler с доступом к _selected_materials (Phase 20)
        const uniform_handler = create_uniform_handler({
            get_selected_materials: () => _selected_materials,
        });
        _handler_registry.register(uniform_handler);

        // Инициализация реестра texture asset handlers (Phase 19)
        _texture_asset_handler_registry = create_texture_asset_handler_registry();

        // Инициализация реестра material asset handlers (Phase 19)
        _material_asset_handler_registry = create_material_asset_handler_registry();

        // Инициализация провайдера опций (Phase 15)
        _options_providers = get_options_providers();

        registerPlugins();
        setupConfig(getDefaultInspectorConfig());

        // Инициализация updater для опций (Phase 18)
        _options_updater = InspectorOptionsUpdaterCreate(
            () => _config,
            _options_providers
        );

        // Инициализация updater для выделения (Phase 23)
        _selection_options_updater = create_selection_options_updater<IBaseMeshAndThree>(
            _options_updater,
            _options_providers
        );

        subscribeEvents();
    }

    function registerPlugins() {
        _inspector.registerPlugin(TweakpaneImagePlugin);
        _inspector.registerPlugin(TweakpaneSearchListPlugin);
        _inspector.registerPlugin(TweakpaneItemListPlugin);
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

        // Обновление инспектора при undo/redo
        Services.event_bus.on('history:undo', () => {
            if (_selected_list.length > 0) {
                // Перестраиваем инспектор с актуальными данными объектов
                set_selected_list(_selected_list);
            }
        });

        Services.event_bus.on('history:redo', () => {
            if (_selected_list.length > 0) {
                // Перестраиваем инспектор с актуальными данными объектов
                set_selected_list(_selected_list);
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

                // NOTE: применяем params из field если они определены (из IInspectable)
                if (field.params !== undefined) {
                    property.params = field.params;
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
        render_entities(entities, _inspector);

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

        // NOTE: обновляем конфиг текстур и программ
        update_texture_options([Property.TEXTURE]);
        // Для UNIFORM_SAMPLER2D используем формат atlas/texture
        update_texture_options([Property.UNIFORM_SAMPLER2D], () => _options_providers.get_uniform_texture_options());
        update_vertex_program_options();
        update_fragment_program_options();

        const data = _selected_materials.map((path, id) => {
            const result = {id, data: [] as PropertyData<PropertyType>[]}; 

            const material_name = get_file_name(get_basename(path));
            const material = Services.resources.get_material_info(material_name);
            if (material === undefined) return result;

            result.data.push({ name: Property.VERTEX_PROGRAM, data: material.vertexShader });
            result.data.push({ name: Property.FRAGMENT_PROGRAM, data: material.fragmentShader });

            // Получаем transparent из оригинального материала
            const origin_material = material.instances[material.origin];
            const transparent_value = origin_material?.transparent ?? false;
            result.data.push({ name: Property.TRANSPARENT, data: transparent_value });

            type UniformEntry = { type: MaterialUniformType; params?: Record<string, unknown>; hide?: boolean };
            Object.entries(material.uniforms as Record<string, UniformEntry>).forEach(([key, value]) => {
                // Пропускаем скрытые uniforms (например, u_texture)
                if (value.hide === true) return;

                switch (value.type) {
                    case MaterialUniformType.SAMPLER2D:
                        _config.forEach((group) => {
                            const property = group.property_list.find((property) => property.name == Property.UNIFORM_SAMPLER2D);
                            if (!property) return;
                            property.title = key;
                        });
                        // Текстура хранится как Three.js Texture объект, а путь в свойстве .path
                        const textureValue = (material.instances[material.origin]?.uniforms as Record<string, { value: unknown }>)?.[key]?.value;
                        const texturePath = (textureValue as { path?: string } | null)?.path ?? '';
                        const textureName = get_file_name(texturePath);
                        const textureAtlas = Services.resources.get_atlas_by_texture_name(textureName) || '';
                        result.data.push({ name: Property.UNIFORM_SAMPLER2D, data: texturePath !== '' ? `${textureAtlas}/${textureName}` : '' });
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
                        const colorVec = (material.instances[material.origin]?.uniforms as Record<string, { value: unknown }>)?.[key]?.value as Vector3 | undefined;
                        const colorHex = colorVec !== undefined ? rgbToHex(colorVec) : '#ffffff';
                        result.data.push({ name: Property.UNIFORM_COLOR, data: colorHex });
                        break;
                }
            });

            return result;
        });

        clear();
        setData(data);
    }

    /**
     * Получить значение свойства из объекта
     * Конвертирует внутренние данные объекта в формат для инспектора
     */
    function get_property_value(obj: IBaseMeshAndThree, property: Property): unknown {
        switch (property) {
            case Property.TYPE:
                return obj.type;
            case Property.NAME:
                return obj.name;
            case Property.ACTIVE:
                return obj.get_active();
            case Property.VISIBLE:
                return obj.get_visible();
            case Property.POSITION:
                return obj.get_position();
            case Property.ROTATION: {
                const raw = obj.rotation;
                return new Vector3(radToDeg(raw.x), radToDeg(raw.y), radToDeg(raw.z));
            }
            case Property.SCALE:
                return obj.get_scale();
            case Property.SIZE:
                return obj.get_size();
            case Property.PIVOT:
                return pivot_to_screen_preset(obj.get_pivot());
            case Property.ANCHOR:
                return obj.get_anchor();
            case Property.ANCHOR_PRESET:
                return anchor_to_screen_preset(obj.get_anchor());
            case Property.COLOR:
                return obj.get_color();
            case Property.ALPHA:
                return (obj as Slice9Mesh).get_alpha();
            case Property.ATLAS: {
                const texture_info = (obj as Slice9Mesh).get_texture();
                return texture_info ? texture_info[1] : ''; // atlas
            }
            case Property.TEXTURE: {
                // MultipleMaterialMesh и Slice9Mesh имеют разные форматы get_texture
                if ('textures' in obj) {
                    // MultipleMaterialMesh - возвращает [name, atlas, uniform_key]
                    const texture_info = (obj as MultipleMaterialMesh).get_texture(0);
                    return texture_info ? texture_info[0] : '';
                }
                // Slice9Mesh - возвращает [name, atlas]
                const texture_info = (obj as Slice9Mesh).get_texture();
                return texture_info ? texture_info[0] : ''; // texture name
            }
            case Property.MATERIAL: {
                // MultipleMaterialMesh имеет массив материалов
                if ('get_materials' in obj && typeof (obj as MultipleMaterialMesh).get_materials === 'function') {
                    const materials = (obj as MultipleMaterialMesh).get_materials();
                    return materials.length > 0 ? (materials[0].name || '') : '';
                }
                return (obj as Slice9Mesh).material.name || '';
            }
            case Property.BLEND_MODE:
                return convert_threejs_blending_to_blend_mode((obj as Slice9Mesh).material.blending);
            case Property.SLICE9:
                return (obj as Slice9Mesh).get_slice();
            case Property.TEXT:
                return (obj as TextMesh).text;
            case Property.FONT:
                return (obj as TextMesh).get_font_name();
            case Property.FONT_SIZE: {
                const delta = new Vector3(1 * obj.scale.x, 1 * obj.scale.y);
                const max_delta = Math.max(delta.x, delta.y);
                return (obj as TextMesh).fontSize * max_delta;
            }
            case Property.TEXT_ALIGN:
                return (obj as TextMesh).textAlign;
            case Property.LINE_HEIGHT: {
                const line_height = (obj as TextMesh).lineHeight;
                return line_height === 'normal' ? 1 : line_height;
            }
            case Property.FLIP_VERTICAL:
                return (obj as GoSprite).get_flip() === FlipMode.VERTICAL;
            case Property.FLIP_HORIZONTAL:
                return (obj as GoSprite).get_flip() === FlipMode.HORIZONTAL;
            case Property.FLIP_DIAGONAL:
                return (obj as GoSprite).get_flip() === FlipMode.DIAGONAL;
            // Аудио свойства
            case Property.SOUND:
                return (obj as AudioMesh).get_sound();
            case Property.VOLUME:
                return (obj as AudioMesh).get_volume();
            case Property.LOOP:
                return (obj as AudioMesh).get_loop();
            case Property.PAN:
                return (obj as AudioMesh).get_pan();
            case Property.SPEED:
                return (obj as AudioMesh).get_speed();
            case Property.SOUND_RADIUS:
                return (obj as AudioMesh).get_sound_radius();
            case Property.MAX_VOLUME_RADIUS:
                return (obj as AudioMesh).get_max_volume_radius();
            case Property.SOUND_FUNCTION:
                return (obj as AudioMesh).get_sound_function();
            case Property.ZONE_TYPE:
                return (obj as AudioMesh).get_zone_type();
            case Property.PAN_NORMALIZATION:
                return (obj as AudioMesh).get_pan_normalization_distance();
            case Property.RECTANGLE_WIDTH:
                return (obj as AudioMesh).get_rectangle_width();
            case Property.RECTANGLE_HEIGHT:
                return (obj as AudioMesh).get_rectangle_height();
            case Property.RECTANGLE_MAX_WIDTH:
                return (obj as AudioMesh).get_rectangle_max_volume_width();
            case Property.RECTANGLE_MAX_HEIGHT:
                return (obj as AudioMesh).get_rectangle_max_volume_height();
            case Property.FADE_IN_TIME:
                return (obj as AudioMesh).get_fade_in_time();
            case Property.FADE_OUT_TIME:
                return (obj as AudioMesh).get_fade_out_time();
            case Property.AUDIO_PLAY_PAUSE:
                // Кнопка воспроизведения/паузы - возвращаем callback
                return () => {
                    const audio = obj as AudioMesh;
                    if (audio.is_playing()) {
                        // Если играет - ставим на паузу
                        audio.pause();
                    } else if (audio.is_paused()) {
                        // Если на паузе - возобновляем
                        audio.resume();
                    } else {
                        // Если остановлен - начинаем проигрывание
                        audio.play();
                    }
                };
            case Property.AUDIO_STOP:
                // Кнопка стоп - возвращаем callback
                return () => {
                    (obj as AudioMesh).stop();
                };
            // 3D модели
            case Property.MESH_NAME:
                return (obj as MultipleMaterialMesh).get_mesh_name();
            case Property.MODEL_SCALE:
                return (obj as MultipleMaterialMesh).get_scale().x;
            case Property.MODEL_MATERIALS:
                return (obj as MultipleMaterialMesh).get_materials().map(m => m.name);
            case Property.ANIMATIONS:
                return Object.keys((obj as AnimatedMesh).get_animation_list());
            case Property.CURRENT_ANIMATION:
                return (obj as AnimatedMesh).get_animation();
            default:
                Services.logger.warn(`[get_property_value] Неизвестное свойство: ${property}`);
                return undefined;
        }
    }

    /**
     * Преобразовать InspectorFieldDefinition в PropertyData для инспектора
     */
    function field_definition_to_property_data(
        def: InspectorFieldDefinition,
        obj: IBaseMeshAndThree
    ): PropertyData<PropertyType> {
        const value = get_property_value(obj, def.property);
        return {
            name: def.property,
            data: value as PropertyValues[PropertyType],
            type: def.type,
            params: def.params as PropertyParams[PropertyType]
        };
    }

    /**
     * Построить данные инспектора используя IInspectable
     */
    function build_inspector_data_from_inspectable(obj: IBaseMeshAndThree): PropertyData<PropertyType>[] {
        if (!is_inspectable(obj)) {
            Services.logger.warn(`[build_inspector_data] Объект ${obj.type} не реализует IInspectable`);
            return [];
        }

        // Получаем определения полей с заполненными динамическими параметрами
        const field_defs = get_field_definitions(
            obj,
            (property) => get_property_value(obj, property),
            _options_providers,
            {
                // Callback для анимаций - специфично для AnimatedMesh
                get_animation_list: 'get_animation_list' in obj
                    ? () => Object.keys((obj as AnimatedMesh).get_animation_list())
                    : undefined
            }
        );

        // Обновляем опции UI (TweakPane) для синхронизации с конфигом (Phase 23)
        _selection_options_updater.update_options_from_field_defs(field_defs, obj, get_property_value);

        // Преобразуем определения полей в данные
        const fields: PropertyData<PropertyType>[] = [];
        for (const def of field_defs) {
            const property_data = field_definition_to_property_data(def, obj);
            fields.push(property_data);
        }

        return fields;
    }

    function set_selected_list(list: IBaseMeshAndThree[]) {
        _selected_list = list;

        // NOTE: Обновляем опции текстур для UNIFORM_SAMPLER2D перед построением UI
        // Это необходимо для отображения текстур из атласов mesh_* (добавленных при set_mesh)
        update_texture_options([Property.UNIFORM_SAMPLER2D], () => _options_providers.get_uniform_texture_options());

        // Используем IInspectable для получения полей
        const data = list.map((value) => {
            // Получаем базовые поля через IInspectable
            const fields = build_inspector_data_from_inspectable(value);

            // NOTE: uniforms кастомного материала через MaterialFieldProvider
            // Поддержка MultipleMaterialMesh (get_materials) и обычных мешей (material)
            if ('get_materials' in value && typeof (value as MultipleMaterialMesh).get_materials === 'function') {
                // MultipleMaterialMesh - создаём папку для каждого слота материала
                const materials = (value as MultipleMaterialMesh).get_materials();

                for (let slot_index = 0; slot_index < materials.length; slot_index++) {
                    const material = materials[slot_index];
                    const material_name = material.name || '';
                    const material_uniforms = material.uniforms as Record<string, { value: unknown }> | null;

                    const folder_name = `Слот ${slot_index}`;

                    // Добавляем поле выбора материала для слота
                    fields.push({
                        name: Property.SLOT_MATERIAL,
                        data: material_name,
                        action_data: { slot_index },
                        folder: folder_name
                    });

                    if (material_uniforms !== null && material_name !== '') {
                        const uniform_fields = get_material_uniform_fields(material_name, material_uniforms);

                        for (const uniform_field of uniform_fields) {
                            // Обновляем конфиг для полей (заголовки и параметры)
                            _config.forEach((group) => {
                                const property = group.property_list.find((p) => p.name === uniform_field.name);
                                if (property === undefined) return;
                                property.title = uniform_field.title;
                                if (uniform_field.params !== undefined) {
                                    property.params = uniform_field.params;
                                }
                            });

                            // Добавляем поле с action_data и folder
                            fields.push({
                                name: uniform_field.name,
                                data: uniform_field.data as PropertyValues[PropertyType],
                                action_data: { uniform_name: uniform_field.title, slot_index },
                                folder: folder_name
                            });
                        }
                    }
                }
            } else if ('material' in value && value.material !== undefined) {
                // Обычный меш с одним материалом (Slice9Mesh и др.)
                const material = (value as Slice9Mesh).material;
                const material_name = material.name || '';
                const material_uniforms = material.uniforms as Record<string, { value: unknown }> | null;

                if (material_uniforms !== null && material_name !== '') {
                    const uniform_fields = get_material_uniform_fields(material_name, material_uniforms);

                    for (const uniform_field of uniform_fields) {
                        _config.forEach((group) => {
                            const property = group.property_list.find((p) => p.name === uniform_field.name);
                            if (property === undefined) return;
                            property.title = uniform_field.title;
                            if (uniform_field.params !== undefined) {
                                property.params = uniform_field.params;
                            }
                        });

                        // Для обычных мешей action_data = uniform_name (обратная совместимость)
                        fields.push({
                            name: uniform_field.name,
                            data: uniform_field.data as PropertyValues[PropertyType],
                            action_data: uniform_field.title
                        });
                    }
                }
            }

            return { id: value.mesh_data.id, data: fields };
        });

        clear();
        setData(data);
    }

    // === Функции обновления опций (делегируют в _options_updater, Phase 18) ===
    // NOTE: Большинство функций перенесены в SelectionOptionsUpdater (Phase 23)
    // Оставлены только те, что используются напрямую в других местах

    function update_atlas_options() {
        _options_updater.update_atlas_options();
    }

    function update_texture_options(properties: Property[], method = () => _options_providers.get_texture_options()) {
        _options_updater.update_texture_options(properties, method);
    }

    function update_vertex_program_options() {
        _options_updater.update_vertex_program_options();
    }

    function update_fragment_program_options() {
        _options_updater.update_fragment_program_options();
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
                    case Property.PIVOT: value.data = pivot_to_screen_preset(item.get_pivot()); break;
                    case Property.ANCHOR: value.data = item.get_anchor(); break;
                    case Property.ANCHOR_PRESET: value.data = anchor_to_screen_preset(item.get_anchor()); break;
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

    /** Типы векторных свойств */
    const VECTOR_TYPES = [PropertyType.VECTOR_2, PropertyType.POINT_2D, PropertyType.VECTOR_3, PropertyType.VECTOR_4];

    /** Типы свойств с пустым значением по умолчанию при различии */
    const EMPTY_DEFAULT_TYPES = [PropertyType.LIST_TEXT, PropertyType.LIST_TEXTURES, PropertyType.LOG_DATA];

    /**
     * Обрабатывает ось вектора: если значения различаются - отключает ось и усредняет значение
     */
    function process_vector_axis(
        axis: 'x' | 'y' | 'z' | 'w',
        field_data: { x: number; y: number; z?: number; w?: number },
        unique_field: { field: PropertyData<PropertyType>; property: PropertyItem<PropertyType> }
    ) {
        const unique_data = unique_field.field.data as { x: number; y: number; z?: number; w?: number };
        const field_value = field_data[axis];
        const unique_value = unique_data[axis];

        if (field_value === undefined || unique_value === undefined) return;
        if (field_value === unique_value) return;

        // Отключаем ось в параметрах
        const params = unique_field.property.params as Record<string, { disabled?: boolean }> | undefined;
        if (params !== undefined) {
            if (params[axis] !== undefined) {
                params[axis].disabled = true;
            } else {
                params[axis] = { disabled: true };
            }
        } else {
            unique_field.property.params = { [axis]: { disabled: true } } as PropertyParams[PropertyType];
        }

        // Усредняем значение
        (unique_data as Record<string, number>)[axis] = (unique_value + field_value) / 2;
    }

    /**
     * Объединяет векторные данные между объектами
     */
    function merge_vector_fields(
        property_type: PropertyType,
        field_data: { x: number; y: number; z?: number; w?: number },
        unique_field: { field: PropertyData<PropertyType>; property: PropertyItem<PropertyType> }
    ) {
        // Все векторные типы имеют x и y
        process_vector_axis('x', field_data, unique_field);
        process_vector_axis('y', field_data, unique_field);

        // vec3 и vec4 имеют z
        if (property_type === PropertyType.VECTOR_3 || property_type === PropertyType.VECTOR_4) {
            process_vector_axis('z', field_data, unique_field);
        }

        // vec4 имеет w
        if (property_type === PropertyType.VECTOR_4) {
            process_vector_axis('w', field_data, unique_field);
        }
    }

    /**
     * Пытается добавить поле в список уникальных полей или объединить с существующим
     */
    function tryAddToUniqueField(obj_index: number, obj: ObjectData, field: PropertyData<PropertyType>, property: PropertyItem<PropertyType>): boolean {
        const index = _unique_fields.findIndex((value) => value.property.name === property.name);

        // Если поле не найдено - добавляем только для первого объекта
        if (index === -1) {
            if (obj_index !== 0) {
                return false;
            }
            _unique_fields.push({ ids: [obj.id], field, property });
            return true;
        }

        // Добавляем id объекта к существующему полю
        _unique_fields[index].ids.push(obj.id);

        // Обработка векторных типов
        if (VECTOR_TYPES.includes(property.type)) {
            const field_data = field.data as { x: number; y: number; z?: number; w?: number };
            merge_vector_fields(property.type, field_data, _unique_fields[index]);
            return true;
        }

        // Обработка невекторных типов с различающимися значениями
        if (field.data !== _unique_fields[index].field.data) {
            if (EMPTY_DEFAULT_TYPES.includes(property.type)) {
                // Списки и текстовые поля - пустое значение
                _unique_fields[index].field.data = "";
            } else if (property.type === PropertyType.COLOR) {
                // Цвет - черный
                _unique_fields[index].field.data = "#000000";
            } else if (property.type === PropertyType.BOOLEAN) {
                // Чекбокс - отключен
                _unique_fields[index].field.data = false;
                _unique_fields[index].property.params = { disabled: true };
            } else if (property.type === PropertyType.BUTTON) {
                // Кнопки всегда показываем
                return true;
            } else {
                // Остальные - удаляем поле
                _unique_fields.splice(index, 1);
                return false;
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
            case PropertyType.LIST_TEXTURES: {
                // Плагин thumbnail-list автоматически добавляет опцию "None" для пустого значения
                const texture_options = (property.params as Array<{ value: string; src: string; path: string }>) ?? [];
                return createEntity(ids, field, property, {
                    view: 'thumbnail-list',
                    options: texture_options
                });
            }
            case PropertyType.LIST_TEXT:
                // search-list ожидает объект {key: value}, НЕ массив
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
                return create_button(property.title, (field as PropertyData<PropertyType.BUTTON>).data, { title: property.title });
            case PropertyType.ITEM_LIST: {
                // ITEM_LIST отображает список элементов (например материалы) где каждый можно изменить
                const item_list_params = property.params as PropertyParams[PropertyType.ITEM_LIST];
                // Для MODEL_MATERIALS используем все доступные материалы как options
                const all_materials = Object.values(_options_providers.get_material_options());
                return createEntity(ids, field, property, {
                    view: 'item-list',
                    pickText: item_list_params?.pickText ?? 'Выбрать',
                    emptyText: item_list_params?.emptyText ?? 'Нет элементов',
                    options: all_materials,
                    onOptionClick: item_list_params?.onOptionClick
                });
            }
            default:
                Services.logger.error(`Unable to cast ${field.name}`);
                return undefined;
        }
    }

    // is_folder и is_button импортируются из '../editor/inspector/ui'

    function addToFolder<T extends PropertyType>(field: PropertyData<T>, entity: Entities, entities: Entities[]) {
        // Если задана кастомная папка, используем её
        if (field.folder !== undefined && field.folder !== '') {
            let folder = entities.find((value) => {
                return (is_folder(value)) && (value.title === field.folder);
            }) as Folder | undefined;
            if (folder === undefined) {
                folder = create_folder(field.folder, []);
                entities.push(folder);
            }
            folder.childrens.push(entity);
            return;
        }

        // Иначе используем группу из _config
        const group = getInspectorGroupByName(field.name);
        if (group !== undefined && group.title !== '') {
            let folder = entities.find((value) => {
                return (is_folder(value)) && (value.title === group.title);
            }) as Folder | undefined;
            if (folder === undefined) {
                folder = create_folder(group.title, []);
                entities.push(folder);
            }
            folder.childrens.push(entity);
        } else {
            entities.push(entity);
        }
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

    // create_folder и create_button импортируются из '../editor/inspector/ui'

    function createEntity<T extends PropertyType>(ids: number[], field: PropertyData<T>, property: PropertyItem<T>, params?: unknown): Entity {
        const entity: Entity = {
            obj: field as unknown as Record<string, unknown>,
            key: 'data',
            params: {
                label: property.title,
                ...(property.readonly === true ? { readonly: true } : {}),
                ...(params as Record<string, unknown>)
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

    // render_entities импортируется из '../editor/inspector/ui'

    // NOTE: проверяем нужно ли поставить прочерк в случае разных значений
    // Логика вынесена в inspector_module/axis_disabled_utils.ts (Phase 18)
    function tryDisabledValueByAxis(info: ChangeInfo) {
        try_disabled_value_by_axis(info, _selected_list, Services.logger.error.bind(Services.logger));
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
            case Property.MESH_NAME: saveMeshModelName(info.ids); break;
            case Property.MODEL_MATERIALS: saveModelMaterials(info.ids); break;
            case Property.SLOT_MATERIAL: saveSlotMaterial(info.ids, info.field); break;
            // Uniform свойства (Phase 21 - per-slot uniforms)
            case Property.UNIFORM_SAMPLER2D:
            case Property.UNIFORM_FLOAT:
            case Property.UNIFORM_RANGE:
            case Property.UNIFORM_VEC2:
            case Property.UNIFORM_VEC3:
            case Property.UNIFORM_VEC4:
            case Property.UNIFORM_COLOR:
                saveUniform(info.ids, info.field);
                break;
        }
    }

    /**
     * Создаёт UpdateContext из ChangeInfo для использования с handlers (Phase 14)
     */
    function create_update_context(info: ChangeInfo): UpdateContext {
        const [isDraggedX, isDraggedY, isDraggedZ] = get_dragged_info(info);
        const [isChangedX, isChangedY, isChangedZ] = get_changed_info(info);

        const axis_info: ChangeAxisInfo = {
            changed_x: isChangedX,
            changed_y: isChangedY,
            changed_z: isChangedZ,
            dragged_x: isDraggedX,
            dragged_y: isDraggedY,
            dragged_z: isDraggedZ,
        };

        return {
            ids: info.ids,
            meshes: _selected_list.filter(mesh => info.ids.includes(mesh.mesh_data.id)),
            value: info.data.event.value,
            axis_info,
            is_last: info.data.event.last ?? true,
            // Для uniform handlers: если field.action_data задан (объект с slot_index), используем его
            // Иначе используем property.title (имя uniform) для обратной совместимости
            action_data: info.data.field.action_data ?? info.data.property?.title,
        };
    }

    /**
     * Создаёт TextureUpdateContext из ChangeInfo для texture asset handlers (Phase 19)
     */
    function create_texture_update_context(info: ChangeInfo): TextureUpdateContext {
        return {
            ids: info.ids,
            texture_paths: _selected_textures,
            value: info.data.event.value,
            is_last: info.data.event.last ?? true,
        };
    }

    /**
     * Создаёт MaterialAssetUpdateContext из ChangeInfo для material asset handlers (Phase 19)
     */
    function create_material_asset_update_context(info: ChangeInfo): MaterialAssetUpdateContext {
        return {
            ids: info.ids,
            material_paths: _selected_materials,
            value: info.data.event.value,
            uniform_name: info.data.property?.title,
            is_last: info.data.event.last ?? true,
        };
    }

    function updatedValue(info: ChangeInfo) {
        // Services.logger.debug("UPDATED: ", info);

        // Phase 14: Пробуем использовать handler из registry для mesh свойств
        const property = info.data.field.name as Property;
        const handler = _handler_registry.get_handler(property);
        if (handler !== undefined) {
            const context = create_update_context(info);
            handler.update(property, context);
            return;
        }

        // Phase 19: Пробуем использовать texture asset handler
        const texture_handler = _texture_asset_handler_registry.get_handler(property);
        if (texture_handler !== undefined) {
            const context = create_texture_update_context(info);
            texture_handler.update(property, context);
            return;
        }

        // Phase 19: Пробуем использовать material asset handler
        const material_handler = _material_asset_handler_registry.get_handler(property);
        if (material_handler !== undefined) {
            const context = create_material_asset_update_context(info);
            material_handler.update(property, context);
            return;
        }

        // Fallback на legacy switch для свойств без handlers
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
            // ASSET_ATLAS, MIN_FILTER, MAG_FILTER - обрабатываются TextureAssetHandler (Phase 19)
            case Property.LINE_HEIGHT: updateLineHeight(info); break;
            case Property.BLEND_MODE: updateBlendMode(info); break;
            case Property.MATERIAL: updateMaterial(info); break;
            // VERTEX_PROGRAM, FRAGMENT_PROGRAM - обрабатываются MaterialAssetHandler (Phase 19)
            // UNIFORM_* свойства - обрабатываются UniformHandler (Phase 20)
            case Property.FLIP_VERTICAL: updateFlipVertical(info); break;
            case Property.FLIP_HORIZONTAL: updateFlipHorizontal(info); break;
            case Property.FLIP_DIAGONAL: updateFlipDiagonal(info); break;
            // Аудио свойства
            case Property.SOUND: updateAudioSound(info); break;
            case Property.VOLUME: updateAudioVolume(info); break;
            case Property.LOOP: updateAudioLoop(info); break;
            case Property.PAN: updateAudioPan(info); break;
            case Property.SPEED: updateAudioSpeed(info); break;
            case Property.SOUND_RADIUS: updateAudioSoundRadius(info); break;
            case Property.MAX_VOLUME_RADIUS: updateAudioMaxVolumeRadius(info); break;
            case Property.SOUND_FUNCTION: updateAudioSoundFunction(info); break;
            case Property.ZONE_TYPE: updateAudioZoneType(info); break;
            case Property.PAN_NORMALIZATION: updateAudioPanNormalization(info); break;
            case Property.RECTANGLE_WIDTH: updateAudioRectangleWidth(info); break;
            case Property.RECTANGLE_HEIGHT: updateAudioRectangleHeight(info); break;
            case Property.RECTANGLE_MAX_WIDTH: updateAudioRectangleMaxWidth(info); break;
            case Property.RECTANGLE_MAX_HEIGHT: updateAudioRectangleMaxHeight(info); break;
            case Property.FADE_IN_TIME: updateAudioFadeInTime(info); break;
            case Property.FADE_OUT_TIME: updateAudioFadeOutTime(info); break;
            // 3D модели
            case Property.MESH_NAME: updateMeshName(info); break;
            case Property.MODEL_SCALE: updateModelScale(info); break;
            case Property.MODEL_MATERIALS: updateModelMaterials(info); break;
            case Property.SLOT_MATERIAL: updateSlotMaterial(info); break;
            case Property.CURRENT_ANIMATION: updateCurrentAnimation(info); break;
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
        const [isDraggedX, isDraggedY, isDraggedZ] = get_dragged_info(info);
        const [isChangedX, isChangedY, isChangedZ] = get_changed_info(info);

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
        const [isChangedX, isChangedY, isChangedZ] = get_changed_info(info);

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
        const [isChangedX, isChangedY] = get_changed_info(info);

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
        const [isDraggedX, isDraggedY] = get_dragged_info(info);
        const [isChangedX, isChangedY] = get_changed_info(info);

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
            const pivot = screen_preset_to_pivot_value(pivot_preset);
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
        const [isChangedX, isChangedY] = get_changed_info(info);

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

            const anchor = screen_preset_to_anchor_value(info.data.event.value as ScreenPointPreset);
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

            // Сохраняем и текстуру, и атлас в формате atlas/texture
            const [texture_name, atlas_name] = mesh.get_texture();
            const texture_path = atlas_name !== '' ? `${atlas_name}/${texture_name}` : texture_name;
            textures.push({ id_mesh: id, texture: texture_path });
        });

        Services.history.push({
            type: 'MESH_TEXTURE',
            description: 'Изменение текстуры',
            data: { items: textures, owner: HistoryOwner.INSPECTOR_CONTROL },
            undo: (d) => {
                for (const item of d.items as TextureEventData[]) {
                    const m = Services.scene.get_by_id(item.id_mesh) as IBaseMeshAndThree | undefined;
                    if (m !== undefined) {
                        // Разбираем сохранённый путь atlas/texture
                        const parts = item.texture.split('/');
                        if (parts.length === 2) {
                            m.set_texture(parts[1], parts[0]);
                        } else {
                            m.set_texture(parts[0], '');
                        }
                    }
                }
            },
            redo: () => {},
        });
    }

    function updateTexture(info: ChangeInfo) {
        console.log('[updateTexture] called with info:', info);
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
                console.log('[updateTexture] Setting texture:', texture, 'atlas:', atlas, 'on mesh:', id);
                (mesh as Slice9Mesh).set_texture(texture, atlas);
            } else {
                console.log('[updateTexture] Clearing texture on mesh:', id);
                (mesh as Slice9Mesh).set_texture('');
            }
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
        const [isChangedX, isChangedY] = get_changed_info(info);

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

    // updateAssetAtlas удалён - заменён на TextureAssetHandler (Phase 19)

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
            const threeBlendMode = convert_blend_mode_to_threejs(blend_mode);
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

    // updateMinFilter удалён - заменён на TextureAssetHandler (Phase 19)

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

    // updateMagFilter удалён - заменён на TextureAssetHandler (Phase 19)
    // convertFilterModeToThreeJS удалён - перенесён в TextureAssetHandler (Phase 19)

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

    function saveMeshModelName(ids: number[]) {
        const mesh_names: MeshModelNameEventData[] = [];
        ids.forEach((id) => {
            const mesh = _selected_list.find((item) => {
                return item.mesh_data.id === id;
            });

            if (mesh === undefined) {
                Services.logger.error('[saveMeshModelName] Mesh not found for id:', id);
                return;
            }

            const mesh_with_name = mesh as { get_mesh_name?: () => string };
            if (typeof mesh_with_name.get_mesh_name === 'function') {
                mesh_names.push({ id_mesh: id, mesh_name: mesh_with_name.get_mesh_name() });
            }
        });

        Services.history.push({
            type: 'MESH_MODEL_NAME',
            description: 'Изменение модели',
            data: { items: mesh_names, owner: HistoryOwner.INSPECTOR_CONTROL },
            undo: (d) => {
                for (const item of d.items as MeshModelNameEventData[]) {
                    const m = Services.scene.get_by_id(item.id_mesh) as (IBaseMeshAndThree & { set_mesh(name: string): void }) | undefined;
                    if (m !== undefined) {
                        m.set_mesh(item.mesh_name);
                    }
                }
                Services.ui.update_hierarchy();
            },
            redo: () => {},
        });
    }

    function saveModelMaterials(ids: number[]) {
        const materials_data: ModelMaterialsEventData[] = [];
        for (const id of ids) {
            const mesh = _selected_list.find((item) => item.mesh_data.id === id);
            if (mesh === undefined) {
                Services.logger.error('[saveModelMaterials] Mesh not found for id:', id);
                continue;
            }

            if ('get_materials' in mesh) {
                const mats = (mesh as MultipleMaterialMesh).get_materials();
                materials_data.push({
                    id_mesh: id,
                    materials: mats.map(m => m.name)
                });
            }
        }

        Services.history.push({
            type: 'MODEL_MATERIALS',
            description: 'Изменение материалов модели',
            data: { items: materials_data, owner: HistoryOwner.INSPECTOR_CONTROL },
            undo: (d) => {
                for (const item of d.items as ModelMaterialsEventData[]) {
                    const m = Services.scene.get_by_id(item.id_mesh) as MultipleMaterialMesh | undefined;
                    if (m !== undefined && 'set_material' in m) {
                        item.materials.forEach((name, idx) => m.set_material(name, idx));
                    }
                }
            },
            redo: () => {},
        });
    }

    /** Данные для отмены изменения материала слота */
    interface SlotMaterialEventData {
        id_mesh: number;
        slot_index: number;
        material_name: string;
    }

    /**
     * Сохраняет текущий материал слота для истории
     */
    function saveSlotMaterial(ids: number[], field: PropertyData<PropertyType>) {
        const action_data = field.action_data as { slot_index?: number } | undefined;
        const slot_index = action_data?.slot_index;

        if (slot_index === undefined) {
            Services.logger.warn('[saveSlotMaterial] No slot_index in action_data');
            return;
        }

        const slot_data: SlotMaterialEventData[] = [];

        for (const id of ids) {
            const mesh = _selected_list.find((item) => item.mesh_data.id === id);
            if (mesh === undefined) {
                Services.logger.error('[saveSlotMaterial] Mesh not found for id:', id);
                continue;
            }

            if ('get_materials' in mesh) {
                const materials = (mesh as MultipleMaterialMesh).get_materials();
                if (slot_index >= 0 && slot_index < materials.length) {
                    slot_data.push({
                        id_mesh: id,
                        slot_index,
                        material_name: materials[slot_index].name
                    });
                }
            }
        }

        if (slot_data.length === 0) return;

        Services.history.push({
            type: 'SLOT_MATERIAL',
            description: `Изменение материала (слот ${slot_index})`,
            data: { items: slot_data, owner: HistoryOwner.INSPECTOR_CONTROL },
            undo: (d) => {
                for (const item of d.items as SlotMaterialEventData[]) {
                    const m = Services.scene.get_by_id(item.id_mesh) as MultipleMaterialMesh | undefined;
                    if (m !== undefined && 'set_material' in m) {
                        m.set_material(item.material_name, item.slot_index);
                    }
                }
                // Обновляем инспектор
                set_selected_list(_selected_list);
            },
            redo: () => {},
        });
    }

    /** Данные для отмены изменения uniform */
    interface UniformEventData {
        id_mesh: number;
        uniform_name: string;
        slot_index?: number;
        value: unknown;
    }

    /**
     * Сохраняет текущее значение uniform для истории (Phase 21 - per-slot uniforms)
     */
    function saveUniform(ids: number[], field: PropertyData<PropertyType>) {
        // Парсим action_data для получения uniform_name и slot_index
        const action_data = field.action_data;
        let uniform_name: string;
        let slot_index: number | undefined;

        if (typeof action_data === 'object' && action_data !== null) {
            const data = action_data as { uniform_name?: string; slot_index?: number };
            uniform_name = data.uniform_name ?? '';
            slot_index = data.slot_index;
        } else if (typeof action_data === 'string') {
            uniform_name = action_data;
        } else {
            Services.logger.warn('[saveUniform] Invalid action_data:', action_data);
            return;
        }

        if (uniform_name === '') {
            Services.logger.warn('[saveUniform] Empty uniform_name');
            return;
        }

        const uniform_data: UniformEventData[] = [];

        for (const id of ids) {
            const mesh = _selected_list.find((item) => item.mesh_data.id === id);
            if (mesh === undefined) {
                Services.logger.error('[saveUniform] Mesh not found for id:', id);
                continue;
            }

            // Получаем текущее значение uniform
            let current_value: unknown;

            if (mesh instanceof MultipleMaterialMesh && slot_index !== undefined) {
                // MultipleMaterialMesh с указанным слотом
                const materials = mesh.get_materials();
                if (slot_index >= 0 && slot_index < materials.length) {
                    const material = materials[slot_index];
                    const uniforms = material.uniforms as Record<string, { value: unknown }>;
                    current_value = uniforms[uniform_name]?.value;
                }
            } else if ('material' in mesh && !(mesh instanceof MultipleMaterialMesh)) {
                // Обычный меш с одним материалом (исключаем MultipleMaterialMesh)
                const material = (mesh as unknown as { material?: { uniforms: Record<string, { value: unknown }> } }).material;
                if (material !== undefined) {
                    current_value = material.uniforms[uniform_name]?.value;
                }
            }

            // Клонируем значение для сохранения в историю
            const cloned_value = deepClone(current_value);

            uniform_data.push({
                id_mesh: id,
                uniform_name,
                slot_index,
                value: cloned_value
            });
        }

        if (uniform_data.length === 0) return;

        Services.history.push({
            type: 'MESH_UNIFORM',
            description: `Изменение uniform ${uniform_name}${slot_index !== undefined ? ` (слот ${slot_index})` : ''}`,
            data: { items: uniform_data, owner: HistoryOwner.INSPECTOR_CONTROL },
            undo: (d) => {
                for (const item of d.items as UniformEventData[]) {
                    const scene_obj = Services.scene.get_by_id(item.id_mesh);
                    if (scene_obj === undefined) continue;

                    if (scene_obj instanceof MultipleMaterialMesh && item.slot_index !== undefined) {
                        // Восстанавливаем uniform для конкретного слота
                        Services.resources.set_material_uniform_for_multiple_material_mesh(
                            scene_obj as unknown as Parameters<typeof Services.resources.set_material_uniform_for_multiple_material_mesh>[0],
                            item.slot_index,
                            item.uniform_name,
                            item.value
                        );
                    } else {
                        // Восстанавливаем uniform для обычного меша
                        Services.resources.set_material_uniform_for_mesh(
                            scene_obj as unknown as IBaseMeshAndThree,
                            item.uniform_name,
                            item.value
                        );
                    }
                }
                // Обновляем инспектор для отображения восстановленных значений
                set_selected_list(_selected_list);
            },
            redo: () => {},
        });
    }

    function updateMaterial(info: ChangeInfo) {
        const new_material_name = info.data.event.value as string;

        info.ids.forEach((id) => {
            const mesh = _selected_list.find((item) => {
                return item.mesh_data.id == id;
            });

            if (mesh === undefined) {
                Services.logger.error('updateMaterial: Mesh not found for id:', id);
                return;
            }

            // Используем set_material для корректного применения материала и переприменения текстуры
            if ('set_material' in mesh && typeof mesh.set_material === 'function') {
                mesh.set_material(new_material_name);
            } else {
                // Fallback для объектов без set_material
                const material_info = Services.resources.get_material_info(new_material_name);
                if (material_info !== undefined) {
                    (mesh as unknown as { material: unknown }).material = material_info.instances[material_info.origin];
                }
            }
        });
        // Обновляем инспектор для отображения новых uniforms материала
        set_selected_list(_selected_list);
    }

    // updateMaterialVertexProgram и updateMaterialFragmentProgram удалены - заменены на MaterialAssetHandler (Phase 19)
    // updateUniform* функции удалены - заменены на UniformHandler (Phase 20)

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

    // === Аудио функции обновления ===

    // === Audio update helper (Phase 18 consolidation) ===
    function updateAudioInternal<T>(value: T, setter: (audio: AudioMesh, v: T) => void) {
        _selected_list.forEach((item) => {
            if (item.type === IObjectTypes.GO_AUDIO_COMPONENT) {
                setter(item as AudioMesh, value);
            }
        });
    }

    function updateAudioSound(info: ChangeInfo) {
        updateAudioInternal(info.data.event.value as string, (a, v) => a.set_sound(v));
    }
    function updateAudioVolume(info: ChangeInfo) {
        updateAudioInternal(info.data.event.value as number, (a, v) => a.set_volume(v));
    }
    function updateAudioLoop(info: ChangeInfo) {
        updateAudioInternal(info.data.event.value as boolean, (a, v) => a.set_loop(v));
    }
    function updateAudioPan(info: ChangeInfo) {
        updateAudioInternal(info.data.event.value as number, (a, v) => a.set_pan(v));
    }
    function updateAudioSpeed(info: ChangeInfo) {
        updateAudioInternal(info.data.event.value as number, (a, v) => a.set_speed(v));
    }
    function updateAudioSoundRadius(info: ChangeInfo) {
        updateAudioInternal(info.data.event.value as number, (a, v) => a.set_sound_radius(v));
    }
    function updateAudioMaxVolumeRadius(info: ChangeInfo) {
        updateAudioInternal(info.data.event.value as number, (a, v) => a.set_max_volume_radius(v));
    }
    function updateAudioSoundFunction(info: ChangeInfo) {
        update_audio_sound_function(_selected_list, info.data.event.value as string);
    }
    function updateAudioZoneType(info: ChangeInfo) {
        update_audio_zone_type(_selected_list, info.data.event.value as string);
    }
    function updateAudioPanNormalization(info: ChangeInfo) {
        updateAudioInternal(info.data.event.value as number, (a, v) => a.set_pan_normalization_distance(v));
    }
    function updateAudioRectangleWidth(info: ChangeInfo) {
        updateAudioInternal(info.data.event.value as number, (a, v) => a.set_rectangle_width(v));
    }
    function updateAudioRectangleHeight(info: ChangeInfo) {
        updateAudioInternal(info.data.event.value as number, (a, v) => a.set_rectangle_height(v));
    }
    function updateAudioRectangleMaxWidth(info: ChangeInfo) {
        updateAudioInternal(info.data.event.value as number, (a, v) => a.set_rectangle_max_volume_width(v));
    }
    function updateAudioRectangleMaxHeight(info: ChangeInfo) {
        updateAudioInternal(info.data.event.value as number, (a, v) => a.set_rectangle_max_volume_height(v));
    }
    function updateAudioFadeInTime(info: ChangeInfo) {
        updateAudioInternal(info.data.event.value as number, (a, v) => a.set_fade_in_time(v));
    }
    function updateAudioFadeOutTime(info: ChangeInfo) {
        updateAudioInternal(info.data.event.value as number, (a, v) => a.set_fade_out_time(v));
    }

    // === 3D модели функции обновления ===

    function updateMeshName(info: ChangeInfo) {
        const value = info.data.event.value as string;
        _selected_list.forEach((item) => {
            if ('set_mesh' in item) {
                (item as MultipleMaterialMesh).set_mesh(value);
            }
        });
        // NOTE: Эта функция теперь вызывается только как fallback
        // Основная логика в ModelHandler.update_mesh_name
        // Полностью пересоздать инспектор для обновления списка анимаций и текстур модели
        clear();
        requestAnimationFrame(() => set_selected_list(_selected_list));
    }

    function updateCurrentAnimation(info: ChangeInfo) {
        const value = info.data.event.value as string;
        _selected_list.forEach((item) => {
            if ('set_animation' in item) {
                (item as AnimatedMesh).set_animation(value);
            }
        });
    }

    function updateModelScale(info: ChangeInfo) {
        const value = info.data.event.value as number;
        _selected_list.forEach((item) => {
            if ('set_scale' in item) {
                (item as MultipleMaterialMesh).set_scale(value, value);
            }
        });
    }

    function updateModelMaterials(info: ChangeInfo) {
        const value = info.data.event.value;
        _selected_list.forEach((item) => {
            if ('set_material' in item) {
                // Если value - массив, применяем все материалы
                if (Array.isArray(value)) {
                    (value as string[]).forEach((name, index) => {
                        (item as MultipleMaterialMesh).set_material(name, index);
                    });
                } else if (typeof value === 'string') {
                    // Если value - строка (из search-list), применяем как первый материал
                    (item as MultipleMaterialMesh).set_material(value, 0);
                }
            }
        });
    }

    /**
     * Обновляет материал конкретного слота
     */
    function updateSlotMaterial(info: ChangeInfo) {
        const value = info.data.event.value as string;
        const action_data = info.data.field.action_data as { slot_index?: number } | undefined;
        const slot_index = action_data?.slot_index;

        if (slot_index === undefined) {
            Services.logger.warn('[updateSlotMaterial] No slot_index in action_data');
            return;
        }

        _selected_list.forEach((item) => {
            if ('set_material' in item) {
                (item as MultipleMaterialMesh).set_material(value, slot_index);
            }
        });

        // Обновляем инспектор чтобы показать новые uniforms для нового материала
        set_selected_list(_selected_list);
    }

    init();
    return { setupConfig, setData, set_selected_textures, set_selected_materials, set_selected_list, refresh, clear }
}

// Функции get_changed_info, get_dragged_info, preset/blend converters перенесены в inspector_module (Phase 18)
// Конфигурация инспектора перенесена в inspector_module/inspector_config.ts (Phase 18)

/**
 * Получить конфигурацию инспектора по умолчанию
 * Обёртка для обратной совместимости
 */
export function getDefaultInspectorConfig() {
    return create_default_inspector_config(get_options_providers());
}