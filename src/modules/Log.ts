/**
 * Legacy Log - обёртка над DI LoggerService
 *
 * Сохраняет обратную совместимость с существующим кодом,
 * делегируя вызовы к новому LoggerService.
 */

import { get_hms } from "./utils";
import type { ILogger } from '../core/di/types';
import { get_container } from '../core/di/Container';
import { TOKENS } from '../core/di/tokens';

declare global {
    const Log: ILegacyLog;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const log: (..._args: any[]) => void;
}

type LogLevels = 'log' | 'info' | 'warn' | 'error';

/** Интерфейс legacy Log */
interface ILegacyLog {
    get_with_prefix(prefix: string, log_level?: LogLevels): ILegacyLog;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    log(..._args: any[]): void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    warn(..._args: any[]): void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    error(..._args: any[]): void;
}

/** Кэш для DI Logger */
let _di_logger: ILogger | undefined;

/** Получить DI Logger */
function get_di_logger(): ILogger | undefined {
    if (_di_logger === undefined) {
        const container = get_container();
        if (container !== undefined) {
            _di_logger = container.try_resolve<ILogger>(TOKENS.Logger);
        }
    }
    return _di_logger;
}

/** Регистрация глобального Log */
export function register_log(): void {
    (window as unknown as Record<string, unknown>).Log = create_legacy_log();
    (window as unknown as Record<string, unknown>).log = Log.log;
}

/** Создать legacy Log с опциональным префиксом */
function create_legacy_log(prefix = ''): ILegacyLog {
    const di_logger = get_di_logger();
    const child_logger = prefix !== '' && di_logger !== undefined
        ? di_logger.create_child(prefix)
        : di_logger;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function send(level: LogLevels, args: any[]): void {
        // Используем DI Logger если доступен
        if (child_logger !== undefined) {
            // Первый аргумент как сообщение, остальные как параметры
            const message = args.length > 0 ? String(args[0]) : '';
            const rest = args.slice(1);
            switch (level) {
                case 'log':
                case 'info':
                    child_logger.info(message, ...rest);
                    break;
                case 'warn':
                    child_logger.warn(message, ...rest);
                    break;
                case 'error':
                    child_logger.error(message, ...rest);
                    break;
            }
        } else {
            // Fallback на console если DI недоступен
            console[level](get_hms(), ...args);
        }
    }

    return {
        get_with_prefix(new_prefix: string, _log_level: LogLevels = 'log'): ILegacyLog {
            const full_prefix = prefix !== '' ? `${prefix}:${new_prefix}` : new_prefix;
            return create_legacy_log(full_prefix);
        },

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        log(...args: any[]): void {
            send('log', args);
        },

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        warn(...args: any[]): void {
            send('warn', args);
        },

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        error(...args: any[]): void {
            send('error', args);
        },
    };
}

/** Сброс кэша (для тестов) */
export function reset_log_cache(): void {
    _di_logger = undefined;
}

