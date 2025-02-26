import { PING_INTERVAL } from "../config";
import { NetMessages as NetMessagesBase } from "./modules_const";
import { NetMessagesEditor } from "../modules_editor/modules_editor_const";

type NetMessages = NetMessagesBase & NetMessagesEditor;

declare global {
    const WsClient: ReturnType<typeof WsClientModule>;
}

export function register_ws_client() {
    (window as any).WsClient = WsClientModule();
}

type CbOnMessage = (data: string) => void;

function WsClientModule() {
    const logger = Log.get_with_prefix('WsClient');
    let client: WebSocket;
    let _is_connected = false;
    let cb_on_message: CbOnMessage;
    let is_message_callback = false;


    function set_on_message_callback(callback: CbOnMessage) {
        is_message_callback = true;
        cb_on_message = callback;
    }

    function connect(url: string) {
        if (WsClient.is_connected()) return;
        client = new WebSocket(url);
        client.onopen = (e) => {
            logger.log('open');
            _is_connected = true;
            EventBus.trigger('ON_WS_CONNECTED', {});
            //client.send(json.encode({ }));
        }
        
        client.onclose = (e) => {
            logger.log('close');
            _is_connected = false;
            EventBus.trigger('ON_WS_DISCONNECTED', {});
        }
        
        client.onerror = (e) => {
            logger.log('error', e);
        }
        
        client.onmessage = (e) => {
            // logger.log('message', e.data.toString());
            if (is_message_callback)
                cb_on_message(e.data.toString());
            else
                EventBus.trigger('ON_WS_DATA', { data: e.data.toString() });
        }
    }

    function disconnect() {
        if (is_connected())
            client.close();
    }

    function is_connected() {
        // logger.log(client, _is_connected)
        return client != undefined && _is_connected;
    }

    function send_raw(data: string) {
        if (is_connected())
            client.send(data);
        else
            logger.error("Not connected");
    }

    function send_message<T extends keyof NetMessages>(id_message: T, message: NetMessages[T]) {
        send_raw(JSON.stringify({ id: id_message, message }));
    }

    // const send_command = function <T extends keyof Messages>(id_message: T, message?: Messages[T]) {
    //     WsClient.send_message('CS_Command', {id: id_message, message});
    // };

    return {connect, disconnect, send_message, send_raw, is_connected}
}