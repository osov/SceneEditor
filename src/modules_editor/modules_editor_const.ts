import { WatchEventType } from "fs";
import { IBaseMeshAndThree } from "../render_engine/types";
import { VoidMessage } from "../modules/modules_const";
import { Vector2, Vector2Like } from "three";

export type ServerCommands = AssetsCommands;
export type ServerResponses = AssetsResponses;
export type CommandId = keyof ServerCommands;

export type _SystemMessagesEditor = {
    SYS_INPUT_UNDO: {},
    SYS_INPUT_SAVE: {},
    SYS_INPUT_DBL_CLICK: {},
    SYS_SELECTED_MESH: { mesh: IBaseMeshAndThree },
    SYS_SELECTED_MESH_LIST: { list: IBaseMeshAndThree[] },
    SYS_UNSELECTED_MESH_LIST: {},
    SYS_GRAPH_SELECTED: { list: number[] },
    SYS_GRAPH_CHANGE_NAME: { id: number, name: string },
    SYS_GRAPH_MOVED_TO: { pid: number, next_id: number, id_mesh_list: number[] },
    SYS_GRAPH_CLICKED: { id: number },
    SYS_GRAPH_REMOVE: { id: number, list: number[] },
    SYS_GRAPH_KEY_COM_PRESSED: { id: number, list: number[], key: string | number },
    SYS_GRAPH_ADD: { id: number, list: number[], type: string | number },
    SYS_GRAPH_ACTIVE: { list: { id: number, visible: boolean }[], state: boolean },
    SYS_GRAPH_VISIBLE: { list: number[], state: boolean },
    SYS_GRAPH_DROP_IN_ASSETS: number,
    SYS_FILE_UPLOADED: FileUploadedData,
    SYS_ASSET_COPIED: { name: string, path: string, new_path: string },
    SYS_ASSET_MOVED: { name: string, path: string, new_path: string },
    SYS_ASSET_DELETED: { name: string, path: string },
    SYS_CLICK_ON_ASSET: { name: string, path: string, ext: string, button: number },
    SYS_COPY_CMD: { path: string, new_path: string },
    NEW_FOLDER_CMD: { name: string, path: string },
    SYS_ASSETS_SELECTED_TEXTURES: { paths: string[] },
    SYS_ASSETS_SELECTED_MATERIALS: { paths: string[] },
    SYS_ASSETS_CLEAR_SELECTED: {},
    SYS_CHANGED_ATLAS_DATA: {},
    MATERIAL_CHANGED: TMaterialChanged,
    MATERIAL_COPY_CHANGED: TMaterialChanged,
};


export type AssetsCommands = {
    [GET_SERVER_DATA_CMD]: VoidMessage,
    [SET_CURRENT_SCENE_CMD]: { path: string },
    [GET_PROJECTS_CMD]: VoidMessage,
    [NEW_PROJECT_CMD]: { project: string },
    [LOAD_PROJECT_CMD]: { project: string },
    [NEW_FOLDER_CMD]: { name: string, path: string },
    [GET_FOLDER_CMD]: { path: string },
    [RENAME_CMD]: { path: string, new_path: string },
    [COPY_CMD]: { path: string, new_path: string },
    [MOVE_CMD]: { path: string, new_path: string },
    [DELETE_CMD]: { path: string },
    [SAVE_INFO_CMD]: { path: string, data: TRecursiveDict },
    [GET_INFO_CMD]: { path?: string },
    [DEL_INFO_CMD]: { path: string },
    [SAVE_DATA_CMD]: { path: string, data: string, format: DataFormatType },
    [GET_DATA_CMD]: { path: string },
    [OPEN_EXPLORER_CMD]: { path: string },
    // [NEW_MATERIAL]: {name: string, path: string, data: IDictionary<string>},
    // [GET_MATERIAL]: {name: string, path: string},
}

export type AssetsResponses = {
    [GET_SERVER_DATA_CMD]: BaseResp<ServerData>,
    [SET_CURRENT_SCENE_CMD]: BaseResp<{ name?: string, path?: string }>,
    [GET_PROJECTS_CMD]: BaseResp<string[]>,
    [NEW_PROJECT_CMD]: BaseResp<VoidMessage>,
    [NEW_FOLDER_CMD]: BaseResp<VoidMessage>,
    [GET_FOLDER_CMD]: BaseResp<FSObject[]>,
    [LOAD_PROJECT_CMD]: BaseResp<ProjectLoadData>,
    [RENAME_CMD]: BaseResp<VoidMessage>,
    [COPY_CMD]: BaseResp<VoidMessage>,
    [MOVE_CMD]: BaseResp<VoidMessage>,
    [DELETE_CMD]: BaseResp<VoidMessage>,
    [SAVE_INFO_CMD]: BaseResp<VoidMessage>,
    [GET_INFO_CMD]: BaseResp<TRecursiveDict>,
    [DEL_INFO_CMD]: BaseResp<VoidMessage>,
    [SAVE_DATA_CMD]: BaseResp<VoidMessage>,
    [GET_DATA_CMD]: BaseResp<string>,
    [OPEN_EXPLORER_CMD]: BaseResp<VoidMessage>,
    [FILE_UPLOAD_CMD]: BaseResp<FileUploadedData>
}

