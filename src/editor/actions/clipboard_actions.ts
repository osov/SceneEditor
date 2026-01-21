/**
 * Clipboard Actions - операции буфера обмена
 */

import type { ISceneObject, ISceneService } from '@editor/engine/types';
import type { BaseEntityData } from '@editor/core/render/types';
import type { IEventBus, ILogger } from '@editor/core';
import type { ISelectionService } from '../types';

export interface ClipboardState {
    data: BaseEntityData[];
    mesh_list: ISceneObject[];
    is_cut: boolean;
}

export interface ClipboardDeps {
    logger: ILogger;
    event_bus: IEventBus;
    selection_service: ISelectionService;
    scene_service: ISceneService;
}

/** Создать состояние буфера обмена */
export function create_clipboard_state(): ClipboardState {
    return {
        data: [],
        mesh_list: [],
        is_cut: false,
    };
}

/** Копировать выбранные объекты */
export function copy_selected(
    state: ClipboardState,
    deps: ClipboardDeps
): void {
    const selected = deps.selection_service.selected;
    if (selected.length === 0) {
        deps.logger.warn('Нечего копировать');
        return;
    }

    state.data = selected.map(obj => deps.scene_service.serialize_object(obj));
    state.mesh_list = [...selected];
    state.is_cut = false;

    deps.logger.debug(`Скопировано ${state.data.length} объектов`);
    deps.event_bus.emit('actions:copied', { count: state.data.length });
}

/** Вырезать выбранные объекты */
export function cut_selected(
    state: ClipboardState,
    deps: ClipboardDeps
): void {
    const selected = deps.selection_service.selected;
    if (selected.length === 0) {
        deps.logger.warn('Нечего вырезать');
        return;
    }

    state.data = selected.map(obj => deps.scene_service.serialize_object(obj));
    state.is_cut = true;

    deps.logger.debug(`Вырезано ${state.data.length} объектов`);
    deps.event_bus.emit('actions:cut', { count: state.data.length });
}

/** Вставить данные из буфера */
export function paste_clipboard_data(
    data: BaseEntityData[],
    deps: ClipboardDeps,
    parent?: ISceneObject
): ISceneObject[] {
    const result: ISceneObject[] = [];

    for (const item of data) {
        const obj = deps.scene_service.create(item.type, item.other_data);

        // Восстанавливаем трансформацию
        if (item.position !== undefined) {
            obj.position.set(item.position[0], item.position[1], item.position[2]);
        }

        obj.name = item.name;
        obj.visible = item.visible;

        if (parent !== undefined) {
            parent.add(obj);
        } else {
            deps.scene_service.add(obj);
        }

        result.push(obj);
    }

    return result;
}

/** Удалить объекты по данным */
export function delete_objects_by_data(
    data: BaseEntityData[],
    deps: ClipboardDeps
): void {
    for (const item of data) {
        const obj = deps.scene_service.get_by_id(item.id);
        if (obj !== undefined) {
            deps.scene_service.remove(obj);
        }
    }
}
