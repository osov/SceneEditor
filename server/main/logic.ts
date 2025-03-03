
import path from "path";
import { PATH_PARAM_NAME, NEW_PROJECT_CMD, ERROR_TEXT, DELETE_CMD, LOAD_PROJECT_CMD, NEW_FOLDER_CMD, NEW_NAME_PARAM_NAME, NAME_PARAM_NAME, COPY_CMD, PROJECT_PARAM_NAME, GET_PROJECTS_CMD, SEARCH_CMD, RENAME_CMD, GET_FOLDER_CMD, SAVE_INFO_CMD, GET_INFO_CMD, DATA_PARAM_NAME, SAVE_DATA_CMD, GET_DATA_CMD, NEW_PATH_PARAM_NAME, ID_SESSION_PARAM_NAME, PUBLIC, GET_LOADED_PROJECT_CMD, } from "./const";
import { check_dir_exists, exists, get_asset_path, get_full_path, get_assets_folder_path, get_metadata_path, new_folder, read_dir_assets, rename, get_data_file_path, remove_path, copy, get_data_folder_path, new_project, is_folder, mk_dir } from "./fs_utils";
import { CommandId, ServerCommands, ServerResponses, TRecursiveDict, } from "./types";


const project_name_required_commands = [
    LOAD_PROJECT_CMD, 
    NEW_PROJECT_CMD, 
];
const project_exists_required_commands = [
    LOAD_PROJECT_CMD, 
];

const loaded_project_required_commands = [
    GET_DATA_CMD,
    GET_INFO_CMD,
    SAVE_DATA_CMD,
    SAVE_INFO_CMD,
    NEW_FOLDER_CMD,
    GET_FOLDER_CMD,
    COPY_CMD,
    RENAME_CMD,
    DELETE_CMD,
]

const allowed_ext = ['mtr', 'prt', 'pss', 'txt', 'jpg','jpeg','png','gif','gltf','glb','obj','mtr','smpl','prt','fbx','mp3','ogg'];

