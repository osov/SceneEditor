// Типы для системы материалов

import { ShaderMaterial } from 'three';

/**
 * Параметры юниформов материала по типу
 */
export enum MaterialUniformType {
    FLOAT = 'float',
    RANGE = 'range',
    VEC2 = 'vec2',
    VEC3 = 'vec3',
    VEC4 = 'vec4',
    COLOR = 'color',
    SAMPLER2D = 'sampler2D'
}

export type MaterialUniformParams = {
    [MaterialUniformType.FLOAT]: object;
    [MaterialUniformType.RANGE]: { min?: number, max?: number, step?: number };
    [MaterialUniformType.VEC2]: {
        x: { min?: number, max?: number, step?: number };
        y: { min?: number, max?: number, step?: number };
    };
    [MaterialUniformType.VEC3]: {
        x: { min?: number, max?: number, step?: number };
        y: { min?: number, max?: number, step?: number };
        z: { min?: number, max?: number, step?: number };
    };
    [MaterialUniformType.VEC4]: {
        x: { min?: number, max?: number, step?: number };
        y: { min?: number, max?: number, step?: number };
        z: { min?: number, max?: number, step?: number };
        w: { min?: number, max?: number, step?: number };
    };
    [MaterialUniformType.COLOR]: object;
    [MaterialUniformType.SAMPLER2D]: object;
}

/**
 * Описание юниформа материала
 */
export interface MaterialUniform<T extends keyof MaterialUniformParams> {
    type: T;
    params: MaterialUniformParams[T];
    readonly?: boolean;
    hide?: boolean;
}

/**
 * Информация о связи меш-материал
 */
export interface MeshMaterialLink {
    id: number;
    index: number;
}

/**
 * Полная информация о материале
 */
export interface MaterialInfo {
    name: string;
    path: string;
    vertexShader: string;
    fragmentShader: string;
    uniforms: {
        [key: string]: MaterialUniform<keyof MaterialUniformParams>
    };
    /** Хеш оригинального материала */
    origin: string;
    /** Все копии материала по хешу */
    instances: {
        [key: string]: ShaderMaterial;
    };
    /** Маппинг меш ID → хеши материалов */
    mesh_info_to_material_hashes: {
        [key: number]: string[];
    };
    /** Обратный маппинг хеш → меши */
    material_hash_to_meshes_info: {
        [key: string]: MeshMaterialLink[];
    };
    /** Изменённые юниформы для каждой копии */
    material_hash_to_changed_uniforms: {
        [key: string]: string[];
    };
}

/**
 * Интерфейс сервиса шейдеров
 */
export interface IShaderService {
    preload_vertex_program(path: string): Promise<string | undefined>;
    preload_fragment_program(path: string): Promise<string | undefined>;
    get_vertex_program(path: string): string | undefined;
    get_fragment_program(path: string): string | undefined;
    has_vertex_program(path: string): boolean;
    has_fragment_program(path: string): boolean;
    get_all_vertex_programs(): string[];
    get_all_fragment_programs(): string[];
}

/**
 * Интерфейс сервиса материалов
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
    get_material_hash_by_mesh_id(material_name: string, mesh_id: number, index?: number): string | null;
    get_material_by_mesh_id(material_name: string, mesh_id: number, index?: number): ShaderMaterial | null;
    has_material_by_mesh_id(material_name: string, mesh_id: number, index?: number): boolean;

    // Изменение юниформов
    set_material_uniform_for_original<T>(material_name: string, uniform_name: string, value: T, is_save?: boolean): Promise<void>;
    set_material_uniform_for_mesh(mesh_id: number, material_name: string, index: number, uniform_name: string, value: unknown): void;

    // Изменение define
    set_material_define_for_mesh(mesh_id: number, material_name: string, index: number, define_name: string, value: unknown): void;

    // Связь меш-материал
    unlink_material_for_mesh(material_name: string, mesh_id: number, index?: number): void;

    // Списки
    get_all_materials(): string[];
    get_info_about_unique_materials(material_name: string): Array<{
        hash: string;
        material: ShaderMaterial;
        meshes_count: number;
    }>;
    get_changed_uniforms_for_mesh(material_name: string, mesh_id: number, index?: number): string[];
}
