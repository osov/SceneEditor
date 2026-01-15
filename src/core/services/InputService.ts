/**
 * InputService - сервис управления вводом
 *
 * Централизованное управление событиями клавиатуры и мыши.
 * Предоставляет состояние модификаторов и позицию мыши.
 */

import { Vector2 } from 'three';
import type { IDisposable, ILogger, IEventBus } from '../di/types';

/** Параметры сервиса */
export interface InputServiceParams {
    logger: ILogger;
    event_bus: IEventBus;
    canvas?: HTMLCanvasElement;
}

/** Данные события указателя */
export interface PointerEventData {
    /** Нормализованная X координата (-1 до 1) */
    x: number;
    /** Нормализованная Y координата (-1 до 1) */
    y: number;
    /** Пиксельная X координата */
    offset_x: number;
    /** Пиксельная Y координата */
    offset_y: number;
    /** Кнопка мыши (0=левая, 1=средняя, 2=правая) */
    button?: number;
    /** Целевой элемент */
    target: EventTarget | null;
}

/** Данные события клавиатуры */
export interface KeyEventData {
    /** Клавиша */
    key: string;
    /** Целевой элемент */
    target: EventTarget | null;
}

/** Интерфейс сервиса */
export interface IInputService extends IDisposable {
    /** Привязать обработчики событий */
    bind_events(canvas?: HTMLCanvasElement): void;
    /** Отвязать обработчики событий */
    unbind_events(): void;
    /** Нажат ли Ctrl/Cmd */
    is_control(): boolean;
    /** Нажат ли Shift */
    is_shift(): boolean;
    /** Нажат ли Alt */
    is_alt(): boolean;
    /** Нажата ли клавиша */
    is_key_down(key: string): boolean;
    /** Состояние всех клавиш */
    readonly keys_state: Readonly<Record<string, boolean>>;
    /** Позиция мыши в пикселях */
    readonly mouse_position: Readonly<Vector2>;
    /** Нормализованная позиция мыши (-1 до 1) */
    readonly mouse_position_normalized: Readonly<Vector2>;
}

