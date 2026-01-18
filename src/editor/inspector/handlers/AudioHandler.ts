/**
 * AudioHandler - обработчик аудио свойств
 *
 * Обрабатывает все аудио свойства:
 * - sound, volume, loop, pan, speed
 * - sound_radius, max_volume_radius
 * - sound_function, zone_type
 * - pan_normalization, fade_in_time, fade_out_time
 * - rectangle_width, rectangle_height, rectangle_max_width, rectangle_max_height
 */

import type { IBaseMeshAndThree } from '../../../render_engine/types';
import { Property } from '../../../core/inspector/IInspectable';
import { SoundFunctionType, SoundZoneType } from '../../../render_engine/objects/audio_mesh';
import {
    type IPropertyHandler,
    type ReadContext,
    type ReadResult,
    type UpdateContext,
    type HandlerParams,
} from './types';

/** Интерфейс для аудио mesh */
interface IAudioMesh extends IBaseMeshAndThree {
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

/** Создать AudioHandler */
export function create_audio_handler(_params?: HandlerParams): IPropertyHandler {
    const properties: Property[] = [
        Property.SOUND,
        Property.VOLUME,
        Property.LOOP,
        Property.PAN,
        Property.SPEED,
        Property.AUDIO_PLAY_PAUSE,
        Property.AUDIO_STOP,
        Property.SOUND_RADIUS,
        Property.MAX_VOLUME_RADIUS,
        Property.PAN_NORMALIZATION,
        Property.SOUND_FUNCTION,
        Property.ZONE_TYPE,
        Property.FADE_IN_TIME,
        Property.FADE_OUT_TIME,
        Property.RECTANGLE_WIDTH,
        Property.RECTANGLE_HEIGHT,
        Property.RECTANGLE_MAX_WIDTH,
        Property.RECTANGLE_MAX_HEIGHT,
    ];

    function read(property: Property, context: ReadContext): ReadResult<unknown> {
        switch (property) {
            case Property.SOUND:
                return read_sound(context);
            case Property.VOLUME:
                return read_volume(context);
            case Property.LOOP:
                return read_loop(context);
            case Property.PAN:
                return read_pan(context);
            case Property.SPEED:
                return read_speed(context);
            case Property.AUDIO_PLAY_PAUSE:
                return read_play_pause(context);
            case Property.AUDIO_STOP:
                return read_stop(context);
            case Property.SOUND_RADIUS:
                return read_sound_radius(context);
            case Property.MAX_VOLUME_RADIUS:
                return read_max_volume_radius(context);
            case Property.PAN_NORMALIZATION:
                return read_pan_normalization(context);
            case Property.SOUND_FUNCTION:
                return read_sound_function(context);
            case Property.ZONE_TYPE:
                return read_zone_type(context);
            case Property.FADE_IN_TIME:
                return read_fade_in_time(context);
            case Property.FADE_OUT_TIME:
                return read_fade_out_time(context);
            case Property.RECTANGLE_WIDTH:
                return read_rectangle_width(context);
            case Property.RECTANGLE_HEIGHT:
                return read_rectangle_height(context);
            case Property.RECTANGLE_MAX_WIDTH:
                return read_rectangle_max_width(context);
            case Property.RECTANGLE_MAX_HEIGHT:
                return read_rectangle_max_height(context);
            default:
                return { value: undefined, values_by_id: new Map(), has_differences: false };
        }
    }

    function update(property: Property, context: UpdateContext): void {
        switch (property) {
            case Property.SOUND:
                update_sound(context);
                break;
            case Property.VOLUME:
                update_volume(context);
                break;
            case Property.LOOP:
                update_loop(context);
                break;
            case Property.PAN:
                update_pan(context);
                break;
            case Property.SPEED:
                update_speed(context);
                break;
            case Property.AUDIO_PLAY_PAUSE:
                update_play_pause(context);
                break;
            case Property.AUDIO_STOP:
                update_stop(context);
                break;
            case Property.SOUND_RADIUS:
                update_sound_radius(context);
                break;
            case Property.MAX_VOLUME_RADIUS:
                update_max_volume_radius(context);
                break;
            case Property.PAN_NORMALIZATION:
                update_pan_normalization(context);
                break;
            case Property.SOUND_FUNCTION:
                update_sound_function(context);
                break;
            case Property.ZONE_TYPE:
                update_zone_type(context);
                break;
            case Property.FADE_IN_TIME:
                update_fade_in_time(context);
                break;
            case Property.FADE_OUT_TIME:
                update_fade_out_time(context);
                break;
            case Property.RECTANGLE_WIDTH:
                update_rectangle_width(context);
                break;
            case Property.RECTANGLE_HEIGHT:
                update_rectangle_height(context);
                break;
            case Property.RECTANGLE_MAX_WIDTH:
                update_rectangle_max_width(context);
                break;
            case Property.RECTANGLE_MAX_HEIGHT:
                update_rectangle_max_height(context);
                break;
        }
    }

    function is_audio_mesh(mesh: IBaseMeshAndThree): mesh is IAudioMesh {
        return typeof (mesh as IAudioMesh).get_sound === 'function';
    }

    // === Sound ===

    function read_sound(context: ReadContext): ReadResult<string> {
        const { meshes } = context;
        const values_by_id = new Map<number, string>();

        let first_sound: string | undefined;
        let has_differences = false;

        for (const mesh of meshes) {
            if (!is_audio_mesh(mesh)) continue;

            const sound = mesh.get_sound();
            values_by_id.set(mesh.mesh_data.id, sound);

            if (first_sound === undefined) {
                first_sound = sound;
            } else if (first_sound !== sound) {
                has_differences = true;
            }
        }

        return {
            value: has_differences ? undefined : first_sound,
            values_by_id,
            has_differences,
        };
    }

    function update_sound(context: UpdateContext): void {
        const { meshes, value } = context;
        const sound = value as string;

        for (const mesh of meshes) {
            if (!is_audio_mesh(mesh)) continue;
            mesh.set_sound(sound);
        }
    }

    // === Volume ===

    function read_volume(context: ReadContext): ReadResult<number> {
        const { meshes } = context;
        const values_by_id = new Map<number, number>();

        let first_volume: number | undefined;
        let has_differences = false;

        for (const mesh of meshes) {
            if (!is_audio_mesh(mesh)) continue;

            const volume = mesh.get_volume();
            values_by_id.set(mesh.mesh_data.id, volume);

            if (first_volume === undefined) {
                first_volume = volume;
            } else if (Math.abs(first_volume - volume) > 0.001) {
                has_differences = true;
            }
        }

        return {
            value: has_differences ? undefined : first_volume,
            values_by_id,
            has_differences,
        };
    }

    function update_volume(context: UpdateContext): void {
        const { meshes, value } = context;
        const volume = value as number;

        for (const mesh of meshes) {
            if (!is_audio_mesh(mesh)) continue;
            mesh.set_volume(volume);
        }
    }

    // === Loop ===

    function read_loop(context: ReadContext): ReadResult<boolean> {
        const { meshes } = context;
        const values_by_id = new Map<number, boolean>();

        let first_loop: boolean | undefined;
        let has_differences = false;

        for (const mesh of meshes) {
            if (!is_audio_mesh(mesh)) continue;

            const loop = mesh.get_loop();
            values_by_id.set(mesh.mesh_data.id, loop);

            if (first_loop === undefined) {
                first_loop = loop;
            } else if (first_loop !== loop) {
                has_differences = true;
            }
        }

        return {
            value: has_differences ? undefined : first_loop,
            values_by_id,
            has_differences,
        };
    }

    function update_loop(context: UpdateContext): void {
        const { meshes, value } = context;
        const loop = value as boolean;

        for (const mesh of meshes) {
            if (!is_audio_mesh(mesh)) continue;
            mesh.set_loop(loop);
        }
    }

    // === Pan ===

    function read_pan(context: ReadContext): ReadResult<number> {
        const { meshes } = context;
        const values_by_id = new Map<number, number>();

        let first_pan: number | undefined;
        let has_differences = false;

        for (const mesh of meshes) {
            if (!is_audio_mesh(mesh)) continue;

            const pan = mesh.get_pan();
            values_by_id.set(mesh.mesh_data.id, pan);

            if (first_pan === undefined) {
                first_pan = pan;
            } else if (Math.abs(first_pan - pan) > 0.001) {
                has_differences = true;
            }
        }

        return {
            value: has_differences ? undefined : first_pan,
            values_by_id,
            has_differences,
        };
    }

    function update_pan(context: UpdateContext): void {
        const { meshes, value } = context;
        const pan = value as number;

        for (const mesh of meshes) {
            if (!is_audio_mesh(mesh)) continue;
            mesh.set_pan(pan);
        }
    }

    // === Speed ===

    function read_speed(context: ReadContext): ReadResult<number> {
        const { meshes } = context;
        const values_by_id = new Map<number, number>();

        let first_speed: number | undefined;
        let has_differences = false;

        for (const mesh of meshes) {
            if (!is_audio_mesh(mesh)) continue;

            const speed = mesh.get_speed();
            values_by_id.set(mesh.mesh_data.id, speed);

            if (first_speed === undefined) {
                first_speed = speed;
            } else if (Math.abs(first_speed - speed) > 0.001) {
                has_differences = true;
            }
        }

        return {
            value: has_differences ? undefined : first_speed,
            values_by_id,
            has_differences,
        };
    }

    function update_speed(context: UpdateContext): void {
        const { meshes, value } = context;
        const speed = value as number;

        for (const mesh of meshes) {
            if (!is_audio_mesh(mesh)) continue;
            mesh.set_speed(speed);
        }
    }

    // === Play/Stop Button ===
    // NOTE: Используем stop вместо pause, так как в звуковом модуле нет настоящей паузы

    function read_play_pause(context: ReadContext): ReadResult<() => void> {
        const { meshes } = context;

        // Для кнопки возвращаем callback функцию
        const callback = () => {
            for (const mesh of meshes) {
                if (!is_audio_mesh(mesh)) continue;
                if (mesh.is_playing()) {
                    mesh.stop();
                } else {
                    mesh.play();
                }
            }
        };

        return {
            value: callback,
            values_by_id: new Map(),
            has_differences: false,
        };
    }

    function update_play_pause(context: UpdateContext): void {
        // Кнопка не обновляет значения - вызов происходит через callback из read
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

    // === Stop Button ===

    function read_stop(context: ReadContext): ReadResult<() => void> {
        const { meshes } = context;

        // Для кнопки возвращаем callback функцию
        const callback = () => {
            for (const mesh of meshes) {
                if (!is_audio_mesh(mesh)) continue;
                mesh.stop();
            }
        };

        return {
            value: callback,
            values_by_id: new Map(),
            has_differences: false,
        };
    }

    function update_stop(context: UpdateContext): void {
        // Кнопка не обновляет значения - вызов происходит через callback из read
        const { meshes } = context;
        for (const mesh of meshes) {
            if (!is_audio_mesh(mesh)) continue;
            mesh.stop();
        }
    }

    // === Sound Radius ===

    function read_sound_radius(context: ReadContext): ReadResult<number> {
        const { meshes } = context;
        const values_by_id = new Map<number, number>();

        let first_radius: number | undefined;
        let has_differences = false;

        for (const mesh of meshes) {
            if (!is_audio_mesh(mesh)) continue;

            const radius = mesh.get_sound_radius();
            values_by_id.set(mesh.mesh_data.id, radius);

            if (first_radius === undefined) {
                first_radius = radius;
            } else if (Math.abs(first_radius - radius) > 0.001) {
                has_differences = true;
            }
        }

        return {
            value: has_differences ? undefined : first_radius,
            values_by_id,
            has_differences,
        };
    }

    function update_sound_radius(context: UpdateContext): void {
        const { meshes, value } = context;
        const radius = value as number;

        for (const mesh of meshes) {
            if (!is_audio_mesh(mesh)) continue;
            mesh.set_sound_radius(radius);
        }
    }

    // === Max Volume Radius ===

    function read_max_volume_radius(context: ReadContext): ReadResult<number> {
        const { meshes } = context;
        const values_by_id = new Map<number, number>();

        let first_radius: number | undefined;
        let has_differences = false;

        for (const mesh of meshes) {
            if (!is_audio_mesh(mesh)) continue;

            const radius = mesh.get_max_volume_radius();
            values_by_id.set(mesh.mesh_data.id, radius);

            if (first_radius === undefined) {
                first_radius = radius;
            } else if (Math.abs(first_radius - radius) > 0.001) {
                has_differences = true;
            }
        }

        return {
            value: has_differences ? undefined : first_radius,
            values_by_id,
            has_differences,
        };
    }

    function update_max_volume_radius(context: UpdateContext): void {
        const { meshes, value } = context;
        const radius = value as number;

        for (const mesh of meshes) {
            if (!is_audio_mesh(mesh)) continue;
            mesh.set_max_volume_radius(radius);
        }
    }

    // === Pan Normalization ===

    function read_pan_normalization(context: ReadContext): ReadResult<number> {
        const { meshes } = context;
        const values_by_id = new Map<number, number>();

        let first_value: number | undefined;
        let has_differences = false;

        for (const mesh of meshes) {
            if (!is_audio_mesh(mesh)) continue;

            const distance = mesh.get_pan_normalization_distance();
            values_by_id.set(mesh.mesh_data.id, distance);

            if (first_value === undefined) {
                first_value = distance;
            } else if (Math.abs(first_value - distance) > 0.001) {
                has_differences = true;
            }
        }

        return {
            value: has_differences ? undefined : first_value,
            values_by_id,
            has_differences,
        };
    }

    function update_pan_normalization(context: UpdateContext): void {
        const { meshes, value } = context;
        const distance = value as number;

        for (const mesh of meshes) {
            if (!is_audio_mesh(mesh)) continue;
            mesh.set_pan_normalization_distance(distance);
        }
    }

    // === Sound Function ===

    function read_sound_function(context: ReadContext): ReadResult<SoundFunctionType> {
        const { meshes } = context;
        const values_by_id = new Map<number, SoundFunctionType>();

        let first_value: SoundFunctionType | undefined;
        let has_differences = false;

        for (const mesh of meshes) {
            if (!is_audio_mesh(mesh)) continue;

            const func = mesh.get_sound_function();
            values_by_id.set(mesh.mesh_data.id, func);

            if (first_value === undefined) {
                first_value = func;
            } else if (first_value !== func) {
                has_differences = true;
            }
        }

        return {
            value: has_differences ? undefined : first_value,
            values_by_id,
            has_differences,
        };
    }

    function update_sound_function(context: UpdateContext): void {
        const { meshes, value } = context;
        const func = value as SoundFunctionType;

        for (const mesh of meshes) {
            if (!is_audio_mesh(mesh)) continue;
            mesh.set_sound_function(func);
        }
    }

    // === Zone Type ===

    function read_zone_type(context: ReadContext): ReadResult<SoundZoneType> {
        const { meshes } = context;
        const values_by_id = new Map<number, SoundZoneType>();

        let first_value: SoundZoneType | undefined;
        let has_differences = false;

        for (const mesh of meshes) {
            if (!is_audio_mesh(mesh)) continue;

            const zone_type = mesh.get_zone_type();
            values_by_id.set(mesh.mesh_data.id, zone_type);

            if (first_value === undefined) {
                first_value = zone_type;
            } else if (first_value !== zone_type) {
                has_differences = true;
            }
        }

        return {
            value: has_differences ? undefined : first_value,
            values_by_id,
            has_differences,
        };
    }

    function update_zone_type(context: UpdateContext): void {
        const { meshes, value } = context;
        const zone_type = value as SoundZoneType;

        for (const mesh of meshes) {
            if (!is_audio_mesh(mesh)) continue;
            mesh.set_zone_type(zone_type);
        }
    }

    // === Fade In Time ===

    function read_fade_in_time(context: ReadContext): ReadResult<number> {
        const { meshes } = context;
        const values_by_id = new Map<number, number>();

        let first_value: number | undefined;
        let has_differences = false;

        for (const mesh of meshes) {
            if (!is_audio_mesh(mesh)) continue;

            const time = mesh.get_fade_in_time();
            values_by_id.set(mesh.mesh_data.id, time);

            if (first_value === undefined) {
                first_value = time;
            } else if (Math.abs(first_value - time) > 0.001) {
                has_differences = true;
            }
        }

        return {
            value: has_differences ? undefined : first_value,
            values_by_id,
            has_differences,
        };
    }

    function update_fade_in_time(context: UpdateContext): void {
        const { meshes, value } = context;
        const time = value as number;

        for (const mesh of meshes) {
            if (!is_audio_mesh(mesh)) continue;
            mesh.set_fade_in_time(time);
        }
    }

    // === Fade Out Time ===

    function read_fade_out_time(context: ReadContext): ReadResult<number> {
        const { meshes } = context;
        const values_by_id = new Map<number, number>();

        let first_value: number | undefined;
        let has_differences = false;

        for (const mesh of meshes) {
            if (!is_audio_mesh(mesh)) continue;

            const time = mesh.get_fade_out_time();
            values_by_id.set(mesh.mesh_data.id, time);

            if (first_value === undefined) {
                first_value = time;
            } else if (Math.abs(first_value - time) > 0.001) {
                has_differences = true;
            }
        }

        return {
            value: has_differences ? undefined : first_value,
            values_by_id,
            has_differences,
        };
    }

    function update_fade_out_time(context: UpdateContext): void {
        const { meshes, value } = context;
        const time = value as number;

        for (const mesh of meshes) {
            if (!is_audio_mesh(mesh)) continue;
            mesh.set_fade_out_time(time);
        }
    }

    // === Rectangle Width ===

    function read_rectangle_width(context: ReadContext): ReadResult<number> {
        const { meshes } = context;
        const values_by_id = new Map<number, number>();

        let first_value: number | undefined;
        let has_differences = false;

        for (const mesh of meshes) {
            if (!is_audio_mesh(mesh)) continue;

            const width = mesh.get_rectangle_width();
            values_by_id.set(mesh.mesh_data.id, width);

            if (first_value === undefined) {
                first_value = width;
            } else if (Math.abs(first_value - width) > 0.001) {
                has_differences = true;
            }
        }

        return {
            value: has_differences ? undefined : first_value,
            values_by_id,
            has_differences,
        };
    }

    function update_rectangle_width(context: UpdateContext): void {
        const { meshes, value } = context;
        const width = value as number;

        for (const mesh of meshes) {
            if (!is_audio_mesh(mesh)) continue;
            mesh.set_rectangle_width(width);
        }
    }

    // === Rectangle Height ===

    function read_rectangle_height(context: ReadContext): ReadResult<number> {
        const { meshes } = context;
        const values_by_id = new Map<number, number>();

        let first_value: number | undefined;
        let has_differences = false;

        for (const mesh of meshes) {
            if (!is_audio_mesh(mesh)) continue;

            const height = mesh.get_rectangle_height();
            values_by_id.set(mesh.mesh_data.id, height);

            if (first_value === undefined) {
                first_value = height;
            } else if (Math.abs(first_value - height) > 0.001) {
                has_differences = true;
            }
        }

        return {
            value: has_differences ? undefined : first_value,
            values_by_id,
            has_differences,
        };
    }

    function update_rectangle_height(context: UpdateContext): void {
        const { meshes, value } = context;
        const height = value as number;

        for (const mesh of meshes) {
            if (!is_audio_mesh(mesh)) continue;
            mesh.set_rectangle_height(height);
        }
    }

    // === Rectangle Max Width ===

    function read_rectangle_max_width(context: ReadContext): ReadResult<number> {
        const { meshes } = context;
        const values_by_id = new Map<number, number>();

        let first_value: number | undefined;
        let has_differences = false;

        for (const mesh of meshes) {
            if (!is_audio_mesh(mesh)) continue;

            const width = mesh.get_rectangle_max_volume_width();
            values_by_id.set(mesh.mesh_data.id, width);

            if (first_value === undefined) {
                first_value = width;
            } else if (Math.abs(first_value - width) > 0.001) {
                has_differences = true;
            }
        }

        return {
            value: has_differences ? undefined : first_value,
            values_by_id,
            has_differences,
        };
    }

    function update_rectangle_max_width(context: UpdateContext): void {
        const { meshes, value } = context;
        const width = value as number;

        for (const mesh of meshes) {
            if (!is_audio_mesh(mesh)) continue;
            mesh.set_rectangle_max_volume_width(width);
        }
    }

    // === Rectangle Max Height ===

    function read_rectangle_max_height(context: ReadContext): ReadResult<number> {
        const { meshes } = context;
        const values_by_id = new Map<number, number>();

        let first_value: number | undefined;
        let has_differences = false;

        for (const mesh of meshes) {
            if (!is_audio_mesh(mesh)) continue;

            const height = mesh.get_rectangle_max_volume_height();
            values_by_id.set(mesh.mesh_data.id, height);

            if (first_value === undefined) {
                first_value = height;
            } else if (Math.abs(first_value - height) > 0.001) {
                has_differences = true;
            }
        }

        return {
            value: has_differences ? undefined : first_value,
            values_by_id,
            has_differences,
        };
    }

    function update_rectangle_max_height(context: UpdateContext): void {
        const { meshes, value } = context;
        const height = value as number;

        for (const mesh of meshes) {
            if (!is_audio_mesh(mesh)) continue;
            mesh.set_rectangle_max_volume_height(height);
        }
    }

    return {
        properties,
        read,
        update,
    };
}
