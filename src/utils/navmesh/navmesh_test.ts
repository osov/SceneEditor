import earcut from "earcut";
import NavMesh from "navmesh";
import { ISegment, PointLike } from "../geometry/types";
import * as martinez from 'martinez-polygon-clipping';
import { clone, rotate, shape_vector, translate } from "../geometry/logic";
import { multiply, normalize } from "../geometry/utils";
import { vec2_distance_to } from "../math_utils";
import { SpatialHashManagerCreate, SpatialHashManagerUtils } from "./spatial_hash_manager";


export type PolyPoints = PointLike[];   // Массив точек для описания полигонов
export type Polygon = PolyPoints[];     // Полигон, первый элемент - PolyPoints описывающий внешнюю границу, остальные элементы считаются отверстиями. Не использовать пересекающиеся отверстия!
export type MultiPolygon = Polygon[];   // Мультиполигон, массив из Polygon, из которых каждый может иметь отверстия. Не использовать пересекающиеся полигоны!

export type TPosition = number[];

export type TLinearRing = TPosition[];
export type TPolygon = TLinearRing[];
export type TGeometry = TPolygon | TPolygon[];


export function get_polygon_earcut(vertices: PointLike[], holes?: PolyPoints[], dimensions?: number): PolyPoints[] {
    const vertices_flatten: number[] = [];
    const vertices_copy = vertices.slice();
    if (isConvex(vertices_copy) && (holes?.length == 0)) return [vertices_copy];
    for (const vertex of vertices) {
        vertices_flatten.push(vertex.x, vertex.y);
    }
    let start_index = vertices.length;
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
    const triangles: PolyPoints[] = [];
    for (let i = 0; i <= indexes.length - 3; i += 3) {
        const a = vertices_copy[indexes[i]];
        const b = vertices_copy[indexes[i + 1]];
        const c = vertices_copy[indexes[i + 2]];
        triangles.push([a, b, c]);
    }
    return triangles;
}

export function get_navmesh(meshPolygonPoints: PolyPoints[]) {
    const navmesh = new NavMesh(meshPolygonPoints);
    return navmesh;
}

// export function data_to_polygon(raw_polygon: TGeometry) {
//     const result_polygons: (PolyPoints[])[] = [];
//     for (const geometry of raw_polygon) {
//         const result_complex_polygon: PolyPoints[] = [];
//         for (const sub_geometry of geometry) {
//             const ring = sub_geometry as TLinearRing;
//             const result_polygon: PolyPoints = [];
//             for (const coord of ring) {
//                 result_polygon.push({x: coord[0], y: coord[1]})
//             }
//             if (result_polygon.length != 0) {
//                 result_polygon.pop();
//                 result_complex_polygon.push(result_polygon);
//             }
//         }
//         if (result_complex_polygon.length != 0) {
//             result_polygons.push(result_complex_polygon)
//         }
//     }
//     return result_polygons;
// }

