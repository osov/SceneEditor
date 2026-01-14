/**
 * TransformService - сервис трансформации объектов
 *
 * Управляет режимами трансформации (translate/rotate/scale),
 * пространством (local/world) и взаимодействием с gizmo.
 */

import type { ISceneObject } from '@editor/engine/types';
import type {
    ITransformService,
    TransformServiceParams,
    TransformMode,
    TransformSpace,
} from './types';

/** Создать TransformService */
export function create_transform_service(params: TransformServiceParams): ITransformService {
    const { logger, event_bus } = params;

    // Внутреннее состояние
    let current_mode: TransformMode = 'translate';
    let current_space: TransformSpace = 'local';
    const attached_objects: ISceneObject[] = [];

    function set_mode(mode: TransformMode): void {
        if (mode === current_mode) {
            return;
        }

        current_mode = mode;
        logger.debug(`Режим трансформации: ${mode}`);
        event_bus.emit('transform:mode_changed', { mode });
    }

    function set_space(space: TransformSpace): void {
        if (space === current_space) {
            return;
        }

        current_space = space;
        logger.debug(`Пространство трансформации: ${space}`);
        event_bus.emit('transform:space_changed', { space });
    }

    function attach(objects: ISceneObject[]): void {
        attached_objects.length = 0;
        attached_objects.push(...objects);

        if (objects.length > 0) {
            logger.debug(`Прикреплено к ${objects.length} объектам`);
        }

        event_bus.emit('transform:attached', {
            objects: objects.map(o => o.mesh_data.id),
        });
    }

    function detach(): void {
        if (attached_objects.length > 0) {
            attached_objects.length = 0;
            logger.debug('Открепление');
            event_bus.emit('transform:detached', {});
        }
    }

    function get_attached(): ISceneObject[] {
        return [...attached_objects];
    }

    // Подписываемся на изменения выделения
    const selection_subscription = event_bus.on('selection:changed', (data) => {
        const { selected } = data as { selected: ISceneObject[] };
        attach(selected);
    });

    function dispose(): void {
        selection_subscription.dispose();
        detach();
        logger.info('TransformService освобождён');
    }

    return {
        get mode(): TransformMode {
            return current_mode;
        },
        get space(): TransformSpace {
            return current_space;
        },
        set_mode,
        set_space,
        attach,
        detach,
        get_attached,
        dispose,
    };
}
