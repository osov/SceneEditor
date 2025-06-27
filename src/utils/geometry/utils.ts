import { DP_TOL, NULL_VALUE, p1, p2, p3, p4, POINT_EMPTY, ShapeNames, TAU, VEC_A, VEC_B, VOID_BOX } from "./const";
import { point2point, point2segment } from "./distance";
import { circle_intersect } from "./intersect";
import { Point, Arc, Vector, Box, Segment, Circle, Line } from "./shapes";
import { AnyShape, I_NULL_VALUE, IArc, IBox, ICircle, ILine, IMatrix, IPoint, ISegment, IVector, PointLike } from "./types";


const tm_trans = vmath.matrix4();
const tm_rot = vmath.matrix4();
const tm = vmath.matrix4();
const tv = vmath.vector4();


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

export function arc_start(a: IArc): IPoint {
    const p = Point(a.pc.x + a.r, a.pc.y);
    rotate(p, a.startAngle, a.pc);
    return p;
}

export function arc_end(a: IArc): IPoint {
    const p = Point(a.pc.x + a.r, a.pc.y);
    rotate(p, a.endAngle, a.pc);
    return p;
}

export function arc_middle(a: IArc) {
    const endAngle = a.clockwise ? a.startAngle + arc_sweep(a) / 2 : a.startAngle - arc_sweep(a) / 2;
    const arc = Arc(a.pc, a.r, a.startAngle, endAngle, a.clockwise);
    return arc_end(arc);
}

export function arc_start_tangent(a: IArc) {
    const start_p = arc_start(a);
    const vx = start_p.x - a.pc.x;
    const vy = start_p.y - a.pc.y;
    const vec = Vector(vx, vy);
    const angle = a.clockwise ? Math.PI / 2 : -Math.PI / 2;
    rotate(vec, angle);
    normalize(vec);
    return vec
}

export function arc_end_tangent(a: IArc) {
    const end_p = arc_end(a);
    const vx = end_p.x - a.pc.x;
    const vy = end_p.y - a.pc.y;
    const vec = Vector(vx, vy);
    const angle = a.clockwise ? -Math.PI / 2 : Math.PI / 2;
    rotate(vec, angle);
    normalize(vec);
    return vec
}

export function segment_start_tangent(s: ISegment) {
    const vec = Vector(s.end.x - s.start.x, s.end.y - s.start.y);
    normalize(vec);
    return vec
}

export function segment_end_tangent(s: ISegment) {
    const vec = Vector(s.start.x - s.end.x, s.start.y - s.end.y);
    normalize(vec);
    return vec
}

export function shape_box<T extends AnyShape>(shape: T): IBox {
    if (shape.name == ShapeNames.Point) {
        const point = shape as IPoint;
        return Box(point.x, point.y, point.x, point.y);
    }

    if (shape.name == ShapeNames.Vector) {
        const vec = shape as IVector;
        return Box(Math.min(0, vec.x), Math.min(0, vec.y), Math.max(0, vec.x), Math.max(0, vec.y));
    }

    if (shape.name == ShapeNames.Box) {
        const box = shape as IBox;
        return Box(box.xmin, box.ymin, box.xmax, box.ymax);
    }

    if (shape.name == ShapeNames.Line) {
        return Box(
            Number.NEGATIVE_INFINITY,
            Number.NEGATIVE_INFINITY,
            Number.POSITIVE_INFINITY,
            Number.POSITIVE_INFINITY,
        );
    }

    if (shape.name == ShapeNames.Segment) {
        const segment = shape as ISegment;
        return Box(
            Math.min(segment.start.x, segment.end.x),
            Math.min(segment.start.y, segment.end.y),
            Math.max(segment.start.x, segment.end.x),
            Math.max(segment.start.y, segment.end.y),
        );
    }

    if (shape.name == ShapeNames.Circle) {
        const circle = shape as ICircle;
        return Box(circle.pc.x - circle.r, circle.pc.y - circle.r, circle.pc.x + circle.r, circle.pc.y + circle.r);
    }

    if (shape.name == ShapeNames.Arc) {
        const arc = shape as IArc;
        const func_arcs = break_arc_to_functional(arc);
        let box = func_arcs.reduce((acc: IBox, arc: IArc) => box_merge(acc, shape_box(arc_start(arc))), Box());
        box = box_merge(box, shape_box(arc_end(arc)));
        return box;
    }
    
    throw new Error('Wrong shape');
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
        const segment = shape as ISegment;
        return shape_length(shape_vector(segment));
    }

    throw new Error('Wrong shape');
}

