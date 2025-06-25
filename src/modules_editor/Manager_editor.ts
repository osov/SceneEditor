import { register_client_api } from "./ClientAPI";
import { register_inspector } from "./Inspector";

import { _SystemMessagesEditor, NetMessagesEditor } from "../modules_editor/modules_editor_const";

declare global {
    type SystemMessagesEditor = _SystemMessagesEditor & NetMessagesEditor;
}

export function register_editor_modules() {
    register_client_api();
    register_inspector();
}