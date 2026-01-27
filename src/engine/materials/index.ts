// MaterialService - единая модульная система управления материалами
// Объединяет MaterialService и MaterialManager

import { create_material_state } from './state';
import { create_hash_utils } from './hash_utils';
import { create_default_materials } from './default_materials';
import { create_material_loader } from './material_loader';
import { create_material_linker } from './material_linker';
import { create_uniform_setter } from './uniform_setter';
import { create_file_watcher } from './file_watcher';
import type { MaterialServiceDeps } from './types';

// Реэкспорт типов
export * from './types';

/**
 * Создаёт MaterialService
 */
export function create_material_service(deps: MaterialServiceDeps) {
    // Создаём состояние
    const state = create_material_state();

    // Создаём утилиты хеширования
    const hash_utils = create_hash_utils(state);

    // Создаём линковщик
    const linker = create_material_linker(state);

    // Создаём загрузчик
    const loader = create_material_loader(state, deps);

    // Создаём сеттер юниформов
    const uniform_setter = create_uniform_setter(state, hash_utils, linker, {
        get_atlas_by_texture_name: deps.get_atlas_by_texture_name,
        get_vertex_program: deps.get_vertex_program,
        get_fragment_program: deps.get_fragment_program,
        get_file_data: deps.get_file_data,
        save_file_data: deps.save_file_data,
    });

    // Создаём file watcher
    const file_watcher = create_file_watcher(state, hash_utils);

    // Инициализация: создаём builtin материалы
    create_default_materials(state);

    return {
        // === Загрузка ===
        preload_material: loader.preload_material,
        load_material: loader.load_material,

        // === Получение информации ===
        get_material_info: state.get_material,
        has_material: state.has_material,
        is_builtin_material: state.is_builtin_material,
        get_all_materials: state.get_all_names,

        // === Хеши ===
        get_material_hash: hash_utils.get_material_hash,
        is_material_origin_hash: hash_utils.is_material_origin_hash,
        get_material_by_hash: hash_utils.get_material_by_hash,
        get_material_hash_by_mesh_id: hash_utils.get_material_hash_by_mesh_id,
        has_material_by_mesh_id: hash_utils.has_material_by_mesh_id,
        get_material_by_mesh_id: hash_utils.get_material_by_mesh_id,

        // === Линковка ===
        unlink_material_for_mesh: linker.unlink_material_for_mesh,
        unlink_material_for_multiple_material_mesh: linker.unlink_material_for_multiple_material_mesh,

        // === Юниформы и свойства ===
        set_material_uniform_for_mesh: uniform_setter.set_material_uniform_for_mesh,
        set_material_uniform_for_multiple_material_mesh: uniform_setter.set_material_uniform_for_multiple_material_mesh,
        set_material_uniform_for_original: uniform_setter.set_material_uniform_for_original,
        set_material_transparent_for_original: uniform_setter.set_material_transparent_for_original,
        set_material_shader_for_original: uniform_setter.set_material_shader_for_original,
        set_material_property_for_mesh: uniform_setter.set_material_property_for_mesh,
        set_material_property_for_multiple_mesh: uniform_setter.set_material_property_for_multiple_mesh,
        set_material_define_for_mesh: uniform_setter.set_material_define_for_mesh,
        set_material_define_for_multiple_material_mesh: uniform_setter.set_material_define_for_multiple_material_mesh,
        get_changed_uniforms_for_mesh: uniform_setter.get_changed_uniforms_for_mesh,
        get_changed_uniforms_for_multiple_material_mesh: uniform_setter.get_changed_uniforms_for_multiple_material_mesh,

        // === File watching ===
        update_materials_on_shader_change: file_watcher.update_materials_on_shader_change,
        check_pending_self_write: file_watcher.check_pending_self_write,
        get_info_about_unique_materials: file_watcher.get_info_about_unique_materials,
        get_materials_data: file_watcher.get_materials_data,
    };
}

export type IMaterialService = ReturnType<typeof create_material_service>;
