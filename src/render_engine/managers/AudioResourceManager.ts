// Менеджер загрузки аудио-ресурсов

import { AudioLoader } from 'three';
import { get_file_name } from '../helpers/file';

export interface AudioResourceManagerConfig {
    get_project_url: () => (path: string) => string;
}

/**
 * Менеджер загрузки аудио-ресурсов.
 * Отвечает за предзагрузку и хранение AudioBuffer.
 */
export function create_audio_resource_manager(config: AudioResourceManagerConfig) {
    const audio_loader = new AudioLoader();
    const audios: { [name: string]: AudioBuffer } = {};

    /** Предзагрузка аудио файла */
    async function preload_audio(path: string) {
        const full_path = config.get_project_url()(path);
        const audio_buffer = await audio_loader.loadAsync(full_path);
        audios[get_file_name(full_path)] = audio_buffer;
    }

    /** Получение списка всех загруженных звуков */
    function get_all_sounds() {
        return Object.keys(audios);
    }

    /** Получение аудио-буфера по имени */
    function get_sound_buffer(name: string) {
        return audios[name];
    }

    return {
        preload_audio,
        get_all_sounds,
        get_sound_buffer
    };
}

export type IAudioResourceManager = ReturnType<typeof create_audio_resource_manager>;
