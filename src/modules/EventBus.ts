/**
 * Legacy EventBus - обёртка над DI EventBus
 *
 * Сохраняет обратную совместимость с существующим кодом,
 * делегируя все вызовы к новому DI EventBus.
 */

import { MessageId, Messages } from "./modules_const";
import type { IEventBus } from '../core/di/types';
import { get_container } from '../core/di/Container';
import { TOKENS } from '../core/di/tokens';

declare global {
    const EventBus: ILegacyEventBus;
}

type FncOnCallback<T> = (data: T) => void;

/** Интерфейс legacy EventBus для типизации */
interface ILegacyEventBus {
    on<T extends MessageId>(id_message: T, callback: FncOnCallback<Messages[T]>): void;
    once<T extends MessageId>(id_message: T, callback: FncOnCallback<Messages[T]>): void;
    off<T extends MessageId>(id_message: T, callback: FncOnCallback<Messages[T]>): void;
    trigger<T extends MessageId>(id_message: T, message_data?: Messages[T], show_warning?: boolean, is_copy_data?: boolean): void;
    send<T extends MessageId>(id_message: T, message_data?: Messages[T]): void;
}

/** Кэш для DI EventBus */
let _di_event_bus: IEventBus | undefined;

/** Получить DI EventBus */
function get_di_event_bus(): IEventBus | undefined {
    if (_di_event_bus === undefined) {
        const container = get_container();
        if (container !== undefined) {
            _di_event_bus = container.try_resolve<IEventBus>(TOKENS.EventBus);
        }
    }
    return _di_event_bus;
}

/** Регистрация глобального EventBus */
export function register_event_bus(): void {
    const legacy_bus: ILegacyEventBus = {
        on<T extends MessageId>(id_message: T, callback: FncOnCallback<Messages[T]>): void {
            const di_bus = get_di_event_bus();
            if (di_bus !== undefined) {
                di_bus.on(id_message, callback as (data: unknown) => void);
            }
        },

        once<T extends MessageId>(id_message: T, callback: FncOnCallback<Messages[T]>): void {
            const di_bus = get_di_event_bus();
            if (di_bus !== undefined) {
                di_bus.once(id_message, callback as (data: unknown) => void);
            }
        },

        off<T extends MessageId>(id_message: T, callback: FncOnCallback<Messages[T]>): void {
            const di_bus = get_di_event_bus();
            if (di_bus !== undefined) {
                di_bus.off(id_message, callback as (data: unknown) => void);
            }
        },

        trigger<T extends MessageId>(
            id_message: T,
            message_data?: Messages[T],
            show_warning = true,
            is_copy_data = false
        ): void {
            const di_bus = get_di_event_bus();
            if (di_bus !== undefined) {
                // DI EventBus.trigger поддерживает эти параметры
                (di_bus as IEventBus & { trigger: (e: string, d?: unknown, w?: boolean, c?: boolean) => void })
                    .trigger(id_message, message_data, show_warning, is_copy_data);
            }
        },

        send<T extends MessageId>(id_message: T, message_data?: Messages[T]): void {
            const di_bus = get_di_event_bus();
            if (di_bus !== undefined) {
                di_bus.emit(id_message, message_data);
            }
        },
    };

    (window as unknown as Record<string, unknown>).EventBus = legacy_bus;
}

/** Сброс кэша (для тестов) */
export function reset_event_bus_cache(): void {
    _di_event_bus = undefined;
}