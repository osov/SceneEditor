/**
 * Сервис логирования
 *
 * Централизованный сервис логирования с поддержкой:
 * - Уровней логирования (debug, info, warn, error)
 * - Префиксов для модулей
 * - Форматирования времени
 * - Фильтрации логов
 */

import type { ILogger } from '../di/types';

/** Уровни логирования */
export enum LogLevel {
    DEBUG = 'debug',
    INFO = 'info',
    WARN = 'warn',
    ERROR = 'error',
}

/** Приоритет уровней логирования (меньше = более подробно) */
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
    [LogLevel.DEBUG]: 0,
    [LogLevel.INFO]: 1,
    [LogLevel.WARN]: 2,
    [LogLevel.ERROR]: 3,
};

/** Конфигурация логгера */

export interface LoggerConfig {
    /** Минимальный уровень логирования */
    min_level?: LogLevel;
    /** Включать временные метки */
    include_timestamp?: boolean;
    /** Включать префикс модуля */
    include_prefix?: boolean;
    /** Пользовательские обработчики логов */
    handlers?: LogHandler[];
}

/** Запись лога */
export interface LogEntry {
    /** Уровень */
    level: LogLevel;
    /** Сообщение */
    message: string;
    /** Дополнительные аргументы */
    args: unknown[];
    /** Временная метка */
    timestamp: Date;
    /** Префикс модуля */
    prefix?: string;
}

/** Обработчик логов */
export type LogHandler = (entry: LogEntry) => void;

/** Параметры создания логгера */
interface LoggerParams {
    /** Префикс модуля */
    prefix?: string;
    /** Родительский логгер */
    parent?: ILogger & LoggerInternal;
    /** Конфигурация */
    config?: LoggerConfig;
}

/** Внутренний интерфейс логгера */
interface LoggerInternal {
    /** Получить минимальный уровень */
    get_min_level(): LogLevel;
    /** Получить полный префикс */
    get_full_prefix(): string;
    /** Получить обработчики */
    get_handlers(): LogHandler[];
}

/** Получить строку времени (ЧЧ:ММ:СС) */
function get_time_string(): string {
    const now = new Date();
    const h = now.getHours().toString().padStart(2, '0');
    const m = now.getMinutes().toString().padStart(2, '0');
    const s = now.getSeconds().toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
}

/** Создать сервис логирования */
export function create_logger(params: LoggerParams = {}): ILogger {
    const { prefix = '', parent, config } = params;

    let _config: LoggerConfig = {
        min_level: LogLevel.DEBUG,
        include_timestamp: true,
        include_prefix: true,
        ...config,
    };

    const _handlers: LogHandler[] = [];

    /** Получить минимальный уровень */
    function get_min_level(): LogLevel {
        if (parent !== undefined) {
            return (parent as LoggerInternal).get_min_level();
        }
        return _config.min_level ?? LogLevel.DEBUG;
    }

    /** Проверить, нужно ли логировать данный уровень */
    function should_log(level: LogLevel): boolean {
        const min_level = get_min_level();
        return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[min_level];
    }

    /** Получить полный префикс включая родительские */
    function get_full_prefix(): string {
        if (parent !== undefined) {
            const parent_prefix = (parent as LoggerInternal).get_full_prefix();
            if (parent_prefix && prefix) {
                return `${parent_prefix}:${prefix}`;
            }
            return parent_prefix || prefix;
        }
        return prefix;
    }

    /** Получить обработчики */
    function get_handlers(): LogHandler[] {
        return _handlers;
    }

    /** Внутренний метод логирования */
    function _log(level: LogLevel, message: string, args: unknown[]): void {
        if (!should_log(level)) {
            return;
        }

        const entry: LogEntry = {
            level,
            message,
            args,
            timestamp: new Date(),
            prefix: get_full_prefix(),
        };

        // Формируем аргументы для консоли
        const console_args: unknown[] = [];

        if (_config.include_timestamp) {
            console_args.push(get_time_string());
        }

        if (_config.include_prefix && entry.prefix) {
            console_args.push(`[${entry.prefix}]`);
        }

        console_args.push(message, ...args);

        // Выводим в консоль
        switch (level) {
            case LogLevel.DEBUG:
                console.debug(...console_args);
                break;
            case LogLevel.INFO:
                console.info(...console_args);
                break;
            case LogLevel.WARN:
                console.warn(...console_args);
                break;
            case LogLevel.ERROR:
                console.error(...console_args);
                break;
        }

        // Вызываем пользовательские обработчики
        for (const handler of _handlers) {
            try {
                handler(entry);
            } catch (e) {
                console.error('Ошибка в обработчике логов:', e);
            }
        }

        // Передаём родительским обработчикам
        if (parent !== undefined) {
            const parent_handlers = (parent as LoggerInternal).get_handlers();
            for (const handler of parent_handlers) {
                try {
                    handler(entry);
                } catch (e) {
                    console.error('Ошибка в родительском обработчике логов:', e);
                }
            }
        }
    }

    // Публичные методы

    function debug(message: string, ...args: unknown[]): void {
        _log(LogLevel.DEBUG, message, args);
    }

    function info(message: string, ...args: unknown[]): void {
        _log(LogLevel.INFO, message, args);
    }

    function warn(message: string, ...args: unknown[]): void {
        _log(LogLevel.WARN, message, args);
    }

    function error(message: string, ...args: unknown[]): void {
        _log(LogLevel.ERROR, message, args);
    }

    function log(message: string, ...args: unknown[]): void {
        _log(LogLevel.INFO, message, args);
    }

    function create_child(child_prefix: string): ILogger {
        return create_logger({
            prefix: child_prefix,
            parent: logger as ILogger & LoggerInternal,
            config: _config,
        });
    }

    /** Настроить логгер */
    function configure(new_config: Partial<LoggerConfig>): void {
        _config = { ..._config, ...new_config };
    }

    /** Добавить обработчик логов */
    function add_handler(handler: LogHandler): () => void {
        _handlers.push(handler);
        return () => {
            const index = _handlers.indexOf(handler);
            if (index >= 0) {
                _handlers.splice(index, 1);
            }
        };
    }

    /** Обратная совместимость: get_with_prefix */
    function get_with_prefix(new_prefix: string): ILogger {
        return create_child(new_prefix);
    }

    const logger: ILogger & LoggerInternal & {
        configure: (config: Partial<LoggerConfig>) => void;
        add_handler: (handler: LogHandler) => () => void;
        get_with_prefix: (prefix: string) => ILogger;
    } = {
        debug,
        info,
        warn,
        error,
        log,
        create_child,
        // Расширенные методы
        configure,
        add_handler,
        get_with_prefix,
        // Внутренние методы
        get_min_level,
        get_full_prefix,
        get_handlers,
    };

    return logger;
}

/** Фабричная функция для DI контейнера */
export function logger_factory(config?: LoggerConfig): ILogger {
    return create_logger({ config });
}
