import { SERVER_URL } from "../config";
import { CommandId, URL_PATHS, AssetsResponses, ServerCommands, ServerResponses, NEW_PROJECT_CMD, GET_PROJECTS_CMD, LOAD_PROJECT_CMD, NEW_FOLDER_CMD, GET_FOLDER_CMD, COPY_CMD, DELETE_CMD, RENAME_CMD, SAVE_INFO_CMD, GET_INFO_CMD, SAVE_DATA_CMD, GET_DATA_CMD, NetMessagesEditor, ProtocolWrapper, TRecursiveDict, DEL_INFO_CMD, MOVE_CMD, SET_CURRENT_SCENE_CMD, OPEN_EXPLORER_CMD, DataFormatType } from "./modules_editor_const";


declare global {
    const ClientAPI: ReturnType<typeof ClientAPIModule>;
}

export function register_client_api() {
    (window as any).ClientAPI = ClientAPIModule();
}
function ClientAPIModule() {
    async function set_current_scene(path: string): Promise<AssetsResponses[typeof SET_CURRENT_SCENE_CMD]> {
        const command_id = SET_CURRENT_SCENE_CMD;
        return await api.command<typeof command_id>(URL_PATHS.API, command_id, { path });
    }

    async function get_projects(): Promise<string[]> {
        const command_id = GET_PROJECTS_CMD;
        const resp = await api.command<typeof command_id>(URL_PATHS.API, command_id, {});
        if (resp.result === 1 && resp.data != undefined) {
            return resp.data;
        }
        return [];
    }

    async function load_project(project: string): Promise<AssetsResponses[typeof LOAD_PROJECT_CMD]> {
        const command_id = LOAD_PROJECT_CMD;
        return await api.command<typeof command_id>(URL_PATHS.API, command_id, { project });
    }

    async function new_project(project: string): Promise<AssetsResponses[typeof NEW_PROJECT_CMD]> {
        const command_id = NEW_PROJECT_CMD;
        return await api.command<typeof command_id>(URL_PATHS.API, command_id, { project });
    }

    async function new_folder(path: string, name: string): Promise<AssetsResponses[typeof NEW_FOLDER_CMD]> {
        const command_id = NEW_FOLDER_CMD;
        return await api.command<typeof command_id>(URL_PATHS.API, command_id, { path, name });
    }

    async function get_folder(path: string): Promise<AssetsResponses[typeof GET_FOLDER_CMD]> {
        const command_id = GET_FOLDER_CMD;
        return await api.command<typeof command_id>(URL_PATHS.API, command_id, { path });
    }

    async function copy(path: string, new_path: string): Promise<AssetsResponses[typeof COPY_CMD]> {
        const command_id = COPY_CMD;
        return await api.command<typeof command_id>(URL_PATHS.API, command_id, { path, new_path });
    }

    async function move(path: string, new_path: string): Promise<AssetsResponses[typeof MOVE_CMD]> {
        const command_id = MOVE_CMD;
        return await api.command<typeof command_id>(URL_PATHS.API, command_id, { path, new_path });
    }

    async function rename(path: string, new_path: string): Promise<AssetsResponses[typeof RENAME_CMD]> {
        const command_id = RENAME_CMD;
        return await api.command<typeof command_id>(URL_PATHS.API, command_id, { path, new_path });
    }

    async function remove(path: string): Promise<AssetsResponses[typeof DELETE_CMD]> {
        const command_id = DELETE_CMD;
        return await api.command<typeof command_id>(URL_PATHS.API, command_id, { path });
    }

    async function save_data(path: string, data: string, format: DataFormatType = "string"): Promise<AssetsResponses[typeof SAVE_DATA_CMD]> {
        const command_id = SAVE_DATA_CMD;
        return await api.command<typeof command_id>(URL_PATHS.API, command_id, { path, data, format });
    }

    async function get_data(path: string): Promise<AssetsResponses[typeof GET_DATA_CMD]> {
        const command_id = GET_DATA_CMD;
        return await api.command<typeof command_id>(URL_PATHS.API, command_id, { path });
    }

    async function save_info(path: string, data: TRecursiveDict): Promise<AssetsResponses[typeof SAVE_INFO_CMD]> {
        const command_id = SAVE_INFO_CMD;
        return await api.command<typeof command_id>(URL_PATHS.API, command_id, { path, data });
    }

    async function get_info(path: string): Promise<AssetsResponses[typeof GET_INFO_CMD]> {
        const command_id = GET_INFO_CMD;
        return await api.command<typeof command_id>(URL_PATHS.API, command_id, { path });
    }

    async function del_info(path: string): Promise<AssetsResponses[typeof DEL_INFO_CMD]> {
        const command_id = DEL_INFO_CMD;
        return await api.command<typeof command_id>(URL_PATHS.API, command_id, { path });
    }

    async function open_explorer(path: string): Promise<AssetsResponses[typeof OPEN_EXPLORER_CMD]> {
        const command_id = OPEN_EXPLORER_CMD;
        return await api.command<typeof command_id>(URL_PATHS.API, command_id, { path });
    }

    async function test_server_ok() {
        return await api.GET(URL_PATHS.TEST, {});
    }

    function on_message_socket<T extends keyof NetMessagesEditor>(id_message: T, _message: NetMessagesEditor[T]) {
        Log.log('on_message_socket', id_message, _message);
        if (id_message == 'SERVER_FILE_SYSTEM_EVENTS') {
            const message = _message as NetMessagesEditor['SERVER_FILE_SYSTEM_EVENTS'];
            EventBus.trigger('SERVER_FILE_SYSTEM_EVENTS', message);
        }
    }

    EventBus.on('ON_WS_CONNECTED', (m) => {

    });
    EventBus.on('ON_WS_DATA', (m) => {
        const data = JSON.parse(m.data) as ProtocolWrapper;
        on_message_socket(data.id as keyof NetMessagesEditor, data.message);
    });

    return { set_current_scene, get_projects, load_project, new_project, new_folder, get_folder, copy, move, rename, remove, test_server_ok, save_info, get_info, del_info, save_data, get_data, open_explorer }
}


export const api = {
    GET: async function (
        path: string,
        params: any = [],
    ) {
        const string_params = new URLSearchParams(params).toString();
        const resp = await try_fetch(`${SERVER_URL}${path}?${string_params}`, {
            method: 'GET',
        });
        return resp;
    },

    POST: async function (
        path: string,
        params: any = [],
        body?: any,
    ): Promise<Response | undefined> {
        const string_params = new URLSearchParams(params).toString();
        const init: RequestInit | undefined = {
            method: 'POST',
        };
        if (body) init.body = body;
        const resp = await try_fetch(`${SERVER_URL}${path}?${string_params}`, init);
        return resp;
    },

    command: async function <T extends CommandId>(
        path: string,
        command_id: T,
        command: ServerCommands[T],
    ): Promise<ServerResponses[T]> {
        const resp = await fetch(`${SERVER_URL}${path}${command_id}`, {
            method: 'POST',
            body: JSON.stringify(command)
        });
        return await resp.json() as ServerResponses[T];
    }
}

async function try_fetch(input: string | URL | globalThis.Request, init?: RequestInit): Promise<Response | undefined> {
    try {
        return await fetch(input, init);
    } catch (e) {
        Log.error(e);
    }
}
