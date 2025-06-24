import { Box } from "./box";
import { Circle } from "./circle";
import { Line } from "./line";
import { Matrix } from "./matrix";
import { Point } from "./point";
import { clone } from "./utils";
import { Vector } from "./vector";

// export const tm = vmath.matrix4();
// export const tv = vmath.vector3();

export const DP_TOL = 0.000001;
export const TAU = 2 * Math.PI;

export enum ShapeNames {
    // Edge shapes
    Segment = 'segment',
    Arc = 'arc',

    // Non-edge shapes
    Box = 'box',
    Circle = 'circle',
    Ray = 'ray',
    Line = 'line',
    Point = 'point',
    Vector = 'vector',
}

export const MATRIX_INDENTITY = Matrix(1, 0, 0, 1, 0, 0);
export const MATRIX_REFLECTION_X = Matrix(-1, 0, 0, 1, 0, 0);
export const MATRIX_REFLECTION_Y = Matrix(1, 0, 0, -1, 0, 0);
export const MATRIX_EMPTY = Matrix(0, 0, 0, 0, 0, 0);
export const POINT_EMPTY = Point(0, 0);
export const CIRCLE_EMPTY = Circle(clone(POINT_EMPTY), 0);
export const VOID_BOX = Box(Infinity, Infinity, -Infinity, -Infinity);
export const NULL_VALUE = { null: true };

// Для хранения данных
export const VEC_A = Vector();
export const VEC_B = Vector();
export const VEC_C = Vector();
export const LINE_A = Line()

export const CW = true;
export const CCW = false;
