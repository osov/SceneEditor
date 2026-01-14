/**
 * Реализация DI контейнера
 *
 * Легковесный контейнер внедрения зависимостей с:
 * - Singleton, transient и scoped жизненными циклами
 * - Топологической сортировкой для порядка инициализации
 * - Обнаружением циклических зависимостей
 * - Поддержкой асинхронной инициализации
 */

import type {
    IContainer,
    IServiceDescriptor,
    IInitializable,
    IDisposable,
    ServiceIdentifier,
} from './types';
import { ServiceLifecycle } from './types';

/** Ошибка циклической зависимости */
export class CircularDependencyError extends Error {
    constructor(public readonly chain: string[]) {
        super(`Обнаружена циклическая зависимость: ${chain.join(' -> ')}`);
        this.name = 'CircularDependencyError';
    }
}

/** Ошибка - сервис не найден */
export class ServiceNotFoundError extends Error {
    constructor(identifier: ServiceIdentifier<unknown>) {
        super(`Сервис не найден: ${get_identifier_name(identifier)}`);
        this.name = 'ServiceNotFoundError';
    }
}

/** Ошибка - контейнер не инициализирован */
export class ContainerNotInitializedError extends Error {
    constructor() {
        super('Контейнер не инициализирован. Вызовите initialize() сначала.');
        this.name = 'ContainerNotInitializedError';
    }
}

/** Получить человекочитаемое имя идентификатора сервиса */
function get_identifier_name(identifier: ServiceIdentifier<unknown>): string {
    if (typeof identifier === 'symbol') {
        return identifier.description || identifier.toString();
    }
    if (typeof identifier === 'string') {
        return identifier;
    }
    return identifier.name || 'Anonymous';
}

/** Проверить, реализует ли объект IInitializable */
function is_initializable(obj: unknown): obj is IInitializable {
    return typeof (obj as IInitializable)?.init === 'function';
}

/** Проверить, реализует ли объект IDisposable */
function is_disposable(obj: unknown): obj is IDisposable {
    return typeof (obj as IDisposable)?.dispose === 'function';
}

