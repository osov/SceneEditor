import { DP_TOL, NULL_VALUE, ShapeNames, TAU } from "./const";
import { LINE_A, p1, p2, p3, p4, VEC_A, VEC_B, VEC_C, VOID_BOX } from "./helpers";
import { Point, Arc, Vector, Box, Segment, Circle, Line } from "./shapes";
import { AnyShape, I_NULL_VALUE, IArc, IBox, ICircle, ILine, IPoint, ISegment, IVector, PointLike } from "./types";
import { arc_sweep, normalize, EQ_0, EQ, vector_slope, LE, shape_length, LT, GT, multiply, GE } from "./utils";


const tm_trans = vmath.matrix4();
const tm_trans2 = vmath.matrix4();
const tm_rot = vmath.matrix4();
const tm = vmath.matrix4();
const tv = vmath.vector4();


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
    return vec;
}

export function arc_end_tangent(a: IArc) {
    const end_p = arc_end(a);
    const vx = end_p.x - a.pc.x;
    const vy = end_p.y - a.pc.y;
    const vec = Vector(vx, vy);
    const angle = a.clockwise ? -Math.PI / 2 : Math.PI / 2;
    rotate(vec, angle);
    normalize(vec);
    return vec;
}

export function segment_start_tangent(s: ISegment) {
    const vec = Vector(s.end.x - s.start.x, s.end.y - s.start.y);
    normalize(vec);
    return vec;
}

export function segment_end_tangent(s: ISegment) {
    const vec = Vector(s.start.x - s.end.x, s.start.y - s.end.y);
    normalize(vec);
    return vec;
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

export function shape_center<T extends AnyShape>(shape: T): IPoint {
    if (shape.name == ShapeNames.Point) {
        const point = shape as IPoint;
        return Point(point.x, point.y);
    }

    if (shape.name == ShapeNames.Box) {
        const box = shape as IBox;
        return Point((box.xmin + box.xmax) / 2, (box.ymin + box.ymax) / 2);
    }

    if (shape.name == ShapeNames.Vector) {
        const vec = shape as IVector;
        return Point(vec.x / 2, vec.y / 2);
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
        return Vector(vector.x, vector.y) as T;
    } 

    if (shape.name == ShapeNames.Point) {
        const point = shape as IPoint;
        return Point(point.x, point.y) as T; 
    }

    if (shape.name == ShapeNames.Segment) {
        const segment = shape as ISegment;
        return Segment(clone(segment.start), clone(segment.end)) as T;
    }   

    if (shape.name == ShapeNames.Line) {
        const line = shape as ILine;
        return Line(clone(line.pt), clone(line.norm)) as T;
    }  

    if (shape.name == ShapeNames.Circle) {
        const circle = shape as ICircle;
        return Circle(clone(circle.pc), circle.r) as T;
    } 

    if (shape.name == ShapeNames.Box) {
        const box = shape as IBox;
        return Box(box.xmin, box.ymin, box.xmax, box.ymax) as T;
    } 

    if (shape.name == ShapeNames.Arc) {
        const arc = shape as IArc;
        return Arc(clone(arc.pc), arc.r, arc.startAngle, arc.endAngle, arc.clockwise) as T;
    } 

    throw new Error('Wrong shape');
}

export function rewrite<T extends AnyShape>(shape: T, data: T) {
    if (shape.name == ShapeNames.Vector || shape.name == ShapeNames.Point) {
        const v = shape as IVector | IPoint;
        const v_data = data as IVector | IPoint;
        v.x = v_data.x;
        v.y = v_data.y;
    }

    else if (shape.name == ShapeNames.Box) {
        const b = shape as IBox;
        const b_data = data as IBox;
        b.xmax = b_data.xmax;
        b.xmin = b_data.xmin;
        b.ymax = b_data.ymax;
        b.ymin = b_data.ymin;
    }

    else if (shape.name == ShapeNames.Line) {
        const l = shape as ILine;
        const l_data = data as ILine;
        rewrite(l.pt, l_data.pt);
        rewrite(l.norm, l_data.norm);
    }

    else if (shape.name == ShapeNames.Segment) {
        const s = shape as ISegment;
        const s_data = data as ISegment;
        rewrite(s.start, s_data.start);
        rewrite(s.end, s_data.end);
    }

    else if (shape.name == ShapeNames.Circle) {
        const c = shape as ICircle;
        const c_data = data as ICircle;
        rewrite(c.pc, c_data.pc);
        c.r = c_data.r;
    }

    else if (shape.name == ShapeNames.Arc) {
        const a = shape as IArc;
        const a_data = data as IArc;
        rewrite(a.pc, a_data.pc);
        a.clockwise = a_data.clockwise;
        a.startAngle = a_data.startAngle;
        a.endAngle = a_data.endAngle;
        a.r = a_data.r;
    }
}

export function rotate_point_matrix(p: IPoint, angle: number, center: PointLike) {
    tv.x = p.x; tv.y = p.y; tv.w = 1;
    xmath.matrix_translation(tm_trans, vmath.vector3(center.x, center.y, 0));
    xmath.matrix_rotation_z(tm_rot, angle);
    let tm = vmath.mult_matrices(tm_trans, tm_rot);
    xmath.matrix_translation(tm_trans, vmath.vector3(-center.x, -center.y, 0)); 
    // xmath.matrix(tm, vmath.mult_matrices(tm, tm_trans)); 
    tm = vmath.mult_matrices(tm, tm_trans);
    const tmp = vmath.matrix_mult_vector(tm, tv);   
    p.x = tmp.x;
    p.y = tmp.y;
}

export function rotate_point_simple(p: IPoint, angle: number, center: PointLike) {
    const c = math.cos(angle), s = math.sin(angle);
    const x = p.x - center.x;
    const y = p.y - center.y;
    p.x = x * c - y * s + center.x;
    p.y = x * s + y * c + center.y;
}

export function rotate<T extends AnyShape>(shape: T, angle: number, _center: PointLike | undefined = undefined) {
    const center = (_center) ? _center : Point();
    if (shape.name == ShapeNames.Point) {
        const p = shape as IPoint;
        // rotate_point_matrix(p, angle, center);
        rotate_point_simple(p, angle, center);
    }

    else if (shape.name == ShapeNames.Vector) {
        const v = shape as IVector;
        const c = math.cos(angle), s = math.sin(angle);
        const x = v.x;
        const y = v.y;
        v.x = x * c - y * s;
        v.y = x * s + y * c;
    } 

    else if (shape.name == ShapeNames.Segment) {
        const s = shape as ISegment;
        rotate(s.start, angle, center);
        rotate(s.end, angle, center);
    }

    else if (shape.name == ShapeNames.Line) {
        const l = shape as ILine;
        rotate(l.pt, angle, center);
        rotate(l.norm, angle);
    } 

    else if (shape.name == ShapeNames.Box) {
        // Не используем в текущей логике
        throw new Error('Box rotate unimplemented');
    }

    else if (shape.name == ShapeNames.Circle) {
        // Не используем в текущей логике
        throw new Error('Circle rotate unimplemented');
    } 

    else if (shape.name == ShapeNames.Arc) {
        // Не используем в текущей логике
        throw new Error('Arc rotate unimplemented');
    } 
}

export function rotate_vec_90CW(v: IVector) {
    const t_x = v.x;
    const t_y = v.y;
    v.x = -t_y;
    v.y = t_x;
}

export function rotate_vec_90CCW(v: IVector) {
    const t_x = v.x;
    const t_y = v.y;
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
        const p = shape as IPoint;
        p.x = p.x + x;
        p.y = p.y + y;
    }
    else if (shape.name == ShapeNames.Segment) {
        const s = shape as ISegment;
        translate(s.start, x, y);
        translate(s.end, x, y);
    }
    else if (shape.name == ShapeNames.Line) {
        const l = shape as ILine;
        translate(l.pt, x, y);
    } 
    else if (shape.name == ShapeNames.Box) {
        // Не используем в текущей логике
        throw new Error('Box traanslate unimplemented');
    } 
    else if (shape.name == ShapeNames.Circle) {
        const c = shape as ICircle;
        translate(c.pc, x, y);
    }
    else if (shape.name == ShapeNames.Arc) {
        // Не используем в текущей логике
        throw new Error('Arc traanslate unimplemented');
    } 
}

