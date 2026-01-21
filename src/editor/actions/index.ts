/**
 * Actions - модули действий редактора
 */

// Константы
export { GUI_TYPES, GO_TYPES, type GuiObjectType, type GoObjectType } from './constants';

// Валидация
export { get_object_world, is_same_world, validate_action } from './validation';

// Clipboard операции
export {
    type ClipboardState,
    type ClipboardDeps,
    create_clipboard_state,
    copy_selected,
    cut_selected,
    paste_clipboard_data,
    delete_objects_by_data,
} from './clipboard_actions';

// Create операции
export {
    type CreateDeps,
    create_object_with_history,
    create_go_with_sprite,
    create_component,
} from './create_actions';
