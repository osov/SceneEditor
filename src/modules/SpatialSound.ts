/**
 * Модуль пространственного звука
 * 
 * Пример использования:
 * 
 * // Создание пространственного звука
 * const spatialSoundId = SpatialSound.create_spatial_sound(
 *     audioMeshUrl, 
 *     100,  // soundRadius
 *     50,   // maxVolumeRadius
 *     25,   // panNormalizationDistance
 *     SoundFunctionType.LINEAR,
 *     1.0,  // fadeInTime
 *     1.0   // fadeOutTime
 * );
 * 
 * // Управление параметрами
 * SpatialSound.set_sound_radius(audioMeshUrl, 150);
 * SpatialSound.set_max_volume_radius(audioMeshUrl, 75);
 * SpatialSound.set_sound_function(audioMeshUrl, SoundFunctionType.EXPONENTIAL);
 * 
 * // Удаление пространственного звука
 * SpatialSound.remove_spatial_sound(audioMeshUrl);
 */

import '../defold/vmath';


export enum SoundFunctionType {
    LINEAR = 'linear',
    EXPONENTIAL = 'exponential',
    QUADRATIC = 'quadratic',
    INVERSE_QUADRATIC = 'inverse_quadratic',
    SMOOTH_STEP = 'smooth_step'
}

const DEFAULT_SOUND_RADIUS = 0;
const DEFAULT_MAX_VOLUME = 1;
const DEFAULT_MAX_VOLUME_RADIUS = DEFAULT_SOUND_RADIUS;
const DEFAULT_PAN_NORMALIZATION_DISTANCE = 0;
const DEFAULT_FADE_IN_TIME = 1.0;
const DEFAULT_FADE_OUT_TIME = 1.0;

interface SpatialSoundData {
    soundRadius: number;
    maxVolume: number;
    maxVolumeRadius: number;
    panNormalizationDistance: number;
    soundFunction: SoundFunctionType;
    fadeInTime: number;
    fadeOutTime: number;
    speed: number;
    pan: number;
}

interface SpatialSoundInstance {
    url: string | hash;
    data: SpatialSoundData;
    currentVolume: number;
    targetVolume: number;
    fadeStartVolume: number;
    fadeStartTime: number;
    fadeDuration: number;
    forceControl: boolean;
    isSpatialActive: boolean;
}

declare global {
    const SpatialSound: ReturnType<typeof SpatialSoundModule>;
}

export function register_spatial_sound() {
    (window as any).SpatialSound = SpatialSoundModule();
}

