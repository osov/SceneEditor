import { radToDeg } from "../physic/utils";
import { Arc } from "./arc";
import { Box } from "./box";
import { Circle } from "./circle";
import { DP_TOL, POINT_EMPTY, ShapeNames, TAU, VOID_BOX } from "./const";
import { Line } from "./line";
import { Matrix } from "./matrix";
import { Point } from "./point";
import { Segment } from "./segment";
import { AnyShape, IArc, IBox, ICircle, ILine, IMatrix, IPoint, ISegment, IVector, PointLike, Shape } from "./types";
import { Vector } from "./vector";


const tm_trans = vmath.matrix4();
const tm_rot = vmath.matrix4();
const tm = vmath.matrix4();
const tv = vmath.vector4();

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
        let p = shape as IPoint;
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
        let v = shape as IVector;
        tv.x = v.x; tv.y = v.y; tv.w = 1;
        xmath.matrix_rotation_z(tm_rot, angle);
        const tmp = vmath.matrix_mult_vector(tm_rot, tv);
        v.x = tmp.x;
        v.y = tmp.y;

    } 
    if (shape.name == ShapeNames.Segment) {
        let s = shape as ISegment;
        rotate(s.start, angle, center);
        rotate(s.end, angle, center);
    }
    if (shape.name == ShapeNames.Line) {
        let l = shape as ILine;
        rotate(l.pt, angle, center);
        rotate(l.norm, angle);
    } 
    if (shape.name == ShapeNames.Box) {
        // Не используем в текущей логике
        throw new Error('Функция поворота бокса не реализована');
    }
    if (shape.name == ShapeNames.Circle) {
        // Не используем в текущей логике
        throw new Error('Функция поворота окружности не реализована');
    } 
    if (shape.name == ShapeNames.Arc) {
        // Не используем в текущей логике
        throw new Error('Функция поворота дуги не реализована');
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
        translate(s.start, x, y);
    }
    if (shape.name == ShapeNames.Line) {
        let l = shape as ILine;
        translate(l.pt, x, y);
    } 
    if (shape.name == ShapeNames.Box) {
        // Не используем в текущей логике
        throw new Error('Функция переноса бокса не реализована');
    } 
    if (shape.name == ShapeNames.Circle) {
        let c = shape as ICircle;
        translate(c.pc, x, y);
    }
    if (shape.name == ShapeNames.Arc) {
        // Не используем в текущей логике
        throw new Error('Функция переноса дуги не реализована');
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
        const points = b.toPoints();
        points.map(p => transform(p, m));
        rewrite(b, VOID_BOX);
        for (const pt of points) {
            merge_boxes_in_place(b, pt.box());
        }
    }
    if (shape.name == ShapeNames.Circle) {
        let c = shape as ICircle;
        transform(c.pc, m);
    }
    if (shape.name == ShapeNames.Arc) {
        // Не используем в текущей логике
        throw new Error('Функция трансформации дуги не реализована');
    } 
}

function merge_boxes_in_place(box_in_place: IBox, box: IBox) {
    box_in_place.xmin = Math.min(box_in_place.xmin, box.xmin);
    box_in_place.xmax = Math.min(box_in_place.xmax, box.xmax);
    box_in_place.ymin = Math.min(box_in_place.ymin, box.ymin);
    box_in_place.ymax = Math.min(box_in_place.ymax, box.ymax);
    return box_in_place
}

export function mult_matrix(m_in_place: IMatrix, m: IMatrix) {
    m_in_place.matrix = vmath.mult_matrices(m_in_place.matrix, m.matrix);
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
    vec.normalize();
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


