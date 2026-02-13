// ResourceManager - координатор ресурсов
// Делегирует работу специализированным менеджерам

import { preloadFont } from 'troika-three-text';
import { MinificationTextureFilter, MagnificationTextureFilter, Wrapping } from 'three';
import { FSEvent, TDictionary, TRecursiveDict, URL_PATHS, DataFormatType } from '../modules_editor/modules_editor_const';
import { IBaseEntityData } from './types';
import { api } from '../modules_editor/ClientAPI';
import { Services } from '@editor/core/ServiceProvider';
import { get_file_name } from './helpers/file';
import type { Slice9Mesh } from './objects/slice9';
import { deepClone } from '../modules/utils';

// Импорт менеджеров
import {
    create_texture_manager,
    create_shader_manager,
    create_model_manager,
    create_audio_resource_manager,
    type ITextureManager,
    type IShaderManager,
    type IModelManager,
    type IAudioResourceManager,
    type TextureData,
    type TextureInfo,
} from './managers';
import {
    create_material_service,
    type IMaterialService,
    MaterialUniformType,
    type MaterialInfo,
    type MaterialUniform,
    type MaterialUniformParams,
} from '@editor/engine/materials';

// Re-export типов
export {
    MaterialUniformType,
    type MaterialInfo,
    type TextureData,
    type TextureInfo,
    type MaterialUniform,
    type MaterialUniformParams
};

/** Информация о сцене */
export interface SceneInfo {
    is_component: boolean;
    data: IBaseEntityData
}

/** Тип возвращаемого значения ResourceManagerModule для DI */
export type ILegacyResourceManager = ReturnType<typeof ResourceManagerModule>;

/**
 * ResourceManager - координатор всех ресурсов.
 * Делегирует работу специализированным менеджерам:
 * - TextureManager - текстуры и атласы
 * - ShaderManager - шейдеры
 * - MaterialManager - материалы
 * - ModelManager - 3D модели
 * - AudioResourceManager - аудио ресурсы
 */
