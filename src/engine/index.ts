/**
 * Модуль движка
 *
 * Экспортирует сервисы для рендеринга, управления сценой,
 * ресурсами и камерой.
 */

// Типы
export type {
    RenderServiceConfig,
    RenderSize,
    IRenderService,
    RenderServiceParams,
    ISceneObject,
    ISceneService,
    SceneServiceParams,
    IResourceService,
    ResourceServiceParams,
    CameraMode,
    CameraState,
    ICameraService,
    CameraServiceParams,
} from './types';

// Object Registry
export type { IObjectFactory, IObjectRegistry } from './object_registry';
export { create_object_registry } from './object_registry';
// NOTE: register_default_factories НЕ экспортируется здесь, чтобы избежать циклической зависимости
// SceneService импортирует его напрямую из './object_factories'

// Сервисы
export { create_render_service, DC_LAYERS } from './RenderService';
export { create_scene_service } from './SceneService';
export { create_resource_service } from './ResourceService';
export { create_camera_service } from './CameraService';
