import { TDictionary, TILES_INFO_EXT } from "@editor/modules_editor/modules_editor_const";
import { error_popup, get_file_name, is_tile } from "./helpers/utils";
import { SpriteTileInfoDict } from "./tile_loader";
import { Blending, Texture } from "three";
import { GoSprite } from "./objects/sub_types";
import { Slice9Mesh } from "./objects/slice9";
import { MaterialUniformType } from "./resource_manager";
import { get_hash_by_mesh } from "@editor/inspectors/ui_utils";
import { convertThreeJSBlendingToBlendMode, convertBlendModeToThreeJS } from "@editor/inspectors/helpers";
import { BlendMode } from "@editor/inspectors/MeshInspector";

export type TilesInfo =
    TDictionary<{ texture?: string, layers_mask?: number, material_name?: string, blending?: Blending, color?: string, alpha?: number, uniforms?: TDictionary<any> }>;

export function TilePatcher(tilemap_path: string) {
    const tilemap_name = get_file_name(tilemap_path);
    ResourceManager.set_tilemap_path(tilemap_name, tilemap_path);

    EventBus.on('SYS_VIEW_INPUT_KEY_DOWN', (e) => {
        if (Input.is_control() && (e.key == 'l' || e.key == 'д')) {
            save_tilesinfo_popup();
        }
    });

    function save_tilesinfo_popup() {
        log('lol');
        Popups.open({
            type: "Select",
            params: { title: "Tilemap:", button: "Ok", auto_close: true, list: ResourceManager.get_all_loaded_tilemaps().map((tilemap) => { return { id: tilemap, title: tilemap } }) },
            callback: async (success, data) => {
                if (success && data) {
                    const tilemap_name = data.itemId as string;
                    const dir = ResourceManager.get_tilemap_path(tilemap_name).replace(/^\//, '').replace(new RegExp(`${tilemap_name}.*$`), '');
                    const path = await new_tilesinfo(dir, tilemap_name);
                    if (path) {
                        save_tilesinfo(path);
                    }
                }
            }
        });
    }

    async function new_tilesinfo(path: string, name: string) {
        const tilesinfo_path = `${path}/${name}.${TILES_INFO_EXT}`
        const r = await ClientAPI.save_data(tilesinfo_path, JSON.stringify({}));
        if (r.result === 0) {
            error_popup(`Не удалось создать tilesinfo, ответ сервера: ${r.message}`);
            return;
        }
        if (r.result && r.data) {
            await AssetControl.go_to_dir(path, true);
        }

        return tilesinfo_path;
    }

    async function save_tilesinfo(path: string) {
        const filename = get_file_name(path);
        const tiles_data: TDictionary<{ texture?: string, layers_mask?: number, material_name?: string, blending?: Blending, color?: string, alpha?: number, uniforms?: TDictionary<any> }> = {};
        SceneManager.get_scene_list().forEach(mesh => {
            if (!is_tile(mesh)) return;

            const hash = get_hash_by_mesh(mesh);

            const current_texture = `${mesh.get_texture()[1]}/${mesh.get_texture()[0]}`;
            if (ResourceManager.get_tile_info(filename, hash) != current_texture) {
                tiles_data[hash] = {
                    texture: current_texture
                };
            }

            // 0, 31, 32
            if (mesh.layers.mask != -2147483647) {
                if (!tiles_data[hash]) tiles_data[hash] = {};
                tiles_data[hash].layers_mask = mesh.layers.mask;
            }

            const material = (mesh as Slice9Mesh).material;
            if (!material) {
                Log.warn(`Material not found for tile ${mesh.name}`);
                return;
            }

            const default_material_name = 'slice9';
            if (material.name != default_material_name) {
                if (!tiles_data[hash]) tiles_data[hash] = {};
                tiles_data[hash].material_name = material.name;
            }

            const default_blend_mode = BlendMode.NORMAL;
            const current_blend_mode = convertThreeJSBlendingToBlendMode(material.blending);
            const is_not_equal_blend_mode = current_blend_mode != default_blend_mode;
            if (is_not_equal_blend_mode) {
                if (!tiles_data[hash]) tiles_data[hash] = {};
                tiles_data[hash].blending = convertBlendModeToThreeJS(current_blend_mode);
            }

            const default_color = '#fff';
            const current_color = mesh.get_color();
            const is_not_equal_color = current_color != default_color;
            if (is_not_equal_color) {
                if (!tiles_data[hash]) tiles_data[hash] = {};
                tiles_data[hash].color = current_color;
            }

            const changed_uniforms = ResourceManager.get_changed_uniforms_for_mesh(mesh as Slice9Mesh);
            if (changed_uniforms) {
                Object.keys(changed_uniforms).forEach((key) => {
                    if (key != 'u_texture') return;
                    delete changed_uniforms[key];
                });
                if (Object.keys(changed_uniforms).length > 0) {
                    if (!tiles_data[hash]) tiles_data[hash] = {};
                    Object.entries(changed_uniforms).forEach(([key, value]) => {
                        if (value instanceof Texture) {
                            changed_uniforms[key] = `/${hash}`;
                        }
                    });
                    tiles_data[hash].uniforms = changed_uniforms;
                }
            }
        });

        const r = await ClientAPI.save_data(path, JSON.stringify(tiles_data));
        if (r && r.result) return Popups.toast.success(`Тайлы сохранены, путь: ${path}`);
        else return Popups.toast.error(`Не удалось сохранить тайлы, путь: ${path}: ${r.message}`);
    }

    async function patch(tiles: SpriteTileInfoDict) {
        Object.entries(tiles).forEach(([id, tile]) => {
            ResourceManager.set_tile_info(tilemap_name, id, `${tile.tile_info.atlas}/${tile.tile_info.name}`);
        });

        const dir = tilemap_path.replace(new RegExp(`${tilemap_name}.*$`), '');
        const tilesinfo_path = `${dir}${tilemap_name}.tilesinfo`;
        const tilesinfo = await ResourceManager.load_asset(tilesinfo_path) as TilesInfo;
        if (!tilesinfo) {
            Log.log(`No tilesinfo file found for tilemap ${tilemap_name}`);
            return;
        }
        Object.entries(tilesinfo).forEach(([id, info]) => {
            const tile = tiles[id];
            if (!tile) return;

            const sprite = tile._hash as GoSprite;

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

            if (info.alpha != undefined) {
                sprite.set_alpha(info.alpha);
            }

            if (info.texture) {
                sprite.set_texture(info.texture);
            }

            if (info.layers_mask != undefined) {
                sprite.layers.mask = info.layers_mask;
            }

            if (info.uniforms) {
                const material_info = ResourceManager.get_material_info(sprite.material.name);
                if (material_info) {
                    Object.entries(info.uniforms).forEach(([uniform_name, uniform_value]) => {
                        // NOTE: для текстур отдельно вызываем set_texture
                        if (material_info.uniforms[uniform_name].type == MaterialUniformType.SAMPLER2D) {
                            const texture_info = uniform_value.split('/');
                            sprite.set_texture(texture_info[1], texture_info[0], uniform_name);
                            return;
                        }
                        ResourceManager.set_material_uniform_for_mesh(sprite as Slice9Mesh, uniform_name, uniform_value);
                    });
                }
            }
        });
    }

    return { patch, save_tilesinfo };
}