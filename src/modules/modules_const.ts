import { ObjectData } from "../controls/InspectorControl";
import { IBaseMeshDataAndThree } from "../render_engine/types";

export type VoidCallback = () => void;
export type Messages = UserMessages & SystemMessages;
export type MessageId = keyof Messages;

export interface VoidMessage { }

type HTMLElementOrNull = EventTarget | null;

export type _SystemMessages = {
    SYS_ENGINE_READY: VoidMessage
    SYS_ON_RESIZED: { width: number, height: number },
    SYS_INPUT_POINTER_MOVE: { x: number, y: number, offset_x: number, offset_y: number, target: HTMLElementOrNull },
    SYS_INPUT_POINTER_DOWN: { x: number, y: number, offset_x: number, offset_y: number, button: number, target: HTMLElementOrNull },
    SYS_INPUT_POINTER_UP: { x: number, y: number, offset_x: number, offset_y: number, button: number, target: HTMLElementOrNull },
    SYS_VIEW_INPUT_KEY_DOWN: { key: string, target: HTMLElementOrNull },
    SYS_VIEW_INPUT_KEY_UP: { key: string, target: HTMLElementOrNull },
    SYS_INPUT_UNDO: {}
    SYS_SELECTED_MESH: { mesh: IBaseMeshDataAndThree }
    SYS_SELECTED_MESH_LIST: { list: IBaseMeshDataAndThree[] }
    SYS_UNSELECTED_MESH_LIST: {}
    SYS_ON_UPDATE: { dt: number },
    SYS_ON_UPDATE_END: { dt: number },
    SYS_GRAPH_SELECTED: { list: number[] },
    SYS_GRAPH_CHANGE_NAME: { id: number, name: string },
    SYS_GRAPH_MOVED_TO: { pid: number, next_id: number, id_mesh_list: number[] },
    SYS_GRAPH_CLICKED: { id: number },
    SYS_GRAPH_REMOVE: { id: number },
    SYS_GRAPH_KEY_COM_PRESSED: { id: number, key: string },
    SYS_INSPECTOR_UPDATED_VALUE: ObjectData,
};


export const _ID_MESSAGES = {
};