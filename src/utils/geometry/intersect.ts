import { Circle } from "./circle";
import { LINE_A } from "./const";
import { Line } from "./line";
import { Point } from "./point";
import { ILine, IPoint, ICircle, IVector, IBox, ISegment, IArc } from "./types";
import { EQ_0, EQ, LT, ptInIntPoints, points2norm, isPointInSegmentBox, vector_from_points, GT, clone, rotate_vec_90CW, invert_vec } from "./utils";
import { Vector } from "./vector";


export function intersectLine2Line(line1: ILine, line2: ILine): IPoint[] {
    const ips: IPoint[] = [];
    const [A1, B1, C1] = line1.standard();
    const [A2, B2, C2] = line2.standard();
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
    const prj = circle.pc.projectionOn(line);
    const dist = circle.pc.distanceTo(prj)[0];

    if (EQ(dist, circle.r)) {
        ips.push(prj);
    } 
    else if (LT(dist, circle.r)) {
        const delta = Math.sqrt(circle.r * circle.r - dist * dist);
        let v_trans: IVector, pt: IPoint;

        v_trans = clone(line.norm);
        rotate_vec_90CW(v_trans);
        v_trans.multiply(delta);
        pt = clone(prj).translate(v_trans.x, v_trans.y);
        ips.push(pt);

        invert_vec(v_trans);
        pt = prj.translate(v_trans.x, v_trans.y);
        ips.push(pt);
    }
    return ips;
}

