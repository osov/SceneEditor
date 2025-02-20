import { IBaseMeshDataAndThree } from "../render_engine/types";
import { ChangeInfo } from "../controls/InspectorControl";

export type VoidCallback = () => void;
export type Messages = UserMessages & SystemMessages;
export type MessageId = keyof Messages;
export type ServerCommands = AssetsCommands;
export type ServerResponses = AssetsResponses;
export type CommandId = keyof ServerCommands;

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
    SYS_INPUT_UNDO: {},
    SYS_SELECTED_MESH: { mesh: IBaseMeshDataAndThree },
    SYS_SELECTED_MESH_LIST: { list: IBaseMeshDataAndThree[] },
    SYS_UNSELECTED_MESH_LIST: {},
    SYS_TRANSFORM_CHANGED: VoidMessage,
    SYS_ON_UPDATE: { dt: number },
    SYS_ON_UPDATE_END: { dt: number },
    SYS_GRAPH_SELECTED: { list: number[] },
    SYS_GRAPH_CHANGE_NAME: { id: number, name: string },
    SYS_GRAPH_MOVED_TO: { pid: number, next_id: number, id_mesh_list: number[] },
    SYS_GRAPH_CLICKED: { id: number },
    SYS_GRAPH_REMOVE: { id: number, list: number[] },
    SYS_GRAPH_KEY_COM_PRESSED: { id: number, list: number[], key: string | number },
    SYS_GRAPH_ADD: { id: number, list: number[], type: string | number },
    SYS_INSPECTOR_UPDATED_VALUE: ChangeInfo,

    ON_WS_CONNECTED: VoidMessage,
    ON_WS_DISCONNECTED: VoidMessage,
    ON_WS_DATA: { data: string },
    TRY_WS_CONNECT: VoidMessage,
    TRY_WS_DISCONNECT: VoidMessage,
    SC_DIR_CHANGED: { project_name: string, dir: string },
};

export const _ID_MESSAGES = {
};

export type AssetsCommands = {
    [GET_PROJECTS_CMD]: VoidMessage,
    [NEW_PROJECT_CMD]: { project: string },
    [NEW_FOLDER_CMD]: { name: string, path: string, project: string },
    [GET_FOLDER_CMD]: { path: string, project: string },
    [SEARCH_CMD]: { name: string, project: string },
    [LOAD_PROJECT_CMD]: { project: string }
    [RENAME_CMD]: { name: string, new_name: string, path: string, project: string },
    [COPY_CMD]: { path: string, new_path: string, project: string },
    [DELETE_CMD]: { name: string, path: string, project: string },
    // [NEW_MATERIAL]: {name: string, path: string, data: IDictionary<string>},
    // [GET_MATERIAL]: {name: string, path: string},
    // [SET_INFO]: {name: string, path: string, data: IDictionary<string>},
    // [GET_INFO]: {name: string, path: string},
}

export type BaseResp<T> = {
    result: number,
    data?: T,
    message?: string,
    error_code?: number,
}

export type AssetsResponses = {
    [GET_PROJECTS_CMD]: BaseResp<FSObject[]>,
    [NEW_PROJECT_CMD]: BaseResp<VoidMessage>,
    [NEW_FOLDER_CMD]: BaseResp<VoidMessage>,
    [GET_FOLDER_CMD]: BaseResp<FSObject[]>,
    [SEARCH_CMD]: BaseResp<string>,
    [LOAD_PROJECT_CMD]: BaseResp<FSObject[]>,
    [RENAME_CMD]: BaseResp<VoidMessage>,
    [COPY_CMD]: BaseResp<VoidMessage>,
    [DELETE_CMD]: BaseResp<VoidMessage>,
}

export type NetMessages = {
    CS_CONNECT: { id_session: number },
    CS_PING: { client_time: number },
    SC_PONG: { client_time: number, server_time: number },
    SC_DIR_CHANGED: { project_name: string, dir: string },
}

export const GET_PROJECTS_CMD = '/get_projects';
export const NEW_PROJECT_CMD = '/new_project';
export const NEW_FOLDER_CMD = '/new_folder';
export const GET_FOLDER_CMD = '/get_folder';
export const LOAD_PROJECT_CMD = '/load_project';
export const SEARCH_CMD = '/search';
export const RENAME_CMD = '/rename';
export const COPY_CMD = '/copy';
export const DELETE_CMD = '/delete';

export const URL_PATHS = {
    TEST: '/test',
    ASSETS: '/assets',
    API: '/api',
}

export enum FSObjectType {
    FOLDER,
    FILE
}

export interface FSObject { name: string, type: FSObjectType, size: number, path: string, ext?: string, num_files?: number, src?: string };

