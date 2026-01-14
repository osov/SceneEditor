/**
 * ActionsService - сервис действий редактора
 *
 * Реализует копирование, вставку, удаление,
 * дублирование и создание объектов.
 */

import type { ISceneObject } from '@editor/engine/types';
import type { ObjectTypes, BaseEntityData } from '@editor/core/render/types';
import type {
    IActionsService,
    ActionsServiceParams,
} from './types';

/** Создать ActionsService */
export function create_actions_service(params: ActionsServiceParams): IActionsService {
    const { logger, event_bus, scene_service, selection_service, history_service } = params;

    // Буфер обмена
    let clipboard: BaseEntityData[] = [];
    let is_cut = false;

    function copy(): void {
        const selected = selection_service.selected;
        if (selected.length === 0) {
            logger.warn('Нечего копировать');
            return;
        }

        clipboard = selected.map(obj => scene_service.serialize_object(obj));
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

        // Сохраняем данные для undo
        const deleted_data = selected.map(obj => ({
            data: scene_service.serialize_object(obj),
            parent_id: get_parent_id(obj),
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
                    scene_service.deserialize([item.data]);
                }
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

    function dispose(): void {
        clipboard = [];
        logger.info('ActionsService освобождён');
    }

    return {
        copy,
        cut,
        paste,
        paste_as_child,
        duplicate,
        delete_selected,
        create,
        has_clipboard,
        dispose,
    };
}