export function intersectLine2Box(line: ILine, box: IBox): IPoint[] {
    const ips: IPoint[] = [];
    for (const seg of box.toSegments()) {
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

    if (seg.start.on(line)) {
        ips.push(clone(seg.start));
    }
    if (seg.end.on(line) && !seg.isZeroLength()) {
        ips.push(clone(seg.end));
    }
    if (ips.length > 0) {
        return ips;
    }
    if (seg.isZeroLength()) {
        return ips;
    }
    if ((seg.start.leftTo(line) && seg.end.leftTo(line)) || (!seg.start.leftTo(line) && !seg.end.leftTo(line))) {
        return ips;
    }
    LINE_A.pt.x = seg.start.x;
    LINE_A.pt.y = seg.start.y;
    LINE_A.norm = points2norm(seg.start, seg.end);
    return intersectLine2Line(LINE_A, line);
}

export function intersectSegment2Segment(seg1: ISegment, seg2: ISegment): IPoint[] {
    const ips: IPoint[] = [];

    if (!seg1.box().intersect(seg2.box())) {
        return ips;
    }

    if (seg1.isZeroLength()) {
        if (seg1.start.on(seg2)) {
            ips.push(clone(seg1.start));
        }
        return ips;
    }

    if (seg2.isZeroLength()) {
        if (seg2.start.on(seg1)) {
            ips.push(clone(seg2.start));
        }
        return ips;
    }

    const norm1 = points2norm(seg1.start, seg1.end);
    const norm2 = points2norm(seg2.start, seg2.end);
    const line1 = Line(seg1.start, norm1);
    const line2 = Line(seg2.start, norm2);

    if (line1.incidentTo(line2)) {
        if (seg1.start.on(seg2)) {
            ips.push(clone(seg1.start));
        }
        if (seg1.end.on(seg2)) {
            ips.push(clone(seg1.end));
        }
        if (seg2.start.on(seg1) && !seg2.start.equalTo(seg1.start) && !seg2.start.equalTo(seg1.end)) {
            ips.push(clone(seg2.start));
        }
        if (seg2.end.on(seg1) && !seg2.end.equalTo(seg1.start) && !seg2.end.equalTo(seg1.end)) {
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

    if (!segment.box().intersect(circle.box())) {
        return ips;
    }
    if (segment.isZeroLength()) {
        const [dist, _] = segment.start.distanceTo(circle.pc);
        if (EQ(dist, circle.r)) {
            ips.push(clone(segment.start));
        }
        return ips;
    }

    const norm = points2norm(segment.start, segment.end);
    const line = Line(segment.start, norm);
    const ips_tmp = intersectLine2Circle(line, circle);
    for (const ip of ips_tmp) {
        if (ip.on(segment)) {
            ips.push(ip);
        }
    }
    return ips;
}

export function intersectSegment2Arc(segment: ISegment, arc: IArc): IPoint[] {
    const ips: IPoint[] = [];

    if (!segment.box().intersect(arc.box())) {
        return ips;
    }
    if (segment.isZeroLength()) {
        if (segment.start.on(arc)) {
            ips.push(clone(segment.start));
        }
        return ips;
    }

    const norm = points2norm(segment.start, segment.end);
    const line = Line(segment.start, norm);
    const circle = Circle(arc.pc, arc.r);
    const ip_tmp = intersectLine2Circle(line, circle);
    for (const pt of ip_tmp) {
        if (pt.on(segment) && pt.on(arc)) {
            ips.push(pt);
        }
    }
    return ips;
}

export function intersectSegment2Box(segment: ISegment, box: IBox): IPoint[] {
    const ips: IPoint[] = [];
    for (const seg of box.toSegments()) {
        const ips_tmp = intersectSegment2Segment(seg, segment);
        for (const ip of ips_tmp) {
            ips.push(ip);
        }
    }
    return ips;
}

export function intersectLine2Arc(line: ILine, arc: IArc): IPoint[] {
    const ips: IPoint[] = [];
    if (intersectLine2Box(line, arc.box()).length === 0) {
        return ips;
    }
    const circle = Circle(arc.pc, arc.r);
    const ip_tmp = intersectLine2Circle(line, circle);
    for (const pt of ip_tmp) {
        if (arc.contains(pt)) {
            ips.push(pt);
        }
    }
    return ips;
}

export function intersectArc2Circle(arc: IArc, circle: ICircle): IPoint[] {
    const ips: IPoint[] = [];
    if (!arc.box().intersect(circle.box())) {
        return ips;
    }
    if (circle.pc.equalTo(arc.pc) && EQ(circle.r, arc.r)) {
        ips.push(arc.start());
        ips.push(arc.end());
        return ips;
    }
    const circle1 = circle;
    const circle2 = Circle(arc.pc, arc.r);
    const ip_tmp = intersectCircle2Circle(circle1, circle2);
    for (const pt of ip_tmp) {
        console.log('here ip_tmp', ip_tmp.length)
        if (pt.on(arc)) {
            ips.push(pt);
        }
    }
    return ips;
}

export function intersectCircle2Circle(circle1: ICircle, circle2: ICircle): IPoint[] {
    const ips: IPoint[] = [];
    if (!circle1.box().intersect(circle2.box())) {
        return ips;
    }
    let vec = vector_from_points(clone(circle1.pc), clone(circle2.pc));
    const r1 = circle1.r;
    const r2 = circle2.r;

    if (EQ_0(r1) || EQ_0(r2)) return ips;

    if (EQ_0(vec.x) && EQ_0(vec.y) && EQ(r1, r2)) {
        const v = Vector(-r1, 0);
        ips.push(clone(circle1.pc).translate(v.x, v.y));
        return ips;
    }

    const dist = circle1.pc.distanceTo(circle2.pc)[0];

    if (GT(dist, r1 + r2))
        return ips;

    if (LT(dist, Math.abs(r1 - r2)))
        return ips;

    // Normalize vector.
    vec = vec.normalize();
    let pt: IPoint;
    if (EQ(dist, r1 + r2) || EQ(dist, Math.abs(r1 - r2))) {
        const v = Vector(r1 * vec.x, r1 * vec.y);
        pt = clone(circle1.pc).translate(v.x, v.y);
        ips.push(pt);
        return ips;
    }

    // Distance from first center to center of common chord:
    //   a = (r1^2 - r2^2 + d^2) / 2d
    const a = (r1 * r1) / (2 * dist) - (r2 * r2) / (2 * dist) + dist / 2;
    const mid_pt = clone(circle1.pc).translate(a * vec.x, a * vec.y);
    const h = Math.sqrt(r1 * r1 - a * a);

    const v1 = vec.multiply(h);
    rotate_vec_90CW(v1);
    pt = clone(mid_pt).translate(v1.x, v1.y);
    ips.push(pt);

    const v2 = clone(vec);
    invert_vec(v2);
    pt = clone(mid_pt).translate(v2.x, v2.y);
    ips.push(pt);

    return ips;
}

export function intersectCircle2Box(circle: ICircle, box: IBox): IPoint[] {
    const ips = [];
    for (const seg of box.toSegments()) {
        const ips_tmp = intersectSegment2Circle(seg, circle);
        for (const ip of ips_tmp) {
            ips.push(ip);
        }
    }
    return ips;
}

export function intersectArc2Box(arc: IArc, box: IBox): IPoint[] {
    const ips = [];
    for (const seg of box.toSegments()) {
        const ips_tmp = intersectSegment2Arc(seg, arc);
        for (const ip of ips_tmp) {
            ips.push(ip);
        }
    }
    return ips;
}

export function intersectArc2Arc(arc1: IArc, arc2: IArc): IPoint[] {
    const ips: IPoint[] = [];
    if (!arc1.box().intersect(arc2.box())) {
        return ips;
    }
    if (arc1.pc.equalTo(arc2.pc) && EQ(arc1.r, arc2.r)) {
        let pt: IPoint;
        pt = arc1.start();
        if (pt.on(arc2)) ips.push(pt);
        pt = arc1.end();
        if (pt.on(arc2)) ips.push(pt);
        pt = arc2.start();
        if (pt.on(arc1)) ips.push(pt);
        pt = arc2.end();
        if (pt.on(arc1)) ips.push(pt);
        return ips;
    }
    const circle1 = Circle(arc1.pc, arc1.r);
    const circle2 = Circle(arc2.pc, arc2.r);
    const ip_tmp = circle1.intersect(circle2);
    for (const pt of ip_tmp) {
        if (pt.on(arc1) && pt.on(arc2)) {
            ips.push(pt);
        }
    }
    return ips;
}
