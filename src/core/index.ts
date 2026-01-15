/**
 * Модуль ядра
 *
 * Модуль ядра предоставляет основу для SceneEditor:
 * - DI контейнер для внедрения зависимостей
 * - Шина событий для pub/sub сообщений
 * - Базовые сервисы (логирование, конфигурация)
 * - Инициализация и управление жизненным циклом
 *
 * @example
 * ```typescript
 * import { bootstrap, TOKENS, get_container } from '@editor/core';
 *
 * // Инициализация приложения
 * const { container, logger, event_bus } = await bootstrap({
 *     debug: true,
 * });
 *
 * // Использование сервисов
 * logger.info('Приложение запущено');
 * event_bus.emit('app:ready');
 * ```
 */

// DI - типы и интерфейсы
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
} from './di';

export {
    ServiceLifecycle,
    INJECTION_METADATA_KEY,
    INJECTABLE_METADATA_KEY,
    INJECT_METADATA_KEY,
} from './di';

// Контейнер
export {
    create_container,
    get_container,
    set_container,
    reset_container,
    CircularDependencyError,
    ServiceNotFoundError,
    ContainerNotInitializedError,
} from './di';

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
} from './di';

export type { TokenType, TokenKey, Token } from './di';

// События
export {
    create_event_bus,
    event_bus_factory,
} from './events';

export type { EventHandler } from './events';

// Сервисы
export * from './services';

// Плагины
export {
    EXTENSION_POINTS,
    create_plugin_context,
    create_plugin_manager,
    PluginState,
} from './plugins';

export type {
    PluginManifest,
    PluginDependency,
    PluginExtension,
    IPluginContext,
    IPlugin,
    PluginFactory,
    LoadedPlugin,
    IPluginManager,
    PluginConfig,
    ExtensionPointId,
    InspectorFieldTypeExtension,
    ObjectInspectorExtension,
    ContextMenuItemExtension,
    CommandExtension,
    KeybindingExtension,
    SceneObjectTypeExtension,
    ExporterExtension,
    ImporterExtension,
} from './plugins';

// Инспектор
export {
    PropertyType,
    create_field_type_registry,
    create_inspector_controller,
} from './inspector';

export type {
    PropertyParams,
    PropertyValues,
    PropertyData,
    ObjectData,
    BeforeChangeInfo,
    ChangeInfo,
    ChangeEvent,
    OnBeforeChangeCallback,
    OnChangeCallback,
    OnRefreshCallback,
    NumberFormatParams,
    IInspectorController,
    IFieldTypeHandler,
    IFieldTypeRegistry,
    IObjectInspectorProvider,
    CreateBindingParams,
    BindingResult,
} from './inspector';

// Рендеринг - типы и интерфейсы
export {
    RenderLayers,
    MaterialUniformType,
    ObjectTypes,
} from './render';

export type {
    RenderSize,
    IRenderEngine,
    TextureData,
    TextureInfo,
    MaterialInfo,
    IResourceManager,
    BaseEntityData,
    IBaseEntity,
    ISceneManager,
} from './render';

// Контролы - типы и интерфейсы
export { TransformMode } from './controls';

export type {
    IBaseMesh,
    TreeItemData,
    ISelectControl,
    HistoryAction,
    HistoryEntry,
    IHistoryControl,
    ITransformControl,
    ControlButton,
    IControlManager,
} from './controls';

// Инициализация
export {
    bootstrap,
    shutdown,
    is_bootstrapped,
} from './bootstrap';

export type { BootstrapOptions, BootstrapResult } from './bootstrap';

// ServiceProvider - единая точка доступа к DI сервисам
export {
    Services,
    is_services_ready,
    try_get_service,
} from './ServiceProvider';

export type { IServices } from './ServiceProvider';
