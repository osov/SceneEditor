/**
 * ObjectRegistry - реестр фабрик объектов сцены
 *
 * Позволяет регистрировать фабрики для создания объектов
 * без жёсткой связанности в SceneService.
 */

import { ObjectTypes } from '@editor/core/render/types';
import type { ISceneObject } from './types';

/**
 * Фабрика создания объекта сцены
 */
export interface IObjectFactory {
    /** Создать объект */
    create(id: number, params: Record<string, unknown>): ISceneObject;
}

/**
 * Параметры для регистрации фабрики
 */
export interface ObjectFactoryRegistration {
    type: ObjectTypes;
    factory: IObjectFactory;
}

/**
 * Реестр фабрик объектов
 */
export interface IObjectRegistry {
    /** Зарегистрировать фабрику для типа */
    register(type: ObjectTypes, factory: IObjectFactory): void;
    /** Проверить есть ли фабрика для типа */
    has(type: ObjectTypes): boolean;
    /** Получить фабрику для типа */
    get(type: ObjectTypes): IObjectFactory | undefined;
    /** Создать объект по типу */
    create(type: ObjectTypes, id: number, params?: Record<string, unknown>): ISceneObject | undefined;
}

/**
 * Создать реестр фабрик объектов
 */
export function create_object_registry(): IObjectRegistry {
    const factories = new Map<ObjectTypes, IObjectFactory>();

    function register(type: ObjectTypes, factory: IObjectFactory): void {
        factories.set(type, factory);
    }

    function has(type: ObjectTypes): boolean {
        return factories.has(type);
    }

    function get(type: ObjectTypes): IObjectFactory | undefined {
        return factories.get(type);
    }

    function create(type: ObjectTypes, id: number, params: Record<string, unknown> = {}): ISceneObject | undefined {
        const factory = factories.get(type);
        if (factory === undefined) {
            return undefined;
        }
        return factory.create(id, params);
    }

    return {
        register,
        has,
        get,
        create,
    };
}