export function shape_center<T extends AnyShape>(shape: T): IPoint {
    if (shape.name == ShapeNames.Point) {
        const point = shape as IPoint;
        return Point(point.x, point.y);
    }

    if (shape.name == ShapeNames.Box) {
        const box = shape as IBox;
        return Point((box.xmin + box.xmax) / 2, (box.ymin + box.ymax) / 2)
    }

    if (shape.name == ShapeNames.Vector) {
        const vec = shape as IVector;
        return Point(vec.x / 2, vec.y / 2)
    }

    if (shape.name == ShapeNames.Line) {
        const line = shape as ILine;
        return line.pt;
    }

    if (shape.name == ShapeNames.Circle) {
        const circle = shape as ICircle;
        return circle.pc;
    }

    if (shape.name == ShapeNames.Arc) {
        const arc = shape as ICircle;
        return arc.pc;
    }

    if (shape.name == ShapeNames.Segment) {
        const segment = shape as ISegment;
        return Point((segment.start.x + segment.end.x) / 2, (segment.start.y + segment.end.y) / 2);
    }

    throw new Error('Wrong shape');
}

export function shape_contains<T extends AnyShape>(s1: T, s2: AnyShape): boolean {
    if (s1.name == ShapeNames.Point && s2.name == ShapeNames.Point) {
        const point = s1 as IPoint;
        const p = s2 as IPoint;
        return shape_equal_to(point, p);
    }

    if (s1.name == ShapeNames.Box && s2.name == ShapeNames.Point) {
        const box = s1 as IBox;
        const p = s2 as IPoint;
        return p.x >= box.xmin && p.x <= box.xmax && p.y >= box.ymin && p.y <= box.ymax;
    }

    if (s1.name == ShapeNames.Segment && s2.name == ShapeNames.Point) {
        const segment = s1 as ISegment;
        const p = s2 as IPoint;
        return EQ_0(point2segment(p, segment)[0]);
    }

    if (s1.name == ShapeNames.Line && s2.name == ShapeNames.Point) {
        const line = s1 as ILine;
        const p = s2 as IPoint;
        if (shape_equal_to(line.pt, p)) {
            return true;
        }
        const vec = Vector(p.x - line.pt.x, p.y - line.pt.y);
        return EQ_0(dot(line.norm, vec));
    }

    if (s1.name == ShapeNames.Arc && s2.name == ShapeNames.Point) {
        const arc = s1 as IArc;
        const p = s2 as IPoint;
        if (!EQ(point2point(arc.pc, p)[0], arc.r)) return false;
        if (shape_equal_to(p, arc_start(arc))) return true;
        const angle = vector_slope(Vector(p.x - arc.pc.x, p.y - arc.pc.y));
        const test_arc = Arc(arc.pc, arc.r, arc.startAngle, angle, arc.clockwise);
        return LE(shape_length(test_arc), shape_length(arc));
    }

    if (s1.name == ShapeNames.Circle) {
        const circle = s1 as ICircle;
        if (s2.name == ShapeNames.Point) {
            const shape = s2 as IPoint;
            return LE(point2point(shape, circle.pc)[0], circle.r);
        }

        if (s2.name == ShapeNames.Segment) {
            const shape = s2 as ISegment;
            return (
                LE(point2point(shape.start, circle.pc)[0], circle.r) &&
                LE(point2point(shape.end, circle.pc)[0], circle.r)
            );
        }

        if (s2.name == ShapeNames.Arc) {
            const shape = s2 as IArc;
            return (
                circle_intersect(circle, shape).length === 0 &&
                LE(point2point(arc_start(shape), circle.pc)[0], circle.r) &&
                LE(point2point(arc_end(shape), circle.pc)[0], circle.r)
            );
        }

        if (s2.name == ShapeNames.Circle) {
            const shape = s2 as ICircle;
            return (
                circle_intersect(circle, shape).length === 0 &&
                LE(shape.r, circle.r) &&
                LE(point2point(shape.pc, circle.pc)[0], circle.r)
            );
        }
    }
    throw new Error('Wrong shape');
}

