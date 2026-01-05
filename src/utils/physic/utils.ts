import { Point, Segment } from "../geometry/shapes";
import { PointLike, ISegment } from "../geometry/types";

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

