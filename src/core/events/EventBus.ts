/**
 * Сервис шины событий
 *
 * Типобезопасная шина событий для pub/sub сообщений.
 * Совместима с существующим API EventBus.
 */

import type { IEventBus, IDisposable, ILogger } from '../di/types';

/** Функция обработчика события */
export type EventHandler<T = unknown> = (data: T) => void;

/** Информация о слушателе */
interface ListenerInfo<T = unknown> {
    /** Функция обратного вызова */
    callback: EventHandler<T>;
    /** Флаг одноразового вызова */
    once: boolean;
}

/** Параметры создания шины событий */
interface EventBusParams {
    /** Логгер (опционально) */
    logger?: ILogger;
}

/** Создать подписку */
function create_subscription(unsubscribe: () => void): IDisposable {
    let disposed = false;

    return {
        dispose: () => {
            if (!disposed) {
                disposed = true;
                unsubscribe();
            }
        },
    };
}

/** Создать сервис шины событий */
export function create_event_bus(params: EventBusParams = {}): IEventBus {
    const { logger } = params;

    /** Карта слушателей по событиям */
    const _listeners = new Map<string, ListenerInfo[]>();

    /** Удалить слушателя */
    function remove_listener<T>(event: string, handler: EventHandler<T>): void {
        const listeners = _listeners.get(event);
        if (listeners === undefined) {
            return;
        }

        for (let i = listeners.length - 1; i >= 0; i--) {
            if (listeners[i].callback === handler) {
                listeners.splice(i, 1);
                return;
            }
        }
    }

    /** Внутренняя функция подписки */
    function subscribe<T>(event: string, handler: EventHandler<T>, once: boolean): IDisposable {
        let listeners = _listeners.get(event);
        if (listeners === undefined) {
            listeners = [];
            _listeners.set(event, listeners);
        }

        const info: ListenerInfo = { callback: handler as EventHandler<unknown>, once };
        listeners.push(info);

        return create_subscription(() => {
            remove_listener(event, handler);
        });
    }

    // Публичные методы

    function on<T>(event: string, handler: EventHandler<T>): IDisposable {
        return subscribe(event, handler, false);
    }

    function once<T>(event: string, handler: EventHandler<T>): IDisposable {
        return subscribe(event, handler, true);
    }

    function off<T>(event: string, handler: EventHandler<T>): void {
        const listeners = _listeners.get(event);
        if (listeners === undefined) {
            logger?.warn(`Нет слушателей для события: ${event}`);
            return;
        }

        remove_listener(event, handler);
    }

    function emit<T>(event: string, data?: T): void {
        const listeners = _listeners.get(event);
        if (listeners === undefined || listeners.length === 0) {
            // Не выводим предупреждение для каждого emit - слишком шумно
            return;
        }

        // Собираем индексы для удаления (одноразовые слушатели)
        const to_remove: number[] = [];

        // Вызываем всех слушателей
        for (let i = 0; i < listeners.length; i++) {
            const listener = listeners[i];
            try {
                listener.callback(data);
            } catch (error) {
                logger?.error(`Ошибка в обработчике события ${event}:`, error);
            }

            if (listener.once) {
                to_remove.push(i);
            }
        }

        // Удаляем одноразовые слушатели в обратном порядке
        for (let i = to_remove.length - 1; i >= 0; i--) {
            listeners.splice(to_remove[i], 1);
        }
    }

    function has_listeners(event: string): boolean {
        const listeners = _listeners.get(event);
        return listeners !== undefined && listeners.length > 0;
    }

    function listener_count(event: string): number {
        return _listeners.get(event)?.length ?? 0;
    }

    function remove_all_listeners(event?: string): void {
        if (event !== undefined) {
            _listeners.delete(event);
        } else {
            _listeners.clear();
        }
    }

    function event_names(): string[] {
        return [..._listeners.keys()];
    }

    // Методы обратной совместимости

    function trigger<T>(event: string, data?: T, show_warning = true, is_copy_data = false): void {
        const listeners = _listeners.get(event);
        if (listeners === undefined || listeners.length === 0) {
            if (show_warning) {
                logger?.warn(`Нет слушателей для события: ${event}`);
            }
            return;
        }

        // Копируем данные если требуется
        const event_data = is_copy_data && data !== undefined
            ? JSON.parse(JSON.stringify(data))
            : data;

        emit(event, event_data);
    }

    function send<T>(event: string, data?: T): void {
        emit(event, data);
    }

    const bus: IEventBus & {
        trigger: typeof trigger;
        send: typeof send;
    } = {
        on,
        once,
        off,
        emit,
        has_listeners,
        listener_count,
        remove_all_listeners,
        event_names,
        // Обратная совместимость
        trigger,
        send,
    };

    return bus;
}

/** Фабричная функция для DI контейнера */
export function event_bus_factory(logger?: ILogger): IEventBus {
    return create_event_bus({ logger });
}
