import { WatchEventType } from "fs";
import { IBaseMeshDataAndThree, TRecursiveDict } from "../render_engine/types";
import { ChangeInfo } from "../controls/InspectorControl";
import { VoidMessage } from "../modules/modules_const";
import { FileUploadedData, FSObject, FSObjectType } from "../controls/AssetControl";

export type ServerCommands = AssetsCommands;
export type ServerResponses = AssetsResponses;
export type CommandId = keyof ServerCommands;

export type _SystemMessagesEditor = {
    SYS_INPUT_UNDO: {},
    SYS_SELECTED_MESH: { mesh: IBaseMeshDataAndThree },
    SYS_SELECTED_MESH_LIST: { list: IBaseMeshDataAndThree[] },
    SYS_UNSELECTED_MESH_LIST: {},
    SYS_DATA_UPDATED: VoidMessage,
    SYS_GRAPH_SELECTED: { list: number[] },
    SYS_GRAPH_CHANGE_NAME: { id: number, name: string },
    SYS_GRAPH_MOVED_TO: { pid: number, next_id: number, id_mesh_list: number[] },
    SYS_GRAPH_CLICKED: { id: number },
    SYS_GRAPH_REMOVE: { id: number, list: number[] },
    SYS_GRAPH_KEY_COM_PRESSED: { id: number, list: number[], key: string | number },
    SYS_GRAPH_ADD: { id: number, list: number[], type: string | number },
    SYS_INSPECTOR_UPDATED_VALUE: ChangeInfo,
    SYS_FILE_UPLOADED: FileUploadedData,
    SYS_CLICK_ON_FILE_ASSET: { name: string, path: string, project: string },
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
    [DELETE_CMD]: { path: string, project: string },
    [SAVE_INFO_CMD]: { path: string, project: string, data: TRecursiveDict },
    [GET_INFO_CMD]: { path: string, project: string },
    [SAVE_DATA_CMD]: { path: string, project: string, data: string },
    [GET_DATA_CMD]: { path: string, project: string },
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
    [LOAD_PROJECT_CMD]: BaseResp<{ assets: FSObject[], name: string }>,
    [RENAME_CMD]: BaseResp<VoidMessage>,
    [COPY_CMD]: BaseResp<VoidMessage>,
    [DELETE_CMD]: BaseResp<VoidMessage>,
    [SAVE_INFO_CMD]: BaseResp<VoidMessage>,
    [GET_INFO_CMD]: BaseResp<TRecursiveDict>,
    [SAVE_DATA_CMD]: BaseResp<VoidMessage>,
    [GET_DATA_CMD]: BaseResp<string>,
    [FILE_UPLOAD_CMD]: BaseResp<FileUploadedData>
}

export type NetMessagesEditor = {
    CLIENT_CONNECT: { id_session: number },
    SERVER_FILE_SYSTEM_EVENT: { path: string, project: string, obj_type: FSObjectType, event_type: WatchEventType },
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
export const SAVE_DATA_CMD = '/save_data';
export const GET_DATA_CMD = '/get_data';
export const SAVE_INFO_CMD = '/save_info';
export const GET_INFO_CMD = '/get_info';
export const FILE_UPLOAD_CMD = '/upload';
export const METADATA = '/metadata.txt'

export const URL_PATHS = {
    TEST: '/test',
    DOWNLOAD: '/download',
    UPLOAD: '/upload',
    ASSETS: '/assets',
    API: '/api',
}
