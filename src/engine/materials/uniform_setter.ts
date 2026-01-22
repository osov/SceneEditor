// Установка юниформов и defines для материалов

import { Texture, type Vector3 } from 'three';
import { copy_material } from '../../render_engine/helpers/material';
import { get_file_name } from '../../render_engine/helpers/file';
import { deepClone, rgbToHex } from '../../modules/utils';
import { Services } from '@editor/core';
import type { MaterialInfo, MaterialServiceDeps } from './types';
import { MaterialUniformType } from './types';
import type { MaterialState } from './state';
import type { HashUtils } from './hash_utils';
import type { MaterialLinker } from './material_linker';
import type { Slice9Mesh } from '../../render_engine/objects/slice9';
import type { MultipleMaterialMesh } from '../../render_engine/objects/multiple_material_mesh';

export interface UniformSetterDeps {
    get_atlas_by_texture_name: MaterialServiceDeps['get_atlas_by_texture_name'];
    get_vertex_program: MaterialServiceDeps['get_vertex_program'];
    get_fragment_program: MaterialServiceDeps['get_fragment_program'];
    get_file_data: MaterialServiceDeps['get_file_data'];
    save_file_data: MaterialServiceDeps['save_file_data'];
}

/**
 * Создаёт сеттер юниформов
 */
