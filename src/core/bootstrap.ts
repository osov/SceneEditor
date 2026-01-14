/**
 * Инициализация ядра
 *
 * Инициализирует DI контейнер и регистрирует базовые сервисы.
 * Это точка входа для новой архитектуры.
 */

import type { IContainer, ILogger, IEventBus } from './di/types';
import { create_container, get_container, set_container, reset_container } from './di/Container';
import { TOKENS, INIT_ORDER } from './di/tokens';
import { create_logger, LogLevel } from './services/LoggerService';
import type { LoggerConfig } from './services/LoggerService';
import { create_event_bus } from './events/EventBus';
import type { IPluginManager, PluginConfig, PluginFactory } from './plugins/types';
import { create_plugin_manager } from './plugins/PluginManager';
import { EXTENSION_POINTS } from './plugins/ExtensionPoints';
import { create_field_type_registry } from './inspector/FieldTypeRegistry';
import type { IFieldTypeRegistry } from './inspector/types';

// Статические импорты встроенных плагинов
import { create_plugin as create_core_inspector_plugin } from '../plugins/core-inspector';

/** Маппинг встроенных плагинов */
const BUILTIN_PLUGINS: Record<string, PluginFactory> = {
    'core-inspector': create_core_inspector_plugin,
};

/** Опции инициализации */
export interface BootstrapOptions {
    /** Включить отладочное логирование */
    debug?: boolean;

    /** Конфигурация логгера */
    logger_config?: {
        min_level?: LogLevel;
    };

    /** Конфигурация плагинов */
    plugin_config?: PluginConfig;
}

/** Результат инициализации */
export interface BootstrapResult {
    /** DI контейнер */
    container: IContainer;
    /** Логгер */
    logger: ILogger;
    /** Шина событий */
    event_bus: IEventBus;
    /** Менеджер плагинов */
    plugin_manager: IPluginManager;
}

/** Зарегистрировать базовые сервисы в контейнере */
function register_core_services(container: IContainer, options: BootstrapOptions): void {
    // Сервис логирования - инициализируется первым
    container.register_singleton(TOKENS.Logger, () => {
        const config: LoggerConfig = {};
        if (options.logger_config?.min_level !== undefined) {
            config.min_level = options.logger_config.min_level;
        } else if (options.debug) {
            config.min_level = LogLevel.DEBUG;
        }
        return create_logger({ config });
    }, {
        init_order: INIT_ORDER.LOGGER,
        name: 'Logger',
    });

    // Шина событий
    container.register_singleton(TOKENS.EventBus, (c) => {
        const logger = c.resolve<ILogger>(TOKENS.Logger);
        return create_event_bus({
            logger: logger.create_child('EventBus'),
        });
    }, {
        init_order: INIT_ORDER.EVENT_BUS,
        dependencies: [TOKENS.Logger],
        name: 'EventBus',
    });

    // Менеджер плагинов
    container.register_singleton(TOKENS.PluginManager, (c) => {
        const logger = c.resolve<ILogger>(TOKENS.Logger);
        return create_plugin_manager({
            container: c,
            logger: logger.create_child('PluginManager'),
        });
    }, {
        init_order: INIT_ORDER.PLUGIN_MANAGER,
        dependencies: [TOKENS.Logger],
        name: 'PluginManager',
    });
}

/** Зарегистрировать сервисы инспектора */
function register_inspector_services(container: IContainer, plugin_manager: IPluginManager): void {
    const logger = container.resolve<ILogger>(TOKENS.Logger);

    // Создаём реестр типов полей
    const field_registry = create_field_type_registry({
        logger: logger.create_child('FieldTypeRegistry'),
    });

    // Регистрируем реестр как расширение для плагинов
    plugin_manager.register_extension<IFieldTypeRegistry>(
        EXTENSION_POINTS.INSPECTOR_FIELD_TYPES,
        field_registry
    );

    logger.debug('Реестр типов полей зарегистрирован');
}

/**
 * Инициализировать ядро системы
 *
 * @example
 * ```typescript
 * const { container, logger, event_bus } = await bootstrap({
 *     debug: true,
 *     plugin_config: {
 *         builtin_plugins: ['core-inspector'],
 *     },
 * });
 *
 * // Получение сервисов через DI
 * const render = container.resolve(TOKENS.Render);
 * ```
 */
export async function bootstrap(options: BootstrapOptions = {}): Promise<BootstrapResult> {
    // Создаём контейнер
    const container = create_container();
    set_container(container);

    // Регистрируем базовые сервисы
    register_core_services(container, options);

    // Инициализируем все сервисы
    await container.initialize();

    // Получаем инициализированные сервисы
    const logger = container.resolve<ILogger>(TOKENS.Logger);
    const event_bus = container.resolve<IEventBus>(TOKENS.EventBus);
    const plugin_manager = container.resolve<IPluginManager>(TOKENS.PluginManager);

    logger.info('Инициализация ядра завершена');

    // Регистрируем сервисы инспектора (расширения для плагинов)
    register_inspector_services(container, plugin_manager);

    // Загружаем встроенные плагины если указаны
    if (options.plugin_config?.builtin_plugins !== undefined) {
        logger.info('Загрузка встроенных плагинов...');

        for (const plugin_id of options.plugin_config.builtin_plugins) {
            const factory = BUILTIN_PLUGINS[plugin_id];
            if (factory === undefined) {
                logger.error(`Встроенный плагин не найден: ${plugin_id}`);
                continue;
            }

            try {
                const plugin = await plugin_manager.load_plugin_from_factory(factory);
                await plugin_manager.activate_plugin(plugin.manifest.id);
                logger.info(`Плагин ${plugin_id} загружен и активирован`);
            } catch (error) {
                logger.error(`Ошибка загрузки плагина ${plugin_id}:`, error);
            }
        }
    }

    return {
        container,
        logger,
        event_bus,
        plugin_manager,
    };
}

/**
 * Завершить работу ядра системы
 */
export async function shutdown(): Promise<void> {
    const container = get_container();
    if (container !== undefined) {
        // Деактивируем все плагины
        const plugin_manager = container.try_resolve<IPluginManager>(TOKENS.PluginManager);
        if (plugin_manager !== undefined) {
            await plugin_manager.deactivate_all();
        }

        // Освобождаем ресурсы контейнера
        await container.dispose();
        reset_container();
    }
}

/**
 * Проверить, была ли выполнена инициализация
 */
export function is_bootstrapped(): boolean {
    const container = get_container();
    return container?.is_initialized ?? false;
}
