/**
 * Обработчики обновления свойств 3D моделей: MeshName, Animation, ModelScale, ModelMaterials, SlotMaterial
 */

import { Services } from '@editor/core';
import type { MultipleMaterialMesh } from '../../../render_engine/objects/multiple_material_mesh';
import type { AnimatedMesh } from '../../../render_engine/objects/animated_mesh';
import type { ChangeInfo, UpdaterContext } from '../types';

/**
 * Обновляет имя меша (меняет 3D модель)
 */
export function update_mesh_name(info: ChangeInfo, ctx: UpdaterContext) {
    const value = info.data.event.value as string;

    for (const item of ctx.selected_list) {
        if ('set_mesh' in item) {
            (item as unknown as MultipleMaterialMesh).set_mesh(value);
        }
    }

    // Полностью пересоздать инспектор для обновления списка анимаций и текстур модели
    ctx.on_rebuild_inspector?.();
}

/**
 * Обновляет текущую анимацию
 */
export function update_current_animation(info: ChangeInfo, ctx: UpdaterContext) {
    const value = info.data.event.value as string;

    for (const item of ctx.selected_list) {
        if ('set_animation' in item) {
            (item as unknown as AnimatedMesh).set_animation(value);
        }
    }
}

/**
 * Обновляет масштаб модели
 */
export function update_model_scale(info: ChangeInfo, ctx: UpdaterContext) {
    const value = info.data.event.value as number;

    for (const item of ctx.selected_list) {
        if ('set_scale' in item) {
            (item as unknown as MultipleMaterialMesh).set_scale(value, value);
        }
    }
}

/**
 * Обновляет материалы модели
 */
export function update_model_materials(info: ChangeInfo, ctx: UpdaterContext) {
    const value = info.data.event.value;

    for (const item of ctx.selected_list) {
        if ('set_material' in item) {
            // Если value - массив, применяем все материалы
            if (Array.isArray(value)) {
                for (let index = 0; index < (value as string[]).length; index++) {
                    const name = (value as string[])[index];
                    (item as unknown as MultipleMaterialMesh).set_material(name, index);
                }
            } else if (typeof value === 'string') {
                // Если value - строка (из search-list), применяем как первый материал
                (item as unknown as MultipleMaterialMesh).set_material(value, 0);
            }
        }
    }
}

/**
 * Обновляет материал конкретного слота
 */
export function update_slot_material(info: ChangeInfo, ctx: UpdaterContext) {
    const value = info.data.event.value as string;
    const action_data = info.data.field.action_data as { slot_index?: number } | undefined;
    const slot_index = action_data?.slot_index;

    if (slot_index === undefined) {
        Services.logger.warn('[updateSlotMaterial] No slot_index in action_data');
        return;
    }

    for (const item of ctx.selected_list) {
        if ('set_material' in item) {
            (item as unknown as MultipleMaterialMesh).set_material(value, slot_index);
        }
    }

    // Обновляем инспектор чтобы показать новые uniforms для нового материала
    ctx.on_rebuild_inspector?.();
}
