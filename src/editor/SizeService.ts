/**
 * SizeService - сервис управления визуальными границами объектов
 *
 * Обёртка над legacy SizeControl для доступа через DI.
 * Управляет отображением bounding box, pivot points, anchor points, slice9.
 */

import type { ISceneObject } from '@editor/engine/types';
import type { ISizeService, SizeServiceParams } from './types';

// Тип legacy SizeControl
interface LegacySizeControl {
    set_selected_list(list: unknown[]): void;
    detach(): void;
    set_active(active: boolean): void;
    draw(): void;
}

/** Получить legacy SizeControl */
function get_legacy_size_control(): LegacySizeControl | undefined {
    return (globalThis as unknown as { SizeControl?: LegacySizeControl }).SizeControl;
}

/** Создать SizeService */
export function create_size_service(params: SizeServiceParams): ISizeService {
    const { logger } = params;

    function set_selected_list(list: ISceneObject[]): void {
        const legacy = get_legacy_size_control();
        if (legacy !== undefined) {
            legacy.set_selected_list(list);
        } else {
            logger.warn('SizeControl не инициализирован');
        }
    }

    function detach(): void {
        const legacy = get_legacy_size_control();
        if (legacy !== undefined) {
            legacy.detach();
        }
    }

    function set_active(active: boolean): void {
        const legacy = get_legacy_size_control();
        if (legacy !== undefined) {
            legacy.set_active(active);
        }
    }

    function draw(): void {
        const legacy = get_legacy_size_control();
        if (legacy !== undefined) {
            legacy.draw();
        }
    }

    function dispose(): void {
        logger.info('SizeService освобождён');
    }

    return {
        set_selected_list,
        detach,
        set_active,
        draw,
        dispose,
    };
}
