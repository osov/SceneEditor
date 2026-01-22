// Экспорт сервисов ресурсов

export * from './types';
export * from './model_types';
export { TextureServiceCreate } from './TextureService';
export { AtlasServiceCreate } from './AtlasService';
export { TextureAtlasServiceCreate } from './TextureAtlasService';
export type { ITextureAtlasService } from './TextureAtlasService';
export { ModelServiceCreate } from './ModelService';
export type { IModelService, IAudioResourceService, AnimationInfo } from './model_types';
export { AudioResourceServiceCreate } from './AudioResourceService';

// Реэкспорт MaterialService из нового расположения
export {
    create_material_service,
    type IMaterialService,
    MaterialUniformType,
    type MaterialInfo,
    type MaterialUniform,
    type MaterialUniformParams,
    type MeshMaterialLink,
    type MaterialServiceDeps,
    type IShaderService,
} from '@editor/engine/materials';
