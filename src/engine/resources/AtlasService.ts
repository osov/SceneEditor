// Сервис управления атласами

import { Texture, Vector2, Vector4 } from 'three';
import { Services } from '@editor/core';
import { parse_tp_data_to_uv } from '../../render_engine/parsers/atlas_parser';
import { get_file_name } from '../../render_engine/helpers/file';
import type { AtlasesStorage, IAtlasService } from './types';

/**
 * Создаёт сервис управления атласами
 * @param atlases - общее хранилище атласов (используется совместно с TextureService)
 * @param project_path_getter - функция получения пути проекта
 * @param project_name_getter - функция получения имени проекта
 * @param load_texture - функция загрузки текстуры
 */
export function AtlasServiceCreate(
    atlases: AtlasesStorage,
    project_path_getter: () => string,
    project_name_getter: () => string,
    load_texture: (path: string) => Promise<Texture>
): IAtlasService {

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
        Object.entries(textures).forEach(([texture, data]) => {
            atlases[''][texture] = data;
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
        if (atlases[old_atlas] === undefined) {
            Services.logger.warn(`Atlas ${old_atlas} not found!`);
            return;
        }

        if (atlases[old_atlas][name] === undefined) {
            Services.logger.warn(`Texture ${name} not found in atlas ${old_atlas}!`);
            return;
        }

        if (!has_atlas(new_atlas)) {
            add_atlas(new_atlas);
        }

        atlases[new_atlas][name] = atlases[old_atlas][name];
        delete atlases[old_atlas][name];
    }

    return {
        preload_atlas,
        add_atlas,
        has_atlas,
        del_atlas,
        get_all_atlases,
        get_atlas,
        get_atlas_by_texture_name,
        override_atlas_texture
    };
}
