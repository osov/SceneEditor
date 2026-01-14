/**
 * Менеджер плагинов
 *
 * Управляет жизненным циклом плагинов и точками расширения
 */

import type { IContainer, IDisposable, ILogger } from '../di/types';
import type {
    IPluginManager,
    IPlugin,
    LoadedPlugin,
    PluginFactory,
    IPluginContext,
} from './types';
import { PluginState } from './types';
import { create_plugin_context } from './PluginContext';

/** Параметры создания менеджера плагинов */
interface PluginManagerParams {
    /** DI контейнер */
    container: IContainer;
    /** Логгер */
    logger: ILogger;
}

/** Создать менеджер плагинов */
export function create_plugin_manager(params: PluginManagerParams): IPluginManager {
    const { container, logger } = params;

    // Хранилище плагинов
    const _plugins = new Map<string, LoadedPlugin>();

    // Точки расширения и их расширения
    const _extension_points = new Map<string, unknown[]>();

    /** Отсортировать плагины по зависимостям (топологическая сортировка) */
    function sort_by_dependencies(plugin_ids: string[]): string[] {
        const result: string[] = [];
        const visited = new Set<string>();
        const visiting = new Set<string>();

        function visit(id: string): void {
            if (visited.has(id)) {
                return;
            }

            if (visiting.has(id)) {
                logger.warn(`Обнаружена циклическая зависимость плагинов: ${id}`);
                return;
            }

            visiting.add(id);

            const loaded = _plugins.get(id);
            if (loaded !== undefined) {
                const deps = loaded.plugin.manifest.dependencies;
                if (deps !== undefined) {
                    for (const dep of deps) {
                        visit(dep.plugin_id);
                    }
                }
            }

            visiting.delete(id);
            visited.add(id);
            result.push(id);
        }

        for (const id of plugin_ids) {
            visit(id);
        }

        return result;
    }

    /** Проверить зависимости плагина */
    function validate_dependencies(plugin: IPlugin): void {
        const deps = plugin.manifest.dependencies;
        if (deps === undefined) {
            return;
        }

        for (const dep of deps) {
            const loaded = _plugins.get(dep.plugin_id);
            if (loaded === undefined) {
                throw new Error(
                    `Плагин "${plugin.manifest.id}" требует плагин "${dep.plugin_id}" версии ${dep.version}`
                );
            }
            // TODO: проверка версии (semver)
        }
    }

    /** Создать контекст для плагина */
    function create_context_for_plugin(plugin: IPlugin): IPluginContext {
        return create_plugin_context({
            plugin_id: plugin.manifest.id,
            container: container.create_scope(),
            plugin_manager: manager,
            logger: logger.create_child(plugin.manifest.id),
            extension_path: `plugins/${plugin.manifest.id}`,
        });
    }

    // Публичные методы

    async function load_builtin_plugins(plugin_ids: string[]): Promise<void> {
        logger.info(`Загрузка встроенных плагинов: ${plugin_ids.join(', ')}`);

        for (const id of plugin_ids) {
            try {
                // Динамический импорт встроенного плагина
                const module = await import(
                    /* @vite-ignore */
                    `@editor/plugins/${id}/index.ts`
                );

                const factory: PluginFactory = module.default || module.create_plugin;
                if (typeof factory !== 'function') {
                    logger.error(`Плагин ${id} не экспортирует фабрику`);
                    continue;
                }

                const plugin = factory();
                _plugins.set(plugin.manifest.id, {
                    plugin,
                    state: PluginState.LOADED,
                });

                logger.debug(`Плагин ${id} загружен`);
            } catch (error) {
                logger.error(`Ошибка загрузки плагина ${id}:`, error);
            }
        }

        // Сортируем по зависимостям и активируем
        const sorted = sort_by_dependencies([..._plugins.keys()]);

        for (const id of sorted) {
            try {
                await activate_plugin(id);
            } catch (error) {
                logger.error(`Ошибка активации плагина ${id}:`, error);
            }
        }
    }

    async function load_plugin(path: string): Promise<IPlugin> {
        logger.info(`Загрузка плагина из: ${path}`);

        const module = await import(/* @vite-ignore */ path);
        const factory: PluginFactory = module.default || module.create_plugin;

        if (typeof factory !== 'function') {
            throw new Error(`Модуль ${path} не экспортирует фабрику плагина`);
        }

        const plugin = factory();
        validate_dependencies(plugin);

        _plugins.set(plugin.manifest.id, {
            plugin,
            state: PluginState.LOADED,
        });

        return plugin;
    }

    async function load_plugin_from_factory(factory: PluginFactory): Promise<IPlugin> {
        const plugin = factory();
        validate_dependencies(plugin);

        _plugins.set(plugin.manifest.id, {
            plugin,
            state: PluginState.LOADED,
        });

        return plugin;
    }

    async function activate_plugin(plugin_id: string): Promise<void> {
        const loaded = _plugins.get(plugin_id);

        if (loaded === undefined) {
            throw new Error(`Плагин не найден: ${plugin_id}`);
        }

        if (loaded.state === PluginState.ACTIVATED) {
            logger.warn(`Плагин ${plugin_id} уже активирован`);
            return;
        }

        try {
            const context = create_context_for_plugin(loaded.plugin);
            await loaded.plugin.activate(context);

            loaded.state = PluginState.ACTIVATED;
            loaded.context = context;

            logger.info(`Плагин ${plugin_id} активирован`);
        } catch (error) {
            loaded.state = PluginState.ERROR;
            loaded.error = error as Error;
            throw error;
        }
    }

    async function deactivate_plugin(plugin_id: string): Promise<void> {
        const loaded = _plugins.get(plugin_id);

        if (loaded === undefined) {
            throw new Error(`Плагин не найден: ${plugin_id}`);
        }

        if (loaded.state !== PluginState.ACTIVATED) {
            return;
        }

        try {
            if (loaded.plugin.deactivate !== undefined) {
                await loaded.plugin.deactivate();
            }

            // Очищаем контекст
            if (loaded.context !== undefined) {
                const ctx = loaded.context as IPluginContext & { dispose?: () => void };
                if (ctx.dispose !== undefined) {
                    ctx.dispose();
                }
            }

            loaded.state = PluginState.DEACTIVATED;
            loaded.context = undefined;

            logger.info(`Плагин ${plugin_id} деактивирован`);
        } catch (error) {
            loaded.state = PluginState.ERROR;
            loaded.error = error as Error;
            throw error;
        }
    }

    async function deactivate_all(): Promise<void> {
        // Деактивируем в обратном порядке зависимостей
        const sorted = sort_by_dependencies([..._plugins.keys()]).reverse();

        for (const id of sorted) {
            const loaded = _plugins.get(id);
            if (loaded !== undefined && loaded.state === PluginState.ACTIVATED) {
                try {
                    await deactivate_plugin(id);
                } catch (error) {
                    logger.error(`Ошибка деактивации плагина ${id}:`, error);
                }
            }
        }
    }

    function register_extension_point<T>(point: string, default_extensions?: T[]): void {
        if (_extension_points.has(point)) {
            logger.warn(`Точка расширения ${point} уже зарегистрирована`);
            return;
        }

        _extension_points.set(point, default_extensions !== undefined ? [...default_extensions] : []);
        logger.debug(`Точка расширения зарегистрирована: ${point}`);
    }

    function get_extensions<T>(point: string): T[] {
        const extensions = _extension_points.get(point);
        if (extensions === undefined) {
            return [];
        }
        return extensions as T[];
    }

    function register_extension<T>(point: string, extension: T): IDisposable {
        let extensions = _extension_points.get(point);

        if (extensions === undefined) {
            extensions = [];
            _extension_points.set(point, extensions);
        }

        extensions.push(extension);

        return {
            dispose: () => {
                const idx = extensions!.indexOf(extension);
                if (idx >= 0) {
                    extensions!.splice(idx, 1);
                }
            },
        };
    }

    function get_plugin(plugin_id: string): LoadedPlugin | undefined {
        return _plugins.get(plugin_id);
    }

    function get_all_plugins(): LoadedPlugin[] {
        return [..._plugins.values()];
    }

    function get_active_plugins(): LoadedPlugin[] {
        return [..._plugins.values()].filter(p => p.state === PluginState.ACTIVATED);
    }

    const manager: IPluginManager = {
        load_builtin_plugins,
        load_plugin,
        load_plugin_from_factory,
        activate_plugin,
        deactivate_plugin,
        deactivate_all,
        register_extension_point,
        get_extensions,
        register_extension,
        get_plugin,
        get_all_plugins,
        get_active_plugins,
    };

    return manager;
}
