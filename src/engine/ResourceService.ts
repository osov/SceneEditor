/**
 * ResourceService - сервис управления ресурсами
 *
 * Загружает и кэширует текстуры, модели, аудио, материалы.
 * Работает с атласами текстур и шрифтами.
 */

import {
    TextureLoader,
    Texture,
    RepeatWrapping,
    AudioLoader,
} from 'three';
import type { Object3D } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import type { TextureInfo, MaterialInfo } from '@editor/core/render/types';
import type {
    IResourceService,
    ResourceServiceParams,
} from './types';

/** Создать ResourceService */
export function create_resource_service(params: ResourceServiceParams): IResourceService {
    const { logger, event_bus, project_path: initial_project_path } = params;

    // Внутреннее состояние
    let project_path = initial_project_path ?? '';

    // Кэши ресурсов
    const texture_cache = new Map<string, Texture>();
    const model_cache = new Map<string, Object3D>();
    const audio_cache = new Map<string, AudioBuffer>();
    const atlas_cache = new Map<string, Map<string, TextureInfo>>();
    const font_cache = new Map<string, string>();
    const material_cache = new Map<string, MaterialInfo>();

    // Лоадеры
    const texture_loader = new TextureLoader();
    const gltf_loader = new GLTFLoader();
    const fbx_loader = new FBXLoader();
    const audio_loader = new AudioLoader();

    async function load_texture(path: string): Promise<Texture> {
        // Проверяем кэш
        const cached = texture_cache.get(path);
        if (cached !== undefined) {
            return cached;
        }

        logger.debug(`Загрузка текстуры: ${path}`);

        return new Promise((resolve, reject) => {
            const full_path = project_path !== '' ? `${project_path}/${path}` : path;

            texture_loader.load(
                full_path,
                (texture) => {
                    texture.wrapS = RepeatWrapping;
                    texture.wrapT = RepeatWrapping;
                    texture_cache.set(path, texture);

                    event_bus.emit('resources:texture_loaded', { path });
                    resolve(texture);
                },
                undefined,
                (error) => {
                    logger.error(`Ошибка загрузки текстуры: ${path}`, error);
                    reject(error);
                }
            );
        });
    }

    function get_texture_from_atlas(atlas: string, name: string): TextureInfo | undefined {
        const atlas_textures = atlas_cache.get(atlas);
        if (atlas_textures === undefined) {
            return undefined;
        }
        return atlas_textures.get(name);
    }

    function get_atlas_textures(atlas: string): TextureInfo[] {
        const atlas_textures = atlas_cache.get(atlas);
        if (atlas_textures === undefined) {
            return [];
        }
        return Array.from(atlas_textures.values());
    }

    function get_atlases(): string[] {
        return Array.from(atlas_cache.keys());
    }

    async function load_model(path: string): Promise<Object3D> {
        // Проверяем кэш
        const cached = model_cache.get(path);
        if (cached !== undefined) {
            return cached.clone();
        }

        logger.debug(`Загрузка модели: ${path}`);

        const full_path = project_path !== '' ? `${project_path}/${path}` : path;
        const extension = path.split('.').pop()?.toLowerCase();

        return new Promise((resolve, reject) => {
            if (extension === 'gltf' || extension === 'glb') {
                gltf_loader.load(
                    full_path,
                    (gltf) => {
                        model_cache.set(path, gltf.scene);
                        event_bus.emit('resources:model_loaded', { path });
                        resolve(gltf.scene.clone());
                    },
                    undefined,
                    (error) => {
                        logger.error(`Ошибка загрузки модели: ${path}`, error);
                        reject(error);
                    }
                );
            } else if (extension === 'fbx') {
                fbx_loader.load(
                    full_path,
                    (object) => {
                        model_cache.set(path, object);
                        event_bus.emit('resources:model_loaded', { path });
                        resolve(object.clone());
                    },
                    undefined,
                    (error) => {
                        logger.error(`Ошибка загрузки модели: ${path}`, error);
                        reject(error);
                    }
                );
            } else {
                reject(new Error(`Неподдерживаемый формат модели: ${extension}`));
            }
        });
    }

    function get_model(name: string): Object3D | undefined {
        const model = model_cache.get(name);
        return model?.clone();
    }

    async function load_audio(path: string): Promise<AudioBuffer> {
        // Проверяем кэш
        const cached = audio_cache.get(path);
        if (cached !== undefined) {
            return cached;
        }

        logger.debug(`Загрузка аудио: ${path}`);

        const full_path = project_path !== '' ? `${project_path}/${path}` : path;

        return new Promise((resolve, reject) => {
            audio_loader.load(
                full_path,
                (buffer) => {
                    audio_cache.set(path, buffer);
                    event_bus.emit('resources:audio_loaded', { path });
                    resolve(buffer);
                },
                undefined,
                (error) => {
                    logger.error(`Ошибка загрузки аудио: ${path}`, error);
                    reject(error);
                }
            );
        });
    }

    function get_audio(name: string): AudioBuffer | undefined {
        return audio_cache.get(name);
    }

    function get_fonts(): string[] {
        return Array.from(font_cache.keys());
    }

    function get_font(name: string): string | undefined {
        return font_cache.get(name);
    }

    function get_material(name: string): MaterialInfo | undefined {
        return material_cache.get(name);
    }

    function get_materials(): MaterialInfo[] {
        return Array.from(material_cache.values());
    }

    function get_project_path(): string {
        return project_path;
    }

    function set_project_path(path: string): void {
        project_path = path;
        logger.info(`Путь к проекту: ${path}`);
        event_bus.emit('resources:project_path_changed', { path });
    }

    function dispose(): void {
        // Освобождаем текстуры
        for (const texture of texture_cache.values()) {
            texture.dispose();
        }
        texture_cache.clear();

        // Очищаем остальные кэши
        model_cache.clear();
        audio_cache.clear();
        atlas_cache.clear();
        font_cache.clear();
        material_cache.clear();

        logger.info('ResourceService освобождён');
    }

    return {
        load_texture,
        get_texture_from_atlas,
        get_atlas_textures,
        get_atlases,
        load_model,
        get_model,
        load_audio,
        get_audio,
        get_fonts,
        get_font,
        get_material,
        get_materials,
        get_project_path,
        set_project_path,
        dispose,
    };
}
