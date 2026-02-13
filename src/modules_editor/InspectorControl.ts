/**
 * InspectorControl - Фасад для управления инспектором свойств
 *
 * Модуль обеспечивает:
 * - Отображение и редактирование свойств выбранных объектов
 * - Поддержку multi-select с объединением свойств
 * - Историю изменений (undo/redo)
 * - Интеграцию с handler-based архитектурой
 *
 * Структура модуля:
 * - inspector_control/types.ts - типы и интерфейсы
 * - inspector_control/property_updaters/ - обработчики изменений свойств
 * - inspector_control/history_savers.ts - сохранение в историю
 * - inspector_control/data_builder.ts - построение данных инспектора
 * - inspector_control/entity_factory.ts - создание UI элементов
 * - inspector_control/selection_handler.ts - обработка выделения
 */

import { Pane } from 'tweakpane';
import { FolderApi } from '@tweakpane/core';
import { Vector3, MathUtils } from 'three';
const { radToDeg } = MathUtils;
import * as TweakpaneImagePlugin from 'tweakpane4-image-list-plugin';
import * as TweakpaneSearchListPlugin from 'tweakpane4-search-list-plugin';
import * as TweakpaneItemListPlugin from 'tweakpane4-item-list-plugin';
import * as TextareaPlugin from '@pangenerator/tweakpane-textarea-plugin';
import * as ExtendedPointNdInputPlugin from 'tweakpane4-extended-vector-plugin';
import * as TweakpaneExtendedBooleanPlugin from 'tweakpane4-extended-boolean-plugin';

import { Services } from '@editor/core';
import { deepClone } from '../modules/utils';
import { IBaseMeshAndThree } from '../render_engine/types';
import type { TextMesh } from '../render_engine/objects/text';
import type { Slice9Mesh } from '../render_engine/objects/slice9';
import { MultipleMaterialMesh } from '../render_engine/objects/multiple_material_mesh';
import { FlipMode, type GoSprite } from '../render_engine/objects/sub_types';
import { Property } from '../core/inspector';
import { get_material_uniform_fields } from '../core/inspector/MaterialFieldProvider';
import { NameEventData } from './InspectorTypes';
import {
    render_entities,
    type Entities,
} from '../editor/inspector/ui';
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
    create_property_history_service,
    type IPropertyHistoryService,
} from '../editor/inspector/PropertyHistoryService';
import {
    get_options_providers,
    type IOptionsProviders,
} from '../editor/inspector/options';
import {
    InspectorOptionsUpdaterCreate,
    type IInspectorOptionsUpdater,
    create_selection_options_updater,
    type ISelectionOptionsUpdater,
    pivot_to_screen_preset,
    anchor_to_screen_preset,
    get_changed_info,
    get_dragged_info,
    create_default_inspector_config,
    try_disabled_value_by_axis,
} from './inspector_module';

// Импорты из рефакторённых модулей
import {
    // Types
    PropertyType,
    type PropertyData,
    type PropertyItem,
    type PropertyParams,
    type PropertyValues,
    type InspectorGroup,
    type ObjectData,
    type ObjectInfo,
    type BeforeChangeInfo,
    type ChangeInfo,
    type UpdaterContext,
    type HistorySaverContext,
    // Data builder
    build_inspector_data_from_inspectable,
    filter_unique_fields,
    try_add_to_unique_field,
    // Entity factory
    cast_property,
    create_entity,
    add_to_folder,
    type EntityFactoryCallbacks,
    type EntityFactoryState,
    // History savers
    save_asset_atlas,
    save_min_filter,
    save_mag_filter,
    save_uv,
    save_uniform,
    // Selection handlers
    build_texture_selection_data,
    build_material_selection_data,
    // Property updaters
    update_position,
    update_rotation,
    update_scale,
    update_size,
    update_name,
    update_active,
    update_visible,
    update_pivot,
    update_anchor,
    update_anchor_preset,
    update_color,
    update_alpha,
    update_texture,
    update_slice,
    update_atlas,
    update_blend_mode,
    update_material,
    update_flip_vertical,
    update_flip_horizontal,
    update_flip_diagonal,
    update_text,
    update_font,
    update_font_size,
    update_text_align,
    update_line_height,
    update_audio_sound,
    update_audio_volume,
    update_audio_loop,
    update_audio_pan,
    update_audio_speed,
    update_audio_sound_radius,
    update_audio_max_volume_radius,
    update_audio_sound_function_handler,
    update_audio_zone_type_handler,
    update_audio_pan_normalization,
    update_audio_rectangle_width,
    update_audio_rectangle_height,
    update_audio_rectangle_max_width,
    update_audio_rectangle_max_height,
    update_audio_fade_in_time,
    update_audio_fade_out_time,
    update_mesh_name,
    update_current_animation,
    update_model_scale,
    update_model_materials,
    update_slot_material,
} from './inspector_control';

