import { NULL_VALUE, ShapeNames } from "./const";


export type I_NULL_VALUE = typeof NULL_VALUE;
/** @noSelf **/
export type PointLike = {
    x: number
    y: number
};

/** @noSelf **/
export type AnyShape = Shape<IPoint> | Shape<ISegment> | Shape<IArc> | Shape<IBox> | Shape<ILine> | Shape<ICircle> | Shape<IVector>;

/** @noSelf **/
export interface Shape<T = unknown> {
    name: ShapeNames,
    center(): IPoint,
    box(): IBox,
    translate(x: number, y: number): T,
    rotate(angle: number, center?: PointLike): T,
    scale(s: number): T,
    contains(other: Shape<unknown>): boolean
    transform(m: IMatrix): T,
}

/** @noSelf **/
export interface IPoint extends Shape<IPoint> {
    x: number,
    y: number,
    equalTo(other: IPoint): boolean,
    lessThan(pt: IPoint): boolean,
    projectionOn(line: ILine): IPoint,
    leftTo(line: ILine): boolean,
    distanceTo(shape: Shape): [number, ISegment],
    on(shape: Shape<any>): boolean,
}

/** @noSelf **/
export interface ILine extends Shape<ILine> {
    norm: IVector,
    pt: IPoint,
    length(): number,
    vector(): IVector,
    slope(): number,
    standard(): readonly [number, number, number],
    parallelTo(other_line: ILine): boolean,
    incidentTo(other_line: ILine): boolean,
    coord(pt: IPoint): number,
    intersect(s: Shape): IPoint[],
    distanceTo(s: Shape): [number, ISegment],
    sortPoints(pts: IPoint[]): IPoint[],
}

/** @noSelf **/
export interface IBox extends Shape<IBox> {
    xmin: number,
    ymin: number,
    xmax: number,
    ymax: number,
    width: number,
    height: number,
    low: IPoint,
    high: IPoint,
    intersect(other: IBox): boolean,
    merge(otherIBox: IBox): IBox,
    equalTo(otherIBox: IBox): boolean,
    lessThan(otherIBox: IBox): boolean,
    toPoints(): IPoint[],
    toSegments(): ISegment[],
}

/** @noSelf **/
export interface IVector extends Shape<IVector> {
    x: number,
    y: number,
    length(): number,
    slope(): number,
    normalize(): IVector,
    multiply(scalar: number): IVector,
    dot(v: IVector): number,
    cross(v: IVector): number,
    rotate90CW(): IVector,
    rotate90CCW(): IVector,
    invert(): IVector,
    add(v: IVector): IVector,
    subtract(v: IVector): IVector,
    angleTo(v: IVector): number,
    projectionOn(v: IVector): IVector
    equalTo(other: IVector): boolean,
}

/** @noSelf **/
export interface ICircle extends Shape<ICircle> {
    pc: IPoint,
    r: number,
    toArc(counterclockwise?: boolean): IArc,
    intersect(_shape: Shape): IPoint[],
    distanceTo(_shape: Shape): [number, ISegment],
}

/** @noSelf **/
export interface ISegment extends Shape<ISegment> {
    start: IPoint,
    end: IPoint,
    vertices(): IPoint[],
    vector(): IVector,
    slope(): number,
    length(): number,
    isZeroLength(): boolean,
    equalTo(seg: ISegment): boolean,
    intersect(_shape: Shape): IPoint[],
    pointAtLength(length: number): IPoint,
    distanceTo(_shape: Shape): [number, ISegment],
    distanceToPoint(point: IPoint): number,
    tangentInStart(): IVector,
    tangentInEnd(): IVector,
    reverse(this: any): ISegment,
    split(point: IPoint): (ISegment | I_NULL_VALUE)[],
    splitAtLength(length: number): (ISegment | I_NULL_VALUE)[],
}

/** @noSelf **/
export interface IArc extends Shape<IArc> {
    r: number,
    pc: IPoint,
    clockwise: boolean,
    startAngle: number,
    endAngle: number,
    start(): IPoint,
    end(): IPoint,
    sweep(): number,
    vertices(): IPoint[],
    length(): number,
    reverse(this: any): IArc,
    intersect(_shape: Shape): IPoint[],
    split(pt: IPoint): (IArc | I_NULL_VALUE)[],
    splitAtLength(length: number): (IArc | I_NULL_VALUE)[],
    middle(): IPoint,
    pointAtLength(at_length: number): IPoint | null,
    distanceTo(_shape: Shape): [number, ISegment],
    tangentInStart(): IVector,
    tangentInEnd(): IVector,
    sortPoints(pts: IPoint[]): IPoint[],
    breakToFunctional(): IArc[],
}

/** @noSelf **/
export interface IMatrix {
    a: number,
    b: number,
    c: number,
    d: number,
    tx: number,
    ty: number,
    transform(x: number, y: number): PointLike,
    multiply(other: IMatrix): IMatrix,
    rotate(angle: number, center?: PointLike): IMatrix,
    scale(sx: number, sy: number): IMatrix,
    translate(x: number, y: number): IMatrix,
    equalTo(matrix: IMatrix): boolean,
    isIdentity(): boolean,
}