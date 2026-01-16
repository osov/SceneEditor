import { TDictionary, TILES_INFO_EXT } from "@editor/modules_editor/modules_editor_const";
import { get_file_name, is_tile, get_hash_by_mesh } from "./helpers/utils";
import { SpriteTileInfoDict } from "./tile_loader";
import { Blending, Texture } from "three";
import { GoSprite } from "./objects/sub_types";
import { Slice9Mesh } from "./objects/slice9";
import { MaterialUniformType } from "./resource_manager";
import { BlendMode, convert_blend_mode_to_threejs, convert_threejs_to_blend_mode } from "@editor/core/render/blend";
import { Services } from '@editor/core';
import { get_client_api } from '@editor/modules_editor/ClientAPI';
import { get_popups } from '@editor/modules_editor/Popups';
import { get_asset_control } from '@editor/controls/AssetControl';

export type TilesInfo =
    TDictionary<{ texture?: string, layers_mask?: number, material_name?: string, blending?: Blending, color?: string, alpha?: number, uniforms?: TDictionary<any>, z?: number }>;


export function TilePatcher(tilemap_path: string) {
    const tilemap_name = get_file_name(tilemap_path);
    Services.resources.set_tilemap_path(tilemap_name, tilemap_path);

    Services.event_bus.on('input:key_down', (data) => {
        const e = data as { key: string };
        if (Services.input.is_control() && (e.key == 'l' || e.key == 'д')) {
            save_tilesinfo(true);
        }
    });

    async function save_tilesinfo(optimized = false) {
        const dir = tilemap_path.replace(/^\//, '').replace(new RegExp(`/${tilemap_name}.*$`), '');
        const path = `${dir}/${tilemap_name}.${TILES_INFO_EXT}`

        const filename = get_file_name(path);
        const tiles_data: TilesInfo = {};
        Services.scene.get_all().forEach(scene_obj => {
            if (!is_tile(scene_obj)) return;
            const mesh = scene_obj as unknown as GoSprite;

            const hash = get_hash_by_mesh(mesh);

            const current_texture = `${mesh.get_texture()[1]}/${mesh.get_texture()[0]}`;
            if (Services.resources.get_tile_info(filename, hash) !== current_texture) {
                tiles_data[hash] = {
                    texture: current_texture
                };
            }

            // 0, 31, 32
            if (mesh.layers.mask !== -2147483647) {
                if (tiles_data[hash] === undefined) tiles_data[hash] = {};
                tiles_data[hash].layers_mask = mesh.layers.mask;
            }

            const material = (mesh as unknown as Slice9Mesh).material;
            if (material === undefined) {
                Services.logger.warn(`Material not found for tile ${mesh.name}`);
                return;
            }

            const default_material_name = 'slice9';
            if (material.name !== default_material_name) {
                if (tiles_data[hash] === undefined) tiles_data[hash] = {};
                tiles_data[hash].material_name = material.name;
            }

            const default_blend_mode = BlendMode.NORMAL;
            const current_blend_mode = convert_threejs_to_blend_mode(material.blending);
            const is_not_equal_blend_mode = current_blend_mode !== default_blend_mode;
            if (is_not_equal_blend_mode) {
                if (tiles_data[hash] === undefined) tiles_data[hash] = {};
                tiles_data[hash].blending = convert_blend_mode_to_threejs(current_blend_mode);
            }

            const default_color = '#fff';
            const current_color = mesh.get_color();
            const is_not_equal_color = current_color !== default_color;
            if (is_not_equal_color) {
                if (tiles_data[hash] === undefined) tiles_data[hash] = {};
                tiles_data[hash].color = current_color;
            }

            const material_info = Services.resources.get_material_info(material.name);

            let uniforms: { [key: string]: unknown } = {};
            if (optimized) uniforms = Services.resources.get_changed_uniforms_for_mesh(mesh as unknown as Slice9Mesh) || {};
            else if (material.name !== default_material_name) {
                Object.entries(material.uniforms).forEach(([key, value]) => {
                    uniforms[key] = value.value;
                });
            }

            if (material_info !== undefined && uniforms !== undefined) {
                Object.keys(uniforms).forEach((key) => {
                    const uniformInfoData = material_info.uniforms[key] as { readonly?: boolean } | undefined;
                    if (uniformInfoData === undefined || !uniformInfoData.readonly) return;
                    delete uniforms[key];
                });
                Object.keys(uniforms).forEach((key) => {
                    if (key !== 'u_texture') return;
                    delete uniforms[key];
                });
                if (Object.keys(uniforms).length > 0) {
                    if (tiles_data[hash] === undefined) tiles_data[hash] = {};
                    Object.entries(uniforms).forEach(([key, value]) => {
                        if (value instanceof Texture) {
                            const texture_name = get_file_name((value as Texture & { path: string }).path);
                            const atlas = Services.resources.get_atlas_by_texture_name(texture_name);
                            uniforms[key] = `${atlas}/${texture_name}`;
                        }
                    });
                    tiles_data[hash].uniforms = uniforms as TDictionary<unknown>;
                }
            }

            const mesh_extended = mesh as GoSprite & { tile_z?: number };
            if (mesh_extended.tile_z !== undefined) {
                const src_z = mesh_extended.tile_z;
                if (math.abs(src_z - mesh.position.z) > 0.0001) {
                    if (tiles_data[hash] === undefined) tiles_data[hash] = {};
                    tiles_data[hash].z = mesh.position.z;
                }
            }
        });

        const r = await get_client_api().save_data(path, JSON.stringify(tiles_data));
        if (r && r.result) {
            await get_asset_control().go_to_dir(dir, true);
            return get_popups().toast.success(`Тайлы сохранены, путь: ${path}`);
        }
        else return get_popups().toast.error(`Не удалось сохранить тайлы, путь: ${path}: ${r.message}`);
    }

    async function patch(tiles: SpriteTileInfoDict) {
        Object.entries(tiles).forEach(([id, tile]) => {
            Services.resources.set_tile_info(tilemap_name, id, `${tile.tile_info.atlas}/${tile.tile_info.name}`);
        });

        const dir = tilemap_path.replace(new RegExp(`${tilemap_name}.*$`), '');
        const tilesinfo_path = `${dir}${tilemap_name}.tilesinfo`;
        const tilesinfo = await Services.resources.load_asset(tilesinfo_path) as TilesInfo;
        if (!tilesinfo) {
            Services.logger.debug(`No tilesinfo file found for tilemap ${tilemap_name}`);
            return;
        }

        Object.entries(tilesinfo).forEach(([id, info]) => {
            const tile = tiles[id];
            if (!tile) return;

            const sprite = tile._hash as GoSprite;

            if (info.layers_mask != undefined) {
                sprite.layers.mask = info.layers_mask;
            }

            if (info.material_name) {
                const texture_data = sprite.get_texture();
                sprite.set_material(info.material_name);
                sprite.set_texture(texture_data[0], texture_data[1]);
            }

            if (info.blending != undefined) {
                sprite.material.blending = info.blending;
            }

            if (info.color) {
                sprite.set_color(info.color);
            }

            if (info.texture) {
                const texture_info = info.texture.split('/');
                sprite.set_texture(texture_info[1], texture_info[0]);
            }

            if (info.uniforms) {
                const material_info = Services.resources.get_material_info(sprite.material.name);
                if (material_info) {
                    Object.entries(info.uniforms).forEach(([uniform_name, uniform_value]) => {
                        const uniformInfo = material_info.uniforms[uniform_name] as { type?: string } | undefined;
                        // NOTE: для текстур отдельно вызываем set_texture
                        if (uniformInfo !== undefined && uniformInfo.type === MaterialUniformType.SAMPLER2D) {
                            const texture_info = (uniform_value as string).split('/');
                            sprite.set_texture(texture_info[1], texture_info[0], uniform_name);
                            return;
                        }
                        Services.resources.set_material_uniform_for_mesh(sprite as Slice9Mesh, uniform_name, uniform_value);
                    });
                }
            }

            if (info.z != undefined) {
                sprite.position.z = info.z;
                //sprite.set_color('#f00');
                Services.logger.debug('other Z', sprite.name);
            }
        });
    }

    return { patch, save_tilesinfo };
}