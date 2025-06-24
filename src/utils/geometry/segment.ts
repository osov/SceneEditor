import { Box } from "./box";
import { MATRIX_INDENTITY, NULL_VALUE, POINT_EMPTY, ShapeNames } from "./const";
import { point2segment, segment2point, segment2circle, segment2line, segment2segment, segment2arc } from "./distance";
import { intersectSegment2Line, intersectSegment2Segment, intersectSegment2Circle, intersectSegment2Box, intersectSegment2Arc } from "./intersect";
import { Line } from "./line";
import { Point } from "./point";
import { IArc, IBox, ICircle, ILine, IMatrix, IPoint, ISegment, IVector, PointLike, Shape } from "./types";
import { clone, clone_matrix, EQ, EQ_0 } from "./utils";
import { Vector } from "./vector";


export function Segment(start: IPoint, _end: IPoint | undefined = undefined) {
    const end = (_end) ? _end : clone(POINT_EMPTY);
    const name = ShapeNames.Segment;
    let center = () => Point((s.start.x + s.end.x) / 2, (s.start.y + s.end.y) / 2);
    let vertices = () => [s.start, s.end];
    let box = () => Box(
        Math.min(s.start.x, s.end.x),
        Math.min(s.start.y, s.end.y),
        Math.max(s.start.x, s.end.x),
        Math.max(s.start.y, s.end.y),
    );
    let length = () => vector().length();
    function vector() {
        return Vector(s.end.x - s.start.x, s.end.y - s.start.y);
    }
    let slope = () => vector().slope();

    function reverse(this:any) {
        const t_end = s.end;
        const t_start = s.start;
        return Segment(t_end, t_start);
    }

    const s: ISegment = {
        name, start, end, center, box, length, slope, vertices, vector,
        isZeroLength, transform, equalTo, contains,
        translate, rotate, scale, intersect, pointAtLength,
        distanceToPoint, tangentInStart, tangentInEnd, distanceTo,
        reverse, split, splitAtLength
    };


    function isZeroLength(): boolean {
        return s.start.equalTo(end);
    }

    function equalTo(seg: ISegment) {
        return s.start.equalTo(seg.start) && s.end.equalTo(seg.end);
    }

    function contains(pt: IPoint) {
        return EQ_0(distanceToPoint(pt));
    }

    function transform(matrix: IMatrix): ISegment {
        s.start = s.start.transform(matrix);
        s.end = s.end.transform(matrix);
        return s;
    }

    function translate(x: number, y: number) {
        return transform(clone_matrix(MATRIX_INDENTITY).translate(x, y));
    }

    function rotate(angle: number, _center: PointLike | undefined) {
        const center = (_center) ? _center : clone(POINT_EMPTY);
        return transform(clone_matrix(MATRIX_INDENTITY).rotate(angle, center));
    }

    function scale(a: unknown, b?: unknown) {
        return transform(clone_matrix(MATRIX_INDENTITY).scale(a as number, (b ?? a) as number));
    }

    function pointAtLength(at_length: number) {
        if (at_length <= 0) return s.start;
        if (at_length >= length()) return s.end;
        const factor = at_length / length();
        return Point(
            (s.end.x - s.start.x) * factor + s.start.x,
            (s.end.y - s.start.y) * factor + s.start.y,
        );
    }

    function distanceToPoint(point: IPoint) {
        const [dist] = point2segment(point, s);
        return dist;
    }

    function split(point: IPoint) {
        if (s.start.equalTo(point)) return [NULL_VALUE, clone(s)];
        if (s.end.equalTo(point)) return [clone(s), NULL_VALUE];
        return [Segment(s.start, point), Segment(point, s.end)];
    }

    function splitAtLength(at_length: number) {
        if (EQ_0(at_length)) return [NULL_VALUE, clone(s)];
        if (EQ(at_length, length())) return [clone(s), NULL_VALUE];
        const point = pointAtLength(at_length);
        return [Segment(s.start, point), Segment(point, s.end)];
    }

    function intersect(_shape: Shape): IPoint[] {
        if (_shape.name == ShapeNames.Point) {
            const shape = _shape as IPoint;
            return contains(shape) ? [shape] : [];
        }
        if (_shape.name == ShapeNames.Line) {
            const shape = _shape as ILine;
            return intersectSegment2Line(s, shape);
        }
        if (_shape.name == ShapeNames.Segment) {
            const shape = _shape as ISegment;
            return intersectSegment2Segment(s, shape);
        }
        if (_shape.name == ShapeNames.Circle) {
            const shape = _shape as ICircle;
            return intersectSegment2Circle(s, shape);
        }
        if (_shape.name == ShapeNames.Box) {
            const shape = _shape as IBox;
            return intersectSegment2Box(s, shape);
        }
        if (_shape.name == ShapeNames.Arc) {
            const shape = _shape as IArc;
            return intersectSegment2Arc(s, shape);
        }
        throw new Error('wrong operation');
    }

    function distanceTo(_shape: Shape): [number, ISegment] {
        if (_shape.name == ShapeNames.Point) {
            const shape = _shape as IPoint;
            const [dist, shortest_segment] = segment2point(s, shape);
            return [dist, shortest_segment];
        }

        if (_shape.name == ShapeNames.Circle) {
            const shape = _shape as ICircle;
            const [dist, shortest_segment] = segment2circle(s, shape);
            return [dist, shortest_segment];
        }

        if (_shape.name == ShapeNames.Line) {
            const shape = _shape as ILine;
            const [dist, shortest_segment] = segment2line(s, shape);
            return [dist, shortest_segment];
        }

        if (_shape.name == ShapeNames.Segment) {
            const shape = _shape as ISegment;
            const [dist, shortest_segment] = segment2segment(s, shape);
            return [dist, shortest_segment];
        }

        if (_shape.name == ShapeNames.Arc) {
            const shape = _shape as IArc;
            const [dist, shortest_segment] = segment2arc(s, shape);
            return [dist, shortest_segment];
        }
        throw new Error('wrong operation');
    }

    function tangentInStart(): IVector {
        const vec = Vector(s.end.x - s.start.x, s.end.y - s.start.y);
        return vec.normalize();
    }

    function tangentInEnd() {
        const vec = Vector(s.start.x - s.end.x, s.start.y - s.end.y);
        return vec.normalize();
    }

    return s;
}