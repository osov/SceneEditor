import { Circle } from "./circle";
import { LINE_A, VEC_A, VEC_B, VEC_C } from "./const";
import { intersectSegment2Segment } from "./intersect";
import { Line } from "./line";
import { Segment } from "./segment";
import { IArc, ICircle, ILine, IPoint, ISegment } from "./types";
import { clone, EQ_0, GE, LT, points2norm, sort } from "./utils";
import { Vector } from "./vector";


export function point2point(a: IPoint, b: IPoint): [number, ISegment] {
    return a.distanceTo(b);
}

export function point2line(pt: IPoint, line: ILine): [number, ISegment] {
    const closest_point = pt.projectionOn(line);
    const vec = Vector(closest_point.x - pt.x, closest_point.y - pt.y);
    return [vec.length(), Segment(clone(pt), closest_point)];
}

export function point2circle(pt: IPoint, circle: ICircle): [number, ISegment] {
    const [dist2center, shortest_dist] = pt.distanceTo(circle.center());
    if (EQ_0(dist2center)) {
        return [circle.r, Segment(pt, circle.toArc().start())];
    } else {
        const dist = Math.abs(dist2center - circle.r);
        const v = Vector(pt.x - circle.pc.x, pt.y - circle.pc.y).normalize().multiply(circle.r);
        const closest_point = clone(circle.pc).translate(v.x, v.y);
        return [dist, Segment(clone(pt), closest_point)];
    }
}

export function point2segment(pt: IPoint, segment: ISegment): [number, ISegment] {
    // Degenerated case of zero-length segment 
    if (segment.start.equalTo(segment.end)) {
        return point2point(pt, segment.start);
    }

    VEC_A.x = segment.end.x - segment.start.x;
    VEC_A.y = segment.end.y - segment.start.y;
    VEC_B.x = pt.x - segment.start.x;
    VEC_B.y = pt.y - segment.start.y;
    VEC_C.x = pt.x - segment.end.x;
    VEC_C.y = pt.y - segment.end.y;

    const start_sp = VEC_A.dot(VEC_B);
    const end_sp = -VEC_A.dot(VEC_C);

    let dist;
    let closest_point;
    if (GE(start_sp, 0) && GE(end_sp, 0)) {
        const v_unit = segment.tangentInStart();
        dist = Math.abs(v_unit.cross(VEC_B));
        const v_dot = v_unit.dot(VEC_B);
        closest_point = clone(segment.start).translate(v_unit.x * v_dot, v_unit.y * v_dot);
        return [dist, Segment(clone(pt), closest_point)];
    } else if (start_sp < 0) {
        return pt.distanceTo(segment.start);
    } else {
        return pt.distanceTo(segment.end);
    }
}

export function point2arc(pt: IPoint, arc: IArc): [number, ISegment] {
    const circle = Circle(clone(arc.pc), arc.r);
    const dist_and_segment = [];
    const [dist, shortest_segment] = point2circle(pt, circle);
    if (shortest_segment.end.on(arc)) {
        dist_and_segment.push(point2circle(pt, circle));
    }
    dist_and_segment.push(point2point(pt, arc.start()));
    dist_and_segment.push(point2point(pt, arc.end()));

    sort(dist_and_segment);

    return dist_and_segment[0];
}

export function arc2point(arc: IArc, point: IPoint) {
    return reverse(point2arc(point, arc));
}

export function segment2point(segment: ISegment, point: IPoint): [number, ISegment] {
    const result = point2segment(point, segment);
    result[1] = result[1].reverse();
    return result;
}

