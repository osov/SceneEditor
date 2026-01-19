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

// IMaterialService теперь определён в MaterialService.ts