function SpatialSoundModule() {
    // TODO: найти лучший способ хранения с ключом hash без алокации, как вариант брать hash как number напрямую по id
    const instances = new Map<string | hash, SpatialSoundInstance>();
    let listenerPosition: vmath.vector3;

    function create_spatial_sound(
        url: string | hash,
        soundRadius: number = DEFAULT_SOUND_RADIUS,
        maxVolume: number = DEFAULT_MAX_VOLUME,
        maxVolumeRadius: number = DEFAULT_MAX_VOLUME_RADIUS,
        panNormalizationDistance: number = DEFAULT_PAN_NORMALIZATION_DISTANCE,
        soundFunction: SoundFunctionType = SoundFunctionType.LINEAR,
        fadeInTime: number = DEFAULT_FADE_IN_TIME,
        fadeOutTime: number = DEFAULT_FADE_OUT_TIME
    ): string | hash {

        // TODO: нужен лучший способ проверки существования звука
        if (!sound.get_gain(url)) {
            Log.error('Sound not found or not set');
            return -1;
        }

        const instance: SpatialSoundInstance = {
            url,
            data: {
                soundRadius: Math.max(0, soundRadius),
                maxVolume: Math.max(0, maxVolume),
                maxVolumeRadius: Math.max(0, maxVolumeRadius),
                panNormalizationDistance: Math.max(0, panNormalizationDistance),
                soundFunction,
                fadeInTime: Math.max(0, fadeInTime),
                fadeOutTime: Math.max(0, fadeOutTime),
                speed: sound.get_speed(url),
                pan: sound.get_pan(url)
            },
            currentVolume: 0,
            targetVolume: 0,
            fadeStartVolume: 0,
            fadeStartTime: 0,
            fadeDuration: 0,
            forceControl: false,
            isSpatialActive: false
        };

        // NOTE: мы же можем использовать этот ивент для обновления ? как вариант вручную где-то потом вызывать update_spatial_sound
        EventBus.on('SYS_ON_UPDATE', () => update_spatial_sound(url));

        instances.set(url, instance);

        return url;
    }

    function remove_spatial_sound(url: string | hash): void {
        const instance = instances.get(url);

        if (instance) {
            stop_spatial_audio(url);
            instances.delete(url);
            EventBus.off('SYS_ON_UPDATE', () => update_spatial_sound(url));
        }
    }

    function update_spatial_sound(url: string | hash): void {
        const instance = instances.get(url);
        if (!instance) {
            return;
        }

        instance.forceControl = instance.data.soundRadius == 0;

        const listenerPosition = get_listener_position();
        const soundPosition = go.get_world_position(url);

        if (!soundPosition) {
            if (instance.isSpatialActive) {
                stop_spatial_audio(url);
            }
            return;
        }

        const distance = calculate_distance_2d(listenerPosition, soundPosition);
        if (instance.data.soundRadius == 0) {
            handle_listener_in_range(url, distance, listenerPosition, soundPosition);
        } else {
            if (distance <= instance.data.soundRadius) {
                handle_listener_in_range(url, distance, listenerPosition, soundPosition);
            } else {
                handle_listener_out_of_range(url);
            }
        }

        update_fading(url);

        if (instance.data.soundRadius > 0 && distance > instance.data.soundRadius &&
            instance.currentVolume <= 0 && instance.isSpatialActive) {
            stop_spatial_audio(url);
        }
    }

    function set_listener_position(position: vmath.vector3): void {
        listenerPosition = position;
    }

    function get_listener_position(): vmath.vector3 {
        return listenerPosition;
    }

    function calculate_distance_2d(pos1: vmath.vector3, pos2: vmath.vector3): number {
        const dx = pos2.x - pos1.x;
        const dy = pos2.y - pos1.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    function handle_listener_in_range(url: string | hash, distance: number, listenerPos: vmath.vector3, soundPos: vmath.vector3): void {
        const instance = instances.get(url);
        if (!instance) return;

        const newTargetVolume = calculate_volume_by_distance(instance, distance);
        const pan = calculate_pan_by_distance(instance, distance, listenerPos, soundPos);

        sound.set_pan(url, pan);

        if (!instance.forceControl && !instance.isSpatialActive && newTargetVolume > 0) {
            start_spatial_audio(url);
        }

        if (Math.abs(newTargetVolume - instance.targetVolume) > 0.001) {
            instance.targetVolume = newTargetVolume;

            if (!instance.isSpatialActive && instance.targetVolume > 0) {
                instance.currentVolume = 0;
                start_fade(url, instance.targetVolume, instance.data.fadeInTime);
            } else if (instance.isSpatialActive) {
                start_fade(url, instance.targetVolume, instance.data.fadeInTime);
            }
        }
    }

    function handle_listener_out_of_range(url: string | hash): void {
        const instance = instances.get(url);
        if (!instance) return;

        if (instance.isSpatialActive && instance.targetVolume > 0) {
            instance.targetVolume = 0;
            start_fade(url, 0, instance.data.fadeOutTime);
        }

        if (!instance.isSpatialActive) {
            instance.currentVolume = 0;
            instance.targetVolume = 0;
        }
    }

    function calculate_volume_by_distance(instance: SpatialSoundInstance, distance: number): number {
        if (instance.data.soundRadius == 0) {
            return instance.data.maxVolume;
        }

        if (distance <= 0) return instance.data.maxVolume;

        let volume = 0;
        if (instance.data.maxVolumeRadius > 0) {
            if (distance <= instance.data.maxVolumeRadius) {
                volume = 1;
            } else {
                const fadeDistance = instance.data.soundRadius - instance.data.maxVolumeRadius;
                const fadeProgress = (distance - instance.data.maxVolumeRadius) / fadeDistance;
                volume = apply_sound_function(instance.data.soundFunction, 1 - fadeProgress);
            }
        } else {
            const fadeProgress = distance / instance.data.soundRadius;
            volume = apply_sound_function(instance.data.soundFunction, 1 - fadeProgress);
        }

        return Math.max(0, Math.min(1, volume)) * instance.data.maxVolume;
    }

    function apply_sound_function(func: SoundFunctionType, progress: number): number {
        switch (func) {
            case SoundFunctionType.LINEAR:
                return progress;
            case SoundFunctionType.EXPONENTIAL:
                return Math.pow(progress, 2);
            case SoundFunctionType.QUADRATIC:
                return Math.pow(progress, 3);
            case SoundFunctionType.INVERSE_QUADRATIC:
                return 1 - Math.pow(1 - progress, 2);
            case SoundFunctionType.SMOOTH_STEP:
                return progress * progress * (3 - 2 * progress);
            default:
                return progress;
        }
    }

    function calculate_pan_by_distance(instance: SpatialSoundInstance, distance: number, listenerPos: vmath.vector3, soundPos: vmath.vector3): number {
        if (instance.data.panNormalizationDistance <= 0) return instance.data.pan;

        if (distance < instance.data.panNormalizationDistance) return instance.data.pan;

        const dx = soundPos.x - listenerPos.x;
        const dy = soundPos.y - listenerPos.y;
        const length = Math.sqrt(dx * dx + dy * dy);

        if (length == 0) return instance.data.pan;

        const pan = dx / length;
        return Math.max(-1, Math.min(1, pan));
    }

    function start_spatial_audio(url: string | hash): void {
        const instance = instances.get(url);
        if (!instance || instance.isSpatialActive) return;

        instance.currentVolume = 0;
        instance.isSpatialActive = true;

        sound.play(url, {
            gain: 0,
            pan: instance.data.pan,
            speed: instance.data.speed
        });

        // MeshInspector.force_refresh();
    }

    function stop_spatial_audio(url: string | hash): void {
        const instance = instances.get(url);
        if (!instance || !instance.isSpatialActive) return;

        sound.stop(url);

        instance.currentVolume = 0;
        instance.targetVolume = 0;
        instance.isSpatialActive = false;

        // MeshInspector.force_refresh();
    }

    function start_fade(url: string | hash, targetVolume: number, duration: number): void {
        const instance = instances.get(url);
        if (!instance) return;

        if (instance.fadeDuration > 0 && Math.abs(instance.targetVolume - targetVolume) < 0.001) {
            return;
        }

        instance.fadeStartVolume = instance.currentVolume;
        instance.targetVolume = targetVolume;
        instance.fadeStartTime = performance.now() / 1000;
        instance.fadeDuration = duration;
    }

    function update_fading(url: string | hash): void {
        const instance = instances.get(url);
        if (!instance || instance.fadeDuration <= 0) return;

        const currentTime = performance.now() / 1000;
        const fadeProgress = (currentTime - instance.fadeStartTime) / instance.fadeDuration;

        if (fadeProgress >= 1) {
            // NOTE: Затухание завершено
            instance.currentVolume = instance.targetVolume;
            instance.fadeDuration = 0;

            if (instance.isSpatialActive && instance.currentVolume <= 0) {
                stop_spatial_audio(url);
            }
        } else {
            const newVolume = instance.fadeStartVolume + (instance.targetVolume - instance.fadeStartVolume) * fadeProgress;
            instance.currentVolume = Math.max(0, newVolume);
        }

        if (instance.isSpatialActive) {
            sound.set_gain(url, instance.currentVolume);
        }
    }

    function set_sound_radius(url: string | hash, radius: number): void {
        const instance = instances.get(url);
        if (instance) {
            instance.data.soundRadius = Math.max(0, radius);
        }
    }

    function set_max_volume_radius(url: string | hash, radius: number): void {
        const instance = instances.get(url);
        if (instance) {
            instance.data.maxVolumeRadius = Math.max(0, radius);
        }
    }

    function set_pan_normalization_distance(url: string | hash, distance: number): void {
        const instance = instances.get(url);
        if (instance) {
            instance.data.panNormalizationDistance = Math.max(0, distance);
        }
    }

    function set_sound_function(url: string | hash, func: SoundFunctionType): void {
        const instance = instances.get(url);
        if (instance) {
            instance.data.soundFunction = func;
        }
    }

    function set_fade_in_time(url: string | hash, time: number): void {
        const instance = instances.get(url);
        if (instance) {
            instance.data.fadeInTime = Math.max(0, time);
        }
    }

    function set_fade_out_time(url: string | hash, time: number): void {
        const instance = instances.get(url);
        if (instance) {
            instance.data.fadeOutTime = Math.max(0, time);
        }
    }

    function set_max_volume(url: string | hash, maxVolume: number): void {
        const instance = instances.get(url);
        if (instance) {
            instance.data.maxVolume = Math.max(0, Math.min(2, maxVolume)); // Ограничиваем от 0 до 2
        }
    }

    function get_max_volume(url: string | hash): number {
        const instance = instances.get(url);
        return instance ? instance.data.maxVolume : DEFAULT_MAX_VOLUME;
    }

    function get_sound_radius(url: string | hash): number {
        const instance = instances.get(url);
        return instance ? instance.data.soundRadius : 0;
    }

    function get_max_volume_radius(url: string | hash): number {
        const instance = instances.get(url);
        return instance ? instance.data.maxVolumeRadius : 0;
    }

    function get_pan_normalization_distance(url: string | hash): number {
        const instance = instances.get(url);
        return instance ? instance.data.panNormalizationDistance : 0;
    }

    function get_sound_function(url: string | hash): SoundFunctionType {
        const instance = instances.get(url);
        return instance ? instance.data.soundFunction : SoundFunctionType.LINEAR;
    }

    function get_fade_in_time(url: string | hash): number {
        const instance = instances.get(url);
        return instance ? instance.data.fadeInTime : 0;
    }

    function get_fade_out_time(url: string | hash): number {
        const instance = instances.get(url);
        return instance ? instance.data.fadeOutTime : 0;
    }

    return {
        create_spatial_sound,
        remove_spatial_sound,
        set_listener_position,
        set_sound_radius,
        set_max_volume_radius,
        set_pan_normalization_distance,
        set_sound_function,
        set_fade_in_time,
        set_fade_out_time,
        set_max_volume,
        get_max_volume,
        get_sound_radius,
        get_max_volume_radius,
        get_pan_normalization_distance,
        get_sound_function,
        get_fade_in_time,
        get_fade_out_time,
        get_listener_position
    };
} 