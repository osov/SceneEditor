/**
 * Create Actions - операции создания объектов
 */

import type { ISceneObject, ISceneService } from '@editor/engine/types';
import { ObjectTypes } from '@editor/core/render/types';
import type { CreateObjectParams, IHistoryService, ISelectionService } from '../types';
import type { IEventBus, ILogger } from '@editor/core';

export interface CreateDeps {
    logger: ILogger;
    event_bus: IEventBus;
    selection_service: ISelectionService;
    scene_service: ISceneService;
    history_service: IHistoryService;
}

/** Создать объект с параметрами и записью в историю */
export function create_object_with_history(
    type: ObjectTypes,
    params: CreateObjectParams,
    deps: CreateDeps
): ISceneObject {
    const create_params: Record<string, unknown> = {};

    if (params.texture !== undefined) {
        create_params.texture = params.texture;
    }
    if (params.atlas !== undefined) {
        create_params.atlas = params.atlas;
    }
    if (params.size !== undefined) {
        create_params.size = params.size;
    }

    const obj = deps.scene_service.create(type, create_params);

    // Устанавливаем позицию
    if (params.pos !== undefined) {
        obj.position.set(params.pos.x, params.pos.y, params.pos.z ?? 0);
    }

    // Устанавливаем родителя
    if (params.pid !== undefined && params.pid !== -1) {
        const parent = deps.scene_service.get_by_id(params.pid);
        if (parent !== undefined) {
            parent.add(obj);
        } else {
            deps.scene_service.add(obj);
        }
    } else {
        deps.scene_service.add(obj);
    }

    // Записываем в историю
    deps.history_service.push({
        type: 'create',
        description: `Создание ${type}`,
        data: { id: obj.mesh_data.id, type, params },
        undo: (data) => {
            const created = deps.scene_service.get_by_id(data.id);
            if (created !== undefined) {
                deps.scene_service.remove(created);
            }
        },
        redo: (data) => {
            create_object_with_history(data.type, data.params, deps);
        },
    });

    deps.event_bus.emit('actions:created', { id: obj.mesh_data.id, type });
    deps.selection_service.select(obj);

    return obj;
}

/** Создать GO со спрайтом */
export function create_go_with_sprite(
    params: CreateObjectParams,
    deps: CreateDeps
): ISceneObject {
    // Создаём GO контейнер
    const go = deps.scene_service.create(ObjectTypes.GO_CONTAINER);

    // Устанавливаем позицию контейнера
    if (params.pos !== undefined) {
        go.position.set(params.pos.x, params.pos.y, params.pos.z ?? 0);
    }

    // Создаём спрайт как дочерний
    const sprite_params: Record<string, unknown> = {};
    if (params.size !== undefined) {
        sprite_params.width = params.size.w;
        sprite_params.height = params.size.h;
    }
    const sprite = deps.scene_service.create(ObjectTypes.GO_SPRITE_COMPONENT, sprite_params);

    // Устанавливаем текстуру
    if (params.texture !== undefined && 'set_texture' in sprite) {
        (sprite as unknown as { set_texture(t: string, a: string): void }).set_texture(
            params.texture,
            params.atlas ?? ''
        );
    }

    // Добавляем спрайт в контейнер
    go.add(sprite);

    // Добавляем контейнер в сцену или к родителю
    if (params.pid !== undefined && params.pid !== -1) {
        const parent = deps.scene_service.get_by_id(params.pid);
        if (parent !== undefined) {
            parent.add(go);
        } else {
            deps.scene_service.add(go);
        }
    } else {
        deps.scene_service.add(go);
    }

    // Записываем в историю
    deps.history_service.push({
        type: 'create',
        description: 'Создание GO со спрайтом',
        data: { id: go.mesh_data.id, params },
        undo: (data) => {
            const created = deps.scene_service.get_by_id(data.id);
            if (created !== undefined) {
                deps.scene_service.remove(created);
            }
        },
        redo: (data) => {
            create_go_with_sprite(data.params, deps);
        },
    });

    deps.event_bus.emit('actions:created', { id: go.mesh_data.id, type: ObjectTypes.GO_CONTAINER });
    deps.selection_service.select(go);

    return go;
}

/** Создать компонент */
export function create_component(
    params: CreateObjectParams,
    component_type: number,
    deps: CreateDeps
): ISceneObject {
    const obj = deps.scene_service.create(ObjectTypes.COMPONENT, { type: component_type });

    // Устанавливаем позицию
    if (params.pos !== undefined) {
        obj.position.set(params.pos.x, params.pos.y, params.pos.z ?? 0);
    }

    // Добавляем к родителю или в сцену
    if (params.pid !== undefined && params.pid !== -1) {
        const parent = deps.scene_service.get_by_id(params.pid);
        if (parent !== undefined) {
            parent.add(obj);
        } else {
            deps.scene_service.add(obj);
        }
    } else {
        deps.scene_service.add(obj);
    }

    // Записываем в историю
    deps.history_service.push({
        type: 'create',
        description: `Создание компонента`,
        data: { id: obj.mesh_data.id, type: component_type, params },
        undo: (data) => {
            const created = deps.scene_service.get_by_id(data.id);
            if (created !== undefined) {
                deps.scene_service.remove(created);
            }
        },
        redo: (data) => {
            create_component(data.params, data.type, deps);
        },
    });

    deps.event_bus.emit('actions:created', { id: obj.mesh_data.id, type: ObjectTypes.COMPONENT });
    deps.selection_service.select(obj);

    return obj;
}
