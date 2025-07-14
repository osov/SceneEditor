import { ServerWebSocket } from "bun";
import { ISessionManager } from "./session_manager";

export function WsServer<T>(port: number,
    on_data: (client: ServerWebSocket<T>, data: String | Buffer) => void,
    on_client_connected: (client: ServerWebSocket<T>) => void,
    on_client_disconnected: (client: ServerWebSocket<T>) => void,
    sessionManager?: ISessionManager) {

    type WsClient = ServerWebSocket<T>;

    const server = Bun.serve<T, any>({
        port,
        fetch(req, server) {
            if (req.method === "OPTIONS") {
                const origin = req.headers.get("Origin");
                const headers: Record<string, string> = {
                    "Access-Control-Allow-Headers": "Content-Type, X-Session-ID, Authorization",
                    "Access-Control-Allow-Methods": "*",
                    "Access-Control-Allow-Credentials": "true"
                };
                if (origin) headers["Access-Control-Allow-Origin"] = origin;
                return new Response(null, {
                    status: 200,
                    headers
                });
            }

            const origin = req.headers.get("Origin");
            const headers: Record<string, string> = {
                "Access-Control-Allow-Headers": "Content-Type, X-Session-ID, Authorization",
                "Access-Control-Allow-Methods": "*",
                "Access-Control-Allow-Credentials": "true"
            };
            if (origin) headers["Access-Control-Allow-Origin"] = origin;

            // NOTE: при создании вебсокета, пориписываем ему уникальный sessionId
            const success = server.upgrade(req, {
                headers,
                data: {
                    id_session: crypto.randomUUID(),
                },
            });
            if (success) return undefined;

            const responseHeaders: Record<string, string> = {
                "Access-Control-Allow-Headers": "Content-Type, X-Session-ID, Authorization",
                "Access-Control-Allow-Methods": "*",
                "Access-Control-Allow-Credentials": "true"
            };
            if (origin) responseHeaders["Access-Control-Allow-Origin"] = origin;
            return new Response("WebSocket server", {
                status: 200,
                headers: responseHeaders
            });
        },
        websocket: {
            open(ws) {
                const sessionId = ws.data.id_session;

                const sessionMessage = JSON.stringify({
                    id: 'SESSION_ID',
                    message: { sessionId }
                });
                ws.send(sessionMessage);

                if (sessionManager) {
                    sessionManager.createSession(sessionId);
                }

                ws.subscribe("all");
                on_client_connected(ws);
            },
            close(ws) {
                if (sessionManager && ws.data && ws.data.id_session) {
                    sessionManager.removeSession(ws.data.id_session);
                }
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

    log("Запущен вебсокет сервер на порту " + port);

    return { send, broadcast, server }
}