import { SpatialHashManagerCreate, SpatialHashManagerUtils } from "./spatial_hash_manager";
import { PointLike } from "./geometry/types";
import { vec2_distance_to } from "./math_utils";
import { ObstacleTileData } from "./old_pathfinder/types";
import { Point } from "./geometry/shapes";

import NavMesh from "navmesh";
import * as martinez from 'martinez-polygon-clipping';
import offsetPolygon from "offset-polygon";
import { polygon_winding, PolygonWinding } from "./polygon_utils";


export type PolyPoints = PointLike[];   // Массив точек для описания полигонов
export type Polygon = PolyPoints[];     // Полигон, первый элемент - PolyPoints описывающий внешнюю границу, остальные элементы считаются отверстиями. Не использовать пересекающиеся отверстия!
export type MultiPolygon = Polygon[];   // Мультиполигон, массив из Polygon, из которых каждый может иметь отверстия. Не использовать пересекающиеся полигоны (можно объединить полигоны с помощью polygon_union_mult)

export type TPosition = number[];

export type TLinearRing = TPosition[];
export type TPolygon = TLinearRing[];
export type TGeometry = TPolygon | TPolygon[];

export type LevelCell = {
    rectangle: Polygon, 
    passable: Polygon[],   //  для navmesh использовать только простые (из одного полигона, без отверстий) выпуклые полигоны!
    size: {start: PointLike, end: PointLike}
};  
export type CellsManager = ReturnType<typeof CellsManagerCreate>
export type ObstraclePolygonsManager = ReturnType<typeof ObstraclePolygonsManagerCreate>


export const polygon_utils: SpatialHashManagerUtils<PolyPoints[]> = {
    get_center: (elem) => {
        const poly = elem[0];
        let min_x = Infinity;
        let min_y = Infinity;
        for (const point of poly) {
            min_x = Math.min(min_x, point.x);
            min_y = Math.min(min_y, point.y);
        }
        const h = polygon_utils.get_height(elem);
        const w = polygon_utils.get_width(elem);
        return {x: min_x + w / 2, y: min_y + h / 2};
    },
    get_height: (elem) => {
        const poly = elem[0];
        let min = Infinity;
        let max = -Infinity;
        for (const point of poly) {
            min = Math.min(min, point.y);
            max = Math.max(max, point.y);
        }
        return max - min;
    },
    get_width: (elem) => {
        const poly = elem[0];
        let min = Infinity;
        let max = -Infinity;
        for (const point of poly) {
            min = Math.min(min, point.x);
            max = Math.max(max, point.x);
        }
        return max - min;
    },
    get_distance: (p, elem) => {
        const c = polygon_utils.get_center(elem);
        return vec2_distance_to(p, c);
    }
}

export const cells_utils: SpatialHashManagerUtils<LevelCell> = {
    get_center: (cell) => polygon_utils.get_center(cell.rectangle),
    get_height: (cell) => polygon_utils.get_height(cell.rectangle),
    get_width: (cell) => polygon_utils.get_width(cell.rectangle),
    get_distance: (p, cell) => polygon_utils.get_distance(p, cell.rectangle),
}

export function CellsManagerCreate(hash_cell_size = 20) {
    const base = SpatialHashManagerCreate<LevelCell>(cells_utils, hash_cell_size);
    
    function make_cells(start: PointLike, end: PointLike, step = hash_cell_size) {
        for (let y = start.y; y < end.y; y += step) {
            for (let x = start.x; x < end.x; x += step) {
                const A = Point(x, y);
                const B = Point(x + step, y);
                const C = Point(x + step, y + step);
                const D = Point(x, y + step);    
                const rectangle: Polygon = [[A, B, C, D]];
                const cell: LevelCell = {rectangle, passable: [rectangle], size: {start: {x, y}, end: {x: x + step, y: y + step}}}
                base.add_element(cell)
            }
        }
        return base.all_elements;
    }

    function make_navmesh() {
        const t1 = System.now_ms();
        const passable_polygons: Polygon = [];
        for (const cell of base.all_elements) {
            for (const polygon of cell.passable)
                passable_polygons.push(...polygon)
        }
        const navmesh =  new NavMesh(passable_polygons);
        const t2 = System.now_ms();
        log('make_navmesh time', t2 - t1)
        return navmesh;
    }

    return {
        add_object: base.add_object,
        add_element: base.add_element, 
        remove_element: base.remove_element, 
        clear_all: base.clear_all, 
        clear_elements: base.clear_elements,
        get_elements: base.get_elements, 
        enable_object: base.enable_object, 
        get_object_by_pos: base.get_object_by_pos,
        get_element_by_id: base.get_element_by_id, 
        get_elements_in_zone: base.get_elements_in_zone,
        objects: base.objects, 
        all_elements: base.all_elements,
        
        make_cells,
        make_navmesh
    };
}


