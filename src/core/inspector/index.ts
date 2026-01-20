/**
 * Модуль инспектора
 *
 * Система инспектора для редактирования свойств объектов.
 */

// Типы
export {
    PropertyType,
} from './types';

export type {
    PropertyParams,
    PropertyValues,
    PropertyData,
    ObjectData,
    BeforeChangeInfo,
    ChangeInfo,
    ChangeEvent,
    OnBeforeChangeCallback,
    OnChangeCallback,
    OnRefreshCallback,
    NumberFormatParams,
    IInspectorController,
    IFieldTypeHandler,
    IFieldTypeRegistry,
    IObjectInspectorProvider,
    CreateBindingParams,
    BindingResult,
} from './types';

// Реестр типов полей
export { create_field_type_registry } from './FieldTypeRegistry';

// Контроллер
export { create_inspector_controller } from './InspectorController';

// IInspectable
export {
    Property,
    is_inspectable,
    group_fields_by_section,
    GROUP_TITLES,
    GROUP_ORDER,
} from './IInspectable';

export type {
    InspectorFieldGroup,
    InspectorFieldDefinition,
    IInspectable,
} from './IInspectable';

// MaterialFieldProvider
export {
    get_material_uniform_fields,
    get_material_slot_uniform_fields,
    get_all_material_slots_data,
    get_material_inspector_fields,
} from './MaterialFieldProvider';

export type {
    UniformFieldInfo,
    UniformPropertyData,
    MaterialSlotData,
} from './MaterialFieldProvider';

// FieldDefinitionProvider
export {
    get_field_definitions,
    is_dynamic_field,
    DYNAMIC_FIELDS,
} from './FieldDefinitionProvider';

export type {
    GetPropertyValueFn,
    GetAnimationListFn,
    GetFieldDefinitionsOptions,
} from './FieldDefinitionProvider';
