// Менеджер материалов

import { IUniform, ShaderMaterial, Texture, Vector2, Vector3, Vector4 } from 'three';
import { copy_material } from '../helpers/material';
import { get_file_name } from '../helpers/file';
import { shader } from '../objects/slice9';
import { deepClone, getObjectHash, hexToRGB, rgbToHex } from '../../modules/utils';
import { Slice9Mesh } from '../objects/slice9';
import { MultipleMaterialMesh } from '../objects/multiple_material_mesh';
import { get_asset_control } from '@editor/controls/AssetControl';
import { Services } from '@editor/core';
import { IS_LOGGING } from '@editor/config';
import type { MaterialInfo, MaterialUniformType as MaterialUniformTypeEnum } from './types';

// Re-export enum для совместимости
export { MaterialUniformType } from './types';

export interface MaterialManagerDeps {
    get_texture: (name: string, atlas: string) => { texture: Texture };
    get_atlas_by_texture_name: (name: string) => string | null;
    get_vertex_program: (path: string) => string | undefined;
    get_fragment_program: (path: string) => string | undefined;
    process_shader_includes: (shader_source: string) => string;
}

/**
 * Менеджер материалов.
 * Отвечает за загрузку, управление и копирование материалов.
 */
export function create_material_manager(deps: MaterialManagerDeps) {
    const materials: { [name: string]: MaterialInfo } = {};

    /** Пути файлов которые были только что записаны и file change должен быть проигнорирован */
    const pending_self_writes = new Set<string>();

    function init() {
        create_default_materials();
    }

    /**
     * Создаёт встроенные материалы, которые всегда доступны без загрузки из файлов проекта.
     */
    function create_default_materials() {
        // Создаём default материал 'slice9' используя встроенные шейдеры
        const slice9_material = new ShaderMaterial({
            vertexShader: shader.vertexShader,
            fragmentShader: shader.fragmentShader,
            transparent: true,
            uniforms: {
                u_texture: { value: null },
                alpha: { value: 1.0 },
                u_color: { value: new Vector3(1, 1, 1) },
            },
        });
        slice9_material.name = 'slice9';

        const slice9_info: MaterialInfo = {
            name: 'slice9',
            path: '__builtin__/slice9.mtr',
            vertexShader: '__builtin__',
            fragmentShader: '__builtin__',
            uniforms: {
                u_texture: {
                    type: 'sampler2D' as MaterialUniformTypeEnum,
                    params: {},
                    readonly: false,
                    hide: true,
                },
                alpha: {
                    type: 'range' as MaterialUniformTypeEnum,
                    params: { min: 0, max: 1, step: 0.01 },
                    readonly: false,
                    hide: false,
                },
                u_color: {
                    type: 'color' as MaterialUniformTypeEnum,
                    params: {},
                    readonly: false,
                    hide: true,
                },
            },
            origin: '',
            instances: {},
            mesh_info_to_material_hashes: {},
            material_hash_to_meshes_info: {},
            material_hash_to_changed_uniforms: {},
        };

        // Вычисляем hash оригинального материала
        const hash_object = create_material_hash_object(slice9_material, slice9_info.uniforms);
        slice9_info.origin = getObjectHash(hash_object);

        slice9_info.instances[slice9_info.origin] = slice9_material;
        slice9_info.material_hash_to_meshes_info[slice9_info.origin] = [];

        materials['slice9'] = slice9_info;

        // Создаём builtin материал 'model' для 3D моделей
        create_builtin_material('model');

        // Создаём builtin материал 'anim_model' для анимированных моделей
        create_builtin_material('anim_model');
    }

    /**
     * Создаёт базовый builtin материал с простыми шейдерами.
     */
    function create_builtin_material(name: string) {
        const material = new ShaderMaterial({
            vertexShader: shader.vertexShader,
            fragmentShader: shader.fragmentShader,
            transparent: true,
            uniforms: {
                u_texture: { value: null },
                u_color: { value: new Vector3(1, 1, 1) },
            },
        });
        material.name = name;

        const info: MaterialInfo = {
            name,
            path: `__builtin__/${name}.mtr`,
            vertexShader: '__builtin__',
            fragmentShader: '__builtin__',
            uniforms: {
                u_texture: {
                    type: 'sampler2D' as MaterialUniformTypeEnum,
                    params: {},
                    readonly: false,
                    hide: true,
                },
                u_color: {
                    type: 'color' as MaterialUniformTypeEnum,
                    params: {},
                    readonly: false,
                    hide: false,
                },
            },
            origin: '',
            instances: {},
            mesh_info_to_material_hashes: {},
            material_hash_to_meshes_info: {},
            material_hash_to_changed_uniforms: {},
        };

        const hash_object = create_material_hash_object(material, info.uniforms);
        info.origin = getObjectHash(hash_object);

        info.instances[info.origin] = material;
        info.material_hash_to_meshes_info[info.origin] = [];

        materials[name] = info;
    }

    /**
     * Создаёт объект для вычисления хеша материала (без readonly юниформов)
     */
    function create_material_hash_object(
        material: ShaderMaterial,
        readonly_uniforms: Record<string, { readonly?: boolean }>
    ): Record<string, unknown> {
        const not_readonly_uniforms: { [uniform: string]: IUniform<unknown> } = {};
        Object.entries(material.uniforms).forEach(([key, uniform]) => {
            if (readonly_uniforms[key]?.readonly) {
                return;
            }
            not_readonly_uniforms[key] = uniform;
        });

        return {
            blending: material.blending,
            uniforms: not_readonly_uniforms,
            defines: material.defines,
            depthTest: material.depthTest,
            stencilWrite: material.stencilWrite,
            stencilRef: material.stencilRef,
            stencilFunc: material.stencilFunc,
            stencilZPass: material.stencilZPass,
            colorWrite: material.colorWrite,
        };
    }

    /**
     * Вычисляет хеш материала на основе его свойств
     */
    function get_material_hash(material: ShaderMaterial): string {
        const material_info = get_material_info(material.name);
        if (material_info === null) {
            Services.logger.error('Material info not found', material.name);
            return 'error';
        }

        const hash_object = create_material_hash_object(material, material_info.uniforms);
        return getObjectHash(hash_object);
    }

    /** Загрузка материала из файла */
    async function load_material(path: string) {
        const response = await get_asset_control().get_file_data(path);
        if (!response) {
            return;
        }

        const data = JSON.parse(response);

        const material_info = {} as MaterialInfo;
        const name = get_file_name(path);

        material_info.name = name;
        material_info.path = path;
        material_info.vertexShader = data.vertexShader;
        material_info.fragmentShader = data.fragmentShader;
        material_info.uniforms = {};
        material_info.instances = {};
        material_info.mesh_info_to_material_hashes = {};
        material_info.material_hash_to_meshes_info = {};
        material_info.material_hash_to_changed_uniforms = {};

        const material = new ShaderMaterial();
        material.name = material_info.name;

        // Получаем шейдеры и обрабатываем #include директивы
        const vertexShader = deps.get_vertex_program(data.vertexShader);
        Services.logger.info('[load_material]', name, 'vertexShader path:', data.vertexShader, 'loaded:', vertexShader !== undefined);
        const processedVertexShader = vertexShader !== undefined
            ? deps.process_shader_includes(vertexShader)
            : shader.vertexShader;
        Services.logger.info('[load_material]', name, 'processedVertexShader length:', processedVertexShader.length);
        material.vertexShader = processedVertexShader;

        const fragmentShader = deps.get_fragment_program(data.fragmentShader);
        Services.logger.info('[load_material]', name, 'fragmentShader path:', data.fragmentShader, 'loaded:', fragmentShader !== undefined);
        const processedFragmentShader = fragmentShader !== undefined
            ? deps.process_shader_includes(fragmentShader)
            : shader.fragmentShader;
        Services.logger.info('[load_material]', name, 'processedFragmentShader length:', processedFragmentShader.length);
        material.fragmentShader = processedFragmentShader;

        material.transparent = data.transparent;

        // Добавляем USE_SKINNING define если шейдер использует skinning
        if (vertexShader !== undefined && vertexShader.includes('#include <skinning')) {
            material.defines = material.defines || {};
            material.defines['USE_SKINNING'] = '';
            Services.logger.info('[load_material]', name, 'USE_SKINNING enabled');
        }

        Object.keys(data.uniforms).forEach((key) => {
            material_info.uniforms[key] = {
                type: data.uniforms[key].type,
                params: { ...data.uniforms[key].params },
                readonly: data.uniforms[key].readonly,
                hide: data.uniforms[key].hide
            };
            switch (data.uniforms[key].type) {
                case 'sampler2D':
                    const texture_name = get_file_name(data.data[key] || '');
                    const atlas = deps.get_atlas_by_texture_name(texture_name);
                    const texture_data = deps.get_texture(texture_name, atlas || '');
                    const result = { value: texture_data.texture } as IUniform<Texture>;
                    material.uniforms[key] = result;
                    break;
                case 'vec2':
                    material.uniforms[key] = { value: new Vector2(...data.data[key]) } as IUniform<Vector2>;
                    break;
                case 'vec3':
                    material.uniforms[key] = { value: new Vector3(...data.data[key]) } as IUniform<Vector3>;
                    break;
                case 'vec4':
                    material.uniforms[key] = { value: new Vector4(...data.data[key]) } as IUniform<Vector4>;
                    break;
                case 'color':
                    material.uniforms[key] = { value: hexToRGB(data.data[key]) } as IUniform<Vector3>;
                    break;
                default:
                    material.uniforms[key] = { value: data.data[key] };
                    break;
            }
        });

        const hash_object = create_material_hash_object(material, material_info.uniforms);
        material_info.origin = getObjectHash(hash_object);

        material_info.instances[material_info.origin] = material;
        material_info.material_hash_to_meshes_info[material_info.origin] = [];

        return material_info;
    }

    /** Предзагрузка материала */
    async function preload_material(path: string) {
        Services.logger.info('[preload_material] Loading:', path);
        const name = get_file_name(path);

        if (has_material(name)) {
            if (is_builtin_material(name)) {
                Services.logger.info('[preload_material] Overwriting builtin material:', name, 'with project material:', path);
            } else {
                IS_LOGGING && Services.logger.warn('Material already exists', name, path);
                return materials[name];
            }
        }

        const material = await load_material(path);
        if (!material) {
            Services.logger.error('[preload_material] Failed to load:', path);
            return;
        }

        materials[name] = material;
        return material;
    }

    /** Получение информации о материале */
    function get_material_info(name: string) {
        const material_info = materials[name];
        if (!material_info) {
            Services.logger.error('Material info not found', name, materials);
            return null;
        }
        return material_info;
    }

    /** Проверка является ли hash оригинальным */
    function is_material_origin_hash(material_name: string, hash: string) {
        const material_info = get_material_info(material_name);
        if (!material_info) return false;
        return material_info.origin === hash;
    }

    /** Получение материала по хешу */
    function get_material_by_hash(material_name: string, hash: string) {
        const material_info = get_material_info(material_name);
        if (!material_info) return null;
        const material = material_info.instances[hash];
        if (!material) {
            Services.logger.error('Material by hash not found', hash, material_info);
            return null;
        }
        return material;
    }

    /** Получение хеша материала по ID меша */
    function get_material_hash_by_mesh_id(material_name: string, mesh_id: number, index = 0) {
        const material_info = get_material_info(material_name);
        if (!material_info) return null;
        const hash = material_info.mesh_info_to_material_hashes[mesh_id][index];
        if (!hash) {
            Services.logger.error('Material hash by mesh id not found', mesh_id, index, material_info);
            return null;
        }
        return hash;
    }

    /** Проверка есть ли материал для меша */
    function has_material_by_mesh_id(material_name: string, mesh_id: number, index = 0) {
        const material_info = get_material_info(material_name);
        if (!material_info || !material_info.mesh_info_to_material_hashes[mesh_id]) return false;
        return material_info.mesh_info_to_material_hashes[mesh_id][index] !== undefined;
    }

    /** Получение материала по ID меша */
    function get_material_by_mesh_id(material_name: string, mesh_id: number, index = 0) {
        const material_info = get_material_info(material_name);
        if (!material_info) return null;
        const hashes = material_info.mesh_info_to_material_hashes[mesh_id];
        if (!hashes || !hashes[index]) {
            if (!material_info.mesh_info_to_material_hashes[mesh_id]) {
                material_info.mesh_info_to_material_hashes[mesh_id] = [];
            }
            material_info.mesh_info_to_material_hashes[mesh_id][index] = material_info.origin;
            material_info.material_hash_to_meshes_info[material_info.origin].push({ id: mesh_id, index });
            return get_material_by_hash(material_name, material_info.origin);
        }
        return get_material_by_hash(material_name, hashes[index]);
    }

    // Вспомогательные функции для управления копиями

    function set_to_origin(material_info: MaterialInfo, mesh_id: number, index: number, hash: string) {
        const mesh_info_index = material_info.material_hash_to_meshes_info[hash].findIndex((mesh_info) => {
            return mesh_info.id === mesh_id && mesh_info.index === index;
        });
        if (mesh_info_index !== -1) {
            material_info.material_hash_to_meshes_info[hash].splice(mesh_info_index, 1);
            if (material_info.material_hash_to_meshes_info[hash].length === 0 && hash !== material_info.origin) {
                delete_material_instance(material_info, hash);
            }
        } else {
            Services.logger.error('Mesh id not found in material_hash_to_mesh_id', mesh_id, material_info);
        }
        if (!material_info.mesh_info_to_material_hashes[mesh_id]) {
            material_info.mesh_info_to_material_hashes[mesh_id] = [];
        }
        material_info.mesh_info_to_material_hashes[mesh_id][index] = material_info.origin;
        material_info.material_hash_to_meshes_info[material_info.origin].push({ id: mesh_id, index });
    }

    function set_to_existing_copy(material_info: MaterialInfo, mesh_id: number, index: number, new_hash: string, hash: string) {
        const mesh_info_index_new_hash = material_info.material_hash_to_meshes_info[new_hash].findIndex((mesh_info) => {
            return mesh_info.id === mesh_id && mesh_info.index === index;
        });
        if (mesh_info_index_new_hash !== -1) return;

        material_info.material_hash_to_meshes_info[new_hash].push({ id: mesh_id, index });

        if (!material_info.mesh_info_to_material_hashes[mesh_id]) {
            material_info.mesh_info_to_material_hashes[mesh_id] = [];
        }
        material_info.mesh_info_to_material_hashes[mesh_id][index] = new_hash;

        const mesh_info_index = material_info.material_hash_to_meshes_info[hash].findIndex((mesh_info) => {
            return mesh_info.id === mesh_id && mesh_info.index === index;
        });
        if (mesh_info_index !== -1) {
            material_info.material_hash_to_meshes_info[hash].splice(mesh_info_index, 1);
            if (material_info.material_hash_to_meshes_info[hash].length === 0 && hash !== material_info.origin && new_hash !== hash) {
                delete_material_instance(material_info, hash);
            }
        } else {
            Services.logger.error('Mesh id not found in material_hash_to_mesh_id', mesh_id, material_info);
        }
    }

    function set_to_new_copy(material_info: MaterialInfo, mesh_id: number, index: number, hash: string, new_hash: string, copy: ShaderMaterial) {
        material_info.instances[new_hash] = copy;

        if (!material_info.mesh_info_to_material_hashes[mesh_id]) {
            material_info.mesh_info_to_material_hashes[mesh_id] = [];
        }
        material_info.mesh_info_to_material_hashes[mesh_id][index] = new_hash;

        material_info.material_hash_to_meshes_info[new_hash] = [];
        material_info.material_hash_to_meshes_info[new_hash].push({ id: mesh_id, index });

        const copy_prev_changed_uniforms = deepClone(material_info.material_hash_to_changed_uniforms[hash] || []);
        material_info.material_hash_to_changed_uniforms[new_hash] = copy_prev_changed_uniforms;

        const mesh_info_index = material_info.material_hash_to_meshes_info[hash].findIndex((mesh_info) => {
            return mesh_info.id === mesh_id && mesh_info.index === index;
        });
        if (mesh_info_index !== -1) {
            material_info.material_hash_to_meshes_info[hash].splice(mesh_info_index, 1);
            if (material_info.material_hash_to_meshes_info[hash].length === 0 && hash !== material_info.origin) {
                delete_material_instance(material_info, hash);
            }
        } else {
            Services.logger.error('Mesh id not found in material_hash_to_mesh_id', mesh_id, material_info);
        }
    }

    function delete_material_instance(material_info: MaterialInfo, hash: string) {
        delete material_info.material_hash_to_changed_uniforms[hash];
        delete material_info.material_hash_to_meshes_info[hash];
        delete material_info.instances[hash];
    }

    // Установка uniform для меша

    function set_material_uniform<T>(material_info: MaterialInfo, mesh_id: number, index: number, uniform_name: string, value: T) {
        const uniform = material_info.uniforms[uniform_name];
        if (!uniform) {
            Services.logger.error('Uniform not found', uniform_name, material_info.name);
            return false;
        }

        if (uniform.readonly) {
            Services.logger.error('Uniform is readonly', uniform_name, material_info.name);
            return false;
        }

        const mesh_material = get_material_by_mesh_id(material_info.name, mesh_id, index);
        if (!mesh_material) return false;

        const hash = material_info.mesh_info_to_material_hashes[mesh_id][index];

        const mesh_material_copy = copy_material(mesh_material);
        mesh_material_copy.uniforms[uniform_name].value = value;

        const new_hash = get_material_hash(mesh_material_copy);

        if (material_info.origin === new_hash) {
            set_to_origin(material_info, mesh_id, index, hash);
            return true;
        }

        if (material_info.instances[new_hash]) {
            set_to_existing_copy(material_info, mesh_id, index, new_hash, hash);
            return true;
        }

        set_to_new_copy(material_info, mesh_id, index, hash, new_hash, mesh_material_copy);

        if (!material_info.material_hash_to_changed_uniforms[new_hash].includes(uniform_name)) {
            material_info.material_hash_to_changed_uniforms[new_hash].push(uniform_name);
        }

        return true;
    }

    function set_material_uniform_for_mesh<T>(mesh: Slice9Mesh, uniform_name: string, value: T) {
        const mesh_id = mesh.mesh_data.id;
        const material_name = mesh.material.name;

        const material_info = get_material_info(material_name);
        if (!material_info) return;

        if (set_material_uniform(material_info, mesh_id, 0, uniform_name, value)) {
            const new_material = get_material_by_mesh_id(material_info.name, mesh_id);
            if (new_material && mesh.material !== new_material) {
                mesh.material = new_material;
                mesh.material.needsUpdate = true;
            }
        }
    }

    function set_material_uniform_for_multiple_material_mesh<T>(mesh: MultipleMaterialMesh, index: number, uniform_name: string, value: T) {
        const mesh_materials = mesh.get_materials();
        Services.logger.info('[set_material_uniform_for_multiple_material_mesh] Setting', uniform_name, 'for mesh:', mesh.mesh_data.id, 'index:', index, 'materials count:', mesh_materials.length);
        if (mesh_materials.length <= index) {
            Services.logger.error('[set_material_uniform_for_multiple_material_mesh] Material index out of range:', index, 'materials.length:', mesh_materials.length);
            return;
        }

        const material_name = mesh_materials[index].name;
        const material_info = get_material_info(material_name);
        if (!material_info) return;

        if (set_material_uniform(material_info, mesh.mesh_data.id, index, uniform_name, value)) {
            mesh.set_material(material_info.name, index);
        }
    }

    // Установка uniform для оригинального материала

    async function set_material_uniform_for_original<T>(material_name: string, uniform_name: string, value: T, is_save = true) {
        const material_info = get_material_info(material_name);
        if (!material_info) return;

        const material = material_info.instances[material_info.origin];
        if (!material) return;

        if (material.uniforms[uniform_name] === undefined) return;

        material.uniforms[uniform_name].value = value;

        const is_readonly = material_info.uniforms[uniform_name].readonly;

        if (!is_readonly) {
            const new_origin_hash = get_material_hash(material);
            if (new_origin_hash !== material_info.origin) {
                material_info.instances[new_origin_hash] = material;
                delete material_info.instances[material_info.origin];

                material_info.material_hash_to_meshes_info[material_info.origin].forEach((mesh_info) => {
                    if (!material_info.mesh_info_to_material_hashes[mesh_info.id]) {
                        material_info.mesh_info_to_material_hashes[mesh_info.id] = [];
                    }
                    material_info.mesh_info_to_material_hashes[mesh_info.id][mesh_info.index] = new_origin_hash;
                });

                const mesh_ids = material_info.material_hash_to_meshes_info[material_info.origin];
                material_info.material_hash_to_meshes_info[new_origin_hash] = deepClone(mesh_ids);

                delete material_info.material_hash_to_meshes_info[material_info.origin];

                material_info.origin = new_origin_hash;
            }
        }

        // Обновляем копии которые не изменяли этот uniform
        Object.keys(material_info.instances).filter((hash) => hash !== material_info.origin).forEach((hash) => {
            const copy = get_material_by_hash(material_info.name, hash);
            if (!copy) return;

            const is_changed_uniform = material_info.material_hash_to_changed_uniforms[hash].includes(uniform_name);
            if (!is_changed_uniform) {
                copy.uniforms[uniform_name] = material.uniforms[uniform_name];

                if (!is_readonly) {
                    const new_hash = get_material_hash(copy);
                    if (new_hash !== hash) {
                        material_info.instances[new_hash] = copy;
                        delete material_info.instances[hash];

                        material_info.material_hash_to_meshes_info[hash].forEach((mesh_info) => {
                            if (!material_info.mesh_info_to_material_hashes[mesh_info.id]) {
                                material_info.mesh_info_to_material_hashes[mesh_info.id] = [];
                            }
                            material_info.mesh_info_to_material_hashes[mesh_info.id][mesh_info.index] = new_hash;
                        });

                        const mesh_ids = material_info.material_hash_to_meshes_info[hash];
                        material_info.material_hash_to_meshes_info[new_hash] = deepClone(mesh_ids);

                        delete material_info.material_hash_to_meshes_info[hash];

                        const changed_uniforms = material_info.material_hash_to_changed_uniforms[hash];
                        material_info.material_hash_to_changed_uniforms[new_hash] = deepClone(changed_uniforms);

                        delete material_info.material_hash_to_changed_uniforms[hash];
                    }
                }
            }
        });

        if (is_save && !is_readonly) {
            const response = await get_asset_control().get_file_data(material_info.path);
            if (!response) return;

            const material_data = JSON.parse(response);

            if (value instanceof Texture) {
                const texture_name = get_file_name(value.userData.path as string || '');
                const atlas = deps.get_atlas_by_texture_name(texture_name) || '';
                material_data.data[uniform_name] = `${atlas}/${texture_name}`;
            } else if (material_data.uniforms[uniform_name].type === 'color') {
                material_data.data[uniform_name] = rgbToHex(value as Vector3);
            } else {
                material_data.data[uniform_name] = value;
            }

            pending_self_writes.add(material_info.path);
            await get_asset_control().save_file_data(material_info.path, JSON.stringify(material_data, null, 2));
        }
    }

    // Установка шейдера для оригинального материала

    async function set_material_shader_for_original(material_name: string, shader_type: 'vertex' | 'fragment', shader_path: string) {
        const material_info = get_material_info(material_name);
        if (!material_info) return;

        if (shader_type === 'vertex') {
            material_info.vertexShader = shader_path;
        } else {
            material_info.fragmentShader = shader_path;
        }

        const shader_code = shader_type === 'vertex'
            ? deps.get_vertex_program(shader_path)
            : deps.get_fragment_program(shader_path);

        if (!shader_code) {
            Services.logger.error(`[set_material_shader_for_original] Shader not found: ${shader_path}`);
            return;
        }

        const origin = material_info.instances[material_info.origin];
        if (origin) {
            if (shader_type === 'vertex') {
                origin.vertexShader = shader_code;
            } else {
                origin.fragmentShader = shader_code;
            }
            origin.needsUpdate = true;
        }

        Object.keys(material_info.instances).filter((hash) => hash !== material_info.origin).forEach((hash) => {
            const copy = get_material_by_hash(material_info.name, hash);
            if (!copy) return;
            if (shader_type === 'vertex') {
                copy.vertexShader = shader_code;
            } else {
                copy.fragmentShader = shader_code;
            }
            copy.needsUpdate = true;
        });

        const response = await get_asset_control().get_file_data(material_info.path);
        if (!response) return;

        const material_data = JSON.parse(response);
        if (shader_type === 'vertex') {
            material_data.vertexShader = shader_path;
        } else {
            material_data.fragmentShader = shader_path;
        }
        pending_self_writes.add(material_info.path);
        await get_asset_control().save_file_data(material_info.path, JSON.stringify(material_data, null, 2));
    }

    // Установка property для меша

    function set_material_property(material_info: MaterialInfo, mesh_id: number, index: number, property_name: string, value: unknown) {
        const hash = get_material_hash_by_mesh_id(material_info.name, mesh_id, index);
        if (!hash) {
            return false;
        }

        const material = material_info.instances[hash];
        if (!material) {
            return false;
        }

        const copy = copy_material(material);
        (copy as unknown as Record<string, unknown>)[property_name] = value;

        const new_hash = get_material_hash(copy);

        if (new_hash === hash) {
            return false;
        }

        if (material_info.instances[new_hash]) {
            set_to_existing_copy(material_info, mesh_id, index, hash, new_hash);
            return true;
        }

        set_to_new_copy(material_info, mesh_id, index, hash, new_hash, copy);

        return true;
    }

    function set_material_property_for_mesh(mesh: Slice9Mesh, property_name: string, value: unknown) {
        const mesh_id = mesh.mesh_data.id;
        const material_name = mesh.material.name;

        const material_info = get_material_info(material_name);
        if (!material_info) return;

        if (set_material_property(material_info, mesh_id, 0, property_name, value)) {
            mesh.set_material(material_info.name);
        }
    }

    function set_material_property_for_multiple_mesh(mesh: MultipleMaterialMesh, index: number, property_name: string, value: unknown) {
        const material_name = mesh.get_materials()[index].name;
        const material_info = get_material_info(material_name);
        if (!material_info) return;

        if (set_material_property(material_info, mesh.mesh_data.id, index, property_name, value)) {
            mesh.set_material(material_info.name, index);
        }
    }

    // Установка define для меша

    function set_material_define<T>(material_info: MaterialInfo, mesh_id: number, index: number, define_name: string, value?: T) {
        const mesh_material = get_material_by_mesh_id(material_info.name, mesh_id, index);
        if (!mesh_material) return false;

        const hash = material_info.mesh_info_to_material_hashes[mesh_id][index];

        const material_copy = copy_material(mesh_material);

        if (value !== undefined) {
            if (material_copy.defines === undefined) {
                material_copy.defines = {};
            }
            material_copy.defines[define_name] = value;
        } else {
            if (material_copy.defines && material_copy.defines[define_name] !== undefined) {
                delete material_copy.defines[define_name];
            }
        }

        const new_hash = get_material_hash(material_copy);

        if (material_info.origin === new_hash) {
            set_to_origin(material_info, mesh_id, index, hash);
            return true;
        }

        if (material_info.instances[new_hash]) {
            set_to_existing_copy(material_info, mesh_id, index, new_hash, hash);
            return true;
        }

        set_to_new_copy(material_info, mesh_id, index, hash, new_hash, material_copy);

        return true;
    }

    function set_material_define_for_mesh<T>(mesh: Slice9Mesh, define_name: string, value?: T) {
        const mesh_id = mesh.mesh_data.id;
        const material_name = mesh.material.name;
        const material_info = get_material_info(material_name);
        if (!material_info) return;

        if (set_material_define(material_info, mesh_id, 0, define_name, value)) {
            mesh.set_material(material_info.name);
        }
    }

    function set_material_define_for_multiple_material_mesh<T>(mesh: MultipleMaterialMesh, index: number, define_name: string, value?: T) {
        const mesh_id = mesh.mesh_data.id;
        const material_name = mesh.get_materials()[index].name;
        const material_info = get_material_info(material_name);
        if (!material_info) return;

        if (set_material_define(material_info, mesh_id, index, define_name, value)) {
            mesh.set_material(material_info.name, index);
        }
    }

    // Отвязка материала от меша

    function unlink_material(material_info: MaterialInfo, mesh_id: number, index: number) {
        const hash = material_info.mesh_info_to_material_hashes[mesh_id][index];
        const mesh_info_index = material_info.material_hash_to_meshes_info[hash].findIndex((mesh_info) => {
            return mesh_info.id === mesh_id && mesh_info.index === index;
        });
        if (mesh_info_index !== -1) {
            material_info.material_hash_to_meshes_info[hash].splice(mesh_info_index, 1);
            if (material_info.material_hash_to_meshes_info[hash].length === 0 && hash !== material_info.origin) {
                delete material_info.material_hash_to_changed_uniforms[hash];
                delete material_info.material_hash_to_meshes_info[hash];
                delete material_info.instances[hash];
            }
        } else {
            Services.logger.error('Mesh id not found in material_hash_to_mesh_id', mesh_id, material_info);
        }
        material_info.mesh_info_to_material_hashes[mesh_id].splice(index, 1);
        if (material_info.mesh_info_to_material_hashes[mesh_id].length === 0) {
            delete material_info.mesh_info_to_material_hashes[mesh_id];
        }
    }

    function unlink_material_for_mesh(material_name: string, mesh_id: number) {
        const material_info = get_material_info(material_name);
        if (!material_info) return;
        unlink_material(material_info, mesh_id, 0);
    }

    function unlink_material_for_multiple_material_mesh(material_name: string, mesh_id: number, index: number) {
        const material_info = get_material_info(material_name);
        if (!material_info) return;
        unlink_material(material_info, mesh_id, index);
    }

    // Получение информации об униформах

    function get_changed_uniforms(material_info: MaterialInfo, mesh_id: number, index: number) {
        const hash = material_info.mesh_info_to_material_hashes[mesh_id][index];
        const changed_uniforms = material_info.material_hash_to_changed_uniforms[hash];
        const changed_uniforms_data: Record<string, unknown> = {};
        if (changed_uniforms) {
            for (const uniform_name of changed_uniforms) {
                if (material_info.instances[hash].uniforms[uniform_name]) {
                    const value = material_info.instances[hash].uniforms[uniform_name].value;
                    changed_uniforms_data[uniform_name] = value;
                }
            }
        }
        return changed_uniforms_data;
    }

    function get_changed_uniforms_for_mesh(mesh: Slice9Mesh) {
        const mesh_id = mesh.mesh_data.id;
        const material_name = mesh.material.name;
        const material_info = get_material_info(material_name);
        if (!material_info) return;
        return get_changed_uniforms(material_info, mesh_id, 0);
    }

    function get_changed_uniforms_for_multiple_material_mesh(mesh: MultipleMaterialMesh, index: number) {
        const mesh_id = mesh.mesh_data.id;
        const material_name = mesh.get_materials()[index].name;
        const material_info = get_material_info(material_name);
        if (!material_info) return;
        return get_changed_uniforms(material_info, mesh_id, index);
    }

    // Вспомогательные функции

    function get_all_materials() {
        return Object.keys(materials);
    }

    function has_material(name: string) {
        return materials[name] !== undefined;
    }

    function is_builtin_material(name: string): boolean {
        const material = materials[name];
        if (!material) return false;
        return material.path.startsWith('__builtin__');
    }

    function get_info_about_unique_materials() {
        const unique_materials: { [key: string]: { origin: string, copies: string[] } } = {};
        for (const material_name in materials) {
            const material_info = get_material_info(material_name);
            if (material_info) {
                unique_materials[material_name] = {
                    origin: material_info.origin,
                    copies: []
                };
                for (const hash in material_info.instances) {
                    if (hash === material_info.origin) continue;
                    unique_materials[material_name].copies.push(hash);
                }
            }
        }
        return unique_materials;
    }

    /** Обработчик изменения шейдера - обновляет все материалы использующие его */
    function update_materials_on_shader_change(shader_path: string, shader_type: 'vertex' | 'fragment', shader_code: string) {
        for (const material_info of Object.values(materials)) {
            const matches = shader_type === 'vertex'
                ? material_info.vertexShader === '/' + shader_path
                : material_info.fragmentShader === '/' + shader_path;

            if (matches) {
                const origin = get_material_by_hash(material_info.name, material_info.origin);
                if (!origin) continue;

                if (shader_type === 'vertex') {
                    origin.vertexShader = shader_code;
                } else {
                    origin.fragmentShader = shader_code;
                }
                origin.needsUpdate = true;

                Object.keys(material_info.instances).filter((hash) => hash !== material_info.origin).forEach((hash) => {
                    const copy = get_material_by_hash(material_info.name, hash);
                    if (!copy) return;

                    if (shader_type === 'vertex') {
                        copy.vertexShader = shader_code;
                    } else {
                        copy.fragmentShader = shader_code;
                    }
                    copy.needsUpdate = true;
                });
            }
        }
    }

    /** Проверка pending_self_writes для file change */
    function check_pending_self_write(path: string): boolean {
        if (pending_self_writes.has(path)) {
            pending_self_writes.delete(path);
            return true;
        }
        return false;
    }

    /** Получение внутреннего объекта materials для обратной совместимости */
    function get_materials_data() {
        return materials;
    }

    init();

    return {
        preload_material,
        load_material,
        get_material_info,
        is_material_origin_hash,
        get_material_by_hash,
        get_material_hash_by_mesh_id,
        get_material_by_mesh_id,
        has_material_by_mesh_id,
        set_material_property_for_mesh,
        set_material_property_for_multiple_mesh,
        set_material_uniform_for_original,
        set_material_shader_for_original,
        set_material_uniform_for_mesh,
        set_material_uniform_for_multiple_material_mesh,
        set_material_define_for_mesh,
        set_material_define_for_multiple_material_mesh,
        unlink_material_for_mesh,
        unlink_material_for_multiple_material_mesh,
        get_info_about_unique_materials,
        get_changed_uniforms_for_mesh,
        get_changed_uniforms_for_multiple_material_mesh,
        get_all_materials,
        has_material,
        is_builtin_material,
        update_materials_on_shader_change,
        check_pending_self_write,
        get_materials_data,
        get_material_hash
    };
}

export type IMaterialManager = ReturnType<typeof create_material_manager>;
