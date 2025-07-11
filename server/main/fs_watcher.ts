import { watch } from "fs";
import * as fs from 'fs/promises';
import { get_full_path } from "./fs_utils";
import path from "path";
import { send_message_socket } from "./ws_utils";
import { FSEvent, FSEventType, FSObjectType, PUBLIC } from "../../src/modules_editor/modules_editor_const";
import { WsClient } from "./types";
import { send_fs_events_interval } from "../config";


export function FSWatcher(dir: string, sockets: WsClient[]) {
    const events_cache: FSEvent[] = [];

    function is_copy(event: FSEvent) {
        if (events_cache.length == 0)
            return false;
        const last = events_cache.slice(-1)[0];
        if (
            last.event_type == event.event_type &&
            last.ext == event.ext &&
            last.folder_path == event.folder_path &&
            last.path == event.path &&
            last.obj_type == event.obj_type
        ) {
            return true;
        }
        return false;
    }

    function send_events() {
        if (events_cache.length === 0) return;
        for (const soc of sockets)
            send_message_socket(soc, "SERVER_FILE_SYSTEM_EVENTS", {events: events_cache});
        events_cache.splice(0);
    }

    const timer = setInterval(send_events, send_fs_events_interval * 1000);
    const watcher = watch(
        dir,
        { recursive: true }, 
        async (_event, filename) => {
            if (filename !== null) {
                const _dir = get_full_path(filename);
                const exists = await fs.exists(_dir);
                let obj_type: FSObjectType = "null";
                let event_type: FSEventType = _event;
                if (exists) {
                    const stats = await fs.stat(_dir);
                    obj_type = stats.isFile() ? "file" : "folder";
                }
                else {
                    event_type = "remove";
                }
                const full_rel_path = path.relative(get_full_path(""), _dir);  // Путь относительно папки со всеми проектами
                const full_folder_path = path.dirname(full_rel_path);
                const project = full_rel_path.split(path.sep)[0];    // Достаём название проекта
                const rel_path = path.relative(path.join(project, PUBLIC), full_rel_path);  // Путь относительно папки public этого проекта
                const rel_folder_path = path.relative(path.join(project, PUBLIC), full_folder_path);
                const event: FSEvent = {
                    path: rel_path.replaceAll(path.sep, "/"), 
                    folder_path: rel_folder_path.replaceAll(path.sep, "/"), 
                    project, 
                    obj_type, 
                    event_type,
                };
                const ext = path.extname(rel_path).replace(".", "");
                if (ext)
                    event.ext = ext;
                log('event dir name', _dir)
                if (!is_copy(event))
                    events_cache.push(event);
            }
        }
    );    
}
