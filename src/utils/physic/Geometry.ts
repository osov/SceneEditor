/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable prefer-const */
import { EQ, EQ_0, GE, GT, LE, LT, TAU } from "./utils";

export type I_NULL_VALUE = typeof NULL_VALUE;

/** @noSelf **/
export type PointLike = {
    x: number
    y: number
};

/** @noSelf **/
export type AnyShape = Shape<unknown>;

/** @noSelf **/
export interface Shape<T = unknown> {
    name: ShapeNames,
    center(): IPoint,
    box(): IBox,
    clone(): T,
    translate(v: IVector): T,
    rotate(angle: number, center?: PointLike): T,
    scale(s: number): T,
    contains(other: Shape<unknown>): boolean
    transform(m: Matrix): T,
}

/** @noSelf **/
export interface IPoint extends Shape<IPoint> {
    x: number,
    y: number,
    equalTo(other: IPoint): boolean,
    lessThan(pt: IPoint): boolean,
    projectionOn(line: ILine): IPoint,
    leftTo(line: ILine): boolean,
    distanceTo(shape: Shape): [number, ISegment],
    on(shape: Shape<any>): boolean,
}

/** @noSelf **/
export interface ILine extends Shape<ILine> {
    norm: IVector,
    pt: IPoint,
    length(): number,
    slope(): number,
    standard(): readonly [number, number, number],
    parallelTo(other_line: ILine): boolean,
    incidentTo(other_line: ILine): boolean,
    coord(pt: IPoint): number,
    intersect(s: Shape): IPoint[],
    distanceTo(s: Shape): [number, ISegment],
    sortPoints(pts: IPoint[]): IPoint[],
}

/** @noSelf **/
export interface IBox extends Shape<IBox> {
    xmin: number,
    ymin: number,
    xmax: number,
    ymax: number,
    width: number,
    height: number,
    low: IPoint,
    high: IPoint,
    intersect(other: IBox): boolean,
    merge(otherIBox: IBox): IBox,
    equalTo(otherIBox: IBox): boolean,
    lessThan(otherIBox: IBox): boolean,
    toPoints(): IPoint[],
    toISegments(): ISegment[],
}

/** @noSelf **/
export interface IVector extends Shape<IVector> {
    x: number,
    y: number,
    length(): number,
    slope(): number,
    normalize(): IVector,
    multiply(scalar: number): IVector,
    dot(v: IVector): number,
    cross(v: IVector): number,
    rotate90CW(): IVector,
    rotate90CCW(): IVector,
    invert(): IVector,
    add(v: IVector): IVector,
    subtract(v: IVector): IVector,
    angleTo(v: IVector): number,
    projectionOn(v: IVector): IVector
    equalTo(other: IVector): boolean,
}

/** @noSelf **/
export interface ICircle extends Shape<ICircle> {
    pc: IPoint,
    r: number,
    toArc(counterclockwise?: boolean): IArc,
    intersect(_shape: Shape): IPoint[],
    distanceTo(_shape: Shape): [number, ISegment],
}

/** @noSelf **/
export interface ISegment extends Shape<ISegment> {
    start: IPoint,
    end: IPoint,
    vertices(): IPoint[],
    vector(): IVector,
    slope(): number,
    length(): number,
    isZeroLength(): boolean,
    equalTo(seg: ISegment): boolean,
    intersect(_shape: Shape): IPoint[],
    pointAtLength(length: number): IPoint,
    distanceTo(_shape: Shape): [number, ISegment],
    distanceToPoint(point: IPoint): number,
    tangentInStart(): IVector,
    tangentInEnd(): IVector,
    reverse(this: any): ISegment,
    split(point: IPoint): (ISegment | I_NULL_VALUE)[],
    splitAtLength(length: number): (ISegment | I_NULL_VALUE)[],
}

/** @noSelf **/
export interface IArc extends Shape<IArc> {
    r: number,
    pc: IPoint,
    clockwise: boolean,
    startAngle: number,
    endAngle: number,
    start(): IPoint,
    end(): IPoint,
    sweep(): number,
    vertices(): IPoint[],
    length(): number,
    reverse(this: any): IArc,
    intersect(_shape: Shape): IPoint[],
    split(pt: IPoint): (IArc | I_NULL_VALUE)[],
    splitAtLength(length: number): (IArc | I_NULL_VALUE)[],
    middle(): IPoint,
    pointAtLength(at_length: number): IPoint | null,
    distanceTo(_shape: Shape): [number, ISegment],
    tangentInStart(): IVector,
    tangentInEnd(): IVector,
    sortPoints(pts: IPoint[]): IPoint[],
    breakToFunctional(): IArc[],
}


// Geometry objects

export function Point(x = 0, y = 0) {
    let _center: IPoint | null;
    let _box: IBox | null;
    const name = ShapeNames.Point;
    const center = () => _center ??= Point(x, y);
    const box = () => _box ??= Box(x, y, x, y);
    const p: IPoint = {
        x, y, name, center,
        box, clone, translate, rotate, scale,
        contains, transform, equalTo, lessThan,
        projectionOn, leftTo, distanceTo, on
    };

    function clone() {
        return Point(x, y);
    }

    function contains(other: IPoint) {
        return equalTo(other);
    }

    function equalTo(pt: IPoint) {
        return EQ(x, pt.x) && EQ(y, pt.y);
    }

    function lessThan(pt: IPoint) {
        if (LT(y, pt.y)) return true;
        if (EQ(y, pt.y) && LT(x, pt.x)) return true;
        return false;
    }

    function transform(m: Matrix) {
        const p = m.transform(x, y);
        return Point(p.x, p.y);
    }

    function translate(v: PointLike | IVector) {
        return transform(MATRIX_INDENTITY.translate(v));
    }

    function rotate(angle: number, center: PointLike = ORIGIN_POINT) {
        return transform(MATRIX_INDENTITY.rotate(angle, center));
    }

    function scale(a: unknown, b?: unknown) {
        return transform(MATRIX_INDENTITY.scale(a as number, (b ?? a) as number));
    }

    function projectionOn(line: ILine) {
        if (equalTo(line.pt))
            // this point equal to line anchor point
            return clone();
        const vec = Vector(line.pt.x - p.x, line.pt.y - p.y);
        if (EQ_0(vec.cross(line.norm)))
            // vector to point from anchor point collinear to normal vector
            return line.pt.clone();

        const dist = vec.dot(line.norm); // signed distance
        const proj_vec = line.norm.multiply(dist);
        return translate(proj_vec);
    }

    function leftTo(line: ILine) {
        const vec = vector_from_points(line.pt, p);
        const onLeftSemiPlane = GT(vec.dot(line.norm), 0);
        return onLeftSemiPlane;
    }

    function distanceTo(_shape: Shape): [number, ISegment] {
        if (_shape.name == ShapeNames.Point) {
            const shape = _shape as IPoint;
            const dx = shape.x - x;
            const dy = shape.y - y;
            return [Math.sqrt(dx * dx + dy * dy), Segment(p, shape)];
        }

        if (_shape.name == ShapeNames.ILine) {
            const shape = _shape as ILine;
            return point2line(p, shape);
        }

        if (_shape.name == ShapeNames.ICircle) {
            const shape = _shape as ICircle;
            return point2circle(p, shape);
        }

        if (_shape.name == ShapeNames.ISegment) {
            const shape = _shape as ISegment;
            return point2segment(p, shape);
        }

        if (_shape.name == ShapeNames.IArc) {
            const shape = _shape as IArc;
            return point2arc(p, shape);
        }

        throw new Error('unimplemented');
    }

    function on(_shape: Shape<any>): boolean {
        if (_shape.name == ShapeNames.Point) {
            const shape = _shape as IPoint;
            return equalTo(shape);
        }
        return _shape.contains(p);
    }

    return p;
}

