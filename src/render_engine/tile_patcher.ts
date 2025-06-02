import { TDictionary } from "@editor/modules_editor/modules_editor_const";
import { get_file_name } from "./helpers/utils";
import { SpriteTileInfoDict } from "./tile_loader";
import { Blending } from "three";
import { GoSprite } from "./objects/sub_types";
import { Slice9Mesh } from "./objects/slice9";

export type TilesInfo =
    TDictionary<{ texture?: string, material_name?: string, blending?: Blending, color?: string, alpha?: number, uniforms?: TDictionary<any> }>;

export function TilePatcher(tilemap_path: string) {
    const tilemap_name = get_file_name(tilemap_path);
    ResourceManager.set_tilemap_path(tilemap_name, tilemap_path);

    async function patch(tiles: SpriteTileInfoDict) {
        Object.entries(tiles).forEach(([id, tile]) => {
            ResourceManager.set_tile_info(tilemap_name, id, `${tile.tile_info.atlas}/${tile.tile_info.name}`);
        });

        // TODO: patch tiles from tilesinfo file by tilemap if exist and check if tile exsist
        const dir = tilemap_path.replace(new RegExp(`${tilemap_name}.*$`), '');
        const tilesinfo_path = `${dir}/${tilemap_name}.tilesinfo`;
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
                sprite.set_material(info.material_name);
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

            if (info.uniforms) {
                Object.entries(info.uniforms).forEach(([uniform_name, uniform_value]) => {
                    ResourceManager.set_material_uniform_for_mesh(sprite as Slice9Mesh, uniform_name, uniform_value);
                });
            }
        });
    }

    return { patch };
}