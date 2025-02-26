import { _GAME_CONFIG, _UserMessages } from "../config";
import { register_system } from "./System";
import { register_log } from "./Log";
import { register_event_bus } from "./EventBus";
import { _SystemMessages } from "./modules_const";
import { register_camera } from "./Camera";
import { register_input } from "./InputManager";
import { register_client_api } from "../modules_editor/ClientAPI";
import { register_ws_client } from "./WsClient";
import { _SystemMessages_Editor } from "../modules_editor/modules_editor_const";

/*
    Основной модуль для подгрузки остальных, доступен по объекту Manager
*/

declare global {
    const Manager: ReturnType<typeof ManagerModule>;
    const GAME_CONFIG: typeof _GAME_CONFIG;
    type UserMessages = _UserMessages;
    type SystemMessages = _SystemMessages & _SystemMessages_Editor;
}


export function register_manager() {
    (window as any).GAME_CONFIG = _GAME_CONFIG;
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
        register_client_api();
    }
    return { init };
}


