import {  Object3D, Object3DEventMap, Vector2 } from "three";

export interface IBaseMeshData  {
    type:string;
    is_base_mesh: boolean;

    set_size(w: number, h: number): void
    get_size(): Vector2
    get_bounds(): number[]
    set_color(hex_color: string): void
    serialize():any;
}

export type IBaseMeshDataAndThree = IBaseMeshData & Object3D;
    
