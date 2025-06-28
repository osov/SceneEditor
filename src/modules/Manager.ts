import { register_system } from "./System";
import { register_log } from "./Log";
import { register_event_bus } from "./EventBus";
import { _SystemMessages, NetMessages } from "./modules_const";
import { register_camera } from "./Camera";
import { register_input } from "./InputManager";
import { register_ws_client } from "./WsClient";
import { register_editor_modules } from "../modules_editor/Manager_editor";
import { register_sound } from "./Sound";

/*
    Основной модуль для подгрузки остальных, доступен по объекту Manager
*/

declare global {
    const Manager: ReturnType<typeof ManagerModule>;
    type SystemMessages = _SystemMessages & NetMessages & SystemMessagesEditor;
}


export function register_manager() {
    (window as any).Manager = ManagerModule().init();
}


function ManagerModule() {

    function init() {
        register_system();
        register_log();
        register_event_bus();
        register_input();
        register_camera();
        register_ws_client();
        register_sound();
        register_editor_modules();
    }
    return { init };
}


