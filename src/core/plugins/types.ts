/**
 * Типы и интерфейсы плагинной системы
 */

import type { IContainer, IDisposable, ILogger } from '../di/types';

/** Манифест плагина - описание метаданных */
export interface PluginManifest {
    /** Уникальный идентификатор плагина */
    id: string;
    /** Отображаемое имя */
    name: string;
    /** Версия плагина (semver) */
    version: string;
    /** Автор плагина */
    author?: string;
    /** Описание */
    description?: string;
    /** Зависимости от других плагинов */
    dependencies?: PluginDependency[];
    /** Точки расширения, которые плагин предоставляет */
    extension_points?: string[];
    /** Расширения, которые плагин регистрирует */
    extensions?: PluginExtension[];
}

/** Зависимость плагина */
export interface PluginDependency {
    /** ID плагина */
    plugin_id: string;
    /** Минимальная версия */
    version: string;
}

/** Расширение, предоставляемое плагином */
export interface PluginExtension {
    /** Точка расширения */
    point: string;
    /** Данные расширения */
    contribution: unknown;
}

/** Контекст плагина - предоставляется при активации */

export interface IPluginContext {
    /** DI контейнер для плагина (scoped) */
    readonly container: IContainer;

    /** Логгер с префиксом плагина */
    readonly logger: ILogger;

    /** Путь к ресурсам плагина */
    readonly extension_path: string;

    /** Зарегистрировать расширение */
    register_extension<T>(point: string, extension: T): IDisposable;

    /** Получить все расширения точки */
    get_extensions<T>(point: string): T[];

    /** Подписки для автоматической очистки при деактивации */
    readonly subscriptions: IDisposable[];
}

/** Интерфейс плагина */

export interface IPlugin {
    /** Манифест плагина */
    readonly manifest: PluginManifest;

    /** Активировать плагин */
    activate(context: IPluginContext): void | Promise<void>;

    /** Деактивировать плагин (опционально) */
    deactivate?(): void | Promise<void>;
}

/** Фабрика плагина - функция создающая плагин */
export type PluginFactory = () => IPlugin;

/** Состояние плагина */
export enum PluginState {
    /** Не загружен */
    UNLOADED = 'unloaded',
    /** Загружен но не активирован */
    LOADED = 'loaded',
    /** Активирован */
    ACTIVATED = 'activated',
    /** Деактивирован */
    DEACTIVATED = 'deactivated',
    /** Ошибка */
    ERROR = 'error',
}

/** Информация о загруженном плагине */
export interface LoadedPlugin {
    /** Экземпляр плагина */
    plugin: IPlugin;
    /** Состояние */
    state: PluginState;
    /** Контекст (если активирован) */
    context?: IPluginContext;
    /** Ошибка (если есть) */
    error?: Error;
}

/** Интерфейс менеджера плагинов */

export interface IPluginManager {
    // Загрузка плагинов

    /** Загрузить встроенные плагины по списку ID */
    load_builtin_plugins(plugin_ids: string[]): Promise<void>;

    /** Загрузить плагин из пути (runtime) */
    load_plugin(path: string): Promise<IPlugin>;

    /** Загрузить плагин из фабрики */
    load_plugin_from_factory(factory: PluginFactory): Promise<IPlugin>;

    // Управление плагинами

    /** Активировать плагин */
    activate_plugin(plugin_id: string): Promise<void>;

    /** Деактивировать плагин */
    deactivate_plugin(plugin_id: string): Promise<void>;

    /** Деактивировать все плагины */
    deactivate_all(): Promise<void>;

    // Точки расширения

    /** Зарегистрировать точку расширения */
    register_extension_point<T>(point: string, default_extensions?: T[]): void;

    /** Получить все расширения точки */
    get_extensions<T>(point: string): T[];

    /** Зарегистрировать расширение */
    register_extension<T>(point: string, extension: T): IDisposable;

    // Информация

    /** Получить плагин по ID */
    get_plugin(plugin_id: string): LoadedPlugin | undefined;

    /** Получить все плагины */
    get_all_plugins(): LoadedPlugin[];

    /** Получить активные плагины */
    get_active_plugins(): LoadedPlugin[];
}

/** Опции конфигурации плагинов */
export interface PluginConfig {
    /** Список ID встроенных плагинов */
    builtin_plugins: string[];
    /** Пути к внешним плагинам (для runtime загрузки) */
    external_plugins?: string[];
}
