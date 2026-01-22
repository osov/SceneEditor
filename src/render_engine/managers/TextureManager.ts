// Менеджер текстур и атласов

import { CanvasTexture, RepeatWrapping, Texture, TextureLoader, Vector2, Vector4 } from 'three';
import { get_file_name } from '../helpers/file';
import { parse_tp_data_to_uv } from '../parsers/atlas_parser';
import { Services } from '@editor/core/ServiceProvider';
import { IS_LOGGING } from '@editor/config';
import type { AssetData, TextureData, TextureInfo } from './types';

export interface TextureManagerConfig {
    get_project_url: () => (path: string) => string;
    get_project_path: () => string;
    get_project_name: () => string;
}

/**
 * Менеджер текстур и атласов.
 * Отвечает за загрузку, кеширование и управление текстурами.
 */
export function create_texture_manager(config: TextureManagerConfig) {
    const texture_loader = new TextureLoader();
    const atlases: { [name: string]: AssetData<TextureData> } = { '': {} };
    let bad_texture: CanvasTexture;

    function init() {
        gen_textures();
    }

    /** Генерация текстуры-заглушки для отсутствующих текстур */
    function gen_textures() {
        const imageCanvas = document.createElement("canvas");
        const context = imageCanvas.getContext("2d")!;
        imageCanvas.width = imageCanvas.height = 128;
        context.fillStyle = "#444";
        context.fillRect(0, 0, 128, 128);
        context.fillStyle = "#fff";
        context.fillRect(0, 0, 64, 64);
        context.fillRect(64, 64, 64, 64);
        const textureCanvas = new CanvasTexture(imageCanvas);
        textureCanvas.wrapS = RepeatWrapping;
        textureCanvas.wrapT = RepeatWrapping;
        (textureCanvas as { system?: boolean }).system = true;
        textureCanvas.name = 'null';
        bad_texture = textureCanvas;
    }

    /** Проверка существования текстуры по имени в атласе */
    function has_texture_name(name: string, atlas = '') {
        if (!has_atlas(atlas)) return false;
        return (atlases[atlas][name] !== undefined);
    }

    /** Загрузка текстуры по пути */
    async function load_texture(path: string) {
        const full_path = config.get_project_url()(path);
        const texture = await texture_loader.loadAsync(full_path);
        texture.userData.path = full_path;
        return texture;
    }

    /** Предзагрузка текстуры */
    async function preload_texture(path: string, atlas = '', override = false) {
        const name = get_file_name(path);
        if (!override && has_texture_name(name, atlas)) {
            IS_LOGGING && Services.logger.warn('texture exists', name, atlas);
            return atlases[atlas][name].data;
        }
        const texture = await load_texture(path);

        if (!texture)
            return;

        if (!has_atlas(atlas)) {
            add_atlas(atlas);
        }
        if (atlases[atlas][name]) {
            Services.logger.warn('texture exists already', name, atlas);
        }
        atlases[atlas][name] = {
            data: {
                texture,
                uvOffset: new Vector2(0, 0),
                uv12: new Vector4(0, 1, 1, 0),
                uvScale: new Vector2(1, 1),
                size: new Vector2(texture.image.width, texture.image.height)
            }
        };

        return atlases[atlas][name].data;
    }

    /** Добавление текстуры вручную */
    function add_texture(path: string, atlas = '', texture: Texture, override = false) {
        const name = get_file_name(path);
        if (!override && has_texture_name(name, atlas)) {
            Services.logger.warn('Texture already exists', name, atlas);
            return atlases[atlas][name].data;
        }

        if (!has_atlas(atlas)) {
            add_atlas(atlas);
        }

        if (atlases[atlas][name]) {
            Services.logger.warn('Texture already exists', name, atlas);
        }

        // NOTE: texture.image может быть null для асинхронно загружаемых FBX текстур
        const image = texture.image as HTMLImageElement | undefined;
        const width = image?.width ?? 0;
        const height = image?.height ?? 0;

        atlases[atlas][name] = {
            data: {
                texture,
                uvOffset: new Vector2(0, 0),
                uv12: new Vector4(0, 1, 1, 0),
                uvScale: new Vector2(1, 1),
                size: new Vector2(width, height)
            }
        };

        // Для FBX embedded текстур путь может быть именем материала, а не URL
        // Пробуем получить blob URL из image.src если path не является URL
        let texture_path = path;
        if (!path.includes('/') && !path.includes(':')) {
            const image_src = (texture.image as HTMLImageElement | undefined)?.src;
            if (image_src !== undefined && image_src !== '') {
                texture_path = image_src;
            }
        }
        texture.userData.path = texture_path;

        return atlases[atlas][name].data;
    }

    /** Предзагрузка атласа */
    async function preload_atlas(atlas_path: string, texture_path: string, override = false) {
        const name = get_file_name(atlas_path);
        if (!override && atlases[name]) {
            Services.logger.warn('atlas exists', name);
            const textures = Object.values(atlases[name]);
            if (textures[0]) {
                return textures[0].data.texture;
            }
        }

        const project_path = config.get_project_path();
        const project_name = config.get_project_name();
        const data = await (await fetch(project_path + '/' + project_name + atlas_path)).text();
        const texture = await load_texture(texture_path);
        if (!texture)
            return;

        const texture_data = parse_tp_data_to_uv(data, texture.image.width, texture.image.height);

        if (!has_atlas(name)) {
            add_atlas(name);
        }

        for (const texture_name in texture_data) {
            const tex_data = texture_data[texture_name];
            atlases[name][texture_name] = {
                data: {
                    texture,
                    size: new Vector2(texture.image.width * tex_data.uvScale[0], texture.image.width * tex_data.uvScale[1]),
                    uvOffset: new Vector2(tex_data.uvOffset[0], tex_data.uvOffset[1]),
                    uv12: new Vector4(tex_data.uv12[0], tex_data.uv12[1], tex_data.uv12[2], tex_data.uv12[3]),
                    uvScale: new Vector2(tex_data.uvScale[0], tex_data.uvScale[1])
                }
            };
        }
        return texture;
    }

    /** Получение текстуры по имени */
    function get_texture(name: string, atlas = ''): TextureData {
        if (!has_texture_name(name, atlas)) {
            if (name !== '') {
                Services.logger.error('Texture not found', name, atlas);
            }
            return {
                texture: bad_texture,
                size: new Vector2(128, 128),
                uvOffset: new Vector2(0, 0),
                uv12: new Vector4(0, 1, 1, 0),
                uvScale: new Vector2(1, 1)
            };
        };
        return atlases[atlas][name].data;
    }

    /** Получение текстуры атласа */
    function get_atlas(name: string) {
        if (!atlases[name])
            return null;
        const values = Object.values(atlases[name]);
        return values[0].data.texture;
    }

    /** Получение списка всех атласов */
    function get_all_atlases() {
        return Object.keys(atlases);
    }

    /** Поиск атласа по имени текстуры */
    function get_atlas_by_texture_name(texture_name: string): string | null {
        if (texture_name === '') {
            return '';
        }

        for (const [atlas_name, textures] of Object.entries(atlases)) {
            if (textures[texture_name]) {
                return atlas_name;
            }
        }

        Services.logger.error('Atlas not found', texture_name);
        return null;
    }

    /** Добавление атласа */
    function add_atlas(name: string) {
        if (has_atlas(name)) {
            Services.logger.warn(`Atlas ${name} already exist!`)
        }
        atlases[name] = {};
    }

    /** Проверка существования атласа */
    function has_atlas(name: string) {
        return atlases[name] !== undefined;
    }

    /** Удаление атласа (текстуры перемещаются в дефолтный атлас) */
    function del_atlas(name: string) {
        if (!atlases[name]) {
            Services.logger.warn(`Atlas ${name} not found!`);
        }

        if (!has_atlas('')) {
            add_atlas('');
        }

        const textures = atlases[name];
        Object.entries(textures).forEach(([texture, data]) => {
            atlases[''][texture] = data;
        });

        delete atlases[name];
    }

    /** Получение списка всех текстур */
    function get_all_textures(): TextureInfo[] {
        const list: TextureInfo[] = [];
        for (const k in atlases) {
            for (const k2 in atlases[k]) {
                const asset = atlases[k][k2];
                list.push({ name: k2, atlas: k, data: asset.data });
            }
        }
        return list;
    }

    /** Освобождение текстуры */
    function free_texture(name: string, atlas = '') {
        if (has_texture_name(name, atlas)) {
            const tex_data = atlases[atlas][name].data;
            delete atlases[atlas][name];
            const image = tex_data.texture.image as HTMLImageElement | undefined;
            if (image?.src !== undefined) {
                URL.revokeObjectURL(image.src);
            }
            tex_data.texture.dispose();
            Services.logger.debug('Texture free', name, atlas);
        }
        else {
            Services.logger.error('Texture not found', name, atlas);
        }
    }

    /** Перенос текстуры между атласами */
    function override_atlas_texture(old_atlas: string, new_atlas: string, name: string) {
        if (!has_texture_name(name, old_atlas)) {
            Services.logger.error('Texture not found', name, old_atlas);
            return;
        }

        const texture = atlases[old_atlas][name];
        delete atlases[old_atlas][name];

        if (!has_atlas(new_atlas)) {
            add_atlas(new_atlas);
        }

        atlases[new_atlas][name] = texture;
    }

    /** Получение внутреннего объекта атласов для метаданных */
    function get_atlases_data() {
        return atlases;
    }

    init();

    return {
        load_texture,
        has_texture_name,
        preload_texture,
        add_texture,
        preload_atlas,
        get_texture,
        get_atlas,
        get_all_atlases,
        get_atlas_by_texture_name,
        add_atlas,
        has_atlas,
        del_atlas,
        get_all_textures,
        free_texture,
        override_atlas_texture,
        get_atlases_data
    };
}

export type ITextureManager = ReturnType<typeof create_texture_manager>;
