/**
 * Контекст плагина
 *
 * Предоставляется плагину при активации для взаимодействия с редактором
 */

import type { IContainer, IDisposable, ILogger } from '../di/types';
import type { IPluginContext, IPluginManager } from './types';

/** Параметры создания контекста плагина */
interface PluginContextParams {
    /** ID плагина */
    plugin_id: string;
    /** DI контейнер (scoped) */
    container: IContainer;
    /** Менеджер плагинов */
    plugin_manager: IPluginManager;
    /** Логгер */
    logger: ILogger;
    /** Путь к ресурсам плагина */
    extension_path: string;
}

/** Создать контекст плагина */
export function create_plugin_context(params: PluginContextParams): IPluginContext {
    const { container, plugin_manager, logger, extension_path } = params;
    const _subscriptions: IDisposable[] = [];

    function register_extension<T>(point: string, extension: T): IDisposable {
        const disposable = plugin_manager.register_extension(point, extension);
        _subscriptions.push(disposable);
        return disposable;
    }

    function get_extensions<T>(point: string): T[] {
        return plugin_manager.get_extensions<T>(point);
    }

    /** Очистить все подписки контекста */
    function dispose(): void {
        for (const subscription of _subscriptions) {
            subscription.dispose();
        }
        _subscriptions.length = 0;
    }

    return {
        container,
        logger,
        extension_path,
        register_extension,
        get_extensions,
        subscriptions: _subscriptions,
        // Внутренний метод для очистки
        dispose,
    } as IPluginContext & { dispose: () => void };
}
