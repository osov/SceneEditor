/**
 * Модуль плагинов
 */

// Типы
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
} from './types';

export { PluginState } from './types';

// Точки расширения
export {
    EXTENSION_POINTS,
} from './ExtensionPoints';

export type {
    ExtensionPointId,
    InspectorFieldTypeExtension,
    ObjectInspectorExtension,
    ContextMenuItemExtension,
    CommandExtension,
    KeybindingExtension,
    SceneObjectTypeExtension,
    ExporterExtension,
    ImporterExtension,
} from './ExtensionPoints';

// Контекст
export { create_plugin_context } from './PluginContext';

// Менеджер
export { create_plugin_manager } from './PluginManager';
