// Сервис управления текстурами

import { CanvasTexture, RepeatWrapping, Texture, TextureLoader, Vector2, Vector4 } from 'three';
import { Services } from '@editor/core';
import { IS_LOGGING } from '@editor/config';
import { get_file_name } from '../../render_engine/helpers/file';
import type { AtlasesStorage, ITextureService, TextureData, TextureInfo } from './types';

/**
 * Создаёт сервис управления текстурами
 * @param atlases - общее хранилище атласов (используется совместно с AtlasService)
 * @param get_project_url - функция получения полного URL проекта
 * @param has_atlas - функция проверки существования атласа
 * @param add_atlas - функция добавления атласа
 */
export function TextureServiceCreate(
    atlases: AtlasesStorage,
    get_project_url: (path: string) => string,
    has_atlas: (name: string) => boolean,
    add_atlas: (name: string) => void
): ITextureService {
    const texture_loader = new TextureLoader();
    let bad_texture: CanvasTexture;

    // Инициализация bad_texture
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
        atlases[atlas][name] = {
            data: {
                texture,
                uvOffset: new Vector2(0, 0),
                uv12: new Vector4(0, 1, 1, 0),
                uvScale: new Vector2(1, 1),
                size: new Vector2(
                    (texture.image as HTMLImageElement).width,
                    (texture.image as HTMLImageElement).height
                )
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

        atlases[atlas][name] = {
            data: {
                texture,
                uvOffset: new Vector2(0, 0),
                uv12: new Vector4(0, 1, 1, 0),
                uvScale: new Vector2(1, 1),
                size: new Vector2(
                    (texture.image as HTMLImageElement).width,
                    (texture.image as HTMLImageElement).height
                )
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
        if (!has_texture_name(name, atlas)) {
            Services.logger.warn('Texture not found', name, atlas);
            return;
        }

        const texture_data = atlases[atlas][name];
        if (texture_data.data.texture !== undefined) {
            texture_data.data.texture.dispose();
        }

        delete atlases[atlas][name];
    }

    // Инициализация
    init();

    return {
        preload_texture,
        add_texture,
        get_texture,
        has_texture_name,
        get_all_textures,
        free_texture,
        load_texture
    };
}
