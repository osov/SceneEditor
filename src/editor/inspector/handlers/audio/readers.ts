/**
 * Функции чтения аудио свойств
 */

import type { ReadContext, ReadResult } from '../types';
import { is_audio_mesh, SoundFunctionType, SoundZoneType } from './types';

/** Чтение звука */
export function read_sound(context: ReadContext): ReadResult<string> {
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

/** Чтение громкости */
export function read_volume(context: ReadContext): ReadResult<number> {
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

/** Чтение loop */
export function read_loop(context: ReadContext): ReadResult<boolean> {
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

/** Чтение pan */
export function read_pan(context: ReadContext): ReadResult<number> {
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

/** Чтение speed */
export function read_speed(context: ReadContext): ReadResult<number> {
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

/** Чтение play/pause кнопки */
export function read_play_pause(context: ReadContext): ReadResult<() => void> {
    const { meshes } = context;

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

/** Чтение stop кнопки */
export function read_stop(context: ReadContext): ReadResult<() => void> {
    const { meshes } = context;

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

/** Чтение радиуса звука */
export function read_sound_radius(context: ReadContext): ReadResult<number> {
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

/** Чтение радиуса максимальной громкости */
export function read_max_volume_radius(context: ReadContext): ReadResult<number> {
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

/** Чтение нормализации pan */
export function read_pan_normalization(context: ReadContext): ReadResult<number> {
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

/** Чтение функции звука */
export function read_sound_function(context: ReadContext): ReadResult<SoundFunctionType> {
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

/** Чтение типа зоны */
export function read_zone_type(context: ReadContext): ReadResult<SoundZoneType> {
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

/** Чтение времени fade in */
export function read_fade_in_time(context: ReadContext): ReadResult<number> {
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

/** Чтение времени fade out */
export function read_fade_out_time(context: ReadContext): ReadResult<number> {
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

/** Чтение ширины прямоугольника */
export function read_rectangle_width(context: ReadContext): ReadResult<number> {
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

/** Чтение высоты прямоугольника */
export function read_rectangle_height(context: ReadContext): ReadResult<number> {
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

/** Чтение макс ширины прямоугольника */
export function read_rectangle_max_width(context: ReadContext): ReadResult<number> {
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

/** Чтение макс высоты прямоугольника */
export function read_rectangle_max_height(context: ReadContext): ReadResult<number> {
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