/** Создать DI контейнер */
function create_container(parent_container?: IContainer): IContainer {
    const _services = new Map<ServiceIdentifier<unknown>, IServiceDescriptor<unknown>>();
    const _singletons = new Map<ServiceIdentifier<unknown>, unknown>();
    const _scoped_instances = new Map<ServiceIdentifier<unknown>, unknown>();
    const _parent = parent_container;
    let _initialized = false;
    let _initializing = false;
    let _disposed = false;

    /** Убедиться, что контейнер не освобождён */
    function ensure_not_disposed(): void {
        if (_disposed) {
            throw new Error('Контейнер был освобождён');
        }
    }

    /** Получить дескриптор сервиса из этого контейнера */
    function get_descriptor<T>(identifier: ServiceIdentifier<T>): IServiceDescriptor<T> | undefined {
        return _services.get(identifier) as IServiceDescriptor<T> | undefined;
    }

    /** Создать экземпляр сервиса */
    function create_instance<T>(
        identifier: ServiceIdentifier<T>,
        descriptor: IServiceDescriptor<T>
    ): T {
        const instance = descriptor.factory(container);

        if (descriptor.lifecycle === ServiceLifecycle.SINGLETON) {
            _singletons.set(identifier, instance);
        } else if (descriptor.lifecycle === ServiceLifecycle.SCOPED) {
            _scoped_instances.set(identifier, instance);
        }
        // TRANSIENT - не кэшируем

        return instance;
    }

    /** Получить топологически отсортированный порядок инициализации */
    function get_initialization_order(): ServiceIdentifier<unknown>[] {
        const result: ServiceIdentifier<unknown>[] = [];
        const visited = new Set<ServiceIdentifier<unknown>>();
        const visiting = new Set<ServiceIdentifier<unknown>>();
        const chain: string[] = [];

        // Сначала сортируем сервисы по init_order
        const sorted_services = [..._services.entries()].sort(
            ([, a], [, b]) => (a.init_order ?? 100) - (b.init_order ?? 100)
        );

        function visit(identifier: ServiceIdentifier<unknown>): void {
            const name = get_identifier_name(identifier);

            if (visited.has(identifier)) {
                return;
            }

            if (visiting.has(identifier)) {
                throw new CircularDependencyError([...chain, name]);
            }

            visiting.add(identifier);
            chain.push(name);

            // Сначала посещаем зависимости
            const descriptor = _services.get(identifier);
            if (descriptor?.dependencies !== undefined) {
                for (const dep of descriptor.dependencies) {
                    visit(dep);
                }
            }

            chain.pop();
            visiting.delete(identifier);
            visited.add(identifier);
            result.push(identifier);
        }

        // Посещаем все сервисы
        for (const [identifier] of sorted_services) {
            visit(identifier);
        }

        return result;
    }

    // Публичный API контейнера

    function register<T>(descriptor: IServiceDescriptor<T>): void {
        ensure_not_disposed();

        if (descriptor.identifier === undefined) {
            throw new Error('Дескриптор сервиса должен иметь идентификатор');
        }
        if (typeof descriptor.factory !== 'function') {
            throw new Error('Дескриптор сервиса должен иметь функцию-фабрику');
        }

        if (_services.has(descriptor.identifier)) {
            console.warn(
                `Сервис ${get_identifier_name(descriptor.identifier)} перерегистрируется`
            );
        }

        _services.set(descriptor.identifier, {
            ...descriptor,
            lifecycle: descriptor.lifecycle || ServiceLifecycle.SINGLETON,
            init_order: descriptor.init_order ?? 100,
        });
    }

    function register_singleton<T>(
        identifier: ServiceIdentifier<T>,
        factory: (container: IContainer) => T,
        options?: Partial<Pick<IServiceDescriptor<T>, 'dependencies' | 'init_order' | 'name'>>
    ): void {
        register({
            identifier,
            factory,
            lifecycle: ServiceLifecycle.SINGLETON,
            ...options,
        });
    }

    function register_transient<T>(
        identifier: ServiceIdentifier<T>,
        factory: (container: IContainer) => T,
        options?: Partial<Pick<IServiceDescriptor<T>, 'dependencies' | 'name'>>
    ): void {
        register({
            identifier,
            factory,
            lifecycle: ServiceLifecycle.TRANSIENT,
            ...options,
        });
    }

    function register_instance<T>(identifier: ServiceIdentifier<T>, instance: T): void {
        ensure_not_disposed();
        _singletons.set(identifier, instance);
        register({
            identifier,
            factory: () => instance,
            lifecycle: ServiceLifecycle.SINGLETON,
        });
    }

    function has(identifier: ServiceIdentifier<unknown>): boolean {
        if (_services.has(identifier) || _singletons.has(identifier)) {
            return true;
        }
        return _parent?.has(identifier) ?? false;
    }

    function resolve<T>(identifier: ServiceIdentifier<T>): T {
        ensure_not_disposed();

        const result = try_resolve<T>(identifier);
        if (result === undefined) {
            throw new ServiceNotFoundError(identifier);
        }
        return result;
    }

    function try_resolve<T>(identifier: ServiceIdentifier<T>): T | undefined {
        ensure_not_disposed();

        // Сначала проверяем кэш singleton
        if (_singletons.has(identifier)) {
            return _singletons.get(identifier) as T;
        }

        // Проверяем scoped экземпляры
        if (_scoped_instances.has(identifier)) {
            return _scoped_instances.get(identifier) as T;
        }

        // Получаем дескриптор
        const descriptor = get_descriptor(identifier);
        if (descriptor === undefined) {
            // Пробуем родительский контейнер
            return _parent?.try_resolve(identifier);
        }

        // Создаём экземпляр в зависимости от lifecycle
        return create_instance(identifier, descriptor as IServiceDescriptor<T>);
    }

    async function initialize(): Promise<void> {
        ensure_not_disposed();

        if (_initialized) {
            console.warn('Контейнер уже инициализирован');
            return;
        }

        if (_initializing) {
            throw new Error('Контейнер уже инициализируется');
        }

        _initializing = true;

        try {
            // Получаем порядок инициализации
            const order = get_initialization_order();

            // Инициализируем сервисы по порядку
            for (const identifier of order) {
                const instance = resolve(identifier);

                if (is_initializable(instance)) {
                    await instance.init();
                }
            }

            _initialized = true;
        } finally {
            _initializing = false;
        }
    }

    async function dispose(): Promise<void> {
        if (_disposed) {
            return;
        }

        _disposed = true;

        // Освобождаем в обратном порядке инициализации
        const order = [..._singletons.keys()].reverse();

        for (const identifier of order) {
            const instance = _singletons.get(identifier);
            if (is_disposable(instance)) {
                try {
                    await instance.dispose();
                } catch (error) {
                    console.error(
                        `Ошибка при освобождении сервиса ${get_identifier_name(identifier)}:`,
                        error
                    );
                }
            }
        }

        // Очищаем кэши
        _singletons.clear();
        _scoped_instances.clear();
        _services.clear();
        _initialized = false;
    }

    function create_scope(): IContainer {
        ensure_not_disposed();
        return create_container(container as ReturnType<typeof create_container>);
    }

    const container: IContainer = {
        register,
        register_singleton,
        register_transient,
        register_instance,
        has,
        resolve,
        try_resolve,
        initialize,
        dispose,
        create_scope,
        get is_initialized() {
            return _initialized;
        },
        get parent() {
            return _parent as IContainer | undefined;
        },
        // Внутренний метод для дочерних контейнеров
        get_descriptor,
    } as IContainer & { get_descriptor: typeof get_descriptor };

    return container;
}

// Глобальный экземпляр контейнера
let global_container: IContainer | null = null;

/** Получить или создать глобальный контейнер */
export function get_container(): IContainer {
    if (global_container === null) {
        global_container = create_container();
    }
    return global_container;
}

/** Установить глобальный контейнер (для тестирования) */
export function set_container(container: IContainer | null): void {
    global_container = container;
}

/** Сбросить глобальный контейнер (для тестирования) */
export async function reset_container(): Promise<void> {
    if (global_container !== null) {
        await global_container.dispose();
        global_container = null;
    }
}

/** Экспорт фабрики для создания контейнера */
export { create_container };