export function Box(xmin = Infinity, ymin = Infinity, xmax = -Infinity, ymax = -Infinity) {
    let _center: IPoint | null;
    let _box: IBox | null;
    const name = ShapeNames.IBox;
    const center = () => _center ??= Point((xmin + xmax) / 2, (ymin + ymax) / 2);
    const box = () => _box ??= Box(xmin, ymin, xmax, ymax);
    const width = Math.abs(xmax - xmin);
    const height = Math.abs(ymax - ymin);
    const low = Point(xmin, ymin);
    const high = Point(xmax, ymax);
    const b: IBox = {
        xmin, ymin, xmax, ymax, name, center, box, width, height, low, high,
        clone, contains, intersect, merge, equalTo, lessThan,
        translate, rotate, scale, transform, toPoints, toISegments
    };

    function clone() {
        return Box(xmin, ymin, xmax, ymax);
    }

    function contains(other: IPoint): boolean {
        return other.x >= xmin && other.x <= xmax && other.y >= ymin && other.y <= ymax;
    }

    function intersect(otherIBox: IBox) {
        return !(
            xmax < otherIBox.xmin || xmin > otherIBox.xmax || ymax < otherIBox.ymin || ymin > otherIBox.ymax
        );
    }

    function merge(otherIBox: IBox) {
        return Box(
            Math.min(xmin, otherIBox.xmin),
            Math.min(ymin, otherIBox.ymin),
            Math.max(xmax, otherIBox.xmax),
            Math.max(ymax, otherIBox.ymax),
        );
    }

    function equalTo(otherIBox: IBox) {
        return low.equalTo(otherIBox.low) && high.equalTo(otherIBox.high);
    }

    function lessThan(otherIBox: IBox) {
        if (low.lessThan(otherIBox.low)) return true;
        if (low.equalTo(otherIBox.low) && high.lessThan(otherIBox.high)) return true;
        return false;
    }

    function toPoints() {
        return [
            Point(xmin, ymin),
            Point(xmax, ymin),
            Point(xmax, ymax),
            Point(xmin, ymax),
        ];
    }

    function toISegments() {
        const pts = toPoints();
        return [
            Segment(pts[0], pts[1]),
            Segment(pts[1], pts[2]),
            Segment(pts[2], pts[3]),
            Segment(pts[3], pts[0]),
        ];
    }

    function rotate(angle: number, center: PointLike = ORIGIN_POINT): IBox {
        throw new Error('wrong operation');
    }

    function transform(m = MATRIX_INDENTITY) {
        return toPoints().map(p => p.transform(m)).reduce((new_box, pt) => new_box.merge(pt.box()), VOID_BOX);
    }

    function translate(v: PointLike | IVector) {
        return transform(MATRIX_INDENTITY.translate(v));
    }

    function scale(a: unknown, b?: unknown) {
        return transform(MATRIX_INDENTITY.scale(a as number, (b ?? a) as number));
    }

    return b;
}

export function Line(pt = Point(0, 0), _norm = Vector(0, 1)) {
    const norm = _norm.length() > 1 ? _norm.normalize() : _norm;
    let _box: IBox | null;
    let _vector: IVector | null;
    const name = ShapeNames.ILine;
    const length = () => Number.POSITIVE_INFINITY;
    const center = () => pt;
    const vector = () => _vector ??= Vector(norm.y, -norm.x);
    const slope = vector().slope;
    const box = () => _box ??= Box(
        Number.NEGATIVE_INFINITY,
        Number.NEGATIVE_INFINITY,
        Number.POSITIVE_INFINITY,
        Number.POSITIVE_INFINITY,
    );
    const standard = () => {
        const A = norm.x;
        const B = norm.y;
        const C = norm.dot(Vector(pt.x, pt.y));
        return [A, B, C] as const;
    };

    const l: ILine = {
        pt, norm, name, length, box, standard, center, slope,
        clone, parallelTo, incidentTo, contains, coord,
        intersect, distanceTo, rotate, transform, translate, scale, sortPoints
    };

    function clone() {
        return Line(pt, norm);
    }

    function parallelTo(other_line: ILine) {
        return EQ_0(norm.cross(other_line.norm));
    }

    function incidentTo(other_line: ILine) {
        return parallelTo(other_line) && pt.on(other_line);
    }

    function contains(_pt: IPoint) {
        if (pt.equalTo(_pt)) {
            return true;
        }
        const vec = Vector(_pt.x - pt.x, _pt.y - pt.y);
        return EQ_0(norm.dot(vec));
    }

    function coord(pt: IPoint) {
        return Vector(pt.x, pt.y).cross(norm);
    }

    function intersect(_shape: Shape): IPoint[] {
        if (_shape.name == ShapeNames.Point) {
            const shape = _shape as IPoint;
            return contains(shape) ? [shape] : [];
        }
        if (_shape.name == ShapeNames.ILine) {
            const shape = _shape as ILine;
            return intersectILine2ILine(l, shape);
        }
        if (_shape.name == ShapeNames.ICircle) {
            const shape = _shape as ICircle;
            return intersectILine2ICircle(l, shape);
        }
        if (_shape.name == ShapeNames.IBox) {
            const shape = _shape as IBox;
            return intersectILine2IBox(l, shape);
        }
        if (_shape.name == ShapeNames.ISegment) {
            const shape = _shape as ISegment;
            return intersectISegment2ILine(shape, l);
        }
        if (_shape.name == ShapeNames.IArc) {
            const shape = _shape as IArc;
            return intersectILine2IArc(l, shape);
        }
        throw new Error('wrong operation');
    }

    function distanceTo(_shape: Shape<any>): [number, ISegment] {
        if (_shape.name == ShapeNames.Point) {
            const shape = _shape as IPoint;
            let [distance, shortest_segment] = point2line(shape, l);
            shortest_segment = shortest_segment.reverse();
            return [distance, shortest_segment];
        }

        if (_shape.name == ShapeNames.ICircle) {
            const shape = _shape as ICircle;
            let [distance, shortest_segment] = circle2line(shape, l);
            shortest_segment = shortest_segment.reverse();
            return [distance, shortest_segment];
        }

        if (_shape.name == ShapeNames.ISegment) {
            const shape = _shape as ISegment;
            const [distance, shortest_segment] = segment2line(shape, l);
            return [distance, shortest_segment.reverse()];
        }

        if (_shape.name == ShapeNames.IArc) {
            const shape = _shape as IArc;
            const [distance, shortest_segment] = arc2line(shape, l);
            return [distance, shortest_segment.reverse()];
        }
        throw new Error('wrong operation');
    }

    function rotate(angle: number, center: PointLike = ORIGIN_POINT) {
        return Line(pt.rotate(angle, center), norm.rotate(angle));
    }

    function transform(m: Matrix) {
        return Line(pt.transform(m), norm.clone());
    }

    function translate(v: PointLike | IVector) {
        return transform(MATRIX_INDENTITY.translate(v));
    }

    function scale(a: unknown, b?: unknown) {
        return transform(MATRIX_INDENTITY.scale(a as number, (b ?? a) as number));
    }

    function sortPoints(pts: IPoint[]) {
        return pts.slice().sort((pt1, pt2) => {
            if (coord(pt1) < coord(pt2)) {
                return -1;
            }
            if (coord(pt1) > coord(pt2)) {
                return 1;
            }
            return 0;
        });
    }

    return l;
}

export function Vector(x = 0, y = 0) {
    let _length: number | null;
    let _slope: number | null;
    let _center: IPoint | null;
    const name = ShapeNames.IVector;
    const length = () => _length ??= Math.sqrt(dot({ x, y }));
    const center = () => _center ??= Point(x / 2, y / 2);
    const slope = () => _slope ??= vector_slope(x, y);
    const box = () => Box(Math.min(0, x), Math.min(0, y), Math.max(0, x), Math.max(0, y));
    const v: IVector = {
        x, y, name, length, center, box, slope,
        clone, multiply, equalTo, contains, dot, cross, translate, scale, normalize, rotate,
        transform, rotate90CW, rotate90CCW, invert, add, subtract,
        angleTo, projectionOn
    };

    function clone() {
        return Vector(x, y);
    }

    function multiply(scalar: number) {
        return Vector(scalar * x, scalar * y);
    }

    function equalTo(v: IVector) {
        return EQ(x, v.x) && EQ(y, v.y);
    }

    function contains(_other: Shape<unknown>): boolean {
        throw new Error('unimplemented');
    }

    function dot(v: IVector | PointLike) {
        return x * v.x + y * v.y;
    }

    function cross(v: IVector) {
        return x * v.y - y * v.x;
    }

    function translate(v: PointLike | IVector) {
        return transform(MATRIX_INDENTITY.translate(v));
    }

    function scale(a: unknown, b?: unknown) {
        return transform(MATRIX_INDENTITY.scale(a as number, (b ?? a) as number));
    }

    function normalize() {
        if (!EQ_0(length())) {
            return Vector(x / length(), y / length());
        }
        throw new Error('zero division while trying normalize a vector');
    }

    function rotate(angle: number, center: IVector | PointLike = POINT_EMPTY) {
        if (center.x === 0 && center.y === 0) {
            return transform(Matrix().rotate(angle));
        }
        throw new Error('wrong operation');
    }

    function transform(m: Matrix) {
        const t = m.transform(x, y);
        return Vector(t.x, t.y);
    }

    function rotate90CW() {
        return Vector(-y, x);
    }

    function rotate90CCW() {
        return Vector(y, -x);
    }

    function invert() {
        return Vector(-x, -y);
    }

    function add(v: IVector) {
        return Vector(x + v.x, y + v.y);
    }

    function subtract(v: IVector) {
        return Vector(x - v.x, y - v.y);
    }

    /**
     * Return angle between this vector and other vector. <br/>
     * Angle is measured from 0 to 2*PI in the counterclockwise direction
     * from current vector to  another.
     */
    function angleTo(v: IVector) {
        const norm1 = normalize();
        const norm2 = v.normalize();
        let angle = Math.atan2(norm1.cross(norm2), norm1.dot(norm2));
        if (angle < 0) angle += TAU;
        return angle;
    }

    /**
     * Return vector projection of the current vector on another vector
     */
    function projectionOn(v: IVector) {
        const n = v.normalize();
        const d = dot(n);
        return n.multiply(d);
    }

    return v;
}

