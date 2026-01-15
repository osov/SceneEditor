/**
 * Legacy InputManager - обёртка для DI InputService
 *
 * Делегирует к DI InputService для обратной совместимости.
 */

import type { IInputService } from '../core/services/InputService';
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

/** Кэш для InputService */
let _input_service: IInputService | undefined;

/** Получить InputService из DI */
function get_input_service(): IInputService | undefined {
    if (_input_service !== undefined) {
        return _input_service;
    }
    const container = get_container();
    if (container !== undefined) {
        _input_service = container.try_resolve<IInputService>(TOKENS.Input);
    }
    return _input_service;
}

/** Регистрация глобального Input */
export function register_input(): void {
    (window as unknown as Record<string, unknown>).Input = create_input_module();
}

/** Создать модуль ввода - делегирует к DI InputService */
function create_input_module(): ILegacyInput {
    // Fallback состояние если DI недоступен
    const fallback_keys_state: Record<string, boolean> = {};

    function bind_events(): void {
        const service = get_input_service();
        if (service !== undefined) {
            // Получаем canvas из глобального RenderEngine
            const canvas = typeof RenderEngine !== 'undefined'
                ? RenderEngine.renderer.domElement
                : document.querySelector('canvas') as HTMLCanvasElement;
            service.bind_events(canvas);
        }
    }

    function is_control(): boolean {
        const service = get_input_service();
        return service?.is_control() ?? false;
    }

    function is_shift(): boolean {
        const service = get_input_service();
        return service?.is_shift() ?? false;
    }

    function is_alt(): boolean {
        const service = get_input_service();
        return service?.is_alt() ?? false;
    }

    return {
        bind_events,
        is_control,
        is_shift,
        is_alt,
        get keys_state(): Record<string, boolean> {
            const service = get_input_service();
            return service?.keys_state ?? fallback_keys_state;
        },
    };
}