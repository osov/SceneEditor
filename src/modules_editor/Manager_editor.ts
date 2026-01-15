import { register_client_api } from "./ClientAPI";
import { register_inspector } from "./Inspector";
import { register_tree_control } from "./TreeControl";
import { register_control_manager } from "./ControlManager";
import { register_inspector_control } from "./InspectorControl";

import { _SystemMessagesEditor, NetMessagesEditor } from "./modules_editor_const";

declare global {
    type SystemMessagesEditor = _SystemMessagesEditor & NetMessagesEditor;
}

export function register_editor_modules() {
    register_client_api();
    register_inspector();
    register_tree_control();
    register_control_manager();
    register_inspector_control();
}