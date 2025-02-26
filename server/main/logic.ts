
import path from "path";
import { PATH_PARAM_NAME, NEW_PROJECT_CMD, ERROR_TEXT, DELETE_CMD, LOAD_PROJECT_CMD, NEW_FOLDER_CMD, NEW_NAME_PARAM_NAME, NAME_PARAM_NAME, COPY_CMD, PROJECT_PARAM_NAME, GET_PROJECTS_CMD, SEARCH_CMD, RENAME_CMD, GET_FOLDER_CMD, SAVE_INFO_CMD, GET_INFO_CMD, DATA_PARAM_NAME, SAVE_DATA_CMD, GET_DATA_CMD, NEW_PATH_PARAM_NAME, ID_SESSION_PARAM_NAME, } from "./const";
import { check_dir_exists, exists, get_asset_path, get_full_path, get_assets_folder_path, get_metadata_path, new_folder, read_dir_assets, rename, get_data_file_path, remove_path, copy, get_data_folder_path, new_project } from "./fs_utils";
import { CommandId, ServerResponses, TRecursiveDict } from "./types";
import { do_response } from "./utils";


export async function handle_command<T extends CommandId>(cmd_id: T, params: any) {
    log('params: ', params)
    const project_name = params[PROJECT_PARAM_NAME];
    const _path = params[PATH_PARAM_NAME];
    const new_path = params[NEW_PATH_PARAM_NAME];
    const name = params[NAME_PARAM_NAME];
    const new_name = params[NEW_NAME_PARAM_NAME];

    if (cmd_id == GET_PROJECTS_CMD) {
        const projects_list = await read_dir_assets(get_full_path(''));
        const response: ServerResponses[typeof GET_PROJECTS_CMD] = {data: projects_list, result: 1};
        return do_response(response);
    }

    if (!project_name) // Если не передано имя проекта
        return do_response({message: ERROR_TEXT.NO_PROJECT_NAME, result: 0});

    const assets_folder_path = get_assets_folder_path(project_name);
    const project_exists = await check_dir_exists(assets_folder_path);

    if (cmd_id === NEW_PROJECT_CMD) {
        if (project_exists) 
            return do_response({message: ERROR_TEXT.PROJECT_ALREADY_EXISTS, result: 0});
        new_project(get_full_path(project_name));
        return do_response({result: 1});
    }

    if (!project_exists) {
        return do_response({message: ERROR_TEXT.PROJECT_NOT_FOUND, result: 0});
    }

    // Ниже только команды, требующие имя существующего проекта
    if (cmd_id === LOAD_PROJECT_CMD) {
        const assets = await read_dir_assets(assets_folder_path);
        const id_session = params[ID_SESSION_PARAM_NAME];
        if (id_session != null) {}
        const response: ServerResponses[typeof LOAD_PROJECT_CMD] = {result: 1, data: {assets, name: project_name}};
        return do_response(response);
    }

    if (cmd_id == SAVE_DATA_CMD) {
        if (!_path)
            return do_response({message: ERROR_TEXT.NO_PATH, result: 0});
        const data_path = get_data_file_path(project_name, _path);
        const new_data = params[DATA_PARAM_NAME];
        if (!new_data) 
            return do_response({message: ERROR_TEXT.NO_DATA, result: 0});
        try {
            await Bun.write(data_path, JSON.stringify(new_data));
            const response: ServerResponses[typeof SAVE_DATA_CMD] = {result: 1};
            return do_response(response);

        } catch (e) {
            const response: ServerResponses[typeof SAVE_DATA_CMD] = {result: 0, message: `${ERROR_TEXT.CANT_WRITE_FILE}: ${e}`};
            return do_response(response);
        }
    }
    
    if (cmd_id == GET_DATA_CMD) {
        if (!_path)
            return do_response({message: ERROR_TEXT.NO_PATH, result: 0});
        const data_path = get_data_file_path(project_name, _path);
        const file_exists = await exists(data_path);
        if (!file_exists)
            return do_response({message: ERROR_TEXT.FILE_NOT_EXISTS, result: 0});
        const data_file = Bun.file(data_path);
        const data = await data_file.text();
        const response: ServerResponses[typeof GET_DATA_CMD] = {result: 1, data};
        return do_response(response);
    }

    const asset_path = get_asset_path(project_name, _path != null ? _path : "");
    const asset_rel_path = path.relative(assets_folder_path, asset_path).split("\\").join("/");
    const dir_exists = await check_dir_exists(asset_path);
    if (!dir_exists) {
        return do_response({message: `${ERROR_TEXT.DIR_NOT_EXISTS}: ${asset_path}`, result: 0});
    }

    // Ниже только команды, требующие имя существующего проекта и путь к существующей папке/файлу
    if (cmd_id === GET_FOLDER_CMD) {
        const dir_content = await read_dir_assets(asset_path, assets_folder_path);
        const response: ServerResponses[typeof NEW_FOLDER_CMD] = {result: 1, data: dir_content};
        return do_response(response);
    }

    if (cmd_id === NEW_FOLDER_CMD) {
        if (!name) 
            return do_response({message: ERROR_TEXT.NO_NAME, result: 0});
        const folder_path = await new_folder(asset_path, name);
        const data = {path: path.relative(get_assets_folder_path(project_name), folder_path).split("\\").join("/")}
        const response: ServerResponses[typeof NEW_FOLDER_CMD] = {result: 1, data};
        return do_response(response);
    }

    if (cmd_id === RENAME_CMD) {
        if (!name) 
            return do_response({message: ERROR_TEXT.NO_NAME, result: 0});
        if (!new_name) 
            return do_response({message: ERROR_TEXT.NO_NEW_NAME, result: 0});

        await rename(path.join(asset_path, name), path.join(asset_path, new_name));
    }

    // if (cmd_id === SEARCH_CMD) {
    // }

    if (cmd_id === COPY_CMD) {
        if (!new_path) 
            return do_response({message: ERROR_TEXT.NO_NEW_PATH, result: 0});
        // Не разрешаем делать копирование/замену корневой папки ассетов проекта
        if (_path === "" || new_path === "")
            return do_response({message: ERROR_TEXT.COPY_CHANGE_ROOT, result: 0});
        const new_asset_path = get_asset_path(project_name, new_path);
        const root_dir_content = await copy(asset_path, new_asset_path);
        const response: ServerResponses[typeof DELETE_CMD] = {result: 1, data: {path: root_dir_content}};
        return do_response(response);
    }

    if (cmd_id == DELETE_CMD) {
        const root_dir_content = await remove_path(asset_path);
        const response: ServerResponses[typeof DELETE_CMD] = {result: 1, data: {path: root_dir_content}};
        return do_response(response);
    }


    if (cmd_id == SAVE_INFO_CMD) {
        const new_data = params[DATA_PARAM_NAME];
        if (!new_data) 
            return do_response({message: ERROR_TEXT.NO_DATA, result: 0});
        const current = await read_metadata(project_name, asset_rel_path);
        const updated = {...current, ...new_data as TRecursiveDict};
        write_metadata(project_name, asset_rel_path, updated);
        const response: ServerResponses[typeof SAVE_INFO_CMD] = {result: 1};
        return do_response(response);
    }

    if (cmd_id == GET_INFO_CMD) {
        const data = await read_metadata(project_name, asset_rel_path);
        const response: ServerResponses[typeof GET_INFO_CMD] = {result: 1, data};
        return do_response(response);
    }

    Log.error('command not found', cmd_id);
    return do_response({message: ERROR_TEXT.COMMAND_NOT_FOUND, result: 0});
}
async function read_metadata(project_name: string, dir: string) {
    const data_file_path = get_metadata_path(project_name);
    const file_exists = await exists(data_file_path);
    if (!file_exists) await Bun.write(data_file_path, "{}");
    const data_file = Bun.file(data_file_path);
    const data_string = await data_file.text();
    const all_metadata = JSON.parse(data_string);
    const asset_metadata = all_metadata[dir] ? all_metadata[dir] : {};
    return asset_metadata as TRecursiveDict;
}

async function write_metadata(project_name: string, dir: string, data: TRecursiveDict) {
    const data_file_path = get_metadata_path(project_name);
    const project_metadata = {[dir]: data};
    const data_string = JSON.stringify(project_metadata);
    await Bun.write(data_file_path, data_string);
    
}

export async function get_file(uri: string | undefined) {
    // asset_path - путь примерно такого вида - "название_проекта/assets/путь/к/файлу/файл.img"
    const asset_path = decodeURIComponent(uri ? uri : "");
    const full_path = get_full_path(asset_path);
    const file = Bun.file(full_path);
    const exists = await file.exists();
    if (exists) 
        return new Response(file, { 
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "*"
            },
        });
    else 
        return new Response("404 Not Found", { 
            status: 404 , 
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "*"
            },
        });
            
}
