import { Point, Segment } from "../geometry/shapes";
import { PointLike, ISegment } from "../geometry/types";

export function degToRad(degrees: number) {
    return degrees * (Math.PI / 180);
}

export function radToDeg(rad: number) {
    return rad / (Math.PI / 180);
}

export function eulerToQuaternion(euler: vmath.vector3) {
    const roll = degToRad(euler.x);
    const pitch = degToRad(euler.y);
    const yaw = degToRad(euler.z);

    const qx = Math.sin(roll / 2) * Math.cos(pitch / 2) * Math.cos(yaw / 2) - Math.cos(roll / 2) * Math.sin(pitch / 2) * Math.sin(yaw / 2);
    const qy = Math.cos(roll / 2) * Math.sin(pitch / 2) * Math.cos(yaw / 2) + Math.sin(roll / 2) * Math.cos(pitch / 2) * Math.sin(yaw / 2);
    const qz = Math.cos(roll / 2) * Math.cos(pitch / 2) * Math.sin(yaw / 2) - Math.sin(roll / 2) * Math.sin(pitch / 2) * Math.cos(yaw / 2);
    const qw = Math.cos(roll / 2) * Math.cos(pitch / 2) * Math.cos(yaw / 2) + Math.sin(roll / 2) * Math.sin(pitch / 2) * Math.sin(yaw / 2);

    return vmath.vector4(qx, qy, qz, qw);
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

