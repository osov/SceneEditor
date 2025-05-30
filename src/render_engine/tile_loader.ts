import { Vector3, Vector2, Line, BufferGeometry, LineBasicMaterial } from "three";
import { CAMERA_Z, WORLD_SCALAR } from "../config";
import { rotate_point } from "./helpers/utils";
import { parse_tiled, TILE_FLIP_MASK, get_tile_texture, get_depth, apply_tile_transform, MapData, RenderTileData, RenderTileObject, LoadedTileInfo, preload_tiled_textures, TileInfo, set_y_correction } from "./parsers/tile_parser";
import { IObjectTypes } from "./types";
import { GoContainer, GoSprite } from "./objects/sub_types";

export interface SpriteTileInfo {
    tile: RenderTileData | RenderTileObject;
    tile_info: LoadedTileInfo;
    _hash: GoSprite;
}

export type SpriteTileInfoDict = { [k: string]: SpriteTileInfo };

export function get_id_by_tile(tile: RenderTileData | RenderTileObject, id_layer: number) {
    if ('id' in tile)
        return id_layer + '_' + tile.x + '.' + tile.y;
    else
        return tile.id_object + '';
}

export function TileLoader(world: GoContainer, tileSize = 256) {

    function calc_offset_y(map_data: MapData) {
        const render_data = parse_tiled(map_data);
        let max_y = -10000;
        for (let layer of render_data.layers) {
            for (let tile of layer.tiles) {
                const tile_id = tile.id & TILE_FLIP_MASK;
                const tile_info = get_tile_texture(tile_id);
                if (tile_info.h < tileSize) {
                    tile_info.h = tileSize;
                    Log.warn('fix tile_info.h', tile_info);
                }

                // Вычисляем коррекцию
                const tile_w = tile_info.w * WORLD_SCALAR;
                const tile_h = tile_info.h * WORLD_SCALAR;
                let x = tile.x * tileSize * WORLD_SCALAR;
                let y = tile.y * tileSize * WORLD_SCALAR - tileSize * WORLD_SCALAR;
                const new_pos = rotate_point(new Vector3(x, y, 0), new Vector2(tile_w, tile_h), 0);
                x = new_pos.x + tile_w / 2;
                y = new_pos.y + tile_h;
                if (y > max_y)
                    max_y = y;
            }
        }
        return max_y;
    }

    function load(map_data: MapData, tiles_data: TileInfo) {
        const tiles: SpriteTileInfoDict = {};
        const render_data = parse_tiled(map_data);
        preload_tiled_textures(tiles_data, map_data);
        const cor_y = calc_offset_y(map_data);
        log("correction Y:", cor_y);
        set_y_correction(cor_y);
        // TILES
        for (let layer of render_data.layers) {
            const id_layer = layer.id_order;
            const container = SceneManager.create(IObjectTypes.GO_CONTAINER, {});
            container.name = layer.layer_name;
            world.add(container);
            for (let tile of layer.tiles) {
                const tile_id = tile.id & TILE_FLIP_MASK;
                const tile_info = get_tile_texture(tile_id);
                if (tile_info.w < tileSize) {
                    tile_info.w = tileSize;
                    Log.warn('fix tile_info.w', tile_info);
                }
                if (tile_info.h < tileSize) {
                    tile_info.h = tileSize;
                    Log.warn('fix tile_info.h', tile_info);
                }

                // Вычисляем коррекцию
                const tile_w = tile_info.w * WORLD_SCALAR;
                const tile_h = tile_info.h * WORLD_SCALAR;
                let x = tile.x * tileSize * WORLD_SCALAR;
                let y = tile.y * tileSize * WORLD_SCALAR - tileSize * WORLD_SCALAR;
                const new_pos = rotate_point(new Vector3(x, y, 0), new Vector2(tile_w, tile_h), 0);
                x = new_pos.x + tile_w / 2;
                y = new_pos.y + tile_h / 2;
                const z = get_depth(x, y, id_layer, tile_w, tile_h);

                const plane = SceneManager.create(IObjectTypes.GO_SPRITE_COMPONENT, { width: tile_w, height: tile_h });
                plane.position.set(x, y, z);
                plane.set_texture(tile_info.name, tile_info.atlas);
                apply_tile_transform(plane, tile.id);
                container.add(plane);
                plane.name = tile_info.name + '' + plane.mesh_data.id;
                plane.userData = { tile, id_layer };
                const id = get_id_by_tile(tile, id_layer);
                tiles[id] = { tile_info, tile, _hash: plane };
                ResourceManager.tiles_info[id] = `${tile_info.atlas}/${tile_info.name}`;
            }
        }


        // OBJECTS
        for (let object_layer of render_data.objects_layers) {
            const id_layer = object_layer.id_order;
            let id_object = -1;
            const container = SceneManager.create(IObjectTypes.GO_CONTAINER, {});
            container.name = object_layer.layer_name;
            world.add(container);
            for (let tile of object_layer.objects) {
                id_object++;
                if (tile.polygon || tile.polyline) {
                    const cx = tile.x * WORLD_SCALAR;
                    const cy = tile.y * WORLD_SCALAR;
                    const points = [];
                    if (tile.polygon) {
                        for (let point of tile.polygon) {
                            points.push(new Vector2(cx + point.x * WORLD_SCALAR, cy - point.y * WORLD_SCALAR));
                        }
                        points.push(points[0]);
                    }
                    if (tile.polyline) {
                        for (let point of tile.polyline) {
                            points.push(new Vector2(cx + point.x * WORLD_SCALAR, cy - point.y * WORLD_SCALAR));
                        }
                    }
                    const geometry = new BufferGeometry().setFromPoints(points);
                    const material = new LineBasicMaterial({ color: 0xff0000 });

                    const line = new Line(geometry, material);
                    line.position.z = CAMERA_Z - 5;
                    container.add(line);
                }
                else {
                    const tile_id = tile.tile_id & TILE_FLIP_MASK;
                    const tile_info = get_tile_texture(tile_id);
                    if (tile_info != undefined) {
                        const tile_w = tile.width * WORLD_SCALAR;
                        const tile_h = tile.height * WORLD_SCALAR;
                        const x = tile.x * WORLD_SCALAR;
                        const y = tile.y * WORLD_SCALAR;
                        const z = get_depth(x, y, id_layer, tile_w, tile_h);
                        const plane = SceneManager.create(IObjectTypes.GO_SPRITE_COMPONENT, { width: tile_w, height: tile_h });
                        plane.position.set(x, y, z);
                        plane.set_texture(tile_info.name, tile_info.atlas);
                        apply_tile_transform(plane, tile.tile_id);
                        if (tile.rotation)
                            plane.rotation.z = -tile.rotation! * Math.PI / 180;
                        container.add(plane);
                        plane.name = tile_info.name + '' + plane.mesh_data.id;
                        plane.userData = { tile, id_layer };
                        const id = get_id_by_tile(tile, id_layer);
                        tiles[id] = { tile_info, tile, _hash: plane };
                        ResourceManager.tiles_info[id] = `${tile_info.atlas}/${tile_info.name}`;
                    }
                    else {
                        Log.warn('tile not found', tile);
                    }
                }
            }
        }


        return tiles;
    }

    return { load };
}