export function shape_equal_to<T extends AnyShape>(s1: T, s2: T): boolean {
    if (s1.name == ShapeNames.Point && s2.name == ShapeNames.Point) {
        const p1 = s1 as IPoint;
        const p2 = s2 as IPoint;
        return EQ(p1.x, p2.x) && EQ(p1.y, p2.y);
    }
    if (s1.name == ShapeNames.Vector && s2.name == ShapeNames.Vector) {
        const v1 = s1 as IVector;
        const v2 = s2 as IVector;
        return EQ(v1.x, v2.x) && EQ(v1.y, v2.y);
    }
    if (s1.name == ShapeNames.Box && s2.name == ShapeNames.Box) {
        const b1 = s1 as IBox;
        const b2 = s2 as IBox;
        const low1 = Point(b1.xmin, b1.ymin);
        const low2 = Point(b2.xmin, b2.ymin);
        const high1 = Point(b1.xmax, b1.ymax);
        const high2 = Point(b2.xmax, b2.ymax);
        return shape_equal_to(low1, low2) && shape_equal_to(high1, high2);
    }
    if (s1.name == ShapeNames.Segment && s2.name == ShapeNames.Segment) {
        const n1 = s1 as ISegment;
        const n2 = s2 as ISegment;
        return shape_equal_to(n1.start, n2.start) && shape_equal_to(n1.end, n2.end);
    }
    throw new Error('Wrong shape');
}

export function clone<T extends AnyShape>(shape: T): T {
    if (shape.name == ShapeNames.Vector) {
        const vector = shape as IVector;
        return Vector(vector.x, vector.y);
    } 

    if (shape.name == ShapeNames.Point) {
        const point = shape as IPoint;
        return Point(point.x, point.y); 
    }

    if (shape.name == ShapeNames.Segment) {
        const segment = shape as ISegment;
        return Segment(clone(segment.start), clone(segment.end));
    }   

    if (shape.name == ShapeNames.Line) {
        const line = shape as ILine;
        return Line(clone(line.pt), clone(line.norm));
    }  

    if (shape.name == ShapeNames.Circle) {
        const circle = shape as ICircle;
        return Circle(clone(circle.pc), circle.r);
    } 

    if (shape.name == ShapeNames.Box) {
        const box = shape as IBox;
        return Box(box.xmin, box.ymin, box.xmax, box.ymax);
    } 

    if (shape.name == ShapeNames.Arc) {
        const arc = shape as IArc;
        return Arc(clone(arc.pc), arc.r, arc.startAngle, arc.endAngle, arc.clockwise);
    } 

    throw new Error('Wrong shape');
}

export function rewrite<T extends AnyShape>(shape: T, data: T) {
    if (shape.name == ShapeNames.Vector || shape.name == ShapeNames.Point) {
        let v = shape as IVector | IPoint;
        let v_data = data as IVector | IPoint;
        v.x = v_data.x;
        v.y = v_data.y;
    }

    if (shape.name == ShapeNames.Box) {
        let b = shape as IBox;
        let b_data = data as IBox;
        b.xmax = b_data.xmax;
        b.xmin = b_data.xmin;
        b.ymax = b_data.ymax;
        b.ymin = b_data.ymin;
    }

    if (shape.name == ShapeNames.Line) {
        let l = shape as ILine;
        let l_data = data as ILine;
        rewrite(l.pt, l_data.pt);
        rewrite(l.norm, l_data.norm);
    }

    if (shape.name == ShapeNames.Segment) {
        let s = shape as ISegment;
        let s_data = data as ISegment;
        rewrite(s.start, s_data.start);
        rewrite(s.end, s_data.end);
    }

    if (shape.name == ShapeNames.Circle) {
        let c = shape as ICircle;
        let c_data = data as ICircle;
        rewrite(c.pc, c_data.pc);
        c.r = c_data.r;
    }

    if (shape.name == ShapeNames.Arc) {
        let a = shape as IArc;
        let a_data = data as IArc;
        rewrite(a.pc, a_data.pc);
        a.clockwise = a_data.clockwise;
        a.startAngle = a_data.startAngle;
        a.endAngle = a_data.endAngle;
        a.r = a_data.r;
    }
}

