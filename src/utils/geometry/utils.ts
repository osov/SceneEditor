import { DP_TOL, ShapeNames, TAU } from "./const";
import { AnyShape, IArc, ISegment, IVector } from "./types";


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

export function degToRad(degrees: number) {
    return degrees * (Math.PI / 180);
}

export function normalize(v: IVector) {
    const L = shape_length(v);
    if (!EQ_0(L)) {
        v.x = v.x / L;
        v.y = v.y / L;
        return;
    }
    throw new Error('zero division while trying normalize a vector');
}

export function vector_slope(v: IVector) {
    let angle = Math.atan2(v.y, v.x);
    if (angle < 0) angle = TAU + angle;
    return angle;
}

export function shape_length<T extends AnyShape>(shape: T): number {
    if (shape.name == ShapeNames.Vector) {
        const v = shape as IVector;
        return Math.sqrt(v.x * v.x + v.y * v.y);
    }
    
    if (shape.name == ShapeNames.Line) {
        return Number.POSITIVE_INFINITY;
    }

    if (shape.name == ShapeNames.Arc) {
        const arc = shape as IArc;
        return Math.abs(arc_sweep(arc) * arc.r);
    }

    if (shape.name == ShapeNames.Segment) {
        const s = shape as ISegment;
        const x = s.end.x - s.start.x;
        const y = s.end.y - s.start.y;
        const length = Math.sqrt(x * x + y * y);
        return length;
    }

    throw new Error('Wrong shape');
}

export function arc_sweep(a: IArc) {
    if (EQ(a.startAngle, a.endAngle)) return 0.0;
    if (EQ(Math.abs(a.startAngle - a.endAngle), TAU)) {
        return TAU;
    }
    let sweep: number;
    if (a.clockwise) {
        sweep = a.endAngle > a.startAngle ? a.endAngle - a.startAngle : a.endAngle - a.startAngle + TAU;
    } else {
        sweep = a.startAngle > a.endAngle ? a.startAngle - a.endAngle : a.startAngle - a.endAngle + TAU;
    }
    if (sweep > TAU) {
        sweep -= TAU;
    }
    if (sweep < 0) {
        sweep += TAU;
    }
    return sweep;
}

export function add(v_in_place: IVector, v2: IVector) {
    v_in_place.x = v_in_place.x + v2.x;
    v_in_place.y = v_in_place.y + v2.y;
    return v_in_place;
}

export function subtract(v_in_place: IVector, v2: IVector) {
    v_in_place.x = v_in_place.x - v2.x;
    v_in_place.y = v_in_place.y - v2.y;
    return v_in_place;
}

export function multiply(v_in_place: IVector, scalar: number) {
    v_in_place.x = v_in_place.x * scalar;
    v_in_place.y = v_in_place.y * scalar;
}