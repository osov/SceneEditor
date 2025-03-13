import path from "path";
import { Router } from "bun-serve-router";
import { project_name_required, get_file, handle_command, loaded_project_required, get_cache, write_cache } from "./logic";
import { ExtWebSocket, WsClient } from "./types";
import { ServerResponses, ServerCommands, NetMessagesEditor as NetMessages, CommandId, URL_PATHS, CMD_NAME, GET_LOADED_PROJECT_CMD, LOAD_PROJECT_CMD, GET_FOLDER_CMD } from "../../src/modules_editor/modules_editor_const";
import { TDictionary } from "../../src/modules_editor/modules_editor_const";
import { do_response, json_parsable } from "./utils";
import { get_asset_path, get_full_path } from "./fs_utils";
import { WsServer } from "./WsServer";
import { FSWatcher } from "./fs_watcher";
import { ERROR_TEXT } from "./const";

export async function Server(server_port: number, ws_server_port: number, fs_events_interval: number) {
    // const clients = Clients();
    let sockets: WsClient[] = [];
    const fs_watcher = FSWatcher(get_full_path(""), sockets, fs_events_interval);
    const router = new Router();
    const data_sessions: TDictionary<any> = {};
    const cache = await get_cache();
    let current_project: string | undefined = (cache) ? cache.current_project : undefined;
    let current_dir = (cache) ? cache.current_dir : "";

    router.add("GET", `${URL_PATHS.TEST}`, (request, params) => {
        return test_func();
    })

    router.add("POST", `${URL_PATHS.UPLOAD}`, async (request, params) => {
        const content_type = request.headers.get('content-type');
        let size = 0;
        let dir_path: string | null = "";
        let file_path = "";
        let name = "";
        let project = "";
        if (content_type && request.body) {
            try {
                const formdata = await request.formData();
                const file_data = formdata.get('file');
                const project = current_project;
                dir_path = formdata.get('path') as  string | null;
                if (file_data != null && dir_path != null && project != null) {
                    const file = file_data as unknown as Blob;
                    const file_name = file.name as string | undefined;
                    if (file_name) {
                        file_path = path.join(dir_path, file_name);
                        name = file_name;
                        const ext = path.extname(name).slice(1);
                        size = await Bun.write(`${get_asset_path(project, file_path)}`, file);
                        const response: ServerResponses['/upload'] = {result: 1, data: {size, path: file_path, name, project, ext}};
                        return do_response(response);   
                    }
                }
            }
            catch(e: any) {
                const response: ServerResponses['/upload'] = {result: 0, message: `${ERROR_TEXT.CANT_UPLOAD_FILE}: ${e}`};
                return do_response(response);
            } 
        } 
        const reason = (name === "") ? "no name" : 
                        (dir_path === "") ? "no dir path" : 
                        (project === "") ? "no loaded project" :
                        ""
        const response = {result: 0, message: `${ERROR_TEXT.CANT_UPLOAD_FILE}: ${reason}`}; 
        return do_response(response);
    })
    
    router.add("GET", `${URL_PATHS.ASSETS}/*`, async (request, params) => {
        const uri = params[0];  
        const asset_path = decodeURIComponent(uri ? uri : "");
        if (current_project) {
            const file = await get_file(current_project, asset_path);
            if (file) 
                return do_response(file, false);
        }
        return do_response("404 Not Found", false, 404);
    });

    router.add("POST", `${URL_PATHS.API}*`, async (request, params) => {
        const cmd_id = params[0] as CommandId;
        if (!CMD_NAME.includes(cmd_id)) {
            Log.error('command not found', cmd_id);
            return do_response({message: ERROR_TEXT.COMMAND_NOT_FOUND, result: 0});
        }
        const data = await request.text();
        const result = await on_command(cmd_id, data);
        return  do_response(result);
    });

    const server = Bun.serve({
        port: server_port,
        async fetch(request) {
            log(request.method, request.url)
            const response = await router.match(request);
            if (response) {
                return response;
            }
            return do_response("404 Not Found", false, 404);
        }     
    });

    const ws_server = WsServer<ExtWebSocket>(ws_server_port,
        // on_data
        (client, data) => {
            // log('client data', client.data, data);
            try {
                if (!verify_message(client.data, data as string))
                    return;
                const pack = JSON.parse(data as string);
                on_message(client, pack.id as any, pack.message as any);
            }
            catch (e: any) {
                Log.error("Ошибка при парсинге: " + e.message + "\nid_user=", client.data, 'данные:', data, '\nстек:', e.stack);
            }
        },
        //on_client_connected, 
        (client) => {
            log('client connected', client.data);
            on_connect(client);
        }
        //on_client_disconnected
        , (client) => {
            log('client disconnected', client.data);
            on_disconnect(client);
        }
    );
    log("Запущен сервер на порту " + server_port);


    async function on_command(cmd_id: CommandId, data: string) {
        if (cmd_id == GET_LOADED_PROJECT_CMD) {
            const result: ServerResponses[typeof GET_LOADED_PROJECT_CMD] = {result: 1, data: {name: current_project, current_dir}};
            return result;
        }
        
        if (!json_parsable(data)) 
            return {message: ERROR_TEXT.WRONG_JSON, result: 0};
        const params = JSON.parse(data);

        const resp = await project_name_required(cmd_id, params);
        if (resp) return resp;
        
        if (loaded_project_required(cmd_id) && !current_project)
            return {message: ERROR_TEXT.PROJECT_NOT_LOADED, result: 0}

        const result = await handle_command(current_project as string, cmd_id, params);
        if (result.result) {
            if (cmd_id === LOAD_PROJECT_CMD) {
                const _result = result as ServerResponses[typeof LOAD_PROJECT_CMD];
                current_project = _result.data?.name as string;
                log(`${current_project} is current loaded project`);
                current_dir = "";
                await write_cache({current_project, current_dir});
            }
            if (cmd_id === GET_FOLDER_CMD) {
                const _params = params as ServerCommands[typeof GET_FOLDER_CMD];
                if (current_dir != _params.path) {
                    current_dir = _params.path as string;    
                    await write_cache({current_dir});    
                } 
            }
        }
        return result;
    }

    function on_message<T extends keyof NetMessages>(socket: WsClient, id_message: T, _message: NetMessages[T]) {     
    }

    function on_connect(socket: WsClient) {
        sockets.push(socket);
    }

    function on_disconnect(socket: WsClient) {
        const i = sockets.indexOf(socket);
        sockets.splice(i, 1);
    }

    function test_func() {
        return do_response({message: "OK!", result: 1}, true, 200);
    }

    function get_session_data(id_session: string) {
        return data_sessions[id_session];
    }

    function set_session_data(id_session: string, key: string, data: any) {
        if (data_sessions[id_session] == undefined)
            data_sessions[id_session] = {};
        data_sessions[id_session][key] = data;
    }

    function verify_message(client_data: ExtWebSocket, data: string) {
        try {
            const msg = JSON.parse(data);
            if (!('id' in msg)) {
                Log.error("Ошибка verify_message: не найден ID сообщения");
                return false;
            }
            if (!('message' in msg)) {
                Log.error("Ошибка verify_message: не найдено тело сообщения message");
                return false;
            }
        }
        catch (e: any) {
            Log.error("Ошибка verify_message: " + e.message + "\nid_user=", client_data, 'данные:', data, '\nстек:', e.stack);
            return false;
        }
        return true;
    }

    return {}
}

