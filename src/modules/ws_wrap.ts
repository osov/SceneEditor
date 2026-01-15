import { NetMessagesEditor } from "../modules_editor/modules_editor_const";
import { Services } from '@editor/core';

type NetMessages = NetMessagesEditor;

export function WsWrap(on_open: () => void, on_close: () => void, on_error: () => void, on_message: (data: string|Uint8Array) => void) {
    const logger = Services.logger;
    let client: WebSocket;
    let _is_connected = false;
    let timer: Timer | undefined;
    let is_binary = false;

    function connect(url: string) {
        if (is_connected()) return;
        client = new WebSocket(url);
        if (is_binary)
            client.binaryType = 'arraybuffer';
        client.onopen = (_e) => {
            _is_connected = true;
            on_open();
        }

        client.onclose = (_e) => {
            _is_connected = false;
            on_close();
        }

        client.onerror = (_e) => {
            on_error();
        }

        client.onmessage = (e) => {
            on_message(e.data);
        }
    }

    function set_binary(){
        is_binary = true;
    }

    function disconnect() {
        if (is_connected())
            client.close();
    }

    function is_connected() {
        return client != undefined && _is_connected;
    }

    function send_raw(data: string | Uint8Array<ArrayBufferLike>) {
        if (is_connected())
            client.send(data);
        else
            logger.error("Not connected");
    }

    function send_message<T extends keyof NetMessages>(id_message: T, message: NetMessages[T]) {
        send_raw(JSON.stringify({ id: id_message, message }));
    }

    function set_reconnect_timer(url: string, time: number) {
        stop_reconnect_timer();
        connect(url);
        timer = setInterval(() => connect(url), time * 1000);
    }

    function stop_reconnect_timer() {
        clearInterval(timer);
    }

    return { connect, disconnect, send_message, send_raw, is_connected, set_reconnect_timer, stop_reconnect_timer, set_binary }
}