export async function handle_command<T extends CommandId>(project: string, cmd_id: T, params: object) {
    log('params: ', params)

    async function on_get_projects() {
        const projects_list: string[] = []
        const working_folder_content = await read_dir_assets(get_full_path(''));
        for (const proj of working_folder_content) {
            const assets_folder_path = get_assets_folder_path(proj.name);
            if (await exists(assets_folder_path) && await is_folder(assets_folder_path))
                projects_list.push(proj.name)
        }
        const response: ServerResponses[typeof GET_PROJECTS_CMD] = {data: projects_list, result: 1};
        return response;    
    }
    
    async function on_load_project(cmd: ServerCommands[typeof LOAD_PROJECT_CMD]): Promise<ServerResponses[typeof LOAD_PROJECT_CMD]> {
        const assets_folder_path = get_assets_folder_path(cmd.project);
        const assets = await read_dir_assets(assets_folder_path);
        return {result: 1, data: {assets, name: cmd.project}};
    }
    
    async function on_new_project(cmd: ServerCommands[typeof NEW_PROJECT_CMD]): Promise<ServerResponses[typeof NEW_PROJECT_CMD]> {
        const assets_folder_path = get_assets_folder_path(cmd.project);
        const project_exists = await check_dir_exists(assets_folder_path);
        if (project_exists) return {message: ERROR_TEXT.PROJECT_ALREADY_EXISTS, result: 0};
        new_project(cmd.project);
        return {result: 1};
    }
    
    async function on_save_data(cmd: ServerCommands[typeof SAVE_DATA_CMD]): Promise<ServerResponses[typeof SAVE_DATA_CMD]> {
        const data_path = get_data_file_path(project, cmd.path);
        const new_data = cmd.data;
        try {
            await Bun.write(data_path, JSON.stringify(new_data));
            return {result: 1};
    
        } catch (e) {
            return {result: 0, message: `${ERROR_TEXT.CANT_WRITE_FILE}: ${e}`};
        }
    }
    
    async function on_get_data(cmd: ServerCommands[typeof GET_DATA_CMD]): Promise<ServerResponses[typeof GET_DATA_CMD]> {
        const data_path = get_data_file_path(project, cmd.path);
        const file_exists = await exists(data_path);
        if (!file_exists)
            return {message: ERROR_TEXT.FILE_NOT_EXISTS, result: 0};
        const data_file = Bun.file(data_path);
        const data = await data_file.text();
        return {result: 1, data};
    }
    
    async function on_new_folder(cmd: ServerCommands[typeof NEW_FOLDER_CMD]): Promise<ServerResponses[typeof NEW_FOLDER_CMD]> {
        const folder_path = get_asset_path(project, path.join(cmd.path, cmd.name));
        const dir_exists = await check_dir_exists(folder_path);
        if (dir_exists)
            return {message: `${ERROR_TEXT.FOLDER_ALREADY_EXISTS}: ${folder_path}`, result: 0};
        await mk_dir(folder_path);
        const data = {path: path.relative(get_assets_folder_path(project), folder_path).split("\\").join("/")}
        return {result: 1, data};
    }
    
    async function on_get_folder(cmd: ServerCommands[typeof GET_FOLDER_CMD]): Promise<ServerResponses[typeof GET_FOLDER_CMD]> {
        const folder_path = get_asset_path(project, cmd.path);
        const dir_exists = await check_dir_exists(folder_path);
        if (!dir_exists)
            return {message: `${ERROR_TEXT.DIR_NOT_EXIST}: ${folder_path}`, result: 0};
        const root_folder = get_assets_folder_path(project);
        const dir_content = await read_dir_assets(folder_path, root_folder);
        return {result: 1, data: dir_content};
    }
    
    async function on_rename(cmd: ServerCommands[typeof RENAME_CMD]): Promise<ServerResponses[typeof RENAME_CMD]> {
        const old_path = get_asset_path(project, cmd.path);
        const file_exists = await exists(old_path);
        if (!file_exists)
            return {message: `${ERROR_TEXT.FILE_NOT_EXISTS}: ${old_path}`, result: 0};
        const old_path_dirname = path.dirname(old_path);
        const new_path = path.join(old_path_dirname, cmd.new_name);
        const ext1 = path.extname(old_path).slice(1);
        const ext2 = path.extname(new_path).slice(1);
        if (!allowed_ext.includes(ext1))
            return {result: 0, message: ERROR_TEXT.WRONG_ORIG_EXTENTION};
        if (!allowed_ext.includes(ext2))
            return {result: 0, message: ERROR_TEXT.WRONG_END_EXTENTION};
        await rename(old_path, new_path);
        return {result: 1, data: {new_path}};
    }
    
    async function on_copy(cmd: ServerCommands[typeof COPY_CMD]): Promise<ServerResponses[typeof COPY_CMD]> {
        // Не разрешаем делать копирование/замену корневой папки ассетов проекта
        if (cmd.path === "" || cmd.new_path === "")
            return {message: ERROR_TEXT.COPY_CHANGE_ROOT, result: 0};
        const old_path = get_asset_path(project, cmd.path);
        const file_exists = await exists(old_path);
        if (!file_exists)
            return {message: `${ERROR_TEXT.FILE_NOT_EXISTS}: ${old_path}`, result: 0};
        const new_path = get_asset_path(project, cmd.new_path);
        await copy(old_path, new_path);
        return {result: 1, data: {new_path}};
    }
    
    async function on_delete(cmd: ServerCommands[typeof DELETE_CMD]): Promise<ServerResponses[typeof DELETE_CMD]> {
        const asset_path = get_asset_path(project, cmd.path);
        const root_dir_content = await remove_path(asset_path);
        return {result: 1, data: {path: root_dir_content}};
    }
    
    async function on_save_info(cmd: ServerCommands[typeof SAVE_INFO_CMD]): Promise<ServerResponses[typeof SAVE_INFO_CMD]> {
        const current = await read_metadata(project, cmd.path);
        const updated = {...current, ...cmd.data};
        write_metadata(project, cmd.path, updated);
        return {result: 1};
    }
    
    async function on_get_info(cmd: ServerCommands[typeof GET_INFO_CMD]): Promise<ServerResponses[typeof GET_INFO_CMD]> {
        const data = await read_metadata(project, cmd.path);
        return {result: 1, data};
    }
    const resp = check_fields(cmd_id, params);
    if (resp) return resp;


    if (cmd_id == GET_PROJECTS_CMD) {
        return await on_get_projects();
    }

    if (cmd_id === NEW_PROJECT_CMD) {
        return await on_new_project(params as ServerCommands[typeof NEW_PROJECT_CMD]);
    }

    if (cmd_id === LOAD_PROJECT_CMD) {
        return await on_load_project(params as ServerCommands[typeof LOAD_PROJECT_CMD]);
    }

    if (cmd_id === NEW_FOLDER_CMD) {
        return await on_new_folder(params as ServerCommands[typeof NEW_FOLDER_CMD]);
    }

    if (cmd_id == GET_FOLDER_CMD) {
        return await on_get_folder(params as ServerCommands[typeof GET_FOLDER_CMD]);
    }

    if (cmd_id == RENAME_CMD) {
        return await on_rename(params as ServerCommands[typeof RENAME_CMD]);
    }

    if (cmd_id == COPY_CMD) {
        return await on_copy(params as ServerCommands[typeof COPY_CMD]);
    }

    if (cmd_id == DELETE_CMD) {
        return await on_delete(params as ServerCommands[typeof DELETE_CMD]);
    }

    if (cmd_id == SAVE_INFO_CMD) {
        return await on_save_info(params as ServerCommands[typeof SAVE_INFO_CMD]);
    }

    if (cmd_id == GET_INFO_CMD) {
        return await on_get_info(params as ServerCommands[typeof GET_INFO_CMD]);
    }

    if (cmd_id == SAVE_DATA_CMD) {
        return await on_save_data(params as ServerCommands[typeof SAVE_DATA_CMD]);
    }
    
    if (cmd_id == GET_DATA_CMD) {
        return await on_get_data(params as ServerCommands[typeof SAVE_DATA_CMD]);
    }

    // if (cmd_id === SEARCH_CMD) {
    // }

    Log.error('command not found', cmd_id);
    return {message: ERROR_TEXT.COMMAND_NOT_FOUND, result: 0}
}

