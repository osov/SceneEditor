import { IS_LOGGING, SERVER_URL } from "../config";
import { CommandId, URL_PATHS, AssetsResponses, ServerCommands, ServerResponses, NEW_PROJECT_CMD, GET_PROJECTS_CMD, LOAD_PROJECT_CMD, NEW_FOLDER_CMD, GET_FOLDER_CMD, COPY_CMD, DELETE_CMD, RENAME_CMD, SAVE_INFO_CMD, GET_INFO_CMD, SAVE_DATA_CMD, GET_DATA_CMD, NetMessagesEditor, TRecursiveDict, DEL_INFO_CMD, MOVE_CMD, SET_CURRENT_SCENE_CMD, OPEN_EXPLORER_CMD, DataFormatType } from "./modules_editor_const";
import { Services } from '@editor/core';
import { get_popups } from './Popups';

/** Тип ClientAPI */
export type ClientAPIType = ReturnType<typeof ClientAPIModule>;

/** Модульный instance для использования через импорт */
let client_api_instance: ClientAPIType | undefined;

/** Текущий sessionId (вместо window.currentSessionId) */
let current_session_id: string | undefined;

/** Получить текущий sessionId */
export function get_session_id(): string | undefined {
    return current_session_id;
}

/** Установить текущий sessionId */
export function set_session_id(id: string): void {
    current_session_id = id;
}

/** Получить instance ClientAPI */
export function get_client_api(): ClientAPIType {
    if (client_api_instance === undefined) {
        throw new Error('ClientAPI не инициализирован. Вызовите register_client_api() сначала.');
    }
    return client_api_instance;
}

/** Попробовать получить instance ClientAPI (без ошибки если не инициализирован) */
export function try_get_client_api(): ClientAPIType | undefined {
    return client_api_instance;
}

export function register_client_api() {
    client_api_instance = ClientAPIModule();
}

function ClientAPIModule() {
    function waitForSessionId(): Promise<{ success: boolean; sessionId?: string; error?: string }> {
        return new Promise<{ success: boolean; sessionId?: string; error?: string }>((resolve) => {
            if (current_session_id !== undefined) {
                resolve({ success: true, sessionId: current_session_id });
                return;
            }

            const checkSessionId = () => {
                if (current_session_id !== undefined) {
                    resolve({ success: true, sessionId: current_session_id });
                } else {
                    setTimeout(checkSessionId, 100);
                }
            };

            checkSessionId();

            setTimeout(() => {
                if (current_session_id === undefined) {
                    get_popups().toast.error('Не удалось подключиться к серверу. Проверьте соединение.');
                    resolve({ success: false, error: 'Не удалось подключиться к серверу. Проверьте соединение.' });
                }
            }, 10000);
        });
    }

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
        const result = await api.GET(URL_PATHS.TEST, {});
        return result;
    }

    function on_message_socket<T extends keyof NetMessagesEditor>(id_message: T, _message: NetMessagesEditor[T]) {
        //Services.logger.debug('on_message_socket', id_message, _message);
        if (id_message == 'SERVER_FILE_SYSTEM_EVENTS') {
            const message = _message as NetMessagesEditor['SERVER_FILE_SYSTEM_EVENTS'];
            Services.event_bus.emit('SERVER_FILE_SYSTEM_EVENTS', message);
        } else if (id_message == 'SESSION_ID') {
            const message = _message as NetMessagesEditor['SESSION_ID'];
            set_session_id(message.sessionId);
            IS_LOGGING && Services.logger.debug(`Получен SessionId от сервера: ${message.sessionId}`);
        }
    }


    return { set_current_scene, get_projects, load_project, new_project, new_folder, get_folder, copy, move, rename, remove, test_server_ok, save_info, get_info, del_info, save_data, get_data, open_explorer, waitForSessionId, on_message_socket }
}


export const api = {
    GET: async function (
        path: string,
        params: any = [],
    ) {
        const string_params = new URLSearchParams(params).toString();
        const headers: Record<string, string> = {};
        const sessionId = get_session_id();

        if (sessionId !== undefined) {
            headers['X-Session-ID'] = sessionId;
        }

        const resp = await try_fetch(`${SERVER_URL}${path}?${string_params}`, {
            method: 'GET',
            credentials: 'include',
            headers
        });
        return resp;
    },

    POST: async function (
        path: string,
        params: any = [],
        body?: any,
    ): Promise<Response | undefined> {
        const string_params = new URLSearchParams(params).toString();
        const headers: Record<string, string> = {};
        const sessionId = get_session_id();

        if (sessionId !== undefined) {
            headers['X-Session-ID'] = sessionId;
        }

        const init: RequestInit | undefined = {
            method: 'POST',
            credentials: 'include',
            headers
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
        const headers: Record<string, string> = {
            'Content-Type': 'application/json'
        };
        const sessionId = get_session_id();

        if (sessionId !== undefined) {
            headers['X-Session-ID'] = sessionId;
        }

        const resp = await fetch(`${SERVER_URL}${path}${command_id}`, {
            method: 'POST',
            credentials: 'include',
            headers,
            body: JSON.stringify(command)
        });
        return await resp.json() as ServerResponses[T];
    }
}

async function try_fetch(input: string | URL | globalThis.Request, init?: RequestInit): Promise<Response | undefined> {
    try {
        const result = await fetch(input, init);
        return result;
    } catch (e) {
        Services.logger.error((e as Error).message);
        return undefined;
    }
}
