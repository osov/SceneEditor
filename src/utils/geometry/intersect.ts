import { LINE_A, ShapeNames } from "./const";
import { point2point } from "./distance";
import { Point, Circle, Vector, Line } from "./shapes";
import { ILine, IPoint, ICircle, IVector, IBox, ISegment, IArc, AnyShape } from "./types";
import { EQ_0, EQ, LT, ptInIntPoints, points2norm, isPointInSegmentBox, vector_from_points, GT, clone,
     rotate_vec_90CW, invert_vec, translate, normalize, multiply, shape_equal_to, shape_contains, 
     arc_start, arc_end, shape_box, shape_length, point_projection, line_standard, point_left_to, 
     point_on, incident_To, box_to_segments } from "./utils";


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
        let v_trans: IVector, pt: IPoint;

        v_trans = clone(line.norm);
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
    } else {
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
        console.log('here ip_tmp', ip_tmp.length)
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
    let vec = vector_from_points(clone(circle1.pc), clone(circle2.pc));
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
