import {  Object3D, Vector2 } from "three";

export enum IObjectTypes {
    SLICE9_PLANE = 'slice9_plane',
};

export interface IBaseMeshData  {
    type:IObjectTypes;
    mesh_data:{id: number};
    set_size(w: number, h: number): void
    get_size(): Vector2
    get_bounds(): number[]
    set_color(hex_color: string): void
    serialize():any;
}

export type IBaseMeshDataAndThree = IBaseMeshData & Object3D;
    
