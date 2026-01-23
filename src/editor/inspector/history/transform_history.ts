/**
 * История трансформаций: position, rotation, scale, size, pivot, anchor, font_size
 */

import { Services } from '@editor/core';
import type { IBaseMeshAndThree } from '../../../render_engine/types';
import type {
    PositionEventData,
    RotationEventData,
    ScaleEventData,
    SizeEventData,
    PivotEventData,
    AnchorEventData,
} from '../../../modules_editor/InspectorTypes';
import { deepClone } from '../../../modules/utils';
import type { HistoryModuleDeps } from './types';

/** Создать функции истории трансформаций */
export function create_transform_history(deps: HistoryModuleDeps) {
    const { get_mesh, push_history } = deps;

    function save_position(ids: number[]): void {
        const positions: PositionEventData[] = [];
        for (const id of ids) {
            const mesh = get_mesh(id);
            if (mesh === undefined) {
                Services.logger.error('[save_position] Mesh not found for id:', id);
                continue;
            }
            positions.push({ id_mesh: id, position: deepClone(mesh.position) });
        }

        push_history(
            'MESH_TRANSLATE',
            'Перемещение объектов',
            positions,
            (items) => {
                for (const item of items) {
                    const m = Services.scene.get_by_id(item.id_mesh) as IBaseMeshAndThree | undefined;
                    if (m !== undefined) {
                        m.position.copy(item.position);
                        m.transform_changed();
                    }
                }
                Services.transform.set_proxy_in_average_point(Services.selection.selected as IBaseMeshAndThree[]);
                Services.ui.update_hierarchy();
            },
            (items) => {
                const current: PositionEventData[] = [];
                for (const item of items) {
                    const m = Services.scene.get_by_id(item.id_mesh) as IBaseMeshAndThree | undefined;
                    if (m !== undefined) {
                        current.push({ id_mesh: item.id_mesh, position: deepClone(m.position) });
                    }
                }
                return current;
            }
        );
    }

    function save_rotation(ids: number[]): void {
        const rotations: RotationEventData[] = [];
        for (const id of ids) {
            const mesh = get_mesh(id);
            if (mesh === undefined) {
                Services.logger.error('[save_rotation] Mesh not found for id:', id);
                continue;
            }
            rotations.push({ id_mesh: id, rotation: deepClone(mesh.rotation) });
        }

        push_history(
            'MESH_ROTATE',
            'Вращение объектов',
            rotations,
            (items) => {
                for (const item of items) {
                    const m = Services.scene.get_by_id(item.id_mesh) as IBaseMeshAndThree | undefined;
                    if (m !== undefined) {
                        m.rotation.copy(item.rotation);
                        m.transform_changed();
                    }
                }
                Services.transform.set_proxy_in_average_point(Services.selection.selected as IBaseMeshAndThree[]);
                Services.ui.update_hierarchy();
            },
            (items) => {
                const current: RotationEventData[] = [];
                for (const item of items) {
                    const m = Services.scene.get_by_id(item.id_mesh) as IBaseMeshAndThree | undefined;
                    if (m !== undefined) {
                        current.push({ id_mesh: item.id_mesh, rotation: deepClone(m.rotation) });
                    }
                }
                return current;
            }
        );
    }

    function save_scale(ids: number[]): void {
        const scales: ScaleEventData[] = [];
        for (const id of ids) {
            const mesh = get_mesh(id);
            if (mesh === undefined) {
                Services.logger.error('[save_scale] Mesh not found for id:', id);
                continue;
            }
            scales.push({ id_mesh: id, scale: deepClone(mesh.scale) });
        }

        push_history(
            'MESH_SCALE',
            'Масштабирование объектов',
            scales,
            (items) => {
                for (const item of items) {
                    const m = Services.scene.get_by_id(item.id_mesh) as IBaseMeshAndThree | undefined;
                    if (m !== undefined) {
                        m.scale.copy(item.scale);
                        m.transform_changed();
                    }
                }
                Services.transform.set_proxy_in_average_point(Services.selection.selected as IBaseMeshAndThree[]);
                Services.ui.update_hierarchy();
            },
            (items) => {
                const current: ScaleEventData[] = [];
                for (const item of items) {
                    const m = Services.scene.get_by_id(item.id_mesh) as IBaseMeshAndThree | undefined;
                    if (m !== undefined) {
                        current.push({ id_mesh: item.id_mesh, scale: deepClone(m.scale) });
                    }
                }
                return current;
            }
        );
    }

    function save_size(ids: number[]): void {
        const sizes: SizeEventData[] = [];
        for (const id of ids) {
            const mesh = get_mesh(id);
            if (mesh === undefined) {
                Services.logger.error('[save_size] Mesh not found for id:', id);
                continue;
            }
            sizes.push({
                id_mesh: id,
                position: mesh.get_position(),
                size: mesh.get_size(),
            });
        }

        push_history(
            'MESH_SIZE',
            'Изменение размера',
            sizes,
            (items) => {
                for (const item of items) {
                    const m = Services.scene.get_by_id(item.id_mesh) as IBaseMeshAndThree | undefined;
                    if (m !== undefined) {
                        m.position.copy(item.position);
                        m.set_size(item.size.x, item.size.y);
                        m.transform_changed();
                    }
                }
                Services.transform.set_proxy_in_average_point(Services.selection.selected as IBaseMeshAndThree[]);
                Services.ui.update_hierarchy();
            },
            (items) => {
                const current: SizeEventData[] = [];
                for (const item of items) {
                    const m = Services.scene.get_by_id(item.id_mesh) as IBaseMeshAndThree | undefined;
                    if (m !== undefined) {
                        current.push({ id_mesh: item.id_mesh, position: m.get_position(), size: m.get_size() });
                    }
                }
                return current;
            }
        );
    }

    function save_pivot(ids: number[]): void {
        const pivots: PivotEventData[] = [];
        for (const id of ids) {
            const mesh = get_mesh(id);
            if (mesh === undefined) {
                Services.logger.error('[save_pivot] Mesh not found for id:', id);
                continue;
            }
            pivots.push({ id_mesh: id, pivot: mesh.get_pivot() });
        }

        push_history(
            'MESH_PIVOT',
            'Изменение pivot',
            pivots,
            (items) => {
                for (const item of items) {
                    const m = Services.scene.get_by_id(item.id_mesh) as IBaseMeshAndThree | undefined;
                    if (m !== undefined) {
                        m.set_pivot(item.pivot.x, item.pivot.y, true);
                    }
                }
                Services.transform.set_proxy_in_average_point(Services.selection.selected as IBaseMeshAndThree[]);
                Services.ui.update_hierarchy();
            },
            (items) => {
                const current: PivotEventData[] = [];
                for (const item of items) {
                    const m = Services.scene.get_by_id(item.id_mesh) as IBaseMeshAndThree | undefined;
                    if (m !== undefined) {
                        current.push({ id_mesh: item.id_mesh, pivot: m.get_pivot() });
                    }
                }
                return current;
            }
        );
    }

    function save_anchor(ids: number[]): void {
        const anchors: AnchorEventData[] = [];
        for (const id of ids) {
            const mesh = get_mesh(id);
            if (mesh === undefined) {
                Services.logger.error('[save_anchor] Mesh not found for id:', id);
                continue;
            }
            anchors.push({ id_mesh: id, anchor: mesh.get_anchor() });
        }

        push_history(
            'MESH_ANCHOR',
            'Изменение anchor',
            anchors,
            (items) => {
                for (const item of items) {
                    const m = Services.scene.get_by_id(item.id_mesh) as IBaseMeshAndThree | undefined;
                    if (m !== undefined) {
                        m.set_anchor(item.anchor.x, item.anchor.y);
                    }
                }
                Services.ui.update_hierarchy();
            },
            (items) => {
                const current: AnchorEventData[] = [];
                for (const item of items) {
                    const m = Services.scene.get_by_id(item.id_mesh) as IBaseMeshAndThree | undefined;
                    if (m !== undefined) {
                        current.push({ id_mesh: item.id_mesh, anchor: m.get_anchor() });
                    }
                }
                return current;
            }
        );
    }

    function save_font_size(ids: number[]): void {
        const scales: ScaleEventData[] = [];
        for (const id of ids) {
            const mesh = get_mesh(id);
            if (mesh === undefined) {
                Services.logger.error('[save_font_size] Mesh not found for id:', id);
                continue;
            }
            scales.push({ id_mesh: id, scale: deepClone(mesh.scale) });
        }

        push_history(
            'MESH_FONT_SIZE',
            'Изменение размера шрифта',
            scales,
            (items) => {
                for (const item of items) {
                    const m = Services.scene.get_by_id(item.id_mesh) as IBaseMeshAndThree | undefined;
                    if (m !== undefined) {
                        m.scale.copy(item.scale);
                        m.transform_changed();
                    }
                }
                Services.transform.set_proxy_in_average_point(Services.selection.selected as IBaseMeshAndThree[]);
            },
            (items) => {
                const current: ScaleEventData[] = [];
                for (const item of items) {
                    const m = Services.scene.get_by_id(item.id_mesh) as IBaseMeshAndThree | undefined;
                    if (m !== undefined) {
                        current.push({ id_mesh: item.id_mesh, scale: deepClone(m.scale) });
                    }
                }
                return current;
            }
        );
    }

    return {
        save_position,
        save_rotation,
        save_scale,
        save_size,
        save_pivot,
        save_anchor,
        save_font_size,
    };
}
