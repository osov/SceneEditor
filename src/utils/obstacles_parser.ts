import { Line } from "detect-collisions";
import { rotate_point, Vec2XY } from "./math_utils";
import { ISegment, PointLike } from "./geometry/types";
import { Point, Segment } from "./geometry/shapes";

export type ObstacleTileData = {
    id: number;
    x: number;
    y: number;
    polygon?: Vec2XY[],
    polyline?: Vec2XY[],
};

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
    objects: TileObject[]
}

export interface ObstaclesMapData {
    objects: ObjectLayer[]
}

export function make_obstacles_from_data(obstacles_data: ObstacleTileData[], world_scalar: number) {
    const all_obstacles: Line[] = [];
    for (const tile of obstacles_data) {
        if (tile.polygon || tile.polyline) {

            if (tile.polyline) {
                const lines = make_collision_polyline(tile.x, tile.y, tile.polyline, world_scalar);
                all_obstacles.push(...lines);
            }
            if (tile.polygon) {
                const lines = make_collision_polygon(tile.x, tile.y, tile.polygon, world_scalar);
                all_obstacles.push(...lines);
            }
        }
    }
    return all_obstacles;
}

export function parse_obstacles(data: ObstaclesMapData) {
    const objects: ObstacleTileData[] = [];
    for (const obj_layer of data.objects) {
        objects.push(...create_objects(obj_layer));
    }
    return objects;
}

function create_objects(obj_layer: ObjectLayer) {
    const objects: ObstacleTileData[] = [];
    for (const obj of obj_layer.objects) {
        if (obj.polygon || obj.polyline) {
            const new_pos = rotate_point(vmath.vector3(obj.x, -obj.y, 0), vmath.vector3(1, 1, 0), obj.r != undefined ? -obj.r : 0);
            const data: ObstacleTileData = {
                x: new_pos.x,
                y: new_pos.y,
                id: obj.id
            };
            if (obj.polygon)
                data.polygon = make_polygon(obj.polygon);
            if (obj.polyline)
                data.polyline = make_polygon(obj.polyline);
            objects.push(data);
        }
    }
    return objects;
}

function make_polygon(points: number[]) {
    const polygon: vmath.vector3[] = [];
    for (let i = 0; i < points.length; i += 2) {
        polygon.push(vmath.vector3(points[i], points[i + 1], 0));
    }
    return polygon;
}

function make_collision_polyline(x: number, y: number, polygon: PointLike[], world_scalar: number) {
    const segments: Line[] = [];
    const cx = x * world_scalar;
    const cy = y * world_scalar;
    for (let i = 0; i < polygon.length - 1; i++) {
        const s_x = polygon[i].x;
        const s_y = polygon[i].y;
        const e_x = polygon[i + 1].x;
        const e_y = polygon[i + 1].y;
        const seg = new Line({ x: cx + s_x * world_scalar, y: cy - s_y * world_scalar }, { x: cx + e_x * world_scalar, y: cy - e_y * world_scalar });
        segments.push(seg);
    }
    return segments;
}

function make_collision_polygon(x: number, y: number, polygon: PointLike[], world_scalar: number) {
    const segments: Line[] = [];
    const cx = x * world_scalar;
    const cy = y * world_scalar;
    segments.push(...make_collision_polyline(x, y, polygon, world_scalar));

    const s_x = polygon[polygon.length - 1].x;
    const s_y = polygon[polygon.length - 1].y;
    const e_x = polygon[0].x;
    const e_y = polygon[0].y;
    const seg = new Line({ x:cx + s_x * world_scalar, y:cy - s_y * world_scalar}, { x:cx + e_x * world_scalar, y:cy - e_y * world_scalar});
    segments.push(seg);
    return segments;
}

export function make_segments_from_data(obstacles_data: ObstacleTileData[], world_scalar: number) {
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
    }        
    return all_obstacles;
}

export function polyline_to_segments(x: number, y: number, polygon: PointLike[], world_scalar: number) {
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

export function polygon_to_segments(x: number, y: number, polygon: PointLike[], world_scalar: number) {
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


