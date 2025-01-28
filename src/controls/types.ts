import { Euler,  Vector2, Vector3 } from "three";

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