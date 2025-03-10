export const CMD_PARAM_NAME = 'cmd_id';
export const PATH_PARAM_NAME = 'path';
export const NEW_PATH_PARAM_NAME = 'new_path';
export const PROJECT_PARAM_NAME = 'project';
export const NAME_PARAM_NAME = 'name';
export const NEW_NAME_PARAM_NAME = 'new_name';
export const DATA_PARAM_NAME = 'data';
export const ID_SESSION_PARAM_NAME = 'id_session';
;

export const GET_LOADED_PROJECT_CMD = '/get_loaded_project';
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

export const URL_PATHS = {
    TEST: '/test',
    DOWNLOAD: '/download',
    UPLOAD: FILE_UPLOAD_CMD,
    ASSETS: '/assets',
    API: '/api',
}

export const CMD_NAME = [
    GET_LOADED_PROJECT_CMD,
    GET_PROJECTS_CMD, 
    NEW_PROJECT_CMD, 
    NEW_FOLDER_CMD, 
    GET_FOLDER_CMD, 
    LOAD_PROJECT_CMD, 
    SEARCH_CMD, 
    RENAME_CMD,
    COPY_CMD,
    DELETE_CMD, 
    SAVE_DATA_CMD,
    GET_DATA_CMD,
    SAVE_INFO_CMD,
    GET_INFO_CMD
]

export const PUBLIC = '/public'  // Путь к папке с ассетами проекта
export const METADATA = '/metadata.json'  // Путь к файлу с метаинфо проекта
export const CACHE = '/server_cache.json'

export const ERROR_TEXT = {
    COMMAND_NOT_FOUND: 'Command not found!',
    NO_PROJECT_NAME: 'No project name received!',
    PROJECT_NOT_FOUND: 'Project not found!',
    PROJECT_NOT_LOADED: 'No project loaded!',
    PROJECT_ALREADY_EXISTS: 'A project with the same name already exists!',
    NO_NAME: 'No name received!',
    NO_NEW_NAME: 'No new name received!',
    DIR_NOT_EXIST: 'Path does not exist',
    FOLDER_ALREADY_EXISTS: 'Folder already exists',
    FOLDER_NOT_EXIST: 'Folder does not exist',
    IMAGE_NOT_FOUND: 'Image not found!',
    NO_PATH: 'No path received!',
    NO_FILE_NAME: 'No file name received!',
    WRONG_JSON: 'Request with wrong JSON!',
    NO_DATA: 'No data to save!',
    FILE_NOT_EXISTS: 'File does not exists',
    CANT_WRITE_FILE: 'Could not write file',
    CANT_UPLOAD_FILE: 'Could not upload file',
    NO_NEW_PATH: 'New path not received!',
    NO_NEW_NEW: 'New name not received!',
    COPY_CHANGE_ROOT: `Trying copy or change the project's assets' root folder!`,
    SOME_FIELDS_WRONG: `Some of the command's required params are missing or empty`,
    WRONG_ORIG_EXTENTION: `Wrong extention of the initial file`,
    WRONG_END_EXTENTION: `Wrong extention of the destination file`,
}
