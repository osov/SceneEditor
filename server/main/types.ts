import { ServerWebSocket } from "bun";
import { NEW_PROJECT_CMD, NEW_FOLDER_CMD, RENAME_CMD, DELETE_CMD, LOAD_PROJECT_CMD, COPY_CMD, GET_PROJECTS_CMD, FSObjectType, SEARCH_CMD, GET_FOLDER_CMD, SAVE_INFO_CMD, GET_INFO_CMD, GET_DATA_CMD, SAVE_DATA_CMD, FILE_UPLOAD_CMD, FSEventType, GET_LOADED_PROJECT_CMD } from "./const";


export type ServerCommands = AssetsCommands;
export type ServerResponses = AssetsResponses;
export type CommandId = keyof ServerCommands;

export type NetMessages = {
    GET_LOADED_PROJECT: VoidMessage,
    LOADED_PROJECT: { project: string | undefined, current_dir: string },
    SERVER_FILE_SYSTEM_EVENT: { path: string, project: string, obj_type: FSObjectType, event_type: FSEventType },
}

export type AssetsCommands = {
    [GET_LOADED_PROJECT_CMD]: VoidMessage,
    [GET_PROJECTS_CMD]: VoidMessage,
    [NEW_PROJECT_CMD]: { project: string },
    [LOAD_PROJECT_CMD]: { project: string },
    [NEW_FOLDER_CMD]: { name: string, path: string },
    [GET_FOLDER_CMD]: { path: string },
    // [SEARCH_CMD]: { name: string },
    [RENAME_CMD]: { path: string, new_path: string },
    [COPY_CMD]: { path: string, new_path: string },
    [DELETE_CMD]: { path: string },
    [SAVE_INFO_CMD]: { path: string, data: TRecursiveDict },
    [GET_INFO_CMD]: { path: string },
    [SAVE_DATA_CMD]: { path: string, data: string },
    [GET_DATA_CMD]: { path: string },
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
};

export type AssetsResponses = {
    [GET_LOADED_PROJECT_CMD]: BaseResp<{ project?: string, current_dir: string }>,
    [GET_PROJECTS_CMD]: BaseResp<string[]>,
    [NEW_PROJECT_CMD]: BaseResp<VoidMessage>,
    [NEW_FOLDER_CMD]: BaseResp<VoidMessage>,
    [GET_FOLDER_CMD]: BaseResp<FSObject[]>,
    // [SEARCH_CMD]: BaseResp<string>,
    [LOAD_PROJECT_CMD]: BaseResp<{assets: FSObject[], name: string}>,
    [RENAME_CMD]: BaseResp<VoidMessage>,
    [COPY_CMD]: BaseResp<VoidMessage>,
    [DELETE_CMD]: BaseResp<VoidMessage>,
    [SAVE_INFO_CMD]: BaseResp<VoidMessage>,
    [GET_INFO_CMD]: BaseResp<TRecursiveDict>,
    [SAVE_DATA_CMD]: BaseResp<VoidMessage>,
    [GET_DATA_CMD]: BaseResp<string>,
    [FILE_UPLOAD_CMD]: BaseResp<FileUploadedData>
};

export type FileUploadedData = { size: number, path: string, name: string, project: string };

type VoidMessage = {};

export type TDictionary<T> = {
    [Key: number | string]: T;
};

export type TRecursiveDict = { [Key: number | string]: TRecursiveDict | number | string };

export interface FSObject { name: string, type: FSObjectType, size: number, path: string, ext?: string, num_files?: number, src?: string };

export interface ExtWebSocket {
    id_session: string;
    project: string;
}

export type WsClient = ServerWebSocket<ExtWebSocket>;

export interface ProtocolWrapper {
    id: string;
    message: any;
}

export type KeyOfType<T, V> = keyof {
    [P in keyof T as T[P] extends V? P: never]: any
}