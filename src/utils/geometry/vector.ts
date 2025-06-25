import { Box } from "./box";
import { ShapeNames, MATRIX_INDENTITY, TAU, POINT_EMPTY, VEC_A, VEC_B } from "./const";
import { Point } from "./point";
import { IMatrix, IVector, PointLike, Shape } from "./types";
import { clone, clone_matrix, EQ, EQ_0, vector_slope } from "./utils";


export function Vector(x = 0, y = 0) {
    const name = ShapeNames.Vector;
    let length = () => Math.sqrt(v.x * v.x + v.y * v.y);
    let center = () => Point(v.x / 2, v.y / 2);
    let slope = () => vector_slope(v.x, v.y);
    let box = () => Box(Math.min(0, v.x), Math.min(0, v.y), Math.max(0, v.x), Math.max(0, v.y));
    const v: IVector = {
        x, y, name, length, center, box, slope,
        multiply, equalTo, contains, dot, cross, translate, scale, normalize,
        transform, add, subtract,
        angleTo, projectionOn, 
    };

    function multiply(scalar: number) {
        v.x = v.x * scalar;
        v.y = v.y * scalar;
        return v;
    }

    function equalTo(_v: IVector) {
        return EQ(v.x, _v.x) && EQ(v.y, _v.y);
    }

    function contains(_other: Shape<unknown>): boolean {
        throw new Error('unimplemented');
    }

    function dot(_v: IVector | PointLike) {
        return v.x * _v.x + v.y * _v.y;
    }

    function cross(_v: IVector) {
        return v.x * _v.y - v.y * _v.x;
    }

    function translate(x: number, y: number) {
        return transform(clone_matrix(MATRIX_INDENTITY).translate(x, y));
    }

    function scale(a: unknown, b?: unknown) {
        return transform(clone_matrix(MATRIX_INDENTITY).scale(a as number, (b ?? a) as number));
    }

    function normalize() {
        const L = length();
        if (!EQ_0(length())) {
            v.x = v.x / L;
            v.y = v.y / L;
            return v;
        }
        throw new Error('zero division while trying normalize a vector');
    }

    function transform(m: IMatrix) {
        const t = m.transform(v.x, v.y);
        v.x = t.x;
        v.y = t.y;
        return v;
    }

    function add(_v: IVector) {
        v.x = v.x + _v.x;
        v.y = v.y + _v.y;
        return v;
    }

    function subtract(_v: IVector) {
        v.x = v.x - _v.x;
        v.y = v.y - _v.y;
        return v;
    }

    /**
     * Return angle between this vector and other vector. <br/>
     * Angle is measured from 0 to 2*PI in the counterclockwise direction
     * from current vector to  another.
     */
    function angleTo(_v: IVector) {
        VEC_A.x = v.x;
        VEC_A.y = v.y;
        VEC_A.normalize();
        VEC_B.x = _v.x;
        VEC_B.y = _v.y;
        VEC_B.normalize();
        let angle = Math.atan2(VEC_A.cross(VEC_B), VEC_A.dot(VEC_B));
        if (angle < 0) angle += TAU;
        return angle;
    }

    /**
     * Return vector projection of the current vector on another vector
     */
    function projectionOn(_v: IVector) {
        VEC_A.x = _v.x;
        VEC_A.y = _v.y;
        VEC_A.normalize();
        const d = dot(VEC_A);
        return clone(VEC_A).multiply(d);
    }

    return v;
}