/**
 * Типы для UI компонентов инспектора (TweakPane entities)
 *
 * Извлечено из InspectorControl.ts (Фаза 16)
 */

import type { BindingApi, BindingParams, ButtonParams } from '@tweakpane/core';
import type { TpChangeEvent } from 'tweakpane';

/**
 * Событие изменения значения в TweakPane
 */
export type ChangeEvent = TpChangeEvent<unknown, BindingApi<unknown, unknown>>;

/**
 * Папка с дочерними элементами
 */
export interface Folder {
    title: string;
    childrens: Entities[];
}

/**
 * Кнопка
 */
export interface Button {
    title: string;
    params: ButtonParams;
    onClick: (...args: unknown[]) => void;
}

/**
 * Событие beforechange от TweakPane emitter
 */
export interface BeforeChangeEvent {
    sender: unknown;
}

/**
 * Привязка поля (binding)
 */
export interface Entity {
    obj: Record<string, unknown>;
    key: string;
    params?: BindingParams;
    onBeforeChange?: (event: BeforeChangeEvent) => void;
    onChange?: (event: ChangeEvent) => void;
}

/**
 * Объединённый тип для всех UI элементов
 */
export type Entities = Folder | Button | Entity;

/**
 * Проверка является ли объект папкой
 */
export function is_folder(obj: Entities): obj is Folder {
    return 'childrens' in obj;
}

/**
 * Проверка является ли объект кнопкой
 */
export function is_button(obj: Entities): obj is Button {
    return 'onClick' in obj;
}

/**
 * Проверка является ли объект привязкой
 */
export function is_entity(obj: Entities): obj is Entity {
    return 'obj' in obj && 'key' in obj;
}
