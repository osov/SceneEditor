/**
 * Обработчики обновления трансформации: Position, Rotation, Scale, Size
 */

import { Vector2, Vector3 } from 'three';
import { degToRad } from '../../../modules/utils';
import { get_changed_info, get_dragged_info } from '../../inspector_module';
import type { ChangeInfo, UpdaterContext } from '../types';
import type { IBaseMeshAndThree } from '../../../render_engine/types';
import type { TextMesh } from '../../../render_engine/objects/text';
import { Property } from '../../../core/inspector';

/**
 * Обновляет позицию объектов
 */
export function update_position(info: ChangeInfo, ctx: UpdaterContext) {
    const [isDraggedX, isDraggedY, isDraggedZ] = get_dragged_info(info);
    const [isChangedX, isChangedY, isChangedZ] = get_changed_info(info);

    const pos = info.data.event.value as Vector3;

    const averagePoint = new Vector3();
    averagePoint.copy(pos);

    // вычесляем среднее значение позиции между всеми обьектами
    if (isDraggedX || isDraggedY || isDraggedZ) {
        const sum = new Vector3(0, 0, 0);
        for (const id of info.ids) {
            const mesh = find_mesh(ctx.selected_list, id);
            if (mesh === undefined) {
                ctx.log_error('[updatePosition] Mesh not found for id:', id);
                continue;
            }
            sum.add(mesh.get_position());
        }
        averagePoint.copy(sum.divideScalar(info.ids.length));
    }

    for (const id of info.ids) {
        const mesh = find_mesh(ctx.selected_list, id);
        if (mesh === undefined) {
            ctx.log_error('[updatePosition] Mesh not found for id:', id);
            continue;
        }

        // высчитываем разницу среднего значения позиции и измененного значения в инспекторе
        const x = isDraggedX ? mesh.get_position().x + (pos.x - averagePoint.x) : isChangedX ? pos.x : mesh.get_position().x;
        const y = isDraggedY ? mesh.get_position().y + (pos.y - averagePoint.y) : isChangedY ? pos.y : mesh.get_position().y;
        const z = isDraggedZ ? mesh.get_position().z + (pos.z - averagePoint.z) : isChangedZ ? pos.z : mesh.get_position().z;

        mesh.set_position(x, y, z);
    }

    ctx.on_transform_changed?.();
    ctx.on_size_changed?.();
}

/**
 * Обновляет вращение объектов
 */
export function update_rotation(info: ChangeInfo, ctx: UpdaterContext) {
    const [isChangedX, isChangedY, isChangedZ] = get_changed_info(info);

    const rawRot = info.data.event.value as Vector3;
    const rot = new Vector3(degToRad(rawRot.x), degToRad(rawRot.y), degToRad(rawRot.z));

    for (const id of info.ids) {
        const mesh = find_mesh(ctx.selected_list, id);
        if (mesh === undefined) {
            ctx.log_error('[updateRotation] Mesh not found for id:', id);
            continue;
        }

        const x = isChangedX ? rot.x : mesh.rotation.x;
        const y = isChangedY ? rot.y : mesh.rotation.y;
        const z = isChangedZ ? rot.z : mesh.rotation.z;

        mesh.rotation.set(x, y, z);
        mesh.transform_changed();
    }

    ctx.on_transform_changed?.();
    ctx.on_size_changed?.();
}

/**
 * Обновляет масштаб объектов
 */
export function update_scale(info: ChangeInfo, ctx: UpdaterContext) {
    const [isChangedX, isChangedY] = get_changed_info(info);

    const scale = info.data.event.value as Vector3;

    for (const id of info.ids) {
        const mesh = find_mesh(ctx.selected_list, id);
        if (mesh === undefined) {
            ctx.log_error('[updateScale] Mesh not found for id:', id);
            continue;
        }

        const x = isChangedX ? scale.x : mesh.get_scale().x;
        const y = isChangedY ? scale.y : mesh.get_scale().y;

        mesh.scale.set(x, y, 1);
        mesh.transform_changed();

        // если это текстовы меш, то от скейла зависит размер шрифта
        if ((mesh as unknown as TextMesh).fontSize !== undefined) {
            const delta = new Vector3(1 * scale.x, 1 * scale.y, scale.z);
            const max_delta = Math.max(delta.x, delta.y);
            (mesh as unknown as TextMesh).fontSize * max_delta;
        }
    }

    ctx.on_transform_changed?.();
    ctx.on_size_changed?.();
    ctx.on_refresh?.([Property.FONT_SIZE]);
}

/**
 * Обновляет размер объектов
 */
export function update_size(info: ChangeInfo, ctx: UpdaterContext) {
    const [isDraggedX, isDraggedY] = get_dragged_info(info);
    const [isChangedX, isChangedY] = get_changed_info(info);

    const size = info.data.event.value as Vector2;

    const averageSize = new Vector2();
    averageSize.copy(size);

    if (isDraggedX || isDraggedY) {
        const sum = new Vector2(0, 0);
        for (const id of info.ids) {
            const mesh = find_mesh(ctx.selected_list, id);
            if (mesh === undefined) {
                ctx.log_error('[updateSize] Mesh not found for id:', id);
                continue;
            }
            sum.add(mesh.get_size());
        }
        averageSize.copy(sum.divideScalar(info.ids.length));
    }

    for (const id of info.ids) {
        const mesh = find_mesh(ctx.selected_list, id);
        if (mesh === undefined) {
            ctx.log_error('[updateSize] Mesh not found for id:', id);
            continue;
        }

        const x = isDraggedX ? mesh.get_size().x + (size.x - averageSize.x) : isChangedX ? size.x : mesh.get_size().x;
        const y = isDraggedY ? mesh.get_size().y + (size.y - averageSize.y) : isChangedY ? size.y : mesh.get_size().y;

        mesh.set_size(x, y);
    }

    ctx.on_size_changed?.();
}

// ============================================================================
// Helpers
// ============================================================================

function find_mesh(list: IBaseMeshAndThree[], id: number): IBaseMeshAndThree | undefined {
    return list.find((item) => item.mesh_data.id === id);
}
