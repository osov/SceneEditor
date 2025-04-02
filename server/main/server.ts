import path from "path";
import { Router } from "bun-serve-router";
import { ExtWebSocket, WsClient } from "./types";
import { ServerResponses, NetMessagesEditor as NetMessages, CommandId, URL_PATHS, CMD_NAME, ServerData} from "../../src/modules_editor/modules_editor_const";
import { do_response, json_parsable } from "./utils";
import { get_asset_path, get_full_path } from "./fs_utils";
import { WsServer } from "./WsServer";
import { FSWatcher } from "./fs_watcher";
import { ERROR_TEXT } from "./const";
import { use_queues_when_write_file } from "../config";
import { Logic } from "./logic";

declare global {
    const current: typeof _DATA;
}

export function register_server_global_data() {
    (global as any).current = _DATA;
}

export const _DATA: ServerData = {
    project:  undefined,
    dir: "",
    scene: {},
}

export async function Server(server_port: number, ws_server_port: number) {
    // const clients = Clients();
    const logic = Logic(use_queues_when_write_file);
    let sockets: WsClient[] = [];
    const fs_watcher = FSWatcher(get_full_path(""), sockets);
    const router = new Router();
    current.project = undefined;
    current.dir = "";
    current.scene = {};

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
                const project = current.project;
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
        if (current.project) {
            const file = await logic.get_file(current.project, asset_path);
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
        return do_response(result);
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
        if (data && !json_parsable(data)) 
            return {message: ERROR_TEXT.WRONG_JSON, result: 0};
        const params = (data) ? JSON.parse(data) : {};
        const result = await logic.handle_command(cmd_id, params);
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

