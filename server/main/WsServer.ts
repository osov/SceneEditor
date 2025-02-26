import { ServerWebSocket } from "bun";
import * as cookie_parser from 'cookie';

export function WsServer<T>(port: number,
    on_data: (client: ServerWebSocket<T>, data: String | Buffer) => void,
    on_client_connected: (client: ServerWebSocket<T>) => void,
    on_client_disconnected: (client: ServerWebSocket<T>) => void) {

    type WsClient = ServerWebSocket<T>;

    const server = Bun.serve<T>({
        port,
        fetch(req, server) {
            const cookies_str = req.headers.get("Cookie") || '';
            const cookies = cookie_parser.parse(cookies_str);
            let id_session = '';
            let headers;
            if (cookies.SessionId == undefined) {
                id_session = crypto.randomUUID();
                headers = {
                    "Set-Cookie": `SessionId=${id_session}`,
                };
            }
            else
                id_session = cookies.SessionId;

            const success = server.upgrade(req, {
                headers,
                data: {
                    id_session,
                },
            });
            if (success) return undefined;

            // handle HTTP request normally
            // ...
        },
        websocket: {
            open(ws) {
                ws.subscribe("all");
                on_client_connected(ws);
            },
            close(ws) {
                on_client_disconnected(ws);
            },
            message(ws, msg) {
                on_data(ws, msg);
            },
            perMessageDeflate: false,
            publishToSelf: true,
        },
    });

    function broadcast(data: string | ArrayBuffer) {
        server.publish("all", data);
    }

    function send(client: WsClient, data: string | ArrayBuffer) {
        client.send(data);
    }


    return { send, broadcast, server }
}