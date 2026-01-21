/**
 * ActionsService - координатор действий редактора
 *
 * Phase 31: Разделён на модули в actions/
 */

import type { ISceneObject } from '@editor/engine/types';
import { ObjectTypes } from '@editor/core/render/types';
import type {
    IActionsService,
    ActionsServiceParams,
    CreateObjectParams,
} from './types';

// Импорт из модулей действий
import {
    create_clipboard_state,
    copy_selected,
    cut_selected,
    paste_clipboard_data,
    delete_objects_by_data,
    is_same_world,
    validate_action,
    create_object_with_history,
    create_go_with_sprite as create_go_with_sprite_action,
    create_component as create_component_action,
} from './actions';

/** Создать ActionsService */
export function create_actions_service(params: ActionsServiceParams): IActionsService {
    const { logger, event_bus, scene_service, selection_service, history_service } = params;

    // Состояние буфера обмена
    const clipboard_state = create_clipboard_state();

    // Зависимости для модулей
    const clipboard_deps = {
        logger,
        event_bus,
        selection_service,
        scene_service,
    };

    const create_deps = {
        logger,
        event_bus,
        selection_service,
        scene_service,
        history_service,
    };

    // === Операции буфера обмена ===

    function copy(): void {
        copy_selected(clipboard_state, clipboard_deps);
    }

    function cut(): void {
        cut_selected(clipboard_state, clipboard_deps);
    }

    function paste(): ISceneObject[] {
        if (clipboard_state.data.length === 0) {
            logger.warn('Буфер пуст');
            return [];
        }

        // Если было вырезано, удаляем оригиналы
        if (clipboard_state.is_cut) {
            delete_objects_by_data(clipboard_state.data, clipboard_deps);
            clipboard_state.is_cut = false;
        }

        const pasted = paste_clipboard_data(clipboard_state.data, clipboard_deps);

        logger.debug(`Вставлено ${pasted.length} объектов`);
        event_bus.emit('actions:pasted', { count: pasted.length });

        selection_service.set_selected(pasted);
        return pasted;
    }

    function paste_as_child(parent: ISceneObject): ISceneObject[] {
        if (clipboard_state.data.length === 0) {
            logger.warn('Буфер пуст');
            return [];
        }

        // Если было вырезано, удаляем оригиналы
        if (clipboard_state.is_cut) {
            delete_objects_by_data(clipboard_state.data, clipboard_deps);
            clipboard_state.is_cut = false;
        }

        const pasted = paste_clipboard_data(clipboard_state.data, clipboard_deps, parent);

        logger.debug(`Вставлено ${pasted.length} объектов как дочерние`);
        event_bus.emit('actions:pasted_as_child', {
            count: pasted.length,
            parent_id: parent.mesh_data.id,
        });

        selection_service.set_selected(pasted);
        return pasted;
    }

    // === Операции редактирования ===

    function duplicate(): ISceneObject[] {
        const selected = selection_service.selected;
        if (selected.length === 0) {
            logger.warn('Нечего дублировать');
            return [];
        }

        const data = selected.map(obj => scene_service.serialize_object(obj));
        const duplicated = paste_clipboard_data(data, clipboard_deps);

        // Записываем в историю
        history_service.push({
            type: 'duplicate',
            description: `Дублирование ${duplicated.length} объектов`,
            data: { ids: duplicated.map(o => o.mesh_data.id) },
            undo: (d) => {
                for (const id of d.ids) {
                    const obj = scene_service.get_by_id(id);
                    if (obj !== undefined) {
                        scene_service.remove(obj);
                    }
                }
            },
            redo: () => {
                const re_duplicated = paste_clipboard_data(data, clipboard_deps);
                selection_service.set_selected(re_duplicated);
            },
        });

        logger.debug(`Дублировано ${duplicated.length} объектов`);
        event_bus.emit('actions:duplicated', { count: duplicated.length });

        selection_service.set_selected(duplicated);
        return duplicated;
    }

    function delete_selected(): void {
        const selected = selection_service.selected;
        if (selected.length === 0) {
            logger.warn('Нечего удалять');
            return;
        }

        // Сохраняем данные для undo с информацией о родителе и порядке
        const deleted_data = selected.map(obj => ({
            data: scene_service.serialize_object(obj),
            parent_id: get_parent_id(obj),
            next_sibling_id: scene_service.find_next_sibling_id(obj),
        }));

        // Удаляем объекты
        for (const obj of selected) {
            scene_service.remove(obj);
        }

        // Записываем в историю
        history_service.push({
            type: 'delete',
            description: `Удаление ${selected.length} объектов`,
            data: deleted_data,
            undo: (data) => {
                for (const item of data) {
                    const restored = scene_service.deserialize_object(item.data, true);

                    if (item.parent_id !== undefined && item.parent_id !== -1) {
                        const parent = scene_service.get_by_id(item.parent_id);
                        if (parent !== undefined) {
                            parent.add(restored);
                            if (item.next_sibling_id !== undefined && item.next_sibling_id !== -1) {
                                scene_service.move(restored, item.parent_id, item.next_sibling_id);
                            }
                        } else {
                            scene_service.add(restored);
                        }
                    } else {
                        scene_service.add(restored);
                        if (item.next_sibling_id !== undefined && item.next_sibling_id !== -1) {
                            scene_service.move(restored, -1, item.next_sibling_id);
                        }
                    }
                }
                event_bus.emit('scene:changed', {});
            },
            redo: (data) => {
                for (const item of data) {
                    const obj = scene_service.get_by_id(item.data.id);
                    if (obj !== undefined) {
                        scene_service.remove(obj);
                    }
                }
            },
        });

        selection_service.clear();

        logger.debug(`Удалено ${selected.length} объектов`);
        event_bus.emit('actions:deleted', { count: selected.length });
    }

    // === Операции создания ===

    function create(type: ObjectTypes, params_obj?: Record<string, unknown>): ISceneObject {
        const obj = scene_service.create(type, params_obj);
        scene_service.add(obj);

        history_service.push({
            type: 'create',
            description: `Создание ${type}`,
            data: { id: obj.mesh_data.id, type, params: params_obj },
            undo: (data) => {
                const created = scene_service.get_by_id(data.id);
                if (created !== undefined) {
                    scene_service.remove(created);
                }
            },
            redo: (data) => {
                const recreated = scene_service.create(data.type, data.params);
                scene_service.add(recreated);
            },
        });

        logger.debug(`Создан объект типа ${type}`);
        event_bus.emit('actions:created', { id: obj.mesh_data.id, type });

        selection_service.select(obj);
        return obj;
    }

    function has_clipboard(): boolean {
        return clipboard_state.data.length > 0;
    }

    // === Методы создания специфичных объектов ===

    function add_gui_container(params: CreateObjectParams): ISceneObject {
        return create_object_with_history(ObjectTypes.GUI_CONTAINER, params, create_deps);
    }

    function add_gui_box(params: CreateObjectParams): ISceneObject {
        return create_object_with_history(ObjectTypes.GUI_BOX, params, create_deps);
    }

    function add_gui_text(params: CreateObjectParams): ISceneObject {
        return create_object_with_history(ObjectTypes.GUI_TEXT, params, create_deps);
    }

    function add_go_container(params: CreateObjectParams): ISceneObject {
        return create_object_with_history(ObjectTypes.GO_CONTAINER, params, create_deps);
    }

    function add_go_sprite(params: CreateObjectParams): ISceneObject {
        return create_object_with_history(ObjectTypes.GO_SPRITE_COMPONENT, params, create_deps);
    }

    function add_go_label(params: CreateObjectParams): ISceneObject {
        return create_object_with_history(ObjectTypes.GO_LABEL_COMPONENT, params, create_deps);
    }

    function add_go_model(params: CreateObjectParams): ISceneObject {
        return create_object_with_history(ObjectTypes.GO_MODEL_COMPONENT, params, create_deps);
    }

    function add_go_animated_model(params: CreateObjectParams): ISceneObject {
        return create_object_with_history(ObjectTypes.GO_ANIMATED_MODEL_COMPONENT, params, create_deps);
    }

    function add_go_audio(params: CreateObjectParams): ISceneObject {
        return create_object_with_history(ObjectTypes.GO_AUDIO_COMPONENT, params, create_deps);
    }

    function add_go_with_sprite(params: CreateObjectParams): ISceneObject {
        return create_go_with_sprite_action(params, create_deps);
    }

    function add_component(params: CreateObjectParams, type: number): ISceneObject {
        return create_component_action(params, type, create_deps);
    }

    // === Валидация ===

    function is_valid_action(
        target: ISceneObject | undefined,
        objects: ISceneObject[] = clipboard_state.mesh_list,
        as_child = false,
        is_move = false
    ): boolean {
        return validate_action(target, objects, as_child, is_move);
    }

    // === Вспомогательные функции ===

    function get_parent_id(obj: ISceneObject): number | undefined {
        if (obj.parent !== null && 'mesh_data' in obj.parent) {
            return (obj.parent as ISceneObject).mesh_data.id;
        }
        return undefined;
    }

    function dispose(): void {
        clipboard_state.data = [];
        clipboard_state.mesh_list = [];
        logger.info('ActionsService освобождён');
    }

    return {
        get copy_list() { return clipboard_state.mesh_list; },
        copy,
        cut,
        paste,
        paste_as_child,
        duplicate,
        delete_selected,
        create,
        has_clipboard,
        add_gui_container,
        add_gui_box,
        add_gui_text,
        add_go_container,
        add_go_sprite,
        add_go_label,
        add_go_model,
        add_go_animated_model,
        add_go_audio,
        add_go_with_sprite,
        add_component,
        is_valid_action,
        is_same_world,
        dispose,
    };
}

// Реэкспорт для обратной совместимости
export * from './actions';