export type BaseResp<T> = {
    result: number,
    data?: T,
    message?: string,
    error_code?: number,
}

export type LoadAtlasData = { atlas: string, texture: string }

export type ProjectPathsData = {
    textures: string[],
    fonts: string[],
    atlases: LoadAtlasData[],
    models: string[],
    materials: string[],
    vertex_programs: string[],
    fragment_programs: string[],
}
export type ProjectLoadData = { assets: FSObject[], name: string, paths: ProjectPathsData }
export type ProjectCache = { name?: string, current_dir: string, current_scene: { name?: string, path?: string } }
export type ServerData = {
    project: string | undefined,
    dir: string,
    scene: { path?: string, name?: string },
}

export type NetMessagesEditor = {
    GET_LOADED_PROJECT: VoidMessage,
    LOADED_PROJECT: { name: string | undefined, current_dir: string },
    SERVER_FILE_SYSTEM_EVENTS: { events: FSEvent[] },
}

export type FileUploadedData = { size: number, path: string, name: string, project: string, ext: string };

export type FSEvent = { path: string, folder_path: string, project: string, obj_type: FSObjectType, event_type: FSEventType, ext?: string };

export type DataFormatType = "string" | "base64";

export type FSObjectType = "folder" | "file" | "null";

export type AssetType = "folder" | "material" | "texture" | "scene_graph" | "other";

export type FSEventType = WatchEventType | "remove";

export interface FSObject { name: string, type: FSObjectType, size: number, path: string, ext?: string, num_files?: number, src?: string };

export const ASSET_TEXTURE: AssetType = "texture";
export const ASSET_SCENE_GRAPH: AssetType = "scene_graph";
export const ASSET_MATERIAL: AssetType = "material";
export const GET_SERVER_DATA_CMD = '/server_data';
export const SET_CURRENT_SCENE_CMD = '/set_current_scene';
export const GET_PROJECTS_CMD = '/get_projects';
export const NEW_PROJECT_CMD = '/new_project';
export const NEW_FOLDER_CMD = '/new_folder';
export const GET_FOLDER_CMD = '/get_folder';
export const LOAD_PROJECT_CMD = '/load_project';
export const SEARCH_CMD = '/search';
export const RENAME_CMD = '/rename';
export const COPY_CMD = '/copy';
export const MOVE_CMD = '/move';
export const DELETE_CMD = '/delete';
export const SAVE_DATA_CMD = '/save_data';
export const GET_DATA_CMD = '/get_data';
export const SAVE_INFO_CMD = '/save_info';
export const GET_INFO_CMD = '/get_info';
export const DEL_INFO_CMD = '/del_info';
export const OPEN_EXPLORER_CMD = '/open_explorer';
export const FILE_UPLOAD_CMD = '/upload';
export const PUBLIC = '/public'  // Путь к папке с ассетами проекта
export const METADATA = '/metadata.json'  // Путь к файлу с метаинфо проекта
export const CACHE = '/server_cache.json';
export const SCENE_EXT = `scn`;
export const ATLAS_EXT = `tpsheet`;
export const MATERIAL_EXT = `mtr`;
export const VERTEX_PROGRAM_EXT = `vp`;
export const FRAGMENT_PROGRAM_EXT = `fp`;
export const FONT_EXT = `ttf`;

export const CMD_NAME = [
    GET_SERVER_DATA_CMD,
    SET_CURRENT_SCENE_CMD,
    GET_PROJECTS_CMD,
    NEW_PROJECT_CMD,
    NEW_FOLDER_CMD,
    GET_FOLDER_CMD,
    LOAD_PROJECT_CMD,
    SEARCH_CMD,
    RENAME_CMD,
    COPY_CMD,
    MOVE_CMD,
    DELETE_CMD,
    SAVE_DATA_CMD,
    GET_DATA_CMD,
    SAVE_INFO_CMD,
    GET_INFO_CMD,
    DEL_INFO_CMD,
    OPEN_EXPLORER_CMD,
]

export const allowed_ext = ['mtr', 'prt', 'pss', 'txt', 'jpg', 'jpeg', 'png', 'gif', 'gltf', 'glb', 'obj', 'smpl', 'prt', 'fbx', 'mp3', 'ogg', 'tpsheet', 'fbx', 'ttf', 'scn'];
export const texture_ext = ['jpg', 'jpeg', 'png'];
export const model_ext = ['gltf', 'glb', `fbx`,];

export const URL_PATHS = {
    TEST: '/test',
    UPLOAD: '/upload',
    ASSETS: '/assets',
    API: '/api',
}

export interface ProtocolWrapper {
    id: string;
    message: any;
}

export type TDictionary<T> = { [key: number | string]: T };

export type TRecursiveDict = { [Key: number | string]: TRecursiveDict | number | string };
export type TMaterialChanged = { material_name: string, is_uniform: boolean, property: string, value: any };
