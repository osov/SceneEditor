/**
 * Утилиты для работы с TweakPane
 *
 * Функции для определения какие оси были изменены/перетащены
 */

import type { ChangeEvent } from '../../editor/inspector/ui';

/**
 * Минимальный интерфейс для info с event
 */
interface InfoWithEvent {
    data: {
        event: ChangeEvent;
    };
}

/**
 * Получить информацию о том какие оси были изменены
 * @returns [isChangedX, isChangedY, isChangedZ, isChangedW]
 */
export function get_changed_info(info: InfoWithEvent): [boolean, boolean, boolean, boolean] {
    let isChangedX = false;
    let isChangedY = false;
    let isChangedZ = false;
    let isChangedW = false;

    // NOTE: вариант как получить какие либо значения из tweakpane не переписывая половину либы
    const valueController = (info.data.event.target as any).controller.labelController.valueController;

    // NOTE: для 2D пикера
    const picker = valueController.pickerC_;
    if (picker !== undefined && picker.is_changed) {
        isChangedX = true;
        isChangedY = true;
        return [isChangedX, isChangedY, isChangedZ, isChangedW];
    }

    // NOTE: учитываем что если Point2D то NumberTextController-ы будут в textC_.acs_, а если 3D/4D то сразу в acs_
    // Для скалярных типов (LIST_TEXT, COLOR, BUTTON и т.д.) - acs_ и textC_ отсутствуют
    const acs = valueController.acs_ === undefined ? valueController.textC_?.acs_ : valueController.acs_;
    if (acs === undefined) {
        return [isChangedX, isChangedY, isChangedZ, isChangedW];
    }
    acs.forEach((ac: { is_changed?: boolean }, index: number) => {
        if (ac.is_changed !== true) return;
        switch (index) {
            case 0: isChangedX = true; break;
            case 1: isChangedY = true; break;
            case 2: isChangedZ = true; break;
            case 3: isChangedW = true; break;
        }
    });

    return [isChangedX, isChangedY, isChangedZ, isChangedW];
}

/**
 * Получить информацию о том какие оси были перетащены (drag)
 * @returns [isDraggedX, isDraggedY, isDraggedZ, isDraggedW]
 */
export function get_dragged_info(info: InfoWithEvent): [boolean, boolean, boolean, boolean] {
    let isDraggedX = false;
    let isDraggedY = false;
    let isDraggedZ = false;
    let isDraggedW = false;

    // NOTE: вариант как получить какие либо значения из tweakpane не переписывая половину либы
    // учитываем что если Point2D то NumberTextController-ы будут в textC_.acs_, а если 3D/4D то сразу в acs_
    // Для скалярных типов (LIST_TEXT, COLOR, BUTTON и т.д.) - acs_ и textC_ отсутствуют
    const valueController = (info.data.event.target as any).controller.labelController.valueController;
    const acs = valueController.acs_ === undefined ? valueController.textC_?.acs_ : valueController.acs_;
    if (acs === undefined) {
        return [isDraggedX, isDraggedY, isDraggedZ, isDraggedW];
    }
    acs.forEach((ac: { is_drag?: boolean }, index: number) => {
        if (ac.is_drag !== true) return;
        switch (index) {
            case 0: isDraggedX = true; break;
            case 1: isDraggedY = true; break;
            case 2: isDraggedZ = true; break;
            case 3: isDraggedW = true; break;
        }
    });

    return [isDraggedX, isDraggedY, isDraggedZ, isDraggedW];
}
