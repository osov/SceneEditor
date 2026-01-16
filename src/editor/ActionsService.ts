/**
 * ActionsService - сервис действий редактора
 *
 * Реализует копирование, вставку, удаление,
 * дублирование и создание объектов.
 */

import type { ISceneObject } from '@editor/engine/types';
import { ObjectTypes } from '@editor/core/render/types';
import type { BaseEntityData } from '@editor/core/render/types';
import type {
    IActionsService,
    ActionsServiceParams,
    CreateObjectParams,
} from './types';

/** Создать ActionsService */
export function create_actions_service(params: ActionsServiceParams): IActionsService {
    const { logger, event_bus, scene_service, selection_service, history_service } = params;

    // Буфер обмена
    let clipboard: BaseEntityData[] = [];
    let copy_mesh_list: ISceneObject[] = [];
    let is_cut = false;

    // GUI типы объектов
    const GUI_TYPES = [
        ObjectTypes.GUI_CONTAINER,
        ObjectTypes.GUI_BOX,
        ObjectTypes.GUI_TEXT,
    ];

    // GO типы объектов
    const GO_TYPES = [
        ObjectTypes.GO_CONTAINER,
        ObjectTypes.GO_SPRITE_COMPONENT,
        ObjectTypes.GO_LABEL_COMPONENT,
        ObjectTypes.GO_MODEL_COMPONENT,
        ObjectTypes.GO_ANIMATED_MODEL_COMPONENT,
        ObjectTypes.GO_AUDIO_COMPONENT,
    ];

    function copy(): void {
        const selected = selection_service.selected;
        if (selected.length === 0) {
            logger.warn('Нечего копировать');
            return;
        }

        clipboard = selected.map(obj => scene_service.serialize_object(obj));
        copy_mesh_list = [...selected];
        is_cut = false;

        logger.debug(`Скопировано ${clipboard.length} объектов`);
        event_bus.emit('actions:copied', { count: clipboard.length });
    }

    function cut(): void {
        const selected = selection_service.selected;
        if (selected.length === 0) {
            logger.warn('Нечего вырезать');
            return;
        }

        clipboard = selected.map(obj => scene_service.serialize_object(obj));
        is_cut = true;

        logger.debug(`Вырезано ${clipboard.length} объектов`);
        event_bus.emit('actions:cut', { count: clipboard.length });
    }

    function paste(): ISceneObject[] {
        if (clipboard.length === 0) {
            logger.warn('Буфер пуст');
            return [];
        }

        // Если было вырезано, удаляем оригиналы
        if (is_cut) {
            delete_objects_by_data(clipboard);
            is_cut = false;
        }

        const pasted = paste_data(clipboard);

        logger.debug(`Вставлено ${pasted.length} объектов`);
        event_bus.emit('actions:pasted', { count: pasted.length });

        // Выделяем вставленные объекты
        selection_service.set_selected(pasted);

        return pasted;
    }

    function paste_as_child(parent: ISceneObject): ISceneObject[] {
        if (clipboard.length === 0) {
            logger.warn('Буфер пуст');
            return [];
        }

        // Если было вырезано, удаляем оригиналы
        if (is_cut) {
            delete_objects_by_data(clipboard);
            is_cut = false;
        }

        const pasted = paste_data(clipboard, parent);

        logger.debug(`Вставлено ${pasted.length} объектов как дочерние`);
        event_bus.emit('actions:pasted_as_child', {
            count: pasted.length,
            parent_id: parent.mesh_data.id,
        });

        // Выделяем вставленные объекты
        selection_service.set_selected(pasted);

        return pasted;
    }

    function duplicate(): ISceneObject[] {
        const selected = selection_service.selected;
        if (selected.length === 0) {
            logger.warn('Нечего дублировать');
            return [];
        }

        const data = selected.map(obj => scene_service.serialize_object(obj));
        const duplicated = paste_data(data);

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
                // При redo создаём заново
                const re_duplicated = paste_data(data);
                selection_service.set_selected(re_duplicated);
            },
        });

        logger.debug(`Дублировано ${duplicated.length} объектов`);
        event_bus.emit('actions:duplicated', { count: duplicated.length });

        // Выделяем дублированные объекты
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
                // Восстанавливаем объекты с оригинальными ID и родителями
                for (const item of data) {
                    const restored = scene_service.deserialize_object(item.data, true);

                    // Добавляем к оригинальному родителю или в корень сцены
                    if (item.parent_id !== undefined && item.parent_id !== -1) {
                        const parent = scene_service.get_by_id(item.parent_id);
                        if (parent !== undefined) {
                            parent.add(restored);
                            // Восстанавливаем позицию в иерархии
                            if (item.next_sibling_id !== undefined && item.next_sibling_id !== -1) {
                                scene_service.move(restored, item.parent_id, item.next_sibling_id);
                            }
                        } else {
                            scene_service.add(restored);
                        }
                    } else {
                        scene_service.add(restored);
                        // Восстанавливаем позицию в корне сцены
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

        // Очищаем выделение
        selection_service.clear();

        logger.debug(`Удалено ${selected.length} объектов`);
        event_bus.emit('actions:deleted', { count: selected.length });
    }

    function create(type: ObjectTypes, params_obj?: Record<string, unknown>): ISceneObject {
        const obj = scene_service.create(type, params_obj);
        scene_service.add(obj);

        // Записываем в историю
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

        // Выделяем созданный объект
        selection_service.select(obj);

        return obj;
    }

    function has_clipboard(): boolean {
        return clipboard.length > 0;
    }

    // Вспомогательные функции

    function paste_data(data: BaseEntityData[], parent?: ISceneObject): ISceneObject[] {
        const result: ISceneObject[] = [];

        for (const item of data) {
            const obj = scene_service.create(item.type, item.other_data);

            // Восстанавливаем трансформацию
            if (item.position !== undefined) {
                obj.position.set(item.position[0], item.position[1], item.position[2]);
            }

            obj.name = item.name;
            obj.visible = item.visible;

            if (parent !== undefined) {
                parent.add(obj);
            } else {
                scene_service.add(obj);
            }

            result.push(obj);
        }

        return result;
    }

    function delete_objects_by_data(data: BaseEntityData[]): void {
        for (const item of data) {
            const obj = scene_service.get_by_id(item.id);
            if (obj !== undefined) {
                scene_service.remove(obj);
            }
        }
    }

    function get_parent_id(obj: ISceneObject): number | undefined {
        if (obj.parent !== null && 'mesh_data' in obj.parent) {
            return (obj.parent as ISceneObject).mesh_data.id;
        }
        return undefined;
    }

    // === Методы создания специфичных объектов ===

    function create_object_with_params(type: ObjectTypes, params: CreateObjectParams): ISceneObject {
        const create_params: Record<string, unknown> = {};

        if (params.texture !== undefined) {
            create_params.texture = params.texture;
        }
        if (params.atlas !== undefined) {
            create_params.atlas = params.atlas;
        }
        if (params.size !== undefined) {
            create_params.size = params.size;
        }

        const obj = scene_service.create(type, create_params);

        // Устанавливаем позицию
        if (params.pos !== undefined) {
            obj.position.set(params.pos.x, params.pos.y, params.pos.z ?? 0);
        }

        // Устанавливаем родителя
        if (params.pid !== undefined && params.pid !== -1) {
            const parent = scene_service.get_by_id(params.pid);
            if (parent !== undefined) {
                parent.add(obj);
            } else {
                scene_service.add(obj);
            }
        } else {
            scene_service.add(obj);
        }

        // Записываем в историю
        history_service.push({
            type: 'create',
            description: `Создание ${type}`,
            data: { id: obj.mesh_data.id, type, params },
            undo: (data) => {
                const created = scene_service.get_by_id(data.id);
                if (created !== undefined) {
                    scene_service.remove(created);
                }
            },
            redo: (data) => {
                create_object_with_params(data.type, data.params);
            },
        });

        event_bus.emit('actions:created', { id: obj.mesh_data.id, type });
        selection_service.select(obj);

        return obj;
    }

    function add_gui_container(params: CreateObjectParams): ISceneObject {
        return create_object_with_params(ObjectTypes.GUI_CONTAINER, params);
    }

    function add_gui_box(params: CreateObjectParams): ISceneObject {
        return create_object_with_params(ObjectTypes.GUI_BOX, params);
    }

    function add_gui_text(params: CreateObjectParams): ISceneObject {
        return create_object_with_params(ObjectTypes.GUI_TEXT, params);
    }

    function add_go_container(params: CreateObjectParams): ISceneObject {
        return create_object_with_params(ObjectTypes.GO_CONTAINER, params);
    }

    function add_go_sprite(params: CreateObjectParams): ISceneObject {
        return create_object_with_params(ObjectTypes.GO_SPRITE_COMPONENT, params);
    }

    function add_go_label(params: CreateObjectParams): ISceneObject {
        return create_object_with_params(ObjectTypes.GO_LABEL_COMPONENT, params);
    }

    function add_go_model(params: CreateObjectParams): ISceneObject {
        return create_object_with_params(ObjectTypes.GO_MODEL_COMPONENT, params);
    }

    function add_go_animated_model(params: CreateObjectParams): ISceneObject {
        return create_object_with_params(ObjectTypes.GO_ANIMATED_MODEL_COMPONENT, params);
    }

    function add_go_audio(params: CreateObjectParams): ISceneObject {
        return create_object_with_params(ObjectTypes.GO_AUDIO_COMPONENT, params);
    }

    function add_go_with_sprite(params: CreateObjectParams): ISceneObject {
        // Создаём GO контейнер
        const go = scene_service.create(ObjectTypes.GO_CONTAINER);

        // Устанавливаем позицию контейнера
        if (params.pos !== undefined) {
            go.position.set(params.pos.x, params.pos.y, params.pos.z ?? 0);
        }

        // Создаём спрайт как дочерний
        const sprite_params: Record<string, unknown> = {};
        if (params.size !== undefined) {
            sprite_params.width = params.size.w;
            sprite_params.height = params.size.h;
        }
        const sprite = scene_service.create(ObjectTypes.GO_SPRITE_COMPONENT, sprite_params);

        // Устанавливаем текстуру
        if (params.texture !== undefined && 'set_texture' in sprite) {
            (sprite as unknown as { set_texture(t: string, a: string): void }).set_texture(
                params.texture,
                params.atlas ?? ''
            );
        }

        // Добавляем спрайт в контейнер
        go.add(sprite);

        // Добавляем контейнер в сцену или к родителю
        if (params.pid !== undefined && params.pid !== -1) {
            const parent = scene_service.get_by_id(params.pid);
            if (parent !== undefined) {
                parent.add(go);
            } else {
                scene_service.add(go);
            }
        } else {
            scene_service.add(go);
        }

        // Записываем в историю
        history_service.push({
            type: 'create',
            description: 'Создание GO со спрайтом',
            data: { id: go.mesh_data.id, params },
            undo: (data) => {
                const created = scene_service.get_by_id(data.id);
                if (created !== undefined) {
                    scene_service.remove(created);
                }
            },
            redo: (data) => {
                add_go_with_sprite(data.params);
            },
        });

        event_bus.emit('actions:created', { id: go.mesh_data.id, type: ObjectTypes.GO_CONTAINER });
        selection_service.select(go);

        return go;
    }

    function add_component(params: CreateObjectParams, type: number): ISceneObject {
        const obj = scene_service.create(ObjectTypes.COMPONENT, { type });

        // Устанавливаем позицию
        if (params.pos !== undefined) {
            obj.position.set(params.pos.x, params.pos.y, params.pos.z ?? 0);
        }

        // Добавляем к родителю или в сцену
        if (params.pid !== undefined && params.pid !== -1) {
            const parent = scene_service.get_by_id(params.pid);
            if (parent !== undefined) {
                parent.add(obj);
            } else {
                scene_service.add(obj);
            }
        } else {
            scene_service.add(obj);
        }

        // Записываем в историю
        history_service.push({
            type: 'create',
            description: `Создание компонента`,
            data: { id: obj.mesh_data.id, type, params },
            undo: (data) => {
                const created = scene_service.get_by_id(data.id);
                if (created !== undefined) {
                    scene_service.remove(created);
                }
            },
            redo: (data) => {
                add_component(data.params, data.type);
            },
        });

        event_bus.emit('actions:created', { id: obj.mesh_data.id, type: ObjectTypes.COMPONENT });
        selection_service.select(obj);

        return obj;
    }

    // === Валидация ===

    function get_object_world(obj: ISceneObject): 'gui' | 'go' | 'unknown' {
        const type = obj.mesh_data.type as ObjectTypes;
        if (GUI_TYPES.includes(type)) return 'gui';
        if (GO_TYPES.includes(type)) return 'go';
        return 'unknown';
    }

    function is_same_world(objects: ISceneObject[]): boolean {
        if (objects.length <= 1) return true;

        const first_world = get_object_world(objects[0]);
        return objects.every(obj => get_object_world(obj) === first_world);
    }

    function is_valid_action(
        target: ISceneObject | undefined,
        objects: ISceneObject[] = copy_mesh_list,
        _as_child = false,
        is_move = false
    ): boolean {
        if (objects.length === 0) return false;
        if (target === undefined) return true;

        // Проверяем что объекты из одного мира
        if (!is_same_world([target, ...objects])) {
            return false;
        }

        // Проверяем что не пытаемся переместить объект в себя или потомка
        if (is_move) {
            for (const obj of objects) {
                if (obj === target) return false;
                // Проверка что target не является потомком obj
                let parent = target.parent as ISceneObject | null;
                while (parent !== null) {
                    if (parent === obj) return false;
                    parent = parent.parent as ISceneObject | null;
                }
            }
        }

        return true;
    }

    function dispose(): void {
        clipboard = [];
        copy_mesh_list = [];
        logger.info('ActionsService освобождён');
    }

    return {
        get copy_list() { return copy_mesh_list; },
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
