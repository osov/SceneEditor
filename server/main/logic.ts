
import path from "path";
import { PATH_PARAM_NAME, ERROR_TEXT, NAME_PARAM_NAME, PROJECT_PARAM_NAME, DATA_PARAM_NAME, NEW_PATH_PARAM_NAME } from "./const";
import { exists, get_asset_path, get_full_path, get_assets_folder_path, get_metadata_path, read_dir_assets, 
    rename, get_data_file_path, remove_path, copy, new_project, is_folder, mk_dir, open_explorer } from "./fs_utils";
import { ServerResponses, ServerCommands, CommandId, TRecursiveDict, DEL_INFO_CMD, LOAD_PROJECT_CMD, NEW_PROJECT_CMD, GET_DATA_CMD, 
    SAVE_DATA_CMD, GET_INFO_CMD, SAVE_INFO_CMD, GET_FOLDER_CMD, NEW_FOLDER_CMD, COPY_CMD, DELETE_CMD, RENAME_CMD, GET_PROJECTS_CMD, 
    MOVE_CMD, SET_CURRENT_SCENE_CMD, SCENE_EXT, OPEN_EXPLORER_CMD, allowed_ext, texture_ext, FSObject, ProjectPathsData, model_ext, 
    FONT_EXT, ATLAS_EXT, LoadAtlasData, 
    BaseResp,
    GET_SERVER_DATA_CMD,
    MATERIAL_EXT} from "../../src/modules_editor/modules_editor_const";
import { PromiseChains } from "./PromiseChains";


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
    DEL_INFO_CMD,
    NEW_FOLDER_CMD,
    GET_FOLDER_CMD,
    COPY_CMD,
    RENAME_CMD,
    DELETE_CMD,
    OPEN_EXPLORER_CMD,
];


