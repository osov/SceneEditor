/**
 * EntityFactory - фабрика UI элементов для TweakPane
 *
 * Создаёт структуры Folder, Button, Entity для последующей отрисовки.
 * Извлечено из InspectorControl.ts (Фаза 16)
 */

import type { BindingParams, ButtonParams } from '@tweakpane/core';
import type { Entity, Button, Folder, Entities, ChangeEvent } from './entity_types';

/**
 * Callbacks для обработки событий Entity
 */
export interface EntityCallbacks {
    onBeforeChange?: () => void;
    onChange?: (event: ChangeEvent) => void;
}

/**
 * Параметры создания Entity
 */
export interface CreateEntityParams {
    obj: Record<string, unknown>;
    key: string;
    label: string;
    readonly?: boolean;
    bindingParams?: BindingParams;
    callbacks?: EntityCallbacks;
}

/**
 * Создаёт папку с дочерними элементами
 */
export function create_folder(title: string, childrens: Entities[]): Folder {
    return {
        title,
        childrens
    };
}

/**
 * Создаёт кнопку
 */
export function create_button(
    title: string,
    onClick: (...args: unknown[]) => void,
    params: ButtonParams = { title }
): Button {
    return {
        title,
        onClick,
        params
    };
}

/**
 * Создаёт привязку поля (entity)
 */
export function create_entity(params: CreateEntityParams): Entity {
    const bindingParams: BindingParams = {
        label: params.label,
        ...params.bindingParams
    };
    if (params.readonly === true) {
        bindingParams.readonly = true;
    }

    const entity: Entity = {
        obj: params.obj,
        key: params.key,
        params: bindingParams
    };

    if (params.callbacks !== undefined) {
        if (params.callbacks.onBeforeChange !== undefined) {
            entity.onBeforeChange = params.callbacks.onBeforeChange;
        }
        if (params.callbacks.onChange !== undefined) {
            entity.onChange = params.callbacks.onChange;
        }
    }

    return entity;
}

/**
 * Интерфейс фабрики
 */
export interface IEntityFactory {
    create_folder: typeof create_folder;
    create_button: typeof create_button;
    create_entity: typeof create_entity;
}

/**
 * Создаёт фабрику UI элементов
 */
export function EntityFactoryCreate(): IEntityFactory {
    return {
        create_folder,
        create_button,
        create_entity
    };
}
