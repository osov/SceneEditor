/**
 * Типы для модуля inspector_module
 *
 * Эти типы независимы от конкретного PropertyType чтобы избежать
 * циклических зависимостей с InspectorControl.ts
 */

import type { Property } from '../../core/inspector/IInspectable';

/**
 * Определение свойства в группе инспектора
 * T - тип PropertyType (number enum)
 */
export interface PropertyItem<T extends number = number> {
    name: Property | string;
    title: string;
    type: T;
    params?: unknown;
    readonly?: boolean;
}

/**
 * Группа свойств инспектора
 */
export interface InspectorGroup {
    name: string;
    title: string;
    property_list: PropertyItem[];
}
