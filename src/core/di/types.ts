/**
 * Типы и интерфейсы DI контейнера
 */

/** Идентификатор сервиса - символ, строка или конструктор */
export type ServiceIdentifier<T = unknown> = symbol | string | (new (...args: unknown[]) => T);

/** Жизненный цикл сервиса */
export enum ServiceLifecycle {
    /** Один экземпляр на всё приложение */
    SINGLETON = 'singleton',
    /** Новый экземпляр при каждом запросе */
    TRANSIENT = 'transient',
    /** Один экземпляр на scope */
    SCOPED = 'scoped',
}

/** Дескриптор сервиса - описывает как создавать и управлять сервисом */
/** @noSelf */
export interface IServiceDescriptor<T = unknown> {
    /** Уникальный идентификатор сервиса */
    identifier: ServiceIdentifier<T>;
    /** Фабрика для создания экземпляра сервиса */
    factory: (container: IContainer) => T;
    /** Жизненный цикл сервиса */
    lifecycle: ServiceLifecycle;
    /** Зависимости, которые должны быть инициализированы до этого сервиса */
    dependencies?: ServiceIdentifier<unknown>[];
    /** Порядок инициализации (меньше - раньше) */
    init_order?: number;
    /** Имя для отладки */
    name?: string;
}

/** Интерфейс для сервисов, требующих инициализации */
/** @noSelf */
export interface IInitializable {
    /** Инициализировать сервис */
    init(): void | Promise<void>;
    /** Порядок инициализации */
    readonly init_order?: number;
}

/** Интерфейс для сервисов, требующих очистки */
/** @noSelf */
export interface IDisposable {
    /** Очистить ресурсы */
    dispose(): void | Promise<void>;
}

/** Главный интерфейс DI контейнера */
/** @noSelf */
export interface IContainer {
    // Регистрация

    /** Зарегистрировать сервис с полным дескриптором */
    register<T>(descriptor: IServiceDescriptor<T>): void;

    /** Зарегистрировать singleton сервис */
    register_singleton<T>(
        identifier: ServiceIdentifier<T>,
        factory: (container: IContainer) => T,
        options?: Partial<Pick<IServiceDescriptor<T>, 'dependencies' | 'init_order' | 'name'>>
    ): void;

    /** Зарегистрировать transient сервис (новый экземпляр каждый раз) */
    register_transient<T>(
        identifier: ServiceIdentifier<T>,
        factory: (container: IContainer) => T,
        options?: Partial<Pick<IServiceDescriptor<T>, 'dependencies' | 'name'>>
    ): void;

    /** Зарегистрировать существующий экземпляр как singleton */
    register_instance<T>(identifier: ServiceIdentifier<T>, instance: T): void;

    // Разрешение зависимостей

    /** Получить сервис по идентификатору (бросает ошибку если не найден) */
    resolve<T>(identifier: ServiceIdentifier<T>): T;

    /** Попытаться получить сервис (возвращает undefined если не найден) */
    try_resolve<T>(identifier: ServiceIdentifier<T>): T | undefined;

    /** Проверить, зарегистрирован ли сервис */
    has(identifier: ServiceIdentifier<unknown>): boolean;

    // Жизненный цикл

    /** Инициализировать все зарегистрированные сервисы в порядке зависимостей */
    initialize(): Promise<void>;

    /** Освободить все сервисы и очистить ресурсы */
    dispose(): Promise<void>;

    /** Проверить, инициализирован ли контейнер */
    readonly is_initialized: boolean;

    // Области видимости

    /** Создать дочерний контейнер (scoped сервисы) */
    create_scope(): IContainer;

    /** Получить родительский контейнер (если это scoped контейнер) */
    readonly parent: IContainer | undefined;
}

/** Интерфейс логгера */
/** @noSelf */
export interface ILogger {
    debug(message: string, ...args: unknown[]): void;
    info(message: string, ...args: unknown[]): void;
    warn(message: string, ...args: unknown[]): void;
    error(message: string, ...args: unknown[]): void;
    log(message: string, ...args: unknown[]): void;

    /** Создать дочерний логгер с префиксом */
    create_child(prefix: string): ILogger;
}

/** Интерфейс сервиса конфигурации */
/** @noSelf */
export interface IConfigService {
    get<T>(key: string): T | undefined;
    get<T>(key: string, default_value: T): T;
    set<T>(key: string, value: T): void;
    has(key: string): boolean;
}

/** Тип обработчика события */
export type EventCallback<T = unknown> = (data: T) => void;

/** Интерфейс шины событий */
/** @noSelf */
export interface IEventBus {
    /** Подписаться на событие */
    on<T>(event: string, handler: EventCallback<T>): IDisposable;

    /** Подписаться на событие (одноразово) */
    once<T>(event: string, handler: EventCallback<T>): IDisposable;

    /** Отписаться от события */
    off<T>(event: string, handler: EventCallback<T>): void;

    /** Отправить событие */
    emit<T>(event: string, data?: T): void;

    /** Проверить, есть ли подписчики на событие */
    has_listeners(event: string): boolean;

    /** Получить количество слушателей события */
    listener_count(event: string): number;

    /** Удалить все слушатели */
    remove_all_listeners(event?: string): void;

    /** Получить имена всех событий */
    event_names(): string[];
}

/** Подписка для очистки событий */
/** @noSelf */
export interface ISubscription extends IDisposable {
    /** Проверить, активна ли подписка */
    readonly is_active: boolean;
}

/** Опции регистрации сервиса для декораторов */
export interface InjectableOptions {
    /** Жизненный цикл сервиса */
    lifecycle?: ServiceLifecycle;
    /** Порядок инициализации */
    init_order?: number;
    /** Имя сервиса для отладки */
    name?: string;
}

/** Ключи метаданных для хранения информации об инъекции */
export const INJECTION_METADATA_KEY = Symbol('injection:metadata');
export const INJECTABLE_METADATA_KEY = Symbol('injectable:metadata');
export const INJECT_METADATA_KEY = Symbol('inject:metadata');
