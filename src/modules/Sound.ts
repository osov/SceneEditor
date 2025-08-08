import { IBaseEntityAndThree } from '@editor/render_engine/types';
import '../defold/vmath';
import { calculate_distance_2d } from './utils';


export enum SoundFunctionType {
    LINEAR = 'linear',
    EXPONENTIAL = 'exponential',
    QUADRATIC = 'quadratic',
    INVERSE_QUADRATIC = 'inverse_quadratic',
    SMOOTH_STEP = 'smooth_step'
}

export enum SoundZoneType {
    CIRCULAR = 'circular',
    RECTANGULAR = 'rectangular'
}

const DEFAULT_SOUND_RADIUS = 0;
const DEFAULT_MAX_VOLUME = 1;
const DEFAULT_MAX_VOLUME_RADIUS = DEFAULT_SOUND_RADIUS;
const DEFAULT_PAN_NORMALIZATION_DISTANCE = 0;
const DEFAULT_FADE_IN_TIME = 1.0;
const DEFAULT_FADE_OUT_TIME = 1.0;
const DEFAULT_RECTANGLE_WIDTH = 0;
const DEFAULT_RECTANGLE_HEIGHT = 0;
const DEFAULT_RECTANGLE_MAX_VOLUME_WIDTH = DEFAULT_RECTANGLE_WIDTH;
const DEFAULT_RECTANGLE_MAX_VOLUME_HEIGHT = DEFAULT_RECTANGLE_HEIGHT;

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
    zoneType: SoundZoneType;
    rectangleWidth: number;
    rectangleHeight: number;
    rectangleMaxVolumeWidth: number;
    rectangleMaxVolumeHeight: number;
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
    off: boolean;
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
        fadeOutTime: number = DEFAULT_FADE_OUT_TIME,
        zoneType: SoundZoneType = SoundZoneType.CIRCULAR,
        rectangleWidth: number = DEFAULT_RECTANGLE_WIDTH,
        rectangleHeight: number = DEFAULT_RECTANGLE_HEIGHT,
        rectangleMaxVolumeWidth: number = DEFAULT_RECTANGLE_MAX_VOLUME_WIDTH,
        rectangleMaxVolumeHeight: number = DEFAULT_RECTANGLE_MAX_VOLUME_HEIGHT
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
                loop: false,
                zoneType,
                rectangleWidth: Math.max(0, rectangleWidth),
                rectangleHeight: Math.max(0, rectangleHeight),
                rectangleMaxVolumeWidth: Math.max(0, rectangleMaxVolumeWidth),
                rectangleMaxVolumeHeight: Math.max(0, rectangleMaxVolumeHeight)
            },
            currentVolume: 0,
            targetVolume: 0,
            fadeStartVolume: 0,
            fadeStartTime: 0,
            fadeDuration: 0,
            forceControl: false,
            isActive: false,
            isEnabled: true,
            off: true
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

        if (instance.off) {
            return;
        }

        if (!instance.isEnabled) {
            if (instance.isActive) {
                stop(url);
            }
            return;
        }

        // NOTE: Когда soundRadius = 0 и zoneType = CIRCULAR, звук работает как обычный звук без пространственных ограничений
        // NOTE: Когда rectangleWidth = 0 и rectangleHeight = 0 и zoneType = RECTANGULAR, звук работает как обычный звук без пространственных ограничений
        instance.forceControl = (instance.data.zoneType == SoundZoneType.CIRCULAR && instance.data.soundRadius == 0) ||
            (instance.data.zoneType == SoundZoneType.RECTANGULAR &&
                instance.data.rectangleWidth == 0 && instance.data.rectangleHeight == 0);

        const listenerPosition = get_listener_position();
        const soundPosition = go.get_world_position(url);

        if (!soundPosition) {
            if (instance.isActive) {
                stop(url);
            }
            return;
        }

        let distance = 0;
        let isInRange = false;

        if (instance.data.zoneType == SoundZoneType.CIRCULAR) {
            distance = calculate_distance_2d(listenerPosition, soundPosition);
            isInRange = instance.data.soundRadius == 0 || distance <= instance.data.soundRadius;
        } else if (instance.data.zoneType == SoundZoneType.RECTANGULAR) {
            const rectDistance = calculate_rectangle_distance(listenerPosition, soundPosition, instance.data);
            distance = rectDistance.distance;
            isInRange = (instance.data.rectangleWidth == 0 && instance.data.rectangleHeight == 0) || rectDistance.isInside;
        }

        if (isInRange) {
            handle_listener_in_range(url, distance, listenerPosition, soundPosition);
        } else {
            handle_listener_out_of_range(url);
        }

        update_fading(url);

        if (!isInRange && instance.currentVolume <= 0 && instance.isActive) {
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
        if (instance.data.zoneType == SoundZoneType.CIRCULAR) {
            return calculate_circular_volume(instance, distance);
        } else if (instance.data.zoneType == SoundZoneType.RECTANGULAR) {
            return calculate_rectangular_volume(instance, distance);
        }

        return instance.data.maxVolume;
    }

    function calculate_circular_volume(instance: SoundInstance, distance: number): number {
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

    function calculate_rectangular_volume(instance: SoundInstance, distance: number): number {
        const maxDimension = Math.max(instance.data.rectangleWidth, instance.data.rectangleHeight);

        if (maxDimension == 0) {
            return instance.data.maxVolume;
        }

        if (distance <= 0) return instance.data.maxVolume;

        let volume = 0;
        const maxVolumeDimension = Math.max(instance.data.rectangleMaxVolumeWidth, instance.data.rectangleMaxVolumeHeight);

        if (maxVolumeDimension > 0) {
            if (distance <= maxVolumeDimension) {
                volume = 1;
            } else {
                const fadeDistance = maxDimension / 2 - maxVolumeDimension / 2;
                const fadeProgress = (distance - maxVolumeDimension / 2) / fadeDistance;
                volume = apply_sound_function(instance.data.soundFunction, 1 - fadeProgress);
            }
        } else {
            const fadeProgress = distance / (maxDimension / 2);
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

    function calculate_rectangle_distance(listenerPos: vmath.vector3, soundPos: vmath.vector3, soundData: SoundData): { distance: number, isInside: boolean } {
        const halfWidth = soundData.rectangleWidth / 2;
        const halfHeight = soundData.rectangleHeight / 2;
        const halfMaxVolumeWidth = soundData.rectangleMaxVolumeWidth / 2;
        const halfMaxVolumeHeight = soundData.rectangleMaxVolumeHeight / 2;

        const dx = Math.abs(listenerPos.x - soundPos.x);
        const dy = Math.abs(listenerPos.y - soundPos.y);

        const isInside = dx <= halfWidth && dy <= halfHeight;

        if (soundData.rectangleMaxVolumeWidth > 0 && soundData.rectangleMaxVolumeHeight > 0) {
            if (dx <= halfMaxVolumeWidth && dy <= halfMaxVolumeHeight) {
                return { distance: 0, isInside: isInside };
            } else {
                const closestX = Math.max(0, dx - halfMaxVolumeWidth);
                const closestY = Math.max(0, dy - halfMaxVolumeHeight);
                const distance = Math.sqrt(closestX * closestX + closestY * closestY);
                return { distance, isInside: isInside };
            }
        } else {
            const distance = Math.sqrt(dx * dx + dy * dy);
            return { distance, isInside: isInside };
        }
    }

    function play(url: string | hash, complete_function?: () => void): void {
        const instance = instances.get(url);
        if (!instance || instance.isActive) return;

        instance.currentVolume = 0;
        instance.isActive = true;

        const isGlobalSound = (instance.data.zoneType == SoundZoneType.CIRCULAR && instance.data.soundRadius == 0) ||
            (instance.data.zoneType == SoundZoneType.RECTANGULAR &&
                instance.data.rectangleWidth == 0 && instance.data.rectangleHeight == 0);

        if (isGlobalSound) {
            instance.targetVolume = instance.data.maxVolume;
            start_fade(url, instance.data.maxVolume, instance.data.fadeInTime);
        }

        sound.play(url, {
            gain: 0,
            pan: instance.data.pan,
            speed: instance.data.speed
        }, (self: unknown, message_id: string, message: {
            play_id: number;
        }, sender: string) => {
            instance.isActive = false;
            if (message_id == "sound_done" && complete_function) {
                complete_function();
            }
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

    function set_zone_type(url: string | hash, zoneType: SoundZoneType): void {
        const instance = instances.get(url);
        if (!instance) return;

        instance.data.zoneType = zoneType;
    }

    function set_rectangle_width(url: string | hash, width: number): void {
        const instance = instances.get(url);
        if (!instance) return;

        instance.data.rectangleWidth = Math.max(0, width);
    }

    function set_rectangle_height(url: string | hash, height: number): void {
        const instance = instances.get(url);
        if (!instance) return;

        instance.data.rectangleHeight = Math.max(0, height);
    }

    function set_rectangle_max_volume_width(url: string | hash, width: number): void {
        const instance = instances.get(url);
        if (!instance) return;

        instance.data.rectangleMaxVolumeWidth = Math.max(0, width);
    }

    function set_rectangle_max_volume_height(url: string | hash, height: number): void {
        const instance = instances.get(url);
        if (!instance) return;

        instance.data.rectangleMaxVolumeHeight = Math.max(0, height);
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

    function get_zone_type(url: string | hash): SoundZoneType {
        const instance = instances.get(url);
        return instance ? instance.data.zoneType : SoundZoneType.CIRCULAR;
    }

    function get_rectangle_width(url: string | hash): number {
        const instance = instances.get(url);
        return instance ? instance.data.rectangleWidth : DEFAULT_RECTANGLE_WIDTH;
    }

    function get_rectangle_height(url: string | hash): number {
        const instance = instances.get(url);
        return instance ? instance.data.rectangleHeight : DEFAULT_RECTANGLE_HEIGHT;
    }

    function get_rectangle_max_volume_width(url: string | hash): number {
        const instance = instances.get(url);
        return instance ? instance.data.rectangleMaxVolumeWidth : 0;
    }

    function get_rectangle_max_volume_height(url: string | hash): number {
        const instance = instances.get(url);
        return instance ? instance.data.rectangleMaxVolumeHeight : 0;
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

    function set_off(url: string | hash, state: boolean): void {
        const instance = instances.get(url);
        if (!instance) return;

        instance.off = state;

        if (state) {
            stop(url);
        }
    }

    function is_off(url: string | hash): boolean {
        const instance = instances.get(url);
        return !instance || instance.off;
    }

    return {
        create,
        remove,
        update,
        play,
        stop,
        set_listener_position,
        set_sound_radius,
        set_zone_type,
        set_rectangle_width,
        set_rectangle_height,
        set_rectangle_max_volume_width,
        set_rectangle_max_volume_height,
        set_max_volume_radius,
        set_pan_normalization_distance,
        set_sound_function,
        set_fade_in_time,
        set_fade_out_time,
        set_max_volume,
        get_max_volume,
        get_sound_radius,
        get_zone_type,
        get_rectangle_width,
        get_rectangle_height,
        get_rectangle_max_volume_width,
        get_rectangle_max_volume_height,
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
        set_active,
        set_off,
        is_off
    };
} 