export function transform<T extends AnyShape>(shape: T, m: vmath.matrix4) {
    if (shape.name == ShapeNames.Point) {
        const p = shape as IPoint;
        const tmp = vmath.matrix_mult_vector(m, vmath.vector4(p.x, p.y, 0, 1));
        p.x = tmp.x;
        p.y = tmp.y;
    }
    else if (shape.name == ShapeNames.Segment) {
        const s = shape as ISegment;
        transform(s.start, m);
        transform(s.end, m);
    }
    else if (shape.name == ShapeNames.Line) {
        const l = shape as ILine;
        transform(l.pt, m);
    } 
    else if (shape.name == ShapeNames.Box) {
        const b = shape as IBox;
        const points = box_to_points(b);
        points.map(p => transform(p, m));
        rewrite(b, VOID_BOX);
        for (const pt of points) {
            merge_boxes_in_place(b, shape_box(pt));
        }
    }
    else if (shape.name == ShapeNames.Circle) {
        const c = shape as ICircle;
        transform(c.pc, m);
    }
    else if (shape.name == ShapeNames.Arc) {
        // Не используем в текущей логике
        throw new Error('Arc transform unimplemented');
    } 
}

function merge_boxes_in_place(box_in_place: IBox, box: IBox) {
    box_in_place.xmin = Math.min(box_in_place.xmin, box.xmin);
    box_in_place.xmax = Math.min(box_in_place.xmax, box.xmax);
    box_in_place.ymin = Math.min(box_in_place.ymin, box.ymin);
    box_in_place.ymax = Math.min(box_in_place.ymax, box.ymax);
    return box_in_place;
}

