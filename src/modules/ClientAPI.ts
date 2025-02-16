import { SERVER_URL } from "../config";
import { CommandId, URL_PATHS, AssetsResponses, FSObject, ServerCommands, ServerResponses, NEW_PROJECT_CMD, GET_PROJECTS_CMD, LOAD_PROJECT_CMD, NEW_FOLDER_CMD, GET_FOLDER_CMD, COPY_CMD, DELETE_CMD, RENAME_CMD } from "./modules_const";


declare global {
    const ClientAPI: ReturnType<typeof ClientAPIModule>;
}

export function register_client_api() {
    (window as any).ClientAPI = ClientAPIModule();
}
function ClientAPIModule() {
    async function get_projects(): Promise<FSObject[]> {
        const command_id = GET_PROJECTS_CMD;
        const resp = await api.command<typeof command_id>(URL_PATHS.API, command_id, {});
        if (resp.result === 1 && resp.data != undefined) {
            return resp.data;
        }
        return [];
    }

    async function load_project(project: string): Promise<AssetsResponses[typeof LOAD_PROJECT_CMD]> {
        const command_id = LOAD_PROJECT_CMD;
        return await api.command<typeof command_id>(URL_PATHS.API, command_id, {project});
    }
    
    async function new_project(project: string): Promise<AssetsResponses[typeof NEW_PROJECT_CMD]> {
        const command_id = NEW_PROJECT_CMD;
        return await api.command<typeof command_id>(URL_PATHS.API, command_id, {project});
    }

    async function new_folder(project: string, path: string, name: string): Promise<AssetsResponses[typeof NEW_FOLDER_CMD]> {
        const command_id = NEW_FOLDER_CMD;
        return await api.command<typeof command_id>(URL_PATHS.API, command_id, {project, path, name});
    }

    async function get_folder(project: string, path: string, name: string): Promise<AssetsResponses[typeof GET_FOLDER_CMD]> {
        const command_id = GET_FOLDER_CMD;
        return await api.command<typeof command_id>(URL_PATHS.API, command_id, {project, path, name});
    }

    async function copy(project: string, path: string, new_path: string): Promise<AssetsResponses[typeof COPY_CMD]> {
        const command_id = COPY_CMD;
        return await api.command<typeof command_id>(URL_PATHS.API, command_id, {project, path, new_path});
    }

    async function rename(project: string, path: string, name: string, new_name: string): Promise<AssetsResponses[typeof RENAME_CMD]> {
        const command_id = RENAME_CMD;
        return await api.command<typeof command_id>(URL_PATHS.API, command_id, {project, path, name, new_name});
    }

    async function remove(project: string, path: string, name: string): Promise<AssetsResponses[typeof DELETE_CMD]> {
        const command_id = DELETE_CMD;
        return await api.command<typeof command_id>(URL_PATHS.API, command_id, {project, path, name});
    }

    async function test_server_ok() {
        return await api.GET(URL_PATHS.TEST, {});
    }

    return {get_projects, load_project, new_project, new_folder, get_folder, copy, rename, remove, test_server_ok}
}


const api = {
    GET: async function (
        path: string,
        params: any,
    ) {     
        const string_params = new URLSearchParams(params).toString()
        const resp = await try_fetch(`${SERVER_URL}${path}?${string_params}`, {
            method: 'GET',
        });
        if (resp) {
            const text_response = await resp.text();
            return JSON.parse(text_response);
        }
    },

    // POST: async function<T> (
    //     path: string,
    //     params: any,
    // ): Promise<T> {       
    // },

    command: async function<T extends CommandId> (
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
        return undefined;
    }
}

function project_file_path(path: string) {
    return `${SERVER_URL}${path}`;
}