export function ResourceManagerModule() {
    // Состояние проекта
    let project_path = '';
    let project_name = '';

    // Локальные хранилища (не делегированные менеджерам)
    const scenes: { [path: string]: SceneInfo } = {};
    const fonts: { [name: string]: string } = {};
    const layers: string[] = ['default'];
    const tilemap_paths: TDictionary<string> = {};
    const tilemap_info: TDictionary<TDictionary<string>> = {};
    const font_characters = " !\"#$%&'()*+,-./0123456789:;<=> ?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\]^_`abcdefghijklmnopqrstuvwxyz{|}~йцукенгшщзхфывапролджэячсмитьбюЙЦУКЕНГШЩЗХФЫВАПРОЛДЖЯЧСМИТЬБЮЭ";

    // Инициализация менеджеров
    let texture_manager: ITextureManager;
    let shader_manager: IShaderManager;
    let material_manager: IMaterialService;
    let model_manager: IModelManager;
    let audio_manager: IAudioResourceManager;

    function get_project_url(path: string): string {
        if (!project_path) {
            return path;
        }
        if (project_name) {
            return `${project_path}/${project_name}${path}`;
        }
        return project_path + path;
    }

    function init() {
        // Создаём конфиги с замыканиями для доступа к project_path/project_name
        const manager_config = {
            get_project_url: () => get_project_url,
            get_project_path: () => project_path,
            get_project_name: () => project_name
        };

        // Инициализируем менеджеры
        texture_manager = create_texture_manager(manager_config);

        shader_manager = create_shader_manager({
            on_vertex_shader_change: (path, shader_code) => {
                material_manager.update_materials_on_shader_change(path, 'vertex', shader_code);
            },
            on_fragment_shader_change: (path, shader_code) => {
                material_manager.update_materials_on_shader_change(path, 'fragment', shader_code);
            }
        });

        material_manager = create_material_service({
            get_texture: texture_manager.get_texture,
            get_atlas_by_texture_name: texture_manager.get_atlas_by_texture_name,
            get_vertex_program: shader_manager.get_vertex_program,
            get_fragment_program: shader_manager.get_fragment_program,
            process_shader_includes: shader_manager.process_shader_includes,
            get_file_data: async (path: string) => {
                // Загрузка данных файла через ClientAPI (без зависимости от AssetControl)
                const resp = await Services.client_api.get_data(path);
                if (resp === undefined || resp.result === 0 || resp.data === undefined) {
                    return null;
                }
                return resp.data;
            },
            save_file_data: (path: string, data: string, format: DataFormatType = 'string') => {
                // Сохранение данных файла через ClientAPI (без зависимости от AssetControl)
                return Services.client_api.save_data(path, data, format);
            },
        });

        model_manager = create_model_manager(manager_config);

        audio_manager = create_audio_resource_manager(manager_config);

        subscribe();
    }

    function subscribe() {
        Services.event_bus.on('SERVER_FILE_SYSTEM_EVENTS', async (evt) => {
            const e = evt as { events: FSEvent[] };
            for (const event of e.events) {
                await on_file_change(event);
            }
        });
    }

    async function on_file_change(event: FSEvent) {
        switch (event.ext) {
            case 'vp':
                await shader_manager.on_vertex_shader_change(event.path);
                break;
            case 'fp':
                await shader_manager.on_fragment_shader_change(event.path);
                break;
            case 'mtr':
                await on_material_file_change(event.path);
                break;
        }
    }

    /** Обработка изменения файла материала */
    async function on_material_file_change(path: string) {
        // Игнорируем file change если файл был записан нами
        if (material_manager.check_pending_self_write(path)) {
            return;
        }

        const changed_material_info = await material_manager.load_material(path);
        if (!changed_material_info) return;

        const changed_origin = changed_material_info.instances[changed_material_info.origin];
        if (!changed_origin) return;

        const material_name = get_file_name(path);
        const material_info = material_manager.get_material_info(material_name);
        if (!material_info) return;

        const origin = material_manager.get_material_by_hash(material_info.name, material_info.origin);
        if (!origin) return;

        // Обновляем шейдеры
        if (material_info.vertexShader !== changed_material_info.vertexShader) {
            material_info.vertexShader = changed_material_info.vertexShader;
            await shader_manager.on_vertex_shader_change(changed_material_info.vertexShader);
        }

        if (material_info.fragmentShader !== changed_material_info.fragmentShader) {
            material_info.fragmentShader = changed_material_info.fragmentShader;
            await shader_manager.on_fragment_shader_change(changed_material_info.fragmentShader);
        }

        // Обновляем прозрачность
        if (origin.transparent !== changed_origin.transparent) {
            origin.transparent = changed_origin.transparent;

            Object.keys(material_info.instances).filter((hash) => hash !== material_info.origin).forEach((hash) => {
                const copy = material_manager.get_material_by_hash(material_info.name, hash);
                if (!copy) return;
                copy.transparent = changed_origin.transparent;
            });
        }

        // Обновляем юниформы
        for (const [key, uniform] of Object.entries(changed_material_info.uniforms)) {
            const undefined_uniform = material_info.uniforms[key] === undefined;
            if (undefined_uniform || material_info.uniforms[key] !== uniform) {
                material_info.uniforms[key] = { ...uniform };
                origin.uniforms[key] = changed_origin.uniforms[key];

                Object.keys(material_info.instances).filter((hash) => hash !== material_info.origin).forEach((hash) => {
                    const copy = material_manager.get_material_by_hash(material_info.name, hash);
                    if (!copy) return;

                    const is_changed_uniform = material_info.material_hash_to_changed_uniforms[hash].includes(key);
                    if (undefined_uniform || !is_changed_uniform) {
                        copy.uniforms[key] = changed_origin.uniforms[key];
                    }
                });
            }
        }

        // Удаляем отсутствующие юниформы
        for (const key of Object.keys(material_info.uniforms)) {
            if (!changed_material_info.uniforms[key]) {
                delete material_info.uniforms[key];
                delete origin.uniforms[key];

                Object.keys(material_info.instances).filter((hash) => hash !== material_info.origin).forEach((hash) => {
                    const copy = material_manager.get_material_by_hash(material_info.name, hash);
                    if (!copy) return;

                    const changed_uniforms = material_info.material_hash_to_changed_uniforms[hash];
                    const changed_uniform_index = changed_uniforms.indexOf(key);
                    if (changed_uniform_index === -1) {
                        Services.logger.error('[on_material_file_change] changed_uniform_index not found', key, material_info);
                        return;
                    }

                    changed_uniforms.splice(changed_uniform_index, 1);

                    if (changed_uniforms.length === 0) {
                        // Больше изменённых юниформов нет - возвращаем к оригиналу
                        delete material_info.instances[hash];
                        delete material_info.material_hash_to_changed_uniforms[hash];

                        const meshes_info = deepClone(material_info.material_hash_to_meshes_info[hash]);
                        delete material_info.material_hash_to_meshes_info[hash];

                        meshes_info.forEach((mesh_info) => {
                            material_info.material_hash_to_meshes_info[material_info.origin].push(mesh_info);
                            if (!material_info.mesh_info_to_material_hashes[mesh_info.id]) {
                                material_info.mesh_info_to_material_hashes[mesh_info.id] = [];
                            }
                            material_info.mesh_info_to_material_hashes[mesh_info.id][mesh_info.index] = material_info.origin;

                            const mesh = Services.scene.get_by_id(mesh_info.id) as Slice9Mesh;
                            if (!mesh) return;

                            mesh.set_material(material_info.name);
                        });
                    }
                });
            }
        }
    }

    function set_project_path(path: string) {
        project_path = path;
    }

    function set_project_name(name: string) {
        project_name = name;
    }

    // === Сцены ===

    async function preload_scene(path: string) {
        const response = await api.GET(URL_PATHS.ASSETS + `/${project_name}${path}`);
        if (!response || !response.ok) {
            return;
        }

        const text = await response.text();
        const parsed = JSON.parse(text) as IBaseEntityData[] | { scene_data: IBaseEntityData[] };

        const scene_data = Array.isArray(parsed) ? parsed : parsed.scene_data;

        if (scene_data !== undefined && scene_data.length > 0) {
            cache_scene(path, scene_data[0]);
        }
    }

    function cache_scene(path: string, data: IBaseEntityData) {
        if (data.children !== undefined) {
            for (const obj of data.children) {
                if (["sprite", "text", "lable"].includes(obj.type))
                    continue;
                scenes[path] = { is_component: false, data };
                return;
            }
        }
        scenes[path] = { is_component: true, data };
    }

    function get_scene_info(path: string) {
        return scenes[path];
    }

    // === Шрифты ===

    async function preload_font(path: string, override = false) {
        path = get_project_url(path);

        const name = get_file_name(path);
        Services.logger.info('[preload_font] Loading font:', name, path);

        if (!override && fonts[name]) {
            Services.logger.warn('[preload_font] Font exists:', name, path);
            return true;
        }

        return new Promise<boolean>((resolve, _reject) => {
            preloadFont({
                font: path,
                characters: font_characters
            }, () => {
                if (fonts[name]) {
                    Services.logger.warn('[preload_font] Font exists already:', name, path);
                }
                fonts[name] = path;
                Services.logger.info('[preload_font] Font loaded successfully:', name);
                resolve(true);
            });
        });
    }

    function get_font(name: string) {
        return fonts[name];
    }

    function get_fonts() {
        return Object.keys(fonts);
    }

    function get_all_fonts() {
        return Object.keys(fonts);
    }

    // === Слои ===

    function add_layer(layer: string) {
        if (!layers.includes(layer)) {
            layers.push(layer);
        }
    }

    function remove_layer(layer: string) {
        const index = layers.indexOf(layer);
        if (index !== -1) {
            layers.splice(index, 1);
        }
    }

    function get_layers() {
        return layers;
    }

    function has_layer(layer: string) {
        return layers.includes(layer);
    }

    function get_layers_mask_by_names(layers_names: string[]) {
        if (layers_names.length === 0) {
            return 0;
        }
        return layers_names.map(layer => {
            const index = layers.indexOf(layer);
            if (index === -1) {
                Services.logger.warn(`Layer "${layer}" not found in layers array`);
                return 0;
            }
            if (index > 10) {
                Services.logger.warn(`Layer "${layer}" index ${index} exceeds maximum allowed value of 10`);
                return 0;
            }
            return 1 << index;
        }).reduce((acc, curr) => acc | curr, 0);
    }

    function get_layers_names_by_mask(mask: number) {
        const result: string[] = [];
        for (let i = 0; i < Math.min(10, layers.length); i++) {
            if (mask & (1 << i)) {
                result.push(layers[i]);
            }
        }
        return result;
    }

    // === Tilemaps ===

    function set_tilemap_path(tilemap: string, path: string) {
        tilemap_paths[tilemap] = path;
    }

    function get_tilemap_path(tilemap: string) {
        return tilemap_paths[tilemap];
    }

    function set_tile_info(tilemap: string, tile_id: string, value: string) {
        if (!tilemap_info[tilemap]) {
            tilemap_info[tilemap] = {};
        }
        tilemap_info[tilemap][tile_id] = value;
    }

    function get_tile_info(tilemap: string, tile_id: string) {
        return tilemap_info[tilemap][tile_id];
    }

    function get_all_loaded_tilemaps() {
        return Object.keys(tilemap_info);
    }

    // === Metadata ===

    async function write_metadata() {
        try {
            const atlases_data = texture_manager.get_atlases_data();
            const metadata = await Services.client_api.get_info('atlases');
            if (!metadata.result) {
                if (metadata.data !== undefined) {
                    throw new Error('Failed on get atlases metadata!');
                }
            }
            const metadata_atlases = {} as TRecursiveDict;
            for (const [atlas_name, textures] of Object.entries(atlases_data)) {
                if (!metadata_atlases[atlas_name]) {
                    metadata_atlases[atlas_name] = {} as TRecursiveDict;
                }
                const metadata_atlas = metadata_atlases[atlas_name] as TRecursiveDict;
                for (const [texture_name, texture] of Object.entries(textures)) {
                    const texture_path = (texture.data.texture as { path?: string }).path;
                    metadata_atlas[texture_name] = {
                        path: texture_path !== undefined ? texture_path.replace(project_path, '') : '',
                        minFilter: texture.data.texture.minFilter,
                        magFilter: texture.data.texture.magFilter,
                        wrapS: texture.data.texture.wrapS,
                        wrapT: texture.data.texture.wrapT
                    };
                }
            }
            const save_result = await Services.client_api.save_info('atlases', metadata_atlases);
            if (!save_result.result) {
                throw new Error('Failed on save atlases metadata!');
            }

            const layers_metadata = await Services.client_api.get_info('layers');
            if (!layers_metadata.result && layers_metadata.data !== undefined) {
                throw new Error('Failed on get layers metadata!');
            }
            const layers_dict: TRecursiveDict = {};
            layers.forEach((layer, index) => {
                if (index === 0) return;
                layers_dict[index.toString()] = layer;
            });
            const save_layers_result = await Services.client_api.save_info('layers', layers_dict);
            if (!save_layers_result.result) {
                throw new Error('Failed on save layers metadata!');
            }
        } catch (error) {
            Services.logger.error('Error writing metadata:', error);
        }
    }

    async function update_from_metadata() {
        try {
            const metadata = await Services.client_api.get_info('atlases');
            if (!metadata.result) {
                if (metadata.data === undefined) {
                    Services.logger.debug('Update resource manager from metadata: atlases not found!');
                    return;
                }
                Services.logger.warn('Update resource manager from metadata: failed on get atlases!');
                return;
            }
            const metadata_atlases = metadata.data as TRecursiveDict;
            const atlases_data = texture_manager.get_atlases_data();
            for (const [atlas_name, textures] of Object.entries(metadata_atlases)) {
                if (!texture_manager.has_atlas(atlas_name)) {
                    texture_manager.add_atlas(atlas_name);
                }
                for (const [texture_name, texture_data] of Object.entries(textures)) {
                    const old_atlas = texture_manager.get_atlas_by_texture_name(texture_name);
                    texture_manager.override_atlas_texture(old_atlas || '', atlas_name, texture_name);

                    if (typeof texture_data === 'object' && texture_data !== null) {
                        const data = texture_data as { minFilter?: MinificationTextureFilter; magFilter?: MagnificationTextureFilter; wrapS?: Wrapping; wrapT?: Wrapping };
                        if (texture_manager.has_texture_name(texture_name, atlas_name)) {
                            const atlas_data = atlases_data[atlas_name];
                            if (atlas_data && atlas_data[texture_name]) {
                                const texture = atlas_data[texture_name].data.texture;
                                if (data.minFilter !== undefined) {
                                    texture.minFilter = data.minFilter;
                                }
                                if (data.magFilter !== undefined) {
                                    texture.magFilter = data.magFilter;
                                }
                                if (data.wrapS !== undefined) {
                                    texture.wrapS = data.wrapS;
                                }
                                if (data.wrapT !== undefined) {
                                    texture.wrapT = data.wrapT;
                                }
                            }
                        }
                    }
                }
            }

            const layers_metadata = await Services.client_api.get_info('layers');
            if (!layers_metadata.result) {
                if (layers_metadata.data === undefined) {
                    Services.logger.debug('Update resource manager from metadata: layers not found!');
                    return;
                }
                Services.logger.warn('Update resource manager from metadata: failed on get layers!');
                return;
            }
            const metadata_layers = layers_metadata.data as TRecursiveDict;
            Object.keys(metadata_layers).forEach(key => {
                const layer = metadata_layers[key];
                if (typeof layer === 'string') {
                    layers.push(layer);
                }
            });
        } catch (error) {
            Services.logger.error('Error updating resource manager:', error);
        }
    }

    // === Load asset ===

    async function load_asset(path: string) {
        path = get_project_url(path);
        return await (await fetch(path)).json();
    }

    init();

    // Публичный API - делегирует большинство вызовов менеджерам
    return {
        // Asset loading
        load_asset,

        // Textures (делегируем TextureManager)
        add_texture: (...args: Parameters<typeof texture_manager.add_texture>) => texture_manager.add_texture(...args),
        load_texture: (...args: Parameters<typeof texture_manager.load_texture>) => texture_manager.load_texture(...args),
        has_texture_name: (...args: Parameters<typeof texture_manager.has_texture_name>) => texture_manager.has_texture_name(...args),
        preload_atlas: (...args: Parameters<typeof texture_manager.preload_atlas>) => texture_manager.preload_atlas(...args),
        preload_texture: (...args: Parameters<typeof texture_manager.preload_texture>) => texture_manager.preload_texture(...args),
        get_texture: (...args: Parameters<typeof texture_manager.get_texture>) => texture_manager.get_texture(...args),
        free_texture: (...args: Parameters<typeof texture_manager.free_texture>) => texture_manager.free_texture(...args),
        get_atlas: (...args: Parameters<typeof texture_manager.get_atlas>) => texture_manager.get_atlas(...args),
        get_atlas_by_texture_name: (...args: Parameters<typeof texture_manager.get_atlas_by_texture_name>) => texture_manager.get_atlas_by_texture_name(...args),
        add_atlas: (...args: Parameters<typeof texture_manager.add_atlas>) => texture_manager.add_atlas(...args),
        has_atlas: (...args: Parameters<typeof texture_manager.has_atlas>) => texture_manager.has_atlas(...args),
        del_atlas: (...args: Parameters<typeof texture_manager.del_atlas>) => texture_manager.del_atlas(...args),
        get_all_atlases: () => texture_manager.get_all_atlases(),
        get_all_textures: () => texture_manager.get_all_textures(),
        override_atlas_texture: (...args: Parameters<typeof texture_manager.override_atlas_texture>) => texture_manager.override_atlas_texture(...args),

        // Audio (делегируем AudioResourceManager)
        preload_audio: (...args: Parameters<typeof audio_manager.preload_audio>) => audio_manager.preload_audio(...args),
        get_all_sounds: () => audio_manager.get_all_sounds(),
        get_sound_buffer: (...args: Parameters<typeof audio_manager.get_sound_buffer>) => audio_manager.get_sound_buffer(...args),

        // Shaders (делегируем ShaderManager)
        preload_vertex_program: (...args: Parameters<typeof shader_manager.preload_vertex_program>) => shader_manager.preload_vertex_program(...args),
        preload_fragment_program: (...args: Parameters<typeof shader_manager.preload_fragment_program>) => shader_manager.preload_fragment_program(...args),
        get_all_vertex_programs: () => shader_manager.get_all_vertex_programs(),
        get_all_fragment_programs: () => shader_manager.get_all_fragment_programs(),

        // Materials (делегируем MaterialManager)
        preload_material: (...args: Parameters<typeof material_manager.preload_material>) => material_manager.preload_material(...args),
        get_material_info: (...args: Parameters<typeof material_manager.get_material_info>) => material_manager.get_material_info(...args),
        is_material_origin_hash: (...args: Parameters<typeof material_manager.is_material_origin_hash>) => material_manager.is_material_origin_hash(...args),
        get_material_by_hash: (...args: Parameters<typeof material_manager.get_material_by_hash>) => material_manager.get_material_by_hash(...args),
        get_material_hash_by_mesh_id: (...args: Parameters<typeof material_manager.get_material_hash_by_mesh_id>) => material_manager.get_material_hash_by_mesh_id(...args),
        get_material_by_mesh_id: (...args: Parameters<typeof material_manager.get_material_by_mesh_id>) => material_manager.get_material_by_mesh_id(...args),
        set_material_property_for_mesh: (...args: Parameters<typeof material_manager.set_material_property_for_mesh>) => material_manager.set_material_property_for_mesh(...args),
        set_material_property_for_multiple_mesh: (...args: Parameters<typeof material_manager.set_material_property_for_multiple_mesh>) => material_manager.set_material_property_for_multiple_mesh(...args),
        set_material_uniform_for_original: (...args: Parameters<typeof material_manager.set_material_uniform_for_original>) => material_manager.set_material_uniform_for_original(...args),
        set_material_transparent_for_original: (...args: Parameters<typeof material_manager.set_material_transparent_for_original>) => material_manager.set_material_transparent_for_original(...args),
        set_material_shader_for_original: (...args: Parameters<typeof material_manager.set_material_shader_for_original>) => material_manager.set_material_shader_for_original(...args),
        set_material_uniform_for_mesh: (...args: Parameters<typeof material_manager.set_material_uniform_for_mesh>) => material_manager.set_material_uniform_for_mesh(...args),
        set_material_uniform_for_multiple_material_mesh: (...args: Parameters<typeof material_manager.set_material_uniform_for_multiple_material_mesh>) => material_manager.set_material_uniform_for_multiple_material_mesh(...args),
        set_material_define_for_mesh: (...args: Parameters<typeof material_manager.set_material_define_for_mesh>) => material_manager.set_material_define_for_mesh(...args),
        set_material_define_for_multiple_material_mesh: (...args: Parameters<typeof material_manager.set_material_define_for_multiple_material_mesh>) => material_manager.set_material_define_for_multiple_material_mesh(...args),
        has_material_by_mesh_id: (...args: Parameters<typeof material_manager.has_material_by_mesh_id>) => material_manager.has_material_by_mesh_id(...args),
        unlink_material_for_mesh: (...args: Parameters<typeof material_manager.unlink_material_for_mesh>) => material_manager.unlink_material_for_mesh(...args),
        unlink_material_for_multiple_material_mesh: (...args: Parameters<typeof material_manager.unlink_material_for_multiple_material_mesh>) => material_manager.unlink_material_for_multiple_material_mesh(...args),
        get_info_about_unique_materials: () => material_manager.get_info_about_unique_materials(),
        get_changed_uniforms_for_mesh: (...args: Parameters<typeof material_manager.get_changed_uniforms_for_mesh>) => material_manager.get_changed_uniforms_for_mesh(...args),
        get_changed_uniforms_for_multiple_material_mesh: (...args: Parameters<typeof material_manager.get_changed_uniforms_for_multiple_material_mesh>) => material_manager.get_changed_uniforms_for_multiple_material_mesh(...args),
        get_all_materials: () => material_manager.get_all_materials(),

        // Models (делегируем ModelManager)
        preload_model: (...args: Parameters<typeof model_manager.preload_model>) => model_manager.preload_model(...args),
        get_model: (...args: Parameters<typeof model_manager.get_model>) => model_manager.get_model(...args),
        get_all_models: () => model_manager.get_all_models(),
        get_all_model_animations: (...args: Parameters<typeof model_manager.get_all_model_animations>) => model_manager.get_all_model_animations(...args),
        find_animation: (...args: Parameters<typeof model_manager.find_animation>) => model_manager.find_animation(...args),
        get_animations_by_model: (...args: Parameters<typeof model_manager.get_animations_by_model>) => model_manager.get_animations_by_model(...args),

        // Fonts (локальные)
        preload_font,
        get_font,
        get_fonts,
        get_all_fonts,

        // Scenes (локальные)
        preload_scene,
        get_scene_info,
        cache_scene,

        // Layers (локальные)
        add_layer,
        remove_layer,
        get_layers,
        has_layer,
        get_layers_mask_by_names,
        get_layers_names_by_mask,

        // Tilemaps (локальные)
        set_tilemap_path,
        get_tilemap_path,
        set_tile_info,
        get_tile_info,
        get_all_loaded_tilemaps,

        // Project
        set_project_path,
        set_project_name,
        get_project_url,

        // Metadata
        update_from_metadata,
        write_metadata,

        // Прямой доступ к данным моделей
        get models() { return model_manager.models; },
        get animations() { return model_manager.animations; }
    };
}
