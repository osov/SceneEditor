import { register_client_api } from "./ClientAPI";

import { _SystemMessagesEditor, NetMessagesEditor } from "../modules_editor/modules_editor_const";

declare global {
    type SystemMessagesEditor = _SystemMessagesEditor & NetMessagesEditor;
}

export function register_editor_modules(){
    register_client_api();
}