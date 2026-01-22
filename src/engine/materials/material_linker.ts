// Управление связями между mesh и material
// Отвечает за создание копий материалов и их привязку к мешам

import type { ShaderMaterial } from 'three';
import { deepClone } from '../../modules/utils';
import { Services } from '@editor/core';
import type { MaterialInfo } from './types';
import type { MaterialState } from './state';

/**
 * Создаёт линковщик материалов
 */
export function create_material_linker(state: MaterialState) {
    /**
     * Устанавливает меш на оригинальный материал
     */
    function set_to_origin(
        material_info: MaterialInfo,
        mesh_id: number,
        index: number,
        hash: string
    ): void {
        const meshes_info = material_info.material_hash_to_meshes_info[hash];
        const mesh_info_index = meshes_info.findIndex((mesh_info) => {
            return mesh_info.id === mesh_id && mesh_info.index === index;
        });

        if (mesh_info_index !== -1) {
            meshes_info.splice(mesh_info_index, 1);
            if (meshes_info.length === 0 && hash !== material_info.origin) {
                delete_material_instance(material_info, hash);
            }
        } else {
            Services.logger.error('[set_to_origin] Mesh id not found in material_hash_to_meshes_info', mesh_id, material_info);
        }

        if (material_info.mesh_info_to_material_hashes[mesh_id] === undefined) {
            material_info.mesh_info_to_material_hashes[mesh_id] = [];
        }
        material_info.mesh_info_to_material_hashes[mesh_id][index] = material_info.origin;
        material_info.material_hash_to_meshes_info[material_info.origin].push({ id: mesh_id, index });
    }

    /**
     * Устанавливает меш на существующую копию материала
     */
    function set_to_existing_copy(
        material_info: MaterialInfo,
        mesh_id: number,
        index: number,
        new_hash: string,
        hash: string
    ): void {
        // Проверяем не добавлен ли уже меш к новому хешу
        const new_hash_meshes = material_info.material_hash_to_meshes_info[new_hash];
        const mesh_info_index_new_hash = new_hash_meshes.findIndex((mesh_info) => {
            return mesh_info.id === mesh_id && mesh_info.index === index;
        });
        if (mesh_info_index_new_hash !== -1) {
            return;
        }

        // Добавляем меш к новому хешу
        new_hash_meshes.push({ id: mesh_id, index });

        // Обновляем маппинг меш -> хеш
        if (material_info.mesh_info_to_material_hashes[mesh_id] === undefined) {
            material_info.mesh_info_to_material_hashes[mesh_id] = [];
        }
        material_info.mesh_info_to_material_hashes[mesh_id][index] = new_hash;

        // Удаляем меш из старого хеша
        const old_hash_meshes = material_info.material_hash_to_meshes_info[hash];
        const mesh_info_index = old_hash_meshes.findIndex((mesh_info) => {
            return mesh_info.id === mesh_id && mesh_info.index === index;
        });

        if (mesh_info_index !== -1) {
            old_hash_meshes.splice(mesh_info_index, 1);
            // Удаляем копию если больше нет привязанных мешей
            if (old_hash_meshes.length === 0 && hash !== material_info.origin && new_hash !== hash) {
                delete_material_instance(material_info, hash);
            }
        } else {
            Services.logger.error('[set_to_existing_copy] Mesh id not found in material_hash_to_meshes_info', mesh_id, material_info);
        }
    }

    /**
     * Создаёт новую копию материала для меша
     */
    function set_to_new_copy(
        material_info: MaterialInfo,
        mesh_id: number,
        index: number,
        hash: string,
        new_hash: string,
        copy: ShaderMaterial
    ): void {
        // Добавляем новую копию
        material_info.instances[new_hash] = copy;

        // Обновляем маппинг меш -> хеш
        if (material_info.mesh_info_to_material_hashes[mesh_id] === undefined) {
            material_info.mesh_info_to_material_hashes[mesh_id] = [];
        }
        material_info.mesh_info_to_material_hashes[mesh_id][index] = new_hash;

        // Создаём список мешей для нового хеша
        material_info.material_hash_to_meshes_info[new_hash] = [];
        material_info.material_hash_to_meshes_info[new_hash].push({ id: mesh_id, index });

        // Копируем изменённые юниформы из предыдущей копии
        const prev_changed = material_info.material_hash_to_changed_uniforms[hash] ?? [];
        material_info.material_hash_to_changed_uniforms[new_hash] = deepClone(prev_changed);

        // Удаляем меш из старого хеша
        const old_hash_meshes = material_info.material_hash_to_meshes_info[hash];
        const mesh_info_index = old_hash_meshes.findIndex((mesh_info) => {
            return mesh_info.id === mesh_id && mesh_info.index === index;
        });

        if (mesh_info_index !== -1) {
            old_hash_meshes.splice(mesh_info_index, 1);
            if (old_hash_meshes.length === 0 && hash !== material_info.origin) {
                delete_material_instance(material_info, hash);
            }
        } else {
            Services.logger.error('[set_to_new_copy] Mesh id not found in material_hash_to_meshes_info', mesh_id, material_info);
        }
    }

    /**
     * Удаляет копию материала
     */
    function delete_material_instance(material_info: MaterialInfo, hash: string): void {
        delete material_info.material_hash_to_changed_uniforms[hash];
        delete material_info.material_hash_to_meshes_info[hash];
        delete material_info.instances[hash];
    }

    /**
     * Отвязывает материал от меша
     */
    function unlink_material(material_info: MaterialInfo, mesh_id: number, index: number): void {
        const hashes = material_info.mesh_info_to_material_hashes[mesh_id];
        if (hashes === undefined || hashes[index] === undefined) {
            return;
        }

        const hash = hashes[index];
        const meshes_info = material_info.material_hash_to_meshes_info[hash];

        const mesh_info_index = meshes_info.findIndex((mesh_info) => {
            return mesh_info.id === mesh_id && mesh_info.index === index;
        });

        if (mesh_info_index !== -1) {
            meshes_info.splice(mesh_info_index, 1);
            // Удаляем копию если больше нет привязанных мешей
            if (meshes_info.length === 0 && hash !== material_info.origin) {
                delete material_info.material_hash_to_changed_uniforms[hash];
                delete material_info.material_hash_to_meshes_info[hash];
                delete material_info.instances[hash];
            }
        } else {
            Services.logger.error('[unlink_material] Mesh id not found in material_hash_to_meshes_info', mesh_id, material_info);
        }

        hashes.splice(index, 1);
        if (hashes.length === 0) {
            delete material_info.mesh_info_to_material_hashes[mesh_id];
        }
    }

    /**
     * Отвязывает материал от меша по имени материала
     */
    function unlink_material_for_mesh(material_name: string, mesh_id: number): void {
        const material_info = state.get_material(material_name);
        if (material_info === null) {
            return;
        }
        unlink_material(material_info, mesh_id, 0);
    }

    /**
     * Отвязывает материал от меша с множественными материалами
     */
    function unlink_material_for_multiple_material_mesh(material_name: string, mesh_id: number, index: number): void {
        const material_info = state.get_material(material_name);
        if (material_info === null) {
            return;
        }
        unlink_material(material_info, mesh_id, index);
    }

    return {
        set_to_origin,
        set_to_existing_copy,
        set_to_new_copy,
        delete_material_instance,
        unlink_material,
        unlink_material_for_mesh,
        unlink_material_for_multiple_material_mesh,
    };
}

export type MaterialLinker = ReturnType<typeof create_material_linker>;
