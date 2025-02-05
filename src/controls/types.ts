import { Euler, Vector2, Vector3 } from "three";

export type PositionEventData = {
    id_mesh: number;
    position: Vector3;
};

export type ScaleEventData = {
    id_mesh: number;
    scale: Vector3;
};

export type RotationEventData = {
    id_mesh: number;
    rotation: Euler;
};

export type SizeEventData = {
    id_mesh: number;
    size: Vector2;
    position: Vector3;
};

export type SliceEventData = {
    id_mesh: number
    slice: Vector2
};

export type AnchorEventData = {
    id_mesh: number
    anchor: Vector2
};

export type PivotEventData = {
    id_mesh: number
    pivot: Vector2
};

export type MeshMoveEventData = {
    id_mesh: number
    pid: number,
    next_id: number
};