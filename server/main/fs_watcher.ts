import { watch } from "fs";
import * as fs from 'fs/promises';
import { IClients } from "./clients";
import { get_full_path } from "./fs_utils";
import path from "path";
import { FSEventType, FSObjectType, PUBLIC } from "./const";
import { send_message_socket } from "./ws_utils";
import { WsClient } from "./types";


export function FSWatcher(dir: string, sockets: WsClient[]) {
    const watcher = watch(
        dir,
        { recursive: true }, 
        async (event, filename) => {
            if (filename !== null) {
                const _dir = get_full_path(filename);
                const exists = await fs.exists(_dir);
                let obj_type: FSObjectType = "null";
                let event_type: FSEventType = event;
                if (exists) {
                    const stats = await fs.stat(_dir);
                    obj_type = stats.isFile() ? "file" : "folder";
                }
                else {
                    event_type = "removed";
                }
                const full_rel_path = path.relative(get_full_path(""), _dir);  // Путь относительно папки со всеми проектами
                const project = full_rel_path.split(path.sep)[0];    // Достаём название проекта
                const rel_path = path.relative(path.join(project, PUBLIC), full_rel_path);  // Путь относительно папки public этого проекта
                for (const soc of sockets)
                    send_message_socket(soc, "SERVER_FILE_SYSTEM_EVENT", {path: rel_path, project, obj_type, event_type})
            }
        }
    );    
}
