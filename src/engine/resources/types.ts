// Типы для сервисов ресурсов

import { Texture, Vector2, Vector4 } from 'three';

/**
 * Данные текстуры с UV-координатами
 */
export interface TextureData {
    texture: Texture;
    uvOffset: Vector2;
    uvScale: Vector2;
    uv12: Vector4;
    size: Vector2;
}

/**
 * Информация о текстуре с указанием атласа
 */
export interface TextureInfo {
    name: string;
    atlas: string;
    data: TextureData;
}

/**
 * Данные ассета текстуры
 */
export interface TextureAssetData {
    data: TextureData;
}

/**
 * Хранилище текстур для атласа
 */
export interface AtlasStorage {
    [textureName: string]: TextureAssetData;
}

/**
 * Хранилище всех атласов
 */
export interface AtlasesStorage {
    [atlasName: string]: AtlasStorage;
}

/**
 * Интерфейс сервиса текстур
 */
export interface ITextureService {
    /** Предзагрузка текстуры */
    preload_texture(path: string, atlas: string, override?: boolean): Promise<TextureData | undefined>;

    /** Добавление текстуры вручную */
    add_texture(path: string, atlas: string, texture: Texture, override?: boolean): TextureData;

    /** Получение текстуры по имени */
    get_texture(name: string, atlas: string): TextureData;

    /** Проверка наличия текстуры */
    has_texture_name(name: string, atlas: string): boolean;

    /** Получение всех текстур */
    get_all_textures(): TextureInfo[];

    /** Освобождение текстуры */
    free_texture(name: string, atlas: string): void;

    /** Загрузка текстуры без кэширования */
    load_texture(path: string): Promise<Texture>;
}

/**
 * Интерфейс сервиса атласов
 */
export interface IAtlasService {
    /** Предзагрузка атласа */
    preload_atlas(atlas_path: string, texture_path: string, override?: boolean): Promise<Texture | undefined>;

    /** Добавление атласа */
    add_atlas(name: string): void;

    /** Проверка наличия атласа */
    has_atlas(name: string): boolean;

    /** Удаление атласа */
    del_atlas(name: string): void;

    /** Получение всех атласов */
    get_all_atlases(): string[];

    /** Получение атласа (первая текстура) */
    get_atlas(name: string): Texture | null;

    /** Поиск атласа по имени текстуры */
    get_atlas_by_texture_name(texture_name: string): string | null;

    /** Перезапись текстуры атласа */
    override_atlas_texture(old_atlas: string, new_atlas: string, name: string): void;
}