export function split<T extends AnyShape>(shape: T, pt: IPoint): (T | I_NULL_VALUE)[] {
    if (shape.name == ShapeNames.Arc) {
        const a = shape as IArc;
        if (shape_equal_to(arc_start(a), pt)) return [NULL_VALUE, clone(a) as T];
        if (shape_equal_to(arc_end(a), pt)) return [clone(a) as T, NULL_VALUE];
        const angle = vector_slope(Vector(pt.x - a.pc.x, pt.y - a.pc.y));
        return [
            Arc(a.pc, a.r, a.startAngle, angle, a.clockwise) as T,
            Arc(a.pc, a.r, angle, a.endAngle, a.clockwise) as T,
        ];
    }

    if (shape.name == ShapeNames.Segment) {
        const s = shape as ISegment;
        if (shape_equal_to(s.start, pt)) return [NULL_VALUE, clone(s) as T];
        if (shape_equal_to(s.end, pt)) return [clone(s) as T, NULL_VALUE];
        return [Segment(s.start, pt) as T, Segment(pt, s.end) as T];
    }

    throw new Error('Wrong shape');
}

export function split_at_length<T extends AnyShape>(shape: T, at_length: number): (T | I_NULL_VALUE)[] {
    if (shape.name == ShapeNames.Arc) {
        const a = shape as IArc;
        if (EQ_0(at_length)) return [NULL_VALUE, clone(a) as T];
        if (EQ(at_length, shape_length(a))) return [clone(a) as T, NULL_VALUE];
        const angle = a.startAngle + (a.clockwise ? +1 : -1) * arc_sweep(a) * (at_length / shape_length(a));
        return [
            Arc(a.pc, a.r, a.startAngle, angle, a.clockwise) as T,
            Arc(a.pc, a.r, angle, a.endAngle, a.clockwise) as T,
        ];
    }

    if (shape.name == ShapeNames.Segment) {
        const s = shape as ISegment;
        if (EQ_0(at_length)) return [NULL_VALUE, clone(s) as T];
        if (EQ(at_length, shape_length(s))) return [clone(s) as T, NULL_VALUE];
        const point = point_at_length(s, at_length);
        return [Segment(s.start, point as IPoint) as T, Segment(point as IPoint, s.end) as T];
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
}

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
}


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

export function dot(v1: IVector, v2: IVector | PointLike) {
    return v1.x * v2.x + v1.y * v2.y;
}

