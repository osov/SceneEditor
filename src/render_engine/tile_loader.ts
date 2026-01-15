import { Vector3, Vector2, Line, BufferGeometry, LineBasicMaterial } from "three";
import { CAMERA_Z } from "../config";
import { make_ramk, rotate_point } from "./helpers/utils";
import { parse_tiled, TILE_FLIP_MASK, get_tile_texture, get_depth, apply_tile_transform, MapData, RenderTileData, RenderTileObject, LoadedTileInfo, preload_tiled_textures, TileInfo, set_world_bounds, set_tileset, RenderMapData } from "./parsers/tile_parser";
import { IObjectTypes } from "./types";
import { GoContainer, GoSprite } from "./objects/sub_types";
import { Services } from '@editor/core';


export interface ParsedObject {
    x: number;
    y: number;
    z: number;
    atlas: string;
    texture: string;
    width: number;
    height: number;
    rotation: number | undefined;
    name?: string;  // Опциональное имя объекта из Tiled
}

export interface SpriteTileInfo {
    tile: RenderTileData | RenderTileObject;
    tile_info: LoadedTileInfo;
    _hash: GoSprite;
    data: ParsedObject;
}

export type SpriteTileInfoDict = { [k: string]: SpriteTileInfo };

export function get_id_by_tile(tile: RenderTileData | RenderTileObject, id_layer: number) {
    if ('id' in tile)
        return id_layer + '_' + tile.x + '.' + tile.y;
    else
        return tile.id_object + '';
}

