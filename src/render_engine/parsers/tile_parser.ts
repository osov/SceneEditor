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
    id_order:number;
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
    id_order:number;
}

export type TileInfo ={ [tile_set: string]: { [id: string]: TileData } };

export interface MapData {
    tile_info: TileInfo
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
    id_order:number;
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
    id_order:number;
}


export interface RenderMapData {
    layers: RenderLayer[]
    objects_layers: RenderObjectLayer[]
}


export function get_depth(x: number, y: number, id_layer: number, width = 0, height = 0) {
    // return id_layer * 2 - (y - height / 2) * 0.001;
    return id_layer * 600 - (y - height / 2) * 5 ;
}


const tiled_textures_data: { [k: string]: LoadedTileInfo } = {};
function preload_tile_texture(id: string, path: string, atlas: string, w: number, h: number) {
    tiled_textures_data[id] = { name: get_file_name(path), atlas: get_file_name(atlas), w, h };
}
export function get_tile_texture(id: number) {
    const data = tiled_textures_data[id + ''];
    return data;
}

export function get_all_tiled_textures() {
    return tiled_textures_data;
}


export function preload_tiled_textures(map_data: MapData) {
    for (const id_tileset in map_data.tile_info) {
        const tile_set = map_data.tile_info[id_tileset];
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
