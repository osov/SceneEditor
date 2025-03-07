import { WsClient } from "./types";
import { NetMessagesEditor as NetMessages } from "../../src/modules_editor/modules_editor_const";


export function make_message<T extends keyof NetMessages>(id: T, message: NetMessages[T]) {
    return JSON.stringify({ id, message });
}

export function send_data_socket(socket: WsClient, data: string) {
if (socket.readyState === WebSocket.OPEN)
    socket.send(data);
}

export function send_message_socket<T extends keyof NetMessages>(socket: WsClient, id_message: T, message: NetMessages[T]) {
send_data_socket(socket, make_message(id_message, message));
}