export function TileLoader(world: GoContainer, tileSize = 256, SUB_SCALAR = 1) {
    function calc_bb(render_data: RenderMapData) {
        const bb_min = vmath.vector3(1E10, 1E10, 1E10);
        const bb_max = vmath.vector3(-1E10, -1E10, -1E10);
        for (let layer of render_data.layers) {
            for (let tile of layer.tiles) {
                const tile_id = tile.id & TILE_FLIP_MASK;
                const tile_info = get_tile_texture(tile_id);
                if (tile_info != undefined) {
                    if (tile_info.h < tileSize) {
                        tile_info.h = tileSize;
                        Services.logger.warn('fix tile_info.h', tile_info);
                    }
                    // Вычисляем коррекцию
                    const tile_w = tile_info.w * SUB_SCALAR;
                    const tile_h = tile_info.h * SUB_SCALAR;
                    let x = tile.x * tileSize * SUB_SCALAR;
                    let y = tile.y * tileSize * SUB_SCALAR - tileSize * SUB_SCALAR;
                    const new_pos = rotate_point(new Vector3(x, y, 0), new Vector2(tile_w, tile_h), 0);
                    x = new_pos.x + tile_w / 2;
                    y = new_pos.y + tile_h / 2;
                    bb_min.x = Math.min(bb_min.x, x - tile_w / 2);
                    bb_min.y = Math.min(bb_min.y, y - tile_h / 2);
                    bb_max.x = Math.max(bb_max.x, x + tile_w / 2);
                    bb_max.y = Math.max(bb_max.y, y + tile_h / 2);
                }
            }
        }
        // OBJECTS
        for (let object_layer of render_data.objects_layers) {
            const id_layer = object_layer.id_order;
            let id_object = -1;
            for (let tile of object_layer.objects) {
                id_object++;
                const tile_id = tile.tile_id & TILE_FLIP_MASK;
                if (tile.tile_id != -1) {
                    const tile_info = get_tile_texture(tile_id);
                    if (tile_info != undefined) {
                        const tile_w = tile.width * SUB_SCALAR;
                        const tile_h = tile.height * SUB_SCALAR;
                        let x = tile.x * SUB_SCALAR;
                        let y = tile.y * SUB_SCALAR;
                        bb_min.x = Math.min(bb_min.x, x - tile_w / 2);
                        bb_min.y = Math.min(bb_min.y, y - tile_h / 2);
                        bb_max.x = Math.max(bb_max.x, x + tile_w / 2);
                        bb_max.y = Math.max(bb_max.y, y + tile_h / 2);
                    }
                }
            }
        }
        //const r = make_ramk(bb_max.x - bb_min.x, bb_max.y - bb_min.y);
        //RenderEngine.scene.add(r);
        //r.position.set(bb_min.x + (bb_max.x - bb_min.x) / 2, bb_min.y + (bb_max.y - bb_min.y) / 2, 0);
        //log(bb_min, bb_max)
        //log(bb_min.x, bb_max.y)
        return [bb_min, bb_max];
    }

    function load(map_data: MapData, tiles_data: TileInfo, debug_lines = true) {
        const tiles: SpriteTileInfoDict = {};
        const render_data = parse_tiled(map_data);
        set_tileset(map_data.tilesets);
        preload_tiled_textures(tiles_data);
        const [min, max] = calc_bb(render_data);
        set_world_bounds(min, max);
        Services.logger.debug("correction:", min, max);
        const used_textures = [];
        // TILES
        for (let layer of render_data.layers) {
            const id_layer = layer.id_order;
            const container = Services.scene.create(IObjectTypes.GO_CONTAINER, {});
            container.name = layer.layer_name;
            world.add(container);
            for (let tile of layer.tiles) {
                const tile_id = tile.id & TILE_FLIP_MASK;
                const tile_info = get_tile_texture(tile_id);
                if (tile_info != undefined) {
                    if (tile_info.w < tileSize) {
                        tile_info.w = tileSize;
                        Services.logger.warn('fix tile_info.w', tile_info);
                    }
                    if (tile_info.h < tileSize) {
                        tile_info.h = tileSize;
                        Services.logger.warn('fix tile_info.h', tile_info);
                    }

                    // Вычисляем коррекцию
                    const tile_w = tile_info.w * SUB_SCALAR;
                    const tile_h = tile_info.h * SUB_SCALAR;
                    let x = tile.x * tileSize * SUB_SCALAR;
                    let y = tile.y * tileSize * SUB_SCALAR - tileSize * SUB_SCALAR;
                    const new_pos = rotate_point(new Vector3(x, y, 0), new Vector2(tile_w, tile_h), 0);
                    x = new_pos.x + tile_w / 2;
                    y = new_pos.y + tile_h / 2;
                    const z = get_depth(x, y, id_layer, tile_w, tile_h);
                    const plane = Services.scene.create(IObjectTypes.GO_SPRITE_COMPONENT, { width: tile_w, height: tile_h });
                    plane.position.set(x, y, z);
                    (plane as any).tile_z = z;
                    plane.set_texture(tile_info.name, tile_info.atlas);
                    used_textures.push(tile_info.name);
                    apply_tile_transform(plane, tile.id);
                    container.add(plane);
                    plane.name = tile_info.name + '' + plane.mesh_data.id;
                    plane.userData = { tile, id_layer };
                    const data: ParsedObject = { x, y, z, atlas: "", texture: tile_info.name, width: tile_w, height: tile_h, rotation: 0 };
                    tiles[get_id_by_tile(tile, id_layer)] = { tile_info, tile, _hash: plane, data };
                }
            }
        }


        // OBJECTS
        const material = new LineBasicMaterial({ color: 0xff0000 });
        for (let object_layer of render_data.objects_layers) {
            const id_layer = object_layer.id_order;
            let id_object = -1;
            const container = Services.scene.create(IObjectTypes.GO_CONTAINER, {});
            container.name = object_layer.layer_name;
            world.add(container);
            for (let tile of object_layer.objects) {
                id_object++;
                if (tile.polygon || tile.polyline) {
                    const cx = tile.x * SUB_SCALAR;
                    const cy = tile.y * SUB_SCALAR;
                    const points = [];
                    if (tile.polygon) {
                        for (let point of tile.polygon) {
                            points.push(new Vector2(cx + point.x * SUB_SCALAR, cy - point.y * SUB_SCALAR));
                        }
                        points.push(points[0]);
                    }
                    if (tile.polyline) {
                        for (let point of tile.polyline) {
                            points.push(new Vector2(cx + point.x * SUB_SCALAR, cy - point.y * SUB_SCALAR));
                        }
                    }
                    if (debug_lines) {
                        const geometry = new BufferGeometry().setFromPoints(points);
                        const line = new Line(geometry, material);
                        line.position.z = CAMERA_Z - 5;
                        container.add(line);
                    }
                }
                else {
                    const tile_id = tile.tile_id & TILE_FLIP_MASK;
                    const tile_info = get_tile_texture(tile_id);
                    if (tile_info != undefined) {
                        const tile_w = tile.width * SUB_SCALAR;
                        const tile_h = tile.height * SUB_SCALAR;
                        const x = tile.x * SUB_SCALAR;
                        const y = tile.y * SUB_SCALAR;
                        const y_depth = tile.y_src * SUB_SCALAR;
                        const z = get_depth(x, y_depth, id_layer, tile_w, tile_h);
                        const plane = Services.scene.create(IObjectTypes.GO_SPRITE_COMPONENT, { width: tile_w, height: tile_h });
                        plane.position.set(x, y, z);
                        (plane as any).tile_z = z;
                        plane.set_texture(tile_info.name, tile_info.atlas);
                        used_textures.push(tile_info.name);
                        apply_tile_transform(plane, tile.tile_id);
                        if (tile.rotation)
                            plane.rotation.z = -tile.rotation! * Math.PI / 180;
                        container.add(plane);
                        plane.name = tile_info.name + '' + plane.mesh_data.id;
                        plane.userData = { tile, id_layer };
                        const data = { x, y, z, atlas: "", texture: tile_info.name, width: tile_w, height: tile_h, rotation: tile.rotation };
                        tiles[get_id_by_tile(tile, id_layer)] = { tile_info, tile, _hash: plane, data };
                    }
                    else {
                        Services.logger.warn('tile not found', object_layer.layer_name, tile_id, tile);
                    }
                }
            }
        }
        //log(Array.from(new Set(used_textures)));
        return tiles;
    }

    return { load };
}