// ============================================================================
// Re-exports типов инспектора
// ============================================================================

export { Property } from '../core/inspector/IInspectable';
export { ScreenPointPreset, BlendMode } from './inspector_module';
export {
    TextAlign,
    ComponentType,
    PropertyType,
    FilterMode,
    type PropertyParams,
    type PropertyValues,
    type PropertyItem,
    type InspectorGroup,
    type PropertyData,
    type ObjectData,
    type BeforeChangeInfo,
    type ChangeInfo,
} from './inspector_control/types';

// ============================================================================
// InspectorControl Type & Instance
// ============================================================================

export type InspectorControlType = ReturnType<typeof InspectorControlCreate>;

// ============================================================================
// InspectorControl Factory
// ============================================================================

export function InspectorControlCreate() {
    // State
    let _config: InspectorGroup[];
    let _inspector: Pane;
    let _unique_fields: { ids: number[]; field: PropertyData<PropertyType>; property: PropertyItem<PropertyType> }[];
    let _selected_list: IBaseMeshAndThree[] = [];
    let _selected_textures: string[] = [];
    let _selected_materials: string[] = [];
    let _data: ObjectData[];

    const _state: EntityFactoryState = {
        is_first: true,
        is_refresh: false,
    };

    // Registries & Services
    let _handler_registry: IHandlerRegistry;
    let _texture_asset_handler_registry: ITextureAssetHandlerRegistry;
    let _material_asset_handler_registry: IMaterialAssetHandlerRegistry;
    let _options_providers: IOptionsProviders;
    let _options_updater: IInspectorOptionsUpdater;
    let _selection_options_updater: ISelectionOptionsUpdater<IBaseMeshAndThree>;
    let _history_service: IPropertyHistoryService;

    // ========================================================================
    // Initialization
    // ========================================================================

    function init() {
        _inspector = new Pane({
            container: document.querySelector('.inspector__body') as HTMLElement,
        });

        // Инициализация реестра handlers
        _handler_registry = create_handler_registry({
            on_transform_changed: () => Services.transform.set_proxy_in_average_point(_selected_list),
            on_size_changed: () => Services.size.draw(),
            on_update_ui: () => Services.ui.update_hierarchy(),
            on_refresh_inspector: () => set_selected_list(_selected_list),
        });

        // Регистрация UniformHandler
        const uniform_handler = create_uniform_handler({
            get_selected_materials: () => _selected_materials,
        });
        _handler_registry.register(uniform_handler);

        // Инициализация остальных реестров
        _texture_asset_handler_registry = create_texture_asset_handler_registry();
        _material_asset_handler_registry = create_material_asset_handler_registry();
        _options_providers = get_options_providers();

        registerPlugins();
        setupConfig(getDefaultInspectorConfig());

        _options_updater = InspectorOptionsUpdaterCreate(() => _config, _options_providers);
        _selection_options_updater = create_selection_options_updater<IBaseMeshAndThree>(_options_updater, _options_providers);
        _history_service = create_property_history_service({
            mesh_resolver: { get_mesh: (id: number) => _selected_list.find(m => m.mesh_data.id === id) },
        });

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

        Services.event_bus.on('selection:cleared', () => clear());

        Services.event_bus.on('assets:textures_selected', (data) => {
            const e = data as { paths: string[] };
            set_selected_textures(e.paths);
        });

        Services.event_bus.on('assets:materials_selected', (data) => {
            const e = data as { paths: string[] };
            set_selected_materials(e.paths);
        });

        Services.event_bus.on('assets:selection_cleared', () => clear());

        Services.event_bus.on('assets:atlas_changed', () => {
            if (_selected_textures.length > 0) {
                set_selected_textures(_selected_textures);
            }
        });

        Services.event_bus.on('history:undo', () => {
            if (_selected_list.length > 0) set_selected_list(_selected_list);
        });

        Services.event_bus.on('history:redo', () => {
            if (_selected_list.length > 0) set_selected_list(_selected_list);
        });

        Services.event_bus.on('transform:changed', (data) => {
            const e = data as { type: 'translate' | 'rotate' | 'scale' };
            if (_selected_list.length === 0) return;
            switch (e.type) {
                case 'translate': refresh([Property.POSITION]); break;
                case 'rotate': refresh([Property.ROTATION]); break;
                case 'scale': refresh([Property.SCALE, Property.SIZE, Property.FONT_SIZE]); break;
            }
        });

        Services.event_bus.on('history:undone', (data) => {
            const event = data as { type: string; data: unknown[]; owner?: number };
            if (event.owner !== undefined) return;
            if (event.type === 'MESH_NAME') {
                const names = event.data as NameEventData[];
                for (const item of names) {
                    const mesh = Services.scene.get_by_id(item.id_mesh);
                    if (mesh !== undefined) Services.scene.set_name(mesh, item.name);
                }
                Services.ui.update_hierarchy();
                if (_selected_list.length > 0) {
                    Services.selection.set_selected(_selected_list as unknown as import('@editor/engine/types').ISceneObject[]);
                }
            }
        });
    }

    // ========================================================================
    // Selection Handlers
    // ========================================================================

    function set_selected_textures(textures_paths: string[]) {
        _selected_textures = textures_paths;
        const data = build_texture_selection_data(textures_paths, {
            config: _config,
            update_atlas_options: () => _options_updater.update_atlas_options(),
        });
        clear();
        setData(data);
    }

    function set_selected_materials(materials_paths: string[]) {
        _selected_materials = materials_paths;
        const data = build_material_selection_data(materials_paths, {
            config: _config,
            update_texture_options: (props, method) => _options_updater.update_texture_options(props, method ?? (() => _options_providers.get_texture_options())),
            update_vertex_program_options: () => _options_updater.update_vertex_program_options(),
            update_fragment_program_options: () => _options_updater.update_fragment_program_options(),
            get_uniform_texture_options: () => _options_providers.get_uniform_texture_options(),
        });
        clear();
        setData(data);
    }

    function set_selected_list(list: IBaseMeshAndThree[]) {
        _selected_list = list;

        // Обновляем опции текстур для UNIFORM_SAMPLER2D
        _options_updater.update_texture_options([Property.UNIFORM_SAMPLER2D], () => _options_providers.get_uniform_texture_options());

        const data = list.map((value) => {
            const fields = build_inspector_data_from_inspectable(value, _options_providers, _selection_options_updater);

            // Добавляем uniforms кастомного материала через MaterialFieldProvider
            add_material_uniform_fields(value, fields);

            return { id: value.mesh_data.id, data: fields };
        });

        clear();
        setData(data);
    }

    function add_material_uniform_fields(value: IBaseMeshAndThree, fields: PropertyData<PropertyType>[]) {
        if ('get_materials' in value && typeof (value as unknown as MultipleMaterialMesh).get_materials === 'function') {
            const materials = (value as unknown as MultipleMaterialMesh).get_materials();
            for (let slot_index = 0; slot_index < materials.length; slot_index++) {
                const material = materials[slot_index];
                const material_name = material.name || '';
                const material_uniforms = material.uniforms as Record<string, { value: unknown }> | null;
                const folder_name = `Слот ${slot_index}`;

                fields.push({ name: Property.SLOT_MATERIAL, data: material_name, action_data: { slot_index }, folder: folder_name });

                if (material_uniforms !== null && material_name !== '') {
                    const uniform_fields = get_material_uniform_fields(material_name, material_uniforms);
                    for (const uf of uniform_fields) {
                        update_config_for_uniform(uf.name, uf.title, uf.params);
                        fields.push({
                            name: uf.name,
                            data: uf.data as PropertyValues[PropertyType],
                            action_data: { uniform_name: uf.title, slot_index },
                            folder: folder_name
                        });
                    }
                }
            }
        } else if ('material' in value && value.material !== undefined) {
            const material = (value as Slice9Mesh).material;
            const material_name = material.name || '';
            const material_uniforms = material.uniforms as Record<string, { value: unknown }> | null;

            if (material_uniforms !== null && material_name !== '') {
                const uniform_fields = get_material_uniform_fields(material_name, material_uniforms);
                for (const uf of uniform_fields) {
                    update_config_for_uniform(uf.name, uf.title, uf.params);
                    fields.push({
                        name: uf.name,
                        data: uf.data as PropertyValues[PropertyType],
                        action_data: uf.title
                    });
                }
            }
        }
    }

    function update_config_for_uniform(name: string, title: string, params?: Record<string, unknown>) {
        _config.forEach((group) => {
            const property = group.property_list.find((p) => p.name === name);
            if (property === undefined) return;
            property.title = title;
            if (params !== undefined) property.params = params;
        });
    }

    // ========================================================================
    // Data Processing
    // ========================================================================

    function setData(list_data: ObjectData[]) {
        _unique_fields = [];
        _data = list_data;

        list_data.forEach((obj, index) => {
            const info: ObjectInfo[] = [];
            for (const field of obj.data) {
                const property = getPropertyItemByName(field.name);
                if (property === undefined) continue;
                if (field.params !== undefined) property.params = field.params;
                info.push({ field, property });
            }

            filter_unique_fields(info, _unique_fields);

            info.forEach((data) => {
                try_add_to_unique_field(index, obj, data.field, data.property, _unique_fields);
            });
        });

        const entities: Entities[] = [];
        for (const unique_field of _unique_fields) {
            const entity = castPropertyWithCallbacks(unique_field.ids, unique_field.field, unique_field.property);
            if (entity === undefined) continue;
            add_to_folder(unique_field.field, entity, entities, _config);
        }

        render_entities(entities, _inspector);
        afterRenderEntities();
    }

    function castPropertyWithCallbacks<T extends PropertyType>(
        ids: number[],
        field: PropertyData<T>,
        property: PropertyItem<T>
    ): Entities | undefined {
        // Для кнопок используем cast_property напрямую
        if (property.type === PropertyType.BUTTON) {
            return cast_property(ids, field, property, _options_providers);
        }

        const callbacks: EntityFactoryCallbacks = {
            on_before_change: saveValue,
            on_change: updatedValue,
            on_try_disabled_axis: tryDisabledValueByAxis,
        };

        // Получаем базовые параметры из cast_property
        const base = cast_property(ids, field, property, _options_providers);
        if (base === undefined) return undefined;

        // Создаём entity с callbacks
        return create_entity(ids, field, property, (base as { params?: unknown }).params, callbacks, _state);
    }

    function afterRenderEntities() {
        const tp_slo = document.querySelector('.tp-search-listv_options') as HTMLDivElement;
        if (tp_slo !== null) tp_slo.classList.add('my_scroll');
        const tp_to = document.querySelector('.tp-thumbv_ovl') as HTMLDivElement;
        if (tp_to !== null) tp_to.classList.add('my_scroll');
    }

    function getPropertyItemByName(name: string): PropertyItem<PropertyType> | undefined {
        for (const group of _config) {
            const result = group.property_list.find((p) => p.name === name);
            if (result !== undefined) {
                const copy = deepClone(result);
                copyFormatCallbacks(result, copy);
                return copy;
            }
        }
        Services.logger.error(`Not found ${name}`);
        return undefined;
    }

    function copyFormatCallbacks(src: PropertyItem<PropertyType>, dst: PropertyItem<PropertyType>) {
        if (src.type === PropertyType.NUMBER && dst.params !== undefined) {
            const sp = src.params as PropertyParams[PropertyType.NUMBER];
            const dp = dst.params as PropertyParams[PropertyType.NUMBER];
            if (sp?.format !== undefined) dp.format = sp.format;
        }
        if ((src.type === PropertyType.VECTOR_2 || src.type === PropertyType.VECTOR_3 || src.type === PropertyType.VECTOR_4 || src.type === PropertyType.POINT_2D) && dst.params !== undefined) {
            const sp = src.params as PropertyParams[PropertyType.VECTOR_2];
            const dp = dst.params as PropertyParams[PropertyType.VECTOR_2];
            if (sp?.x?.format !== undefined && dp?.x !== undefined) dp.x.format = sp.x.format;
            if (sp?.y?.format !== undefined && dp?.y !== undefined) dp.y.format = sp.y.format;
        }
        if ((src.type === PropertyType.VECTOR_3 || src.type === PropertyType.VECTOR_4) && dst.params !== undefined) {
            const sp = src.params as PropertyParams[PropertyType.VECTOR_3];
            const dp = dst.params as PropertyParams[PropertyType.VECTOR_3];
            if (sp?.z?.format !== undefined && dp?.z !== undefined) dp.z.format = sp.z.format;
        }
        if (src.type === PropertyType.VECTOR_4 && dst.params !== undefined) {
            const sp = src.params as PropertyParams[PropertyType.VECTOR_4];
            const dp = dst.params as PropertyParams[PropertyType.VECTOR_4];
            if (sp?.w?.format !== undefined && dp?.w !== undefined) dp.w.format = sp.w.format;
        }
    }

    // ========================================================================
    // Change Handlers
    // ========================================================================

    function saveValue(info: BeforeChangeInfo) {
        const property = info.field.name as Property;

        if (property === Property.SLOT_MATERIAL) {
            const action_data = info.field.action_data as { slot_index?: number } | undefined;
            _history_service.save_by_property(property, info.ids, action_data?.slot_index ?? 0);
            return;
        }

        _history_service.save_by_property(property, info.ids);

        const ctx: HistorySaverContext = {
            selected_textures: _selected_textures,
            selected_materials: _selected_materials,
            selected_list: _selected_list,
        };

        switch (property) {
            case Property.ASSET_ATLAS: save_asset_atlas(info.ids, ctx); break;
            case Property.MIN_FILTER: save_min_filter(info.ids, ctx); break;
            case Property.MAG_FILTER: save_mag_filter(info.ids, ctx); break;
            case Property.UNIFORM_SAMPLER2D:
            case Property.UNIFORM_FLOAT:
            case Property.UNIFORM_RANGE:
            case Property.UNIFORM_VEC2:
            case Property.UNIFORM_VEC3:
            case Property.UNIFORM_VEC4:
            case Property.UNIFORM_COLOR:
                save_uniform(info.ids, info.field, ctx);
                break;
        }
    }

    function updatedValue(info: ChangeInfo) {
        const property = info.data.field.name as Property;

        // Пробуем handler из registry
        const handler = _handler_registry.get_handler(property);
        if (handler !== undefined) {
            handler.update(property, create_update_context(info));
            return;
        }

        // Пробуем texture asset handler
        const texture_handler = _texture_asset_handler_registry.get_handler(property);
        if (texture_handler !== undefined) {
            texture_handler.update(property, create_texture_update_context(info));
            return;
        }

        // Пробуем material asset handler
        const material_handler = _material_asset_handler_registry.get_handler(property);
        if (material_handler !== undefined) {
            material_handler.update(property, create_material_asset_update_context(info));
            return;
        }

        // Fallback на legacy updaters
        const ctx = create_updater_context();

        switch (property) {
            case Property.NAME: update_name(info, ctx); break;
            case Property.ACTIVE: update_active(info, ctx); break;
            case Property.VISIBLE: update_visible(info, ctx); break;
            case Property.POSITION: update_position(info, ctx); break;
            case Property.ROTATION: update_rotation(info, ctx); break;
            case Property.SCALE: update_scale(info, ctx); break;
            case Property.SIZE: update_size(info, ctx); break;
            case Property.PIVOT: update_pivot(info, ctx); break;
            case Property.ANCHOR: update_anchor(info, ctx); break;
            case Property.ANCHOR_PRESET: update_anchor_preset(info, ctx); break;
            case Property.COLOR: update_color(info, ctx); break;
            case Property.ALPHA: update_alpha(info, ctx); break;
            case Property.TEXTURE: update_texture(info, ctx); break;
            case Property.SLICE9: update_slice(info, ctx); break;
            case Property.TEXT: update_text(info, ctx); break;
            case Property.FONT: update_font(info, ctx); break;
            case Property.FONT_SIZE: update_font_size(info, ctx); break;
            case Property.TEXT_ALIGN: update_text_align(info, ctx); break;
            case Property.ATLAS: update_atlas(info, ctx); break;
            case Property.LINE_HEIGHT: update_line_height(info, ctx); break;
            case Property.BLEND_MODE: update_blend_mode(info, ctx); break;
            case Property.MATERIAL: update_material(info, ctx); break;
            case Property.FLIP_VERTICAL: update_flip_vertical(info, ctx, (ids) => save_uv(ids, { selected_textures: _selected_textures, selected_materials: _selected_materials, selected_list: _selected_list })); break;
            case Property.FLIP_HORIZONTAL: update_flip_horizontal(info, ctx, (ids) => save_uv(ids, { selected_textures: _selected_textures, selected_materials: _selected_materials, selected_list: _selected_list })); break;
            case Property.FLIP_DIAGONAL: update_flip_diagonal(info, ctx, (ids) => save_uv(ids, { selected_textures: _selected_textures, selected_materials: _selected_materials, selected_list: _selected_list })); break;
            case Property.SOUND: update_audio_sound(info, ctx); break;
            case Property.VOLUME: update_audio_volume(info, ctx); break;
            case Property.LOOP: update_audio_loop(info, ctx); break;
            case Property.PAN: update_audio_pan(info, ctx); break;
            case Property.SPEED: update_audio_speed(info, ctx); break;
            case Property.SOUND_RADIUS: update_audio_sound_radius(info, ctx); break;
            case Property.MAX_VOLUME_RADIUS: update_audio_max_volume_radius(info, ctx); break;
            case Property.SOUND_FUNCTION: update_audio_sound_function_handler(info, ctx); break;
            case Property.ZONE_TYPE: update_audio_zone_type_handler(info, ctx); break;
            case Property.PAN_NORMALIZATION: update_audio_pan_normalization(info, ctx); break;
            case Property.RECTANGLE_WIDTH: update_audio_rectangle_width(info, ctx); break;
            case Property.RECTANGLE_HEIGHT: update_audio_rectangle_height(info, ctx); break;
            case Property.RECTANGLE_MAX_WIDTH: update_audio_rectangle_max_width(info, ctx); break;
            case Property.RECTANGLE_MAX_HEIGHT: update_audio_rectangle_max_height(info, ctx); break;
            case Property.FADE_IN_TIME: update_audio_fade_in_time(info, ctx); break;
            case Property.FADE_OUT_TIME: update_audio_fade_out_time(info, ctx); break;
            case Property.MESH_NAME: update_mesh_name(info, ctx); break;
            case Property.MODEL_SCALE: update_model_scale(info, ctx); break;
            case Property.MODEL_MATERIALS: update_model_materials(info, ctx); break;
            case Property.SLOT_MATERIAL: update_slot_material(info, ctx); break;
            case Property.CURRENT_ANIMATION: update_current_animation(info, ctx); break;
        }
    }

    function tryDisabledValueByAxis(info: ChangeInfo) {
        try_disabled_value_by_axis(info, _selected_list, Services.logger.error.bind(Services.logger));
    }

    // ========================================================================
    // Context Builders
    // ========================================================================

    function create_updater_context(): UpdaterContext {
        return {
            selected_list: _selected_list,
            log_error: Services.logger.error.bind(Services.logger),
            on_transform_changed: () => Services.transform.set_proxy_in_average_point(_selected_list),
            on_size_changed: () => Services.size.draw(),
            on_ui_changed: () => Services.ui.update_hierarchy(),
            on_refresh: refresh,
            on_rebuild_inspector: () => set_selected_list(_selected_list),
        };
    }

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
            action_data: info.data.field.action_data ?? info.data.property?.title,
        };
    }

    function create_texture_update_context(info: ChangeInfo): TextureUpdateContext {
        return {
            ids: info.ids,
            texture_paths: _selected_textures,
            value: info.data.event.value,
            is_last: info.data.event.last ?? true,
        };
    }

    function create_material_asset_update_context(info: ChangeInfo): MaterialAssetUpdateContext {
        return {
            ids: info.ids,
            material_paths: _selected_materials,
            value: info.data.event.value,
            uniform_name: info.data.property?.title,
            is_last: info.data.event.last ?? true,
        };
    }

    // ========================================================================
    // UI Helpers
    // ========================================================================

    function refresh(properties: Property[]) {
        _selected_list.forEach((item) => {
            const obj = _data.find((o) => o.id === item.mesh_data.id);
            if (obj === undefined) return;
            properties.forEach((property) => {
                const value = obj.data.find((p) => p.name === property);
                if (value === undefined) return;

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
                        value.data = (item as unknown as TextMesh).fontSize * max_delta;
                        break;
                    case Property.FLIP_VERTICAL:
                        value.data = (item as unknown as GoSprite).get_flip() === FlipMode.VERTICAL;
                        break;
                    case Property.FLIP_HORIZONTAL:
                        value.data = (item as unknown as GoSprite).get_flip() === FlipMode.HORIZONTAL;
                        break;
                    case Property.FLIP_DIAGONAL:
                        value.data = (item as unknown as GoSprite).get_flip() === FlipMode.DIAGONAL;
                        break;
                }
            });
        });

        properties.forEach((property) => {
            const pane = searchPaneInFolderByProperty(_inspector, property);
            if (pane !== undefined) {
                _state.is_refresh = true;
                pane.refresh();
                _state.is_refresh = false;
            }
        });
    }

    function searchPaneInFolderByProperty(folder: FolderApi, property: Property): Pane | undefined {
        if (folder.children === undefined) {
            Services.logger.error("Not folder: ", folder);
            return undefined;
        }

        for (const child of folder.children) {
            if ((child as FolderApi).children !== undefined) {
                const result = searchPaneInFolderByProperty(child as FolderApi, property);
                if (result !== undefined) return result;
            }

            let title = '';
            for (const group of _config) {
                const item = group.property_list.find((i) => i.name === property);
                if (item !== undefined) {
                    title = item.title;
                    break;
                }
            }

            if (child.element.querySelector('.tp-lblv_l')?.textContent === title) {
                return child as Pane;
            }
        }

        return undefined;
    }

    function clear() {
        _inspector.children.forEach((value) => {
            try {
                value.dispose();
            } catch {
                // Tweakpane может бросить _TpError при повторном dispose
            }
        });
    }

    // ========================================================================
    // Public API
    // ========================================================================

    init();

    return {
        setupConfig,
        setData,
        set_selected_textures,
        set_selected_materials,
        set_selected_list,
        refresh,
        clear
    };
}

// ============================================================================
// Default Config
// ============================================================================

export function getDefaultInspectorConfig() {
    return create_default_inspector_config(get_options_providers());
}
