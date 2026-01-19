// Типы для системы моделей и аудио ресурсов

import type { AnimationClip, Group, Object3D, Scene } from 'three';

/**
 * Информация об анимации модели
 */
export interface AnimationInfo {
    animation: string;
    model: string;
    clip: AnimationClip;
}

/**
 * Интерфейс сервиса моделей
 */
export interface IModelService {
    preload_model(path: string): Promise<Group | Scene | null | undefined>;
    get_model(name: string): Object3D | undefined;
    get_all_models(): string[];
    get_model_name(path: string): string;
    has_skinned_mesh(mesh: Object3D): boolean;
    find_animation(name: string, model: string): AnimationInfo | null;
    get_animations_by_model(model: string): AnimationInfo[];
    get_all_model_animations(model: string): string[];
}

/**
 * Интерфейс сервиса аудио ресурсов
 */
export interface IAudioResourceService {
    preload_audio(path: string): Promise<void>;
    get_sound_buffer(name: string): AudioBuffer | undefined;
    get_all_sounds(): string[];
}
