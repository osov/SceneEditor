import { radToDeg } from "../physic/utils";
import { Arc } from "./arc";
import { Box } from "./box";
import { Circle } from "./circle";
import { DP_TOL, ShapeNames, TAU } from "./const";
import { Line } from "./line";
import { Matrix } from "./matrix";
import { Point } from "./point";
import { Segment } from "./segment";
import { AnyShape, IArc, IBox, ICircle, ILine, IMatrix, IPoint, ISegment, IVector, Shape } from "./types";
import { Vector } from "./vector";


export function clone_matrix(m: IMatrix) {
    return Matrix(m.a, m.b, m.c, m.d, m.tx, m.ty)
}

export function clone<T extends AnyShape>(s: T): T {
    if (s.name == ShapeNames.Vector) {
        let shape = s as IVector;
        return Vector(shape.x, shape.y);
    } 
    if (s.name == ShapeNames.Point) {
        let shape = s as IPoint;
        return Point(shape.x, shape.y); 
    }
    if (s.name == ShapeNames.Segment) {
        let shape = s as ISegment;
        return Segment(clone(shape.start), clone(shape.end));
    }   
    if (s.name == ShapeNames.Line) {
        let shape = s as ILine;
        return Line(clone(shape.pt), clone(shape.norm));
    }   
    if (s.name == ShapeNames.Circle) {
        let shape = s as ICircle;
        return Circle(clone(shape.pc), shape.r);
    } 
    if (s.name == ShapeNames.Box) {
        let shape = s as IBox;
        return Box(shape.xmin, shape.ymin, shape.xmax, shape.ymax);
    }   
    else {
        let shape = s as IArc;
        return Arc(clone(shape.pc), shape.r, shape.startAngle, shape.endAngle, shape.clockwise);
    } 
}

export function determinant(m: IMatrix) {
    const g = 0;
    const h = 0;
    const i = 1;
    return m.a * (m.d * i - m.ty * h) - m.c * (m.b * i - m.ty * g) + m.tx * (m.b * h - m.d * g);
}

export function ptInIntPoints(new_pt: IPoint, ip: IPoint[]) {
    return ip.some((pt) => pt.equalTo(new_pt));
}

export function isPointInSegmentBox(point: IPoint, segment: ISegment) {
    const box = segment.box();
    return (
        LE(point.x, box.xmax) &&
        GE(point.x, box.xmin) &&
        LE(point.y, box.ymax) &&
        GE(point.y, box.ymin)
    );
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


export function points2norm(pt1: IPoint, pt2: IPoint) {
    if (pt1.equalTo(pt2)) {
        throw Error('wrong parameters');
    }
    const vx = pt2.x - pt1.x;
    const vy = pt2.y - pt1.y;
    const vec = Vector(vx, vy);
    vec.normalize().rotate90CW();
    return vec;
}

export function sort(dist_and_segment: [number, ISegment][]) {
    dist_and_segment.sort((d1, d2) => {
        if (LT(d1[0], d2[0])) {
            return -1;
        }
        if (GT(d1[0], d2[0])) {
            return 1;
        }
        return 0;
    });
}

export function vec_angle(v1: IVector, v2: IVector) {
    let a = v1.angleTo(v2);
    if (a > Math.PI) a = a - 2 * Math.PI;
    return a;
}

export function vector_slope(x: number, y: number) {
    let angle = Math.atan2(y, x);
    if (angle < 0) angle = TAU + angle;
    return angle;
}

export const det = (a: number, b: number, c: number, d: number) => a * d - b * c;
export const point = (x: number, y: number) => Point(x, y);
export const circle = (pc: IPoint, r?: number) => Circle(pc, r);
export const vector = (x: number, y: number) => Vector(x, y);
export const vector_from_points = (a: IPoint, b: IPoint) => {
    const x = b.x - a.x;
    const y = b.y - a.y;
    return Vector(x, y);
};
export const segment = (x1: number, y1: number, x2: number, y2: number) => {
    return Segment(point(x1, y1), point(x2, y2));
};


