import { Blending, Euler, MagnificationTextureFilter, MinificationTextureFilter, Vector2, Vector3 } from "three";

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
    id_mesh: number;
    slice: Vector2;
};

export type AnchorEventData = {
    id_mesh: number;
    anchor: Vector2;
};

export type PivotEventData = {
    id_mesh: number;
    pivot: Vector2;
};

export type MeshMoveEventData = {
    id_mesh: number;
    pid: number;
    next_id: number;
};

export type NameEventData = {
    id_mesh: number;
    name: string;
};

export type ActiveEventData = {
    id_mesh: number;
    state: boolean;
};

export type VisibleEventData = {
    id_mesh: number;
    state: boolean;
};

export type ColorEventData = {
    id_mesh: number;
    color: string;
};

export type AlphaEventData = {
    id_mesh: number;
    alpha: number;
};

export type TextureEventData = {
    id_mesh: number;
    texture: string;
};

export type TextEventData = {
    id_mesh: number;
    text: string;
};

export type FontEventData = {
    id_mesh: number;
    font: string;
};

export type FontSizeEventData = ScaleEventData;

export type TextAlignEventData = {
    id_mesh: number;
    text_align: 'left' | 'right' | 'center' | 'justify';
};

export type LineHeightEventData = {
    id_mesh: number;
    line_height: number;
};

export type AtlasEventData = {
    texture_path: string;
    atlas: string;
};

export interface BlendModeEventData {
    id_mesh: number;
    blend_mode: Blending;
}

export interface MinFilterEventData {
    texture_path: string;
    filter: MinificationTextureFilter;
}

export interface MagFilterEventData {
    texture_path: string;
    filter: MagnificationTextureFilter;
}

export interface UVEventData {
    id_mesh: number;
    uv: Float32Array;
}