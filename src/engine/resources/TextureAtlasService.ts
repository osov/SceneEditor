// Объединённый сервис управления текстурами и атласами

import { CanvasTexture, RepeatWrapping, Texture, TextureLoader, Vector2, Vector4 } from 'three';
import { Services } from '@editor/core';
import { IS_LOGGING } from '@editor/config';
import { parse_tp_data_to_uv } from '../../render_engine/parsers/atlas_parser';
import { get_file_name } from '../../render_engine/helpers/file';
import type { AtlasesStorage, TextureData, TextureInfo } from './types';

export interface ITextureAtlasService {
    // Текстуры
    preload_texture(path: string, atlas?: string, override?: boolean): Promise<TextureData | undefined>;
    add_texture(path: string, atlas: string, texture: Texture, override?: boolean): TextureData;
    get_texture(name: string, atlas?: string): TextureData;
    has_texture_name(name: string, atlas?: string): boolean;
    get_all_textures(): TextureInfo[];
    free_texture(name: string, atlas?: string): void;
    load_texture(path: string): Promise<Texture>;

    // Атласы
    preload_atlas(atlas_path: string, texture_path: string, override?: boolean): Promise<Texture | undefined>;
    add_atlas(name: string): void;
    has_atlas(name: string): boolean;
    del_atlas(name: string): void;
    get_all_atlases(): string[];
    get_atlas(name: string): Texture | null;
    get_atlas_by_texture_name(texture_name: string): string | null;
    override_atlas_texture(old_atlas: string, new_atlas: string, name: string): void;

    // Доступ к хранилищу
    get_atlases_storage(): AtlasesStorage;
}

/**
 * Создаёт объединённый сервис текстур и атласов
 * @param get_project_url - функция получения полного URL проекта
 * @param project_path_getter - функция получения пути проекта
 * @param project_name_getter - функция получения имени проекта
 */