export function create_uniform_setter(
    state: MaterialState,
    hash_utils: HashUtils,
    linker: MaterialLinker,
    deps: UniformSetterDeps
) {
    const { get_atlas_by_texture_name, get_vertex_program, get_fragment_program, get_file_data, save_file_data } = deps;

    /**
     * Устанавливает юниформ для меша
     */
    function set_material_uniform<T>(
        material_info: MaterialInfo,
        mesh_id: number,
        index: number,
        uniform_name: string,
        value: T
    ): boolean {
        const uniform = material_info.uniforms[uniform_name];
        if (uniform === undefined) {
            Services.logger.error('[set_material_uniform] Uniform not found:', uniform_name, material_info.name);
            return false;
        }

        if (uniform.readonly === true) {
            Services.logger.error('[set_material_uniform] Uniform is readonly:', uniform_name, material_info.name);
            return false;
        }

        const mesh_material = hash_utils.get_material_by_mesh_id(material_info.name, mesh_id, index);
        if (mesh_material === null) {
            return false;
        }

        const hash = material_info.mesh_info_to_material_hashes[mesh_id][index];
        const mesh_material_copy = copy_material(mesh_material);
        mesh_material_copy.uniforms[uniform_name].value = value;

        const new_hash = hash_utils.get_material_hash(mesh_material_copy);

        // Если новый хеш совпадает с оригиналом - возвращаем к оригиналу
        if (material_info.origin === new_hash) {
            linker.set_to_origin(material_info, mesh_id, index, hash);
            return true;
        }

        // Проверяем существует ли копия материала с таким хешем
        if (material_info.instances[new_hash] !== undefined) {
            linker.set_to_existing_copy(material_info, mesh_id, index, new_hash, hash);
            return true;
        }

        // Создаём новую копию
        linker.set_to_new_copy(material_info, mesh_id, index, hash, new_hash, mesh_material_copy);

        // Добавляем имя юниформа в список изменённых
        const changed = material_info.material_hash_to_changed_uniforms[new_hash];
        if (changed !== undefined && !changed.includes(uniform_name)) {
            changed.push(uniform_name);
        }

        return true;
    }

    /**
     * Устанавливает юниформ для меша Slice9Mesh
     */
    function set_material_uniform_for_mesh<T>(mesh: Slice9Mesh, uniform_name: string, value: T): void {
        const mesh_id = mesh.mesh_data.id;
        const material_name = mesh.material.name;

        const material_info = state.get_material(material_name);
        if (material_info === null) {
            return;
        }

        if (set_material_uniform(material_info, mesh_id, 0, uniform_name, value)) {
            const new_material = hash_utils.get_material_by_mesh_id(material_info.name, mesh_id);
            if (new_material !== null && mesh.material !== new_material) {
                mesh.material = new_material;
                mesh.material.needsUpdate = true;
            }
        }
    }

    /**
     * Устанавливает юниформ для меша с множественными материалами
     */
    function set_material_uniform_for_multiple_material_mesh<T>(
        mesh: MultipleMaterialMesh,
        index: number,
        uniform_name: string,
        value: T
    ): void {
        const mesh_materials = mesh.get_materials();
        Services.logger.info('[set_material_uniform_for_multiple_material_mesh] Setting', uniform_name, 'for mesh:', mesh.mesh_data.id, 'index:', index, 'materials count:', mesh_materials.length);

        if (mesh_materials.length <= index) {
            Services.logger.error('[set_material_uniform_for_multiple_material_mesh] Material index out of range:', index, 'materials.length:', mesh_materials.length);
            return;
        }

        const material_name = mesh_materials[index].name;
        const material_info = state.get_material(material_name);
        if (material_info === null) {
            return;
        }

        if (set_material_uniform(material_info, mesh.mesh_data.id, index, uniform_name, value)) {
            mesh.set_material(material_info.name, index);
        }
    }

    /**
     * Устанавливает юниформ для оригинального материала (изменяет файл)
     */
    async function set_material_uniform_for_original<T>(
        material_name: string,
        uniform_name: string,
        value: T,
        is_save = true
    ): Promise<void> {
        const material_info = state.get_material(material_name);
        if (material_info === null) {
            return;
        }

        const material = material_info.instances[material_info.origin];
        if (material === undefined) {
            return;
        }

        if (material.uniforms[uniform_name] === undefined) {
            return;
        }

        material.uniforms[uniform_name].value = value;

        const is_readonly = material_info.uniforms[uniform_name].readonly === true;

        if (!is_readonly) {
            // Обновляем hash оригинального материала
            const new_origin_hash = hash_utils.get_material_hash(material);
            if (new_origin_hash !== material_info.origin) {
                material_info.instances[new_origin_hash] = material;
                delete material_info.instances[material_info.origin];

                const meshes = material_info.material_hash_to_meshes_info[material_info.origin];
                for (const mesh_info of meshes) {
                    if (material_info.mesh_info_to_material_hashes[mesh_info.id] === undefined) {
                        material_info.mesh_info_to_material_hashes[mesh_info.id] = [];
                    }
                    material_info.mesh_info_to_material_hashes[mesh_info.id][mesh_info.index] = new_origin_hash;
                }

                material_info.material_hash_to_meshes_info[new_origin_hash] = deepClone(meshes);
                delete material_info.material_hash_to_meshes_info[material_info.origin];

                material_info.origin = new_origin_hash;
            }
        }

        // Обновляем все копии которые не изменяли этот юниформ
        const copy_hashes = Object.keys(material_info.instances).filter((hash) => hash !== material_info.origin);
        for (const hash of copy_hashes) {
            const copy = hash_utils.get_material_by_hash(material_info.name, hash);
            if (copy === null) {
                continue;
            }

            const changed = material_info.material_hash_to_changed_uniforms[hash];
            const is_changed_uniform = changed !== undefined && changed.includes(uniform_name);
            if (!is_changed_uniform) {
                copy.uniforms[uniform_name] = material.uniforms[uniform_name];

                if (!is_readonly) {
                    const new_hash = hash_utils.get_material_hash(copy);
                    if (new_hash !== hash) {
                        material_info.instances[new_hash] = copy;
                        delete material_info.instances[hash];

                        const meshes = material_info.material_hash_to_meshes_info[hash];
                        for (const mesh_info of meshes) {
                            if (material_info.mesh_info_to_material_hashes[mesh_info.id] === undefined) {
                                material_info.mesh_info_to_material_hashes[mesh_info.id] = [];
                            }
                            material_info.mesh_info_to_material_hashes[mesh_info.id][mesh_info.index] = new_hash;
                        }

                        material_info.material_hash_to_meshes_info[new_hash] = deepClone(meshes);
                        delete material_info.material_hash_to_meshes_info[hash];

                        material_info.material_hash_to_changed_uniforms[new_hash] = deepClone(changed ?? []);
                        delete material_info.material_hash_to_changed_uniforms[hash];
                    }
                }
            }
        }

        // Сохраняем в файл
        if (is_save && !is_readonly) {
            const response = await get_file_data(material_info.path);
            if (response === null) {
                return;
            }

            const material_data = JSON.parse(response);

            if (value instanceof Texture) {
                const texture = value as Texture & { path?: string; userData?: { path?: string } };
                const texture_path = texture.userData?.path ?? texture.path ?? '';
                const texture_name = get_file_name(texture_path);
                const atlas = get_atlas_by_texture_name(texture_name) ?? '';
                material_data.data[uniform_name] = `${atlas}/${texture_name}`;
            } else if (material_data.uniforms[uniform_name].type === MaterialUniformType.COLOR) {
                material_data.data[uniform_name] = rgbToHex(value as Vector3);
            } else {
                material_data.data[uniform_name] = value;
            }

            state.add_pending_write(material_info.path);
            await save_file_data(material_info.path, JSON.stringify(material_data, null, 2));
        }
    }

    /**
     * Устанавливает шейдер для оригинального материала
     */
    async function set_material_shader_for_original(
        material_name: string,
        shader_type: 'vertex' | 'fragment',
        shader_path: string
    ): Promise<void> {
        const material_info = state.get_material(material_name);
        if (material_info === null) {
            return;
        }

        // Обновляем путь к шейдеру
        if (shader_type === 'vertex') {
            material_info.vertexShader = shader_path;
        } else {
            material_info.fragmentShader = shader_path;
        }

        // Загружаем новый шейдер
        const shader_code = shader_type === 'vertex'
            ? get_vertex_program(shader_path)
            : get_fragment_program(shader_path);

        if (shader_code === undefined) {
            Services.logger.error(`[set_material_shader_for_original] Shader not found: ${shader_path}`);
            return;
        }

        // Обновляем шейдер в оригинальном материале
        const origin = material_info.instances[material_info.origin];
        if (origin !== undefined) {
            if (shader_type === 'vertex') {
                origin.vertexShader = shader_code;
            } else {
                origin.fragmentShader = shader_code;
            }
            origin.needsUpdate = true;
        }

        // Обновляем шейдер во всех копиях
        const copy_hashes = Object.keys(material_info.instances).filter((hash) => hash !== material_info.origin);
        for (const hash of copy_hashes) {
            const copy = hash_utils.get_material_by_hash(material_info.name, hash);
            if (copy === null) {
                continue;
            }
            if (shader_type === 'vertex') {
                copy.vertexShader = shader_code;
            } else {
                copy.fragmentShader = shader_code;
            }
            copy.needsUpdate = true;
        }

        // Сохраняем в файл
        const response = await get_file_data(material_info.path);
        if (response === null) {
            return;
        }

        const material_data = JSON.parse(response);
        if (shader_type === 'vertex') {
            material_data.vertexShader = shader_path;
        } else {
            material_data.fragmentShader = shader_path;
        }

        state.add_pending_write(material_info.path);
        await save_file_data(material_info.path, JSON.stringify(material_data, null, 2));
    }

    /**
     * Устанавливает свойство материала для меша
     */
    function set_material_property(
        material_info: MaterialInfo,
        mesh_id: number,
        index: number,
        property_name: string,
        value: unknown
    ): boolean {
        const hash = hash_utils.get_material_hash_by_mesh_id(material_info.name, mesh_id, index);
        if (hash === null) {
            return false;
        }

        const material = material_info.instances[hash];
        if (material === undefined) {
            return false;
        }

        const copy = copy_material(material);
        (copy as unknown as Record<string, unknown>)[property_name] = value;

        const new_hash = hash_utils.get_material_hash(copy);

        if (new_hash === hash) {
            return false;
        }

        if (material_info.instances[new_hash] !== undefined) {
            linker.set_to_existing_copy(material_info, mesh_id, index, hash, new_hash);
            return true;
        }

        linker.set_to_new_copy(material_info, mesh_id, index, hash, new_hash, copy);
        return true;
    }

    /**
     * Устанавливает свойство материала для меша Slice9Mesh
     */
    function set_material_property_for_mesh(mesh: Slice9Mesh, property_name: string, value: unknown): void {
        const mesh_id = mesh.mesh_data.id;
        const material_name = mesh.material.name;

        const material_info = state.get_material(material_name);
        if (material_info === null) {
            return;
        }

        if (set_material_property(material_info, mesh_id, 0, property_name, value)) {
            mesh.set_material(material_info.name);
        }
    }

    /**
     * Устанавливает свойство материала для меша с множественными материалами
     */
    function set_material_property_for_multiple_mesh(
        mesh: MultipleMaterialMesh,
        index: number,
        property_name: string,
        value: unknown
    ): void {
        const material_name = mesh.get_materials()[index].name;
        const material_info = state.get_material(material_name);
        if (material_info === null) {
            return;
        }

        if (set_material_property(material_info, mesh.mesh_data.id, index, property_name, value)) {
            mesh.set_material(material_info.name, index);
        }
    }

    /**
     * Устанавливает define для меша
     */
    function set_material_define<T>(
        material_info: MaterialInfo,
        mesh_id: number,
        index: number,
        define_name: string,
        value?: T
    ): boolean {
        const mesh_material = hash_utils.get_material_by_mesh_id(material_info.name, mesh_id, index);
        if (mesh_material === null) {
            return false;
        }

        const hash = material_info.mesh_info_to_material_hashes[mesh_id][index];
        const material_copy = copy_material(mesh_material);

        if (value !== undefined) {
            if (material_copy.defines === undefined) {
                material_copy.defines = {};
            }
            material_copy.defines[define_name] = value;
        } else {
            if (material_copy.defines !== undefined && material_copy.defines[define_name] !== undefined) {
                delete material_copy.defines[define_name];
            }
        }

        const new_hash = hash_utils.get_material_hash(material_copy);

        if (material_info.origin === new_hash) {
            linker.set_to_origin(material_info, mesh_id, index, hash);
            return true;
        }

        if (material_info.instances[new_hash] !== undefined) {
            linker.set_to_existing_copy(material_info, mesh_id, index, new_hash, hash);
            return true;
        }

        linker.set_to_new_copy(material_info, mesh_id, index, hash, new_hash, material_copy);
        return true;
    }

    /**
     * Устанавливает define для меша Slice9Mesh
     */
    function set_material_define_for_mesh<T>(mesh: Slice9Mesh, define_name: string, value?: T): void {
        const mesh_id = mesh.mesh_data.id;
        const material_name = mesh.material.name;
        const material_info = state.get_material(material_name);
        if (material_info === null) {
            return;
        }

        if (set_material_define(material_info, mesh_id, 0, define_name, value)) {
            mesh.set_material(material_info.name);
        }
    }

    /**
     * Устанавливает define для меша с множественными материалами
     */
    function set_material_define_for_multiple_material_mesh<T>(
        mesh: MultipleMaterialMesh,
        index: number,
        define_name: string,
        value?: T
    ): void {
        const mesh_id = mesh.mesh_data.id;
        const material_name = mesh.get_materials()[index].name;
        const material_info = state.get_material(material_name);
        if (material_info === null) {
            return;
        }

        if (set_material_define(material_info, mesh_id, index, define_name, value)) {
            mesh.set_material(material_info.name, index);
        }
    }

    /**
     * Получает изменённые юниформы для меша
     */
    function get_changed_uniforms(material_info: MaterialInfo, mesh_id: number, index: number): Record<string, unknown> {
        const hashes = material_info.mesh_info_to_material_hashes[mesh_id];
        if (hashes === undefined || hashes[index] === undefined) {
            return {};
        }

        const hash = hashes[index];
        const changed_uniforms = material_info.material_hash_to_changed_uniforms[hash];
        const result: Record<string, unknown> = {};

        if (changed_uniforms !== undefined) {
            for (const uniform_name of changed_uniforms) {
                const instance = material_info.instances[hash];
                if (instance !== undefined && instance.uniforms[uniform_name] !== undefined) {
                    result[uniform_name] = instance.uniforms[uniform_name].value;
                }
            }
        }

        return result;
    }

    /**
     * Получает изменённые юниформы для меша Slice9Mesh
     */
    function get_changed_uniforms_for_mesh(mesh: Slice9Mesh): Record<string, unknown> | undefined {
        const mesh_id = mesh.mesh_data.id;
        const material_name = mesh.material.name;
        const material_info = state.get_material(material_name);
        if (material_info === null) {
            return undefined;
        }
        return get_changed_uniforms(material_info, mesh_id, 0);
    }

    /**
     * Получает изменённые юниформы для меша с множественными материалами
     */
    function get_changed_uniforms_for_multiple_material_mesh(
        mesh: MultipleMaterialMesh,
        index: number
    ): Record<string, unknown> | undefined {
        const mesh_id = mesh.mesh_data.id;
        const material_name = mesh.get_materials()[index].name;
        const material_info = state.get_material(material_name);
        if (material_info === null) {
            return undefined;
        }
        return get_changed_uniforms(material_info, mesh_id, index);
    }

    return {
        set_material_uniform,
        set_material_uniform_for_mesh,
        set_material_uniform_for_multiple_material_mesh,
        set_material_uniform_for_original,
        set_material_shader_for_original,
        set_material_property,
        set_material_property_for_mesh,
        set_material_property_for_multiple_mesh,
        set_material_define,
        set_material_define_for_mesh,
        set_material_define_for_multiple_material_mesh,
        get_changed_uniforms,
        get_changed_uniforms_for_mesh,
        get_changed_uniforms_for_multiple_material_mesh,
    };
}

export type UniformSetter = ReturnType<typeof create_uniform_setter>;
