/**
 * История свойств моделей: material, mesh_model_name, model_materials, slot_material
 */

import { Services } from '@editor/core';
import type { IBaseMeshAndThree } from '../../../render_engine/types';
import type {
    MaterialEventData,
    MeshModelNameEventData,
    ModelMaterialsEventData,
} from '../../../modules_editor/InspectorTypes';
import type { HistoryModuleDeps } from './types';

/** Создать функции истории свойств моделей */
export function create_model_history(deps: HistoryModuleDeps) {
    const { get_mesh, push_history } = deps;

    function save_material(ids: number[]): void {
        const materials: MaterialEventData[] = [];
        for (const id of ids) {
            const mesh = get_mesh(id);
            if (mesh === undefined) {
                Services.logger.error('[save_material] Mesh not found for id:', id);
                continue;
            }
            const mesh_with_material = mesh as { get_material_name?: () => string };
            if (typeof mesh_with_material.get_material_name === 'function') {
                materials.push({ id_mesh: id, material: mesh_with_material.get_material_name() });
            }
        }

        push_history(
            'MESH_MATERIAL',
            'Изменение материала',
            materials,
            (items) => {
                for (const item of items) {
                    const m = Services.scene.get_by_id(item.id_mesh) as IBaseMeshAndThree & { set_material?: (name: string) => void } | undefined;
                    if (m !== undefined && typeof m.set_material === 'function') {
                        m.set_material(item.material);
                    }
                }
            },
            (items) => {
                const current: MaterialEventData[] = [];
                for (const item of items) {
                    const m = Services.scene.get_by_id(item.id_mesh) as IBaseMeshAndThree & { get_material_name?: () => string } | undefined;
                    if (m !== undefined && typeof m.get_material_name === 'function') {
                        current.push({ id_mesh: item.id_mesh, material: m.get_material_name() });
                    }
                }
                return current;
            }
        );
    }

    function save_mesh_model_name(ids: number[]): void {
        const mesh_names: MeshModelNameEventData[] = [];
        for (const id of ids) {
            const mesh = get_mesh(id);
            if (mesh === undefined) {
                Services.logger.error('[save_mesh_model_name] Mesh not found for id:', id);
                continue;
            }
            const mesh_with_name = mesh as { get_mesh_name?: () => string };
            if (typeof mesh_with_name.get_mesh_name === 'function') {
                mesh_names.push({ id_mesh: id, mesh_name: mesh_with_name.get_mesh_name() });
            }
        }

        push_history(
            'MESH_MODEL_NAME',
            'Изменение 3D модели',
            mesh_names,
            (items) => {
                for (const item of items) {
                    const m = Services.scene.get_by_id(item.id_mesh) as IBaseMeshAndThree & { set_mesh?: (name: string) => void } | undefined;
                    if (m !== undefined && typeof m.set_mesh === 'function') {
                        m.set_mesh(item.mesh_name);
                    }
                }
            },
            (items) => {
                const current: MeshModelNameEventData[] = [];
                for (const item of items) {
                    const m = Services.scene.get_by_id(item.id_mesh) as IBaseMeshAndThree & { get_mesh_name?: () => string } | undefined;
                    if (m !== undefined && typeof m.get_mesh_name === 'function') {
                        current.push({ id_mesh: item.id_mesh, mesh_name: m.get_mesh_name() });
                    }
                }
                return current;
            }
        );
    }

    function save_model_materials(ids: number[]): void {
        const materials: ModelMaterialsEventData[] = [];
        for (const id of ids) {
            const mesh = get_mesh(id);
            if (mesh === undefined) {
                Services.logger.error('[save_model_materials] Mesh not found for id:', id);
                continue;
            }
            const mesh_with_materials = mesh as { get_materials?: () => string[] };
            if (typeof mesh_with_materials.get_materials === 'function') {
                materials.push({ id_mesh: id, materials: [...mesh_with_materials.get_materials()] });
            }
        }

        push_history(
            'MESH_MODEL_MATERIALS',
            'Изменение материалов модели',
            materials,
            (items) => {
                for (const item of items) {
                    const m = Services.scene.get_by_id(item.id_mesh) as IBaseMeshAndThree & { set_material?: (name: string, slot: number) => void } | undefined;
                    if (m !== undefined && typeof m.set_material === 'function') {
                        const set_material = m.set_material;
                        item.materials.forEach((name, index) => {
                            set_material(name, index);
                        });
                    }
                }
            },
            (items) => {
                const current: ModelMaterialsEventData[] = [];
                for (const item of items) {
                    const m = Services.scene.get_by_id(item.id_mesh) as IBaseMeshAndThree & { get_materials?: () => string[] } | undefined;
                    if (m !== undefined && typeof m.get_materials === 'function') {
                        current.push({ id_mesh: item.id_mesh, materials: [...m.get_materials()] });
                    }
                }
                return current;
            }
        );
    }

    function save_slot_material(ids: number[], slot_index: number): void {
        const materials: (MaterialEventData & { slot_index: number })[] = [];
        for (const id of ids) {
            const mesh = get_mesh(id);
            if (mesh === undefined) {
                Services.logger.error('[save_slot_material] Mesh not found for id:', id);
                continue;
            }
            const mesh_with_materials = mesh as { get_materials?: () => string[] };
            if (typeof mesh_with_materials.get_materials === 'function') {
                const mats = mesh_with_materials.get_materials();
                if (slot_index < mats.length) {
                    materials.push({ id_mesh: id, material: mats[slot_index], slot_index });
                }
            }
        }

        push_history(
            'MESH_SLOT_MATERIAL',
            'Изменение материала слота',
            materials,
            (items) => {
                for (const item of items) {
                    const m = Services.scene.get_by_id(item.id_mesh) as IBaseMeshAndThree & { set_material?: (name: string, slot: number) => void } | undefined;
                    if (m !== undefined && typeof m.set_material === 'function') {
                        m.set_material(item.material, item.slot_index);
                    }
                }
            },
            (items) => {
                const current: (MaterialEventData & { slot_index: number })[] = [];
                for (const item of items) {
                    const m = Services.scene.get_by_id(item.id_mesh) as IBaseMeshAndThree & { get_materials?: () => string[] } | undefined;
                    if (m !== undefined && typeof m.get_materials === 'function') {
                        const mats = m.get_materials();
                        if (item.slot_index < mats.length) {
                            current.push({ id_mesh: item.id_mesh, material: mats[item.slot_index], slot_index: item.slot_index });
                        }
                    }
                }
                return current;
            }
        );
    }

    return {
        save_material,
        save_mesh_model_name,
        save_model_materials,
        save_slot_material,
    };
}
