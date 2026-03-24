
import { PointLike } from "./geometry/types";
import { SpriteTileInfo, SpriteTileInfoDict, TileLoader } from "@editor/render_engine/tile_loader";
import { SpatialHashManagerCreate, SpatialHashManagerUtils } from "./spatial_hash_manager";
import { vec2_distance_to } from "./math_utils";
import { Point } from "./geometry/shapes";
import { IndentsSize } from "../../../SceneEditor_Kopateli/src/tiles_config";


type Rect = {
    center: PointLike,
    height: number,
    width: number,
}

type Cell = Rect & {
    rectangle: PointLike[],
    figure: PointLike[],
    /** Можно ли копать в этой ячейке */
    allowed: boolean
}

const SIN_60 = 0.8660254;
const COS_60 = 0.5;

export function get_hex_iso_ratio(dim_ratio: number) {
    return dim_ratio * 1.5 / Math.sqrt(3);
}

 export function get_hex_offsets(iso_ratio: number) {
    return [
        { x: 1,      y: 0 },                    // 0°
        { x: COS_60, y: SIN_60 * iso_ratio },    // 60°
        { x: -COS_60,y: SIN_60 * iso_ratio },    // 120°
        { x: -1,     y: 0 },                    // 180°
        { x: -COS_60,y: -SIN_60 * iso_ratio },   // 240°
        { x: COS_60, y: -SIN_60 * iso_ratio }    // 300°
    ];
}

function make_rhombus_cells(start: PointLike, end: PointLike, step: number, dim_ratio: number) {
    const cells: Cell[] = [];
    const step_x = step;
    const step_y = step * dim_ratio;
    const half_step_y = step_y / 2;
    const half_step_x = step_x / 2;
    let shift = half_step_x;
    for (let y = start.y; y < end.y; y += step_y) {
        shift = (shift) ? 0 : half_step_x;
        for (let x = start.x; x < end.x; x += step_x) {
            const A = Point(x + shift, y);
            const B = Point(x + shift + step_x, y);
            const C = Point(x + shift + step_x, y + step_y);
            const D = Point(x + shift, y + step_y);
            const center = Point(x + shift + step_x / 2, y + step_y / 2);
            const width = step_x;
            const height = step_y;
            const TOP = Point(center.x, C.y + half_step_y);
            const BOTTOM = Point(center.x, A.y - half_step_y);
            const RIGHT = Point(A.x, center.y);
            const LEFT = Point(B.x, center.y);
            const cell: Cell = {rectangle: [A, B, C, D], figure: [TOP, RIGHT, BOTTOM, LEFT], center, width, height, allowed: false};
            cells.push(cell);
        }
    }
    return cells;
}

function make_hex_cells(start: PointLike, end: PointLike, step: number, dim_ratio: number) {
    const cells: Cell[] = [];
    const iso_ratio = get_hex_iso_ratio(dim_ratio);
    const hex_offsets = get_hex_offsets(iso_ratio);
    const step_x = step;
    const step_y = step * dim_ratio;
    const half_step_y = step_y / 2;
    let shift = half_step_y;
    for (let y = start.y; y < end.y; y += step_y) {
        for (let x = start.x; x < end.x; x += step_x) {
            shift = (shift) ? 0 : half_step_y;
            const A = Point(x, y + shift);
            const B = Point(x + step_x, y + shift);
            const C = Point(x + step_x, y + shift + step_y);
            const D = Point(x, y + shift + step_y);
            const center = Point(x + step_x / 2, y + shift + step_y / 2);
            const width = step_x;
            const height = step_y;
            const hex = get_isometric_hexagon(center, width / 1.5, hex_offsets);
            const cell: Cell = {rectangle: [A, B, C, D], figure: hex, center, width, height, allowed: false};
            cells.push(cell);
        }
    }
    return cells;
}

function get_isometric_hexagon(center: PointLike, A: number, hex_offsets: PointLike[]): PointLike[] {
    const points: PointLike[] = [];
    for (let i = 0; i < 6; i++) {
        points.push({
            x: center.x + hex_offsets[i].x * A,
            y: center.y + hex_offsets[i].y * A
        });
    }
    return points;
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

export function SpawnZonesManager(
    tiles: SpriteTileInfoDict, 
    permitted_tiles: Record<string, IndentsSize>, 
    forbidden_tiles: Record<string, IndentsSize>, 
    start: PointLike, 
    end: PointLike, 
    figure_type: "hex" | "rhombus", 
    figure_size: number, 
    iso_ratio: number, 
) {
    const cells_manager = SpatialHashManagerCreate(cells_utils, figure_size);
    const cells = (figure_type == "hex") ? make_hex_cells(start, end, figure_size, iso_ratio) : make_rhombus_cells(start, end, figure_size, iso_ratio);
    for (const c of cells)
        cells_manager.add_element(c);

    switch_tiles(tiles, permitted_tiles, true);
    switch_tiles(tiles, forbidden_tiles, false);

    function switch_tiles(tiles: SpriteTileInfoDict, tiles_to_switch: Record<string, IndentsSize>, to: boolean) {
        for (const t of Object.values(tiles)) {
            const indent_data = tiles_to_switch[t.tile_info.name];
            if (indent_data) {
                const data = t.data;
                let c_x = data.x;
                let c_y = data.y; 
                let tile_width = data.width;
                let tile_height = data.height;
                const L = (indent_data.L) ? indent_data.L : 0;
                const R = (indent_data.R) ? indent_data.R : 0;
                const U = (indent_data.U) ? indent_data.U : 0;
                const B = (indent_data.B) ? indent_data.B : 0;
                const size_x = 1 - L - R;
                const size_y = 1 - U - B;
                const d_x = (L - R) * tile_width / 2;
                const d_y = (B - U) * tile_height / 2;
                tile_width *= size_x;
                tile_height *= size_y;
                if (tile_width < 0) tile_width = 0;
                if (tile_height < 0) tile_height = 0;
                c_x += d_x;
                c_y += d_y;
                const cells = cells_manager.get_elements(c_x, c_y, tile_width, tile_height);
                if (cells.length) {
                    for (const c of cells) {
                        if ((to == false) || (to == true && is_inside(c, {center: {x: c_x, y: c_y}, width: tile_width, height: tile_height}))) 
                            c.allowed = to;
                    }
                }
            }
        }
    }

    function get_cells() {
        return cells;
    }

    function is_inside(c: Cell, zone: Rect) {
        if (zone.width == 0 || zone.height == 0) return false;
        const c_x = c.center.x;
        const c_y = c.center.y;
        const zone_left = zone.center.x - zone.width / 2;
        const zone_rigth = zone.center.x + zone.width / 2;
        const zone_bottom = zone.center.y - zone.height / 2;
        const zone_top = zone.center.y + zone.height / 2;
        const result = (c_y >= zone_bottom && c_x >= zone_left && c_x <= zone_rigth && c_y <= zone_top);
        return result
    }

    function is_in_cell(pos: PointLike) {
        const cells = cells_manager.get_elements(pos.x, pos.y, 0, 0);
        const allowed_cells = cells.filter((v) => v.allowed);
        return Boolean(allowed_cells.length);
    }

    return { get_cells, is_in_cell }
}

