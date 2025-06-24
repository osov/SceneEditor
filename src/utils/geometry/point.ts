import { Box } from "./box";
import { ShapeNames, MATRIX_INDENTITY, POINT_EMPTY } from "./const";
import { point2line, point2circle, point2segment, point2arc } from "./distance";
import { Segment } from "./segment";
import { IPoint, IBox, PointLike, IVector, ILine, ISegment, ICircle, IArc, IMatrix, Shape } from "./types";
import { EQ, LT, EQ_0, vector_from_points, GT, clone, clone_matrix } from "./utils";
import { Vector } from "./vector";


export function Point(x = 0, y = 0) {
    const name = ShapeNames.Point;
    let center = () => Point(p.x, p.y);
    let box = () => Box(p.x, p.y, p.x, p.y);
    const p: IPoint = {
        x, y, name, center,
        box, translate, rotate, scale,
        contains, transform, equalTo, lessThan,
        projectionOn, leftTo, distanceTo, on,
    };

    function contains(other: IPoint) {
        return equalTo(other);
    }

    function equalTo(pt: IPoint) {
        return EQ(p.x, pt.x) && EQ(p.y, pt.y);
    }

    function lessThan(pt: IPoint) {
        if (LT(p.y, pt.y)) return true;
        if (EQ(p.y, pt.y) && LT(p.x, pt.x)) return true;
        return false;
    }

    function transform(m: IMatrix) {
        const temp = m.transform(p.x, p.y);
        p.x = temp.x;
        p.y = temp.y;
        return p;
    }

    function translate(x: number, y: number) {
        p.x = p.x + x;
        p.y = p.y + y;
        return p;
    }

    function rotate(angle: number, _center: PointLike | undefined) {
        const center = (_center) ? _center : clone(POINT_EMPTY);
        return transform(clone_matrix(MATRIX_INDENTITY).rotate(angle, center));
    }

    function scale(a: unknown, b?: unknown) {
        return transform(clone_matrix(MATRIX_INDENTITY).scale(a as number, (b ?? a) as number));
    }

    function projectionOn(line: ILine) {
        // ! В параметр line может подаваться константа LINE_A, не перезаписывать её пока используем line
        if (equalTo(line.pt))
            // this point equal to line anchor point
            return clone(p);
        const vec = Vector(line.pt.x - p.x, line.pt.y - p.y);
        if (EQ_0(vec.cross(line.norm)))
            // vector to point from anchor point collinear to normal vector
            return clone(line.pt);

        const dist = vec.dot(line.norm); // signed distance
        const proj_vec = clone(line.norm).multiply(dist);
        return clone(p).translate(proj_vec.x, proj_vec.y);
    }

    function leftTo(line: ILine) {
        const vec = vector_from_points(line.pt, p);
        const onLeftSemiPlane = GT(vec.dot(line.norm), 0);
        return onLeftSemiPlane;
    }

    function distanceTo(_shape: Shape): [number, ISegment] {
        if (_shape.name == ShapeNames.Point) {
            const shape = _shape as IPoint;
            const dx = shape.x - p.x;
            const dy = shape.y - p.y;
            return [Math.sqrt(dx * dx + dy * dy), Segment(clone(p), clone(shape))];
        }

        if (_shape.name == ShapeNames.Line) {
            const shape = _shape as ILine;
            return point2line(p, shape);
        }

        if (_shape.name == ShapeNames.Circle) {
            const shape = _shape as ICircle;
            return point2circle(p, shape);
        }

        if (_shape.name == ShapeNames.Segment) {
            const shape = _shape as ISegment;
            return point2segment(p, shape);
        }

        if (_shape.name == ShapeNames.Arc) {
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