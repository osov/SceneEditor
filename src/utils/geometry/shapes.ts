import { CW, ShapeNames, TAU } from "./const";
import { IArc, IBox, ICircle, ILine, IPoint, ISegment, IVector } from "./types";
import { normalize } from "./utils";


export function Point(x = 0, y = 0) {
    const name = ShapeNames.Point;

    const p: IPoint = {
        x, y, name
    };

    return p;
}

export function Line(_pt: IPoint | undefined = undefined, _norm: IVector | undefined = undefined) {
    const pt = (_pt) ? _pt : Point();
    const norm = (_norm) ? _norm : Vector(0, 1);
    if (Math.sqrt(norm.x * norm.x + norm.y * norm.y) > 1) normalize(norm);
    const name = ShapeNames.Line;

    const l: ILine = {
        pt, norm, name,
    };

    return l;
}

export function Segment(start: IPoint, _end: IPoint | undefined = undefined) {
    const end = (_end) ? _end : Point();
    const name = ShapeNames.Segment;

    const s: ISegment = {
        name, start, end,
    };

    return s;
}

export function Box(xmin = Infinity, ymin = Infinity, xmax = -Infinity, ymax = -Infinity) {
    const name = ShapeNames.Box;

    const b: IBox = {
        xmin, ymin, xmax, ymax, name, 
    };

    return b;
}

export function Circle(pc: IPoint, r = 0) {
    const name = ShapeNames.Circle;

    const c: ICircle = {
        pc, r, name
    };

    return c;
}

export function Arc(_pc: IPoint | undefined = undefined, r = 1, startAngle = 0, endAngle: number = TAU, cw?: boolean) {
    const pc = (_pc) ? _pc : Point();
    const name = ShapeNames.Arc;
    const clockwise = (cw !== undefined) ? cw : CW;

    const a: IArc = {
        name, pc, r, clockwise, startAngle, endAngle, 
    };

    return a;
}

export function Vector(x = 0, y = 0) {
    const name = ShapeNames.Vector;

    const v: IVector = {
        x, y, name,
    };

    return v;
}
