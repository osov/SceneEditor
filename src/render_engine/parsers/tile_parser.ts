import { get_file_name } from "../helpers/utils";
import { IBaseEntityAndThree } from "../types";

// Флаги Tiled для отражения и вращения
const FLIP_HORIZONTALLY_FLAG = 0x80000000;
const FLIP_VERTICALLY_FLAG = 0x40000000;
const FLIP_DIAGONALLY_FLAG = 0x20000000;
export const TILE_FLIP_MASK = 0x1FFFFFFF;

// Интерфейсы данных JSON
interface Chunk {
    x: number;
    y: number;
    width: number;
    height: number;
    tiles: number[];
}

interface Layer {
    layer_name: string;
    chunks: Chunk[];
}

interface TileData {
    url: string;
}

interface TileObject {
    x: number;
    y: number;
    width: number;
    height: number
    tile_id: number
    rotation?: number
}

interface ObjectLayer {
    layer_name: string;
    objects: TileObject[]
}

export interface MapData {
    tile_info: { [tile_set: string]: { [id: string]: TileData } }
    layers: Layer[]
    objects: ObjectLayer[]
}


interface RenderTileData {
    x: number;
    y: number;
    id: number;
}

interface RenderLayer {
    layer_name: string;
    tiles: RenderTileData[];
}

type RenderTileObject = TileObject;

interface RenderObjectLayer {
    layer_name: string;
    objects: RenderTileObject[]
}

export interface RenderMapData {
    layers: RenderLayer[]
    objects_layers: RenderObjectLayer[]
}

export function get_depth(x: number, y: number, id_layer: number, width = 0, height = 0) {
    return id_layer * 2 - y * 0.001;
}

const tiled_textures_data: Record<string, [string, string]> = {};
function preload_tile_texture(id: string, path: string, atlas: string) {
    const p = ResourceManager.preload_texture(path, atlas);
    p.then(_ => tiled_textures_data[id] = [get_file_name(path), atlas]);
    return p;
}

export function get_tile_texture(id: number) {
    const data = tiled_textures_data[id];
    return { name: data[0], atlas: data[1] };
}

export async function preload_tiled_textures(map_data: MapData) {
    const list = [];
    for (const id_tileset in map_data.tile_info) {
        const tile_set = map_data.tile_info[id_tileset];
        for (const id in tile_set) {
            const tex = tile_set[id];
            const p = preload_tile_texture(id, tex.url, id_tileset);
            list.push(p);
        }
    }
    await Promise.all(list);
}

export function parse_tiled(data: MapData) {
    const render_data: RenderMapData = {
        layers: [],
        objects_layers: []
    };


    for (const layer of data.layers) {
        render_data.layers.push({
            layer_name: layer.layer_name,
            tiles: create_layer(layer)
        })
    };

    for (const obj_layer of data.objects) {
        render_data.objects_layers.push({
            layer_name: obj_layer.layer_name,
            objects: create_objects(obj_layer)
        })
    };

    return render_data;
}

function create_objects(obj_layer: ObjectLayer) {
    const objects: RenderTileObject[] = [];
    for (const obj of obj_layer.objects) {
        objects.push({
            x: obj.x,
            y: -obj.y,
            width: obj.width,
            height: obj.height,
            tile_id: obj.tile_id,
            rotation: obj.rotation
        })
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
    const { x: chunkX, y: chunkY, width, height, tiles } = chunk;
    const data: RenderTileData[] = [];
    for (let i = 0; i < tiles.length; i++) {
        const tile_mask = tiles[i];
        if (tile_mask === 0) continue; // Пропускаем пустые тайлы
        // Вычисляем глобальные координаты
        const localX = i % width;
        const localY = Math.floor(i / width);

        const posX = (chunkX + localX);
        const posY = -(chunkY + localY); // Отрицательный y для корректного рендеринга
        data.push({ x: posX, y: posY, id: tile_mask });
    }
    return data;
}

export function apply_tile_transform(mesh: IBaseEntityAndThree, tile_id: number): void {
    const flipHorizontally = (tile_id & FLIP_HORIZONTALLY_FLAG) !== 0;
    const flipVertically = (tile_id & FLIP_VERTICALLY_FLAG) !== 0;
    const flipDiagonally = (tile_id & FLIP_DIAGONALLY_FLAG) !== 0;

    if (flipDiagonally)
        mesh.rotation.z = Math.PI / 2; // Поворот на 90 градусов

    if (flipHorizontally)
        mesh.scale.x *= -1;

    if (flipVertically)
        mesh.scale.y *= -1;

}

export function apply_object_transform(mesh: IBaseEntityAndThree, tile: TileObject): void {
    const tile_id = tile.tile_id;
    const flipHorizontally = (tile_id & FLIP_HORIZONTALLY_FLAG) !== 0;
    const flipVertically = (tile_id & FLIP_VERTICALLY_FLAG) !== 0;
    const flipDiagonally = (tile_id & FLIP_DIAGONALLY_FLAG) !== 0;

    if (flipDiagonally)
        mesh.rotation.z = Math.PI / 2; // Поворот на 90 градусов

    if (flipHorizontally) {
        mesh.scale.x *= -1;
        const pos = mesh.get_position();
        mesh.set_position(pos.x + tile.width, pos.y);
    }

    if (flipVertically) {
        mesh.scale.y *= -1;
        const pos = mesh.get_position();
        mesh.set_position(pos.x, pos.y - tile.height);
    }

}