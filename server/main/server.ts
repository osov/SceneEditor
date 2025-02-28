import path from "path";
import { Router } from "bun-serve-router";
import { ERROR_TEXT, URL_PATHS, CMD_NAME, LOAD_PROJECT_CMD } from "./const";
import { get_file, handle_command } from "./logic";
import { CommandId, ExtWebSocket, WsClient, NetMessages, TDictionary, ServerResponses } from "./types";
import { do_response, json_parsable } from "./utils";
import { get_asset_path, get_full_path } from "./fs_utils";
import { WsServer } from "./WsServer";
import { Clients } from "./clients";
import { FSWatcher } from "./fs_watcher";

export function Server(server_port: number) {
    const clients = Clients();
    const fs_watcher = FSWatcher(get_full_path(""), clients);
    const router = new Router();
    const data_sessions: TDictionary<any> = {};
    let loaded_project: string | undefined;

    router.add("GET", `${URL_PATHS.TEST}`, (request, params) => {
        return test_func();
    })

    router.add("POST", `${URL_PATHS.UPLOAD}`, async (request, params) => {
        const content_type = request.headers.get('content-type');
        let size = 0;
        let file_path = "";
        let name = "";
        let project = "";
        if (content_type && request.body) {
            try {
                const formdata = await request.formData();
                const file_data = formdata.get('file');
                const project_name = formdata.get('project') as string | null;
                const _path = formdata.get('path') as string | null;
                if (file_data != null && _path != null && project_name != null) {
                    const file = file_data as unknown as Blob;
                    const file_name = file.name as string | undefined;
                    if (file_name) {
                        file_path = path.join(_path, file_name);
                        project = project_name;
                        name = file_name;
                        size = await Bun.write(`${get_asset_path(project_name, file_path)}`, file);
                    }
                }
            }
            catch(e: any) {
                const response ={result: 0, message: `${ERROR_TEXT.CANT_UPLOAD_FILE}: ${e}`};
                return do_response(response);
            } 
        }
        return do_response({result: 1, size, path: file_path, name, project});    
    })
    
    router.add("GET", `${URL_PATHS.ASSETS}/*`, async (request, params) => {
        const uri = params[0];  
        const asset_path = decodeURIComponent(uri ? uri : "");
        if (loaded_project) {
            const file = await get_file(loaded_project, asset_path);
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
        if (!json_parsable(data)) 
            return do_response({message: ERROR_TEXT.WRONG_JSON, result: 0});
        const json_data = JSON.parse(data);
        const result = await on_command(cmd_id, json_data);
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

    const ws_server = WsServer<ExtWebSocket>(server_port + 1,
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


    async function on_command(cmd_id: CommandId, params: any) {
        const result = await handle_command(cmd_id, params);
        log(result)
        if (cmd_id === LOAD_PROJECT_CMD && result.result) {
            const _result = result as ServerResponses[typeof LOAD_PROJECT_CMD]
            loaded_project = _result.data?.name as string;
        }
        return result;
    }

    function on_message<T extends keyof NetMessages>(socket: WsClient, id_message: T, _message: NetMessages[T]) {
        if (id_message == 'CLIENT_CONNECT') {
            const message = _message as NetMessages['CLIENT_CONNECT'];
            const id_session = message.id_session;
            let session_data = get_session_data(id_session); 
            socket.data.id_session = id_session; 
            clients.add(id_session, socket);
        } 
    }

    function on_connect(socket: WsClient) {
    }

    function on_disconnect(socket: WsClient) {
        if (socket.data.id_session !== undefined) {
            clients.remove(socket.data.id_session);
        }
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
