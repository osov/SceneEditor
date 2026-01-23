/**
 * История состояний: name, active, visible
 */

import { Services } from '@editor/core';
import type { IBaseMeshAndThree } from '../../../render_engine/types';
import type {
    NameEventData,
    ActiveEventData,
    VisibleEventData,
} from '../../../modules_editor/InspectorTypes';
import type { HistoryModuleDeps } from './types';

/** Создать функции истории состояний */
export function create_state_history(deps: HistoryModuleDeps) {
    const { get_mesh, push_history } = deps;

    function save_name(ids: number[]): void {
        const names: NameEventData[] = [];
        for (const id of ids) {
            const mesh = get_mesh(id);
            if (mesh === undefined) {
                Services.logger.error('[save_name] Mesh not found for id:', id);
                continue;
            }
            names.push({ id_mesh: id, name: mesh.name });
        }

        push_history(
            'MESH_NAME',
            'Изменение имени',
            names,
            (items) => {
                for (const item of items) {
                    const m = Services.scene.get_by_id(item.id_mesh) as IBaseMeshAndThree | undefined;
                    if (m !== undefined) {
                        m.name = item.name;
                    }
                }
                Services.ui.update_hierarchy();
            },
            (items) => {
                const current: NameEventData[] = [];
                for (const item of items) {
                    const m = Services.scene.get_by_id(item.id_mesh) as IBaseMeshAndThree | undefined;
                    if (m !== undefined) {
                        current.push({ id_mesh: item.id_mesh, name: m.name });
                    }
                }
                return current;
            }
        );
    }

    function save_active(ids: number[]): void {
        const states: ActiveEventData[] = [];
        for (const id of ids) {
            const mesh = get_mesh(id);
            if (mesh === undefined) {
                Services.logger.error('[save_active] Mesh not found for id:', id);
                continue;
            }
            states.push({ id_mesh: id, state: mesh.get_active() });
        }

        push_history(
            'MESH_ACTIVE',
            'Изменение активности',
            states,
            (items) => {
                for (const item of items) {
                    const m = Services.scene.get_by_id(item.id_mesh) as IBaseMeshAndThree | undefined;
                    if (m !== undefined) {
                        m.set_active(item.state);
                    }
                }
                Services.ui.update_hierarchy();
            },
            (items) => {
                const current: ActiveEventData[] = [];
                for (const item of items) {
                    const m = Services.scene.get_by_id(item.id_mesh) as IBaseMeshAndThree | undefined;
                    if (m !== undefined) {
                        current.push({ id_mesh: item.id_mesh, state: m.get_active() });
                    }
                }
                return current;
            }
        );
    }

    function save_visible(ids: number[]): void {
        const states: VisibleEventData[] = [];
        for (const id of ids) {
            const mesh = get_mesh(id);
            if (mesh === undefined) {
                Services.logger.error('[save_visible] Mesh not found for id:', id);
                continue;
            }
            states.push({ id_mesh: id, state: mesh.get_visible() });
        }

        push_history(
            'MESH_VISIBLE',
            'Изменение видимости',
            states,
            (items) => {
                for (const item of items) {
                    const m = Services.scene.get_by_id(item.id_mesh) as IBaseMeshAndThree | undefined;
                    if (m !== undefined) {
                        m.set_visible(item.state);
                    }
                }
                Services.ui.update_hierarchy();
            },
            (items) => {
                const current: VisibleEventData[] = [];
                for (const item of items) {
                    const m = Services.scene.get_by_id(item.id_mesh) as IBaseMeshAndThree | undefined;
                    if (m !== undefined) {
                        current.push({ id_mesh: item.id_mesh, state: m.get_visible() });
                    }
                }
                return current;
            }
        );
    }

    return {
        save_name,
        save_active,
        save_visible,
    };
}