export function segment2circle(seg: ISegment, circle: ICircle): [number, ISegment] {
    const ip = seg.intersect(circle);
    if (ip.length > 0) {
        return [0, Segment(ip[0], ip[0])];
    }
    const norm = points2norm(seg.start, seg.end);
    LINE_A.pt.x = seg.start.x;
    LINE_A.pt.y = seg.start.y;
    LINE_A.norm.x = norm.x;
    LINE_A.norm.y = norm.y;
    const [dist, shortest_segment] = point2line(circle.center(), LINE_A);
    if (GE(dist, circle.r) && shortest_segment.end.on(seg)) {
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
    const ip = seg.intersect(line);
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
    dist_and_segment.push([dist_tmp, shortest_segment_tmp.reverse()]);
    [dist_tmp, shortest_segment_tmp] = point2segment(clone(seg2.end), seg1);
    dist_and_segment.push([dist_tmp, shortest_segment_tmp.reverse()]);
    dist_and_segment.push(point2segment(seg1.start, seg2));
    dist_and_segment.push(point2segment(seg1.end, seg2));

    sort(dist_and_segment);
    return dist_and_segment[0];
}

export function segment2arc(seg: ISegment, arc: IArc): [number, ISegment] {
    const ip = seg.intersect(arc);
    if (ip.length > 0) {
        return [0, Segment(ip[0], ip[0])];
    }
    const norm = points2norm(seg.start, seg.end);
    const line = Line(seg.start, norm);
    const circle = Circle(clone(arc.pc), arc.r);
    const [dist_from_center, shortest_segment_from_center] = point2line(circle.center(), line);
    if (GE(dist_from_center, circle.r) && shortest_segment_from_center.end.on(seg)) {
        const [dist_from_projection, shortest_segment_from_projection] = point2circle(
            shortest_segment_from_center.end,
            circle,
        );
        if (shortest_segment_from_projection.end.on(arc)) {
            return [dist_from_projection, shortest_segment_from_projection];
        }
    }
    const dist_and_segment: [number, ISegment][] = [];
    dist_and_segment.push(point2arc(seg.start, arc));
    dist_and_segment.push(point2arc(seg.end, arc));

    let dist_tmp, segment_tmp;
    [dist_tmp, segment_tmp] = point2segment(arc.start(), seg);
    dist_and_segment.push([dist_tmp, segment_tmp.reverse()]);

    [dist_tmp, segment_tmp] = point2segment(arc.end(), seg);
    dist_and_segment.push([dist_tmp, segment_tmp.reverse()]);

    sort(dist_and_segment);
    return dist_and_segment[0];
}

export function arc2segment(arc: IArc, segment: ISegment) {
    return reverse(segment2arc(segment, arc));
}

export function circle2circle(circle1: ICircle, circle2: ICircle): [number, ISegment] {
    const ip = circle1.intersect(circle2);
    if (ip.length > 0) {
        return [0, Segment(ip[0], ip[0])];
    }
    if (circle1.center().equalTo(circle2.center())) {
        const arc1 = circle1.toArc();
        const arc2 = circle2.toArc();
        return point2point(arc1.start(), arc2.start());
    } else {
        const norm = points2norm(circle1.center(), circle2.center());
        const line = Line(circle1.center(), norm);
        const ip1 = line.intersect(circle1);
        const ip2 = line.intersect(circle2);

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
    const ip = circle.intersect(line);
    if (ip.length > 0) {
        return [0, Segment(ip[0], ip[0])];
    }
    const [dist_from_center, shortest_segment_from_center] = point2line(circle.center(), line);
    let [dist, shortest_segment] = point2circle(shortest_segment_from_center.end, circle);
    shortest_segment = shortest_segment.reverse();
    return [dist, shortest_segment];
}

export function arc2circle(arc: IArc, circle2: ICircle): [number, ISegment] {
    const ip = arc.intersect(circle2);
    if (ip.length > 0) {
        return [0, Segment(ip[0], ip[0])];
    }
    const circle1 = Circle(arc.center(), arc.r);
    const [dist, shortest_segment] = circle2circle(circle1, circle2);
    if (shortest_segment.start.on(arc)) {
        return [dist, shortest_segment];
    } else {
        const dist_and_segment = [];
        dist_and_segment.push(point2circle(arc.start(), circle2));
        dist_and_segment.push(point2circle(arc.end(), circle2));
        sort(dist_and_segment);
        return dist_and_segment[0];
    }
}

export function arc2line(arc: IArc, line: ILine): [number, ISegment] {
    const ip = line.intersect(arc);
    if (ip.length > 0) {
        return [0, Segment(ip[0], ip[0])];
    }
    const circle = Circle(arc.center(), arc.r);
    const [dist_from_center, shortest_segment_from_center] = point2line(circle.center(), line);
    if (GE(dist_from_center, circle.r)) {
        const [dist_from_projection, shortest_segment_from_projection] = point2circle(
            shortest_segment_from_center.end,
            circle,
        );
        if (shortest_segment_from_projection.end.on(arc)) {
            return [dist_from_projection, shortest_segment_from_projection];
        }
        throw new Error('wrong operation');
    } else {
        const dist_and_segment = [];
        dist_and_segment.push(point2line(arc.start(), line));
        dist_and_segment.push(point2line(arc.end(), line));
        sort(dist_and_segment);
        return dist_and_segment[0];
    }
}

export function arc2arc(arc1: IArc, arc2: IArc): [number, ISegment] {
    const ip = arc1.intersect(arc2);
    if (ip.length > 0) {
        return [0, Segment(ip[0], ip[0])];
    }
    const circle1 = Circle(arc1.center(), arc1.r);
    const circle2 = Circle(arc2.center(), arc2.r);
    const [dist, shortest_segment] = circle2circle(circle1, circle2);
    if (shortest_segment.start.on(arc1) && shortest_segment.end.on(arc2)) {
        return [dist, shortest_segment];
    } else {
        const dist_and_segment: [number, ISegment][] = [];

        let dist_tmp, segment_tmp;

        [dist_tmp, segment_tmp] = point2arc(arc1.start(), arc2);
        if (segment_tmp.end.on(arc2)) {
            dist_and_segment.push([dist_tmp, segment_tmp]);
        }

        [dist_tmp, segment_tmp] = point2arc(arc1.end(), arc2);
        if (segment_tmp.end.on(arc2)) {
            dist_and_segment.push([dist_tmp, segment_tmp]);
        }

        [dist_tmp, segment_tmp] = point2arc(arc2.start(), arc1);
        if (segment_tmp.end.on(arc1)) {
            dist_and_segment.push([dist_tmp, segment_tmp.reverse()]);
        }

        [dist_tmp, segment_tmp] = point2arc(arc2.end(), arc1);
        if (segment_tmp.end.on(arc1)) {
            dist_and_segment.push([dist_tmp, segment_tmp.reverse()]);
        }

        [dist_tmp, segment_tmp] = point2point(arc1.start(), arc2.start());
        dist_and_segment.push([dist_tmp, segment_tmp]);

        [dist_tmp, segment_tmp] = point2point(arc1.start(), arc2.end());
        dist_and_segment.push([dist_tmp, segment_tmp]);

        [dist_tmp, segment_tmp] = point2point(arc1.end(), arc2.start());
        dist_and_segment.push([dist_tmp, segment_tmp]);

        [dist_tmp, segment_tmp] = point2point(arc1.end(), arc2.end());
        dist_and_segment.push([dist_tmp, segment_tmp]);
        sort(dist_and_segment);

        return dist_and_segment[0];
    }
}

export function reverse(result: [number, ISegment]): [number, ISegment] {
    result[1] = result[1].reverse();
    return result;
}
