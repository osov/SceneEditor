/**
 * MaterialService - сервис управления материалами
 *
 * Извлечено из resource_manager.ts (Фаза 12b)
 * Управляет загрузкой, кэшированием и модификацией ShaderMaterial
 */

import { IUniform, ShaderMaterial, Texture, Vector2, Vector3, Vector4 } from 'three';
import { copy_material } from '../../render_engine/helpers/material';
import { get_file_name } from '../../render_engine/helpers/file';
import { shader } from '../../render_engine/objects/slice9';
import { deepClone, getObjectHash, hexToRGB, rgbToHex } from '../../modules/utils';
import type { MaterialInfo, MeshMaterialLink } from './material_types';
import { MaterialUniformType } from './material_types';
import type { IShaderService } from './material_types';
import type { TextureData } from './types';
import { Services } from '@editor/core';
import { get_asset_control } from '@editor/controls/AssetControl';

/**
 * Параметры для создания MaterialService
 */
export interface MaterialServiceParams {
    /** Сервис шейдеров для получения vertex/fragment программ */
    shader_service: IShaderService;
    /** Функция получения текстуры по имени и атласу */
    get_texture: (name: string, atlas: string) => TextureData;
    /** Функция получения атласа по имени текстуры */
    get_atlas_by_texture_name: (texture_name: string) => string | null;
}

/**
 * Интерфейс MaterialService
 */
export interface IMaterialService {
    // Загрузка
    preload_material(path: string): Promise<MaterialInfo | undefined>;
    load_material(path: string): Promise<MaterialInfo | undefined>;

    // Получение информации
    get_material_info(name: string): MaterialInfo | null;
    has_material(name: string): boolean;
    is_material_origin_hash(material_name: string, hash: string): boolean;
    get_material_by_hash(material_name: string, hash: string): ShaderMaterial | null;
    get_material_hash(material: ShaderMaterial): string;
    get_material_hash_by_mesh_id(material_name: string, mesh_id: number, index?: number): string | null;
    get_material_by_mesh_id(material_name: string, mesh_id: number, index?: number): ShaderMaterial | null;
    has_material_by_mesh_id(material_name: string, mesh_id: number, index?: number): boolean;

    // Изменение свойств материала
    set_material_property(material_info: MaterialInfo, mesh_id: number, index: number, property_name: string, value: unknown): boolean;

    // Изменение юниформов
    set_material_uniform_for_original<T>(material_name: string, uniform_name: string, value: T, is_save?: boolean): Promise<void>;
    set_material_uniform<T>(material_info: MaterialInfo, mesh_id: number, index: number, uniform_name: string, value: T): boolean;
    set_material_shader_for_original(material_name: string, shader_type: 'vertex' | 'fragment', shader_path: string): Promise<void>;

    // Изменение define
    set_material_define<T>(material_info: MaterialInfo, mesh_id: number, index: number, define_name: string, value?: T): boolean;

    // Связь меш-материал
    unlink_material(material_info: MaterialInfo, mesh_id: number, index: number): void;

    // Списки
    get_all_materials(): string[];
    get_info_about_unique_materials(): { [key: string]: { origin: string; copies: string[] } };
    get_changed_uniforms(material_info: MaterialInfo, mesh_id: number, index: number): { [key: string]: unknown };

    // Обработчики изменений файлов
    on_material_file_change(path: string): Promise<void>;
    on_vertex_shader_change(path: string): Promise<void>;
    on_fragment_shader_change(path: string): Promise<void>;
}

/**
 * Создаёт сервис управления материалами
 */
