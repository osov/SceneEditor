// Менеджер 3D моделей

import { AnimationClip, Group, LoadingManager, Object3D, Scene, SkinnedMesh } from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader';
import { ColladaLoader, type Collada } from 'three/examples/jsm/loaders/ColladaLoader';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { get_file_name } from '../helpers/file';
import { Services } from '@editor/core';
import { api } from '../../modules_editor/ClientAPI';
import { URL_PATHS } from '../../modules_editor/modules_editor_const';
import type { AnimationInfo } from './types';

export interface ModelManagerConfig {
    get_project_url: () => (path: string) => string;
    get_project_name: () => string;
}

/**
 * Менеджер 3D моделей.
 * Отвечает за загрузку FBX, GLTF, Collada моделей и анимаций.
 */
export function create_model_manager(config: ModelManagerConfig) {
    const models: { [name: string]: Object3D } = {};
    const animations: AnimationInfo[] = [];
    const manager = new LoadingManager();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('/libs/draco/');

    /** Получение имени модели из пути (без @ части для анимаций) */
    function get_model_name(path: string) {
        let model_name = get_file_name(path);
        if (model_name.indexOf('@') > -1)
            model_name = model_name.substring(0, model_name.indexOf('@'));
        return model_name;
    }

    /** Проверка наличия SkinnedMesh в объекте */
    function has_skinned_mesh(mesh: Object3D) {
        let is_model = false;
        mesh.traverse((m) => {
            if (m instanceof SkinnedMesh)
                is_model = true;
        });
        return is_model;
    }

    /** Поиск анимации по имени и модели */
    function find_animation(name_anim: string, model_name: string) {
        const list_anim = [];
        for (const k in animations) {
            if (animations[k].animation === name_anim)
                list_anim.push(animations[k]);
        }
        if (list_anim.length) {
            if (list_anim.length > 1)
                Services.logger.warn('animation more 1:', list_anim, name_anim, model_name);
            for (let i = 0; i < list_anim.length; i++) {
                const it = list_anim[i];
                if (it.model === model_name || it.model === '')
                    return it;
            }
            return list_anim[0];
        }
        return null;
    }

    /** Добавление анимаций из загруженной модели */
    function add_animations(anim_list: AnimationClip[], model_path = '') {
        if (anim_list.length) {
            const file_name = get_file_name(model_path);
            const model_name = get_model_name(model_path);
            let anim_name = file_name;
            if (file_name.indexOf('@') > -1) {
                anim_name = file_name.substring(file_name.indexOf('@') + 1);
            }
            // todo fix 1
            for (let i = 0; i < 1; i++) {
                const clip = anim_list[i];
                const cur_anim_name = anim_name;
                if (find_animation(cur_anim_name, model_name))
                    Services.logger.warn('animation exists already', cur_anim_name, model_name);
                animations.push({ model: model_name, animation: cur_anim_name, clip });
            }
        }
    }

    /** Предзагрузка модели */
    async function preload_model(path: string) {
        const model_name = get_model_name(path);
        const project_name = config.get_project_name();

        const response = await api.GET(URL_PATHS.ASSETS + `/${project_name}${path}`);
        if (!response || !response.ok) {
            Services.logger.error('[preload_model] Failed to check model:', path, 'Status:', response?.status);
            return;
        }

        // URL для загрузки через loader - кодируем пробелы и спецсимволы
        const load_url = config.get_project_url()(path)
            .split('/')
            .map(segment => encodeURIComponent(segment))
            .join('/');

        Services.logger.info('[preload_model] Loading model:', model_name, 'URL:', load_url, 'Animations in path:', path);

        if (path.toLowerCase().endsWith('.fbx')) {
            return new Promise<Group>((resolve, reject) => {
                const loader = new FBXLoader(manager);
                loader.load(
                    load_url,
                    (mesh: Group) => {
                        if (model_name !== '')
                            models[model_name] = mesh;
                        Services.logger.info('[preload_model] FBX loaded:', model_name, 'Animations count:', mesh.animations.length);
                        add_animations(mesh.animations, path);
                        resolve(mesh);
                    },
                    undefined,
                    (error: unknown) => {
                        Services.logger.error('[preload_model] FBX load error:', path, error);
                        reject(error);
                    }
                );
            });
        }
        else if (path.toLowerCase().endsWith('.gltf') || path.toLowerCase().endsWith('.glb')) {
            return new Promise<Group>((resolve, reject) => {
                const loader = new GLTFLoader(manager);
                loader.setDRACOLoader(dracoLoader);
                loader.load(
                    load_url,
                    (gltf: GLTF) => {
                        const has_mesh = has_skinned_mesh(gltf.scene);
                        if (has_mesh && model_name !== '')
                            models[model_name] = gltf.scene;
                        Services.logger.info('[preload_model] GLTF loaded:', model_name, 'Animations count:', gltf.animations.length);
                        add_animations(gltf.animations, path);
                        resolve(gltf.scene);
                    },
                    undefined,
                    (error: unknown) => {
                        Services.logger.error('[preload_model] GLTF load error:', path, error);
                        reject(error);
                    }
                );
            });
        }
        else if (path.toLowerCase().endsWith('.dae')) {
            return new Promise<Scene>((resolve, reject) => {
                const loader = new ColladaLoader(manager);
                loader.load(
                    load_url,
                    (collada: Collada) => {
                        const has_mesh = has_skinned_mesh(collada.scene);
                        if (has_mesh)
                            models[model_name] = collada.scene;
                        Services.logger.info('[preload_model] Collada loaded:', model_name);
                        resolve(collada.scene);
                    },
                    undefined,
                    (error: unknown) => {
                        Services.logger.error('[preload_model] Collada load error:', path, error);
                        reject(error);
                    }
                );
            });
        }
        Services.logger.error('[preload_model] Model format not supported:', path);
        return null;
    }

    /** Получение модели по имени */
    function get_model(name: string) {
        return models[name];
    }

    /** Получение списка всех моделей */
    function get_all_models() {
        return Object.keys(models);
    }

    /** Получение списка анимаций для модели */
    function get_all_model_animations(model_name: string) {
        return animations.filter((animation) => animation.model === model_name || animation.model === '').map((animation) => animation.animation);
    }

    /** Получение информации об анимациях модели */
    function get_animations_by_model(model_name: string) {
        const list: AnimationInfo[] = [];
        for (const k in animations) {
            if (animations[k].model === model_name)
                list.push(animations[k]);
        }
        return list;
    }

    return {
        preload_model,
        get_model,
        get_all_models,
        get_all_model_animations,
        find_animation,
        get_animations_by_model,
        // Для обратной совместимости экспортируем внутренние объекты
        models,
        animations
    };
}

export type IModelManager = ReturnType<typeof create_model_manager>;
