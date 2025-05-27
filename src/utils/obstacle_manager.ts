import { Box, Point, PointLike, Segment } from "@editor/modules/Geometry";
import { Aabb, createSpatialHash } from "./spatial_hash";
import { default_obstacle_grid, GridParams, SubGridParams } from "@editor/modules_editor/PlayerMovement";



export type ObstaclesGrid = ReturnType<typeof ObstaclesGridCreate>;

function ObstaclesGridCreate(grid: number[][], pos_to_coord_grid: PointLike[][], params: GridParams) {
    if (
        grid.length != pos_to_coord_grid.length ||
        ((grid.length != 0 && pos_to_coord_grid.length != 0) && 
        (grid[0].length != pos_to_coord_grid[0].length))
    ) {
        throw new Error('Не совпадают grid и pos_to_coord_grid')
    }

    const cell_size = params.cell_size;
    const start = params.start;
    const start_in_origin = params.origin_offset;
    const amount = params.amount;
    const offset = (params.origin_offset) ? params.origin_offset : {x: 0, y: 0};

    function get_subgrid(_params: SubGridParams) {
        if (grid.length == 0 || grid[0].length == 0) return false;
        if (pos_to_coord_grid.length == 0 || pos_to_coord_grid[0].length == 0) return false;
        const p_start = _params.offset;
        const c_end = _params.amount;
        if (p_start.y > grid.length || p_start.x > grid[0].length) return false;
        const ymax = Math.min(grid.length, c_end.y + p_start.y);
        const xmax = Math.min(grid[0].length, c_end.x + p_start.x);
        const p_end = {x: xmax, y: ymax};
        const subgrid: number[][] = [];
        const pos_to_coord_subgrid: PointLike[][] = [];
        for (let y = p_start.y; y < p_end.y; y++) {
            subgrid.push(grid[y].slice(p_start.x, p_end.x));
            pos_to_coord_subgrid.push(pos_to_coord_grid[y].slice(p_start.x, p_end.x));
        }
        const subgrid_start = {x: _params.offset.x * cell_size + start.x, y: _params.offset.y * cell_size + start.y};
        const origin_offset = {x: _params.offset.x + offset.x, y: _params.offset.y + offset.y};
        return ObstaclesGridCreate(subgrid, pos_to_coord_subgrid, {...params, ..._params, start: subgrid_start, origin_offset});
    }    
        
    const grid_pos_to_coord = function (pos: PointLike): PointLike | false {
        if (pos.y < 0 || pos.y >= pos_to_coord_grid.length || pos.x < 0 || pos.x >= pos_to_coord_grid[0].length) return false;
        return pos_to_coord_grid[pos.y][pos.x];
    } 
    
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
        return {x, y}
    }

    function get_coords_grid() {
        return pos_to_coord_grid;
    }

    function get_grid() {
        return grid;
    }

    return { get_grid, get_coords_grid, grid_pos_to_coord, coord_to_grid_pos, get_subgrid, cell_size, start, amount, offset }
}

export function ObstaclesManager(hash_cell_size: number) {
    const logger = Log.get_with_prefix('ObstaclesManager');
    const sp = createSpatialHash(hash_cell_size);
    let id_obstacle = 0;
    const _data: {[key: string]: Aabb & {obstacle: Segment}} = {};
    let _params: GridParams;
    let grid: ReturnType<typeof ObstaclesGridCreate>;

    function init_grid(grid_params: GridParams) {
        _params = grid_params;
        grid = make_grid(_params);
    }

    function get_grid_params() {
        if (_params)
            return _params;
    }

    function make_grid(grid_params: GridParams) {
        const _grid: number[][] = [];
        const _pos_to_coord_grid: PointLike[][] = [];
        for (let y = 0; y < grid_params.amount.y; y ++) {
            const row: number[] = [];
            for (let x = 0; x < grid_params.amount.x; x ++) {
                row.push(0);
            }
            _grid.push(row);
        }
        
        for (let y = 0; y < grid_params.amount.y; y ++) {
            const coord_row: PointLike[] = [];
            for (let x = 0; x < grid_params.amount.x; x ++) {
                const box_xmin = grid_params.start.x + grid_params.cell_size * x;
                const box_xmax = box_xmin + grid_params.cell_size;
                const box_ymin = grid_params.start.y + grid_params.cell_size * y;
                const box_ymax = box_ymin + grid_params.cell_size;
                const box = Box(box_xmin, box_ymin, box_xmax, box_ymax);
                const c = box.center();
                coord_row.push({x: c.x, y: c.y});
                const result = get_obstacles(c.x, c.y, box.width, box.height);
                for (const ob of result) {
                    const ips = ob.intersect(box);
                        if (ips.length > 0) _grid[y][x] = 1;
                }
            }
            _pos_to_coord_grid.push(coord_row);
        }
        return ObstaclesGridCreate(_grid, _pos_to_coord_grid, _params);
    }


    function add_obstacle(obstacle: Segment) {
        const center = obstacle.center();
        const x = center.x;
        const width = Math.abs(obstacle.end.x - obstacle.start.x);
        const height = Math.abs(obstacle.end.y - obstacle.start.y);
        const y = center.y;
        const id = 'obst_' + id_obstacle;
        id_obstacle++;
        _data[id] = { id, x, y, width, height, obstacle };
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

    function set_obstacles(_obstacles: Segment[]) {
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
        const list: Segment[] = [];
        const result = sp.query_range(x, y, width, height);
        for (const entry of result) {
            const id = entry.id;
            const obst_data = _data[id];
            if (obst_data) list.push(obst_data.obstacle);
        }
        return list;
    }

    function get_grid() {
        if (grid) return grid;
        logger.warn('Сетка препятствий не инициализирована!')
        return false
    }

    return { add_obstacle, remove_obstacle, set_obstacles, clear_obstacles, get_obstacles, get_grid, init_grid }
}

export function test_grid() {
    const params = {...default_obstacle_grid, cell_size: 1, amount: {x: 100, y: 100},}
    const subgrid_offset = {x: 1, y: 1};
    const obst_A1 = Segment(Point(0.1, 0), Point(9.1, 9));
    const obst_B1 = Segment(Point(3, 1), Point(3, 5));
    const ob = ObstaclesManager(1);
    ob.set_obstacles([
        obst_A1,
        // obst_B1
        ]);
    ob.init_grid(params);
    const grid = ob.get_grid() as ObstaclesGrid;
    const subgrid = grid.get_subgrid({offset: subgrid_offset, amount: {x: 10, y: 10}}) as ObstaclesGrid;
    const orig_coord = {x: 3.2, y: 5.7};
    const pos = grid.coord_to_grid_pos(orig_coord) as PointLike;
    const coord = grid.grid_pos_to_coord(pos);
    const pos1 = subgrid.coord_to_grid_pos(orig_coord) as PointLike;
    const coord1 = subgrid.grid_pos_to_coord(pos1);
    log(orig_coord, pos, coord)
    log(orig_coord, pos1, coord1)
}