/** Создать InputService */
export function create_input_service(params: InputServiceParams): IInputService {
    const { logger, event_bus, canvas: initial_canvas } = params;

    // Состояние
    const keys_state: Record<string, boolean> = {};
    let _is_control = false;
    let _is_shift = false;
    let _is_alt = false;
    const mouse_position = new Vector2();
    const mouse_position_normalized = new Vector2();

    // Обработчики для удаления
    let bound_canvas: HTMLCanvasElement | undefined;
    let keydown_handler: ((e: KeyboardEvent) => void) | undefined;
    let keyup_handler: ((e: KeyboardEvent) => void) | undefined;
    let pointermove_handler: ((e: PointerEvent) => void) | undefined;
    let mousedown_handler: ((e: MouseEvent) => void) | undefined;
    let mouseup_handler: ((e: MouseEvent) => void) | undefined;
    let dblclick_handler: ((e: MouseEvent) => void) | undefined;

    function update_modifiers(e: KeyboardEvent | MouseEvent): void {
        _is_control = e.ctrlKey || e.metaKey;
        _is_shift = e.shiftKey;
        _is_alt = e.altKey;
    }

    function get_canvas_size(): { width: number; height: number } {
        if (bound_canvas !== undefined) {
            return {
                width: bound_canvas.clientWidth,
                height: bound_canvas.clientHeight,
            };
        }
        return {
            width: window.innerWidth,
            height: window.innerHeight,
        };
    }

    function bind_events(canvas?: HTMLCanvasElement): void {
        // Сначала отвязываем старые обработчики
        unbind_events();

        bound_canvas = canvas ?? initial_canvas;
        const body = document.body;

        // Клавиатура
        keydown_handler = (e: KeyboardEvent) => {
            update_modifiers(e);
            keys_state[e.key] = true;

            if (e.repeat) return;

            const data: KeyEventData = { key: e.key, target: e.target };
            event_bus.emit('input:key_down', data);

            // Предотвращаем браузерные хоткеи
            if (e.ctrlKey && (e.key === 'd' || e.key === 'в')) {
                e.preventDefault();
            }
            if (_is_alt) {
                e.preventDefault();
            }
            if (e.ctrlKey && (e.key === 's' || e.key === 'ы')) {
                e.preventDefault();
            }
        };

        keyup_handler = (e: KeyboardEvent) => {
            update_modifiers(e);
            keys_state[e.key] = false;

            const data: KeyEventData = { key: e.key, target: e.target };
            event_bus.emit('input:key_up', data);
        };

        // Мышь
        pointermove_handler = (e: PointerEvent) => {
            update_modifiers(e);
            mouse_position.set(e.pageX, e.pageY);

            const { width, height } = get_canvas_size();
            mouse_position_normalized.set(
                (e.pageX / width) * 2 - 1,
                -(e.pageY / height) * 2 + 1
            );

            const data: PointerEventData = {
                x: mouse_position_normalized.x,
                y: mouse_position_normalized.y,
                offset_x: mouse_position.x,
                offset_y: mouse_position.y,
                target: e.target,
            };
            event_bus.emit('input:pointer_move', data);
        };

        mousedown_handler = (e: MouseEvent) => {
            update_modifiers(e);

            const data: PointerEventData = {
                x: mouse_position_normalized.x,
                y: mouse_position_normalized.y,
                offset_x: mouse_position.x,
                offset_y: mouse_position.y,
                button: e.button,
                target: e.target,
            };
            event_bus.emit('input:pointer_down', data);
        };

        mouseup_handler = (e: MouseEvent) => {
            update_modifiers(e);

            const data: PointerEventData = {
                x: mouse_position_normalized.x,
                y: mouse_position_normalized.y,
                offset_x: mouse_position.x,
                offset_y: mouse_position.y,
                button: e.button,
                target: e.target,
            };
            event_bus.emit('input:pointer_up', data);
        };

        dblclick_handler = (e: MouseEvent) => {
            update_modifiers(e);

            const data: PointerEventData = {
                x: mouse_position_normalized.x,
                y: mouse_position_normalized.y,
                offset_x: mouse_position.x,
                offset_y: mouse_position.y,
                button: e.button,
                target: e.target,
            };
            event_bus.emit('input:dblclick', data);
        };

        // Привязываем обработчики
        body.addEventListener('keydown', keydown_handler);
        body.addEventListener('keyup', keyup_handler);
        body.addEventListener('pointermove', pointermove_handler);
        body.addEventListener('mousedown', mousedown_handler);
        body.addEventListener('mouseup', mouseup_handler);
        body.addEventListener('dblclick', dblclick_handler);

        logger.debug('Обработчики ввода привязаны');
    }

    function unbind_events(): void {
        const body = document.body;

        if (keydown_handler !== undefined) {
            body.removeEventListener('keydown', keydown_handler);
            keydown_handler = undefined;
        }
        if (keyup_handler !== undefined) {
            body.removeEventListener('keyup', keyup_handler);
            keyup_handler = undefined;
        }
        if (pointermove_handler !== undefined) {
            body.removeEventListener('pointermove', pointermove_handler);
            pointermove_handler = undefined;
        }
        if (mousedown_handler !== undefined) {
            body.removeEventListener('mousedown', mousedown_handler);
            mousedown_handler = undefined;
        }
        if (mouseup_handler !== undefined) {
            body.removeEventListener('mouseup', mouseup_handler);
            mouseup_handler = undefined;
        }
        if (dblclick_handler !== undefined) {
            body.removeEventListener('dblclick', dblclick_handler);
            dblclick_handler = undefined;
        }

        bound_canvas = undefined;
    }

    function is_control(): boolean {
        return _is_control;
    }

    function is_shift(): boolean {
        return _is_shift;
    }

    function is_alt(): boolean {
        return _is_alt;
    }

    function is_key_down(key: string): boolean {
        return keys_state[key] === true;
    }

    function dispose(): void {
        unbind_events();
        // Очищаем состояние клавиш
        for (const key in keys_state) {
            delete keys_state[key];
        }
        logger.info('InputService освобождён');
    }

    logger.info('InputService создан');

    return {
        bind_events,
        unbind_events,
        is_control,
        is_shift,
        is_alt,
        is_key_down,
        get keys_state() {
            return keys_state;
        },
        get mouse_position() {
            return mouse_position;
        },
        get mouse_position_normalized() {
            return mouse_position_normalized;
        },
        dispose,
    };
}
