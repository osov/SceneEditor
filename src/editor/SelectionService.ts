/**
 * SelectionService - сервис управления выделением
 *
 * Управляет выделением объектов на сцене.
 * Поддерживает одиночное и множественное выделение.
 */

import type { ISceneObject } from '@editor/engine/types';
import type {
    ISelectionService,
    SelectionServiceParams,
} from './types';

/** Создать SelectionService */
export function create_selection_service(params: SelectionServiceParams): ISelectionService {
    const { logger, event_bus, scene_service } = params;

    // Внутреннее состояние
    const selected_objects: ISceneObject[] = [];

    function select(object: ISceneObject, additive = false): void {
        if (!additive) {
            // Очищаем предыдущее выделение
            clear_internal(false);
        }

        if (!is_selected(object)) {
            selected_objects.push(object);
            logger.debug(`Выделен объект: ${object.mesh_data.id}`);
        }

        emit_changed();
    }

    function deselect(object: ISceneObject): void {
        const index = selected_objects.indexOf(object);
        if (index !== -1) {
            selected_objects.splice(index, 1);
            logger.debug(`Снято выделение: ${object.mesh_data.id}`);
            emit_changed();
        }
    }

    function clear(): void {
        clear_internal(true);
    }

    function clear_internal(emit: boolean): void {
        if (selected_objects.length > 0) {
            selected_objects.length = 0;
            logger.debug('Выделение очищено');
            if (emit) {
                emit_changed();
            }
        }
    }

    function select_all(): void {
        const all_objects = scene_service.get_all();
        selected_objects.length = 0;
        selected_objects.push(...all_objects);
        logger.debug(`Выделено все: ${all_objects.length} объектов`);
        emit_changed();
    }

    function is_selected(object: ISceneObject): boolean {
        return selected_objects.includes(object);
    }

    function set_selected(objects: ISceneObject[]): void {
        selected_objects.length = 0;
        selected_objects.push(...objects);
        emit_changed();
    }

    function emit_changed(): void {
        event_bus.emit('selection:changed', {
            selected: [...selected_objects],
            primary: selected_objects[0] ?? null,
        });
    }

    function dispose(): void {
        selected_objects.length = 0;
        logger.info('SelectionService освобождён');
    }

    return {
        get selected(): ISceneObject[] {
            return [...selected_objects];
        },
        get primary(): ISceneObject | null {
            return selected_objects[0] ?? null;
        },
        select,
        deselect,
        clear,
        select_all,
        is_selected,
        set_selected,
        dispose,
    };
}
