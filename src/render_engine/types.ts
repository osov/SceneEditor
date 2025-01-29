import { Object3D, Vector2, Vector3Tuple, Vector4Tuple } from "three";

export enum IObjectTypes {
    SLICE9_PLANE = 'box',
    TEXT = 'text',
    GO_CONTAINER = 'go_empty',
    GUI_CONTAINER = 'gui_empty',
};

export enum PivotX {
    LEFT = 0,
    CENTER = 0.5,
    RIGHT = 1
}

export enum PivotY{
    TOP = 1,
    CENTER = 0.5,
    BOTTOM = 0
}

export interface IBaseMesh {
    type: IObjectTypes;
    mesh_data: { id: number };
    set_size(w: number, h: number): void
    get_size(): Vector2
    get_bounds(): number[]
    get_color(): string
    set_color(hex_color: string): void
    get_pivot(): Vector2
    set_pivot(x: PivotX, y: PivotY, is_sync?: boolean): void
    serialize(): any;
    deserialize(data: any): void
}


export interface IBaseMeshData {
    id: number;
    pid: number;
    type: IObjectTypes;
    visible: boolean;
    position: Vector3Tuple;
    rotation: Vector4Tuple;
    scale: Vector3Tuple;
    pivot: Vector2;
    size: number[];
    color: string;
    children?: IBaseMeshData[];
    other_data: any;
}

export type IBaseMeshDataAndThree = IBaseMesh & Object3D;