export function Segment(start: IPoint, end = POINT_EMPTY) {
    let _center: IPoint | null;
    let _box: IBox | null;
    let _length: number | null;
    let _vector: IVector | null;
    const name = ShapeNames.ISegment;
    const center = () => _center ??= Point((start.x + end.x) / 2, (start.y + end.y) / 2);
    const vertices = () => [start, end];
    const box = () => _box ??= Box(
        Math.min(start.x, end.x),
        Math.min(start.y, end.y),
        Math.max(start.x, end.x),
        Math.max(start.y, end.y),
    );
    const length = () => _length ??= start.distanceTo(end)[0];
    const vector = () => _vector ??= Vector(end.x - start.x, end.y - start.y);
    const slope = vector().slope;

    function reverse(this:any) {
        return Segment(end, start);
    }

    const s: ISegment = {
        name, start, end, center, box, length, slope, vertices, vector,
        clone, isZeroLength, transform, equalTo, contains,
        translate, rotate, scale, intersect, pointAtLength,
        distanceToPoint, tangentInStart, tangentInEnd, distanceTo,
        reverse, split, splitAtLength
    };

    function clone() {
        return Segment(start, end);
    }

    function isZeroLength(): boolean {
        return start.equalTo(end);
    }

    function equalTo(seg: ISegment) {
        return start.equalTo(seg.start) && end.equalTo(seg.end);
    }

    function contains(pt: IPoint) {
        return EQ_0(distanceToPoint(pt));
    }

    function transform(matrix: Matrix): ISegment {
        return Segment(start.transform(matrix), end.transform(matrix));
    }

    function translate(v: PointLike | IVector) {
        return transform(MATRIX_INDENTITY.translate(v));
    }

    function rotate(angle: number, center: PointLike = ORIGIN_POINT): ISegment {
        return transform(MATRIX_INDENTITY.rotate(angle, center));
    }

    function scale(a: unknown, b?: unknown) {
        return transform(MATRIX_INDENTITY.scale(a as number, (b ?? a) as number));
    }

    function pointAtLength(at_length: number) {
        if (at_length <= 0) return start;
        if (at_length >= length()) return end;
        const factor = at_length / length();
        return Point(
            (end.x - start.x) * factor + start.x,
            (end.y - start.y) * factor + start.y,
        );
    }

    function distanceToPoint(point: IPoint) {
        const [dist] = point2segment(point, s);
        return dist;
    }

    function split(point: IPoint) {
        if (start.equalTo(point)) return [NULL_VALUE, clone()];
        if (end.equalTo(point)) return [clone(), NULL_VALUE];
        return [Segment(start, point), Segment(point, end)];
    }

    function splitAtLength(at_length: number) {
        if (EQ_0(at_length)) return [NULL_VALUE, clone()];
        if (EQ(at_length, length())) return [clone(), NULL_VALUE];
        const point = pointAtLength(at_length);
        return [Segment(start, point), Segment(point, end)];
    }

    function intersect(_shape: Shape): IPoint[] {
        if (_shape.name == ShapeNames.Point) {
            const shape = _shape as IPoint;
            return contains(shape) ? [shape] : [];
        }
        if (_shape.name == ShapeNames.ILine) {
            const shape = _shape as ILine;
            return intersectISegment2ILine(s, shape);
        }
        if (_shape.name == ShapeNames.ISegment) {
            const shape = _shape as ISegment;
            return intersectISegment2ISegment(s, shape);
        }
        if (_shape.name == ShapeNames.ICircle) {
            const shape = _shape as ICircle;
            return intersectISegment2ICircle(s, shape);
        }
        if (_shape.name == ShapeNames.IBox) {
            const shape = _shape as IBox;
            return intersectISegment2IBox(s, shape);
        }
        if (_shape.name == ShapeNames.IArc) {
            const shape = _shape as IArc;
            return intersectISegment2IArc(s, shape);
        }
        throw new Error('wrong operation');
    }

    function distanceTo(_shape: Shape): [number, ISegment] {
        if (_shape.name == ShapeNames.Point) {
            const shape = _shape as IPoint;
            const [dist, shortest_segment] = segment2point(s, shape);
            return [dist, shortest_segment];
        }

        if (_shape.name == ShapeNames.ICircle) {
            const shape = _shape as ICircle;
            const [dist, shortest_segment] = segment2circle(s, shape);
            return [dist, shortest_segment];
        }

        if (_shape.name == ShapeNames.ILine) {
            const shape = _shape as ILine;
            const [dist, shortest_segment] = segment2line(s, shape);
            return [dist, shortest_segment];
        }

        if (_shape.name == ShapeNames.ISegment) {
            const shape = _shape as ISegment;
            const [dist, shortest_segment] = segment2segment(s, shape);
            return [dist, shortest_segment];
        }

        if (_shape.name == ShapeNames.IArc) {
            const shape = _shape as IArc;
            const [dist, shortest_segment] = segment2arc(s, shape);
            return [dist, shortest_segment];
        }
        throw new Error('wrong operation');
    }

    function tangentInStart(): IVector {
        const vec = Vector(end.x - start.x, end.y - start.y);
        return vec.normalize();
    }

    function tangentInEnd() {
        const vec = Vector(start.x - end.x, start.y - end.y);
        return vec.normalize();
    }



    return s;
}

