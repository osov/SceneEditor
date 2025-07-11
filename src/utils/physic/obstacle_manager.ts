/* eslint-disable @typescript-eslint/unbound-method */
import { VEC_A } from "../geometry/helpers";
import { Box, Arc, Point, Segment } from "../geometry/shapes";
import { PointLike, ISegment, IArc } from "../geometry/types";
import { shape_center, clone, invert_vec, rotate_vec_90CW, translate, shape_vector, point2segment, segment_intersect } from "../geometry/logic";
import { Aabb, createSpatialHash } from "../spatial_hash";
import { GridParams, ObstacleTileData, SubGridParams } from "./types";
import { normalize, multiply, vector_slope } from "../geometry/utils";


export type ObstaclesManager = ReturnType<typeof ObstaclesManagerCreate>;
export type ObstaclesGrid = ReturnType<typeof ObstaclesGridCreate>;

type OffsetBuildOption = "all" | "arc" | "segment";


function ObstaclesGridCreate(grid: number[][], pos_to_coord_grid: PointLike[][], params: GridParams) {
    if (
        grid.length != pos_to_coord_grid.length ||
        ((grid.length != 0 && pos_to_coord_grid.length != 0) &&
            (grid[0].length != pos_to_coord_grid[0].length))
    ) {
        throw new Error('Не совпадают grid и pos_to_coord_grid');
    }

    const cell_size = params.cell_size;
    const start = params.start;
    const start_in_origin = params.origin_offset;
    const amount = params.amount;
    const offset = (params.origin_offset) ? params.origin_offset : { x: 0, y: 0 };

    function get_subgrid(_params: SubGridParams) {
        if (grid.length == 0 || grid[0].length == 0) return false;
        if (pos_to_coord_grid.length == 0 || pos_to_coord_grid[0].length == 0) return false;
        const p_start = _params.offset;
        const c_end = _params.amount;
        if (p_start.y > grid.length || p_start.x > grid[0].length) return false;
        const ymax = Math.min(grid.length, c_end.y + p_start.y);
        const xmax = Math.min(grid[0].length, c_end.x + p_start.x);
        const p_end = { x: xmax, y: ymax };
        const subgrid: number[][] = [];
        const pos_to_coord_subgrid: PointLike[][] = [];
        for (let y = p_start.y; y < p_end.y; y++) {
            subgrid.push(grid[y].slice(p_start.x, p_end.x));
            pos_to_coord_subgrid.push(pos_to_coord_grid[y].slice(p_start.x, p_end.x));
        }
        const subgrid_start = { x: _params.offset.x * cell_size + start.x, y: _params.offset.y * cell_size + start.y };
        const origin_offset = { x: _params.offset.x + offset.x, y: _params.offset.y + offset.y };
        return ObstaclesGridCreate(subgrid, pos_to_coord_subgrid, { ...params, ..._params, start: subgrid_start, origin_offset });
    }

    const grid_pos_to_coord = function (pos: PointLike): PointLike | false {
        if (pos.y < 0 || pos.y >= pos_to_coord_grid.length || pos.x < 0 || pos.x >= pos_to_coord_grid[0].length) return false;
        return pos_to_coord_grid[pos.y][pos.x];
    };

    const coord_to_grid_pos = function (coord: PointLike): PointLike | false {
        const rel_x = coord.x - start.x;
        const rel_y = coord.y - start.y;
        const end_x = amount.x * cell_size;
        const end_y = amount.y * cell_size;
        // log()
        // log('coord.x', coord.x)
        // log('coord.y', coord.y)
        // log('amount.x', amount.x)
        // log('amount.y', amount.y)
        // log('rel_x', rel_x)
        // log('rel_y', rel_y)
        // log('start.x', start.x)
        // log('start.y', start.y)
        // log('end_x', end_x)
        // log('end_y', end_y)
        // log(rel_x < 0, rel_y < 0, rel_x > end_x, rel_y > end_y)
        if (rel_x < 0 || rel_y < 0 || rel_x > end_x || rel_y > end_y) return false;
        const x = Math.floor(rel_x / cell_size);
        const y = Math.floor(rel_y / cell_size);
        return { x, y };
    };

    function get_coords_grid() {
        return pos_to_coord_grid;
    }

    function get_grid() {
        return grid;
    }

    return { get_grid, get_coords_grid, grid_pos_to_coord, coord_to_grid_pos, get_subgrid, cell_size, start, amount, offset };
}


