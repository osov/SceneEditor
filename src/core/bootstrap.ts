/**
 * Инициализация ядра
 *
 * Инициализирует DI контейнер и регистрирует сервисы.
 * Это точка входа для новой архитектуры без legacy кода.
 */

import type { IContainer, ILogger, IEventBus } from './di/types';
import { create_container, get_container, set_container, reset_container } from './di/Container';
import { TOKENS, INIT_ORDER } from './di/tokens';
import { create_logger, LogLevel } from './services/LoggerService';
import type { LoggerConfig } from './services/LoggerService';
import { create_event_bus } from './events/EventBus';
import { create_input_service } from './services/InputService';
import type { IInputService } from './services/InputService';
import { create_time_service } from './services/TimeService';
import type { IPluginManager, PluginConfig, PluginFactory } from './plugins/types';
import { create_plugin_manager } from './plugins/PluginManager';
import { EXTENSION_POINTS } from './plugins/ExtensionPoints';
import { create_field_type_registry } from './inspector/FieldTypeRegistry';
import type { IFieldTypeRegistry } from './inspector/types';

// Сервисы движка
import {
    create_render_service,
    create_scene_service,
    create_resource_service,
    create_camera_service,
} from '../engine';
// Сервисы редактора
import {
    create_selection_service,
    create_history_service,
    create_transform_service,
    create_actions_service,
    create_hierarchy_service,
    create_asset_service,
    create_ui_service,
    create_inspector_service,
    create_size_service,
    create_notification_service,
} from '../editor';

