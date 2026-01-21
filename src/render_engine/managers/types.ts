// Общие типы для менеджеров ресурсов

import { ShaderMaterial, Texture, Vector2, Vector4 } from 'three';

/** Тип uniform параметра в материале */
export enum MaterialUniformType {
    FLOAT = 'float',
    RANGE = 'range',
    VEC2 = 'vec2',
    VEC3 = 'vec3',
    VEC4 = 'vec4',
    COLOR = 'color',
    SAMPLER2D = 'sampler2D'
}

/** Параметры для разных типов uniform */
export type MaterialUniformParams = {
    [MaterialUniformType.FLOAT]: {};
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
    [MaterialUniformType.COLOR]: {};
    [MaterialUniformType.SAMPLER2D]: {};
}

/** Описание uniform в материале */
export interface MaterialUniform<T extends keyof MaterialUniformParams> {
    type: T;
    params: MaterialUniformParams[T];
    readonly?: boolean;
    hide?: boolean;
}

/** Копия материала с измененными uniform */
export interface MaterialInstance {
    changed_uniforms: string[];
    data: ShaderMaterial;
}

/** Информация о материале и его копиях */
export interface MaterialInfo {
    name: string;
    path: string;
    vertexShader: string;
    fragmentShader: string;
    uniforms: {
        [key: string]: MaterialUniform<keyof MaterialUniformParams>
    };
    /** Хеш оригинального материала для сравнений */
    origin: string;
    /** Все копии материала, получение по хешу */
    instances: {
        [key: string]: ShaderMaterial;
    };
    /** Для быстрого поиска используемого мешем материала */
    mesh_info_to_material_hashes: {
        [key: number]: string[];
    };
    /** Для быстрого поиска мешей использующих один материал */
    material_hash_to_meshes_info: {
        [key: string]: {
            id: number;
            index: number;
        }[];
    };
    /** Для быстрого поиска измененных юниформов у копии материала */
    material_hash_to_changed_uniforms: {
        [key: string]: string[];
    };
}

/** Данные текстуры */
export interface TextureData {
    texture: Texture;
    uvOffset: Vector2;
    uvScale: Vector2;
    uv12: Vector4;
    size: Vector2;
}

/** Информация о текстуре */
export interface TextureInfo {
    name: string;
    atlas: string;
    data: TextureData;
}

/** Хранилище данных об ассете */
export interface AssetData<T> {
    [k: string]: { data: T };
}

/** Информация об анимации */
export interface AnimationInfo {
    animation: string;
    model: string;
    clip: import('three').AnimationClip;
}

/** Информация о меше в материале */
export interface MeshMaterialInfo {
    id: number;
    index: number;
}
