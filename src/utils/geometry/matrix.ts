import { IMatrix, IVector, PointLike } from "./types";
import { det, determinant, EQ } from "./utils";
import { Vector } from "./vector";


export function Matrix(_a = 1, _b = 0, _c = 0, _d = 1, _tx = 0, _ty = 0) {
    let a = _a;
    let b = _b;
    let c = _c;
    let d = _d;
    let tx = _tx;
    let ty = _ty;
    let matrix = vmath.matrix4();
    
    matrix.m01 = a;
    matrix.m11 = b;
    matrix.m02 = c;
    matrix.m12 = d;
    matrix.m04 = tx;
    matrix.m14 = ty;

    matrix.c0.x = a;
    matrix.c0.y = b;
    matrix.c1.x = c;
    matrix.c1.y = d;
    matrix.c3.x = tx;
    matrix.c3.y = ty;

    const m: IMatrix = {
        a, b, c, d, tx, ty, matrix,
        transform,
        multiply,
        rotate,
        scale,
        translate,
        equalTo,
        isIdentity
    };

    // function invert() {
    //     const _a = m.a;
    //     const _b = m.c;
    //     const _c = m.tx;
    //     const _d = m.b;
    //     const e = m.d;
    //     const f = m.ty;
    //     const g = 0;
    //     const h = 0;
    //     const i = 1;
    //     const D = determinant(m);

    //     const ai = det(e, f, h, i) / D;
    //     const ci = -det(_b, _c, h, i) / D;
    //     const txi = det(_b, _c, e, f) / D;
    //     const bi = -det(_d, f, g, i) / D;
    //     const di = det(_a, _c, g, i) / D;
    //     const tyi = -det(_a, _c, _d, f) / D;

    //     return Matrix(ai, bi, ci, di, txi, tyi);
    // }

    function transform(x: number, y: number) {
        return { x: x * m.a + y * m.c + m.tx, y: x * m.b + y * m.d + m.ty };
    }

    function multiply(other: IMatrix) {
        const am = m.a * other.a + m.c * other.b;
        const bm = m.b * other.a + m.d * other.b;
        const cm = m.a * other.c + m.c * other.d;
        const dm = m.b * other.c + m.d * other.d;
        const txm = m.a * other.tx + m.c * other.ty + m.tx;
        const tym = m.b * other.tx + m.d * other.ty + m.ty;
        m.a = am;
        m.b = bm;
        m.c = cm;
        m.d = dm;
        m.tx = txm;
        m.ty = tym;
        return m;
    }

    function rotate(angle: number, center: IVector | PointLike = { x: 0, y: 0 }) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return m
            .translate(center.x, center.y)
            .multiply(Matrix(cos, sin, -sin, cos, 0, 0))
            .translate(-center.x, -center.y);
    }

    function scale(sx: number, sy: number) {
        return m.multiply(Matrix(sx, 0, 0, sy, 0, 0));
    }

    function translate(x: number, y: number) {
        return m.multiply(Matrix(1, 0, 0, 1, x, y));
    }

    function equalTo(matrix: IMatrix) {
        if (!EQ(m.tx, matrix.tx)) return false;
        if (!EQ(m.ty, matrix.ty)) return false;
        if (!EQ(m.a, matrix.a)) return false;
        if (!EQ(m.b, matrix.b)) return false;
        if (!EQ(m.c, matrix.c)) return false;
        if (!EQ(m.d, matrix.d)) return false;
        return true;
    }

    function isIdentity() {
        return m.a === 1 && m.b === 0 && m.c === 0 && m.d === 1 && m.tx === 0 && m.ty === 0;
    }

    return m;
}
