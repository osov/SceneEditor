/**
 * Реестр типов полей инспектора
 *
 * Управляет регистрацией и использованием обработчиков типов полей.
 * Позволяет плагинам добавлять новые типы полей.
 */

import type { IDisposable, ILogger } from '../di/types';
import type {
    PropertyType,
    IFieldTypeHandler,
    IFieldTypeRegistry,
    CreateBindingParams,
    BindingResult,
} from './types';

/** Параметры создания реестра типов полей */
interface FieldTypeRegistryParams {
    /** Логгер (опционально) */
    logger?: ILogger;
}

/** Создать реестр типов полей */
export function create_field_type_registry(params: FieldTypeRegistryParams = {}): IFieldTypeRegistry {
    const { logger } = params;

    /** Карта обработчиков по типам */
    const _handlers = new Map<PropertyType, IFieldTypeHandler>();

    /** Зарегистрировать обработчик типа поля */
    function register_handler(handler: IFieldTypeHandler): IDisposable {
        if (_handlers.has(handler.type)) {
            logger?.warn(`Обработчик типа поля ${handler.type} перезаписывается`);
        }

        _handlers.set(handler.type, handler);
        logger?.debug(`Зарегистрирован обработчик типа поля: ${handler.type}`);

        return {
            dispose: () => {
                if (_handlers.get(handler.type) === handler) {
                    _handlers.delete(handler.type);
                    logger?.debug(`Удалён обработчик типа поля: ${handler.type}`);
                }
            },
        };
    }

    /** Получить обработчик для типа */
    function get_handler(type: PropertyType): IFieldTypeHandler | undefined {
        return _handlers.get(type);
    }

    /** Проверить, зарегистрирован ли тип */
    function has_handler(type: PropertyType): boolean {
        return _handlers.has(type);
    }

    /** Создать привязку для поля */
    function create_binding(params: CreateBindingParams): BindingResult | undefined {
        const handler = _handlers.get(params.field.type);

        if (handler === undefined) {
            logger?.warn(`Нет обработчика для типа поля: ${params.field.type}`);
            return undefined;
        }

        try {
            return handler.create_binding(params);
        } catch (error) {
            logger?.error(`Ошибка создания привязки для поля ${params.field.key}:`, error);
            return undefined;
        }
    }

    return {
        register_handler,
        get_handler,
        has_handler,
        create_binding,
    };
}
