import { NULL_VALUE, ShapeNames } from "./const";


export type I_NULL_VALUE = typeof NULL_VALUE;
/** @noSelf **/
export type PointLike = {
    x: number
    y: number
};

/** @noSelf **/
export type AnyShape = IPoint | ISegment | IArc | IBox| ILine | ICircle | IVector;

/** @noSelf **/
export interface Shape {
    name: ShapeNames,
}

/** @noSelf **/
export interface IPoint extends Shape {
    x: number,
    y: number,
}

/** @noSelf **/
export interface ILine extends Shape {
    norm: IVector,
    pt: IPoint,
}

/** @noSelf **/
export interface IBox extends Shape {
    xmin: number,
    ymin: number,
    xmax: number,
    ymax: number,
}

/** @noSelf **/
export interface IVector extends Shape {
    x: number,
    y: number,
}

/** @noSelf **/
export interface ICircle extends Shape {
    pc: IPoint,
    r: number,
}

/** @noSelf **/
export interface ISegment extends Shape {
    start: IPoint,
    end: IPoint,
}

/** @noSelf **/
export interface IArc extends Shape {
    r: number,
    pc: IPoint,
    clockwise: boolean,
    startAngle: number,
    endAngle: number,
}

/** @noSelf **/
export interface IMatrix {
    a: number,
    b: number,
    c: number,
    d: number,
    tx: number,
    ty: number,
    matrix: vmath.matrix4,
    transform(x: number, y: number): PointLike,
    multiply(other: IMatrix): IMatrix,
    rotate(angle: number, center?: PointLike): IMatrix,
    scale(sx: number, sy: number): IMatrix,
    translate(x: number, y: number): IMatrix,
    equalTo(matrix: IMatrix): boolean,
    isIdentity(): boolean,
}