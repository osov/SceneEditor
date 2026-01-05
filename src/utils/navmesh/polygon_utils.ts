import NavMeshGenerator from "navmesh-generator";
import { PointLike } from "../geometry/types";
import { Polygon, PolyPoints } from "./polygon_manager";


export enum PolygonWinding {
    CW,
    CCW,
    COLLINEAR
}

export function polygon_winding(points: PointLike[]): PolygonWinding {
    if (points.length < 3) {
        return PolygonWinding.COLLINEAR;
    }

    let sum = 0;
        for (let i = 0; i < points.length; i++) {
        const p1 = points[i];
        const p2 = points[(i + 1) % points.length];
        sum += (p2.x - p1.x) * (p2.y + p1.y);
    }

    if (sum > 0) {
        return PolygonWinding.CW;
    } else if (sum < 0) {
        return PolygonWinding.CCW;
    } else {
        return PolygonWinding.CW;
    }
}

export function is_convex(polygon: PointLike[]): boolean {
    if (polygon.length < 3) {
        return true; 
    }

    let crossProductSign = 0;

    for (let i = 0; i < polygon.length; i++) {
        const p1 = polygon[i];
        const p2 = polygon[(i + 1) % polygon.length];
        const p3 = polygon[(i + 2) % polygon.length];

        const crossProduct = (p2.x - p1.x) * (p3.y - p2.y) - (p2.y - p1.y) * (p3.x - p2.x);

        if (crossProduct !== 0) {
            if (crossProductSign === 0) {
                crossProductSign = crossProduct > 0 ? 1 : -1;
            } else if ((crossProduct > 0 && crossProductSign === -1) || (crossProduct < 0 && crossProductSign === 1)) {
                return false;
            }
        }
    }
    return true;
}


export function build_navnmesh_polygons(level_size: {start: PointLike, end: PointLike}, obstacles: Polygon[], rasterizationCellSize: number): PolyPoints[] {
    const navMeshGenerator = new NavMeshGenerator(
    level_size.start.x,
    level_size.start.y,
    level_size.end.x,
    level_size.end.y,
    rasterizationCellSize
    );
    const arr: PolyPoints[] = [];
    for (const poly of obstacles) {
        arr.push(poly[0]);
    }
    const navMeshPolygons = navMeshGenerator.buildNavMesh(
        arr,
        0
    );
    return navMeshPolygons;
    }