export function TextureAtlasServiceCreate(
    get_project_url: (path: string) => string,
    project_path_getter: () => string,
    project_name_getter: () => string
): ITextureAtlasService {
    const texture_loader = new TextureLoader();
    const atlases: AtlasesStorage = { '': {} };
    let bad_texture: CanvasTexture;

    function init() {
        gen_bad_texture();
    }

    function gen_bad_texture() {
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
        (textureCanvas as CanvasTexture & { system: boolean }).system = true;
        textureCanvas.name = 'null';
        bad_texture = textureCanvas;
    }

    // === Текстуры ===

    function has_texture_name(name: string, atlas = ''): boolean {
        if (!has_atlas(atlas)) return false;
        return atlases[atlas][name] !== undefined;
    }

    async function load_texture(path: string): Promise<Texture> {
        const full_path = get_project_url(path);
        const texture = await texture_loader.loadAsync(full_path);
        (texture as Texture & { path: string }).path = full_path;
        return texture;
    }

    async function preload_texture(path: string, atlas = '', override = false): Promise<TextureData | undefined> {
        const name = get_file_name(path);
        if (!override && has_texture_name(name, atlas)) {
            IS_LOGGING && Services.logger.warn('texture exists', name, atlas);
            return atlases[atlas][name].data;
        }
        const texture = await load_texture(path);

        if (texture === undefined)
            return;

        if (!has_atlas(atlas)) {
            add_atlas(atlas);
        }
        if (atlases[atlas][name] !== undefined) {
            Services.logger.warn('texture exists already', name, atlas);
        }

        const image = texture.image as HTMLImageElement;
        atlases[atlas][name] = {
            data: {
                texture,
                uvOffset: new Vector2(0, 0),
                uv12: new Vector4(0, 1, 1, 0),
                uvScale: new Vector2(1, 1),
                size: new Vector2(image.width, image.height)
            }
        };

        return atlases[atlas][name].data;
    }

    function add_texture(path: string, atlas = '', texture: Texture, override = false): TextureData {
        const name = get_file_name(path);
        if (!override && has_texture_name(name, atlas)) {
            Services.logger.warn('Texture already exists', name, atlas);
            return atlases[atlas][name].data;
        }

        if (!has_atlas(atlas)) {
            add_atlas(atlas);
        }

        if (atlases[atlas][name] !== undefined) {
            Services.logger.warn('Texture already exists', name, atlas);
        }

        const image = texture.image as HTMLImageElement;
        atlases[atlas][name] = {
            data: {
                texture,
                uvOffset: new Vector2(0, 0),
                uv12: new Vector4(0, 1, 1, 0),
                uvScale: new Vector2(1, 1),
                size: new Vector2(image.width, image.height)
            }
        };
        (texture as Texture & { path: string }).path = path;

        return atlases[atlas][name].data;
    }

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
        }
        return atlases[atlas][name].data;
    }

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

    function free_texture(name: string, atlas = ''): void {
        if (has_texture_name(name, atlas)) {
            const tex_data = atlases[atlas][name].data;
            delete atlases[atlas][name];
            const image = tex_data.texture.image as HTMLImageElement;
            if (image.src !== undefined) {
                URL.revokeObjectURL(image.src);
            }
            tex_data.texture.dispose();
            Services.logger.debug('Texture free', name, atlas);
        } else {
            Services.logger.error('Texture not found', name, atlas);
        }
    }

    // === Атласы ===

    function add_atlas(name: string): void {
        if (has_atlas(name)) {
            Services.logger.warn(`Atlas ${name} already exist!`);
        }
        atlases[name] = {};
    }

    function has_atlas(name: string): boolean {
        return atlases[name] !== undefined;
    }

    function del_atlas(name: string): void {
        if (atlases[name] === undefined) {
            Services.logger.warn(`Atlas ${name} not found!`);
        }

        if (!has_atlas('')) {
            add_atlas('');
        }

        const textures = atlases[name];
        Object.entries(textures).forEach(([texture_name, data]) => {
            atlases[''][texture_name] = data;
        });

        delete atlases[name];
    }

    function get_all_atlases(): string[] {
        return Object.keys(atlases);
    }

    function get_atlas(name: string): Texture | null {
        if (atlases[name] === undefined)
            return null;
        const values = Object.values(atlases[name]);
        if (values[0] === undefined) return null;
        return values[0].data.texture;
    }

    function get_atlas_by_texture_name(texture_name: string): string | null {
        if (texture_name === '') {
            return '';
        }

        for (const [atlas_name, textures] of Object.entries(atlases)) {
            if (textures[texture_name] !== undefined) {
                return atlas_name;
            }
        }

        Services.logger.error('Atlas not found', texture_name);
        return null;
    }

    async function preload_atlas(atlas_path: string, texture_path: string, override = false): Promise<Texture | undefined> {
        const name = get_file_name(atlas_path);
        const project_path = project_path_getter();
        const project_name = project_name_getter();

        if (!override && atlases[name] !== undefined) {
            Services.logger.warn('atlas exists', name);
            const textures = Object.values(atlases[name]);
            if (textures[0] !== undefined) {
                return textures[0].data.texture;
            }
        }

        const data = await (await fetch(project_path + '/' + project_name + atlas_path)).text();
        const texture = await load_texture(texture_path);
        if (texture === undefined)
            return;

        const image = texture.image as HTMLImageElement;
        const texture_data = parse_tp_data_to_uv(data, image.width, image.height);

        if (!has_atlas(name)) {
            add_atlas(name);
        }

        for (const texture_name in texture_data) {
            const tex_data = texture_data[texture_name];
            atlases[name][texture_name] = {
                data: {
                    texture,
                    size: new Vector2(image.width * tex_data.uvScale[0], image.width * tex_data.uvScale[1]),
                    uvOffset: new Vector2(tex_data.uvOffset[0], tex_data.uvOffset[1]),
                    uv12: new Vector4(tex_data.uv12[0], tex_data.uv12[1], tex_data.uv12[2], tex_data.uv12[3]),
                    uvScale: new Vector2(tex_data.uvScale[0], tex_data.uvScale[1])
                }
            };
        }
        return texture;
    }

    function override_atlas_texture(old_atlas: string, new_atlas: string, name: string): void {
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

    function get_atlases_storage(): AtlasesStorage {
        return atlases;
    }

    // Инициализация
    init();

    return {
        // Текстуры
        preload_texture,
        add_texture,
        get_texture,
        has_texture_name,
        get_all_textures,
        free_texture,
        load_texture,

        // Атласы
        preload_atlas,
        add_atlas,
        has_atlas,
        del_atlas,
        get_all_atlases,
        get_atlas,
        get_atlas_by_texture_name,
        override_atlas_texture,

        // Доступ к хранилищу
        get_atlases_storage
    };
}
