/**
 * Legacy InputManager - обёртка для ввода
 *
 * Управляет событиями клавиатуры и мыши.
 * Использует DI EventBus для эмиссии событий.
 */

import { Vector2 } from "three";
import type { IEventBus } from '../core/di/types';
import { get_container } from '../core/di/Container';
import { TOKENS } from '../core/di/tokens';

declare global {
    const Input: ILegacyInput;
}

/** Интерфейс legacy Input */
interface ILegacyInput {
    bind_events(): void;
    is_control(): boolean;
    is_shift(): boolean;
    is_alt(): boolean;
    keys_state: Record<string, boolean>;
}

/** Регистрация глобального Input */
export function register_input(): void {
    (window as unknown as Record<string, unknown>).Input = create_input_module();
}

/** Получить DI EventBus */
function get_event_bus(): IEventBus | undefined {
    const container = get_container();
    return container?.try_resolve<IEventBus>(TOKENS.EventBus);
}

/** Создать модуль ввода */
function create_input_module(): ILegacyInput {
    const keys_state: Record<string, boolean> = {};
    let _is_control = false;
    let _is_shift = false;
    let _is_alt = false;
    const mouse_pos = new Vector2();
    const mouse_pos_normalized = new Vector2();

    function update_state_ext_keys(e: KeyboardEvent | MouseEvent): void {
        _is_control = e.ctrlKey;
        _is_shift = e.shiftKey;
        _is_alt = e.altKey;
    }

    function emit_event(event: string, data: unknown): void {
        const event_bus = get_event_bus();
        if (event_bus !== undefined) {
            event_bus.emit(event, data);
        }
    }

    function bind_events(): void {
        // Получаем canvas из глобального RenderEngine (пока legacy)
        const canvas = typeof RenderEngine !== 'undefined'
            ? RenderEngine.renderer.domElement
            : document.querySelector('canvas') as HTMLCanvasElement;

        const body = document.body;

        body.addEventListener('keydown', (e) => {
            update_state_ext_keys(e);
            keys_state[e.key] = true;
            if (e.repeat) return;
            emit_event('SYS_VIEW_INPUT_KEY_DOWN', { key: e.key, target: e.target });
            if (e.ctrlKey && (e.key === 'd' || e.key === 'в')) {
                e.preventDefault(); // ctrl+d перехватывал браузер
            }
            if (_is_alt) {
                e.preventDefault(); // alt перехватывал браузер
            }
            if (e.ctrlKey && (e.key === 's' || e.key === 'ы')) {
                e.preventDefault();
            }
        });

        body.addEventListener('keyup', (e) => {
            update_state_ext_keys(e);
            keys_state[e.key] = false;
            emit_event('SYS_VIEW_INPUT_KEY_UP', { key: e.key, target: e.target });
        });

        body.addEventListener('pointermove', (e) => {
            update_state_ext_keys(e);
            mouse_pos.set(e.pageX, e.pageY);
            const canvas_width = canvas?.clientWidth ?? window.innerWidth;
            const canvas_height = canvas?.clientHeight ?? window.innerHeight;
            mouse_pos_normalized.set(
                (e.pageX / canvas_width) * 2 - 1,
                -(e.pageY / canvas_height) * 2 + 1
            );
            emit_event('SYS_INPUT_POINTER_MOVE', {
                x: mouse_pos_normalized.x,
                y: mouse_pos_normalized.y,
                offset_x: mouse_pos.x,
                offset_y: mouse_pos.y,
                target: e.target,
            });
        });

        body.addEventListener('mousedown', (e) => {
            update_state_ext_keys(e);
            emit_event('SYS_INPUT_POINTER_DOWN', {
                x: mouse_pos_normalized.x,
                y: mouse_pos_normalized.y,
                offset_x: mouse_pos.x,
                offset_y: mouse_pos.y,
                button: e.button,
                target: e.target,
            });
        });

        body.addEventListener('mouseup', (e) => {
            update_state_ext_keys(e);
            emit_event('SYS_INPUT_POINTER_UP', {
                x: mouse_pos_normalized.x,
                y: mouse_pos_normalized.y,
                offset_x: mouse_pos.x,
                offset_y: mouse_pos.y,
                button: e.button,
                target: e.target,
            });
        });

        body.addEventListener('dblclick', (e) => {
            update_state_ext_keys(e);
            emit_event('SYS_INPUT_DBL_CLICK', {
                x: mouse_pos_normalized.x,
                y: mouse_pos_normalized.y,
                offset_x: mouse_pos.x,
                offset_y: mouse_pos.y,
                button: e.button,
                target: e.target,
            });
        });
    }

    return {
        bind_events,
        is_control: () => _is_control,
        is_shift: () => _is_shift,
        is_alt: () => _is_alt,
        keys_state,
    };
}