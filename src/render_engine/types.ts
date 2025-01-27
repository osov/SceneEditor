import { EulerTuple, Object3D, Vector2, Vector3Tuple } from "three";

export enum IObjectTypes {
    SLICE9_PLANE = 'slice9_plane',
    TEXT = 'text',
};

export interface IBaseMesh {
    type: IObjectTypes;
    mesh_data: { id: number };
    set_size(w: number, h: number): void
    get_size(): Vector2
    get_bounds(): number[]
    get_color(): string
    set_color(hex_color: string): void
    get_pivot(): Vector2
    set_pivot(x: number, y: number, is_sync?:boolean): void
    serialize(): any;
    deserialize(data: any): void
}


export interface IBaseMeshData {
    id: number;
    type: IObjectTypes;
    visible: boolean;
    position: Vector3Tuple;
    rotation: EulerTuple;
    scale: Vector3Tuple;
    size: number[];
    color: string;
    children?: IBaseMeshData[];
    other_data: any;
}

export type IBaseMeshDataAndThree = IBaseMesh & Object3D;

