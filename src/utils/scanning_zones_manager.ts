
import { PointLike } from "./geometry/types";
import { SpriteTileInfo, SpriteTileInfoDict, TileLoader } from "@editor/render_engine/tile_loader";
import { SpatialHashManagerCreate, SpatialHashManagerUtils } from "./spatial_hash_manager";
import { vec2_distance_to } from "./math_utils";
import { Point } from "./geometry/shapes";
import { IndentsSize } from "../../../SceneEditor_Kopateli/src/tiles_config";


type Cell = {
    rectangle: PointLike[],
    center: PointLike,
    height: number,
    width: number,
    allowed: boolean
}

function make_cells(start: PointLike, end: PointLike, step: number, rect_gap_ratio = 0) {
    const cells: Cell[] = [];
    const gap = rect_gap_ratio * step / 2;
    for (let y = start.y; y < end.y; y += step) {
        for (let x = start.x; x < end.x; x += step) {
            const A = Point(x + gap, y + gap);
            const B = Point(x + step - gap, y + gap);
            const C = Point(x + step - gap, y + step - gap);
            const D = Point(x + gap, y + step - gap);
            const center = Point(x + step / 2, y + step / 2);
            const width = step;
            const height = step;
            const cell: Cell = {rectangle: [A, B, C, D], center, width, height, allowed: true};
            cells.push(cell);
        }
    }
    return cells;
}

export const tile_utils: SpatialHashManagerUtils<SpriteTileInfo> = {
    get_center: (elem) => {
        return {x: elem.data.x, y: elem.data.y};
    },
    get_height: (elem) => elem.data.height,
    get_width: (elem) => elem.data.width,
    get_distance: (p, elem) => {
        const c = tile_utils.get_center(elem);
        return vec2_distance_to(p, c);
    }
}

export const cells_utils: SpatialHashManagerUtils<Cell> = {
    get_center: (cell) => cell.center,
    get_height: (cell) => cell.height,
    get_width: (cell) => cell.width,
    get_distance: (p, cell) => vec2_distance_to(p, cell.center),
}

export function SpawnZonesManager(tiles: SpriteTileInfoDict, forbidden_tiles: Record<string, IndentsSize>, start: PointLike, end: PointLike, step = 20, rect_gap_ratio = 0) {
    const cells_manager = SpatialHashManagerCreate(cells_utils, step);
    const cells = make_cells(start, end, step, rect_gap_ratio);
    for (const c of cells)
        cells_manager.add_element(c);

    for (const t of Object.values(tiles)) {
        const indent_data = forbidden_tiles[t.tile_info.name];
        if (indent_data) {
            const data = t.data;

            let c_x = data.x;
            let c_y = data.y; 
            let width = data.width;
            let height = data.height;
            if (indent_data) {
                const L = (indent_data.L) ? indent_data.L : 0;
                const R = (indent_data.R) ? indent_data.R : 0;
                const U = (indent_data.U) ? indent_data.U : 0;
                const B = (indent_data.B) ? indent_data.B : 0;
                const size_x = 1 - L - R;
                const size_y = 1 - U - B;
                const d_x = (L - R) * width / 2;
                const d_y = (B - U) * height / 2;
                width *= size_x;
                height *= size_y;
                c_x += d_x;
                c_y += d_y;
            }
            const cells = cells_manager.get_elements(c_x, c_y, width, height);
            for (const c of cells) 
                c.allowed = false;
        }
    }

    function get_cells() {
        return cells;
    }

    return { get_cells }
}