export function rotate<T extends AnyShape>(shape: T, angle: number, _center: PointLike | undefined = undefined) {
    const center = (_center) ? _center : clone(POINT_EMPTY);
    if (shape.name == ShapeNames.Point) {
        const p = shape as IPoint;
        tv.x = p.x; tv.y = p.y; tv.w = 1;
        xmath.matrix_translation(tm_trans, {x: center.x, y: center.y, z: 0});
        xmath.matrix_rotation_z(tm_rot, angle);
        xmath.matrix(tm, vmath.mult_matrices(tm_trans, tm_rot));
        xmath.matrix_translation(tm_trans, {x: -center.x, y: -center.y, z: 0});
        xmath.matrix(tm, vmath.mult_matrices(tm, tm_trans));
        const tmp = vmath.matrix_mult_vector(tm, tv);      
        p.x = tmp.x;
        p.y = tmp.y;
    }

    if (shape.name == ShapeNames.Vector) {
        const v = shape as IVector;
        tv.x = v.x; tv.y = v.y; tv.w = 1;
        xmath.matrix_rotation_z(tm_rot, angle);
        const tmp = vmath.matrix_mult_vector(tm_rot, tv);
        v.x = tmp.x;
        v.y = tmp.y;
    } 

    if (shape.name == ShapeNames.Segment) {
        const s = shape as ISegment;
        rotate(s.start, angle, center);
        rotate(s.end, angle, center);
    }

    if (shape.name == ShapeNames.Line) {
        const l = shape as ILine;
        rotate(l.pt, angle, center);
        rotate(l.norm, angle);
    } 

    if (shape.name == ShapeNames.Box) {
        // Не используем в текущей логике
        throw new Error('Box rotate unimplemented');
    }

    if (shape.name == ShapeNames.Circle) {
        // Не используем в текущей логике
        throw new Error('Circle rotate unimplemented');
    } 

    if (shape.name == ShapeNames.Arc) {
        // Не используем в текущей логике
        throw new Error('Arc rotate unimplemented');
    } 
}

export function rotate_vec_90CW(v: IVector) {
    let t_x = v.x;
    let t_y = v.y;
    v.x = -t_y;
    v.y = t_x;
}

export function rotate_vec_90CCW(v: IVector) {
    let t_x = v.x;
    let t_y = v.y;
    v.x = t_y;
    v.y = -t_x;
}

export function invert_vec(v: IVector) {
    const t_x = v.x;
    const t_y = v.y;
    v.x = -t_x;
    v.y = -t_y;
}

export function translate<T extends AnyShape>(shape: T, x: number, y: number) {
    if (shape.name == ShapeNames.Point) {
        let p = shape as IPoint;
        p.x = p.x + x;
        p.y = p.y + y;
    }
    if (shape.name == ShapeNames.Segment) {
        let s = shape as ISegment;
        translate(s.start, x, y);
        translate(s.end, x, y);
    }
    if (shape.name == ShapeNames.Line) {
        let l = shape as ILine;
        translate(l.pt, x, y);
    } 
    if (shape.name == ShapeNames.Box) {
        // Не используем в текущей логике
        throw new Error('Box traanslate unimplemented');
    } 
    if (shape.name == ShapeNames.Circle) {
        let c = shape as ICircle;
        translate(c.pc, x, y);
    }
    if (shape.name == ShapeNames.Arc) {
        // Не используем в текущей логике
        throw new Error('Arc traanslate unimplemented');
    } 
}

