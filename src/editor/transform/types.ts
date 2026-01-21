/**
 * Transform Types - типы для сервиса трансформации
 */

import { Quaternion, Vector3 } from 'three';
import type { ISceneObject } from '@editor/engine/types';

/** Трансформируемый объект с дополнительными методами */
export type TransformableObject = ISceneObject & {
    _position?: Vector3;
    transform_changed?(): void;
};

/** Данные для истории позиции */
export interface PositionHistoryItem {
    mesh_id: number;
    value: Vector3;
}

/** Данные для истории вращения */
export interface RotationHistoryItem {
    mesh_id: number;
    value: Quaternion;
}

/** Данные для истории масштаба */
export interface ScaleHistoryItem {
    mesh_id: number;
    value: Vector3;
}
