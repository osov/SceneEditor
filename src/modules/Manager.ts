/**
 * Legacy Manager - устаревший модуль
 *
 * ВНИМАНИЕ: Этот модуль не используется в v3.0.
 * Инициализация происходит через bootstrap.ts и DI контейнер.
 * Файл сохранён для справки, может быть удалён.
 */

import { _SystemMessages, NetMessages } from "./modules_const";
import { register_ws_client } from "./WsClient";
import { register_editor_modules } from "../modules_editor/Manager_editor";
import { register_sound } from "./Sound";

declare global {
    const Manager: ReturnType<typeof ManagerModule>;
    type SystemMessages = _SystemMessages & NetMessages & SystemMessagesEditor;
}


export function register_manager() {
    (window as any).Manager = ManagerModule().init();
}


function ManagerModule() {

    function init() {
        // Legacy модули перенесены в DI:
        // - System → TimeService
        // - Log → LoggerService
        // - EventBus → EventBus (core/events)
        // - Input → InputService
        // - Camera → CameraService
        register_ws_client();
        register_sound();
        register_editor_modules();
    }
    return { init };
}


