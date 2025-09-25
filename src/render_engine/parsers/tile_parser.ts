import { Vector2, Vector3 } from "three";
import { get_file_name, rotate_point } from "../helpers/utils";
import { IBaseEntityAndThree } from "../types";
import { FlipMode, GoSprite } from "../objects/sub_types";


// Флаги Tiled для отражения и вращения
const FLIP_HORIZONTALLY_FLAG = 0x80000000;
const FLIP_VERTICALLY_FLAG = 0x40000000;
const FLIP_DIAGONALLY_FLAG = 0x20000000;
export const TILE_FLIP_MASK = 0x1FFFFFFF;

// Интерфейсы данных JSON
interface Chunk {
    x: number;
    y: number;
    w: number;
    h: number;
    tiles: number[];
}

interface Layer {
    layer_name: string;
    chunks: Chunk[];
    id_order: number;
}

interface TileData {
    url: string;
    w: number;
    h: number;
}

export interface LoadedTileInfo {
    name: string;
    atlas: string;
    w: number;
    h: number;
}

export interface TileObject {
    x: number;
    y: number;
    w: number;
    h: number
    tid: number
    id: number
    r?: number
    polygon?: number[]
    polyline?: number[]
}

interface ObjectLayer {
    layer_name: string;
    objects: TileObject[]
    id_order: number;
}

export type TileInfo = { [tile_set: string]: { [id: string]: TileData } };
export type TileSets = [string, number][];
export interface MapData {
    tilesets: TileSets;
    layers: Layer[]
    objects: ObjectLayer[]
}


export interface RenderTileData {
    x: number;
    y: number;
    id: number;
}

interface RenderLayer {
    layer_name: string;
    tiles: RenderTileData[];
    id_order: number;
}

export interface RenderTileObject {
    x: number;
    y: number;
    width: number;
    height: number
    tile_id: number
    id_object: number;
    rotation?: number
    polygon?: Vector2[]
    polyline?: Vector2[]
}

interface RenderObjectLayer {
    layer_name: string;
    objects: RenderTileObject[]
    id_order: number;
}


export interface RenderMapData {
    layers: RenderLayer[]
    objects_layers: RenderObjectLayer[]
}

let bb_min = vmath.vector3();
let bb_max = vmath.vector3();

export function set_world_bounds(min: vmath.vector3, max: vmath.vector3) {
    bb_min = min;
    bb_max = max;
}

export function get_world_bounds() {
    return { min: bb_min, max: bb_max };
}

export function get_depth(x: number, y: number, id_layer: number, width = 0, height = 0) {
    const sort_layer = parseInt(new URLSearchParams(document.location.search).get('layer') || '0');
    return get_depth_fix(y, height, id_layer, sort_layer);
}

const Y_MIN = -1000;
const Y_MAX = 1000;
const STEP_BASE = 0.1;
const STEP_SORT = 5;
function calculate_depth(y: number, step: number, id_layer = 0) {
    const size = Y_MAX - Y_MIN;
    const cur_y = Y_MAX + y; // 0..size
    const norm_y = 1 - cur_y / size; // 1..0
    const val = norm_y * step * size; // 0..size * step
    const layer_depth = id_layer * step * size;
    return layer_depth + val;
}

export function get_depth_fix(y: number, height: number, id_layer: number, sort_layer: number) {
    y -= height / 2;
    const cor_y = calculate_depth(Y_MIN, STEP_BASE, 0) * 0;
    if (id_layer < sort_layer)
        return calculate_depth(y, STEP_BASE, id_layer) + cor_y;
    const max_y_before_sort = calculate_depth(Y_MIN, STEP_BASE, sort_layer - 1) + cor_y;
    if (id_layer == sort_layer)
        return max_y_before_sort + calculate_depth(y, STEP_SORT, 0);
    const max_sort_layer = calculate_depth(Y_MIN, STEP_SORT, 0) + max_y_before_sort;
    return max_sort_layer + calculate_depth(y, STEP_BASE, id_layer - sort_layer) + cor_y;
}
(window as any).calculate_depth = calculate_depth;
(window as any).get_depth_fix = get_depth_fix;
(window as any).get_depth = get_depth;

const tiled_textures_data: { [atlas: string]: { [id: string]: LoadedTileInfo } } = {};
let tile_sets_data: TileSets = [];
function preload_tile_texture(id: string, path: string, atlas: string, w: number, h: number,) {
    atlas = get_file_name(atlas);
    if (!tiled_textures_data[atlas])
        tiled_textures_data[atlas] = {};
    tiled_textures_data[atlas][id] = { name: get_file_name(path), w, h, atlas: '' }; // todo debug
}


