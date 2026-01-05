import earcut from "earcut";
import NavMesh from "navmesh";

import { ISegment, PointLike } from "@editor/utils/geometry/types";
import { CellsManager, CellsManagerCreate, ObstraclePolygonsManager, ObstraclePolygonsManagerCreate, Polygon, PolyPoints } from "./polygon_manager";
import { ObstacleTileData } from "../old_pathfinder/types";
import { build_navnmesh_polygons, is_convex } from "./polygon_utils";


export function PathFinder() {
    const locations_navmesh: Dict<NavMesh> = {};
    const locations_obstacles: Dict<ObstraclePolygonsManager> = {};
    const locations_cells: Dict<CellsManager> = {};
    

    const OBST_PADDING = 20 * 0.1 * 0.7;
    const PADDING_DIAG = Math.sqrt(OBST_PADDING ** 2 + OBST_PADDING ** 2);
    const POLYGON_SPATIAL_HASH_CELL_SIZE = 40;
    const POLYGON_CELL_SIZE = 40;
    const OFFSET_ARC_SEGMENTS = 3;
    const rasterizationCellSize = 0.65;

    function find_path(req_path: ISegment, location: string, collision_radius: number) {
        let path_points: PointLike[] = [];
        const navmesh = locations_navmesh[location];
        if (navmesh) {
            const path = navmesh.findPath(req_path.start, req_path.end);
            if (path) {
                path_points = path;
            }
        }
        return path_points;
    }

    function enable_object(location: string, object_id: number | string, enable: boolean) {
        ///
    }
    
    function get_level_size(obstacles: Polygon[], padding: number) {
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        for (const obst of obstacles) {
            const border = obst[0];
            for (const point of border) {
                minX = Math.min(point.x, minX);
                minY = Math.min(point.y, minY);
                maxX = Math.max(point.x, maxX);
                maxY = Math.max(point.y, maxY);
            }
        }
        const diag_padding = Math.sqrt(padding ** 2 + padding ** 2)
        minX -= diag_padding;
        minY -= diag_padding;
        maxX += diag_padding;
        maxY += diag_padding;
        return {start: {x: minX, y: minY}, end: {x: maxX, y: maxY}};
    }

    function set_location_navmesh(location: string, navmesh: NavMesh) {
        locations_navmesh[location] = navmesh;
    }

    function to_convex_polygons(polygon: Polygon, dimensions?: number): Polygon[] {
        const polygon_copy = polygon.slice();
        const polygon_border = polygon_copy.shift() as PolyPoints;
        const holes = polygon_copy;
        const vertices_flatten: number[] = [];
        const vertices_copy = polygon_border.slice();

        // Если полигон уже выпуклый и без дыр, просто возвращаем его
        if (is_convex(vertices_copy) && (holes?.length == 0)) {
            return [polygon];  
        }

        // Иначе требуется разбить на треугольники
        for (const vertex of polygon_border) {
            vertices_flatten.push(vertex.x, vertex.y);
        }
        let start_index = polygon_border.length;
        const holes_indexes: number[] = [];
        if (holes) {
            for (const hole of holes) {
                holes_indexes.push(start_index);
                start_index += hole.length;
                for (const vertex of hole) {
                    vertices_flatten.push(vertex.x, vertex.y);
                    vertices_copy.push(vertex);
                }
            }
        }
        const indexes = earcut(vertices_flatten, holes_indexes, dimensions);
        const triangles: Polygon[] = [];
        for (let i = 0; i <= indexes.length - 3; i += 3) {
            const a = vertices_copy[indexes[i]];
            const b = vertices_copy[indexes[i + 1]];
            const c = vertices_copy[indexes[i + 2]];
            triangles.push([[a, b, c]]);
        }
        return triangles;
    }

    function load_location_test(location: string, obstacles_data: ObstacleTileData[], mul_scalar: number) {
        let obst_manager = locations_obstacles[location];
        if (!obst_manager ) {
            obst_manager = ObstraclePolygonsManagerCreate(POLYGON_SPATIAL_HASH_CELL_SIZE, OBST_PADDING, OFFSET_ARC_SEGMENTS);
        }

        let t0 = System.now_ms();
        for (const obstacle_tile of obstacles_data) {
            obst_manager.add_obstacle_object(obstacle_tile, mul_scalar);
        }

        const all_elements = obst_manager.all_elements;
        
        const level_size = get_level_size(all_elements, OBST_PADDING);
        let t1 = System.now_ms();
        log('add_obstacles time', t1 - t0)
        const passable = build_navnmesh_polygons(level_size, all_elements, rasterizationCellSize)
        let t2 = System.now_ms();
        log('build_navnmesh_polygons time', t2 - t1)
        const navmesh = new NavMesh(passable);
        const t3 = System.now_ms();
        log('build_navnmesh time', t3 - t2);
        locations_navmesh[location] = navmesh;
        return passable;
    }
    
    function load_location(location: string, obstacles_data: ObstacleTileData[], mul_scalar: number) {
        let obst_manager = locations_obstacles[location];
        if (!obst_manager ) {
            obst_manager = ObstraclePolygonsManagerCreate(POLYGON_SPATIAL_HASH_CELL_SIZE, OBST_PADDING, OFFSET_ARC_SEGMENTS);
        }
        else 
            obst_manager.clear_all();
        for (const obstacle_tile of obstacles_data) {
            obst_manager.add_obstacle_object(obstacle_tile, mul_scalar);
        }

        const all_elements = obst_manager.all_elements;
        
        const level_size = get_level_size(all_elements, OBST_PADDING);
        const passable = build_navnmesh_polygons(level_size, all_elements, rasterizationCellSize)
        const navmesh = new NavMesh(passable);
        locations_navmesh[location] = navmesh;
        return passable;
    }

    function make_cells(location: string, obstacles_data: ObstacleTileData[], mul_scalar: number) {
        let cell_manager = locations_cells[location];
        let obst_manager = locations_obstacles[location];
        const all_poly: PolyPoints[] = [];
        const all_elements: Polygon[] = [];
        if (!obst_manager || !cell_manager) {
            cell_manager = CellsManagerCreate(POLYGON_CELL_SIZE);
            obst_manager = ObstraclePolygonsManagerCreate(POLYGON_SPATIAL_HASH_CELL_SIZE, OBST_PADDING, OFFSET_ARC_SEGMENTS);
            locations_cells[location] = cell_manager;
            locations_obstacles[location] = obst_manager;
        };
        for (const obstacle_tile of obstacles_data) {
            const elements = obst_manager.add_obstacle_object(obstacle_tile, mul_scalar);
            all_elements.push(...elements);
        }
        const {start, end} = get_level_size(all_elements, OBST_PADDING);
        const cells = cell_manager.make_cells(start, end);
        for (const cell of cells) {
            all_poly.push(...cell.rectangle);
        }
        return all_poly;
    }

    function load_location_with_cells(location: string, obstacles_data: ObstacleTileData[], mul_scalar: number) {
        let cell_manager = locations_cells[location];
        let obst_manager = locations_obstacles[location];
        const all_passable: PolyPoints[] = [];
        const all_elements: Polygon[] = [];
        if (!obst_manager || !cell_manager) {
            cell_manager = CellsManagerCreate(POLYGON_CELL_SIZE);
            obst_manager = ObstraclePolygonsManagerCreate(POLYGON_SPATIAL_HASH_CELL_SIZE, OBST_PADDING, OFFSET_ARC_SEGMENTS);
            locations_cells[location] = cell_manager;
            locations_obstacles[location] = obst_manager;
        };

        let t1 = System.now_ms();
        log('mul_scalar', mul_scalar);
        for (const obstacle_tile of obstacles_data) {
            const elements = obst_manager.add_obstacle_object(obstacle_tile, mul_scalar);
            all_elements.push(...elements);
        }
        let t2 = System.now_ms();
        log('prepare obstacles time', t2 - t1)
        log('all obstacle elements', all_elements.length)
        const {start, end} = get_level_size(all_elements, OBST_PADDING);
        let t3 = System.now_ms();

        log('get_level_size time', t3 - t2)
        log(start, end)
        const cells = cell_manager.make_cells(start, end);
        let t4 = System.now_ms();
        log('make_cells time', t4 - t3)
        for (const cell of cells) {
            cell.passable = [];
            const obst_in_zone = obst_manager.get_elements_in_zone(cell.rectangle);
            const passable = (obst_in_zone.length != 0) ? build_navnmesh_polygons(cell.size, obst_in_zone, rasterizationCellSize) : cell.rectangle;


            // const passable_polygons = obst_manager.get_cell_passable_polygons(cell.rectangle);
            // for (const polygon of passable_polygons) {
            //     const convex_polygons = to_convex_polygons(polygon);
            //     cell.passable.push(...convex_polygons);
            // }
            cell.passable.push(passable);
            all_passable.push(...passable);
        }
        let t5 = System.now_ms();
        log('get passable polygons time', t5 - t4)
        locations_navmesh[location] = cell_manager.make_navmesh();
        return all_passable;
    }


    function get_navmesh(location: string) {
        return locations_navmesh[location];
    }
    
    return { load_location, load_location_with_cells, load_location_test, set_location_navmesh, find_path, get_navmesh, make_cells }
}

