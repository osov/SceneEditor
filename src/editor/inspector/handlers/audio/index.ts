/**
 * Модуль AudioHandler
 * Реэкспорт всех публичных типов и функций
 */

// Типы
export type { IAudioMesh } from './types';
export { is_audio_mesh, SoundFunctionType, SoundZoneType } from './types';

// Основной обработчик
export { create_audio_handler } from './AudioHandler';

// Функции чтения (для прямого использования если нужно)
export {
    read_sound,
    read_volume,
    read_loop,
    read_pan,
    read_speed,
    read_play_pause,
    read_stop,
    read_sound_radius,
    read_max_volume_radius,
    read_pan_normalization,
    read_sound_function,
    read_zone_type,
    read_fade_in_time,
    read_fade_out_time,
    read_rectangle_width,
    read_rectangle_height,
    read_rectangle_max_width,
    read_rectangle_max_height,
} from './readers';

// Функции обновления (для прямого использования если нужно)
export {
    update_sound,
    update_volume,
    update_loop,
    update_pan,
    update_speed,
    update_play_pause,
    update_stop,
    update_sound_radius,
    update_max_volume_radius,
    update_pan_normalization,
    update_sound_function,
    update_zone_type,
    update_fade_in_time,
    update_fade_out_time,
    update_rectangle_width,
    update_rectangle_height,
    update_rectangle_max_width,
    update_rectangle_max_height,
} from './updaters';
