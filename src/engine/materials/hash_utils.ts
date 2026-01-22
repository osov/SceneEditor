// Утилиты для вычисления хешей материалов

import type { IUniform, ShaderMaterial } from 'three';
import { getObjectHash } from '../../modules/utils';
import type { MaterialInfo, MaterialUniform } from './types';
import type { MaterialState } from './state';
import { Services } from '@editor/core/ServiceProvider';

/**
 * Создаёт объект для вычисления хеша материала (без readonly юниформов)
 */
export function create_material_hash_object(
    material: ShaderMaterial,
    uniform_defs: Record<string, MaterialUniform>
): Record<string, unknown> {
    const not_readonly_uniforms: Record<string, IUniform> = {};

    for (const [key, uniform] of Object.entries(material.uniforms)) {
        if (uniform_defs[key]?.readonly === true) {
            continue;
        }
        not_readonly_uniforms[key] = uniform;
    }

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
export function compute_material_hash(
    material: ShaderMaterial,
    material_info: MaterialInfo
): string {
    const hash_object = create_material_hash_object(material, material_info.uniforms);
    return getObjectHash(hash_object);
}

/**
 * Создаёт функции для работы с хешами материалов
 */
export function create_hash_utils(state: MaterialState) {
    /**
     * Вычисляет хеш материала
     */
    function get_material_hash(material: ShaderMaterial): string {
        const material_info = state.get_material(material.name);
        if (material_info === null) {
            Services.logger.error('[get_material_hash] Material info not found:', material.name);
            return 'error';
        }

        return compute_material_hash(material, material_info);
    }

    /**
     * Проверяет является ли хеш оригинальным для материала
     */
    function is_material_origin_hash(material_name: string, hash: string): boolean {
        const material_info = state.get_material(material_name);
        if (material_info === null) {
            return false;
        }
        return material_info.origin === hash;
    }

    /**
     * Получает материал по хешу
     */
    function get_material_by_hash(material_name: string, hash: string): ShaderMaterial | null {
        const material_info = state.get_material(material_name);
        if (material_info === null) {
            return null;
        }

        const material = material_info.instances[hash];
        if (material === undefined) {
            Services.logger.error('[get_material_by_hash] Material by hash not found:', hash, material_info);
            return null;
        }

        return material;
    }

    /**
     * Получает хеш материала по ID меша
     */
    function get_material_hash_by_mesh_id(material_name: string, mesh_id: number, index = 0): string | null {
        const material_info = state.get_material(material_name);
        if (material_info === null) {
            return null;
        }

        const hashes = material_info.mesh_info_to_material_hashes[mesh_id];
        if (hashes === undefined || hashes[index] === undefined) {
            Services.logger.error('[get_material_hash_by_mesh_id] Hash not found:', mesh_id, index, material_info);
            return null;
        }

        return hashes[index];
    }

    /**
     * Проверяет есть ли привязка материала к мешу
     */
    function has_material_by_mesh_id(material_name: string, mesh_id: number, index = 0): boolean {
        const material_info = state.get_material(material_name);
        if (material_info === null) {
            return false;
        }

        const hashes = material_info.mesh_info_to_material_hashes[mesh_id];
        if (hashes === undefined) {
            return false;
        }

        return hashes[index] !== undefined;
    }

    /**
     * Получает материал по ID меша (создаёт привязку к origin если нет)
     */
    function get_material_by_mesh_id(material_name: string, mesh_id: number, index = 0): ShaderMaterial | null {
        const material_info = state.get_material(material_name);
        if (material_info === null) {
            return null;
        }

        const hashes = material_info.mesh_info_to_material_hashes[mesh_id];

        // Если hash не найден, устанавливаем hash в origin и возвращаем оригинальный материал
        if (hashes === undefined || hashes[index] === undefined) {
            if (material_info.mesh_info_to_material_hashes[mesh_id] === undefined) {
                material_info.mesh_info_to_material_hashes[mesh_id] = [];
            }
            material_info.mesh_info_to_material_hashes[mesh_id][index] = material_info.origin;
            material_info.material_hash_to_meshes_info[material_info.origin].push({ id: mesh_id, index });

            return get_material_by_hash(material_name, material_info.origin);
        }

        return get_material_by_hash(material_name, hashes[index]);
    }

    return {
        get_material_hash,
        is_material_origin_hash,
        get_material_by_hash,
        get_material_hash_by_mesh_id,
        has_material_by_mesh_id,
        get_material_by_mesh_id,
    };
}

export type HashUtils = ReturnType<typeof create_hash_utils>;
