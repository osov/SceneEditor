// Экспорт менеджеров ресурсов

export * from './types';
export * from './TextureManager';
export * from './ShaderManager';
export * from './ModelManager';
export * from './AudioResourceManager';

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
} from '@editor/engine/materials';