// Legacy регистрации для обратной совместимости
import { register_resource_manager } from '../render_engine/resource_manager';
import { register_editor_modules } from '../modules_editor/Manager_editor';
import { register_size_control } from '../controls/SizeControl';
import { register_transform_control } from '../controls/TransformControl';
import { register_camera_control } from '../controls/CameraContol';
// ActionsControl удалён - используем Services.actions
import { register_asset_control } from '../controls/AssetControl';

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
    /** Регистрация сервисов движка и редактора */
    register_services: (canvas: HTMLCanvasElement) => void;
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

    // Сервис ввода
    container.register_singleton(TOKENS.Input, (c) => {
        const logger = c.resolve<ILogger>(TOKENS.Logger);
        const event_bus = c.resolve<IEventBus>(TOKENS.EventBus);
        return create_input_service({
            logger: logger.create_child('InputService'),
            event_bus,
        });
    }, {
        init_order: INIT_ORDER.INPUT,
        dependencies: [TOKENS.Logger, TOKENS.EventBus],
        name: 'InputService',
    });

    // Сервис времени
    container.register_singleton(TOKENS.System, () => {
        return create_time_service();
    }, {
        init_order: INIT_ORDER.CORE,
        name: 'TimeService',
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

    /** Регистрация сервисов движка и редактора */
    function register_services(canvas: HTMLCanvasElement): void {
        logger.info('Регистрация сервисов движка и редактора...');

        // === Сервисы движка ===

        // RenderService
        const render_service = create_render_service({
            logger: logger.create_child('RenderService'),
            event_bus,
        });
        render_service.init(canvas);

        // ResourceService
        const resource_service = create_resource_service({
            logger: logger.create_child('ResourceService'),
            event_bus,
        });

        // SceneService
        const scene_service = create_scene_service({
            logger: logger.create_child('SceneService'),
            event_bus,
            render_service,
        });

        // CameraService
        const camera_service = create_camera_service({
            logger: logger.create_child('CameraService'),
            event_bus,
            render_service,
        });

        // Регистрируем сервисы движка в контейнере
        container.register_singleton(TOKENS.Render, () => render_service, {
            init_order: INIT_ORDER.ENGINE_RENDER,
            name: 'RenderService',
        });

        container.register_singleton(TOKENS.Scene, () => scene_service, {
            init_order: INIT_ORDER.ENGINE_SCENE,
            name: 'SceneService',
        });

        container.register_singleton(TOKENS.Resources, () => resource_service, {
            init_order: INIT_ORDER.ENGINE_RESOURCES,
            name: 'ResourceService',
        });

        container.register_singleton(TOKENS.Camera, () => camera_service, {
            init_order: INIT_ORDER.ENGINE_CAMERA,
            name: 'CameraService',
        });

        // === Сервисы редактора ===

        // SelectionService
        const selection_service = create_selection_service({
            logger: logger.create_child('SelectionService'),
            event_bus,
            scene_service,
        });

        // HistoryService
        const history_service = create_history_service({
            logger: logger.create_child('HistoryService'),
            event_bus,
        });

        // TransformService
        const transform_service = create_transform_service({
            logger: logger.create_child('TransformService'),
            event_bus,
            render_service,
            history_service,
            selection_service,
        });

        // ActionsService
        const actions_service = create_actions_service({
            logger: logger.create_child('ActionsService'),
            event_bus,
            scene_service,
            selection_service,
            history_service,
        });

        // HierarchyService
        const hierarchy_service = create_hierarchy_service({
            logger: logger.create_child('HierarchyService'),
            event_bus,
            scene_service,
            selection_service,
        });

        // Регистрируем сервисы редактора в контейнере
        container.register_singleton(TOKENS.Selection, () => selection_service, {
            init_order: INIT_ORDER.EDITOR_SELECTION,
            name: 'SelectionService',
        });

        container.register_singleton(TOKENS.History, () => history_service, {
            init_order: INIT_ORDER.EDITOR_HISTORY,
            name: 'HistoryService',
        });

        container.register_singleton(TOKENS.Transform, () => transform_service, {
            init_order: INIT_ORDER.EDITOR_TRANSFORM,
            name: 'TransformService',
        });

        container.register_singleton(TOKENS.Actions, () => actions_service, {
            init_order: INIT_ORDER.EDITOR_ACTIONS,
            name: 'ActionsService',
        });

        container.register_singleton(TOKENS.Hierarchy, () => hierarchy_service, {
            init_order: INIT_ORDER.EDITOR_HIERARCHY,
            name: 'HierarchyService',
        });

        // AssetService
        const asset_service = create_asset_service({
            logger: logger.create_child('AssetService'),
            event_bus,
        });

        container.register_singleton(TOKENS.Assets, () => asset_service, {
            init_order: INIT_ORDER.EDITOR_ACTIONS + 5,
            name: 'AssetService',
        });

        // UIService - создаётся сейчас, но инициализируется после legacy модулей
        const ui_service = create_ui_service({
            logger: logger.create_child('UIService'),
            event_bus,
            selection_service,
            hierarchy_service,
        });

        container.register_singleton(TOKENS.UI, () => ui_service, {
            init_order: INIT_ORDER.UI,
            name: 'UIService',
        });

        // InspectorService - управление инспектором свойств
        const inspector_service = create_inspector_service({
            logger: logger.create_child('InspectorService'),
            event_bus,
            selection_service,
        });

        container.register_singleton(TOKENS.Inspector, () => inspector_service, {
            init_order: INIT_ORDER.UI + 5,
            name: 'InspectorService',
        });

        // SizeService - управление визуальными границами объектов
        const size_service = create_size_service({
            logger: logger.create_child('SizeService'),
            event_bus,
            render_service,
            selection_service,
        });

        container.register_singleton(TOKENS.Size, () => size_service, {
            init_order: INIT_ORDER.UI + 10,
            name: 'SizeService',
        });

        // NotificationService - toast уведомления и диалоги
        const notification_service = create_notification_service({
            logger: logger.create_child('NotificationService'),
        });

        container.register_singleton(TOKENS.Notifications, () => notification_service, {
            init_order: INIT_ORDER.UI + 15,
            name: 'NotificationService',
        });

        // === Legacy глобальные объекты (window.*) ===
        // Новый код использует DI сервисы через Services.*.
        // Legacy контролы содержат Three.js логику и используют Services.* внутренне.
        //
        // Статус миграции контролов:
        // 🗑️ SelectControl - УДАЛЁН, логика в SelectionService
        // 🗑️ HistoryControl - УДАЛЁН, используем Services.history
        // 🗑️ ActionsControl - УДАЛЁН, используем Services.actions
        // ✅ TransformControl - обёртка над Services.transform (Three.js gizmo)
        // ✅ SizeControl - использует Services.* (Three.js bounds)
        // ✅ CameraControl - использует Services.* (camera-controls)
        // ✅ AssetControl - использует Services.* (файловые операции)
        //
        // Модули редактора:
        // ✅ ControlManager - мигрирован на импорты (get_control_manager())
        // ✅ TreeControl - мигрирован на импорты (get_tree_control())
        // ✅ InspectorControl - мигрирован на импорты (get_inspector_control())
        //
        // Статус глобальных ссылок:
        // - ControlManager: доступен через импорт get_control_manager()
        // - TreeControl: доступен через импорт get_tree_control()
        // - InspectorControl: доступен через импорт get_inspector_control()

        // 1. Resource manager (legacy)
        register_resource_manager(); // window.ResourceManager

        // 2. Привязка событий ввода
        const input_service = container.resolve<IInputService>(TOKENS.Input);
        input_service.bind_events(canvas);

        // 3. Инициализация SelectionService
        selection_service.init();

        // 4. Контролы редактора (window.*)
        register_asset_control();
        register_size_control();
        register_transform_control();
        register_camera_control();

        // 6. UI модули редактора
        register_editor_modules();

        logger.info('Legacy глобальные объекты зарегистрированы');

        // 7. Инициализируем UIService (после регистрации модулей редактора)
        ui_service.init();

        // Запускаем цикл рендеринга
        render_service.start();

        logger.info('Сервисы движка и редактора зарегистрированы');
    }

    return {
        container,
        logger,
        event_bus,
        plugin_manager,
        register_services,
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
