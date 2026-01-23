/**
 * Функции обновления аудио свойств
 */

import type { UpdateContext } from '../types';
import { is_audio_mesh, SoundFunctionType, SoundZoneType } from './types';

/** Обновление звука */
export function update_sound(context: UpdateContext): void {
    const { meshes, value } = context;
    const sound = value as string;

    for (const mesh of meshes) {
        if (!is_audio_mesh(mesh)) continue;
        mesh.set_sound(sound);
    }
}

/** Обновление громкости */
export function update_volume(context: UpdateContext): void {
    const { meshes, value } = context;
    const volume = value as number;

    for (const mesh of meshes) {
        if (!is_audio_mesh(mesh)) continue;
        mesh.set_volume(volume);
    }
}

/** Обновление loop */
export function update_loop(context: UpdateContext): void {
    const { meshes, value } = context;
    const loop = value as boolean;

    for (const mesh of meshes) {
        if (!is_audio_mesh(mesh)) continue;
        mesh.set_loop(loop);
    }
}

/** Обновление pan */
export function update_pan(context: UpdateContext): void {
    const { meshes, value } = context;
    const pan = value as number;

    for (const mesh of meshes) {
        if (!is_audio_mesh(mesh)) continue;
        mesh.set_pan(pan);
    }
}

/** Обновление speed */
export function update_speed(context: UpdateContext): void {
    const { meshes, value } = context;
    const speed = value as number;

    for (const mesh of meshes) {
        if (!is_audio_mesh(mesh)) continue;
        mesh.set_speed(speed);
    }
}

/** Обновление play/pause */
export function update_play_pause(context: UpdateContext): void {
    const { meshes } = context;
    for (const mesh of meshes) {
        if (!is_audio_mesh(mesh)) continue;
        if (mesh.is_playing()) {
            mesh.stop();
        } else {
            mesh.play();
        }
    }
}

/** Обновление stop */
export function update_stop(context: UpdateContext): void {
    const { meshes } = context;
    for (const mesh of meshes) {
        if (!is_audio_mesh(mesh)) continue;
        mesh.stop();
    }
}

/** Обновление радиуса звука */
export function update_sound_radius(context: UpdateContext): void {
    const { meshes, value } = context;
    const radius = value as number;

    for (const mesh of meshes) {
        if (!is_audio_mesh(mesh)) continue;
        mesh.set_sound_radius(radius);
    }
}

/** Обновление радиуса максимальной громкости */
export function update_max_volume_radius(context: UpdateContext): void {
    const { meshes, value } = context;
    const radius = value as number;

    for (const mesh of meshes) {
        if (!is_audio_mesh(mesh)) continue;
        mesh.set_max_volume_radius(radius);
    }
}

/** Обновление нормализации pan */
export function update_pan_normalization(context: UpdateContext): void {
    const { meshes, value } = context;
    const distance = value as number;

    for (const mesh of meshes) {
        if (!is_audio_mesh(mesh)) continue;
        mesh.set_pan_normalization_distance(distance);
    }
}

/** Обновление функции звука */
export function update_sound_function(context: UpdateContext): void {
    const { meshes, value } = context;
    const func = value as SoundFunctionType;

    for (const mesh of meshes) {
        if (!is_audio_mesh(mesh)) continue;
        mesh.set_sound_function(func);
    }
}

/** Обновление типа зоны */
export function update_zone_type(context: UpdateContext): void {
    const { meshes, value } = context;
    const zone_type = value as SoundZoneType;

    for (const mesh of meshes) {
        if (!is_audio_mesh(mesh)) continue;
        mesh.set_zone_type(zone_type);
    }
}

/** Обновление времени fade in */
export function update_fade_in_time(context: UpdateContext): void {
    const { meshes, value } = context;
    const time = value as number;

    for (const mesh of meshes) {
        if (!is_audio_mesh(mesh)) continue;
        mesh.set_fade_in_time(time);
    }
}

/** Обновление времени fade out */
export function update_fade_out_time(context: UpdateContext): void {
    const { meshes, value } = context;
    const time = value as number;

    for (const mesh of meshes) {
        if (!is_audio_mesh(mesh)) continue;
        mesh.set_fade_out_time(time);
    }
}

/** Обновление ширины прямоугольника */
export function update_rectangle_width(context: UpdateContext): void {
    const { meshes, value } = context;
    const width = value as number;

    for (const mesh of meshes) {
        if (!is_audio_mesh(mesh)) continue;
        mesh.set_rectangle_width(width);
    }
}

/** Обновление высоты прямоугольника */
export function update_rectangle_height(context: UpdateContext): void {
    const { meshes, value } = context;
    const height = value as number;

    for (const mesh of meshes) {
        if (!is_audio_mesh(mesh)) continue;
        mesh.set_rectangle_height(height);
    }
}

/** Обновление макс ширины прямоугольника */
export function update_rectangle_max_width(context: UpdateContext): void {
    const { meshes, value } = context;
    const width = value as number;

    for (const mesh of meshes) {
        if (!is_audio_mesh(mesh)) continue;
        mesh.set_rectangle_max_volume_width(width);
    }
}

/** Обновление макс высоты прямоугольника */
export function update_rectangle_max_height(context: UpdateContext): void {
    const { meshes, value } = context;
    const height = value as number;

    for (const mesh of meshes) {
        if (!is_audio_mesh(mesh)) continue;
        mesh.set_rectangle_max_volume_height(height);
    }
}