export function Logic(use_queues: boolean) {
    const _write = (use_queues) ? PromiseChains(Bun.write).push : Bun.write;

    async function handle_command<T extends CommandId>(cmd_id: T, params: ServerCommands[T] | {current_project? : string}) {
        log('cmd_id:', cmd_id); 

        const err_resp = await project_name_required(cmd_id, params);
        if (err_resp) return err_resp;

        if (loaded_project_required_commands.includes(cmd_id) && !current.project)
            return {message: ERROR_TEXT.PROJECT_NOT_LOADED, result: 0};
        
        const project = current.project as string;
     
        async function on_get_server_data() {
            const response: ServerResponses[typeof GET_SERVER_DATA_CMD] = {data: current, result: 1};
            return response;    
        }

        async function on_get_projects() {
            const projects_list: string[] = [];
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
            const root_folder_assets = await read_dir_assets(assets_folder_path);
            const all_assets = await read_dir_assets(assets_folder_path, assets_folder_path, true);
            const paths: ProjectPathsData = await gather_paths(cmd.project, all_assets);
            current.project = cmd.project;
            log(`${current.project} is current loaded project`);
            current.dir = "";
            return {result: 1, data: {assets: root_folder_assets, name: cmd.project, paths}};
        }

        async function gather_paths(project: string, assets: FSObject[]) {
            const paths: ProjectPathsData = {textures: [], atlases: [], models: [], fonts: [], materials: []};
            const atlases_textures: string[] = [];
            assets.forEach(async element => {
                if (element.ext && model_ext.includes(element.ext)) 
                    paths.models.push(element.path);
                if (element.ext == FONT_EXT) 
                    paths.fonts.push(element.path);
                if (element.ext == ATLAS_EXT) {
                    for (const ext of texture_ext) {
                        const texture_path = element.path.replace(`.${ATLAS_EXT}`, `.${ext}`);
                        if (await exists(get_asset_path(project, texture_path))) {
                            const load_atlas_data: LoadAtlasData = {atlas: element.path, texture: texture_path};
                            paths.atlases.push(load_atlas_data);
                            atlases_textures.push(texture_path);
                        }
                    }
                }
                if (element.ext == MATERIAL_EXT) {
                    paths.materials.push(element.path);
                }
            });
            assets.forEach(element => {
                if (element.ext && texture_ext.includes(element.ext) && !(atlases_textures.includes(element.path)))
                    paths.textures.push(element.path);
            })
            return paths;
        }

        async function on_new_project(cmd: ServerCommands[typeof NEW_PROJECT_CMD]): Promise<ServerResponses[typeof NEW_PROJECT_CMD]> {
            const assets_folder_path = get_assets_folder_path(cmd.project);
            const project_exists = await exists(assets_folder_path);
            if (project_exists) return {message: ERROR_TEXT.PROJECT_ALREADY_EXISTS, result: 0};
            new_project(cmd.project);
            return {result: 1, data: {}};
        }

        async function on_set_current_scene(cmd: ServerCommands[typeof SET_CURRENT_SCENE_CMD]): Promise<ServerResponses[typeof SET_CURRENT_SCENE_CMD]> {
            const asset_path = get_asset_path(project, cmd.path);
            const scene_exists = await exists(asset_path);
            if (!scene_exists) return {message: ERROR_TEXT.SCENE_NOT_EXIST, result: 0};
            const name = path.basename(asset_path, `.${SCENE_EXT}`);
            if (current.scene.path != cmd.path) {
                current.scene.path = cmd.path as string;    
                current.scene.name = name as string;
            } 
            return {result: 1, data: { name, path: cmd.path }};
        }
        
        async function on_save_data(cmd: ServerCommands[typeof SAVE_DATA_CMD]): Promise<ServerResponses[typeof SAVE_DATA_CMD]> {
            const data_path = get_data_file_path(project, cmd.path);
            const new_data = cmd.data;
            try {
                await _write(data_path, new_data);
                return {result: 1, data: {}};
        
            } catch (e) {
                return {result: 0, message: `${ERROR_TEXT.CANT_WRITE_FILE}: ${e}`};
            }
        }
        
        async function on_get_data(cmd: ServerCommands[typeof GET_DATA_CMD]): Promise<ServerResponses[typeof GET_DATA_CMD]> {
            const data_path = get_data_file_path(project, cmd.path);
            const file_exists = await exists(data_path);
            if (!file_exists)
                return {message: ERROR_TEXT.FILE_NOT_EXIST, result: 0};
            const data_file = Bun.file(data_path);
            const text = await data_file.text();
            //const data = JSON.parse(text)
            return {result: 1, data: text};
        }
        
        async function on_new_folder(cmd: ServerCommands[typeof NEW_FOLDER_CMD]): Promise<ServerResponses[typeof NEW_FOLDER_CMD]> {
            const folder_path = get_asset_path(project, path.join(cmd.path, cmd.name));
            const dir_exists = await exists(folder_path);
            if (dir_exists)
                return {message: `${ERROR_TEXT.FOLDER_ALREADY_EXISTS}: ${folder_path}`, result: 0};
            await mk_dir(folder_path);
            const data = {path: path.relative(get_assets_folder_path(project), folder_path).split("\\").join("/")}
            return {result: 1, data};
        }
        
        async function on_get_folder(cmd: ServerCommands[typeof GET_FOLDER_CMD]): Promise<ServerResponses[typeof GET_FOLDER_CMD]> {
            const folder_path = get_asset_path(project, cmd.path);
            const dir_exists = await exists(folder_path);
            if (!dir_exists)
                return {message: `${ERROR_TEXT.DIR_NOT_EXIST}: ${folder_path}`, result: 0};
            const root_folder = get_assets_folder_path(project);
            const dir_content = await read_dir_assets(folder_path, root_folder);
            if (current.dir != cmd.path) {
                current.dir = cmd.path as string;      
            } 
            return {result: 1, data: dir_content};
        }
    
        async function copy_file(old_path: string, new_path: string) {
            const info = await read_metadata(project, old_path);
            if (info) {
                await write_metadata(project, new_path, info);
            }
            const full_old_path = get_asset_path(project, old_path);
            const full_new_path = get_asset_path(project, new_path);
            await copy(full_old_path, full_new_path);
        }
    
        async function copy_folder(old_path: string, new_path: string) {
            const root_folder = get_assets_folder_path(project);
            const full_old_path = get_asset_path(project, old_path);
            const full_new_path = get_asset_path(project, new_path);
            if (!await exists(full_new_path))
                await mk_dir(full_new_path);
            const dir_content = await read_dir_assets(full_old_path, root_folder);
            for (const obj of dir_content) {
                const old_asset_path = obj.path;
                const new_asset_path = path.join(new_path, obj.name);
                if (obj.type == "folder")
                    await copy_folder(old_asset_path, new_asset_path);
                else
                    await copy_file(old_asset_path, new_asset_path);
            }
        }
        
        async function on_copy(cmd: ServerCommands[typeof COPY_CMD]): Promise<ServerResponses[typeof COPY_CMD]> {
            // Не разрешаем делать копирование/замену корневой папки ассетов проекта
            if (cmd.path === "" || cmd.new_path === "")
                return {message: ERROR_TEXT.COPY_CHANGE_ROOT, result: 0};
            const old_path = get_asset_path(project, cmd.path);
            const new_path = get_asset_path(project, cmd.new_path);
            const file_exists = await exists(old_path);
            if (!file_exists)
                return {message: `${ERROR_TEXT.FILE_NOT_EXIST}: ${old_path}`, result: 0};
            if (await is_folder(old_path)) {
                if (!cmd.new_path.includes(cmd.path)) 
                    await copy_folder(cmd.path, cmd.new_path)
                else 
                    return {message: `${ERROR_TEXT.RECURSIVE_FOLDER_COPYING}: ${old_path}`, result: 0};
            }
                
            else 
                await copy_file(cmd.path, cmd.new_path);
            return {result: 1, data: {new_path}};
        }
    
        async function move_file(old_path: string, new_path: string) {
            const info = await read_metadata(project, old_path);
            if (info) {
                await write_metadata(project, new_path, info);
                await clear_metadata(project, old_path);
            }
            const full_old_path = get_asset_path(project, old_path);
            const full_new_path = get_asset_path(project, new_path);
            await rename(full_old_path, full_new_path);
        }
    
        async function move_folder(old_path: string, new_path: string) {
            const root_folder = get_assets_folder_path(project);
            const full_old_path = get_asset_path(project, old_path);
            const full_new_path = get_asset_path(project, new_path);
            if (!await exists(full_new_path))
                await mk_dir(full_new_path);
            const dir_content = await read_dir_assets(full_old_path, root_folder);
            for (const obj of dir_content) {
                const old_asset_path = obj.path;
                const new_asset_path = path.join(new_path, obj.name);
                if (obj.type == "folder")
                    await move_folder(old_asset_path, new_asset_path);
                else
                    await move_file(old_asset_path, new_asset_path);
            }
            await remove_path(full_old_path);
        }
    
        async function on_move(cmd: ServerCommands[typeof MOVE_CMD]): Promise<ServerResponses[typeof MOVE_CMD]> {
            // Не разрешаем делать перемещение корневой папки ассетов проекта
            if (cmd.path === "" || cmd.new_path === "")
                return {message: ERROR_TEXT.COPY_CHANGE_ROOT, result: 0};
            const old_path = get_asset_path(project, cmd.path);
            const new_path = get_asset_path(project, cmd.new_path);
            const file_exists = await exists(old_path);
            if (!file_exists)
                return {message: `${ERROR_TEXT.FILE_NOT_EXIST}: ${old_path}`, result: 0};
            if (await is_folder(old_path)) {
                if (!cmd.new_path.includes(cmd.path)) 
                    await move_folder(cmd.path, cmd.new_path)
                else 
                    return {message: `${ERROR_TEXT.RECURSIVE_FOLDER_COPYING}: ${old_path}`, result: 0};
            }
            else 
                await move_file(cmd.path, cmd.new_path);
            return {result: 1, data: {new_path}};
        }
        
        async function on_rename(cmd: ServerCommands[typeof RENAME_CMD]): Promise<ServerResponses[typeof RENAME_CMD]> {
            // Не разрешаем делать переименование корневой папки ассетов проекта
            if (cmd.path === "" || cmd.new_path === "")
                return {message: ERROR_TEXT.COPY_CHANGE_ROOT, result: 0};
            const old_path = get_asset_path(project, cmd.path);
            const new_path = get_asset_path(project, cmd.new_path);
            const file_exists = await exists(old_path);
            if (!file_exists)
                return {message: `${ERROR_TEXT.FILE_NOT_EXIST}: ${old_path}`, result: 0};
            if (!await is_folder(old_path)) {
                const ext1 = path.extname(old_path).slice(1);
                const ext2 = path.extname(new_path).slice(1);
                if (!allowed_ext.includes(ext1))
                    return {result: 0, message: ERROR_TEXT.WRONG_ORIG_EXTENTION};
                if (!allowed_ext.includes(ext2))
                    return {result: 0, message: ERROR_TEXT.WRONG_END_EXTENTION};
            }
            const info = await read_metadata(project, cmd.path);
            if (info) {
                await write_metadata(project, cmd.new_path, info);
                await clear_metadata(project, cmd.path);
            }
            await rename(old_path, new_path);
            return {result: 1, data: {new_path}};
        }
        
        async function on_delete(cmd: ServerCommands[typeof DELETE_CMD]): Promise<ServerResponses[typeof DELETE_CMD]> {
            const asset_path = get_asset_path(project, cmd.path);
            const path = await remove_path(asset_path);
    
            const info = await read_metadata(project, cmd.path);
            if (info) {
                await clear_metadata(project, cmd.path);
            }
    
            return {result: 1, data: {path}};
        }
        
        async function on_save_info(cmd: ServerCommands[typeof SAVE_INFO_CMD]): Promise<ServerResponses[typeof SAVE_INFO_CMD]> {
            const current = await read_metadata(project, cmd.path);
            const updated = {...current, ...cmd.data};
            await write_metadata(project, cmd.path, updated);
            return {result: 1, data: {}};
        }
        
        async function on_get_info(cmd: ServerCommands[typeof GET_INFO_CMD]): Promise<ServerResponses[typeof GET_INFO_CMD]> {
            let data: TRecursiveDict | undefined = undefined;
            if (cmd.path)   
                data = await read_metadata(project, cmd.path);
            else 
                data = await get_all_metadata(project);
            if (data)
                return {result: 1, data};
            else
                return {result: 0, message: ERROR_TEXT.METAINFO_NOT_FOUND};
        }
    
        async function on_del_info(cmd: ServerCommands[typeof DEL_INFO_CMD]): Promise<ServerResponses[typeof DEL_INFO_CMD]> {
            const current = await read_metadata(project, cmd.path);
            if (current)
                await clear_metadata(project, cmd.path);
            return {result: 1, data: {}};
        }
        const resp = check_fields(cmd_id, params);
        if (resp) return resp;

        if (cmd_id == GET_SERVER_DATA_CMD) {
            return await on_get_server_data();
        }
        
        if (cmd_id == GET_PROJECTS_CMD) {
            return await on_get_projects();
        }

        if (cmd_id === NEW_PROJECT_CMD) {
            return await on_new_project(params as ServerCommands[typeof NEW_PROJECT_CMD]);
        }

        if (cmd_id === LOAD_PROJECT_CMD) {
            return await on_load_project(params as ServerCommands[typeof LOAD_PROJECT_CMD]);
        }
        
        if (cmd_id == SET_CURRENT_SCENE_CMD) {
            return await on_set_current_scene(params as ServerCommands[typeof SET_CURRENT_SCENE_CMD]);
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

        if (cmd_id == MOVE_CMD) {
            return await on_move(params as ServerCommands[typeof MOVE_CMD]);
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

        if (cmd_id == DEL_INFO_CMD) {
            return await on_del_info(params as ServerCommands[typeof DEL_INFO_CMD]);
        }

        if (cmd_id == SAVE_DATA_CMD) {
            return await on_save_data(params as ServerCommands[typeof SAVE_DATA_CMD]);
        }
        
        if (cmd_id == GET_DATA_CMD) {
            return await on_get_data(params as ServerCommands[typeof SAVE_DATA_CMD]);
        }

        if (cmd_id == OPEN_EXPLORER_CMD) {
            const data = params as ServerCommands[typeof OPEN_EXPLORER_CMD];
            const path = data.path;
            const result = await open_explorer(project, path);
            if (result)
                return {result: 1, data: {}} as ServerResponses[typeof OPEN_EXPLORER_CMD];
            else
                return {result: 0, data: {}} as ServerResponses[typeof OPEN_EXPLORER_CMD];
        }

        // if (cmd_id === SEARCH_CMD) {
        // }

        Log.error('command not found', cmd_id);
        return {message: ERROR_TEXT.COMMAND_NOT_FOUND, result: 0}
    }

    async function get_all_metadata(project_name: string) {
        const data_file_path = get_metadata_path(project_name);
        const file_exists = await exists(data_file_path);
        if (!file_exists) await _write(data_file_path, "{}");
        const data_file = Bun.file(data_file_path);
        const data_string = await data_file.text();
        const all_metadata = JSON.parse(data_string);
        return all_metadata
    }

    async function read_metadata(project_name: string, dir: string) {
        const all_metadata = await get_all_metadata(project_name);
        const key = dir.replaceAll(path.sep, "/");
        const asset_metadata = all_metadata[key] ? all_metadata[key] as TRecursiveDict : undefined;
        return asset_metadata;
    }

    async function clear_metadata(project_name: string, dir: string) {
        const data_file_path = get_metadata_path(project_name);
        const all_metadata = await get_all_metadata(project_name);
        const key = dir.replaceAll(path.sep, "/");
        delete all_metadata[key];
        await _write(data_file_path, JSON.stringify(all_metadata));    
    }

    async function write_metadata(project_name: string, dir: string, data: TRecursiveDict) {
        const data_file_path = get_metadata_path(project_name);
        const all_metadata = await get_all_metadata(project_name);
        const key = dir.replaceAll(path.sep, "/");
        all_metadata[key] = data;
        await _write(data_file_path, JSON.stringify(all_metadata));
    }

    async function get_file(project_name: string, asset_path: string) {
        const full_path = get_asset_path(project_name, asset_path);
        const file = Bun.file(full_path);
        const exists = await file.exists();
        if (exists) 
            return file;
    }
    
    async function project_name_required(cmd_id: CommandId, params: any) {
        if (!project_name_required_commands.includes(cmd_id)) 
            return;
        const project_name = params[PROJECT_PARAM_NAME];
        if (!project_name)
            return {message: ERROR_TEXT.NO_PROJECT_NAME, result: 0};
    
        if (!project_exists_required_commands.includes(cmd_id)) 
            return;
        const assets_folder_path = get_assets_folder_path(project_name);
        const project_exists = await exists(assets_folder_path);
    
        if (!project_exists) 
            return {message: ERROR_TEXT.PROJECT_NOT_FOUND, result: 0}
    }
    
    
    function check_fields(cmd_id: CommandId, params: any) {
        let wrong_fields: string[] = [];
        if (cmd_id === NEW_PROJECT_CMD)
            wrong_fields = _check_fields(params, [PROJECT_PARAM_NAME]);
        if (cmd_id === LOAD_PROJECT_CMD)
            wrong_fields = _check_fields(params, [PROJECT_PARAM_NAME]);
        if (cmd_id === SET_CURRENT_SCENE_CMD)
            wrong_fields = _check_fields(params, [PATH_PARAM_NAME]);
        if (cmd_id === GET_DATA_CMD)
            wrong_fields = _check_fields(params, [PATH_PARAM_NAME]);
        if (cmd_id === GET_INFO_CMD)
            wrong_fields = _check_fields(params, []);
        if (cmd_id === SAVE_DATA_CMD)
            wrong_fields = _check_fields(params, [PATH_PARAM_NAME, DATA_PARAM_NAME]);
        if (cmd_id === SAVE_INFO_CMD)
            wrong_fields = _check_fields(params, [PATH_PARAM_NAME, DATA_PARAM_NAME]);
        if (cmd_id === DEL_INFO_CMD)
            wrong_fields = _check_fields(params, [PATH_PARAM_NAME]);
        if (cmd_id === GET_FOLDER_CMD)
            wrong_fields = _check_fields(params, [PATH_PARAM_NAME]);
        if (cmd_id === NEW_FOLDER_CMD)
            wrong_fields = _check_fields(params, [PATH_PARAM_NAME, NAME_PARAM_NAME]);
        if (cmd_id === RENAME_CMD)
            wrong_fields = _check_fields(params, [PATH_PARAM_NAME, NEW_PATH_PARAM_NAME]);
        if (cmd_id === MOVE_CMD)
            wrong_fields = _check_fields(params, [PATH_PARAM_NAME, NEW_PATH_PARAM_NAME]);
        if (cmd_id === COPY_CMD)
            wrong_fields = _check_fields(params, [PATH_PARAM_NAME, NEW_PATH_PARAM_NAME]);
        if (cmd_id === DELETE_CMD)
            wrong_fields = _check_fields(params, [PATH_PARAM_NAME]);
        if (cmd_id === OPEN_EXPLORER_CMD)
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

    return {handle_command, get_file, project_name_required}
}

