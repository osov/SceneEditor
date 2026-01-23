// Типы для сериализации/десериализации сущностей

import type { Vector2Tuple, Vector3Tuple, Vector4Tuple } from "three";
import type { IObjectTypes } from "./types";

/**
 * Базовый интерфейс для сериализованных данных сущностей.
 * Конкретные реализации расширяют этот интерфейс.
 */
export interface ISerializedEntityBase {
    // Общие поля, которые могут присутствовать в любой сущности
    material_name?: string;
    blending?: number;
    layers?: number;
}

/**
 * Данные сериализации для графических объектов (Slice9, Box, etc.)
 */
export interface ISerializedGraphics extends ISerializedEntityBase {
    slice_width?: number;
    slice_height?: number;
    material_uniforms?: Record<string, number | number[] | string>;
}

/**
 * Данные сериализации для текстовых объектов
 */
export interface ISerializedText extends ISerializedEntityBase {
    text?: string;
    font?: string;
    font_size?: number;
    line_height?: number;
    align?: string;
    inherit_alpha?: boolean;
    inheredAlpha?: number;
}

/**
 * Данные сериализации для аудио объектов
 */
export interface ISerializedAudio extends ISerializedEntityBase {
    is_sound_enabled?: boolean;
    audio_sources?: string[];
    sound_function_type?: number;
    sound_distance?: number;
    sound_zone_type?: number;
    sound_looping?: boolean;
    sound_gain?: number;
    sound_pan?: number;
    sound_speed?: number;
}

/**
 * Данные сериализации для анимированных моделей
 */
export interface ISerializedAnimated extends ISerializedEntityBase {
    skeleton_path?: string;
    skin?: string;
    animation?: string;
    track?: number;
    loop?: boolean;
    mix_duration?: number;
}

/**
 * Объединённый тип для всех вариантов сериализованных данных.
 * Используется как тип для other_data в IBaseEntityData.
 */
export type SerializedOtherData =
    | ISerializedGraphics
    | ISerializedText
    | ISerializedAudio
    | ISerializedAnimated
    | ISerializedEntityBase
    | Record<string, unknown>;

/**
 * Полная структура сериализованной сущности
 */
export interface ISerializedEntity {
    id: number;
    pid: number;
    name: string;
    type: IObjectTypes;
    visible: boolean;
    position: Vector3Tuple;
    rotation: Vector4Tuple;
    scale: Vector2Tuple;
    children?: ISerializedEntity[];
    other_data: SerializedOtherData;
}