export function Circle(pc: IPoint, r = 0) {
    const name = ShapeNames.ICircle;
    const center = () => pc;
    const box = () => Box(pc.x - r, pc.y - r, pc.x + r, pc.y + r);
    const c: ICircle = {
        pc, r, center, name, box,
        clone, scale, toArc, transform, contains, translate, rotate, intersect, distanceTo
    };

    function clone() {
        return Circle(pc.clone(), r);
    }

    function toArc(counterclockwise = true) {
        return Arc(center(), r, Math.PI, -Math.PI, counterclockwise);
    }

    function scale(a: number, b?: number): ICircle {
        if (b !== undefined && a !== b) throw new Error('wrong operation');
        return Circle(pc, r * a);
    }

    function transform(matrix = Matrix()) {
        return Circle(pc.transform(matrix), r);
    }

    function contains(_shape: Shape): boolean {
        if (_shape.name == ShapeNames.Point) {
            const shape = _shape as IPoint;
            return LE(shape.distanceTo(center())[0], r);
        }

        if (_shape.name == ShapeNames.ISegment) {
            const shape = _shape as ISegment;
            return (
                LE(shape.start.distanceTo(center())[0], r) &&
                LE(shape.end.distanceTo(center())[0], r)
            );
        }

        if (_shape.name == ShapeNames.IArc) {
            const shape = _shape as IArc;
            return (
                intersect(shape).length === 0 &&
                LE(shape.start().distanceTo(center())[0], r) &&
                LE(shape.end().distanceTo(center())[0], r)
            );
        }

        if (_shape.name == ShapeNames.ICircle) {
            const shape = _shape as ICircle;
            return (
                intersect(shape).length === 0 &&
                LE(shape.r, r) &&
                LE(shape.center().distanceTo(center())[0], r)
            );
        }
        throw new Error('unimplemented');
    }

    function translate(v: PointLike | IVector) {
        return transform(MATRIX_INDENTITY.translate(v));
    }

    function rotate(angle: number, center: PointLike = ORIGIN_POINT) {
        return transform(MATRIX_INDENTITY.rotate(angle, center));
    }

    function intersect(_shape: Shape<any>): IPoint[] {
        if (_shape.name == ShapeNames.Point) {
            const shape = _shape as IPoint;
            return contains(shape) ? [shape] : [];
        }
        if (_shape.name == ShapeNames.ILine) {
            const shape = _shape as ILine;
            return intersectILine2ICircle(shape, c);
        }
        if (_shape.name == ShapeNames.ISegment) {
            const shape = _shape as ISegment;
            return intersectISegment2ICircle(shape, c);
        }
        if (_shape.name == ShapeNames.ICircle) {
            const shape = _shape as ICircle;
            return intersectICircle2ICircle(shape, c);
        }
        if (_shape.name == ShapeNames.IBox) {
            const shape = _shape as IBox;
            return intersectICircle2IBox(c, shape);
        }
        if (_shape.name == ShapeNames.IArc) {
            const shape = _shape as IArc;
            return intersectIArc2ICircle(shape, c);
        }
        throw new Error('wrong operation');
    }

    function distanceTo(_shape: Shape): [number, ISegment] {
        if (_shape.name == ShapeNames.Point) {
            const shape = _shape as IPoint;
            return reverse(point2circle(shape, c));
        }
        if (_shape.name == ShapeNames.ICircle) {
            const shape = _shape as ICircle;
            return circle2circle(c, shape);

        }
        if (_shape.name == ShapeNames.ILine) {
            const shape = _shape as ILine;
            return circle2line(c, shape);

        }
        if (_shape.name == ShapeNames.ISegment) {
            const shape = _shape as ISegment;
            return reverse(segment2circle(shape, c));

        }
        if (_shape.name == ShapeNames.IArc) {
            const shape = _shape as IArc;
            return reverse(arc2circle(shape, c));
        }
        throw new Error('wrong operation');
    }

    return c;
}

export function Arc(pc: IPoint = POINT_EMPTY, r = 1, startAngle = 0, endAngle: number = TAU, cw?: boolean) {
    let _start: IPoint | null;
    let _end: IPoint | null;
    let _length: number | null;
    const name = ShapeNames.IArc;
    const center = () => pc;
    const clockwise = (cw !== undefined) ? cw : CW;
    const start = () => _start ??= Point(pc.x + r, pc.y).rotate(startAngle, pc);
    const end = () => _end ??= Point(pc.x + r, pc.y).rotate(endAngle, pc);
    const vertices = () => [start(), end()];
    const length = () => _length ??= Math.abs(sweep() * r);

    function reverse(this:any) {
        return Arc(pc, r, endAngle, startAngle, !clockwise);
    }

    const a: IArc = {
        name, center, pc, r, clockwise, startAngle, endAngle,
        start, end, vertices, sweep, length, box, clone, reverse,
        contains, split, splitAtLength, middle, pointAtLength,
        intersect, distanceTo, transform, translate, rotate, scale,
        tangentInStart, tangentInEnd, sortPoints,
        breakToFunctional
    };

    // function start(): Point {
    //     return (_start ??= Point(pc.x + r, pc.y).rotate(startAngle, pc));
    // }

    // function end(): Point {
    //     return (_end ??= Point(pc.x + r, pc.y).rotate(endAngle, pc));
    // }

    function box() {
        const func_arcs = breakToFunctional();
        let box = func_arcs.reduce((acc, arc) => acc.merge(arc.start().box()), Box());
        box = box.merge(end().box());
        return box;
    }

    function sweep() {
        if (EQ(startAngle, endAngle)) return 0.0;
        if (EQ(Math.abs(startAngle - endAngle), TAU)) {
            return TAU;
        }
        let sweep: number;
        if (clockwise) {
            sweep = endAngle > startAngle ? endAngle - startAngle : endAngle - startAngle + TAU;
        } else {
            sweep = startAngle > endAngle ? startAngle - endAngle : startAngle - endAngle + TAU;
        }
        if (sweep > TAU) {
            sweep -= TAU;
        }
        if (sweep < 0) {
            sweep += TAU;
        }
        return sweep;
    }

    function clone() {
        return Arc(pc.clone(), r, startAngle, endAngle, clockwise);
    }



    function contains(pt: IPoint) {
        if (!EQ(pc.distanceTo(pt)[0], r)) return false;
        if (pt.equalTo(start())) return true;
        const angle = Vector(pt.x - pc.x, pt.y - pc.y).slope();
        const test_arc = Arc(pc, r, startAngle, angle, clockwise);
        return LE(test_arc.length(), length());
    }

    function split(pt: IPoint): (IArc | I_NULL_VALUE)[] {
        if (start().equalTo(pt)) return [NULL_VALUE, clone()];
        if (end().equalTo(pt)) return [clone(), NULL_VALUE];
        const angle = Vector(pt.x - pc.x, pt.y - pc.y).slope();
        return [
            Arc(pc, r, startAngle, angle, clockwise),
            Arc(pc, r, angle, endAngle, clockwise),
        ];
    }

    function splitAtLength(at_length: number): (IArc | I_NULL_VALUE)[] {
        if (EQ_0(at_length)) return [NULL_VALUE, clone()];
        if (EQ(at_length, length())) return [clone(), NULL_VALUE];
        const angle = startAngle + (clockwise ? +1 : -1) * sweep() * (at_length / length());
        return [
            Arc(pc, r, startAngle, angle, clockwise),
            Arc(pc, r, angle, endAngle, clockwise),
        ];
    }

    function middle() {
        const endAngle = clockwise ? startAngle + sweep() / 2 : startAngle - sweep() / 2;
        const arc = Arc(pc, r, startAngle, endAngle, clockwise);
        return arc.end();
    }

    function pointAtLength(at_length: number) {
        if (at_length > length() || at_length < 0) return null;
        if (at_length === 0) return start();
        if (at_length === length()) return end();
        const factor = at_length / length();
        const endAngle = clockwise ? startAngle + sweep() * factor : startAngle - sweep() * factor;
        const arc = Arc(pc, r, startAngle, endAngle, clockwise);
        return arc.end();
    }

    function intersect(_shape: Shape) {
        if (_shape.name == ShapeNames.Point) {
            const shape = _shape as IPoint;
            return contains(shape) ? [shape] : [];
        }
        if (_shape.name == ShapeNames.ILine) {
            const shape = _shape as ILine;
            return intersectILine2IArc(shape, a);
        }
        if (_shape.name == ShapeNames.ICircle) {
            const shape = _shape as ICircle;
            return intersectIArc2ICircle(a, shape);
        }
        if (_shape.name == ShapeNames.ISegment) {
            const shape = _shape as ISegment;
            return intersectISegment2IArc(shape, a);
        }
        if (_shape.name == ShapeNames.IBox) {
            const shape = _shape as IBox;
            return intersectIArc2IBox(a, shape);
        }
        if (_shape.name == ShapeNames.IArc) {
            const shape = _shape as IArc;
            return intersectIArc2IArc(a, shape);
        }
        throw new Error('wrong operation');
    }

    /**
     * Calculate distance and shortest segment from arc to shape and return array [distance, shortest segment]
     * @param _shape Shape of the one of supported types Point, ILine, ICircle, ISegment, IArc, Polygon or Planar Set
     * @returns distance from arc to shape
     * @returns shortest segment between arc and shape (started at arc, ended at shape)
     */
    function distanceTo(_shape: Shape): [number, ISegment] {
        if (_shape.name == ShapeNames.Point) {
            const shape = _shape as IPoint;
            return arc2point(a, shape);
        }
        if (_shape.name == ShapeNames.ICircle) {
            const shape = _shape as ICircle;
            return arc2circle(a, shape);
        }
        if (_shape.name == ShapeNames.ILine) {
            const shape = _shape as ILine;
            return arc2line(a, shape);
        }
        if (_shape.name == ShapeNames.ISegment) {
            const shape = _shape as ISegment;
            return arc2segment(a, shape);
        }
        if (_shape.name == ShapeNames.IArc) {
            const shape = _shape as IArc;
            return arc2arc(a, shape);
        }
        throw new Error('wrong operation');
    }

    function transform(matrix = Matrix()) {
        const newStart = start().transform(matrix);
        const newEnd = end().transform(matrix);
        const newCenter = pc.transform(matrix);
        let newDirection = clockwise;
        if (matrix.a * matrix.d < 0) {
            newDirection = !newDirection;
        }
        return arcSE(newCenter, newStart, newEnd, newDirection);
    }

    function translate(v: PointLike | IVector) {
        return transform(MATRIX_INDENTITY.translate(v));
    }

    function rotate(angle: number, center: PointLike = ORIGIN_POINT) {
        return transform(MATRIX_INDENTITY.rotate(angle, center));
    }

    function scale(a: unknown, b?: unknown) {
        return transform(MATRIX_INDENTITY.scale(a as number, (b ?? a) as number));
    }

    function arcSE(center: IPoint, start: IPoint, end: IPoint, clockwise: boolean) {
        const v1_x = start.x - center.x;
        const v1_y = start.y - center.y;
        const v2_x = end.x - center.x;
        const v2_y = end.y - center.y;
        const startAngle = Vector(v1_x, v1_y).slope();
        let endAngle = Vector(v2_x, v2_y).slope();
        if (EQ(startAngle, endAngle)) {
            endAngle += TAU;
            clockwise = true;
        }
        const r = Vector(v1_x, v1_y).length();
        return Arc(center, r, startAngle, endAngle, clockwise);
    }

    function tangentInStart() {
        const start_p = start();
        const vx = start_p.x - pc.x;
        const vy = start_p.y - pc.y;
        const vec = Vector(vx, vy);
        const angle = clockwise ? Math.PI / 2 : -Math.PI / 2;
        return vec.rotate(angle).normalize();
    }

    function tangentInEnd() {
        const end_p = end();
        const vx = end_p.x - pc.x;
        const vy = end_p.y - pc.y;
        const vec = Vector(vx, vy);
        const angle = clockwise ? -Math.PI / 2 : Math.PI / 2;
        return vec.rotate(angle).normalize();
    }

    function sortPoints(pts: IPoint[]) {
        return pts.slice().sort((pt1, pt2) => {
            const v1_x = pt1.x - pc.x;
            const v1_y = pt1.y - pc.y;
            const v2_x = pt2.x - pc.x;
            const v2_y = pt2.y - pc.y;
            const slope1 = Vector(v1_x, v1_y).slope();
            const slope2 = Vector(v2_x, v2_y).slope();
            if (slope1 < slope2) {
                return -1;
            }
            if (slope1 > slope2) {
                return 1;
            }
            return 0;
        });
    }

    function breakToFunctional() {
        const func_arcs_array = [] as IArc[];
        const angles = [0, Math.PI / 2, TAU / 2, (3 * Math.PI) / 2];
        const pts = [
            pc.translate(Vector(r, 0)),
            pc.translate(Vector(0, r)),
            pc.translate(Vector(-r, 0)),
            pc.translate(Vector(0, -r)),
        ];
        const test_arcs: IArc[] = [];
        for (let i = 0; i < 4; i++) {
            if (pts[i].on(a)) {
                test_arcs.push(Arc(pc, r, startAngle, angles[i], clockwise));
            }
        }

        if (test_arcs.length === 0) {
            func_arcs_array.push(clone());
        } else {
            test_arcs.sort((arc1, arc2) => arc1.length() - arc2.length());
            for (let i = 0; i < test_arcs.length; i++) {
                const prev_arc = func_arcs_array.length > 0 ? func_arcs_array[func_arcs_array.length - 1] : undefined;
                let new_arc;
                if (prev_arc) {
                    new_arc = Arc(pc, r, prev_arc.endAngle, test_arcs[i].endAngle, clockwise);
                } else {
                    new_arc = Arc(pc, r, startAngle, test_arcs[i].endAngle, clockwise);
                }
                if (!EQ_0(new_arc.length())) {
                    func_arcs_array.push(new_arc.clone());
                }
            }
            const prev_arc = func_arcs_array.length > 0 ? func_arcs_array[func_arcs_array.length - 1] : undefined;
            let new_arc;
            if (prev_arc) {
                new_arc = Arc(pc, r, prev_arc.endAngle, endAngle, clockwise);
            } else {
                new_arc = Arc(pc, r, startAngle, endAngle, clockwise);
            }
            if (!EQ_0(new_arc.length()) && !EQ(new_arc.sweep(), 2 * Math.PI)) {
                func_arcs_array.push(new_arc.clone());
            }
        }
        return func_arcs_array;
    }

    return a;
}

