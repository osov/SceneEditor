// Типы для системы материалов
// Объединение типов из material_types.ts и managers/types.ts

import type { ShaderMaterial, Texture } from 'three';

/**
 * Типы uniform-параметров материала
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

/**
 * Параметры для разных типов uniform
 */
export type MaterialUniformParams = {
    [MaterialUniformType.FLOAT]: object;
    [MaterialUniformType.RANGE]: { min?: number; max?: number; step?: number };
    [MaterialUniformType.VEC2]: {
        x: { min?: number; max?: number; step?: number };
        y: { min?: number; max?: number; step?: number };
    };
    [MaterialUniformType.VEC3]: {
        x: { min?: number; max?: number; step?: number };
        y: { min?: number; max?: number; step?: number };
        z: { min?: number; max?: number; step?: number };
    };
    [MaterialUniformType.VEC4]: {
        x: { min?: number; max?: number; step?: number };
        y: { min?: number; max?: number; step?: number };
        z: { min?: number; max?: number; step?: number };
        w: { min?: number; max?: number; step?: number };
    };
    [MaterialUniformType.COLOR]: object;
    [MaterialUniformType.SAMPLER2D]: object;
};

/**
 * Описание uniform в материале
 */
export interface MaterialUniform<T extends keyof MaterialUniformParams = keyof MaterialUniformParams> {
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
 * Полная информация о материале и его копиях
 */
export interface MaterialInfo {
    name: string;
    path: string;
    vertexShader: string;
    fragmentShader: string;
    uniforms: Record<string, MaterialUniform>;
    /** Хеш оригинального материала для сравнений */
    origin: string;
    /** Все копии материала, получение по хешу */
    instances: Record<string, ShaderMaterial>;
    /** Для быстрого поиска используемого мешем материала */
    mesh_info_to_material_hashes: Record<number, string[]>;
    /** Для быстрого поиска мешей использующих один материал */
    material_hash_to_meshes_info: Record<string, MeshMaterialLink[]>;
    /** Для быстрого поиска измененных юниформов у копии материала */
    material_hash_to_changed_uniforms: Record<string, string[]>;
}

/**
 * Данные текстуры для материала
 */
export interface TextureData {
    texture: Texture;
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
    process_shader_includes(shader_source: string): string;
}

import type { DataFormatType } from '@editor/modules_editor/modules_editor_const';

/**
 * Ответ API при сохранении данных
 */
export interface SaveDataResponse {
    result: number;
    message?: string;
}

/**
 * Зависимости для создания MaterialService
 */
export interface MaterialServiceDeps {
    /** Функция получения текстуры по имени и атласу */
    get_texture: (name: string, atlas: string) => TextureData;
    /** Функция получения атласа по имени текстуры */
    get_atlas_by_texture_name: (texture_name: string) => string | null;
    /** Функция получения vertex шейдера */
    get_vertex_program: (path: string) => string | undefined;
    /** Функция получения fragment шейдера */
    get_fragment_program: (path: string) => string | undefined;
    /** Функция обработки #include директив в шейдере */
    process_shader_includes: (shader_source: string) => string;
    /** Функция получения содержимого файла по пути (устраняет зависимость от AssetControl) */
    get_file_data: (path: string) => Promise<string | null>;
    /** Функция сохранения содержимого файла (устраняет зависимость от AssetControl) */
    save_file_data: (path: string, data: string, format?: DataFormatType) => Promise<SaveDataResponse>;
}

/**
 * Данные материала из файла
 */
export interface MaterialFileData {
    vertexShader: string;
    fragmentShader: string;
    transparent: boolean;
    uniforms: Record<string, {
        type: MaterialUniformType;
        params: MaterialUniformParams[keyof MaterialUniformParams];
        readonly?: boolean;
        hide?: boolean;
    }>;
    data: Record<string, unknown>;
}
