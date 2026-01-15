/**
 * NotificationService - сервис уведомлений
 *
 * Обёртка над legacy Popups для доступа через DI.
 * Позволяет показывать toast уведомления и диалоги.
 */

import type { IDisposable, ILogger } from '../core/di/types';

/** Тип уведомления */
export type NotificationType = 'success' | 'error' | 'warning' | 'info';

/** Параметры уведомления */
export interface NotificationParams {
    type: NotificationType;
    message: string;
    /** Продолжительность в мс (для toast) */
    duration?: number;
}

/** Параметры диалога подтверждения */
export interface ConfirmParams {
    title: string;
    text: string;
    button?: string;
    buttonNo?: string;
}

/** Параметры диалога переименования */
export interface RenameParams {
    title: string;
    currentName?: string;
    button?: string;
}

/** Параметры сервиса */
export interface NotificationServiceParams {
    logger: ILogger;
}

/** Интерфейс сервиса */
export interface INotificationService extends IDisposable {
    /** Показать toast success */
    success(message: string): void;
    /** Показать toast error */
    error(message: string): void;
    /** Показать toast warning */
    warning(message: string): void;
    /** Показать toast info */
    info(message: string): void;
    /** Показать toast с параметрами */
    toast(params: NotificationParams): void;
    /** Показать диалог подтверждения */
    confirm(params: ConfirmParams): Promise<boolean>;
    /** Показать диалог переименования */
    rename(params: RenameParams): Promise<string | undefined>;
}

/** Legacy Popups тип */
interface LegacyPopups {
    toast: {
        success(message: string): void;
        error(message: string): void;
        open(params: { type: string; message: string }): void;
    };
    open(params: {
        type: string;
        params: Record<string, unknown>;
        callback: (success: boolean, data?: unknown) => void;
    }): void;
}

/** Получить legacy Popups */
function get_legacy_popups(): LegacyPopups | undefined {
    return (globalThis as unknown as { Popups?: LegacyPopups }).Popups;
}

/** Создать NotificationService */
export function create_notification_service(params: NotificationServiceParams): INotificationService {
    const { logger } = params;

    function success(message: string): void {
        const popups = get_legacy_popups();
        if (popups !== undefined) {
            popups.toast.success(message);
        } else {
            logger.info(`[Toast Success] ${message}`);
        }
    }

    function error(message: string): void {
        const popups = get_legacy_popups();
        if (popups !== undefined) {
            popups.toast.error(message);
        } else {
            logger.error(`[Toast Error] ${message}`);
        }
    }

    function warning(message: string): void {
        const popups = get_legacy_popups();
        if (popups !== undefined) {
            popups.toast.open({ type: 'warning', message });
        } else {
            logger.warn(`[Toast Warning] ${message}`);
        }
    }

    function info(message: string): void {
        const popups = get_legacy_popups();
        if (popups !== undefined) {
            popups.toast.open({ type: 'info', message });
        } else {
            logger.info(`[Toast Info] ${message}`);
        }
    }

    function toast(notification: NotificationParams): void {
        const popups = get_legacy_popups();
        if (popups !== undefined) {
            popups.toast.open({ type: notification.type, message: notification.message });
        } else {
            logger.info(`[Toast ${notification.type}] ${notification.message}`);
        }
    }

    function confirm(confirmParams: ConfirmParams): Promise<boolean> {
        return new Promise((resolve) => {
            const popups = get_legacy_popups();
            if (popups === undefined) {
                logger.warn('Popups не инициализирован');
                resolve(false);
                return;
            }
            popups.open({
                type: 'Confirm',
                params: {
                    title: confirmParams.title,
                    text: confirmParams.text,
                    button: confirmParams.button ?? 'Да',
                    buttonNo: confirmParams.buttonNo ?? 'Нет',
                    auto_close: true,
                },
                callback: (success) => resolve(success),
            });
        });
    }

    function rename(renameParams: RenameParams): Promise<string | undefined> {
        return new Promise((resolve) => {
            const popups = get_legacy_popups();
            if (popups === undefined) {
                logger.warn('Popups не инициализирован');
                resolve(undefined);
                return;
            }
            popups.open({
                type: 'Rename',
                params: {
                    title: renameParams.title,
                    button: renameParams.button ?? 'OK',
                    currentName: renameParams.currentName ?? '',
                    auto_close: true,
                },
                callback: (success, name) => {
                    if (success && typeof name === 'string') {
                        resolve(name);
                    } else {
                        resolve(undefined);
                    }
                },
            });
        });
    }

    function dispose(): void {
        logger.info('NotificationService освобождён');
    }

    logger.info('NotificationService создан');

    return {
        success,
        error,
        warning,
        info,
        toast,
        confirm,
        rename,
        dispose,
    };
}
