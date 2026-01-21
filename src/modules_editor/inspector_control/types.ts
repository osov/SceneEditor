/**
 * Типы и интерфейсы для модуля InspectorControl
 */

import type { ChangeEvent } from '../../editor/inspector/ui';
import type { Property } from '../../core/inspector';
import type { IBaseMeshAndThree } from '../../render_engine/types';

// ============================================================================
// Enums
// ============================================================================

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

// ============================================================================
// Property Params и Values
// ============================================================================

export type PropertyParams = {
    [PropertyType.NUMBER]: { min?: number, max?: number, step?: number, format?: (value: number) => string };
    [PropertyType.VECTOR_2]: { x: { min?: number, max?: number, step?: number, format?: (value: number) => string, disabled?: boolean }, y: { min?: number, max?: number, step?: number, format?: (value: number) => string, disabled?: boolean } };
    [PropertyType.VECTOR_3]: { x: { min?: number, max?: number, step?: number, format?: (value: number) => string, disabled?: boolean }, y: { min?: number, max?: number, step?: number, format?: (value: number) => string, disabled?: boolean }, z: { min?: number, max?: number, step?: number, format?: (value: number) => string, disabled?: boolean } };
    [PropertyType.VECTOR_4]: { x: { min?: number, max?: number, step?: number, format?: (value: number) => string, disabled?: boolean }, y: { min?: number, max?: number, step?: number, format?: (value: number) => string, disabled?: boolean }, z: { min?: number, max?: number, step?: number, format?: (value: number) => string, disabled?: boolean }, w: { min?: number, max?: number, step?: number, format?: (value: number) => string, disabled?: boolean } };
    [PropertyType.BOOLEAN]: { disabled: boolean };
    [PropertyType.COLOR]: object;
    [PropertyType.STRING]: object;
    [PropertyType.SLIDER]: { min: number, max: number, step: number };
    [PropertyType.LIST_TEXT]: { [key in string]: string };
    [PropertyType.LIST_TEXTURES]: { value: string, src: string }[];
    [PropertyType.ITEM_LIST]: { pickText?: string, emptyText?: string, options: string[], onOptionClick?: (option: string) => boolean };
    [PropertyType.BUTTON]: object;
    [PropertyType.POINT_2D]: { x: { min: number, max: number, step?: number, format?: (value: number) => string, disabled?: boolean }, y: { min: number, max: number, step?: number, format?: (value: number) => string, disabled?: boolean } };
    [PropertyType.LOG_DATA]: object;
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
    [PropertyType.LIST_TEXT]: string;
    [PropertyType.LIST_TEXTURES]: string;
    [PropertyType.ITEM_LIST]: string[];
    [PropertyType.BUTTON]: (...args: unknown[]) => void;
    [PropertyType.POINT_2D]: { x: number, y: number };
    [PropertyType.LOG_DATA]: string;
}

// ============================================================================
// Inspector Interfaces
// ============================================================================

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

/**
 * Данные свойства для отображения в инспекторе
 */
export interface PropertyData<T extends PropertyType> {
    name: string;
    data: PropertyValues[T];
    type?: T;
    params?: PropertyParams[T];
    /** Дополнительные данные для handler (например slot_index для uniform) */
    action_data?: unknown;
    /** Кастомная папка для группировки (вместо группы из _config) */
    folder?: string;
}

/**
 * Данные объекта для инспектора
 */
export interface ObjectData {
    id: number;
    data: PropertyData<PropertyType>[];
}

/**
 * Информация о поле до изменения
 */
export interface BeforeChangeInfo {
    ids: number[];
    field: PropertyData<PropertyType>;
}

/**
 * Информация об изменении поля
 */
export interface ChangeInfo {
    ids: number[];
    data: {
        field: PropertyData<PropertyType>;
        property: PropertyItem<PropertyType>;
        event: ChangeEvent;
    }
}

/**
 * Информация об объекте
 */
export interface ObjectInfo {
    field: PropertyData<PropertyType>;
    property: PropertyItem<PropertyType>;
}

// ============================================================================
// Updater Context Types
// ============================================================================

/**
 * Контекст для функций обновления свойств
 */
export interface UpdaterContext {
    /** Список выбранных объектов */
    selected_list: IBaseMeshAndThree[];
    /** Функция логирования ошибок */
    log_error: (message: string, ...args: unknown[]) => void;
    /** Callback для обновления transform proxy */
    on_transform_changed?: () => void;
    /** Callback для обновления размеров */
    on_size_changed?: () => void;
    /** Callback для обновления UI */
    on_ui_changed?: () => void;
    /** Callback для обновления инспектора */
    on_refresh?: (properties: Property[]) => void;
    /** Callback для полного пересоздания инспектора */
    on_rebuild_inspector?: () => void;
}

/**
 * Параметры для history_savers
 */
export interface HistorySaverContext {
    /** Список выбранных текстур */
    selected_textures: string[];
    /** Список выбранных материалов */
    selected_materials: string[];
    /** Список выбранных объектов */
    selected_list: IBaseMeshAndThree[];
}
