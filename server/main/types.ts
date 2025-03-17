import { ServerWebSocket } from "bun";

export interface ExtWebSocket {
    id_session: string;
    project: string;
}

export type WsClient = ServerWebSocket<ExtWebSocket>;

export type ServerCacheData = {
    current_project: string,
    current_dir: string,
    current_scene: { name?: string, path?: string },
}
