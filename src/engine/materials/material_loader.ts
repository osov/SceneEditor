// Загрузчик материалов из файлов

import { type IUniform, ShaderMaterial, type Texture, Vector2, Vector3, Vector4 } from 'three';
import { getObjectHash, hexToRGB } from '../../modules/utils';
import { get_file_name } from '../../render_engine/helpers/file';
import { slice9_shader } from '../../render_engine/shaders/builtin';
import { Services } from '@editor/core';
import { IS_LOGGING } from '@editor/config';
import type { MaterialInfo, MaterialServiceDeps, MaterialFileData } from './types';
import { MaterialUniformType } from './types';
import type { MaterialState } from './state';
import { create_material_hash_object } from './hash_utils';

export interface MaterialLoaderDeps extends MaterialServiceDeps {}

/**
 * Создаёт загрузчик материалов
 */
export function create_material_loader(state: MaterialState, deps: MaterialLoaderDeps) {
    const {
        get_texture,
        get_atlas_by_texture_name,
        get_vertex_program,
        get_fragment_program,
        process_shader_includes,
        get_file_data,
    } = deps;

    /**
     * Загружает материал из файла (не кэширует)
     */
    async function load_material(path: string): Promise<MaterialInfo | undefined> {
        const response = await get_file_data(path);
        if (response === undefined || response === null) {
            return undefined;
        }

        const data = JSON.parse(response) as MaterialFileData;
        const name = get_file_name(path);

        const material_info: MaterialInfo = {
            name,
            path,
            vertexShader: data.vertexShader,
            fragmentShader: data.fragmentShader,
            uniforms: {},
            origin: '',
            instances: {},
            mesh_info_to_material_hashes: {},
            material_hash_to_meshes_info: {},
            material_hash_to_changed_uniforms: {},
        };

        const material = new ShaderMaterial();
        material.name = name;

        // Получаем шейдеры и обрабатываем #include директивы
        const vertex_shader_source = get_vertex_program(data.vertexShader);
        Services.logger.info('[load_material]', name, 'vertexShader path:', data.vertexShader, 'loaded:', vertex_shader_source !== undefined);

        const processed_vertex = vertex_shader_source !== undefined
            ? process_shader_includes(vertex_shader_source)
            : slice9_shader.vertexShader;
        Services.logger.info('[load_material]', name, 'processedVertexShader length:', processed_vertex.length);
        material.vertexShader = processed_vertex;

        const fragment_shader_source = get_fragment_program(data.fragmentShader);
        Services.logger.info('[load_material]', name, 'fragmentShader path:', data.fragmentShader, 'loaded:', fragment_shader_source !== undefined);

        const processed_fragment = fragment_shader_source !== undefined
            ? process_shader_includes(fragment_shader_source)
            : slice9_shader.fragmentShader;
        Services.logger.info('[load_material]', name, 'processedFragmentShader length:', processed_fragment.length);
        material.fragmentShader = processed_fragment;

        material.transparent = data.transparent;

        // Добавляем USE_SKINNING define если шейдер использует skinning
        if (vertex_shader_source !== undefined && vertex_shader_source.includes('#include <skinning')) {
            material.defines = material.defines ?? {};
            material.defines['USE_SKINNING'] = '';
            Services.logger.info('[load_material]', name, 'USE_SKINNING enabled');
        }

        // Загружаем юниформы
        for (const key of Object.keys(data.uniforms)) {
            const uniform_def = data.uniforms[key];
            material_info.uniforms[key] = {
                type: uniform_def.type,
                params: { ...uniform_def.params },
                readonly: uniform_def.readonly,
                hide: uniform_def.hide,
            };

            switch (uniform_def.type) {
                case MaterialUniformType.SAMPLER2D: {
                    const texture_name = get_file_name((data.data[key] as string) || '');
                    const atlas = get_atlas_by_texture_name(texture_name);
                    const texture_data = get_texture(texture_name, atlas ?? '');
                    material.uniforms[key] = { value: texture_data.texture } as IUniform<Texture>;
                    break;
                }
                case MaterialUniformType.VEC2:
                    material.uniforms[key] = { value: new Vector2(...(data.data[key] as [number, number])) } as IUniform<Vector2>;
                    break;
                case MaterialUniformType.VEC3:
                    material.uniforms[key] = { value: new Vector3(...(data.data[key] as [number, number, number])) } as IUniform<Vector3>;
                    break;
                case MaterialUniformType.VEC4:
                    material.uniforms[key] = { value: new Vector4(...(data.data[key] as [number, number, number, number])) } as IUniform<Vector4>;
                    break;
                case MaterialUniformType.COLOR:
                    material.uniforms[key] = { value: hexToRGB(data.data[key] as string) } as IUniform<Vector3>;
                    break;
                default:
                    material.uniforms[key] = { value: data.data[key] };
                    break;
            }
        }

        // Вычисляем hash оригинального материала
        const hash_object = create_material_hash_object(material, material_info.uniforms);
        material_info.origin = getObjectHash(hash_object);

        material_info.instances[material_info.origin] = material;
        material_info.material_hash_to_meshes_info[material_info.origin] = [];

        return material_info;
    }

    /**
     * Предзагружает материал и кэширует его
     */
    async function preload_material(path: string): Promise<MaterialInfo | undefined> {
        Services.logger.info('[preload_material] Loading:', path);
        const name = get_file_name(path);

        if (state.has_material(name)) {
            if (state.is_builtin_material(name)) {
                Services.logger.info('[preload_material] Overwriting builtin material:', name, 'with project material:', path);
            } else {
                IS_LOGGING && Services.logger.warn('Material already exists', name, path);
                return state.get_material(name) ?? undefined;
            }
        }

        const material = await load_material(path);
        if (material === undefined) {
            Services.logger.error('[preload_material] Failed to load:', path);
            return undefined;
        }

        state.set_material(name, material);
        return material;
    }

    return {
        load_material,
        preload_material,
    };
}

export type MaterialLoader = ReturnType<typeof create_material_loader>;
