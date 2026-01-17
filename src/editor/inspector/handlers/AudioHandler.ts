/**
 * AudioHandler - обработчик аудио свойств
 *
 * Обрабатывает: sound, volume, loop, pan, speed, sound_radius
 */

import type { IBaseMeshAndThree } from '../../../render_engine/types';
import { Property } from '../../../core/inspector/IInspectable';
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
}

/** Создать AudioHandler */
export function create_audio_handler(_params?: HandlerParams): IPropertyHandler {
    const properties: Property[] = [
        Property.SOUND,
        Property.VOLUME,
        Property.LOOP,
        Property.PAN,
        Property.SPEED,
        Property.SOUND_RADIUS,
        Property.MAX_VOLUME_RADIUS,
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
            case Property.SOUND_RADIUS:
                return read_sound_radius(context);
            case Property.MAX_VOLUME_RADIUS:
                return read_max_volume_radius(context);
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
            case Property.SOUND_RADIUS:
                update_sound_radius(context);
                break;
            case Property.MAX_VOLUME_RADIUS:
                update_max_volume_radius(context);
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

    return {
        properties,
        read,
        update,
    };
}
