import { Box } from "./box";
import { CW, MATRIX_INDENTITY, NULL_VALUE, POINT_EMPTY, ShapeNames, TAU } from "./const";
import { arc2point, arc2circle, arc2line, arc2segment, arc2arc } from "./distance";
import { intersectLine2Arc, intersectArc2Circle, intersectSegment2Arc, intersectArc2Arc, intersectArc2Box } from "./intersect";
import { Matrix } from "./matrix";
import { Point } from "./point";
import { I_NULL_VALUE, IArc, IBox, ICircle, ILine, IPoint, ISegment, PointLike, Shape } from "./types";
import { clone, clone_matrix, EQ, EQ_0, LE } from "./utils";
import { Vector } from "./vector";


var p1 = clone(POINT_EMPTY);
var p2 = clone(POINT_EMPTY);
var p3 = clone(POINT_EMPTY);
var p4 = clone(POINT_EMPTY);

export function Arc(_pc: IPoint | undefined = undefined, r = 1, startAngle = 0, endAngle: number = TAU, cw?: boolean) {
    const pc = (_pc) ? _pc : clone(POINT_EMPTY);
    const name = ShapeNames.Arc;
    let center = () => a.pc;
    let clockwise = (cw !== undefined) ? cw : CW;
    let start = () => Point(a.pc.x + a.r, a.pc.y).rotate(a.startAngle, a.pc);
    let end = () => Point(a.pc.x + a.r, a.pc.y).rotate(a.endAngle, a.pc);
    let vertices = () => [start(), end()];
    let length = () => Math.abs(sweep() * r);

    function reverse(this:any) {
        a.clockwise = !a.clockwise;
        return a;
    }

    const a: IArc = {
        name, center, pc, r, clockwise, startAngle, endAngle,
        start, end, vertices, sweep, length, box, reverse,
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

    function contains(pt: IPoint) {
        if (!EQ(a.pc.distanceTo(pt)[0], a.r)) return false;
        if (pt.equalTo(start())) return true;
        const angle = Vector(pt.x - a.pc.x, pt.y - a.pc.y).slope();
        const test_arc = Arc(a.pc, a.r, a.startAngle, angle, a.clockwise);
        return LE(test_arc.length(), length());
    }

    function split(pt: IPoint): (IArc | I_NULL_VALUE)[] {
        if (start().equalTo(pt)) return [NULL_VALUE, clone(a)];
        if (end().equalTo(pt)) return [clone(a), NULL_VALUE];
        const angle = Vector(pt.x - a.pc.x, pt.y - a.pc.y).slope();
        return [
            Arc(a.pc, a.r, a.startAngle, angle, a.clockwise),
            Arc(a.pc, a.r, angle, a.endAngle, a.clockwise),
        ];
    }

    function splitAtLength(at_length: number): (IArc | I_NULL_VALUE)[] {
        if (EQ_0(at_length)) return [NULL_VALUE, clone(a)];
        if (EQ(at_length, length())) return [clone(a), NULL_VALUE];
        const angle = a.startAngle + (a.clockwise ? +1 : -1) * sweep() * (at_length / length());
        return [
            Arc(a.pc, a.r, a.startAngle, angle, a.clockwise),
            Arc(a.pc, a.r, angle, a.endAngle, a.clockwise),
        ];
    }

    function middle() {
        const endAngle = a.clockwise ? a.startAngle + sweep() / 2 : a.startAngle - sweep() / 2;
        const arc = Arc(a.pc, a.r, a.startAngle, endAngle, a.clockwise);
        return arc.end();
    }

    function pointAtLength(at_length: number) {
        if (at_length > length() || at_length < 0) return null;
        if (at_length === 0) return start();
        if (at_length === length()) return end();
        const factor = at_length / length();
        const endAngle = a.clockwise ? a.startAngle + sweep() * factor : a.startAngle - sweep() * factor;
        const arc = Arc(a.pc, a.r, a.startAngle, endAngle, a.clockwise);
        return arc.end();
    }

    function intersect(_shape: Shape) {
        if (_shape.name == ShapeNames.Point) {
            const shape = _shape as IPoint;
            return contains(shape) ? [shape] : [];
        }
        if (_shape.name == ShapeNames.Line) {
            const shape = _shape as ILine;
            return intersectLine2Arc(shape, a);
        }
        if (_shape.name == ShapeNames.Circle) {
            const shape = _shape as ICircle;
            return intersectArc2Circle(a, shape);
        }
        if (_shape.name == ShapeNames.Segment) {
            const shape = _shape as ISegment;
            return intersectSegment2Arc(shape, a);
        }
        if (_shape.name == ShapeNames.Box) {
            const shape = _shape as IBox;
            return intersectArc2Box(a, shape);
        }
        if (_shape.name == ShapeNames.Arc) {
            const shape = _shape as IArc;
            return intersectArc2Arc(a, shape);
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
        if (_shape.name == ShapeNames.Circle) {
            const shape = _shape as ICircle;
            return arc2circle(a, shape);
        }
        if (_shape.name == ShapeNames.Line) {
            const shape = _shape as ILine;
            return arc2line(a, shape);
        }
        if (_shape.name == ShapeNames.Segment) {
            const shape = _shape as ISegment;
            return arc2segment(a, shape);
        }
        if (_shape.name == ShapeNames.Arc) {
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
        const r = Math.sqrt(v1_x * v1_x + v1_y * v1_y);
        return Arc(center, r, startAngle, endAngle, clockwise);
    }

    function tangentInStart() {
        const start_p = start();
        const vx = start_p.x - a.pc.x;
        const vy = start_p.y - a.pc.y;
        const vec = Vector(vx, vy);
        const angle = a.clockwise ? Math.PI / 2 : -Math.PI / 2;
        return vec.rotate(angle).normalize();
    }

    function tangentInEnd() {
        const end_p = end();
        const vx = end_p.x - a.pc.x;
        const vy = end_p.y - a.pc.y;
        const vec = Vector(vx, vy);
        const angle = a.clockwise ? -Math.PI / 2 : Math.PI / 2;
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
        p1.x = a.pc.x;
        p1.y = a.pc.y;
        p2.x = a.pc.x;
        p2.y = a.pc.y;
        p3.x = a.pc.x;
        p3.y = a.pc.y;
        p4.x = a.pc.x;
        p4.y = a.pc.y;
        const pts = [
            p1.translate(a.r, 0),
            p2.translate(0, a.r),
            p3.translate(-a.r, 0),
            p4.translate(0, -a.r),
        ];
        const test_arcs: IArc[] = [];
        for (let i = 0; i < 4; i++) {
            if (pts[i].on(a)) {
                test_arcs.push(Arc(a.pc, a.r, a.startAngle, angles[i], a.clockwise));
            }
        }

        if (test_arcs.length === 0) {
            func_arcs_array.push(clone(a));
        } else {
            test_arcs.sort((arc1, arc2) => arc1.length() - arc2.length());
            for (let i = 0; i < test_arcs.length; i++) {
                const prev_arc = func_arcs_array.length > 0 ? func_arcs_array[func_arcs_array.length - 1] : undefined;
                let new_arc;
                if (prev_arc) {
                    new_arc = Arc(a.pc, a.r, prev_arc.endAngle, test_arcs[i].endAngle, a.clockwise);
                } else {
                    new_arc = Arc(a.pc, a.r, a.startAngle, test_arcs[i].endAngle, a.clockwise);
                }
                if (!EQ_0(new_arc.length())) {
                    func_arcs_array.push(clone(new_arc));
                }
            }
            const prev_arc = func_arcs_array.length > 0 ? func_arcs_array[func_arcs_array.length - 1] : undefined;
            let new_arc;
            if (prev_arc) {
                new_arc = Arc(a.pc, a.r, prev_arc.endAngle, a.endAngle, a.clockwise);
            } else {
                new_arc = Arc(a.pc, a.r, a.startAngle, a.endAngle, a.clockwise);
            }
            if (!EQ_0(new_arc.length()) && !EQ(new_arc.sweep(), 2 * Math.PI)) {
                func_arcs_array.push(clone(new_arc));
            }
        }
        return func_arcs_array;
    }

    return a;
}