/** @noSelf **/
export interface Matrix {
    a: number,
    b: number,
    c: number,
    d: number,
    tx: number,
    ty: number,
    clone(): Matrix,
    to_dict(): { a: number, b: number, c: number, d: number, tx: number, ty: number },
    determinant(): number,
    get_inverse(): Matrix,
    set_inverse(m: Matrix | null): void,
    invert(): Matrix,
    transform(x: number, y: number): PointLike,
    multiply(other: Matrix): Matrix,
    rotate(angle: number, center?: PointLike): Matrix,
    scale(sx: number, sy: number): Matrix,
    translate(v: IVector | PointLike): Matrix,
    equalTo(matrix: Matrix): boolean,
    isIdentity(): boolean,
}

export function Matrix(_a = 1, _b = 0, _c = 0, _d = 1, _tx = 0, _ty = 0) {
    const a = _a;
    const b = _b;
    const c = _c;
    const d = _d;
    const tx = _tx;
    const ty = _ty;

    function to_dict() {
        return { a, b, c, d, tx, ty };
    }

    let _inverse: Matrix | null;
    const m: Matrix = {
        a, b, c, d, tx, ty,
        to_dict,
        clone,
        determinant,
        get_inverse,
        set_inverse,
        invert,
        transform,
        multiply,
        rotate,
        scale,
        translate,
        equalTo,
        isIdentity
    };

    function clone() {
        return Matrix(a, b, c, d, tx, ty);
    }

    function set_inverse(m: Matrix | null) {
        _inverse = m;
    }

    function get_inverse() {
        const inverse = _inverse ??= invert();
        inverse.set_inverse(Matrix(a, b, c, d, tx, ty));
        return inverse;
    }

    function determinant() {
        const g = 0;
        const h = 0;
        const i = 1;
        return a * (d * i - ty * h) - c * (b * i - ty * g) + tx * (b * h - d * g);
    }

    function invert() {
        set_inverse(null);

        const _a = a;
        const _b = c;
        const _c = tx;
        const _d = b;
        const e = d;
        const f = ty;
        const g = 0;
        const h = 0;
        const i = 1;
        const D = determinant();

        const ai = det(e, f, h, i) / D;
        const ci = -det(_b, _c, h, i) / D;
        const txi = det(_b, _c, e, f) / D;
        const bi = -det(_d, f, g, i) / D;
        const di = det(_a, _c, g, i) / D;
        const tyi = -det(_a, _c, _d, f) / D;

        return Matrix(ai, bi, ci, di, txi, tyi);
    }

    function transform(x: number, y: number) {
        return { x: x * a + y * c + tx, y: x * b + y * d + ty };
    }

    function multiply(other: Matrix) {
        const am = a * other.a + c * other.b;
        const bm = b * other.a + d * other.b;
        const cm = a * other.c + c * other.d;
        const dm = b * other.c + d * other.d;
        const txm = a * other.tx + c * other.ty + tx;
        const tym = b * other.tx + d * other.ty + ty;
        return Matrix(am, bm, cm, dm, txm, tym);
    }

    function rotate(angle: number, center: IVector | PointLike = { x: 0, y: 0 }) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const negative_center = Vector(-center.x, -center.y);
        return m
            .translate(center)
            .multiply(Matrix(cos, sin, -sin, cos, 0, 0))
            .translate(negative_center);
    }

    function scale(sx: number, sy: number) {
        return m.multiply(Matrix(sx, 0, 0, sy, 0, 0));
    }

    function translate(v: IVector | PointLike) {
        return m.multiply(Matrix(1, 0, 0, 1, v.x, v.y));
    }

    function equalTo(matrix: Matrix) {
        if (!EQ(tx, matrix.tx)) return false;
        if (!EQ(ty, matrix.ty)) return false;
        if (!EQ(a, matrix.a)) return false;
        if (!EQ(b, matrix.b)) return false;
        if (!EQ(c, matrix.c)) return false;
        if (!EQ(d, matrix.d)) return false;
        return true;
    }

    function isIdentity() {
        return a === 1 && b === 0 && c === 0 && d === 1 && tx === 0 && ty === 0;
    }

    return m;
}


