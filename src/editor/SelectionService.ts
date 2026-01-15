/**
 * SelectionService - сервис управления выделением
 *
 * Управляет выделением объектов на сцене.
 * Поддерживает одиночное и множественное выделение.
 * Обрабатывает клики мыши и raycast для выделения объектов.
 */

import { Vector2, Intersection, Object3D } from 'three';
import type { ISceneObject } from '@editor/engine/types';
import type { IBaseMeshAndThree } from '@editor/render_engine/types';
import { is_base_mesh } from '@editor/render_engine/helpers/utils';
import { WORLD_SCALAR } from '@editor/config';
import { Services } from '@editor/core';
import type {
    ISelectionService,
    SelectionServiceParams,
} from './types';

/** Создать SelectionService */
export function create_selection_service(params: SelectionServiceParams): ISelectionService {
    const { logger, event_bus, scene_service } = params;

    // Внутреннее состояние
    const selected_objects: ISceneObject[] = [];
    const pointer = new Vector2();
    const click_point = new Vector2();
    const prev_point = new Vector2();
    let last_selected: IBaseMeshAndThree | null = null;

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
        // Legacy событие для совместимости с ControlManager
        event_bus.emit('SYS_SELECTED_MESH_LIST', { list: selected_objects });
    }

    /** Инициализация обработчиков ввода */
    function init(): void {
        event_bus.on('SYS_INPUT_POINTER_DOWN', (e: { target: EventTarget; button: number; x: number; y: number }) => {
            if (e.target !== Services.render.renderer.domElement) return;
            if (e.button !== 0) return;
            click_point.set(e.x, e.y);
        });

        event_bus.on('SYS_INPUT_POINTER_UP', (e: { target: EventTarget; button: number; x: number; y: number }) => {
            if (e.target !== Services.render.renderer.domElement) return;
            if (e.button !== 0) return;
            if (Services.input.is_shift()) return;

            prev_point.set(pointer.x, pointer.y);
            pointer.x = e.x;
            pointer.y = e.y;

            const old_pos = Services.camera.screen_to_world(click_point.x, click_point.y);
            const cur_pos = Services.camera.screen_to_world(pointer.x, pointer.y);
            const len = cur_pos.clone().sub(old_pos).length();
            if (len > 5 * WORLD_SCALAR) return;

            const intersects = Services.render.raycast_scene(pointer);
            handle_raycast_selection(intersects);
        });

        event_bus.on('SYS_INPUT_POINTER_MOVE', (event: { x: number; y: number }) => {
            prev_point.set(pointer.x, pointer.y);
            pointer.x = event.x;
            pointer.y = event.y;
        });

        logger.debug('SelectionService: обработчики ввода инициализированы');
    }

    /** Обработка результатов raycast для выделения */
    function handle_raycast_selection(intersects: Intersection<Object3D>[]): void {
        const mesh_list: IBaseMeshAndThree[] = [];
        for (const it of intersects) {
            if (is_base_mesh(it.object)) {
                mesh_list.push(it.object as IBaseMeshAndThree);
            }
        }

        if (mesh_list.length === 0) {
            if (!Services.input.is_control()) {
                clear();
                event_bus.emit('SYS_UNSELECTED_MESH_LIST', {});
            }
            return;
        }

        // Логика циклического выбора объектов под курсором
        let selected_mesh: IBaseMeshAndThree;
        if (last_selected === null) {
            selected_mesh = mesh_list[0];
        } else {
            const idx = mesh_list.findIndex(m => m === last_selected);
            if (idx === -1) {
                selected_mesh = mesh_list[0];
            } else {
                const next_idx = (idx + 1) % mesh_list.length;
                selected_mesh = mesh_list[next_idx];
            }
        }
        last_selected = selected_mesh;

        // Обновляем выделение
        if (Services.input.is_control()) {
            // Множественное выделение
            if (is_selected(selected_mesh as unknown as ISceneObject)) {
                deselect(selected_mesh as unknown as ISceneObject);
            } else {
                select(selected_mesh as unknown as ISceneObject, true);
            }
        } else {
            // Одиночное выделение
            set_selected([selected_mesh as unknown as ISceneObject]);
        }
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
        init,
        select,
        deselect,
        clear,
        select_all,
        is_selected,
        set_selected,
        dispose,
    };
}
