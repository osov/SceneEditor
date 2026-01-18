/**
 * TransformModeService - сервис переключения режимов трансформации
 *
 * Отвечает за:
 * - Переключение между режимами translate/scale/rotate/size
 * - Привязку UI кнопок к режимам
 * - Управление активным контролом
 */

import type { ISceneObject } from '@editor/engine/types';
import type { ITransformService, ISizeService } from './types';
import type { ILogger } from '@editor/core/di/types';

/** Тип кнопки режима трансформации */
export type TransformButtonType =
    | 'translate_transform_btn'
    | 'scale_transform_btn'
    | 'rotate_transform_btn'
    | 'size_transform_btn';

/** Режим трансформации */
export type EditorTransformMode = 'translate' | 'scale' | 'rotate' | 'size' | '';

/** Интерфейс сервиса режимов трансформации */
export interface ITransformModeService {
    /** Текущий активный режим */
    readonly active_mode: EditorTransformMode;
    /** Инициализировать привязку кнопок */
    init(): void;
    /** Установить активный режим */
    set_active_mode(button: TransformButtonType): void;
    /** Очистить все контролы */
    clear_all_controls(): void;
    /** Обновить объекты в текущем контроле */
    update_selected(objects: ISceneObject[]): void;
}

/** Параметры создания сервиса */
export interface TransformModeServiceParams {
    logger: ILogger;
    transform_service: ITransformService;
    size_service: ISizeService;
    selection_service: {
        selected: ISceneObject[];
    };
    default_mode: TransformButtonType;
}

/** Создать TransformModeService */
export function create_transform_mode_service(params: TransformModeServiceParams): ITransformModeService {
    const { logger, transform_service, size_service, selection_service, default_mode } = params;

    let active_mode: EditorTransformMode = '';

    /**
     * Привязать обработчик к кнопке
     */
    function bind_button(name: TransformButtonType, callback: () => void): void {
        const btn = document.querySelector('.menu_min a.' + name);
        if (btn !== null) {
            btn.addEventListener('click', callback);
        } else {
            logger.warn(`Кнопка ${name} не найдена`);
        }
    }

    /**
     * Установить активную кнопку визуально
     */
    function set_active_button(name: TransformButtonType): void {
        const btn = document.querySelector('.menu_min a.' + name);
        if (btn !== null) {
            btn.classList.add('active');
        }
    }

    /**
     * Инициализировать привязку кнопок
     */
    function init(): void {
        bind_button('translate_transform_btn', () => set_active_mode('translate_transform_btn'));
        bind_button('scale_transform_btn', () => set_active_mode('scale_transform_btn'));
        bind_button('rotate_transform_btn', () => set_active_mode('rotate_transform_btn'));
        bind_button('size_transform_btn', () => set_active_mode('size_transform_btn'));

        // Установить режим по умолчанию
        set_active_mode(default_mode);

        logger.debug('TransformModeService инициализирован');
    }

    /**
     * Очистить все контролы
     */
    function clear_all_controls(): void {
        // Снять выделение со всех кнопок
        const list = document.querySelectorAll('.menu_min a');
        for (const btn of Array.from(list)) {
            btn.classList.remove('active');
        }

        // Деактивировать контролы
        transform_service.set_active(false);
        size_service.set_active(false);
    }

    /**
     * Установить активный режим
     */
    function set_active_mode(button: TransformButtonType): void {
        const mode_map: Record<TransformButtonType, EditorTransformMode> = {
            translate_transform_btn: 'translate',
            scale_transform_btn: 'scale',
            rotate_transform_btn: 'rotate',
            size_transform_btn: 'size',
        };

        const new_mode = mode_map[button];

        // Не переключаем если уже в этом режиме
        if (new_mode === active_mode) return;

        clear_all_controls();
        set_active_button(button);
        active_mode = new_mode;

        const selected = selection_service.selected;

        if (new_mode === 'translate' || new_mode === 'scale' || new_mode === 'rotate') {
            transform_service.set_active(true);
            transform_service.set_mode(new_mode);
            transform_service.set_selected_list(selected);
        } else if (new_mode === 'size') {
            size_service.set_active(true);
            size_service.set_selected_list(selected);
        }

        logger.debug(`Режим трансформации: ${new_mode}`);
    }

    /**
     * Обновить объекты в текущем контроле
     */
    function update_selected(objects: ISceneObject[]): void {
        if (active_mode === 'translate' || active_mode === 'scale' || active_mode === 'rotate') {
            transform_service.set_selected_list(objects);
        } else if (active_mode === 'size') {
            size_service.set_selected_list(objects);
        }
    }

    return {
        get active_mode() {
            return active_mode;
        },
        init,
        set_active_mode,
        clear_all_controls,
        update_selected,
    };
}
