import { register_client_api } from "./ClientAPI";

import { _SystemMessages_Editor } from "../modules_editor/modules_editor_const";

declare global {
    type SystemMessagesEditor = _SystemMessages_Editor;
}

export function register_editor_modules(){
    register_client_api();
}