//  distance functions

export function point2point(a: IPoint, b: IPoint): [number, ISegment] {
    return a.distanceTo(b);
}

export function point2line(pt: IPoint, line: ILine): [number, ISegment] {
    const closest_point = pt.projectionOn(line);
    const vec = Vector(closest_point.x - pt.x, closest_point.y - pt.y);
    return [vec.length(), Segment(pt, closest_point)];
}

export function point2circle(pt: IPoint, circle: ICircle): [number, ISegment] {
    const [dist2center, shortest_dist] = pt.distanceTo(circle.center());
    if (EQ_0(dist2center)) {
        return [circle.r, Segment(pt, circle.toArc().start())];
    } else {
        const dist = Math.abs(dist2center - circle.r);
        const v = Vector(pt.x - circle.pc.x, pt.y - circle.pc.y).normalize().multiply(circle.r);
        const closest_point = circle.pc.translate(v);
        return [dist, Segment(pt, closest_point)];
    }
}

export function point2segment(pt: IPoint, segment: ISegment): [number, ISegment] {
    // Degenerated case of zero-length segment 
    if (segment.start.equalTo(segment.end)) {
        return point2point(pt, segment.start);
    }

    const v_seg = Vector(segment.end.x - segment.start.x, segment.end.y - segment.start.y);
    const v_ps2pt = Vector(pt.x - segment.start.x, pt.y - segment.start.y);
    const v_pe2pt = Vector(pt.x - segment.end.x, pt.y - segment.end.y);
    const start_sp = v_seg.dot(v_ps2pt);
    // dot product v_seg * v_ps2pt 
    const end_sp = -v_seg.dot(v_pe2pt);
    //minus dot product v_seg * v_pe2pt */

    let dist;
    let closest_point;
    if (GE(start_sp, 0) && GE(end_sp, 0)) {
        const v_unit = segment.tangentInStart();
        dist = Math.abs(v_unit.cross(v_ps2pt));
        closest_point = segment.start.translate(v_unit.multiply(v_unit.dot(v_ps2pt)));
        return [dist, Segment(pt, closest_point)];
    } else if (start_sp < 0) {
        return pt.distanceTo(segment.start);
    } else {
        return pt.distanceTo(segment.end);
    }
}

export function point2arc(pt: IPoint, arc: IArc): [number, ISegment] {
    const circle = Circle(arc.pc, arc.r);
    const dist_and_segment = [];
    const [dist, shortest_segment] = point2circle(pt, circle);
    if (shortest_segment.end.on(arc)) {
        dist_and_segment.push(point2circle(pt, circle));
    }
    dist_and_segment.push(point2point(pt, arc.start()));
    dist_and_segment.push(point2point(pt, arc.end()));

    sort(dist_and_segment);

    return dist_and_segment[0];
}

export function arc2point(arc: IArc, point: IPoint) {
    return reverse(point2arc(point, arc));
}

export function segment2point(segment: ISegment, point: IPoint): [number, ISegment] {
    const result = point2segment(point, segment);
    result[1] = result[1].reverse();
    return result;
}

export function segment2circle(seg: ISegment, circle: ICircle): [number, ISegment] {
    const ip = seg.intersect(circle);
    if (ip.length > 0) {
        return [0, Segment(ip[0], ip[0])];
    }
    const norm = points2norm(seg.start, seg.end);
    const line = Line(seg.start, norm);
    const [dist, shortest_segment] = point2line(circle.center(), line);
    if (GE(dist, circle.r) && shortest_segment.end.on(seg)) {
        return point2circle(shortest_segment.end, circle);
    } else {
        const [dist_from_start, shortest_segment_from_start] = point2circle(seg.start, circle);
        const [dist_from_end, shortest_segment_from_end] = point2circle(seg.end, circle);
        return LT(dist_from_start, dist_from_end)
            ? [dist_from_start, shortest_segment_from_start]
            : [dist_from_end, shortest_segment_from_end];
    }
}

export function segment2line(seg: ISegment, line: ILine): [number, ISegment] {
    const ip = seg.intersect(line);
    if (ip.length > 0) {
        return [0, Segment(ip[0], ip[0])];
    }
    const dist_and_segment: [number, ISegment][] = [];
    dist_and_segment.push(point2line(seg.start, line));
    dist_and_segment.push(point2line(seg.end, line));

    sort(dist_and_segment);
    return dist_and_segment[0];
}

export function segment2segment(seg1: ISegment, seg2: ISegment): [number, ISegment] {
    const ip = intersectISegment2ISegment(seg1, seg2);
    if (ip.length > 0) {
        return [0, Segment(ip[0], ip[0])];
    }
    const dist_and_segment: [number, ISegment][] = [];
    let dist_tmp, shortest_segment_tmp;
    [dist_tmp, shortest_segment_tmp] = point2segment(seg2.start, seg1);
    dist_and_segment.push([dist_tmp, shortest_segment_tmp.reverse()]);
    [dist_tmp, shortest_segment_tmp] = point2segment(seg2.end, seg1);
    dist_and_segment.push([dist_tmp, shortest_segment_tmp.reverse()]);
    dist_and_segment.push(point2segment(seg1.start, seg2));
    dist_and_segment.push(point2segment(seg1.end, seg2));

    sort(dist_and_segment);
    return dist_and_segment[0];
}

export function segment2arc(seg: ISegment, arc: IArc): [number, ISegment] {
    const ip = seg.intersect(arc);
    if (ip.length > 0) {
        return [0, Segment(ip[0], ip[0])];
    }
    const norm = points2norm(seg.start, seg.end);
    const line = Line(seg.start, norm);
    const circle = Circle(arc.pc, arc.r);
    const [dist_from_center, shortest_segment_from_center] = point2line(circle.center(), line);
    if (GE(dist_from_center, circle.r) && shortest_segment_from_center.end.on(seg)) {
        const [dist_from_projection, shortest_segment_from_projection] = point2circle(
            shortest_segment_from_center.end,
            circle,
        );
        if (shortest_segment_from_projection.end.on(arc)) {
            return [dist_from_projection, shortest_segment_from_projection];
        }
    }
    const dist_and_segment: [number, ISegment][] = [];
    dist_and_segment.push(point2arc(seg.start, arc));
    dist_and_segment.push(point2arc(seg.end, arc));

    let dist_tmp, segment_tmp;
    [dist_tmp, segment_tmp] = point2segment(arc.start(), seg);
    dist_and_segment.push([dist_tmp, segment_tmp.reverse()]);

    [dist_tmp, segment_tmp] = point2segment(arc.end(), seg);
    dist_and_segment.push([dist_tmp, segment_tmp.reverse()]);

    sort(dist_and_segment);
    return dist_and_segment[0];
}

export function arc2segment(arc: IArc, segment: ISegment) {
    return reverse(segment2arc(segment, arc));
}

export function circle2circle(circle1: ICircle, circle2: ICircle): [number, ISegment] {
    const ip = circle1.intersect(circle2);
    if (ip.length > 0) {
        return [0, Segment(ip[0], ip[0])];
    }
    if (circle1.center().equalTo(circle2.center())) {
        const arc1 = circle1.toArc();
        const arc2 = circle2.toArc();
        return point2point(arc1.start(), arc2.start());
    } else {
        const norm = points2norm(circle1.center(), circle2.center());
        const line = Line(circle1.center(), norm);
        const ip1 = line.intersect(circle1);
        const ip2 = line.intersect(circle2);

        const dist_and_segment = [];

        dist_and_segment.push(point2point(ip1[0], ip2[0]));
        dist_and_segment.push(point2point(ip1[0], ip2[1]));
        dist_and_segment.push(point2point(ip1[1], ip2[0]));
        dist_and_segment.push(point2point(ip1[1], ip2[1]));

        sort(dist_and_segment);
        return dist_and_segment[0];
    }
}

export function circle2line(circle: ICircle, line: ILine): [number, ISegment] {
    const ip = circle.intersect(line);
    if (ip.length > 0) {
        return [0, Segment(ip[0], ip[0])];
    }
    const [dist_from_center, shortest_segment_from_center] = point2line(circle.center(), line);
    let [dist, shortest_segment] = point2circle(shortest_segment_from_center.end, circle);
    shortest_segment = shortest_segment.reverse();
    return [dist, shortest_segment];
}

