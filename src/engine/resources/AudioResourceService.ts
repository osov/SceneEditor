// Сервис управления аудио ресурсами

import { AudioLoader } from 'three';
import { get_file_name } from '../../render_engine/helpers/file';
import type { IAudioResourceService } from './model_types';

/**
 * Создаёт сервис управления аудио ресурсами
 */
export function AudioResourceServiceCreate(
    get_project_url: (path: string) => string
): IAudioResourceService {
    const audio_loader = new AudioLoader();
    const audios: { [name: string]: AudioBuffer } = {};

    async function preload_audio(path: string): Promise<void> {
        const full_path = get_project_url(path);
        const audio_buffer = await audio_loader.loadAsync(full_path);
        audios[get_file_name(full_path)] = audio_buffer;
    }

    function get_sound_buffer(name: string): AudioBuffer | undefined {
        return audios[name];
    }

    function get_all_sounds(): string[] {
        return Object.keys(audios);
    }

    return {
        preload_audio,
        get_sound_buffer,
        get_all_sounds
    };
}
