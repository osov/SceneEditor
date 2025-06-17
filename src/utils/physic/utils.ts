import { Vector, Circle, Segment, ISegment, ICircle } from "./Geometry";

export const DP_TOL = 0.000001;
export const TAU = 2 * Math.PI;



export function degToRad(degrees: number) {
    return degrees * (Math.PI / 180);
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


export function two_lines_intersect(v1: ISegment, v2: ISegment) {
    const x1 = v1.start.x;
    const y1 = v1.start.y;
    const x2 = v1.end.x;
    const y2 = v1.end.y;
    const x3 = v2.start.x;
    const y3 = v2.start.y;
    const x4 = v2.end.x;
    const y4 = v2.end.y;

    // Check if none of the lines are of length 0
    if ((x1 === x2 && y1 === y2) || (x3 === x4 && y3 === y4)) {
        return false;
    }
    const denominator = ((y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1));
    if (denominator === 0) {
        return false;
    }
    const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denominator;
    const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denominator;
    if (ua < 0 || ua > 1 || ub < 0 || ub > 1) {
        return false;
    }
    const x = x1 + ua * (x2 - x1);
    const y = y1 + ua * (y2 - y1);
    return { x, y };
}

export function circle_line_intersect(circle: ICircle, line: ISegment) {
    const v1 = { x: line.end.x - line.start.x, y: line.end.y - line.start.y };
    const v2 = { x: line.start.x - circle.center().x, y: line.start.y - circle.center().y };
    let b = v1.x * v2.x + v1.y * v2.y;
    const c = 2 * (v1.x * v1.x + v1.y * v1.y);
    b *= -2;
    const d = Math.sqrt(b * b - 2 * c * (v2.x * v2.x + v2.y * v2.y - circle.r * circle.r));
    if (isNaN(d)) {
        return [];
    }
    const u1 = (b - d) / c;
    const u2 = (b + d) / c;
    const ret = [];
    if (u1 <= 1 && u1 >= 0) {
        const retP1 = { x: line.start.x + v1.x * u1, y: line.start.y + v1.y * u1 };
        ret[0] = retP1;
    }
    if (u2 <= 1 && u2 >= 0) {
        const retP2 = { x: line.start.x + v1.x * u2, y: line.start.y + v1.y * u2 };
        ret[ret.length] = retP2;
    }
    return ret;
}

export function GT(x: number, y: number) {
    return x - y > DP_TOL;
}

export function GE(x: number, y: number) {
    return x - y > -DP_TOL;
}

export function LT(x: number, y: number) {
    return x - y < -DP_TOL;
}

export function LE(x: number, y: number) {
    return x - y < DP_TOL;
}

export function EQ_0(x: number) {
    return x < DP_TOL && x > -DP_TOL;
}

export function EQ(x: number, y: number) {
    return x - y < DP_TOL && x - y > -DP_TOL;
}