export function arc2circle(arc: IArc, circle2: ICircle): [number, ISegment] {
    const ip = arc.intersect(circle2);
    if (ip.length > 0) {
        return [0, Segment(ip[0], ip[0])];
    }
    const circle1 = Circle(arc.center(), arc.r);
    const [dist, shortest_segment] = circle2circle(circle1, circle2);
    if (shortest_segment.start.on(arc)) {
        return [dist, shortest_segment];
    } else {
        const dist_and_segment = [];
        dist_and_segment.push(point2circle(arc.start(), circle2));
        dist_and_segment.push(point2circle(arc.end(), circle2));
        sort(dist_and_segment);
        return dist_and_segment[0];
    }
}

export function arc2line(arc: IArc, line: ILine): [number, ISegment] {
    const ip = line.intersect(arc);
    if (ip.length > 0) {
        return [0, Segment(ip[0], ip[0])];
    }
    const circle = Circle(arc.center(), arc.r);
    const [dist_from_center, shortest_segment_from_center] = point2line(circle.center(), line);
    if (GE(dist_from_center, circle.r)) {
        const [dist_from_projection, shortest_segment_from_projection] = point2circle(
            shortest_segment_from_center.end,
            circle,
        );
        if (shortest_segment_from_projection.end.on(arc)) {
            return [dist_from_projection, shortest_segment_from_projection];
        }
        throw new Error('wrong operation');
    } else {
        const dist_and_segment = [];
        dist_and_segment.push(point2line(arc.start(), line));
        dist_and_segment.push(point2line(arc.end(), line));
        sort(dist_and_segment);
        return dist_and_segment[0];
    }
}

export function arc2arc(arc1: IArc, arc2: IArc): [number, ISegment] {
    const ip = arc1.intersect(arc2);
    if (ip.length > 0) {
        return [0, Segment(ip[0], ip[0])];
    }
    const circle1 = Circle(arc1.center(), arc1.r);
    const circle2 = Circle(arc2.center(), arc2.r);
    const [dist, shortest_segment] = circle2circle(circle1, circle2);
    if (shortest_segment.start.on(arc1) && shortest_segment.end.on(arc2)) {
        return [dist, shortest_segment];
    } else {
        const dist_and_segment: [number, ISegment][] = [];

        let dist_tmp, segment_tmp;

        [dist_tmp, segment_tmp] = point2arc(arc1.start(), arc2);
        if (segment_tmp.end.on(arc2)) {
            dist_and_segment.push([dist_tmp, segment_tmp]);
        }

        [dist_tmp, segment_tmp] = point2arc(arc1.end(), arc2);
        if (segment_tmp.end.on(arc2)) {
            dist_and_segment.push([dist_tmp, segment_tmp]);
        }

        [dist_tmp, segment_tmp] = point2arc(arc2.start(), arc1);
        if (segment_tmp.end.on(arc1)) {
            dist_and_segment.push([dist_tmp, segment_tmp.reverse()]);
        }

        [dist_tmp, segment_tmp] = point2arc(arc2.end(), arc1);
        if (segment_tmp.end.on(arc1)) {
            dist_and_segment.push([dist_tmp, segment_tmp.reverse()]);
        }

        [dist_tmp, segment_tmp] = point2point(arc1.start(), arc2.start());
        dist_and_segment.push([dist_tmp, segment_tmp]);

        [dist_tmp, segment_tmp] = point2point(arc1.start(), arc2.end());
        dist_and_segment.push([dist_tmp, segment_tmp]);

        [dist_tmp, segment_tmp] = point2point(arc1.end(), arc2.start());
        dist_and_segment.push([dist_tmp, segment_tmp]);

        [dist_tmp, segment_tmp] = point2point(arc1.end(), arc2.end());
        dist_and_segment.push([dist_tmp, segment_tmp]);
        sort(dist_and_segment);

        return dist_and_segment[0];
    }
}

export function reverse(result: [number, ISegment]): [number, ISegment] {
    result[1] = result[1].reverse();
    return result;
}


//  intersect functions
export function intersectILine2ILine(line1: ILine, line2: ILine): IPoint[] {
    const ips: IPoint[] = [];
    const [A1, B1, C1] = line1.standard();
    const [A2, B2, C2] = line2.standard();
    const det = A1 * B2 - B1 * A2;
    const detX = C1 * B2 - B1 * C2;
    const detY = A1 * C2 - C1 * A2;

    if (!EQ_0(det)) {
        let x: number, y: number;

        if (B1 === 0) {
            x = C1 / A1;
            y = detY / det;
        } else if (B2 === 0) {
            x = C2 / A2;
            y = detY / det;
        } else if (A1 === 0) {
            x = detX / det;
            y = C1 / B1;
        } else if (A2 === 0) {
            x = detX / det;
            y = C2 / B2;
        } else {
            x = detX / det;
            y = detY / det;
        }
        ips.push(Point(x, y));
    }
    return ips;
}

export function intersectILine2ICircle(line: ILine, circle: ICircle): IPoint[] {
    const ips: IPoint[] = [];
    const prj = circle.pc.projectionOn(line);
    const dist = circle.pc.distanceTo(prj)[0];

    if (EQ(dist, circle.r)) {
        ips.push(prj);
    } else if (LT(dist, circle.r)) {
        const delta = Math.sqrt(circle.r * circle.r - dist * dist);
        let v_trans: IVector, pt: IPoint;

        v_trans = line.norm.rotate90CW().multiply(delta);
        pt = prj.translate(v_trans);
        ips.push(pt);

        v_trans = line.norm.rotate90CCW().multiply(delta);
        pt = prj.translate(v_trans);
        ips.push(pt);
    }
    return ips;
}

export function intersectILine2IBox(line: ILine, box: IBox): IPoint[] {
    const ips: IPoint[] = [];
    for (const seg of box.toISegments()) {
        const ips_tmp = intersectISegment2ILine(seg, line);
        for (const pt of ips_tmp) {
            if (!ptInIntPoints(pt, ips)) {
                ips.push(pt);
            }
        }
    }
    return ips;
}


export function intersectISegment2ILine(seg: ISegment, line: ILine): IPoint[] {
    const ips: IPoint[] = [];

    if (seg.start.on(line)) {
        ips.push(seg.start);
    }
    if (seg.end.on(line) && !seg.isZeroLength()) {
        ips.push(seg.end);
    }
    if (ips.length > 0) {
        return ips;
    }
    if (seg.isZeroLength()) {
        return ips;
    }
    if ((seg.start.leftTo(line) && seg.end.leftTo(line)) || (!seg.start.leftTo(line) && !seg.end.leftTo(line))) {
        return ips;
    }
    const norm1 = points2norm(seg.start, seg.end);
    const line1 = Line(seg.start, norm1);
    return intersectILine2ILine(line1, line);
}

export function intersectISegment2ISegment(seg1: ISegment, seg2: ISegment): IPoint[] {
    const ips: IPoint[] = [];

    if (!seg1.box().intersect(seg2.box())) {
        return ips;
    }

    if (seg1.isZeroLength()) {
        if (seg1.start.on(seg2)) {
            ips.push(seg1.start);
        }
        return ips;
    }

    if (seg2.isZeroLength()) {
        if (seg2.start.on(seg1)) {
            ips.push(seg2.start);
        }
        return ips;
    }

    const norm1 = points2norm(seg1.start, seg1.end);
    const norm2 = points2norm(seg2.start, seg2.end);
    const line1 = Line(seg1.start, norm1);
    const line2 = Line(seg2.start, norm2);

    if (line1.incidentTo(line2)) {
        if (seg1.start.on(seg2)) {
            ips.push(seg1.start);
        }
        if (seg1.end.on(seg2)) {
            ips.push(seg1.end);
        }
        if (seg2.start.on(seg1) && !seg2.start.equalTo(seg1.start) && !seg2.start.equalTo(seg1.end)) {
            ips.push(seg2.start);
        }
        if (seg2.end.on(seg1) && !seg2.end.equalTo(seg1.start) && !seg2.end.equalTo(seg1.end)) {
            ips.push(seg2.end);
        }
    } else {
        const new_ip = intersectILine2ILine(line1, line2);
        if (new_ip.length > 0) {
            if (isPointInISegmentIBox(new_ip[0], seg1) && isPointInISegmentIBox(new_ip[0], seg2)) {
                ips.push(new_ip[0]);
            }
        }
    }
    return ips;
}


