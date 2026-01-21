/**
 * Модуль inspector_control - рефакторинг InspectorControl.ts
 *
 * Экспорты разбиты по категориям:
 * - types: типы и интерфейсы
 * - property_updaters: обработчики обновления свойств
 * - history_savers: функции сохранения в историю
 * - data_builder: построение данных инспектора
 * - entity_factory: создание UI entities
 * - selection_handler: обработка выделения
 */

// Types
export * from './types';

// Property updaters
export * from './property_updaters';

// History savers
export {
    save_asset_atlas,
    save_min_filter,
    save_mag_filter,
    save_uv,
    save_uniform,
} from './history_savers';

// Data builder
export {
    get_property_value,
    field_definition_to_property_data,
    build_inspector_data_from_inspectable,
    process_vector_axis,
    merge_vector_fields,
    try_add_to_unique_field,
    filter_unique_fields,
} from './data_builder';

// Entity factory
export {
    cast_property,
    create_entity,
    add_to_folder,
    get_inspector_group_by_name,
    type EntityFactoryCallbacks,
    type EntityFactoryState,
} from './entity_factory';

// Selection handler
export {
    build_texture_selection_data,
    build_material_selection_data,
    type TextureSelectionContext,
    type MaterialSelectionContext,
} from './selection_handler';
