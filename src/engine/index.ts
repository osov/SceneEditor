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

// Сервисы
export { create_render_service, DC_LAYERS } from './RenderService';
export { create_scene_service } from './SceneService';
export { create_resource_service } from './ResourceService';
export { create_camera_service } from './CameraService';
