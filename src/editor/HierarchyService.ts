/**
 * HierarchyService - сервис управления иерархией объектов
 *
 * Предоставляет данные для дерева иерархии,
 * управляет перемещением и переименованием объектов.
 */

import type { ISceneObject } from '@editor/engine/types';
import type {
    IHierarchyService,
    HierarchyServiceParams,
    HierarchyNode,
} from './types';

/** Создать HierarchyService */
export function create_hierarchy_service(params: HierarchyServiceParams): IHierarchyService {
    const { logger, event_bus, scene_service, selection_service } = params;

    // Состояние развёрнутых узлов
    const expanded_ids = new Set<number>();

    function get_tree(): HierarchyNode[] {
        const all_objects = scene_service.get_all();
        const result: HierarchyNode[] = [];

        for (const obj of all_objects) {
            result.push(create_node(obj));
        }

        return result;
    }

    function create_node(obj: ISceneObject): HierarchyNode {
        const parent_id = get_parent_id(obj);

        return {
            id: obj.mesh_data.id,
            pid: parent_id,
            name: obj.name,
            visible: obj.visible,
            selected: selection_service.is_selected(obj),
            icon: get_icon_for_type(obj.mesh_data.type as string),
            expanded: expanded_ids.has(obj.mesh_data.id),
            draggable: true,
            droppable: true,
        };
    }

    function move(object: ISceneObject, parent: ISceneObject | null, _index?: number): void {
        // Выполняем перемещение
        if (parent !== null) {
            if (object.parent !== null) {
                object.parent.remove(object);
            }
            parent.add(object);
        } else {
            if (object.parent !== null) {
                object.parent.remove(object);
            }
            scene_service.add(object);
        }

        logger.debug(`Объект ${object.mesh_data.id} перемещён`);
        event_bus.emit('hierarchy:moved', {
            id: object.mesh_data.id,
            parent_id: parent?.mesh_data.id ?? null,
        });
    }

    function rename(object: ISceneObject, name: string): void {
        const old_name = object.name;
        object.name = name;

        logger.debug(`Объект ${object.mesh_data.id} переименован: "${old_name}" -> "${name}"`);
        event_bus.emit('hierarchy:renamed', {
            id: object.mesh_data.id,
            old_name,
            new_name: name,
        });
    }

    function set_visible(object: ISceneObject, visible: boolean): void {
        object.visible = visible;

        logger.debug(`Видимость объекта ${object.mesh_data.id}: ${visible}`);
        event_bus.emit('hierarchy:visibility_changed', {
            id: object.mesh_data.id,
            visible,
        });
    }

    function expand(id: number): void {
        if (!expanded_ids.has(id)) {
            expanded_ids.add(id);
            event_bus.emit('hierarchy:expanded', { id });
        }
    }

    function collapse(id: number): void {
        if (expanded_ids.has(id)) {
            expanded_ids.delete(id);
            event_bus.emit('hierarchy:collapsed', { id });
        }
    }

    function expand_all(): void {
        const all_objects = scene_service.get_all();
        for (const obj of all_objects) {
            expanded_ids.add(obj.mesh_data.id);
        }
        event_bus.emit('hierarchy:expand_all', {});
    }

    function collapse_all(): void {
        expanded_ids.clear();
        event_bus.emit('hierarchy:collapse_all', {});
    }

    // Вспомогательные функции

    function get_parent_id(obj: ISceneObject): number | null {
        if (obj.parent !== null && 'mesh_data' in obj.parent) {
            return (obj.parent as ISceneObject).mesh_data.id;
        }
        return null;
    }

    function get_icon_for_type(type: string | undefined): string {
        const icons: Record<string, string> = {
            empty: '📦',
            entity: '🔷',
            slice9_plane: '🖼️',
            text: '📝',
            gui_container: '📁',
            gui_box: '⬜',
            gui_text: '🔤',
            go_container: '📁',
            go_sprite_component: '🖼️',
            go_label_component: '🏷️',
            go_model_component: '🎭',
            go_animated_model_component: '🎬',
            go_audio_component: '🔊',
            component: '⚙️',
        };

        return icons[type ?? 'entity'] ?? '📦';
    }

    function dispose(): void {
        expanded_ids.clear();
        logger.info('HierarchyService освобождён');
    }

    return {
        get_tree,
        move,
        rename,
        set_visible,
        expand,
        collapse,
        expand_all,
        collapse_all,
        dispose,
    };
}
