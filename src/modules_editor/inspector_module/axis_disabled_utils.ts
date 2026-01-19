/**
 * Утилиты для определения различий по осям в выбранных объектах
 *
 * Используется для отображения '-' в input-полях когда значения
 * отличаются между несколькими выбранными объектами
 */

import { Vector2, Vector3 } from 'three';
import { Property } from '../../core/inspector/IInspectable';
import type { ChangeEvent } from '../../editor/inspector/ui';
import type { IBaseMeshAndThree } from '../../render_engine/types';
import type { Slice9Mesh } from '../../render_engine/objects/slice9';

/**
 * Информация о изменении свойства
 * Совместима с ChangeInfo из InspectorControl
 */
interface AxisChangeInfo {
    ids: number[];
    data: {
        field: { name: string };
        event: ChangeEvent;
    };
}

/**
 * Конфигурация для проверки различий по осям
 */
interface AxisDifferenceConfig {
    property: Property;
    get_value: (mesh: IBaseMeshAndThree) => Vector2 | Vector3;
    axis_count: 2 | 3;
}

/**
 * Конфигурации для всех свойств
 */
const AXIS_CONFIGS: AxisDifferenceConfig[] = [
    {
        property: Property.POSITION,
        get_value: (mesh) => mesh.position as unknown as Vector3,
        axis_count: 3
    },
    {
        property: Property.ROTATION,
        get_value: (mesh) => mesh.rotation as unknown as Vector3,
        axis_count: 3
    },
    {
        property: Property.SCALE,
        get_value: (mesh) => mesh.get_scale(),
        axis_count: 2
    },
    {
        property: Property.SIZE,
        get_value: (mesh) => mesh.get_size(),
        axis_count: 2
    },
    {
        property: Property.ANCHOR,
        get_value: (mesh) => mesh.get_anchor(),
        axis_count: 2
    },
    {
        property: Property.SLICE9,
        get_value: (mesh) => (mesh as unknown as Slice9Mesh).get_slice(),
        axis_count: 2
    }
];

/**
 * Найти различия по осям между выбранными объектами
 * @returns массив boolean для каждой оси [combX, combY, combZ?]
 */
function find_axis_differences(
    ids: number[],
    selected_list: IBaseMeshAndThree[],
    get_value: (mesh: IBaseMeshAndThree) => Vector2 | Vector3,
    axis_count: 2 | 3,
    log_error: (message: string, ...args: unknown[]) => void
): boolean[] {
    const comb: boolean[] = Array(axis_count).fill(false);
    let prev_value: Vector2 | Vector3 | undefined;

    for (let i = 0; i < ids.length; i++) {
        const id = ids[i];
        const mesh = selected_list.find((item) => item.mesh_data.id === id);

        if (mesh === undefined) {
            log_error('[find_axis_differences] Mesh not found for id:', id);
            return comb;
        }

        const value = get_value(mesh);

        if (i === 0) {
            prev_value = axis_count === 3
                ? new Vector3().copy(value as Vector3)
                : new Vector2().copy(value as Vector2);
        } else {
            if (!comb[0]) comb[0] = prev_value!.x !== value.x;
            if (!comb[1]) comb[1] = prev_value!.y !== value.y;
            if (axis_count === 3 && !comb[2]) {
                comb[2] = (prev_value as Vector3).z !== (value as Vector3).z;
            }

            // Если все оси отличаются - можно выходить
            if (comb.every((c) => c)) {
                break;
            }

            if (axis_count === 3) {
                (prev_value as Vector3).copy(value as Vector3);
            } else {
                (prev_value as Vector2).copy(value as Vector2);
            }
        }
    }

    return comb;
}

/**
 * Применить маркер '-' к input-элементам где значения отличаются
 */
function apply_disabled_markers(
    event: ChangeEvent,
    differences: boolean[]
): void {
    const inputs = (event.target as any).controller.view.valueElement.querySelectorAll('input');
    differences.forEach((isDifferent, index) => {
        if (isDifferent && inputs[index] !== undefined) {
            inputs[index].value = '-';
        }
    });
}

/**
 * Проверить и отметить различия по осям для заданного свойства
 */
function try_disabled_for_property(
    info: AxisChangeInfo,
    selected_list: IBaseMeshAndThree[],
    config: AxisDifferenceConfig,
    log_error: (message: string, ...args: unknown[]) => void
): void {
    // Сравниваем строковые значения, т.к. field.name это string
    if (info.data.field.name !== config.property) {
        return;
    }

    const differences = find_axis_differences(
        info.ids,
        selected_list,
        config.get_value,
        config.axis_count,
        log_error
    );

    apply_disabled_markers(info.data.event, differences);
}

/**
 * Проверить и отметить различия по осям для всех векторных свойств
 */
export function try_disabled_value_by_axis(
    info: AxisChangeInfo,
    selected_list: IBaseMeshAndThree[],
    log_error: (message: string, ...args: unknown[]) => void
): void {
    for (const config of AXIS_CONFIGS) {
        try_disabled_for_property(info, selected_list, config, log_error);
    }
}

/**
 * Экспорт конфигурации для расширения (если понадобится добавить новые свойства)
 */
export { AXIS_CONFIGS, type AxisDifferenceConfig, type AxisChangeInfo };