export function ObstaclesManagerCreate(hash_cell_size: number) {
    const all_obstacles: ISegment[] = [];
    const objects: { [key: string]: { id: string, obstacles: string[], enabled: boolean } } = {};
    const logger = Log.get_with_prefix('ObstaclesManager');
    const sp = createSpatialHash(hash_cell_size);
    let id_object = 0;
    let id_obstacle = 0;
    const _data: { [key: string]: Aabb & { obstacle: ISegment, object_id?: string } } = {};
    let _params: GridParams;
    let grid: ReturnType<typeof ObstaclesGridCreate>;

    function init_grid(grid_params: GridParams) {
        _params = grid_params;
        grid = make_grid(_params);
    }

    function get_grid_params() {
        if (_params != null)
            return _params;
    }

    function make_grid(grid_params: GridParams) {
        const _grid: number[][] = [];
        const _pos_to_coord_grid: PointLike[][] = [];
        for (let y = 0; y < grid_params.amount.y; y++) {
            const row: number[] = [];
            for (let x = 0; x < grid_params.amount.x; x++) {
                row.push(0);
            }
            _grid.push(row);
        }

        for (let y = 0; y < grid_params.amount.y; y++) {
            const coord_row: PointLike[] = [];
            for (let x = 0; x < grid_params.amount.x; x++) {
                const box_xmin = grid_params.start.x + grid_params.cell_size * x;
                const box_xmax = box_xmin + grid_params.cell_size;
                const box_ymin = grid_params.start.y + grid_params.cell_size * y;
                const box_ymax = box_ymin + grid_params.cell_size;
                const box = Box(box_xmin, box_ymin, box_xmax, box_ymax);
                const c = shape_center(box);
                coord_row.push({ x: c.x, y: c.y });
                const box_width = Math.abs(box.xmax - box.xmin);
                const box_height = Math.abs(box.ymax - box.ymin);
                const result = get_obstacles(c.x, c.y, box_width, box_height);
                for (const ob of result) {
                    const ips = segment_intersect(ob, box);
                    if (ips.length > 0) _grid[y][x] = 1;
                }
            }
            _pos_to_coord_grid.push(coord_row);
        }
        return ObstaclesGridCreate(_grid, _pos_to_coord_grid, _params);
    }

    function add_object(_obstacles: ISegment[], _id?: string) {
        let id: string;
        if (_id)
            id = _id;
        else {
            id = 'obj_' + id_object;
            id_object++;
        }
        const obstacles: string[] = [];
        for (const obst of _obstacles) {
            const obst_id = add_obstacle(obst, id);
            obstacles.push(obst_id);
        }
        const obj = { id, obstacles, enabled: true };
        objects[id] = obj;
    }

    function add_obstacle(obstacle: ISegment, object_id?: string) {
        all_obstacles.push(obstacle);
        const pc = shape_center(obstacle);
        const width = Math.abs(obstacle.end.x - obstacle.start.x);
        const height = Math.abs(obstacle.end.y - obstacle.start.y);
        const x = pc.x;
        const y = pc.y;
        const id = 'obst_' + id_obstacle;
        id_obstacle++;
        _data[id] = { id, x, y, width, height, obstacle, object_id };
        sp.add({ id, x, y, width, height });
        return id;
    }

    function remove_obstacle(id: string) {
        const obst_data = _data[id];
        if (!obst_data)
            return false;
        sp.remove(obst_data);
        delete _data[id];
        return true;
    }

    function get_obstacle_by_id(id: string) {
        const obst_data = _data[id];
        if (!obst_data)
            return false;
        return obst_data.obstacle;
    }

    function set_obstacles(_obstacles: ISegment[]) {
        clear_obstacles();
        for (const obstacle of _obstacles)
            add_obstacle(obstacle);
    }

    function clear_obstacles() {
        for (let i = 0; i < id_obstacle; i++) {
            const id = 'obst_' + i;
            remove_obstacle(id);
        }
        id_obstacle = 0;
    }

    function get_obstacles(x: number, y: number, width: number, height: number) {
        const list: ISegment[] = [];
        const result = sp.query_range(x, y, width, height);
        for (const entry of result) {
            const id = entry.id;
            const obst_data = _data[id];
            if (obst_data != null) {
                let obj = undefined;
                if (obst_data.object_id)
                    obj = objects[obst_data.object_id];
                if (!obj || obj.enabled)
                    list.push(obst_data.obstacle);
            }
        }
        return list;
    }

    function build_offsets(obstacle: ISegment, offset: number, build_option: OffsetBuildOption = "all") {
        const result: (ISegment | IArc)[] = [];
        const obst_vec = shape_vector(obstacle);
        VEC_A.x = obst_vec.x;
        VEC_A.y = obst_vec.y;
        normalize(VEC_A);
        rotate_vec_90CW(VEC_A);
        multiply(VEC_A, offset);
        if (build_option == "all" || build_option == "segment") {
            let offset = clone(obstacle);
            translate(offset, VEC_A.x, VEC_A.y);
            result.push(offset);
            invert_vec(VEC_A);
            offset = clone(obstacle);
            translate(offset, VEC_A.x, VEC_A.y);
            result.push(offset);
        }

        if (build_option == "all" || build_option == "arc") {
            const slope = vector_slope(shape_vector(obstacle));
            
            result.push(Arc(obstacle.start, offset, slope - Math.PI / 2, slope + Math.PI / 2, false));
            result.push(Arc(obstacle.end, offset, slope + Math.PI / 2, slope - Math.PI / 2, false));
        }
        return result;
    }

    function get_grid() {
        if (grid != null) return grid;
        logger.warn('Сетка препятствий не инициализирована!');
        return false;
    }

    function enable_object(id: string, enabled: boolean) {
        const obj = objects[id];
        if (obj != null) obj.enabled = enabled;
    }

    function get_object_by_pos(x: number, y: number) {
        const result = sp.query_range(x, y, 11, 11);
        const point = Point(x, y);
        let shortest_distance = Infinity;
        let closest: string | undefined;
        for (const entry of result) {
            const id = entry.id;
            const obst_data = _data[id];
            if (obst_data != null) {
                const dist = point2segment(point, obst_data.obstacle)[0];
                if (dist < shortest_distance) {
                    shortest_distance = dist;
                    closest = obst_data.object_id;
                }
            }
        }
        if (closest)
            return objects[closest];
        return false;
    }

    function polyline_to_segments(x: number, y: number, polygon: PointLike[], world_scalar: number) {
        const segments: ISegment[] = [];
        const cx = x * world_scalar;
        const cy = y * world_scalar;
        for (let i = 0; i < polygon.length - 1; i++) {
            const s_x = polygon[i].x;
            const s_y = polygon[i].y;
            const e_x = polygon[i + 1].x;
            const e_y = polygon[i + 1].y;
            const seg = Segment(Point(cx + s_x * world_scalar, cy - s_y * world_scalar), Point(cx + e_x * world_scalar, cy - e_y * world_scalar));
            segments.push(seg);
        }
        return segments;
    }

    function polygon_to_segments(x: number, y: number, polygon: PointLike[], world_scalar: number) {
        const segments: ISegment[] = [];
        const cx = x * world_scalar;
        const cy = y * world_scalar;
        segments.push(...polyline_to_segments(x, y, polygon, world_scalar));

        const s_x = polygon[polygon.length - 1].x;
        const s_y = polygon[polygon.length - 1].y;
        const e_x = polygon[0].x;
        const e_y = polygon[0].y;
        const seg = Segment(Point(cx + s_x * world_scalar, cy - s_y * world_scalar), Point(cx + e_x * world_scalar, cy - e_y * world_scalar));
        segments.push(seg);
        return segments;
    }

    function load_obstacles_from_data(obstacles_data: ObstacleTileData[], world_scalar: number) {
        const all_obstacles: ISegment[] = [];
        for (const tile of obstacles_data) {
            let obstacles: ISegment[] = [];
            if (tile.polygon || tile.polyline) {
                if (tile.polygon) {
                    obstacles = polygon_to_segments(tile.x, tile.y, tile.polygon, world_scalar);
                }
                if (tile.polyline) {
                    obstacles = polyline_to_segments(tile.x, tile.y, tile.polyline, world_scalar);
                }
            }
            all_obstacles.push(...obstacles);
            if (obstacles.length > 0) {
                add_object(obstacles);
            }
        }        
        return all_obstacles;
    }

    return {
        add_obstacle, remove_obstacle, set_obstacles, clear_obstacles,
        get_obstacles, get_grid, init_grid, build_offsets,
        load_obstacles_from_data, enable_object, get_object_by_pos,
        get_obstacle_by_id, objects, all_obstacles
    };
}