export function ObstraclePolygonsManagerCreate(hash_cell_size = 40, obst_padding = 10, offset_arc_segments = 3) {
    const base = SpatialHashManagerCreate<Polygon>(polygon_utils, hash_cell_size);

    function get_obstacles_data_polygon(poly: Polygon) {
        const elements = base.get_elements_in_zone(poly);
        if (elements.length == 0) return;
        const data_polygons: TGeometry[] = [];
        for (const elem of elements) {
            data_polygons.push(polygon_to_data(elem));
        }
        const polygon_sum = polygon_union_mult(data_polygons);
        return polygon_sum;
    }

    function add_obstacle_object(obj: ObstacleTileData, mul_scalar: number, data?: any) {
        const elements: Polygon[] = [];
        const cx = obj.x * mul_scalar;
        const cy = obj.y * mul_scalar;
        if (obj.polygon) {
            const polygon_points: PointLike[] = [];
            for (const p of obj.polygon) {
                polygon_points.push({
                    x: cx + p.x * mul_scalar,
                    y: cy - p.y * mul_scalar
                })
            }
            const poly_winding = polygon_winding(polygon_points);
            const padding = (poly_winding == PolygonWinding.CW) ? -obst_padding : obst_padding;
            const offset_poly = offsetPolygon(polygon_points, padding, offset_arc_segments);
            elements.push([offset_poly]);
        }
        if (obj.polyline) {
            const polygon_points: PointLike[] = [];
            for (const p of obj.polyline) {
                polygon_points.push({
                    x: cx + p.x * mul_scalar,
                    y: cy - p.y * mul_scalar
                })
            }
            const arr: TGeometry[] = [];
            for (let id = 0; id < polygon_points.length - 1; id++) {
                const line = [polygon_points[id], polygon_points[id + 1]];
                const offset_poly = offsetPolygon(line, obst_padding, offset_arc_segments);
                arr.push(polygon_to_data([offset_poly]));
            }
            const poly_union = data_to_polygon(polygon_union_mult(arr));
            elements.push(...poly_union);
        }
        base.add_object(elements, obj.id, data);
        return elements;
    }

    function data_to_polygon(raw_polygon: TGeometry) {
        const result_polygons: MultiPolygon = [];
        if (raw_polygon.length == 0) return result_polygons;
        
        let complex = false
        if (raw_polygon[0].length != 0 && typeof raw_polygon[0][0][0] != 'number') {
            complex = true;
        }
        if (complex) {
            for (const geometry of raw_polygon) {
                const result_complex_polygon: Polygon = [];
                for (const sub_geometry of geometry) {
                    const ring = sub_geometry as TLinearRing;
                    const result_polygon: PolyPoints = [];
                    for (const coord of ring) {
                        result_polygon.push({x: coord[0], y: coord[1]})
                    }
                    if (result_polygon.length != 0) {
                        result_polygon.pop();
                        result_complex_polygon.push(result_polygon);
                    }
                }
                if (result_complex_polygon.length != 0) {
                    result_polygons.push(result_complex_polygon)
                }
            }
        }
        else {
            const result_complex_polygon: Polygon = [];
            for (const geometry of raw_polygon) {
                const ring = geometry as TLinearRing;
                const result_polygon: PolyPoints = [];
                for (const coord of ring) {
                    result_polygon.push({x: coord[0], y: coord[1]})
                }
                if (result_polygon.length != 0) {
                    result_polygon.pop();
                    result_complex_polygon.push(result_polygon);
                }
            }
            if (result_complex_polygon.length != 0) {
                result_polygons.push(result_complex_polygon)
            }
        }   
        return result_polygons;
    }

    function polygon_to_data(poly_points: Polygon) {
        const poly: TPolygon = [];
        for (const _ring of poly_points) {
            const ring: TLinearRing = [];
            for (const pos of _ring) {
                ring.push([pos.x, pos.y]);
            }
            const start = _ring[0];
            ring.push([start.x, start.y]);
            poly.push(ring);
        }
        return poly
    }

    function polygon_union_mult(polygons: TGeometry[]) {
        if (polygons.length == 0) return [[]];
        let result: TGeometry = polygons[0];
        for (let i = 1; i < polygons.length; i++) {
            result = martinez.union(result, polygons[i]);
        }
        return result;
    }
    
    function polygon_intersection_mult(polygons: TGeometry[]) {
        if (polygons.length == 0) return [[]];
        let result: TGeometry = polygons[0];
        for (let i = 1; i < polygons.length; i++) {
            result = martinez.intersection(result, polygons[i]);
        }
        return result;
    }

    function polygon_intersection(poly_A: TGeometry, poly_B: TGeometry) {
        const result = martinez.intersection(poly_A, poly_B);
        return result;
    }

    function polygon_diff(poly_A: TGeometry, poly_B: TGeometry) {
        const result = martinez.diff(poly_A, poly_B);
        return result;
    }

    return {
        add_object: base.add_object, 
        set_objects: base.set_objects, 
        add_element: base.add_element, 
        remove_element: base.remove_element, 
        clear_all: base.clear_all, 
        clear_elements: base.clear_elements,
        get_elements: base.get_elements, 
        enable_object: base.enable_object, 
        get_object_by_pos: base.get_object_by_pos,
        get_element_by_id: base.get_element_by_id, 
        objects: base.objects, 
        all_elements: base.all_elements,

        get_obstacles_data_polygon,
        add_obstacle_object,
        get_elements_in_zone: base.get_elements_in_zone
    };
}