export function transform<T extends AnyShape>(shape: T, m: IMatrix) {
    if (shape.name == ShapeNames.Point) {
        let p = shape as IPoint;
        const tmp = vmath.matrix_mult_vector(m.matrix, vmath.vector4(p.x, p.y, 0, 1));
        p.x = tmp.x;
        p.y = tmp.y;
    }
    if (shape.name == ShapeNames.Segment) {
        let s = shape as ISegment;
        transform(s.start, m);
        transform(s.end, m);
    }
    if (shape.name == ShapeNames.Line) {
        let l = shape as ILine;
        transform(l.pt, m);
    } 
    if (shape.name == ShapeNames.Box) {
        let b = shape as IBox;
        const points = box_to_points(b);
        points.map(p => transform(p, m));
        rewrite(b, VOID_BOX);
        for (const pt of points) {
            merge_boxes_in_place(b, shape_box(pt));
        }
    }
    if (shape.name == ShapeNames.Circle) {
        let c = shape as ICircle;
        transform(c.pc, m);
    }
    if (shape.name == ShapeNames.Arc) {
        // Не используем в текущей логике
        throw new Error('Arc transform unimplemented');
    } 
}

function merge_boxes_in_place(box_in_place: IBox, box: IBox) {
    box_in_place.xmin = Math.min(box_in_place.xmin, box.xmin);
    box_in_place.xmax = Math.min(box_in_place.xmax, box.xmax);
    box_in_place.ymin = Math.min(box_in_place.ymin, box.ymin);
    box_in_place.ymax = Math.min(box_in_place.ymax, box.ymax);
    return box_in_place
}

export function split<T extends AnyShape>(shape: T, pt: IPoint): (T | I_NULL_VALUE)[] {
    if (shape.name == ShapeNames.Arc) {
        const a = shape as IArc;
        if (shape_equal_to(arc_start(a), pt)) return [NULL_VALUE, clone(a)];
        if (shape_equal_to(arc_end(a), pt)) return [clone(a), NULL_VALUE];
        const angle = vector_slope(Vector(pt.x - a.pc.x, pt.y - a.pc.y));
        return [
            Arc(a.pc, a.r, a.startAngle, angle, a.clockwise),
            Arc(a.pc, a.r, angle, a.endAngle, a.clockwise),
        ];
    }

    if (shape.name == ShapeNames.Segment) {
        const s = shape as ISegment;
        if (shape_equal_to(s.start, pt)) return [NULL_VALUE, clone(s)];
        if (shape_equal_to(s.end, pt)) return [clone(s), NULL_VALUE];
        return [Segment(s.start, pt), Segment(pt, s.end)];
    }

    throw new Error('Wrong shape');
}

export function split_at_length<T extends AnyShape>(shape: T, at_length: number): (T | I_NULL_VALUE)[] {
    if (shape.name == ShapeNames.Arc) {
        const a = shape as IArc;
        if (EQ_0(at_length)) return [NULL_VALUE, clone(a)];
        if (EQ(at_length, shape_length(a))) return [clone(a), NULL_VALUE];
        const angle = a.startAngle + (a.clockwise ? +1 : -1) * arc_sweep(a) * (at_length / shape_length(a));
        return [
            Arc(a.pc, a.r, a.startAngle, angle, a.clockwise),
            Arc(a.pc, a.r, angle, a.endAngle, a.clockwise),
        ];
    }

    if (shape.name == ShapeNames.Segment) {
        const s = shape as ISegment;
        if (EQ_0(at_length)) return [NULL_VALUE, clone(s)];
        if (EQ(at_length, shape_length(s))) return [clone(s), NULL_VALUE];
        const point = point_at_length(s, at_length);
        return [Segment(s.start, point as IPoint), Segment(point as IPoint, s.end)];
    }

    throw new Error('Wrong shape');
}

export function point_at_length(shape: IArc | ISegment, at_length: number) {
    if (shape.name == ShapeNames.Arc) {
        const a = shape as IArc;
        if (at_length > shape_length(a) || at_length < 0) return NULL_VALUE;
        if (at_length === 0) return arc_start(a);
        if (at_length === shape_length(a)) return arc_end(a);
        const factor = at_length / shape_length(a);
        const endAngle = a.clockwise ? a.startAngle + arc_sweep(a) * factor : a.startAngle - arc_sweep(a) * factor;
        const arc = Arc(a.pc, a.r, a.startAngle, endAngle, a.clockwise);
        return arc_end(arc);
    }

    if (shape.name == ShapeNames.Segment) {
        const s = shape as ISegment;
        if (at_length <= 0) return s.start;
        if (at_length >= shape_length(s)) return s.end;
        const factor = at_length / shape_length(s);
        return Point(
            (s.end.x - s.start.x) * factor + s.start.x,
            (s.end.y - s.start.y) * factor + s.start.y,
        );
    }

    throw new Error('Wrong shape');
}

