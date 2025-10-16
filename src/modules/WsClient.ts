import { NetMessagesEditor } from "../modules_editor/modules_editor_const";
import { WsWrap } from "./ws_wrap";

type NetMessages = NetMessagesEditor;

declare global {
    const WsClient: ReturnType<typeof WsClientModule>;
}

export function register_ws_client() {
    (window as any).WsClient = WsClientModule();
}


function WsClientModule() {
    const logger = Log.get_with_prefix('WsClient');

    const ws_wrap = WsWrap(
        () => EventBus.trigger('ON_WS_CONNECTED', {}),
        () =>  EventBus.trigger('ON_WS_DISCONNECTED', {}), 
        () => { },
        (e) =>  EventBus.trigger('ON_WS_DATA', { data: e })
    );

    function set_binary(){
        ws_wrap.set_binary();
    }
    function connect(url: string) {
        ws_wrap.connect(url);
    }

    function disconnect() {
        ws_wrap.disconnect();
    }

    function is_connected() {
        return ws_wrap.is_connected();
    }

    function send_raw(data: string | Uint8Array<ArrayBufferLike>) {
        ws_wrap.send_raw(data);
    }

    function send_message<T extends keyof NetMessages>(id_message: T, message: NetMessages[T]) {
        send_raw(JSON.stringify({ id: id_message, message }));
    }

  

    return { connect, disconnect, send_message, send_raw, is_connected, set_binary }
}