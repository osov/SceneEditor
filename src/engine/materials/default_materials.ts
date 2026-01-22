// Builtin материалы (slice9, model, anim_model)
// Создаются при инициализации MaterialService без загрузки из файлов

import { ShaderMaterial, Vector3 } from 'three';
import { getObjectHash } from '../../modules/utils';
import { slice9_shader } from '../../render_engine/shaders/builtin';
import type { MaterialInfo } from './types';
import { MaterialUniformType } from './types';
import type { MaterialState } from './state';
import { create_material_hash_object } from './hash_utils';

/**
 * Создаёт все builtin материалы
 */
export function create_default_materials(state: MaterialState): void {
    create_slice9_material(state);
    create_builtin_material(state, 'model');
    create_builtin_material(state, 'anim_model');
}

/**
 * Создаёт builtin материал slice9 для 9-slice спрайтов
 */
function create_slice9_material(state: MaterialState): void {
    const slice9_material = new ShaderMaterial({
        vertexShader: slice9_shader.vertexShader,
        fragmentShader: slice9_shader.fragmentShader,
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
                type: MaterialUniformType.SAMPLER2D,
                params: {},
                readonly: false,
                hide: true,
            },
            alpha: {
                type: MaterialUniformType.RANGE,
                params: { min: 0, max: 1, step: 0.01 },
                readonly: false,
                hide: false,
            },
            u_color: {
                type: MaterialUniformType.COLOR,
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

    state.set_material('slice9', slice9_info);
}

/**
 * Создаёт базовый builtin материал с простыми шейдерами
 */
function create_builtin_material(state: MaterialState, name: string): void {
    const material = new ShaderMaterial({
        vertexShader: slice9_shader.vertexShader,
        fragmentShader: slice9_shader.fragmentShader,
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
                type: MaterialUniformType.SAMPLER2D,
                params: {},
                readonly: false,
                hide: true,
            },
            u_color: {
                type: MaterialUniformType.COLOR,
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

    // Вычисляем hash оригинального материала
    const hash_object = create_material_hash_object(material, info.uniforms);
    info.origin = getObjectHash(hash_object);

    info.instances[info.origin] = material;
    info.material_hash_to_meshes_info[info.origin] = [];

    state.set_material(name, info);
}
