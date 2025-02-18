import { Object3D, Vector2, Vector3, Vector3Tuple, Vector4Tuple } from "three";

export enum IObjectTypes {
    EMPTY = '',
    SLICE9_PLANE = 'slice9',
    TEXT = 'text',

    GO_CONTAINER = 'go_container',
    GO_SPRITE = 'go_sprite',
    GO_TEXT = 'go_text',

    GUI_CONTAINER = 'gui_container',
    GUI_BOX = 'gui_box',
    GUI_TEXT = 'gui_text',
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

export type OnTransformChanged = (e:IBaseMeshDataAndThree) => void;

export interface IBaseMesh {
    type: IObjectTypes;
    mesh_data: { id: number };
    set_position(x: number, y: number, z?: number): void
    get_position(): Vector3
    set_size(w: number, h: number): void
    get_size(): Vector2
    set_scale(x: number, y: number): void
    get_scale(): Vector2
    get_bounds(): number[]
    get_color(): string
    set_color(hex_color: string): void
    get_pivot(): Vector2
    set_pivot(x: PivotX, y: PivotY, is_sync?: boolean): void
    get_anchor(): Vector2
    set_anchor(x: number, y: number): void
    get_active(): boolean
    set_active(active: boolean): void
    get_visible(): boolean
    set_visible(visible: boolean): void
    transform_changed(): void
    on_transform_changed?: OnTransformChanged;
    serialize(): any;
    deserialize(data: any): void
}


export interface IBaseMeshData {
    id: number;
    pid: number;
    name: string;
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

export interface IBaseParametersEntity {
    width: number;
    height: number;
    pivot_x: number;
    pivot_y: number;
    anchor_x: number;
    anchor_y: number;
    slice_width: number;
    slice_height: number;
    color: string;
    clip_width: number;
    clip_height: number;
    texture: string;
    atlas: string
}

export type IBaseMeshDataAndThree = IBaseMesh & Object3D;

