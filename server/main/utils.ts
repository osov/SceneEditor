import { NEW_PROJECT_CMD, NEW_FOLDER_CMD, RENAME_CMD, GET_PROJECTS_CMD, COPY_CMD, DELETE_CMD, LOAD_PROJECT_CMD } from "./const";
import { AssetsCommands } from "./types";


export const EditorCommandsNames: (keyof AssetsCommands)[] = [
    GET_PROJECTS_CMD, 
    NEW_PROJECT_CMD, 
    NEW_FOLDER_CMD, 
    LOAD_PROJECT_CMD, 
    RENAME_CMD, 
    COPY_CMD, 
    DELETE_CMD
];

export function do_response(data: any, stringify = true, status?: number) {
    const options: ResponseInit = {
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "*"
        }
    };
    if (status) options.status = status;
    const body = stringify ? JSON.stringify(data) : data;
    return new Response(body, options);
}

export function json_parsable(str: string) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}

export function now() {
    return Date.now();
  }