export function MaterialServiceCreate(params: MaterialServiceParams): IMaterialService {
    const { shader_service, get_texture, get_atlas_by_texture_name } = params;

    const materials: { [name: string]: MaterialInfo } = {};

    /**
     * Создаёт встроенные материалы (slice9)
     */
    function create_default_materials(): void {
        const slice9_material = new ShaderMaterial({
            vertexShader: shader.vertexShader,
            fragmentShader: shader.fragmentShader,
            transparent: true,
            uniforms: {
                u_texture: { value: null },
                alpha: { value: 1.0 },
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
            },
            origin: '',
            instances: {},
            mesh_info_to_material_hashes: {},
            material_hash_to_meshes_info: {},
            material_hash_to_changed_uniforms: {},
        };

        // Вычисляем hash оригинального материала
        const not_readonly_uniforms: Record<string, IUniform> = {};
        Object.entries(slice9_material.uniforms).forEach(([key, uniform]) => {
            if (slice9_info.uniforms[key]?.readonly) {
                return;
            }
            not_readonly_uniforms[key] = uniform;
        });

        slice9_info.origin = getObjectHash({
            uniforms: not_readonly_uniforms,
            defines: slice9_material.defines,
            depthTest: slice9_material.depthTest,
            stencilWrite: slice9_material.stencilWrite,
            stencilRef: slice9_material.stencilRef,
            stencilFunc: slice9_material.stencilFunc,
            stencilZPass: slice9_material.stencilZPass,
            colorWrite: slice9_material.colorWrite,
        });

        slice9_info.instances[slice9_info.origin] = slice9_material;
        slice9_info.material_hash_to_meshes_info[slice9_info.origin] = [];

        materials['slice9'] = slice9_info;
    }

    /**
     * Загружает материал из файла
     */
    async function load_material(path: string): Promise<MaterialInfo | undefined> {
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

        const vertexShader = shader_service.get_vertex_program(data.vertexShader);
        material.vertexShader = (vertexShader) ? vertexShader : shader.vertexShader;

        const fragmentShader = shader_service.get_fragment_program(data.fragmentShader);
        material.fragmentShader = (fragmentShader) ? fragmentShader : shader.fragmentShader;

        material.transparent = data.transparent;

        Object.keys(data.uniforms).forEach((key) => {
            material_info.uniforms[key] = {
                type: data.uniforms[key].type,
                params: { ...data.uniforms[key].params },
                readonly: data.uniforms[key].readonly,
                hide: data.uniforms[key].hide
            };
            switch (data.uniforms[key].type) {
                case MaterialUniformType.SAMPLER2D: {
                    const texture_name = get_file_name(data.data[key] || '');
                    const atlas = get_atlas_by_texture_name(texture_name);
                    const texture_data = get_texture(texture_name, atlas || '');
                    const result = { value: texture_data.texture } as IUniform<Texture>;
                    material.uniforms[key] = result;
                    break;
                }
                case MaterialUniformType.VEC2:
                    material.uniforms[key] = { value: new Vector2(...data.data[key]) } as IUniform<Vector2>;
                    break;
                case MaterialUniformType.VEC3:
                    material.uniforms[key] = { value: new Vector3(...data.data[key]) } as IUniform<Vector3>;
                    break;
                case MaterialUniformType.VEC4:
                    material.uniforms[key] = { value: new Vector4(...data.data[key]) } as IUniform<Vector4>;
                    break;
                case MaterialUniformType.COLOR:
                    material.uniforms[key] = { value: hexToRGB(data.data[key]) } as IUniform<Vector3>;
                    break;
                default:
                    material.uniforms[key] = { value: data.data[key] };
                    break;
            }
        });

        // Без вызова get_material_hash потому что еще не создан material_info
        const not_readonly_uniforms: { [uniform: string]: IUniform<unknown> } = {};
        Object.entries(material.uniforms).forEach(([key, uniform]) => {
            if (material_info.uniforms[key].readonly) {
                return;
            }
            not_readonly_uniforms[key] = uniform;
        });

        material_info.origin = getObjectHash({
            uniforms: not_readonly_uniforms,
            defines: material.defines,
            depthTest: material.depthTest,
            stencilWrite: material.stencilWrite,
            stencilRef: material.stencilRef,
            stencilFunc: material.stencilFunc,
            stencilZPass: material.stencilZPass,
            colorWrite: material.colorWrite,
        });

        material_info.instances[material_info.origin] = material;
        material_info.material_hash_to_meshes_info[material_info.origin] = [];

        return material_info;
    }

    /**
     * Предзагружает материал и кэширует его
     */
    async function preload_material(path: string): Promise<MaterialInfo | undefined> {
        const name = get_file_name(path);
        if (has_material(name)) {
            return materials[name];
        }

        const material = await load_material(path);
        if (!material) return;

        materials[name] = material;
        return material;
    }

    /**
     * Получает информацию о материале по имени
     */
    function get_material_info(name: string): MaterialInfo | null {
        const material_info = materials[name];
        if (!material_info) {
            Services.logger.error('Material info not found', name, materials);
            return null;
        }
        return material_info;
    }

    /**
     * Проверяет существует ли материал
     */
    function has_material(name: string): boolean {
        return materials[name] !== undefined;
    }

    /**
     * Вычисляет хеш материала на основе его свойств (без readonly юниформов)
     */
    function get_material_hash(material: ShaderMaterial): string {
        const material_info = get_material_info(material.name);
        if (material_info === null) {
            Services.logger.error('Material info not found', material.name);
            return 'error';
        }

        const not_readonly_uniforms: { [uniform: string]: IUniform<unknown> } = {};
        Object.entries(material.uniforms).forEach(([key, uniform]) => {
            const uniformInfo = material_info.uniforms[key] as { readonly?: boolean } | undefined;
            if (uniformInfo?.readonly) {
                return;
            }
            not_readonly_uniforms[key] = uniform;
        });

        const hash = getObjectHash({
            blending: material.blending,
            uniforms: not_readonly_uniforms,
            defines: material.defines,
            depthTest: material.depthTest,
            stencilWrite: material.stencilWrite,
            stencilRef: material.stencilRef,
            stencilFunc: material.stencilFunc,
            stencilZPass: material.stencilZPass,
            colorWrite: material.colorWrite,
        });

        return hash;
    }

    /**
     * Проверяет является ли хеш оригинальным для материала
     */
    function is_material_origin_hash(material_name: string, hash: string): boolean {
        const material_info = get_material_info(material_name);
        if (!material_info) return false;
        return material_info.origin === hash;
    }

    /**
     * Получает материал по хешу
     */
    function get_material_by_hash(material_name: string, hash: string): ShaderMaterial | null {
        const material_info = get_material_info(material_name);
        if (!material_info) return null;
        const material = material_info.instances[hash];
        if (!material) {
            Services.logger.error('Material by hash not found', hash, material_info);
            return null;
        }
        return material;
    }

    /**
     * Получает хеш материала по ID меша
     */
    function get_material_hash_by_mesh_id(material_name: string, mesh_id: number, index = 0): string | null {
        const material_info = get_material_info(material_name);
        if (!material_info) return null;
        const hash = material_info.mesh_info_to_material_hashes[mesh_id]?.[index];
        if (!hash) {
            Services.logger.error('Material hash by mesh id not found', mesh_id, index, material_info);
            return null;
        }
        return hash;
    }

    /**
     * Проверяет есть ли привязка материала к мешу
     */
    function has_material_by_mesh_id(material_name: string, mesh_id: number, index = 0): boolean {
        const material_info = get_material_info(material_name);
        if (!material_info || !material_info.mesh_info_to_material_hashes[mesh_id]) return false;
        return material_info.mesh_info_to_material_hashes[mesh_id][index] !== undefined;
    }

    /**
     * Получает материал по ID меша
     */
    function get_material_by_mesh_id(material_name: string, mesh_id: number, index = 0): ShaderMaterial | null {
        const material_info = get_material_info(material_name);
        if (!material_info) return null;
        const hashes = material_info.mesh_info_to_material_hashes[mesh_id];

        // Если hash не найден, устанавливаем hash в origin и возвращаем оригинальный материал
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

    /**
     * Устанавливает меш на оригинальный материал
     */
    function set_to_origin(material_info: MaterialInfo, mesh_id: number, index: number, hash: string): void {
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

    /**
     * Устанавливает меш на существующую копию материала
     */
    function set_to_existing_copy(material_info: MaterialInfo, mesh_id: number, index: number, new_hash: string, hash: string): void {
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

    /**
     * Создаёт новую копию материала для меша
     */
    function set_to_new_copy(material_info: MaterialInfo, mesh_id: number, index: number, hash: string, new_hash: string, copy: ShaderMaterial): void {
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

    /**
     * Удаляет копию материала
     */
    function delete_material_instance(material_info: MaterialInfo, hash: string): void {
        delete material_info.material_hash_to_changed_uniforms[hash];
        delete material_info.material_hash_to_meshes_info[hash];
        delete material_info.instances[hash];
    }

    /**
     * Устанавливает свойство материала для меша
     */
    function set_material_property(material_info: MaterialInfo, mesh_id: number, index: number, property_name: string, value: unknown): boolean {
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

    /**
     * Устанавливает юниформ для оригинального материала
     */
    async function set_material_uniform_for_original<T>(material_name: string, uniform_name: string, value: T, is_save = true): Promise<void> {
        const material_info = get_material_info(material_name);
        if (!material_info) return;

        const material = material_info.instances[material_info.origin];
        if (!material) return;

        if (material.uniforms[uniform_name] === undefined) return;

        material.uniforms[uniform_name].value = value;

        const is_readonly = material_info.uniforms[uniform_name].readonly;

        if (!is_readonly) {
            // Обновляем hash оригинального материала
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

        // Обновляем все копии материала
        Object.keys(material_info.instances).filter((hash) => hash !== material_info.origin).forEach((hash) => {
            const copy = get_material_by_hash(material_info.name, hash);
            if (!copy) return;

            // Обновляем только те копии, которые не изменяли этот юниформ
            const is_changed_uniform = material_info.material_hash_to_changed_uniforms[hash].includes(uniform_name);
            if (!is_changed_uniform) {
                copy.uniforms[uniform_name] = material.uniforms[uniform_name];

                if (!is_readonly) {
                    // Обновляем hash в копии материала
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
            // Обновляем значение в файле
            const response = await get_asset_control().get_file_data(material_info.path);
            if (!response) return;

            const material_data = JSON.parse(response);

            // В случае если юниформа это текстура, составляем строку атлас/текстура
            if (value instanceof Texture) {
                const texture_name = get_file_name((value as Texture & { path?: string }).path || '');
                const atlas = get_atlas_by_texture_name(texture_name) || '';
                material_data.data[uniform_name] = `${atlas}/${texture_name}`;
            } else if (material_data.uniforms[uniform_name].type === MaterialUniformType.COLOR) {
                material_data.data[uniform_name] = rgbToHex(value as Vector3);
            } else {
                material_data.data[uniform_name] = value;
            }

            await get_asset_control().save_file_data(material_info.path, JSON.stringify(material_data, null, 2));
        }
    }

    /**
     * Устанавливает шейдер для оригинального материала
     */
    async function set_material_shader_for_original(material_name: string, shader_type: 'vertex' | 'fragment', shader_path: string): Promise<void> {
        const material_info = get_material_info(material_name);
        if (!material_info) return;

        // Обновляем путь к шейдеру в info
        if (shader_type === 'vertex') {
            material_info.vertexShader = shader_path;
        } else {
            material_info.fragmentShader = shader_path;
        }

        // Загружаем новый шейдер
        const shader_code = shader_type === 'vertex'
            ? shader_service.get_vertex_program(shader_path)
            : shader_service.get_fragment_program(shader_path);

        if (!shader_code) {
            Services.logger.error(`[set_material_shader_for_original] Shader not found: ${shader_path}`);
            return;
        }

        // Обновляем шейдер в оригинальном материале
        const origin = material_info.instances[material_info.origin];
        if (origin) {
            if (shader_type === 'vertex') {
                origin.vertexShader = shader_code;
            } else {
                origin.fragmentShader = shader_code;
            }
            origin.needsUpdate = true;
        }

        // Обновляем шейдер во всех копиях
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

        // Сохраняем в файл
        const response = await get_asset_control().get_file_data(material_info.path);
        if (!response) return;

        const material_data = JSON.parse(response);
        if (shader_type === 'vertex') {
            material_data.vertexShader = shader_path;
        } else {
            material_data.fragmentShader = shader_path;
        }
        await get_asset_control().save_file_data(material_info.path, JSON.stringify(material_data, null, 2));
    }

    /**
     * Устанавливает юниформ для меша
     */
    function set_material_uniform<T>(material_info: MaterialInfo, mesh_id: number, index: number, uniform_name: string, value: T): boolean {
        const uniform = material_info.uniforms[uniform_name];
        if (!uniform) {
            Services.logger.error('Uniform not found', uniform_name, material_info.name);
            return false;
        }

        if (uniform.readonly) {
            Services.logger.error('Uniform is readonly', uniform_name, material_info.name);
            return false;
        }

        const mesh_material = get_material_by_mesh_id(material_info.name, mesh_id);
        if (!mesh_material) return false;

        const hash = material_info.mesh_info_to_material_hashes[mesh_id][index];

        const mesh_material_copy = copy_material(mesh_material);
        mesh_material_copy.uniforms[uniform_name].value = value;

        const new_hash = get_material_hash(mesh_material_copy);

        if (material_info.origin === new_hash) {
            set_to_origin(material_info, mesh_id, index, hash);
            return true;
        }

        // Проверяем, существует ли копия материала с таким hash
        if (material_info.instances[new_hash]) {
            set_to_existing_copy(material_info, mesh_id, index, new_hash, hash);
            return true;
        }

        // Создаём новую копию
        set_to_new_copy(material_info, mesh_id, index, hash, new_hash, mesh_material_copy);

        if (!material_info.material_hash_to_changed_uniforms[new_hash].includes(uniform_name)) {
            material_info.material_hash_to_changed_uniforms[new_hash].push(uniform_name);
        }

        return true;
    }

    /**
     * Устанавливает define для меша
     */
    function set_material_define<T>(material_info: MaterialInfo, mesh_id: number, index: number, define_name: string, value?: T): boolean {
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

        // Проверяем, существует ли копия материала с таким hash
        if (material_info.instances[new_hash]) {
            set_to_existing_copy(material_info, mesh_id, index, new_hash, hash);
            return true;
        }

        // Создаём новую копию
        set_to_new_copy(material_info, mesh_id, index, hash, new_hash, material_copy);

        return true;
    }

    /**
     * Отвязывает материал от меша
     */
    function unlink_material(material_info: MaterialInfo, mesh_id: number, index: number): void {
        const hash = material_info.mesh_info_to_material_hashes[mesh_id]?.[index];
        if (!hash) return;

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

    /**
     * Получает информацию об уникальных материалах
     */
    function get_info_about_unique_materials(): { [key: string]: { origin: string; copies: string[] } } {
        const unique_materials: { [key: string]: { origin: string; copies: string[] } } = {};
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

    /**
     * Получает изменённые юниформы для меша
     */
    function get_changed_uniforms(material_info: MaterialInfo, mesh_id: number, index: number): { [key: string]: unknown } {
        const hash = material_info.mesh_info_to_material_hashes[mesh_id]?.[index];
        if (!hash) return {};

        const changed_uniforms = material_info.material_hash_to_changed_uniforms[hash];
        const changed_uniforms_data: { [key: string]: unknown } = {};
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

    /**
     * Получает список всех материалов
     */
    function get_all_materials(): string[] {
        return Object.keys(materials);
    }

    /**
     * Обработчик изменения vertex shader файла
     */
    async function on_vertex_shader_change(path: string): Promise<void> {
        const vertexShader = await get_asset_control().get_file_data(path);
        if (!vertexShader) return;

        // Изменяем оригинальные материалы и копии
        for (const material_info of Object.values(materials)) {
            if (material_info.vertexShader === '/' + path) {
                const origin = get_material_by_hash(material_info.name, material_info.origin);
                if (!origin) continue;

                origin.vertexShader = vertexShader;
                origin.needsUpdate = true;

                Object.keys(material_info.instances).filter((hash) => hash !== material_info.origin).forEach((hash) => {
                    const copy = get_material_by_hash(material_info.name, hash);
                    if (!copy) return;

                    copy.vertexShader = vertexShader;
                    copy.needsUpdate = true;
                });
            }
        }
    }

    /**
     * Обработчик изменения fragment shader файла
     */
    async function on_fragment_shader_change(path: string): Promise<void> {
        const fragmentShader = await get_asset_control().get_file_data(path);
        if (!fragmentShader) return;

        // Изменяем оригинальные материалы и копии
        for (const material_info of Object.values(materials)) {
            if (material_info.fragmentShader === '/' + path) {
                const origin = get_material_by_hash(material_info.name, material_info.origin);
                if (!origin) continue;

                origin.fragmentShader = fragmentShader;
                origin.needsUpdate = true;

                Object.keys(material_info.instances).filter((hash) => hash !== material_info.origin).forEach((hash) => {
                    const copy = get_material_by_hash(material_info.name, hash);
                    if (!copy) return;

                    copy.fragmentShader = fragmentShader;
                    copy.needsUpdate = true;
                });
            }
        }
    }

    /**
     * Обработчик изменения файла материала
     */
    async function on_material_file_change(path: string): Promise<void> {
        const changed_material_info = await load_material(path);
        if (!changed_material_info) return;

        const changed_origin = changed_material_info.instances[changed_material_info.origin];
        if (!changed_origin) return;

        const material_name = get_file_name(path);
        const material_info = get_material_info(material_name);
        if (!material_info) return;

        const origin = get_material_by_hash(material_info.name, material_info.origin);
        if (!origin) return;

        // Обновляем шейдеры
        if (material_info.vertexShader !== changed_material_info.vertexShader) {
            material_info.vertexShader = changed_material_info.vertexShader;
            await on_vertex_shader_change(changed_material_info.vertexShader);
        }

        if (material_info.fragmentShader !== changed_material_info.fragmentShader) {
            material_info.fragmentShader = changed_material_info.fragmentShader;
            await on_fragment_shader_change(changed_material_info.fragmentShader);
        }

        // Обновляем прозрачность
        if (origin.transparent !== changed_origin.transparent) {
            origin.transparent = changed_origin.transparent;

            Object.keys(material_info.instances).filter((hash) => hash !== material_info.origin).forEach((hash) => {
                const copy = get_material_by_hash(material_info.name, hash);
                if (!copy) return;

                copy.transparent = changed_origin.transparent;
            });
        }

        // Обновляем или добавляем новые юниформы
        for (const [key, uniform] of Object.entries(changed_material_info.uniforms)) {
            const undefined_uniform = material_info.uniforms[key] === undefined;
            if (undefined_uniform || material_info.uniforms[key] !== uniform) {
                material_info.uniforms[key] = { ...uniform };
                origin.uniforms[key] = changed_origin.uniforms[key];

                Object.keys(material_info.instances).filter((hash) => hash !== material_info.origin).forEach((hash) => {
                    const copy = get_material_by_hash(material_info.name, hash);
                    if (!copy) return;

                    // Обновляем только те копии, которые не изменяли этот юниформ
                    const is_changed_uniform = material_info.material_hash_to_changed_uniforms[hash].includes(key);
                    if (undefined_uniform || !is_changed_uniform) {
                        copy.uniforms[key] = changed_origin.uniforms[key];
                    }
                });
            }
        }

        // Удаляем юниформы если они не существуют в измененном материале
        for (const key of Object.keys(material_info.uniforms)) {
            if (!changed_material_info.uniforms[key]) {
                delete material_info.uniforms[key];
                delete origin.uniforms[key];

                Object.keys(material_info.instances).filter((hash) => hash !== material_info.origin).forEach((hash) => {
                    const copy = get_material_by_hash(material_info.name, hash);
                    if (!copy) return;

                    const changed_uniforms = material_info.material_hash_to_changed_uniforms[hash];
                    const changed_uniform_index = changed_uniforms.indexOf(key);
                    if (changed_uniform_index === -1) {
                        Services.logger.error('[on_material_file_change] changed_uniform_index not found', key, material_info);
                        return;
                    }

                    changed_uniforms.splice(changed_uniform_index, 1);

                    // Больше измененных юниформов нет, удаляем копию
                    if (changed_uniforms.length === 0) {
                        delete material_info.instances[hash];
                        delete material_info.material_hash_to_changed_uniforms[hash];

                        const meshes_info = deepClone(material_info.material_hash_to_meshes_info[hash]);
                        delete material_info.material_hash_to_meshes_info[hash];

                        meshes_info.forEach((mesh_info: MeshMaterialLink) => {
                            material_info.material_hash_to_meshes_info[material_info.origin].push(mesh_info);
                            if (!material_info.mesh_info_to_material_hashes[mesh_info.id]) {
                                material_info.mesh_info_to_material_hashes[mesh_info.id] = [];
                            }
                            material_info.mesh_info_to_material_hashes[mesh_info.id][mesh_info.index] = material_info.origin;
                        });

                        return;
                    }

                    // Перегенерируем hash и переорганизуем копии
                    const new_material = copy_material(copy);
                    delete new_material.uniforms[key];
                    const new_hash = get_material_hash(new_material);

                    // Все значения как в оригинале
                    if (material_info.origin === new_hash) {
                        delete material_info.instances[hash];
                        delete material_info.material_hash_to_changed_uniforms[hash];

                        const meshes_info = deepClone(material_info.material_hash_to_meshes_info[hash]);
                        delete material_info.material_hash_to_meshes_info[hash];

                        meshes_info.forEach((mesh_info: MeshMaterialLink) => {
                            material_info.material_hash_to_meshes_info[material_info.origin].push(mesh_info);
                            if (!material_info.mesh_info_to_material_hashes[mesh_info.id]) {
                                material_info.mesh_info_to_material_hashes[mesh_info.id] = [];
                            }
                            material_info.mesh_info_to_material_hashes[mesh_info.id][mesh_info.index] = material_info.origin;
                        });

                        return;
                    }

                    // Копия с такими же значениями уже существует
                    if (material_info.instances[new_hash]) {
                        delete material_info.instances[hash];
                        delete material_info.material_hash_to_changed_uniforms[hash];

                        const meshes_info = deepClone(material_info.material_hash_to_meshes_info[hash]);
                        delete material_info.material_hash_to_meshes_info[hash];

                        meshes_info.forEach((mesh_info: MeshMaterialLink) => {
                            material_info.material_hash_to_meshes_info[new_hash].push(mesh_info);
                            if (!material_info.mesh_info_to_material_hashes[mesh_info.id]) {
                                material_info.mesh_info_to_material_hashes[mesh_info.id] = [];
                            }
                            material_info.mesh_info_to_material_hashes[mesh_info.id][mesh_info.index] = new_hash;
                        });

                        return;
                    }

                    // Создаём новую копию
                    material_info.instances[new_hash] = new_material;

                    delete material_info.instances[hash];
                    delete material_info.material_hash_to_changed_uniforms[hash];

                    const meshes_info = deepClone(material_info.material_hash_to_meshes_info[hash]);
                    delete material_info.material_hash_to_meshes_info[hash];

                    meshes_info.forEach((mesh_info: MeshMaterialLink) => {
                        material_info.material_hash_to_meshes_info[new_hash].push(mesh_info);
                        if (!material_info.mesh_info_to_material_hashes[mesh_info.id]) {
                            material_info.mesh_info_to_material_hashes[mesh_info.id] = [];
                        }
                        material_info.mesh_info_to_material_hashes[mesh_info.id][mesh_info.index] = new_hash;
                    });
                });
            }
        }
    }

    // Инициализация встроенных материалов
    create_default_materials();

    return {
        preload_material,
        load_material,
        get_material_info,
        has_material,
        get_material_hash,
        is_material_origin_hash,
        get_material_by_hash,
        get_material_hash_by_mesh_id,
        get_material_by_mesh_id,
        has_material_by_mesh_id,
        set_material_property,
        set_material_uniform_for_original,
        set_material_uniform,
        set_material_shader_for_original,
        set_material_define,
        unlink_material,
        get_all_materials,
        get_info_about_unique_materials,
        get_changed_uniforms,
        on_material_file_change,
        on_vertex_shader_change,
        on_fragment_shader_change
    };
}