export function cross(v1: IVector, v2: IVector) {
    return v1.x * v2.y - v1.y * v2.x;
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
    multiply(VEC_A, d);
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
    translate(_p, proj_vec.x, proj_vec.y);
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

// intersect funcs


export function intersect(s1: AnyShape, s2: AnyShape): IPoint[] {
    if (s1.name == ShapeNames.Line) {
        const l = s1 as ILine;
        return line_intersect(l, s2);
    }

    if (s1.name == ShapeNames.Segment) {
        const s = s1 as ISegment;
        return segment_intersect(s, s2);
    }

    if (s1.name == ShapeNames.Circle) {
        const c = s1 as ICircle;
        return circle_intersect(c, s2);
    }

    if (s1.name == ShapeNames.Arc) {
        const a = s1 as IArc;
        return arc_intersect(a, s2);
    }

    throw new Error('wrong operation');
}

export function line_intersect(l: ILine, _shape: AnyShape): IPoint[] {
    if (_shape.name == ShapeNames.Point) {
        const point = _shape as IPoint;
        return shape_contains(l, point) ? [point] : [];
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

export function segment_intersect(s: ISegment, _shape: AnyShape): IPoint[] {
    if (_shape.name == ShapeNames.Point) {
        const point = _shape as IPoint;
        return shape_contains(s, point) ? [point] : [];
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

export function circle_intersect(c: ICircle, _shape: AnyShape): IPoint[] {
    if (_shape.name == ShapeNames.Point) {
        const shape = _shape as IPoint;
        return shape_contains(c, shape) ? [shape] : [];
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

export function arc_intersect(a: IArc, _shape: AnyShape) {
    if (_shape.name == ShapeNames.Point) {
        const shape = _shape as IPoint;
        return shape_contains(a, shape) ? [shape] : [];
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

export function intersectBox2Box(b1: IBox, b2: IBox) {
    return !(
        b1.xmax < b2.xmin || b1.xmin > b2.xmax || b1.ymax < b2.ymin || b1.ymin > b2.ymax
    );
}

export function intersectLine2Line(line1: ILine, line2: ILine): IPoint[] {
    const ips: IPoint[] = [];
    const [A1, B1, C1] = line_standard(line1);
    const [A2, B2, C2] = line_standard(line2);
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

export function intersectLine2Circle(line: ILine, circle: ICircle): IPoint[] {
    const ips: IPoint[] = [];
    const prj = point_projection(circle.pc, line);
    const dist = point2point(circle.pc, prj)![0];

    if (EQ(dist, circle.r)) {
        ips.push(prj);
    } 
    else if (LT(dist, circle.r)) {
        const delta = Math.sqrt(circle.r * circle.r - dist * dist);
        let pt: IPoint;

        const v_trans = clone(line.norm);
        rotate_vec_90CW(v_trans);
        multiply(v_trans, delta);
        pt = clone(prj);
        translate(pt, v_trans.x, v_trans.y);
        ips.push(pt);

        invert_vec(v_trans);
        pt = prj;
        translate(pt, v_trans.x, v_trans.y);
        ips.push(pt);
    }
    return ips;
}

export function intersectLine2Box(line: ILine, box: IBox): IPoint[] {
    const ips: IPoint[] = [];
    for (const seg of box_to_segments(box)) {
        const ips_tmp = intersectSegment2Line(seg, line);
        for (const pt of ips_tmp) {
            if (!ptInIntPoints(pt, ips)) {
                ips.push(pt);
            }
        }
    }
    return ips;
}


export function intersectSegment2Line(seg: ISegment, line: ILine): IPoint[] {
    const ips: IPoint[] = [];

    if (point_on(seg.start, line)) {
        ips.push(clone(seg.start));
    }
    if (point_on(seg.end, line) && !EQ_0(shape_length(seg))) {
        ips.push(clone(seg.end));
    }
    if (ips.length > 0) {
        return ips;
    }
    if (EQ_0(shape_length(seg))) {
        return ips;
    }
    if ((point_left_to(seg.start, line) && point_left_to(seg.end, line)) || (!point_left_to(seg.start, line) && !point_left_to(seg.end, line))) {
        return ips;
    }
    LINE_A.pt.x = seg.start.x;
    LINE_A.pt.y = seg.start.y;
    LINE_A.norm = points2norm(seg.start, seg.end);
    return intersectLine2Line(LINE_A, line);
}

export function intersectSegment2Segment(seg1: ISegment, seg2: ISegment): IPoint[] {
    const ips: IPoint[] = [];

    if (!intersectBox2Box(shape_box(seg1), shape_box(seg2))) {
        return ips;
    }

    if (EQ_0(shape_length(seg1))) {
        if (point_on(seg1.start, seg2)) {
            ips.push(clone(seg1.start));
        }
        return ips;
    }

    if (EQ_0(shape_length(seg2))) {
        if (point_on(seg2.start, seg1)) {
            ips.push(clone(seg2.start));
        }
        return ips;
    }

    const norm1 = points2norm(seg1.start, seg1.end);
    const norm2 = points2norm(seg2.start, seg2.end);
    const line1 = Line(seg1.start, norm1);
    const line2 = Line(seg2.start, norm2);

    if (incident_To(line1, line2)) {
        if (point_on(seg1.start, seg2)) {
            ips.push(clone(seg1.start));
        }
        if (point_on(seg1.end, seg2)) {
            ips.push(clone(seg1.end));
        }
        if (point_on(seg2.start, seg1) && !shape_equal_to(seg2.start, seg1.start) && !shape_equal_to(seg2.start, seg1.end)) {
            ips.push(clone(seg2.start));
        }
        if (point_on(seg2.end, seg1) && !shape_equal_to(seg2.end, seg1.start) && !shape_equal_to(seg2.end, seg1.end)) {
            ips.push(clone(seg2.end));
        }
    } 
    else {
        const new_ip = intersectLine2Line(line1, line2);
        if (new_ip.length > 0) {
            if (isPointInSegmentBox(new_ip[0], seg1) && isPointInSegmentBox(new_ip[0], seg2)) {
                ips.push(new_ip[0]);
            }
        }
    }
    return ips;
}


export function intersectSegment2Circle(segment: ISegment, circle: ICircle): IPoint[] {
    const ips: IPoint[] = [];

    if (!intersectBox2Box(shape_box(segment), shape_box(circle))) {
        return ips;
    }
    if (EQ_0(shape_length(segment))) {
        const [dist, _] = point2point(segment.start, circle.pc);
        if (EQ(dist, circle.r)) {
            ips.push(clone(segment.start));
        }
        return ips;
    }

    const norm = points2norm(segment.start, segment.end);
    const line = Line(segment.start, norm);
    const ips_tmp = intersectLine2Circle(line, circle);
    for (const ip of ips_tmp) {
        if (point_on(ip, segment)) {
            ips.push(ip);
        }
    }
    return ips;
}

export function intersectSegment2Arc(segment: ISegment, arc: IArc): IPoint[] {
    const ips: IPoint[] = [];

    if (!intersectBox2Box(shape_box(segment), shape_box(arc))) {
        return ips;
    }
    if (EQ_0(shape_length(segment))) {
        if (point_on(segment.start, arc)) {
            ips.push(clone(segment.start));
        }
        return ips;
    }

    const norm = points2norm(segment.start, segment.end);
    const line = Line(segment.start, norm);
    const circle = Circle(arc.pc, arc.r);
    const ip_tmp = intersectLine2Circle(line, circle);
    for (const pt of ip_tmp) {
        if (point_on(pt, segment) && point_on(pt, arc)) {
            ips.push(pt);
        }
    }
    return ips;
}

export function intersectSegment2Box(segment: ISegment, box: IBox): IPoint[] {
    const ips: IPoint[] = [];
    for (const seg of box_to_segments(box)) {
        const ips_tmp = intersectSegment2Segment(seg, segment);
        for (const ip of ips_tmp) {
            ips.push(ip);
        }
    }
    return ips;
}

export function intersectLine2Arc(line: ILine, arc: IArc): IPoint[] {
    const ips: IPoint[] = [];
    if (intersectLine2Box(line, shape_box(arc)).length === 0) {
        return ips;
    }
    const circle = Circle(arc.pc, arc.r);
    const ip_tmp = intersectLine2Circle(line, circle);
    for (const pt of ip_tmp) {
        if (shape_contains(arc, pt)) {
            ips.push(pt);
        }
    }
    return ips;
}

export function intersectArc2Circle(arc: IArc, circle: ICircle): IPoint[] {
    const ips: IPoint[] = [];
    if (!intersectBox2Box(shape_box(arc), shape_box(circle))) {
        return ips;
    }
    if (shape_equal_to(circle.pc, arc.pc) && EQ(circle.r, arc.r)) {
        ips.push(arc_start(arc));
        ips.push(arc_end(arc));
        return ips;
    }
    const circle1 = circle;
    const circle2 = Circle(arc.pc, arc.r);
    const ip_tmp = intersectCircle2Circle(circle1, circle2);
    for (const pt of ip_tmp) {
        if (point_on(pt, arc)) {
            ips.push(pt);
        }
    }
    return ips;
}

export function intersectCircle2Circle(circle1: ICircle, circle2: ICircle): IPoint[] {
    const ips: IPoint[] = [];
    if (!intersectBox2Box(shape_box(circle1), shape_box(circle2))) {
        return ips;
    }
    const vec = vector_from_points(clone(circle1.pc), clone(circle2.pc));
    const r1 = circle1.r;
    const r2 = circle2.r;

    if (EQ_0(r1) || EQ_0(r2)) return ips;

    if (EQ_0(vec.x) && EQ_0(vec.y) && EQ(r1, r2)) {
        const v = Vector(-r1, 0);
        const pt = clone(circle1.pc);
        translate(pt, v.x, v.y);
        ips.push(pt);
        return ips;
    }

    const dist = point2point(circle1.pc, circle2.pc)[0];

    if (GT(dist, r1 + r2))
        return ips;

    if (LT(dist, Math.abs(r1 - r2)))
        return ips;

    // Normalize vector.
    normalize(vec);
    let pt: IPoint;
    if (EQ(dist, r1 + r2) || EQ(dist, Math.abs(r1 - r2))) {
        const v = Vector(r1 * vec.x, r1 * vec.y);
        pt = clone(circle1.pc);
        translate(pt, v.x, v.y);
        ips.push(pt);
        return ips;
    }

    // Distance from first center to center of common chord:
    //   a = (r1^2 - r2^2 + d^2) / 2d
    const a = (r1 * r1) / (2 * dist) - (r2 * r2) / (2 * dist) + dist / 2;
    const mid_pt = clone(circle1.pc);
    translate(mid_pt, a * vec.x, a * vec.y);
    const h = Math.sqrt(r1 * r1 - a * a);

    multiply(vec, h);
    rotate_vec_90CW(vec);
    pt = clone(mid_pt);
    translate(pt, vec.x, vec.y);
    ips.push(pt);

    const v2 = clone(vec);
    invert_vec(v2);
    pt = clone(mid_pt);
    translate(pt, v2.x, v2.y);
    ips.push(pt);

    return ips;
}

export function intersectCircle2Box(circle: ICircle, box: IBox): IPoint[] {
    const ips = [];
    for (const seg of box_to_segments(box)) {
        const ips_tmp = intersectSegment2Circle(seg, circle);
        for (const ip of ips_tmp) {
            ips.push(ip);
        }
    }
    return ips;
}

export function intersectArc2Box(arc: IArc, box: IBox): IPoint[] {
    const ips = [];
    for (const seg of box_to_segments(box)) {
        const ips_tmp = intersectSegment2Arc(seg, arc);
        for (const ip of ips_tmp) {
            ips.push(ip);
        }
    }
    return ips;
}

export function intersectArc2Arc(arc1: IArc, arc2: IArc): IPoint[] {
    const ips: IPoint[] = [];
    if (!intersectBox2Box(shape_box(arc1), shape_box(arc2))) {
        return ips;
    }
    if (shape_equal_to(arc1.pc, arc2.pc) && EQ(arc1.r, arc2.r)) {
        let pt: IPoint;
        pt = arc_start(arc1);
        if (point_on(pt, arc2)) ips.push(pt);
        pt =  arc_end(arc1);
        if (point_on(pt, arc2)) ips.push(pt);
        pt = arc_start(arc2);
        if (point_on(pt, arc1)) ips.push(pt);
        pt = arc_end(arc2);
        if (point_on(pt, arc1)) ips.push(pt);
        return ips;
    }
    const circle1 = Circle(arc1.pc, arc1.r);
    const circle2 = Circle(arc2.pc, arc2.r);
    const ip_tmp = intersectCircle2Circle(circle1, circle2);
    for (const pt of ip_tmp) {
        if (point_on(pt, arc1) && point_on(pt, arc2)) {
            ips.push(pt);
        }
    }
    return ips;
}


// distance funcs

export function shape2shape_distance(s1: AnyShape, s2: AnyShape) {
    if (s1.name == ShapeNames.Point) {
        const p = s1 as IPoint;
        return point_distance_to(p, s2);
    }

    if (s1.name == ShapeNames.Line) {
        const l = s1 as ILine;
        return line_distance_to(l, s2);
    }

    if (s1.name == ShapeNames.Segment) {
        const s = s1 as ISegment;
        return segment_distance_to(s, s2);
    }

    if (s1.name == ShapeNames.Circle) {
        const c = s1 as ICircle;
        return circle_distance_to(c, s2);
    }

    if (s1.name == ShapeNames.Arc) {
        const a = s1 as IArc;
        return arc_distance_to(a, s2);
    }

    throw new Error('wrong operation');
}

export function point_distance_to(p: IPoint, _shape: AnyShape): [number, ISegment] {
    if (_shape.name == ShapeNames.Point) {
        const shape = _shape as IPoint;
        return point2point(p, shape);
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

function circle_distance_to(c: ICircle, _shape: AnyShape): [number, ISegment] {
    if (_shape.name == ShapeNames.Point) {
        const shape = _shape as IPoint;
        return reverse_result(point2circle(shape, c));
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
        return reverse_result(segment2circle(shape, c));
    }

    if (_shape.name == ShapeNames.Arc) {
        const shape = _shape as IArc;
        return reverse_result(arc2circle(shape, c));
    }

    throw new Error('wrong operation');
}

function line_distance_to(l: ILine, _shape: AnyShape): [number, ISegment] {
    if (_shape.name == ShapeNames.Point) {
        const shape = _shape as IPoint;
        const [distance, shortest_segment] = point2line(shape, l);
        reverse(shortest_segment);
        return [distance, shortest_segment];
    }

    if (_shape.name == ShapeNames.Circle) {
        const shape = _shape as ICircle;
        const [distance, shortest_segment] = circle2line(shape, l);
        reverse(shortest_segment);
        return [distance, shortest_segment];
    }

    if (_shape.name == ShapeNames.Segment) {
        const shape = _shape as ISegment;
        const [distance, shortest_segment] = segment2line(shape, l);
        reverse(shortest_segment);
        return [distance, shortest_segment];
    }

    if (_shape.name == ShapeNames.Arc) {
        const shape = _shape as IArc;
        const [distance, shortest_segment] = arc2line(shape, l);
        reverse(shortest_segment);
        return [distance, shortest_segment];
    }

    throw new Error('wrong operation');
}

function arc_distance_to(a: IArc,_shape: AnyShape): [number, ISegment] {
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

function segment_distance_to(s: ISegment, _shape: AnyShape): [number, ISegment] {
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

export function point2point(a: IPoint, b: IPoint): [number, ISegment] {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    return [Math.sqrt(dx * dx + dy * dy), Segment(clone(a), clone(b))];
}

export function point2line(pt: IPoint, line: ILine): [number, ISegment] {
    const closest_point = point_projection(pt, line);
    const vec = Vector(closest_point.x - pt.x, closest_point.y - pt.y);
    return [shape_length(vec), Segment(clone(pt), closest_point)];
}

export function point2circle(pt: IPoint, circle: ICircle): [number, ISegment] {
    const [dist2center, shortest_dist] = point_distance_to(pt, circle.pc);
    if (EQ_0(dist2center)) {
        return [circle.r, Segment(pt, arc_start(circle_to_arc(circle)))];
    } else {
        const dist = Math.abs(dist2center - circle.r);
        const v = Vector(pt.x - circle.pc.x, pt.y - circle.pc.y);
        normalize(v);
        multiply(v, circle.r);
        const closest_point = clone(circle.pc);
        translate(closest_point, v.x, v.y);
        return [dist, Segment(clone(pt), closest_point)];
    }
}

export function point2segment(pt: IPoint, segment: ISegment): [number, ISegment] {
    // Degenerated case of zero-length segment 
    if (shape_equal_to(segment.start, segment.end)) {
        return point2point(pt, segment.start);
    }

    VEC_A.x = segment.end.x - segment.start.x;
    VEC_A.y = segment.end.y - segment.start.y;
    VEC_B.x = pt.x - segment.start.x;
    VEC_B.y = pt.y - segment.start.y;
    VEC_C.x = pt.x - segment.end.x;
    VEC_C.y = pt.y - segment.end.y;

    const start_sp = dot(VEC_A, VEC_B);
    const end_sp = -dot(VEC_A, VEC_C);

    let dist;
    let closest_point;
    if (GE(start_sp, 0) && GE(end_sp, 0)) {
        const v_unit = segment_start_tangent(segment);
        dist = Math.abs(cross(v_unit, VEC_B));
        const v_dot = dot(v_unit, VEC_B);
        closest_point = clone(segment.start);
        translate(closest_point, v_unit.x * v_dot, v_unit.y * v_dot);
        return [dist, Segment(clone(pt), closest_point)];
    } else if (start_sp < 0) {
        return shape2shape_distance(pt, segment.start);
    } else {
        return shape2shape_distance(pt, segment.end);
    }
}

export function point2arc(pt: IPoint, arc: IArc): [number, ISegment] {
    const circle = Circle(clone(arc.pc), arc.r);
    const dist_and_segment = [];
    const [dist, shortest_segment] = point2circle(pt, circle);
    if (point_on(shortest_segment.end, arc)) {
        dist_and_segment.push(point2circle(pt, circle));
    }
    dist_and_segment.push(point2point(pt, arc_start(arc)));
    dist_and_segment.push(point2point(pt, arc_end(arc)));

    sort(dist_and_segment);

    return dist_and_segment[0];
}

export function arc2point(arc: IArc, point: IPoint) {
    return reverse_result(point2arc(point, arc));
}

export function segment2point(segment: ISegment, point: IPoint): [number, ISegment] {
    const result = point2segment(point, segment);
    reverse(result[1]);
    return result;
}

export function segment2circle(seg: ISegment, circle: ICircle): [number, ISegment] {
    const ip = intersectSegment2Circle(seg, circle);
    if (ip.length > 0) {
        return [0, Segment(ip[0], ip[0])];
    }
    const norm = points2norm(seg.start, seg.end);
    LINE_A.pt.x = seg.start.x;
    LINE_A.pt.y = seg.start.y;
    LINE_A.norm.x = norm.x;
    LINE_A.norm.y = norm.y;
    const [dist, shortest_segment] = point2line(circle.pc, LINE_A);
    if (GE(dist, circle.r) && point_on(shortest_segment.end, seg)) {
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
    const ip = intersectSegment2Line(seg, line);
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
    const ip = intersectSegment2Segment(seg1, seg2);
    if (ip.length > 0) {
        return [0, Segment(ip[0], ip[0])];
    }
    const dist_and_segment: [number, ISegment][] = [];
    let dist_tmp, shortest_segment_tmp;
    [dist_tmp, shortest_segment_tmp] = point2segment(clone(seg2.start), seg1);
    reverse(shortest_segment_tmp);
    dist_and_segment.push([dist_tmp, shortest_segment_tmp]);
    [dist_tmp, shortest_segment_tmp] = point2segment(clone(seg2.end), seg1);
    reverse(shortest_segment_tmp);
    dist_and_segment.push([dist_tmp, shortest_segment_tmp]);
    dist_and_segment.push(point2segment(seg1.start, seg2));
    dist_and_segment.push(point2segment(seg1.end, seg2));

    sort(dist_and_segment);
    return dist_and_segment[0];
}

export function segment2arc(seg: ISegment, arc: IArc): [number, ISegment] {
    const ip = intersectSegment2Arc(seg, arc);
    if (ip.length > 0) {
        return [0, Segment(ip[0], ip[0])];
    }
    const norm = points2norm(seg.start, seg.end);
    const line = Line(seg.start, norm);
    const circle = Circle(clone(arc.pc), arc.r);
    const [dist_from_center, shortest_segment_from_center] = point2line(circle.pc, line);
    if (GE(dist_from_center, circle.r) && point_on(shortest_segment_from_center.end, seg)) {
        const [dist_from_projection, shortest_segment_from_projection] = point2circle(
            shortest_segment_from_center.end,
            circle,
        );
        if (point_on(shortest_segment_from_projection.end, arc)) {
            return [dist_from_projection, shortest_segment_from_projection];
        }
    }
    const dist_and_segment: [number, ISegment][] = [];
    dist_and_segment.push(point2arc(seg.start, arc));
    dist_and_segment.push(point2arc(seg.end, arc));

    let dist_tmp, segment_tmp;
    [dist_tmp, segment_tmp] = point2segment(arc_start(arc), seg);
    reverse(segment_tmp);
    dist_and_segment.push([dist_tmp, segment_tmp]);

    [dist_tmp, segment_tmp] = point2segment(arc_end(arc), seg);
    reverse(segment_tmp);
    dist_and_segment.push([dist_tmp, segment_tmp]);

    sort(dist_and_segment);
    return dist_and_segment[0];
}

export function arc2segment(arc: IArc, segment: ISegment) {
    return reverse_result(segment2arc(segment, arc));
}

export function circle2circle(circle1: ICircle, circle2: ICircle): [number, ISegment] {
    const ip = intersectCircle2Circle(circle1, circle2);
    if (ip.length > 0) {
        return [0, Segment(ip[0], ip[0])];
    }
    if (shape_equal_to(circle1.pc, circle2.pc)) {
        const arc1 = circle_to_arc(circle1);
        const arc2 = circle_to_arc(circle2);
        return point2point(arc_start(arc1), arc_start(arc2));
    } else {
        const norm = points2norm(circle1.pc, circle2.pc);
        const line = Line(circle1.pc, norm);
        const ip1 = intersectLine2Circle(line, circle1);
        const ip2 = intersectLine2Circle(line, circle2);

        const dist_and_segment = [];

        dist_and_segment.push(point2point(clone(ip1[0]), clone(ip2[0])));
        dist_and_segment.push(point2point(clone(ip1[0]), clone(ip2[1])));
        dist_and_segment.push(point2point(clone(ip1[1]), clone(ip2[0])));
        dist_and_segment.push(point2point(clone(ip1[1]), clone(ip2[1])));

        sort(dist_and_segment);
        return dist_and_segment[0];
    }
}

export function circle2line(circle: ICircle, line: ILine): [number, ISegment] {
    const ip = intersectLine2Circle(line, circle);
    if (ip.length > 0) {
        return [0, Segment(ip[0], ip[0])];
    }
    const [dist_from_center, shortest_segment_from_center] = point2line(circle.pc, line);
    const [dist, shortest_segment] = point2circle(shortest_segment_from_center.end, circle);
    reverse(shortest_segment);
    return [dist, shortest_segment];
}

export function arc2circle(arc: IArc, circle2: ICircle): [number, ISegment] {
    const ip = intersectArc2Circle(arc, circle2);
    if (ip.length > 0) {
        return [0, Segment(ip[0], ip[0])];
    }
    const circle1 = Circle(clone(arc.pc), arc.r);
    const [dist, shortest_segment] = circle2circle(circle1, circle2);
    if (point_on(shortest_segment.start, arc)) {
        return [dist, shortest_segment];
    } else {
        const dist_and_segment = [];
        dist_and_segment.push(point2circle(arc_start(arc), circle2));
        dist_and_segment.push(point2circle(arc_end(arc), circle2));
        sort(dist_and_segment);
        return dist_and_segment[0];
    }
}

export function arc2line(arc: IArc, line: ILine): [number, ISegment] {
    const ip = intersectLine2Arc(line, arc);
    if (ip.length > 0) {
        return [0, Segment(ip[0], ip[0])];
    }
    const circle = Circle(clone(arc.pc), arc.r);
    const [dist_from_center, shortest_segment_from_center] = point2line(circle.pc, line);
    if (GE(dist_from_center, circle.r)) {
        const [dist_from_projection, shortest_segment_from_projection] = point2circle(
            shortest_segment_from_center.end,
            circle,
        );
        if (point_on(shortest_segment_from_projection.end, arc)) {
            return [dist_from_projection, shortest_segment_from_projection];
        }
        throw new Error('wrong operation');
    } else {
        const dist_and_segment = [];
        dist_and_segment.push(point2line(arc_start(arc), line));
        dist_and_segment.push(point2line(arc_end(arc), line));
        sort(dist_and_segment);
        return dist_and_segment[0];
    }
}

export function arc2arc(arc1: IArc, arc2: IArc): [number, ISegment] {
    const ip = intersectArc2Arc(arc1, arc2);
    if (ip.length > 0) {
        return [0, Segment(ip[0], ip[0])];
    }
    const circle1 = Circle(arc1.pc, arc1.r);
    const circle2 = Circle(arc2.pc, arc2.r);
    const [dist, shortest_segment] = circle2circle(circle1, circle2);
    if (point_on(shortest_segment.start, arc1) && point_on(shortest_segment.end, arc2)) {
        return [dist, shortest_segment];
    } else {
        const dist_and_segment: [number, ISegment][] = [];

        let dist_tmp, segment_tmp;

        [dist_tmp, segment_tmp] = point2arc(arc_start(arc1), arc2);
        if (point_on(segment_tmp.end, arc2)) {
            dist_and_segment.push([dist_tmp, segment_tmp]);
        }

        [dist_tmp, segment_tmp] = point2arc(arc_end(arc1), arc2);
        if (point_on(segment_tmp.end, arc2)) {
            dist_and_segment.push([dist_tmp, segment_tmp]);
        }

        [dist_tmp, segment_tmp] = point2arc(arc_start(arc2), arc1);
        if (point_on(segment_tmp.end, arc1)) {
            reverse(segment_tmp);
            dist_and_segment.push([dist_tmp, segment_tmp]);
        }

        [dist_tmp, segment_tmp] = point2arc(arc_end(arc2), arc1);
        if (point_on(segment_tmp.end, arc1)) {
            reverse(segment_tmp);
            dist_and_segment.push([dist_tmp, segment_tmp]);
        }

        [dist_tmp, segment_tmp] = point2point(arc_start(arc1), arc_start(arc2));
        dist_and_segment.push([dist_tmp, segment_tmp]);

        [dist_tmp, segment_tmp] = point2point(arc_start(arc1), arc_end(arc2));
        dist_and_segment.push([dist_tmp, segment_tmp]);

        [dist_tmp, segment_tmp] = point2point(arc_end(arc1), arc_start(arc2));
        dist_and_segment.push([dist_tmp, segment_tmp]);

        [dist_tmp, segment_tmp] = point2point(arc_end(arc1), arc_end(arc2));
        dist_and_segment.push([dist_tmp, segment_tmp]);
        sort(dist_and_segment);

        return dist_and_segment[0];
    }
}

export function reverse_result(result: [number, ISegment]): [number, ISegment] {
    reverse(result[1]);
    return result;
}

