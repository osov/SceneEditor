import { ProtocolWrapper, TDictionary, NetMessagesEditor as NetMessages } from "../../src/modules_editor/modules_editor_const";
import { WsClient } from "./types";


type FilterCallback = (client: WsClient) => void;

export type IClients = ReturnType<typeof Clients>;

export function Clients() {
    const connected_sockets: TDictionary<WsClient> = {};
    const buffer_messages: ProtocolWrapper[] = [];

    // добавляет сообщение в буфер
    function add_message<T extends keyof NetMessages>(id_message: T, message: NetMessages[T]) {
        buffer_messages.push({ id: id_message, message: JSON.parse(JSON.stringify(message)) });
    }

    function add(id_session: string, socket: WsClient) {
        connected_sockets[id_session] = socket;
    }

    function remove(id_session: string) {
        delete connected_sockets[id_session]
    }

    function make_message<T extends keyof NetMessages>(id: T, message: NetMessages[T]) {
          return JSON.stringify({ id, message });
    }

    // отправить конкретному сокету данные
    function send_data_socket(socket: WsClient, data: string) {
        if (socket.readyState === WebSocket.OPEN)
            socket.send(data);
    }

    // отправить конкретному сокету
    function send_message_socket<T extends keyof NetMessages>(socket: WsClient, id_message: T, message: NetMessages[T]) {
        send_data_socket(socket, make_message(id_message, message));
    }

    // отправить конкретному сокету
    function send_message_id_user<T extends keyof NetMessages>(id: number, id_message: T, message: NetMessages[T]) {
        const socket = connected_sockets[id];
        if (socket && socket.readyState === WebSocket.OPEN)
            socket.send(make_message(id_message, message));
    }

    function send_message_all<T extends keyof NetMessages>(id_message: T, message: NetMessages[T], except_socket?: WsClient) {
        const pack = make_message(id_message, message);
        for (const client_id in connected_sockets) {
            const client = connected_sockets[client_id];
            if (client != except_socket && client.readyState === WebSocket.OPEN) {
                client.send(pack);
            }
        }
    }

    // отправить всем собранный буффер
    function send_full_buffer() {
        const buf = buffer_messages.slice(0);
        buffer_messages.splice(0, buffer_messages.length);
        for (let i = 0; i < buf.length; i++) {
            send_message_all(buf[i].id as keyof NetMessages, buf[i].message);
        }
    }

    function for_each(filter: FilterCallback) {
        for (const client_id in connected_sockets) {
            const client = connected_sockets[client_id];
            if (client.readyState === WebSocket.OPEN) {
                filter(client);
            }
        }
    }

    function get_client_by_id(id: number) {
        return connected_sockets[id];
    }

    return { add, remove, make_message, send_data_socket, send_message_socket, send_message_all, for_each, get_client_by_id, send_message_id_user, connected_sockets, send_full_buffer }
}