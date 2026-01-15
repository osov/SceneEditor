/**
 * Типы и интерфейсы системы инспектора
 *
 * Определяет типы полей, параметры и интерфейсы для работы с инспектором.
 * Совместимо с существующей системой на базе TweakPane.
 */

import type { TpChangeEvent } from 'tweakpane';
import type { BindingApi } from '@tweakpane/core';
import type { IDisposable } from '../di/types';

/** Типы полей инспектора */
export enum PropertyType {
    /** Число */
    NUMBER = 0,
    /** Двумерный вектор */
    VECTOR_2 = 1,
    /** Трёхмерный вектор */
    VECTOR_3 = 2,
    /** Четырёхмерный вектор */
    VECTOR_4 = 3,
    /** Булево значение (чекбокс) */
    BOOLEAN = 4,
    /** Цвет (hex) */
    COLOR = 5,
    /** Строка */
    STRING = 6,
    /** Слайдер */
    SLIDER = 7,
    /** Выпадающий список текстовый */
    LIST_TEXT = 8,
    /** Список текстур с превью */
    LIST_TEXTURES = 9,
    /** Список элементов */
    ITEM_LIST = 10,
    /** Кнопка */
    BUTTON = 11,
    /** 2D точка с пикером */
    POINT_2D = 12,
    /** Многострочный текст */
    LOG_DATA = 13,
    /** Папка (группировка полей) */
    FOLDER = 14,
}

/** Параметры форматирования числа */
export interface NumberFormatParams {
    /** Минимальное значение */
    min?: number;
    /** Максимальное значение */
    max?: number;
    /** Шаг изменения */
    step?: number;
    /** Функция форматирования */
    format?: (value: number) => string;
    /** Отключено ли поле */
    disabled?: boolean;
}

/** Параметры для каждого типа поля */
export type PropertyParams = {
    [PropertyType.NUMBER]: {
        min?: number;
        max?: number;
        step?: number;
        format?: (value: number) => string;
    };
    [PropertyType.VECTOR_2]: {
        x: NumberFormatParams;
        y: NumberFormatParams;
    };
    [PropertyType.VECTOR_3]: {
        x: NumberFormatParams;
        y: NumberFormatParams;
        z: NumberFormatParams;
    };
    [PropertyType.VECTOR_4]: {
        x: NumberFormatParams;
        y: NumberFormatParams;
        z: NumberFormatParams;
        w: NumberFormatParams;
    };
    [PropertyType.BOOLEAN]: {
        disabled?: boolean;
    };
    [PropertyType.COLOR]: Record<string, never>;
    [PropertyType.STRING]: Record<string, never>;
    [PropertyType.SLIDER]: {
        min: number;
        max: number;
        step: number;
    };
    [PropertyType.LIST_TEXT]: Record<string, string>;
    [PropertyType.LIST_TEXTURES]: Array<{ value: string; src: string }>;
    [PropertyType.ITEM_LIST]: {
        pick_text?: string;
        empty_text?: string;
        options: string[];
        on_option_click?: (option: string) => boolean;
    };
    [PropertyType.BUTTON]: Record<string, never>;
    [PropertyType.POINT_2D]: {
        x: { min: number; max: number; step?: number; format?: (value: number) => string; disabled?: boolean };
        y: { min: number; max: number; step?: number; format?: (value: number) => string; disabled?: boolean };
    };
    [PropertyType.LOG_DATA]: Record<string, never>;
    [PropertyType.FOLDER]: {
        expanded: boolean;
    };
};

/** Значения для каждого типа поля */
export type PropertyValues = {
    [PropertyType.NUMBER]: number;
    [PropertyType.VECTOR_2]: { x: number; y: number };
    [PropertyType.VECTOR_3]: { x: number; y: number; z: number };
    [PropertyType.VECTOR_4]: { x: number; y: number; z: number; w: number };
    [PropertyType.BOOLEAN]: boolean;
    [PropertyType.COLOR]: { hex: string };
    [PropertyType.STRING]: string;
    [PropertyType.SLIDER]: number;
    [PropertyType.LIST_TEXT]: string;
    [PropertyType.LIST_TEXTURES]: string;
    [PropertyType.ITEM_LIST]: string[];
    [PropertyType.BUTTON]: (...args: unknown[]) => void;
    [PropertyType.POINT_2D]: { x: number; y: number };
    [PropertyType.LOG_DATA]: string;
    [PropertyType.FOLDER]: PropertyData<PropertyType>[];
};

