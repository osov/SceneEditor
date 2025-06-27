import { LINE_A, ShapeNames, VEC_A, VEC_B, VEC_C } from "./const";
import { arc_intersect, circle_intersect, intersectArc2Arc, intersectArc2Circle, intersectCircle2Circle, intersectLine2Arc, intersectLine2Circle, intersectSegment2Arc, intersectSegment2Circle, intersectSegment2Line, intersectSegment2Segment, line_intersect, segment_intersect } from "./intersect";
import { Circle, Line, Segment, Vector } from "./shapes";
import { AnyShape, IArc, ICircle, ILine, IPoint, ISegment } from "./types";
import { clone, cross, dot, EQ_0, shape_equal_to, GE, LT, multiply, normalize, points2norm, 
    sort, translate, arc_start, arc_end, shape_length, point_projection, point_on, reverse, 
    circle_to_arc, segment_start_tangent } from "./utils";


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
        return point2point(p, shape)
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
        let [distance, shortest_segment] = point2line(shape, l);
        reverse(shortest_segment);
        return [distance, shortest_segment];
    }

    if (_shape.name == ShapeNames.Circle) {
        const shape = _shape as ICircle;
        let [distance, shortest_segment] = circle2line(shape, l);
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
    let [dist, shortest_segment] = point2circle(shortest_segment_from_center.end, circle);
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
