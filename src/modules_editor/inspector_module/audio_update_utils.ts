/**
 * Утилиты для обновления свойств AudioMesh
 *
 * Консолидирует повторяющийся код updateAudio* функций
 */

import { type IBaseMeshAndThree, IObjectTypes } from '../../render_engine/types';
import type { AudioMesh } from '../../render_engine/objects/audio_mesh';
import { SoundFunctionType, SoundZoneType } from '../../render_engine/objects/audio';

/**
 * Методы-сеттеры AudioMesh для простых свойств
 */
export type AudioMeshSetter =
    | 'set_sound'
    | 'set_volume'
    | 'set_loop'
    | 'set_pan'
    | 'set_speed'
    | 'set_sound_radius'
    | 'set_max_volume_radius'
    | 'set_pan_normalization_distance'
    | 'set_rectangle_width'
    | 'set_rectangle_height'
    | 'set_rectangle_max_volume_width'
    | 'set_rectangle_max_volume_height'
    | 'set_fade_in_time'
    | 'set_fade_out_time';

/**
 * Обновить простое свойство AudioMesh
 */
export function update_audio_property<T>(
    selected_list: IBaseMeshAndThree[],
    value: T,
    setter: AudioMeshSetter,
    audio_type: IObjectTypes = IObjectTypes.GO_AUDIO_COMPONENT
): void {
    selected_list.forEach((item) => {
        if (item.type === audio_type) {
            const audioMesh = item as unknown as AudioMesh;
            const method = audioMesh[setter] as (v: T) => void;
            method.call(audioMesh, value);
        }
    });
}

/**
 * Конвертировать строку в SoundFunctionType
 */
export function parse_sound_function_type(value: string): SoundFunctionType {
    switch (value) {
        case 'linear': return SoundFunctionType.LINEAR;
        case 'quadratic': return SoundFunctionType.QUADRATIC;
        case 'exponential': return SoundFunctionType.EXPONENTIAL;
        default: return SoundFunctionType.LINEAR;
    }
}

/**
 * Конвертировать строку в SoundZoneType
 */
export function parse_sound_zone_type(value: string): SoundZoneType {
    return value === 'rectangle' ? SoundZoneType.RECTANGULAR : SoundZoneType.CIRCULAR;
}

/**
 * Обновить sound function
 */
export function update_audio_sound_function(
    selected_list: IBaseMeshAndThree[],
    stringValue: string,
    audio_type: IObjectTypes = IObjectTypes.GO_AUDIO_COMPONENT
): void {
    const value = parse_sound_function_type(stringValue);
    selected_list.forEach((item) => {
        if (item.type === audio_type) {
            (item as unknown as AudioMesh).set_sound_function(value);
        }
    });
}

/**
 * Обновить zone type
 */
export function update_audio_zone_type(
    selected_list: IBaseMeshAndThree[],
    stringValue: string,
    audio_type: IObjectTypes = IObjectTypes.GO_AUDIO_COMPONENT
): void {
    const value = parse_sound_zone_type(stringValue);
    selected_list.forEach((item) => {
        if (item.type === audio_type) {
            (item as unknown as AudioMesh).set_zone_type(value);
        }
    });
}
