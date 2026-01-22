// Типы и интерфейсы для Inspector модуля

import type { TpChangeEvent } from 'tweakpane';
import type { BindingApi, BindingParams, ButtonParams } from '@tweakpane/core';

/**
 * Типы свойств для инспектора
 */
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
    FOLDER
}

/**
 * Параметры для каждого типа свойства
 */
export type PropertyParams = {
    [PropertyType.NUMBER]: { min?: number, max?: number, step?: number, format?: (value: number) => string };
    [PropertyType.VECTOR_2]: {
        x: { min?: number, max?: number, step?: number, format?: (value: number) => string, disabled?: boolean },
        y: { min?: number, max?: number, step?: number, format?: (value: number) => string, disabled?: boolean }
    };
    [PropertyType.VECTOR_3]: {
        x: { min?: number, max?: number, step?: number, format?: (value: number) => string, disabled?: boolean },
        y: { min?: number, max?: number, step?: number, format?: (value: number) => string, disabled?: boolean },
        z: { min?: number, max?: number, step?: number, format?: (value: number) => string, disabled?: boolean }
    };
    [PropertyType.VECTOR_4]: {
        x: { min?: number, max?: number, step?: number, format?: (value: number) => string, disabled?: boolean },
        y: { min?: number, max?: number, step?: number, format?: (value: number) => string, disabled?: boolean },
        z: { min?: number, max?: number, step?: number, format?: (value: number) => string, disabled?: boolean },
        w: { min?: number, max?: number, step?: number, format?: (value: number) => string, disabled?: boolean }
    };
    [PropertyType.BOOLEAN]: { disabled: boolean };
    [PropertyType.COLOR]: object;
    [PropertyType.STRING]: object;
    [PropertyType.SLIDER]: { min: number, max: number, step: number };
    [PropertyType.LIST_TEXT]: { [key in string]: string };
    [PropertyType.LIST_TEXTURES]: { value: string, src: string }[];
    [PropertyType.ITEM_LIST]: { pickText?: string, emptyText?: string, options: string[], onOptionClick?: (option: string) => boolean };
    [PropertyType.BUTTON]: object;
    [PropertyType.POINT_2D]: {
        x: { min: number, max: number, step?: number, format?: (value: number) => string, disabled?: boolean },
        y: { min: number, max: number, step?: number, format?: (value: number) => string, disabled?: boolean }
    };
    [PropertyType.LOG_DATA]: object;
    [PropertyType.FOLDER]: { expanded: boolean };
}

/**
 * Значения для каждого типа свойства
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Button требует any для callback совместимости с Tweakpane
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
    [PropertyType.BUTTON]: (...args: any[]) => void;
    [PropertyType.POINT_2D]: { x: number, y: number };
    [PropertyType.LOG_DATA]: string;
    [PropertyType.FOLDER]: PropertyData<PropertyType>[]
}

/**
 * Описание свойства для инспектора
 */
export interface PropertyData<T extends PropertyType> {
    key: string;
    title?: string;
    value: PropertyValues[T];
    type: T;

    params?: PropertyParams[T];
    readonly?: boolean;
    onBeforeChange?: OnBeforeChangeCallback;
    onChange?: OnChangeCallback;
    onRefresh?: OnRefreshCallback<T>;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- для дополнительных специфических данных
    data?: any;
}

/**
 * Данные объекта для отображения в инспекторе
 */
export interface ObjectData {
    id: number;
    fields: PropertyData<PropertyType>[];
}

/**
 * Информация перед изменением значения
 */
export interface BeforeChangeInfo {
    ids: number[];
    field: PropertyData<PropertyType>;
}

/**
 * Информация об изменении значения
 */
export interface ChangeInfo {
    ids: number[];
    data: {
        field: PropertyData<PropertyType>;
        event: ChangeEvent;
    }
}

/**
 * Тип события изменения Tweakpane
 */
export type ChangeEvent = TpChangeEvent<unknown, BindingApi<unknown, unknown>>;

/**
 * Callback перед изменением
 */
export type OnBeforeChangeCallback = (info: BeforeChangeInfo) => void;

/**
 * Callback при изменении
 */
export type OnChangeCallback = (info: ChangeInfo) => void;

/**
 * Callback для обновления значения
 */
export type OnRefreshCallback<T extends PropertyType> = (ids: number[]) => PropertyValues[T] | undefined;

/**
 * Папка с дочерними элементами
 */
export interface InspectorFolder {
    title: string;
    childrens: InspectorEntity[];
    expanded: boolean;
}

/**
 * Кнопка
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- onClick требует any для совместимости с Tweakpane
export interface InspectorButton {
    title: string;
    params: ButtonParams;
    onClick: (...args: any[]) => void;
}

/**
 * Свойство (binding)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- obj и onBeforeChange требуют any для совместимости с Tweakpane
export interface InspectorProperty {
    obj: any;
    key: string;
    params?: BindingParams;
    onBeforeChange?: (event: any) => void;
    onChange?: (event: ChangeEvent) => void;
}

/**
 * Сущность инспектора (папка, кнопка или свойство)
 */
export type InspectorEntity = InspectorFolder | InspectorButton | InspectorProperty;

/**
 * Уникальное поле с привязкой к id объектов
 */
export interface UniqueField {
    ids: number[];
    data: PropertyData<PropertyType>;
}
