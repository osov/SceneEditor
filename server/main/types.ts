import { ServerWebSocket } from "bun";

export interface ExtWebSocket {
    id_session: string;
    project: string;
}

export type WsClient = ServerWebSocket<ExtWebSocket>;