export function data_to_polygon(raw_polygon: TGeometry) {
    const result_polygons: (PolyPoints[])[] = [];
    if (raw_polygon.length == 0) return result_polygons;
    
    let complex = false
    if (raw_polygon[0].length != 0 && typeof raw_polygon[0][0][0] != 'number') {
        complex = true;
    }
    if (complex) {
        for (const geometry of raw_polygon) {
            const result_complex_polygon: PolyPoints[] = [];
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
        const result_complex_polygon: PolyPoints[] = [];
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
    // log('ring', raw_polygon[0][0])
    
    return result_polygons;
}

export function polygon_to_data(poly_points: PolyPoints[]) {
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

export function polygon_union_mult(polygons: TGeometry[]) {
    if (polygons.length == 0) return [[]];
    let result: TGeometry = polygons[0];
    for (let i = 1; i < polygons.length; i++) {
        result = martinez.union(result, polygons[i]);
    }
    return result;
}

export function polygon_intersection_mult(polygons: TGeometry[]) {
    if (polygons.length == 0) return [[]];
    let result: TGeometry = polygons[0];
    for (let i = 1; i < polygons.length; i++) {
        result = martinez.intersection(result, polygons[i]);
    }
    return result;
}

export function polygon_union(poly_points_A: PolyPoints[], poly_points_B: PolyPoints[]) {
    const poly_A: TPolygon = polygon_to_data(poly_points_A);
    const poly_B: TPolygon = polygon_to_data(poly_points_B);
    const result = martinez.union(poly_A, poly_B);
    return data_to_polygon(result);
}

export function polygon_intersection(poly_A: TGeometry, poly_B: TGeometry) {
    const result = martinez.intersection(poly_A, poly_B);
    return result;
}

export function polygon_diff(poly_A: TGeometry, poly_B: TGeometry) {
    const result = martinez.diff(poly_A, poly_B);
    return result;
}

export function get_holes(obstacles: ISegment[], diag?: number): TGeometry {
    const polygons: TGeometry[] = [];
    for (const s of obstacles) {
        polygons.push(polygon_to_data(make_padding_rect(s, diag)));
    }
    if (polygons.length == 0) return [];
    const union = polygon_union_mult(polygons);
    return union;
}


export const padding = 1.5;
export const _diag = Math.sqrt(padding ** 2 + padding ** 2);

export function make_padding_rect(s: ISegment, diag = _diag): PolyPoints[] {
    const start = s.start;
    const end = s.end;
    const v = shape_vector(s);
    normalize(v);
    multiply(v, diag);

    rotate(v, Math.PI / 4);
    const A = clone(end)
    translate(A, v.x, v.y);

    rotate(v, Math.PI / 2);
    const B = clone(start);
    translate(B, v.x, v.y);

    rotate(v, Math.PI / 2);
    const C = clone(start);
    translate(C, v.x, v.y);

    rotate(v, Math.PI / 2);
    const D = clone(end);
    translate(D, v.x, v.y);

    return [[A, B, C, D]];
}

export function drop_complex_polygons(data: (PolyPoints | PolyPoints[])[]) {
    const result: PolyPoints[] = [];
    for (const poly of data) {
        result.push(poly.pop() as PolyPoints);
    }
    return result;
}

export function isConvex(polygon: PointLike[]): boolean {
    if (polygon.length < 3) {
        return true; // A polygon with less than 3 vertices is considered convex
    }

    let crossProductSign = 0;

    for (let i = 0; i < polygon.length; i++) {
        const p1 = polygon[i];
        const p2 = polygon[(i + 1) % polygon.length];
        const p3 = polygon[(i + 2) % polygon.length];

        // Calculate the cross product of vectors (p2 - p1) and (p3 - p2)
        const crossProduct = (p2.x - p1.x) * (p3.y - p2.y) - (p2.y - p1.y) * (p3.x - p2.x);

        if (crossProduct !== 0) {
            if (crossProductSign === 0) {
                crossProductSign = crossProduct > 0 ? 1 : -1;
            } else if ((crossProduct > 0 && crossProductSign === -1) || (crossProduct < 0 && crossProductSign === 1)) {
                return false; // Change in turn direction indicates concavity
            }
        }
    }
    return true;
}

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

export function PolygonsManagerCreate(hash_cell_size: number, utils: SpatialHashManagerUtils<PolyPoints[]>) {

    function get_obstacles_data_polygon(x: number, y: number, width: number, height: number) {
        const elements = base.get_elements(x, y, width, height);
        if (elements.length == 0) return;
        const data_polygons: TGeometry[] = [];
        for (const elem of elements) {
            data_polygons.push(polygon_to_data(elem));
        }
        const polygon_sum = polygon_union_mult(data_polygons);
        return polygon_sum;
    }

    const base = SpatialHashManagerCreate<PolyPoints[]>(hash_cell_size, utils);

    function add_obstacle(obstacle: ISegment) {
        const poly = make_padding_rect(obstacle);
        base.add_element(poly);
    }

    return {
        add_element: base.add_element, 
        remove_element: base.remove_element, 
        clear_elements: base.clear_elements,
        get_elements: base.get_elements, 
        enable_object: base.enable_object, 
        get_object_by_pos: base.get_object_by_pos,
        get_element_by_id: base.get_element_by_id, 
        objects: base.objects, 
        all_elements: base.all_elements,

        get_obstacles_data_polygon,
        add_obstacle
    };
}
