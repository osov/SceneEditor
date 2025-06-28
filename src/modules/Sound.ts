import '../defold/vmath';
import { calculate_distance_2d } from './utils';


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

interface SoundData {
    soundRadius: number;
    maxVolume: number;
    maxVolumeRadius: number;
    panNormalizationDistance: number;
    soundFunction: SoundFunctionType;
    fadeInTime: number;
    fadeOutTime: number;
    speed: number;
    pan: number;
    loop: boolean;
}

interface SoundInstance {
    url: string | hash;
    data: SoundData;
    currentVolume: number;
    targetVolume: number;
    fadeStartVolume: number;
    fadeStartTime: number;
    fadeDuration: number;
    forceControl: boolean;
    isActive: boolean;
    isEnabled: boolean;
}

declare global {
    const Sound: ReturnType<typeof SoundModule>;
}

export function register_sound() {
    (window as any).Sound = SoundModule();
}

function SoundModule() {
    // TODO: найти лучший способ хранения с ключом hash без алокации, как вариант брать hash как number напрямую по id
    const instances = new Map<string | hash, SoundInstance>();
    let listenerPosition: vmath.vector3;

    function create(
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

        const instance: SoundInstance = {
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
                pan: sound.get_pan(url),
                loop: false
            },
            currentVolume: 0,
            targetVolume: 0,
            fadeStartVolume: 0,
            fadeStartTime: 0,
            fadeDuration: 0,
            forceControl: false,
            isActive: false,
            isEnabled: true
        };

        // NOTE: мы же можем использовать этот ивент для обновления ? как вариант вручную где-то потом вызывать update_sound
        EventBus.on('SYS_ON_UPDATE', () => update(url));

        instances.set(url, instance);

        return url;
    }

    function remove(url: string | hash): void {
        const instance = instances.get(url);

        if (instance) {
            stop(url);
            instances.delete(url);
            EventBus.off('SYS_ON_UPDATE', () => update(url));
        }
    }

    function update(url: string | hash): void {
        const instance = instances.get(url);
        if (!instance) {
            return;
        }

        if (!instance.isEnabled) {
            if (instance.isActive) {
                stop(url);
            }
            return;
        }

        // NOTE: Когда soundRadius = 0, звук работает как обычный звук без пространственных ограничений
        instance.forceControl = instance.data.soundRadius == 0;

        const listenerPosition = get_listener_position();
        const soundPosition = go.get_world_position(url);

        if (!soundPosition) {
            if (instance.isActive) {
                stop(url);
            }
            return;
        }

        const distance = calculate_distance_2d(listenerPosition, soundPosition);

        if (instance.data.soundRadius == 0) {
            handle_listener_in_range(url, 0, listenerPosition, soundPosition);
        } else if (distance <= instance.data.soundRadius) {
            handle_listener_in_range(url, distance, listenerPosition, soundPosition);
        } else {
            handle_listener_out_of_range(url);
        }

        update_fading(url);

        if (instance.data.soundRadius > 0 && distance > instance.data.soundRadius &&
            instance.currentVolume <= 0 && instance.isActive) {
            stop(url);
        }
    }

    function set_listener_position(position: vmath.vector3): void {
        listenerPosition = position;
    }

    function get_listener_position(): vmath.vector3 {
        return listenerPosition;
    }

    function handle_listener_in_range(url: string | hash, distance: number, listenerPos: vmath.vector3, soundPos: vmath.vector3): void {
        const instance = instances.get(url);
        if (!instance) return;

        const newTargetVolume = calculate_volume_by_distance(instance, distance);
        const pan = calculate_pan_by_distance(instance, distance, listenerPos, soundPos);

        sound.set_pan(url, pan);
        instance.data.pan = pan;

        if (!instance.forceControl && (!instance.isActive && newTargetVolume > 0)) {
            play(url);
        }

        if (Math.abs(newTargetVolume - instance.targetVolume) > 0.001) {
            instance.targetVolume = newTargetVolume;

            if (!instance.isActive && instance.targetVolume > 0) {
                instance.currentVolume = 0;
                start_fade(url, instance.targetVolume, instance.data.fadeInTime);
            } else if (instance.isActive) {
                start_fade(url, instance.targetVolume, instance.data.fadeInTime);
            }
        }
    }

    function handle_listener_out_of_range(url: string | hash): void {
        const instance = instances.get(url);
        if (!instance) return;

        if (instance.isActive && instance.targetVolume > 0) {
            instance.targetVolume = 0;
            start_fade(url, 0, instance.data.fadeOutTime);
        }

        if (!instance.isActive) {
            instance.currentVolume = 0;
            instance.targetVolume = 0;
        }
    }

    function calculate_volume_by_distance(instance: SoundInstance, distance: number): number {
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

    function calculate_pan_by_distance(instance: SoundInstance, distance: number, listenerPos: vmath.vector3, soundPos: vmath.vector3): number {
        if (instance.data.panNormalizationDistance <= 0) return instance.data.pan;

        if (distance < instance.data.panNormalizationDistance) return instance.data.pan;

        const dx = soundPos.x - listenerPos.x;
        const dy = soundPos.y - listenerPos.y;
        const length = Math.sqrt(dx * dx + dy * dy);

        if (length == 0) return instance.data.pan;

        const pan = dx / length;
        return Math.max(-1, Math.min(1, pan));
    }

    function play(url: string | hash): void {
        const instance = instances.get(url);
        if (!instance || instance.isActive) return;

        instance.currentVolume = 0;
        instance.isActive = true;

        if (instance.data.soundRadius == 0) {
            instance.targetVolume = instance.data.maxVolume;
            start_fade(url, instance.data.maxVolume, instance.data.fadeInTime);
        }

        sound.play(url, {
            gain: 0,
            pan: instance.data.pan,
            speed: instance.data.speed
        });
    }

    function stop(url: string | hash): void {
        const instance = instances.get(url);
        if (!instance || !instance.isActive) return;

        sound.stop(url);

        instance.currentVolume = 0;
        instance.targetVolume = 0;
        instance.isActive = false;
    }

    function start_fade(url: string | hash, targetVolume: number, duration: number): void {
        const instance = instances.get(url);
        if (!instance) return;

        if (instance.fadeDuration > 0 && Math.abs(instance.targetVolume - targetVolume) < 0.001) {
            return;
        }

        instance.fadeStartVolume = instance.currentVolume;
        instance.targetVolume = targetVolume;
        instance.fadeStartTime = System.now_with_ms();
        instance.fadeDuration = duration;
    }

    function update_fading(url: string | hash): void {
        const instance = instances.get(url);
        if (!instance || instance.fadeDuration <= 0) return;

        const currentTime = System.now_with_ms();
        const fadeProgress = (currentTime - instance.fadeStartTime) / instance.fadeDuration;

        if (fadeProgress >= 1) {
            // NOTE: Затухание завершено
            instance.currentVolume = instance.targetVolume;
            instance.fadeDuration = 0;

            if (instance.isActive && instance.currentVolume <= 0) {
                stop(url);
            }
        } else {
            const newVolume = instance.fadeStartVolume + (instance.targetVolume - instance.fadeStartVolume) * fadeProgress;
            instance.currentVolume = Math.max(0, newVolume);
        }

        if (instance.isActive) {
            sound.set_gain(url, instance.currentVolume);
        }
    }

    function set_sound_radius(url: string | hash, radius: number): void {
        const instance = instances.get(url);
        if (!instance) return;

        instance.data.soundRadius = Math.max(0, radius);
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
        if (!instance) return;

        instance.data.maxVolume = Math.max(0, Math.min(2, maxVolume));
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

    function is_sound_playing(url: string | hash): boolean {
        const instance = instances.get(url);
        return instance ? instance.isActive : false;
    }

    function set_sound_pan(url: string | hash, pan: number): void {
        const instance = instances.get(url);
        if (!instance) return;

        instance.data.pan = pan;
        sound.set_pan(url, pan);
    }

    function set_sound_speed(url: string | hash, speed: number): void {
        const instance = instances.get(url);
        if (!instance) return;

        instance.data.speed = speed;
        sound.set_speed(url, speed);
    }

    function set_sound_loop(url: string | hash, loop: boolean): void {
        const instance = instances.get(url);
        if (!instance) return;

        instance.data.loop = loop;
        const id = SceneManager.get_mesh_id_by_url(url as string);
        if (id != -1) {
            AudioManager.set_loop(id, loop);
        }
    }

    function set_active(url: string | hash, active: boolean): void {
        const instance = instances.get(url);
        if (!instance) return;

        instance.isEnabled = active;
    }

    return {
        create,
        remove,
        update,
        play,
        stop,
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
        get_listener_position,
        is_sound_playing,
        set_sound_pan,
        set_sound_speed,
        set_sound_loop,
        set_active
    };
} 