async function read_metadata(project_name: string, dir: string) {
    const data_file_path = get_metadata_path(project_name);
    const file_exists = await exists(data_file_path);
    if (!file_exists) await Bun.write(data_file_path, "{}");
    const data_file = Bun.file(data_file_path);
    const data_string = await data_file.text();
    const all_metadata = JSON.parse(data_string);
    const asset_metadata = all_metadata[dir] ? all_metadata[dir] : {};
    log(all_metadata, dir, asset_metadata)
    return asset_metadata as TRecursiveDict;
}

async function write_metadata(project_name: string, dir: string, data: TRecursiveDict) {
    const data_file_path = get_metadata_path(project_name);
    const project_metadata = {[dir]: data};
    const data_string = JSON.stringify(project_metadata);
    await Bun.write(data_file_path, data_string);
    
}

export async function get_file(project_name: string, asset_path: string) {
    const full_path = get_asset_path(project_name, asset_path)
    const file = Bun.file(full_path);
    const exists = await file.exists();
    if (exists) 
        return file;
}

export async function project_name_required(cmd_id: CommandId, params: any) {
    if (!project_name_required_commands.includes(cmd_id)) 
        return;
    const project_name = params[PROJECT_PARAM_NAME];
    if (!project_name)
        return {message: ERROR_TEXT.NO_PROJECT_NAME, result: 0};

    if (!project_exists_required_commands.includes(cmd_id)) 
        return;
    const assets_folder_path = get_assets_folder_path(project_name);
    const project_exists = await check_dir_exists(assets_folder_path);

    if (!project_exists) 
        return {message: ERROR_TEXT.PROJECT_NOT_FOUND, result: 0}
}

export function loaded_project_required(cmd_id: CommandId) {
    return loaded_project_required_commands.includes(cmd_id);
}

export function check_fields(cmd_id: CommandId, params: any) {
    let wrong_fields: string[] = [];
    if (cmd_id === NEW_PROJECT_CMD)
        wrong_fields = _check_fields(params, [PROJECT_PARAM_NAME]);
    if (cmd_id === LOAD_PROJECT_CMD)
        wrong_fields = _check_fields(params, [PROJECT_PARAM_NAME]);
    if (cmd_id === GET_DATA_CMD)
        wrong_fields = _check_fields(params, [PATH_PARAM_NAME]);
    if (cmd_id === GET_INFO_CMD)
        wrong_fields = _check_fields(params, [PATH_PARAM_NAME]);
    if (cmd_id === SAVE_DATA_CMD)
        wrong_fields = _check_fields(params, [PATH_PARAM_NAME, DATA_PARAM_NAME]);
    if (cmd_id === SAVE_INFO_CMD)
        wrong_fields = _check_fields(params, [PATH_PARAM_NAME, DATA_PARAM_NAME]);
    if (cmd_id === GET_FOLDER_CMD)
        wrong_fields = _check_fields(params, [PATH_PARAM_NAME]);
    if (cmd_id === NEW_FOLDER_CMD)
        wrong_fields = _check_fields(params, [PATH_PARAM_NAME, NAME_PARAM_NAME]);
    if (cmd_id === RENAME_CMD)
        wrong_fields = _check_fields(params, [PATH_PARAM_NAME, NEW_NAME_PARAM_NAME]);
    if (cmd_id === COPY_CMD)
        wrong_fields = _check_fields(params, [PATH_PARAM_NAME, NEW_PATH_PARAM_NAME]);
    if (cmd_id === DELETE_CMD)
        wrong_fields = _check_fields(params, [PATH_PARAM_NAME]);

    if (wrong_fields.length > 0) return {result: 0, message: `${ERROR_TEXT.SOME_FIELDS_WRONG}: ${wrong_fields}`}

    function _check_fields(data: any, fields: string[]) {
        let wrong_fields: string[] = [];
        for (const key of fields) {
            if (data[key] === undefined || (key !== PATH_PARAM_NAME && data[key] === "")) 
                wrong_fields.push(key);
        }
        return wrong_fields;
    }
}


