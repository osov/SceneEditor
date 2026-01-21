/**
 * Transform History Handlers - обработчики истории трансформаций
 */

import { Quaternion, Scene, Vector3 } from 'three';
import type { IEventBus } from '@editor/core';
import type { IHistoryService } from '../types';
import type {
    TransformableObject,
    PositionHistoryItem,
    RotationHistoryItem,
    ScaleHistoryItem,
} from './types';
import { HistoryOwner } from '../../modules_editor/modules_editor_const';

export interface HistoryHandlerDeps {
    history_service: IHistoryService;
    event_bus: IEventBus;
    scene: Scene;
}

/** Записать позиции в историю */
export function write_positions_to_history(
    objects: TransformableObject[],
    old_positions: Vector3[],
    deps: HistoryHandlerDeps
): void {
    const undo_data: PositionHistoryItem[] = [];
    const redo_data: PositionHistoryItem[] = [];
    for (let i = 0; i < objects.length; i++) {
        const object = objects[i];
        undo_data.push({ mesh_id: object.mesh_data.id, value: old_positions[i].clone() });
        redo_data.push({ mesh_id: object.mesh_data.id, value: object.position.clone() });
    }

    deps.history_service.push({
        type: 'MESH_TRANSLATE',
        description: 'Перемещение объектов',
        data: { undo_items: undo_data, redo_items: redo_data, owner: HistoryOwner.TRANSFORM_CONTROL },
        undo: (d) => {
            for (const item of d.undo_items) {
                const mesh = deps.scene.getObjectByProperty('mesh_data', { id: item.mesh_id }) as TransformableObject | undefined;
                if (mesh !== undefined) {
                    mesh.position.copy(item.value);
                    if (mesh.transform_changed !== undefined) {
                        mesh.transform_changed();
                    }
                }
            }
            deps.event_bus.emit('transform:undone', { type: 'translate' });
        },
        redo: (d) => {
            for (const item of d.redo_items) {
                const mesh = deps.scene.getObjectByProperty('mesh_data', { id: item.mesh_id }) as TransformableObject | undefined;
                if (mesh !== undefined) {
                    mesh.position.copy(item.value);
                    if (mesh.transform_changed !== undefined) {
                        mesh.transform_changed();
                    }
                }
            }
            deps.event_bus.emit('transform:redone', { type: 'translate' });
        },
    });

    deps.event_bus.emit('history:undone', {
        type: 'MESH_TRANSLATE',
        data: undo_data,
        owner: HistoryOwner.TRANSFORM_CONTROL,
    });
}

/** Записать вращения в историю */
export function write_rotations_to_history(
    objects: TransformableObject[],
    old_rotations: Quaternion[],
    deps: HistoryHandlerDeps
): void {
    const undo_data: RotationHistoryItem[] = [];
    const redo_data: RotationHistoryItem[] = [];
    for (let i = 0; i < objects.length; i++) {
        const object = objects[i];
        undo_data.push({ mesh_id: object.mesh_data.id, value: old_rotations[i].clone() });
        redo_data.push({ mesh_id: object.mesh_data.id, value: object.quaternion.clone() });
    }

    deps.history_service.push({
        type: 'MESH_ROTATE',
        description: 'Вращение объектов',
        data: { undo_items: undo_data, redo_items: redo_data, owner: HistoryOwner.TRANSFORM_CONTROL },
        undo: (d) => {
            for (const item of d.undo_items) {
                const mesh = deps.scene.getObjectByProperty('mesh_data', { id: item.mesh_id }) as TransformableObject | undefined;
                if (mesh !== undefined) {
                    mesh.quaternion.copy(item.value);
                    if (mesh.transform_changed !== undefined) {
                        mesh.transform_changed();
                    }
                }
            }
            deps.event_bus.emit('transform:undone', { type: 'rotate' });
        },
        redo: (d) => {
            for (const item of d.redo_items) {
                const mesh = deps.scene.getObjectByProperty('mesh_data', { id: item.mesh_id }) as TransformableObject | undefined;
                if (mesh !== undefined) {
                    mesh.quaternion.copy(item.value);
                    if (mesh.transform_changed !== undefined) {
                        mesh.transform_changed();
                    }
                }
            }
            deps.event_bus.emit('transform:redone', { type: 'rotate' });
        },
    });
}

/** Записать масштабы в историю */
export function write_scales_to_history(
    objects: TransformableObject[],
    old_scales: Vector3[],
    deps: HistoryHandlerDeps
): void {
    const undo_data: ScaleHistoryItem[] = [];
    const redo_data: ScaleHistoryItem[] = [];
    for (let i = 0; i < objects.length; i++) {
        const object = objects[i];
        undo_data.push({ mesh_id: object.mesh_data.id, value: old_scales[i].clone() });
        redo_data.push({ mesh_id: object.mesh_data.id, value: object.scale.clone() });
    }

    deps.history_service.push({
        type: 'MESH_SCALE',
        description: 'Масштабирование объектов',
        data: { undo_items: undo_data, redo_items: redo_data, owner: HistoryOwner.TRANSFORM_CONTROL },
        undo: (d) => {
            for (const item of d.undo_items) {
                const mesh = deps.scene.getObjectByProperty('mesh_data', { id: item.mesh_id }) as TransformableObject | undefined;
                if (mesh !== undefined) {
                    mesh.scale.copy(item.value);
                    if (mesh.transform_changed !== undefined) {
                        mesh.transform_changed();
                    }
                }
            }
            deps.event_bus.emit('transform:undone', { type: 'scale' });
        },
        redo: (d) => {
            for (const item of d.redo_items) {
                const mesh = deps.scene.getObjectByProperty('mesh_data', { id: item.mesh_id }) as TransformableObject | undefined;
                if (mesh !== undefined) {
                    mesh.scale.copy(item.value);
                    if (mesh.transform_changed !== undefined) {
                        mesh.transform_changed();
                    }
                }
            }
            deps.event_bus.emit('transform:redone', { type: 'scale' });
        },
    });
}
