/**
 * Типы и интерфейсы для AudioHandler
 */

import type { IBaseMeshAndThree } from '../../../../render_engine/types';
import { SoundFunctionType, SoundZoneType } from '../../../../render_engine/objects/audio_mesh';

/** Интерфейс для аудио mesh */
export interface IAudioMesh extends IBaseMeshAndThree {
    get_sound(): string;
    set_sound(name: string): void;
    get_volume(): number;
    set_volume(volume: number): void;
    get_loop(): boolean;
    set_loop(loop: boolean): void;
    get_pan(): number;
    set_pan(pan: number): void;
    get_speed(): number;
    set_speed(speed: number): void;
    get_sound_radius(): number;
    set_sound_radius(radius: number): void;
    get_max_volume_radius(): number;
    set_max_volume_radius(radius: number): void;
    get_pan_normalization_distance(): number;
    set_pan_normalization_distance(distance: number): void;
    get_sound_function(): SoundFunctionType;
    set_sound_function(func: SoundFunctionType): void;
    get_zone_type(): SoundZoneType;
    set_zone_type(type: SoundZoneType): void;
    get_fade_in_time(): number;
    set_fade_in_time(time: number): void;
    get_fade_out_time(): number;
    set_fade_out_time(time: number): void;
    get_rectangle_width(): number;
    set_rectangle_width(width: number): void;
    get_rectangle_height(): number;
    set_rectangle_height(height: number): void;
    get_rectangle_max_volume_width(): number;
    set_rectangle_max_volume_width(width: number): void;
    get_rectangle_max_volume_height(): number;
    set_rectangle_max_volume_height(height: number): void;
    // Методы воспроизведения
    play(complete_function?: () => void): void;
    pause(): void;
    stop(): void;
    is_playing(): boolean;
}

/** Проверка является ли mesh аудио mesh */
export function is_audio_mesh(mesh: IBaseMeshAndThree): mesh is IAudioMesh {
    return typeof (mesh as IAudioMesh).get_sound === 'function';
}

// Реэкспорт типов
export { SoundFunctionType, SoundZoneType };
