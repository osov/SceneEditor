import { Object3D, Vector2, Vector3, Vector3Tuple, Vector4Tuple } from "three";
import { HistoryDataKeys } from "../controls/HistoryControl";

export enum IObjectTypes {
    EMPTY = '',
    ENTITY = 'base_entity',
    SLICE9_PLANE = 'base_slice9',
    TEXT = 'base_text',

    GO_CONTAINER = 'go',
    GO_SPRITE_COMPONENT = 'sprite',
    GO_LABEL_COMPONENT = 'label',
    GO_MODEL_COMPONENT = 'model',

    GUI_CONTAINER = 'gui',
    GUI_BOX = 'box',
    GUI_TEXT = 'text',

    COMPONENT_SPLINE = 'spline',

};

export enum PivotX {
    LEFT = 0,
    CENTER = 0.5,
    RIGHT = 1
}

export enum PivotY {
    TOP = 1,
    CENTER = 0.5,
    BOTTOM = 0
}

export enum HistoryFlags {

}

export type OnTransformChanged = (e: IBaseEntityAndThree) => void;

export interface IBaseEntity {
    type: IObjectTypes;
    mesh_data: { id: number };
    no_saving?: boolean;
    no_removing?: boolean;
    ignore_history?:HistoryDataKeys[];
    set_position(x: number, y: number, z?: number): void
    get_position(): Vector3
    set_scale(x: number, y: number): void
    get_scale(): Vector2
    get_bounds(): number[]
    get_anchor(): Vector2
    set_anchor(x: number, y: number): void
    get_active(): boolean
    set_active(active: boolean): void
    get_visible(): boolean
    set_visible(visible: boolean): void
    serialize(): any;
    deserialize(data: any): void
}

export interface IBaseEntityData {
    id: number;
    pid: number;
    name: string;
    type: IObjectTypes;
    visible: boolean;
    position: Vector3Tuple;
    rotation: Vector4Tuple;
    scale: Vector3Tuple;
    children?: IBaseEntityData[];
    other_data: any;
}

export interface IBaseMesh {
    type: IObjectTypes;
    is_component: boolean;
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
    set_texture(name: string, atlas?: string): void
    get_texture(): string[]
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


export interface IBaseParameters {
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

export type IBaseEntityAndThree = IBaseEntity & Object3D;
export type IBaseMeshAndThree = IBaseMesh & Object3D;