/** Информация перед изменением */
export interface BeforeChangeInfo {
    /** ID объектов которые изменяются */
    ids: number[];
    /** Данные изменяемого поля */
    field: PropertyData<PropertyType>;
}

/** Информация об изменении */
export interface ChangeInfo {
    /** ID изменённых объектов */
    ids: number[];
    /** Данные изменения */
    data: {
        /** Поле которое изменилось */
        field: PropertyData<PropertyType>;
        /** Событие TweakPane */
        event: ChangeEvent;
    };
}

/** Событие изменения TweakPane */
export type ChangeEvent = TpChangeEvent<unknown, BindingApi<unknown, unknown>>;

/** Callback перед изменением (для сохранения в историю) */
export type OnBeforeChangeCallback = (info: BeforeChangeInfo) => void;

/** Callback при изменении */
export type OnChangeCallback = (info: ChangeInfo) => void;

/** Callback обновления значения (для multi-select) */
export type OnRefreshCallback<T extends PropertyType> = (ids: number[]) => PropertyValues[T] | undefined;

/** Данные поля инспектора */
export interface PropertyData<T extends PropertyType> {
    /** Уникальный ключ поля */
    key: string;
    /** Отображаемый заголовок */
    title?: string;
    /** Текущее значение */
    value: PropertyValues[T];
    /** Тип поля */
    type: T;
    /** Параметры поля */
    params?: PropertyParams[T];
    /** Только для чтения */
    readonly?: boolean;
    /** Callback перед изменением */
    on_before_change?: OnBeforeChangeCallback;
    /** Callback при изменении */
    on_change?: OnChangeCallback;
    /** Callback обновления для multi-select */
    on_refresh?: OnRefreshCallback<T>;
    /** Дополнительные данные */
    data?: unknown;
}

/** Данные объекта для отображения в инспекторе */
export interface ObjectData {
    /** ID объекта */
    id: number;
    /** Поля объекта */
    fields: PropertyData<PropertyType>[];
}

/** Интерфейс контроллера инспектора */

export interface IInspectorController {
    /** Установить данные для отображения */
    set_data(list_data: ObjectData[]): void;

    /** Обновить значения указанных полей */
    refresh(field_keys: string[]): void;

    /** Очистить инспектор */
    clear(): void;

    /** Получить текущие данные */
    get_data(): ObjectData[];

    /** Уничтожить инспектор */
    dispose(): void;
}

/** Интерфейс обработчика типа поля */

export interface IFieldTypeHandler {
    /** ID типа поля */
    readonly type: PropertyType;

    /** Создать привязку поля к TweakPane */
    create_binding(params: CreateBindingParams): BindingResult | undefined;
}

/** Параметры для создания привязки */
export interface CreateBindingParams {
    /** Данные поля */
    field: PropertyData<PropertyType>;
    /** ID объектов */
    object_ids: number[];
    /** Папка TweakPane для размещения */
    folder: unknown; // FolderApi
    /** Объект для привязки значений */
    target_object: Record<string, unknown>;
}

/** Результат создания привязки */
export interface BindingResult {
    /** API привязки TweakPane */
    binding: unknown; // BindingApi
    /** Функция очистки */
    dispose?: () => void;
}

/** Интерфейс реестра типов полей */

export interface IFieldTypeRegistry {
    /** Зарегистрировать обработчик типа поля */
    register_handler(handler: IFieldTypeHandler): IDisposable;

    /** Получить обработчик для типа */
    get_handler(type: PropertyType): IFieldTypeHandler | undefined;

    /** Проверить, зарегистрирован ли тип */
    has_handler(type: PropertyType): boolean;

    /** Создать привязку для поля */
    create_binding(params: CreateBindingParams): BindingResult | undefined;
}

/** Интерфейс провайдера инспектора для объекта */

export interface IObjectInspectorProvider {
    /** Уникальный ID провайдера */
    readonly id: string;

    /** Приоритет (выше = проверяется раньше) */
    readonly priority: number;

    /** Проверить, может ли провайдер обработать объект */
    can_inspect(target: unknown): boolean;

    /** Получить поля для объекта */
    get_fields(target: unknown): PropertyData<PropertyType>[];
}
