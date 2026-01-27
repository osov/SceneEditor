// Модуль трансформаций геометрических фигур

import { ShapeNames } from "../const";
import { Point } from "../shapes";
import type { AnyShape, ICircle, ILine, IPoint, ISegment, IVector, PointLike } from "../types";

export function rotate_simple(p: IPoint | IVector, angle: number, center: PointLike) {
    const c = Math.cos(angle), s = Math.sin(angle);
    const x = p.x - center.x;
    const y = p.y - center.y;
    p.x = x * c - y * s + center.x;
    p.y = x * s + y * c + center.y;
}

export function rotate<T extends AnyShape>(shape: T, angle: number, _center: PointLike | undefined = undefined) {
    const center = (_center) ? _center : Point();
    if (shape.name == ShapeNames.Point) {
        const p = shape as IPoint;
        rotate_simple(p, angle, center);
    }

    else if (shape.name == ShapeNames.Vector) {
        const v = shape as IVector;
        rotate_simple(v, angle, center);
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

// Импортируется из shape_ops для избежания циклической зависимости
// transform использует shape_box и box_to_points, поэтому остаётся в shape_ops.ts