function break_arc_to_functional(a: IArc) {
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
    translate(p1, a.r, 0);
    translate(p2, 0, a.r);
    translate(p3, -a.r, 0);
    translate(p4, 0, -a.r);
    const pts = [p1, p2, p3, p4];
    const test_arcs: IArc[] = [];
    for (let i = 0; i < 4; i++) {
        if (point_on(pts[i], a)) {
            test_arcs.push(Arc(a.pc, a.r, a.startAngle, angles[i], a.clockwise));
        }
    }

    if (test_arcs.length === 0) {
        func_arcs_array.push(clone(a));
    } else {
        test_arcs.sort((arc1, arc2) => shape_length(arc1) - shape_length(arc2));
        for (let i = 0; i < test_arcs.length; i++) {
            const prev_arc = func_arcs_array.length > 0 ? func_arcs_array[func_arcs_array.length - 1] : undefined;
            let new_arc;
            if (prev_arc) {
                new_arc = Arc(a.pc, a.r, prev_arc.endAngle, test_arcs[i].endAngle, a.clockwise);
            } else {
                new_arc = Arc(a.pc, a.r, a.startAngle, test_arcs[i].endAngle, a.clockwise);
            }
            if (!EQ_0(shape_length(new_arc))) {
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
        if (!EQ_0(shape_length(new_arc)) && !EQ(arc_sweep(new_arc), 2 * Math.PI)) {
            func_arcs_array.push(clone(new_arc));
        }
    }
    return func_arcs_array;
}

export function mult_matrix(m_in_place: IMatrix, m: IMatrix) {
    m_in_place.matrix = vmath.mult_matrices(m_in_place.matrix, m.matrix);
}

export function box_less_than(b1: IBox, b2: IBox) {
    const low1 = Point(b1.xmin, b1.ymin);
    const low2 = Point(b2.xmin, b2.ymin);
    const high1 = Point(b1.xmax, b1.ymax);
    const high2 = Point(b2.xmax, b2.ymax);

    if (point_less_than(low1, low2)) return true;
    if (shape_equal_to(low1, low2) && point_less_than(high1, high2)) return true;
    return false;
}

export function box_merge(box: IBox, otherIBox: IBox) {
    return Box(
        Math.min(box.xmin, otherIBox.xmin),
        Math.min(box.ymin, otherIBox.ymin),
        Math.max(box.xmax, otherIBox.xmax),
        Math.max(box.ymax, otherIBox.ymax),
    );
}

export function box_to_points(box: IBox) {
    return [
        Point(box.xmin, box.ymin),
        Point(box.xmax, box.ymin),
        Point(box.xmax, box.ymax),
        Point(box.xmin, box.ymax),
    ];
}

export function box_to_segments(box: IBox) {
    const pts = box_to_points(box);
    return [
        Segment(pts[0], pts[1]),
        Segment(pts[1], pts[2]),
        Segment(pts[2], pts[3]),
        Segment(pts[3], pts[0]),
    ];
}

export function point_less_than(p1: IPoint, p2: IPoint) {
    if (LT(p1.y, p2.y)) return true;
    if (EQ(p1.y, p2.y) && LT(p1.x, p2.x)) return true;
    return false;
}

export function point_left_to(point: IPoint, line: ILine) {
    const vec = vector_from_points(line.pt, point);
    const onLeftSemiPlane = GT(dot(vec, line.norm), 0);
    return onLeftSemiPlane;
}

export function point_on(point: IPoint, _shape: AnyShape): boolean {
    if (_shape.name == ShapeNames.Point) {
        const shape = _shape as IPoint;
        return shape_equal_to(point, shape);
    }
    return shape_contains(_shape, point);
}

export function line_standard(l: ILine) {
    const A = l.norm.x;
    const B = l.norm.y;
    VEC_A.x = l.pt.x;
    VEC_A.y = l.pt.y;
    const C = dot(l.norm, VEC_A);
    return [A, B, C] as const;
};

export function line_coord(l: ILine, pt: IPoint) {
    return cross(Vector(pt.x, pt.y), l.norm);
}

export function circle_to_arc(c: ICircle, counterclockwise = true) {
    return Arc(clone(c.pc), c.r, Math.PI, -Math.PI, counterclockwise);
}

export function parallel_to(l: ILine, other_line: ILine) {
    return EQ_0(cross(l.norm, other_line.norm));
}

export function incident_To(l: ILine, other_line: ILine) {
    return parallel_to(l, other_line) && point_on(l.pt, other_line);
}

export function shape_vector(shape: ILine | ISegment): IVector {
    if (shape.name == ShapeNames.Segment) {
        const s = shape as ISegment;
        return Vector(s.end.x - s.start.x, s.end.y - s.start.y);
    }
    if (shape.name == ShapeNames.Line) {
        const l = shape as ILine;
        return Vector(l.norm.y, -l.norm.x);        
    }
    throw new Error('Wrong shape');
};


export function reverse(shape: IArc | ISegment) {
    if (shape.name == ShapeNames.Segment) {
        const s = shape as ISegment;
        const t_end = s.end;
        const t_start = s.start;
        s.start = t_end;
        s.end = t_start;
    }
    if (shape.name == ShapeNames.Arc) {
        const a = shape as IArc;
        a.clockwise = !a.clockwise;
    }
}

export function determinant(m: IMatrix) {
    const g = 0;
    const h = 0;
    const i = 1;
    return m.a * (m.d * i - m.ty * h) - m.c * (m.b * i - m.ty * g) + m.tx * (m.b * h - m.d * g);
}

export function dot(v1: IVector, v2: IVector | PointLike) {
    return v1.x * v2.x + v1.y * v2.y;
}

export function cross(v1: IVector, v2: IVector) {
    return v1.x * v2.y - v1.y * v2.x;
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

/**
 * Return angle between this vector and other vector. <br/>
 * Angle is measured from 0 to 2*PI in the counterclockwise direction
 * from current vector to  another.
 */
export function angleTo(v1: IVector, v2: IVector) {
    VEC_A.x = v1.x;
    VEC_A.y = v1.y;
    normalize(VEC_A);
    VEC_B.x = v2.x;
    VEC_B.y = v2.y;
    normalize(VEC_B);
    let angle = Math.atan2(cross(VEC_A, VEC_B), dot(VEC_A, VEC_B));
    if (angle < 0) angle += TAU;
    return angle;
}

export function vector_projection(v1: IVector, v2: IVector) {
    VEC_A.x = v2.x;
    VEC_A.y = v2.y;
    normalize(VEC_A);
    const d = dot(v1, VEC_A);
    multiply(VEC_A, d)
    return clone(VEC_A);
}

export function point_projection(point: IPoint, line: ILine) {
    // ! В параметр line может подаваться константа LINE_A, не перезаписывать её пока используем line
    if (shape_equal_to(point, line.pt))
        // this point equal to line anchor point
        return clone(point);
    const vec = Vector(line.pt.x - point.x, line.pt.y - point.y);
    if (EQ_0(cross(vec, line.norm)))
        // vector to point from anchor point collinear to normal vector
        return clone(line.pt);

    const dist = dot(vec, line.norm); // signed distance
    const proj_vec = clone(line.norm);
    multiply(proj_vec, dist);
    const _p = clone(point);
    translate(_p, proj_vec.x, proj_vec.y)
    return _p;
}

export function ptInIntPoints(new_pt: IPoint, ip: IPoint[]) {
    return ip.some((pt) => shape_equal_to(pt, new_pt));
}

export function isPointInSegmentBox(point: IPoint, segment: ISegment) {
    const box = shape_box(segment);
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
    if (shape_equal_to(pt1, pt2)) {
        throw Error('wrong parameters');
    }
    const vx = pt2.x - pt1.x;
    const vy = pt2.y - pt1.y;
    const vec = Vector(vx, vy);
    normalize(vec);
    rotate_vec_90CW(vec);
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
    let a = angleTo(v1, v2);
    if (a > Math.PI) a = a - 2 * Math.PI;
    return a;
}

export function vector_slope(v: IVector) {
    let angle = Math.atan2(v.y, v.x);
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


