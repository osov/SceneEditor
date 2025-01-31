import { IBaseMeshDataAndThree } from "../render_engine/types";

export type VoidCallback = () => void;
export type Messages = UserMessages & SystemMessages;
export type MessageId = keyof Messages;

export interface VoidMessage { }

export type _SystemMessages = {
    SYS_ENGINE_READY:VoidMessage
    SYS_ON_RESIZED: { width: number, height: number },
    SYS_INPUT_POINTER_MOVE: { x: number, y: number, offset_x: number, offset_y: number, },
    SYS_INPUT_POINTER_DOWN: { x: number, y: number, offset_x: number, offset_y: number, button: number },
    SYS_INPUT_POINTER_UP: { x: number, y: number, offset_x: number, offset_y: number, button: number },
    SYS_VIEW_INPUT_KEY_DOWN: { key: string },
    SYS_VIEW_INPUT_KEY_UP: { key: string },
    SYS_INPUT_UNDO:{}
    SYS_SELECTED_MESH:{mesh:IBaseMeshDataAndThree}
    SYS_SELECTED_MESH_LIST:{list:IBaseMeshDataAndThree[]}
    SYS_UNSELECTED_MESH_LIST:{}
    SYS_ON_UPDATE: { dt: number },
    SYS_GRAPH_SELECTED: { list: number[] },
};


export const _ID_MESSAGES = {
};