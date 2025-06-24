import { Arc } from "./arc";
import { Box } from "./box";
import { MATRIX_INDENTITY, POINT_EMPTY, ShapeNames } from "./const";
import { reverse, point2circle, circle2circle, circle2line, segment2circle, arc2circle } from "./distance";
import { intersectLine2Circle, intersectSegment2Circle, intersectCircle2Circle, intersectCircle2Box, intersectArc2Circle } from "./intersect";
import { Matrix } from "./matrix";
import { IArc, IBox, ICircle, ILine, IPoint, ISegment, IVector, PointLike, Shape } from "./types";
import { clone, clone_matrix, LE } from "./utils";


export function Circle(pc: IPoint, r = 0) {
    const name = ShapeNames.Circle;
    let center = () => c.pc;
    let box = () => Box(c.pc.x - c.r, c.pc.y - c.r, c.pc.x + c.r, c.pc.y + c.r);
    const c: ICircle = {
        pc, r, center, name, box,
        scale, toArc, transform, contains, translate, rotate, intersect, distanceTo
    };

    function toArc(counterclockwise = true) {
        return Arc(center(), c.r, Math.PI, -Math.PI, counterclockwise);
    }

    function scale(a: number, b?: number): ICircle {
        if (b !== undefined && a !== b) throw new Error('wrong operation');
        c.r = c.r * a;
        return c;
    }

    function transform(matrix = Matrix()) {
        c.pc = pc.transform(matrix);
        return c;
    }

    function contains(_shape: Shape): boolean {
        if (_shape.name == ShapeNames.Point) {
            const shape = _shape as IPoint;
            return LE(shape.distanceTo(center())[0], r);
        }

        if (_shape.name == ShapeNames.Segment) {
            const shape = _shape as ISegment;
            return (
                LE(shape.start.distanceTo(center())[0], r) &&
                LE(shape.end.distanceTo(center())[0], r)
            );
        }

        if (_shape.name == ShapeNames.Arc) {
            const shape = _shape as IArc;
            return (
                intersect(shape).length === 0 &&
                LE(shape.start().distanceTo(center())[0], r) &&
                LE(shape.end().distanceTo(center())[0], r)
            );
        }

        if (_shape.name == ShapeNames.Circle) {
            const shape = _shape as ICircle;
            return (
                intersect(shape).length === 0 &&
                LE(shape.r, r) &&
                LE(shape.center().distanceTo(center())[0], r)
            );
        }
        throw new Error('unimplemented');
    }

    function translate(x: number, y: number) {
        return transform(clone_matrix(MATRIX_INDENTITY).translate(x, y));
    }

    function rotate(angle: number, _center: PointLike | undefined) {
        const center = (_center) ? _center : clone(POINT_EMPTY);
        return transform(clone_matrix(MATRIX_INDENTITY).rotate(angle, center));
    }

    function intersect(_shape: Shape<any>): IPoint[] {
        if (_shape.name == ShapeNames.Point) {
            const shape = _shape as IPoint;
            return contains(shape) ? [shape] : [];
        }
        if (_shape.name == ShapeNames.Line) {
            const shape = _shape as ILine;
            return intersectLine2Circle(shape, c);
        }
        if (_shape.name == ShapeNames.Segment) {
            const shape = _shape as ISegment;
            return intersectSegment2Circle(shape, c);
        }
        if (_shape.name == ShapeNames.Circle) {
            const shape = _shape as ICircle;
            return intersectCircle2Circle(shape, c);
        }
        if (_shape.name == ShapeNames.Box) {
            const shape = _shape as IBox;
            return intersectCircle2Box(c, shape);
        }
        if (_shape.name == ShapeNames.Arc) {
            const shape = _shape as IArc;
            return intersectArc2Circle(shape, c);
        }
        throw new Error('wrong operation');
    }

    function distanceTo(_shape: Shape): [number, ISegment] {
        if (_shape.name == ShapeNames.Point) {
            const shape = _shape as IPoint;
            return reverse(point2circle(shape, c));
        }
        if (_shape.name == ShapeNames.Circle) {
            const shape = _shape as ICircle;
            return circle2circle(c, shape);

        }
        if (_shape.name == ShapeNames.Line) {
            const shape = _shape as ILine;
            return circle2line(c, shape);

        }
        if (_shape.name == ShapeNames.Segment) {
            const shape = _shape as ISegment;
            return reverse(segment2circle(shape, c));

        }
        if (_shape.name == ShapeNames.Arc) {
            const shape = _shape as IArc;
            return reverse(arc2circle(shape, c));
        }
        throw new Error('wrong operation');
    }

    return c;
}
