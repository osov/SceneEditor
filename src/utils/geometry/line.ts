
import { Box } from "./box";
import { MATRIX_INDENTITY, POINT_EMPTY, ShapeNames, VEC_A } from "./const";
import { point2line, circle2line, segment2line, arc2line } from "./distance";
import { intersectLine2Line, intersectLine2Circle, intersectLine2Box, intersectSegment2Line, intersectLine2Arc } from "./intersect";
import { Point } from "./point";
import { IBox, IVector, ILine, IPoint, ICircle, ISegment, IArc, PointLike, Shape, IMatrix } from "./types";
import { clone, clone_matrix, EQ_0 } from "./utils";
import { Vector } from "./vector";


export function Line(_pt: IPoint | undefined = undefined, _norm: IVector | undefined = undefined) {
    const pt = (_pt) ? _pt : clone(POINT_EMPTY);
    let norm = (_norm) ? _norm : Vector(0, 1);
    norm = norm.length() > 1 ? norm.normalize() : norm;
    const name = ShapeNames.Line;
    let length = () => Number.POSITIVE_INFINITY;
    let center = () => l.pt;
    let vector = () => Vector(l.norm.y, -l.norm.x);
    let slope = () => l.vector().slope();
    let box = () => Box(
        Number.NEGATIVE_INFINITY,
        Number.NEGATIVE_INFINITY,
        Number.POSITIVE_INFINITY,
        Number.POSITIVE_INFINITY,
    );
    let standard = () => {
        const A = l.norm.x;
        const B = l.norm.y;
        VEC_A.x = l.pt.x;
        VEC_A.y = l.pt.y;
        const C = l.norm.dot(VEC_A);
        return [A, B, C] as const;
    };

    const l: ILine = {
        pt, norm, name, length, box, standard, center, vector, slope,
        parallelTo, incidentTo, contains, coord,
        intersect, distanceTo, rotate, transform, translate, scale, sortPoints
    };

    function parallelTo(other_line: ILine) {
        return EQ_0(l.norm.cross(other_line.norm));
    }

    function incidentTo(other_line: ILine) {
        return parallelTo(other_line) && pt.on(other_line);
    }

    function contains(_pt: IPoint) {
        if (l.pt.equalTo(_pt)) {
            return true;
        }
        const vec = Vector(_pt.x - l.pt.x, _pt.y - l.pt.y);
        return EQ_0(l.norm.dot(vec));
    }

    function coord(_pt: IPoint) {
        return Vector(_pt.x, _pt.y).cross(l.norm);
    }

    function intersect(_shape: Shape): IPoint[] {
        if (_shape.name == ShapeNames.Point) {
            const shape = _shape as IPoint;
            return contains(shape) ? [shape] : [];
        }
        if (_shape.name == ShapeNames.Line) {
            const shape = _shape as ILine;
            return intersectLine2Line(l, shape);
        }
        if (_shape.name == ShapeNames.Circle) {
            const shape = _shape as ICircle;
            return intersectLine2Circle(l, shape);
        }
        if (_shape.name == ShapeNames.Box) {
            const shape = _shape as IBox;
            return intersectLine2Box(l, shape);
        }
        if (_shape.name == ShapeNames.Segment) {
            const shape = _shape as ISegment;
            return intersectSegment2Line(shape, l);
        }
        if (_shape.name == ShapeNames.Arc) {
            const shape = _shape as IArc;
            return intersectLine2Arc(l, shape);
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

        if (_shape.name == ShapeNames.Circle) {
            const shape = _shape as ICircle;
            let [distance, shortest_segment] = circle2line(shape, l);
            shortest_segment = shortest_segment.reverse();
            return [distance, shortest_segment];
        }

        if (_shape.name == ShapeNames.Segment) {
            const shape = _shape as ISegment;
            const [distance, shortest_segment] = segment2line(shape, l);
            return [distance, shortest_segment.reverse()];
        }

        if (_shape.name == ShapeNames.Arc) {
            const shape = _shape as IArc;
            const [distance, shortest_segment] = arc2line(shape, l);
            return [distance, shortest_segment.reverse()];
        }
        throw new Error('wrong operation');
    }

    function rotate(angle: number, _center: PointLike | undefined) {
        const center = (_center) ? _center : clone(POINT_EMPTY);
        l.pt = pt.rotate(angle, center);
        l.norm = norm.rotate(angle, center);
        return l;
    }

    function transform(m: IMatrix) {
        l.pt = l.pt.transform(m);
        return l;
    }

    function translate(x: number, y: number) {
        return transform(clone_matrix(MATRIX_INDENTITY).translate(x, y));
    }

    function scale(a: unknown, b?: unknown) {
        return transform(clone_matrix(MATRIX_INDENTITY).scale(a as number, (b ?? a) as number));
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