export function intersectISegment2ICircle(segment: ISegment, circle: ICircle): IPoint[] {
    const ips: IPoint[] = [];

    if (!segment.box().intersect(circle.box())) {
        return ips;
    }
    if (segment.isZeroLength()) {
        const [dist, _] = segment.start.distanceTo(circle.pc);
        if (EQ(dist, circle.r)) {
            ips.push(segment.start);
        }
        return ips;
    }

    const norm = points2norm(segment.start, segment.end);
    const line = Line(segment.start, norm);
    const ips_tmp = intersectILine2ICircle(line, circle);
    for (const ip of ips_tmp) {
        if (ip.on(segment)) {
            ips.push(ip);
        }
    }
    return ips;
}

export function intersectISegment2IArc(segment: ISegment, arc: IArc): IPoint[] {
    const ips: IPoint[] = [];

    if (!segment.box().intersect(arc.box())) {
        return ips;
    }
    if (segment.isZeroLength()) {
        if (segment.start.on(arc)) {
            ips.push(segment.start);
        }
        return ips;
    }

    const norm = points2norm(segment.start, segment.end);
    const line = Line(segment.start, norm);
    const circle = Circle(arc.pc, arc.r);
    const ip_tmp = intersectILine2ICircle(line, circle);
    for (const pt of ip_tmp) {
        if (pt.on(segment) && pt.on(arc)) {
            ips.push(pt);
        }
    }
    return ips;
}

export function intersectISegment2IBox(segment: ISegment, box: IBox): IPoint[] {
    const ips: IPoint[] = [];
    for (const seg of box.toISegments()) {
        const ips_tmp = intersectISegment2ISegment(seg, segment);
        for (const ip of ips_tmp) {
            ips.push(ip);
        }
    }
    return ips;
}

export function intersectILine2IArc(line: ILine, arc: IArc): IPoint[] {
    const ips: IPoint[] = [];
    if (intersectILine2IBox(line, arc.box()).length === 0) {
        return ips;
    }
    const circle = Circle(arc.pc, arc.r);
    const ip_tmp = intersectILine2ICircle(line, circle);
    for (const pt of ip_tmp) {
        if (arc.contains(pt)) {
            ips.push(pt);
        }
    }
    return ips;
}

export function intersectIArc2ICircle(arc: IArc, circle: ICircle): IPoint[] {
    const ips: IPoint[] = [];
    if (!arc.box().intersect(circle.box())) {
        return ips;
    }
    if (circle.pc.equalTo(arc.pc) && EQ(circle.r, arc.r)) {
        ips.push(arc.start());
        ips.push(arc.end());
        return ips;
    }
    const circle1 = circle;
    const circle2 = Circle(arc.pc, arc.r);
    const ip_tmp = intersectICircle2ICircle(circle1, circle2);
    for (const pt of ip_tmp) {
        if (pt.on(arc)) {
            ips.push(pt);
        }
    }
    return ips;
}

export function intersectICircle2ICircle(circle1: ICircle, circle2: ICircle): IPoint[] {
    const ips: IPoint[] = [];
    if (!circle1.box().intersect(circle2.box())) {
        return ips;
    }
    let vec = vector_from_points(circle1.pc, circle2.pc);
    const r1 = circle1.r;
    const r2 = circle2.r;

    if (EQ_0(r1) || EQ_0(r2)) return ips;

    if (EQ_0(vec.x) && EQ_0(vec.y) && EQ(r1, r2)) {
        const v = Vector(-r1, 0);
        ips.push(circle1.pc.translate(v));
        return ips;
    }

    const dist = circle1.pc.distanceTo(circle2.pc)[0];

    if (GT(dist, r1 + r2))
        return ips;

    if (LT(dist, Math.abs(r1 - r2)))
        return ips;

    // Normalize vector.
    vec = vec.normalize();
    let pt: IPoint;
    if (EQ(dist, r1 + r2) || EQ(dist, Math.abs(r1 - r2))) {
        const v = Vector(r1 * vec.x, r1 * vec.y);
        pt = circle1.pc.translate(v);
        ips.push(pt);
        return ips;
    }

    // Distance from first center to center of common chord:
    //   a = (r1^2 - r2^2 + d^2) / 2d
    const a = (r1 * r1) / (2 * dist) - (r2 * r2) / (2 * dist) + dist / 2;
    const v = Vector(a * vec.x, a * vec.y);
    const mid_pt = circle1.pc.translate(v);
    const h = Math.sqrt(r1 * r1 - a * a);
    pt = mid_pt.translate(vec.rotate90CW().multiply(h));
    ips.push(pt);
    pt = mid_pt.translate(vec.rotate90CCW().multiply(h));
    ips.push(pt);
    return ips;
}

export function intersectICircle2IBox(circle: ICircle, box: IBox): IPoint[] {
    const ips = [];
    for (const seg of box.toISegments()) {
        const ips_tmp = intersectISegment2ICircle(seg, circle);
        for (const ip of ips_tmp) {
            ips.push(ip);
        }
    }
    return ips;
}

export function intersectIArc2IBox(arc: IArc, box: IBox): IPoint[] {
    const ips = [];
    for (const seg of box.toISegments()) {
        const ips_tmp = intersectISegment2IArc(seg, arc);
        for (const ip of ips_tmp) {
            ips.push(ip);
        }
    }
    return ips;
}

export function intersectIArc2IArc(arc1: IArc, arc2: IArc): IPoint[] {
    const ips: IPoint[] = [];
    if (!arc1.box().intersect(arc2.box())) {
        return ips;
    }
    if (arc1.pc.equalTo(arc2.pc) && EQ(arc1.r, arc2.r)) {
        let pt: IPoint;
        pt = arc1.start();
        if (pt.on(arc2)) ips.push(pt);
        pt = arc1.end();
        if (pt.on(arc2)) ips.push(pt);
        pt = arc2.start();
        if (pt.on(arc1)) ips.push(pt);
        pt = arc2.end();
        if (pt.on(arc1)) ips.push(pt);
        return ips;
    }
    const circle1 = Circle(arc1.pc, arc1.r);
    const circle2 = Circle(arc2.pc, arc2.r);
    const ip_tmp = circle1.intersect(circle2);
    for (const pt of ip_tmp) {
        if (pt.on(arc1) && pt.on(arc2)) {
            ips.push(pt);
        }
    }
    return ips;
}

function ptInIntPoints(new_pt: IPoint, ip: IPoint[]) {
    return ip.some((pt) => pt.equalTo(new_pt));
}

function isPointInISegmentIBox(point: IPoint, segment: ISegment) {
    const box = segment.box();
    return (
        LE(point.x, box.xmax) &&
        GE(point.x, box.xmin) &&
        LE(point.y, box.ymax) &&
        GE(point.y, box.ymin)
    );
}

export function points2norm(pt1: IPoint, pt2: IPoint) {
    if (pt1.equalTo(pt2)) {
        throw Error('wrong parameters');
    }
    const vx = pt2.x - pt1.x;
    const vy = pt2.y - pt1.y;
    const vec = Vector(vx, vy);
    const unit = vec.normalize();
    return unit.rotate90CW();
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


export enum ShapeNames {
    // Edge shapes
    ISegment = 'segment',
    IArc = 'arc',

    // Non-edge shapes
    IBox = 'box',
    ICircle = 'circle',
    Ray = 'ray',
    ILine = 'line',
    Point = 'point',
    IVector = 'vector',
}

const ORIGIN_POINT: PointLike = {
    x: NaN,
    y: NaN,
};
export const MATRIX_INDENTITY = Matrix(1, 0, 0, 1, 0, 0);
export const MATRIX_REFLECTION_X = Matrix(-1, 0, 0, 1, 0, 0);
export const MATRIX_REFLECTION_Y = Matrix(1, 0, 0, -1, 0, 0);
export const MATRIX_EMPTY = Matrix(0, 0, 0, 0, 0, 0);
export const POINT_EMPTY = Point(0, 0);
export const CIRCLE_EMPTY = Circle(POINT_EMPTY, 0);
export const VOID_BOX = Box(Infinity, Infinity, -Infinity, -Infinity);
export const NULL_VALUE = { null: true };
ORIGIN_POINT.x = 0;
ORIGIN_POINT.y = 0;

export const CW = true;
export const CCW = false;

const det = (a: number, b: number, c: number, d: number) => a * d - b * c;
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
export const arc = (pc: IPoint = POINT_EMPTY, r = NaN, startAngle = NaN, endAngle = NaN, cw?: boolean) => Arc(pc, r, startAngle, endAngle, cw);
