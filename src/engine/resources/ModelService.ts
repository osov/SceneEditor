// Сервис управления 3D моделями (FBX, GLTF, Collada)

import { AnimationClip, Group, LoadingManager, Object3D, Scene, SkinnedMesh } from 'three';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader';
import type { Collada } from 'three/examples/jsm/loaders/ColladaLoader';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { ColladaLoader } from 'three/examples/jsm/loaders/ColladaLoader';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { Services } from '@editor/core';
import { api } from '../../modules_editor/ClientAPI';
import { URL_PATHS } from '../../modules_editor/modules_editor_const';
import { get_file_name } from '../../render_engine/helpers/file';
import type { AnimationInfo, IModelService } from './model_types';

/**
 * Создаёт сервис управления 3D моделями
 */
export function ModelServiceCreate(
    get_project_url: (path: string) => string,
    project_name_getter: () => string
): IModelService {
    const models: { [name: string]: Object3D } = {};
    const animations: AnimationInfo[] = [];
    const manager = new LoadingManager();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('/libs/draco/');

    function get_model_name(path: string): string {
        let model_name = get_file_name(path);
        if (model_name.indexOf('@') > -1) {
            model_name = model_name.substring(0, model_name.indexOf('@'));
        }
        return model_name;
    }

    function has_skinned_mesh(mesh: Object3D): boolean {
        let is_model = false;
        mesh.traverse((m) => {
            if (m instanceof SkinnedMesh) {
                is_model = true;
            }
        });
        return is_model;
    }

    function add_animations(anim_list: AnimationClip[], model_path = ''): void {
        if (anim_list.length === 0) return;

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
            if (find_animation(cur_anim_name, model_name) !== null) {
                Services.logger.warn('animation exists already', cur_anim_name, model_name);
            }
            animations.push({ model: model_name, animation: cur_anim_name, clip });
        }
    }

    function find_animation(name_anim: string, model_name: string): AnimationInfo | null {
        const list_anim: AnimationInfo[] = [];
        for (const k in animations) {
            if (animations[k].animation === name_anim) {
                list_anim.push(animations[k]);
            }
        }
        if (list_anim.length > 0) {
            if (list_anim.length > 1) {
                Services.logger.warn('animation more 1:', list_anim, name_anim, model_name);
            }
            for (let i = 0; i < list_anim.length; i++) {
                const it = list_anim[i];
                if (it.model === model_name || it.model === '') {
                    return it;
                }
            }
            return list_anim[0];
        }
        return null;
    }

    async function preload_model(path: string): Promise<Group | Scene | null | undefined> {
        const model_name = get_model_name(path);
        const project_name = project_name_getter();

        const response = await api.GET(URL_PATHS.ASSETS + `/${project_name}${path}`);
        if (response === undefined || !response.ok) {
            Services.logger.error('Failed to load model:', path, 'Status:', response?.status);
            return;
        }

        if (path.toLowerCase().endsWith('.fbx')) {
            return new Promise<Group>((resolve) => {
                const loader = new FBXLoader(manager);
                loader.load(get_project_url(path), (mesh: Group) => {
                    if (model_name !== '') {
                        models[model_name] = mesh;
                    }
                    add_animations(mesh.animations, path);
                    resolve(mesh);
                });
            });
        } else if (path.toLowerCase().endsWith('.gltf') || path.toLowerCase().endsWith('.glb')) {
            return new Promise<Group>((resolve) => {
                const loader = new GLTFLoader(manager);
                loader.setDRACOLoader(dracoLoader);
                loader.load(get_project_url(path), (gltf: GLTF) => {
                    const has_mesh = has_skinned_mesh(gltf.scene);
                    if (has_mesh && model_name !== '') {
                        models[model_name] = gltf.scene;
                    }
                    add_animations(gltf.animations, path);
                    resolve(gltf.scene);
                });
            });
        } else if (path.toLowerCase().endsWith('.dae')) {
            return new Promise<Scene>((resolve) => {
                const loader = new ColladaLoader(manager);
                loader.load(get_project_url(path), (collada: Collada) => {
                    const has_mesh = has_skinned_mesh(collada.scene);
                    if (has_mesh) {
                        models[model_name] = collada.scene;
                    }
                    resolve(collada.scene);
                });
            });
        }

        Services.logger.error('Model not supported', path);
        return null;
    }

    function get_model(name: string): Object3D | undefined {
        return models[name];
    }

    function get_all_models(): string[] {
        return Object.keys(models);
    }

    function get_animations_by_model(model_name: string): AnimationInfo[] {
        const list: AnimationInfo[] = [];
        for (const k in animations) {
            if (animations[k].model === model_name) {
                list.push(animations[k]);
            }
        }
        return list;
    }

    function get_all_model_animations(model_name: string): string[] {
        return animations
            .filter((anim) => anim.model === model_name || anim.model === '')
            .map((anim) => anim.animation);
    }

    return {
        preload_model,
        get_model,
        get_all_models,
        get_model_name,
        has_skinned_mesh,
        find_animation,
        get_animations_by_model,
        get_all_model_animations
    };
}
