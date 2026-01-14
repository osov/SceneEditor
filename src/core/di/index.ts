/**
 * Модуль DI - система внедрения зависимостей
 */

// Типы
export type {
    ServiceIdentifier,
    IServiceDescriptor,
    IContainer,
    IInitializable,
    IDisposable,
    ILogger,
    IConfigService,
    IEventBus,
    ISubscription,
    EventCallback,
    InjectableOptions,
} from './types';

export {
    ServiceLifecycle,
    INJECTION_METADATA_KEY,
    INJECTABLE_METADATA_KEY,
    INJECT_METADATA_KEY,
} from './types';

// Контейнер
export {
    create_container,
    get_container,
    set_container,
    reset_container,
    CircularDependencyError,
    ServiceNotFoundError,
    ContainerNotInitializedError,
} from './Container';

// Токены
export {
    TOKENS,
    CORE_TOKENS,
    INPUT_TOKENS,
    NETWORK_TOKENS,
    RENDER_TOKENS,
    ENGINE_TOKENS,
    SCENE_TOKENS,
    EDITOR_TOKENS,
    CONTROL_TOKENS,
    UI_TOKENS,
    INSPECTOR_TOKENS,
    PLUGIN_TOKENS,
    AUDIO_TOKENS,
    INIT_ORDER,
} from './tokens';

export type { TokenType, TokenKey, Token } from './tokens';