export function get_tile_texture(gid: number) {
    let max_firstgid = -1;
    let tileset = '';
    for (let i = 0; i < tile_sets_data.length; i++) {
        const ts = tile_sets_data[i];
        const atlas = ts[0];
        const firstgid = ts[1];
        if (firstgid > max_firstgid && firstgid <= gid) {
            max_firstgid = firstgid;
            tileset = atlas;
        }
    }
    if (tileset == '')
        Log.error('Тайлсет не найден', gid);
    const tile_sets = tiled_textures_data[tileset];
    if (tile_sets != undefined) {
        const local_id = gid - max_firstgid;
        if (tile_sets[local_id + ''] == undefined) {
            Log.error('Тайл не найден', gid);
            return;
        }
        return tile_sets[local_id + ''];
    }
    return;
}

export function get_all_tiled_textures() {
    return tiled_textures_data;
}

export function set_tileset(tilesets: TileSets) {
    tile_sets_data = [];
    for (let i = 0; i < tilesets.length; i++) {
        const ts = tilesets[i];
        tile_sets_data.push([ts[0], ts[1]]);

    }
}

export function preload_tiled_textures(tile_info: TileInfo) {
    for (const id_tileset in tile_info) {
        const tile_set = tile_info[id_tileset];
        for (const id in tile_set) {
            const tex = tile_set[id];
            preload_tile_texture(id, tex.url, id_tileset, tex.w, tex.h);
        }
    }
}

export function parse_tiled(data: MapData) {
    const render_data: RenderMapData = {
        layers: [],
        objects_layers: []
    };

    for (const layer of data.layers) {
        render_data.layers.push({
            layer_name: layer.layer_name,
            tiles: create_layer(layer),
            id_order: layer.id_order
        });
    }

    for (const obj_layer of data.objects) {
        render_data.objects_layers.push({
            layer_name: obj_layer.layer_name,
            objects: create_objects(obj_layer),
            id_order: obj_layer.id_order
        });
    }
    return render_data;
}

function make_polygon(points: number[]) {
    const polygon: Vector2[] = [];
    for (let i = 0; i < points.length; i += 2) {
        polygon.push(new Vector2(points[i], points[i + 1]));
    }
    return polygon;
}

function create_objects(obj_layer: ObjectLayer) {
    const objects: RenderTileObject[] = [];
    for (const obj of obj_layer.objects) {
        if (obj.polygon || obj.polyline) {
            const new_pos = rotate_point(new Vector3(obj.x, -obj.y, 0), new Vector2(1, 1), obj.r != undefined ? -obj.r : 0);
            const data: RenderTileObject = {
                x: new_pos.x,
                y: new_pos.y,
                width: 0,
                height: 0,
                tile_id: -1,
                id_object: obj.id,
                rotation: obj.r,
            };
            if (obj.polygon)
                data.polygon = make_polygon(obj.polygon);
            if (obj.polyline)
                data.polyline = make_polygon(obj.polyline);
            objects.push(data);
        }
        else {
            const new_pos = rotate_point(new Vector3(obj.x, -obj.y, 0), new Vector2(obj.w, obj.h), obj.r != undefined ? -obj.r : 0);
            const data: RenderTileObject = {
                x: new_pos.x + obj.w / 2,
                y: new_pos.y + obj.h / 2,
                width: obj.w,
                height: obj.h,
                tile_id: obj.tid,
                id_object: obj.id,
                rotation: obj.r
            };
            objects.push(data);
        }
    }
    return objects;
}

function create_layer(layer: Layer) {
    const chunks = [];
    for (const chunk of layer.chunks) {
        const chunk_data = create_chunk(chunk);
        chunks.push(...chunk_data);
    }
    return chunks;
}

// Генерация тайлов для одного чанка
function create_chunk(chunk: Chunk) {
    const { x: chunkX, y: chunkY, w, h, tiles } = chunk;
    const data: RenderTileData[] = [];
    for (let i = 0; i < tiles.length; i++) {
        const tile_mask = tiles[i];
        if (tile_mask != 0) {
            // Вычисляем глобальные координаты
            const localX = i % w;
            const localY = Math.floor(i / h);

            const posX = (chunkX + localX);
            const posY = -(chunkY + localY); // Отрицательный y для корректного рендеринга
            data.push({ x: posX, y: posY, id: tile_mask });
        }
    }
    return data;
}

export function apply_tile_transform(mesh: IBaseEntityAndThree, tile_id: number): void {
    const flipHorizontally = (tile_id & FLIP_HORIZONTALLY_FLAG) !== 0;
    const flipVertically = (tile_id & FLIP_VERTICALLY_FLAG) !== 0;
    const flipDiagonally = (tile_id & FLIP_DIAGONALLY_FLAG) !== 0;

    if (flipHorizontally)
        (mesh as GoSprite).set_flip(FlipMode.HORIZONTAL);
    if (flipVertically)
        (mesh as GoSprite).set_flip(FlipMode.VERTICAL);
    if (flipDiagonally)
        (mesh as GoSprite).set_flip(FlipMode.DIAGONAL);
}
