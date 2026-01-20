/**
 * Handlers - обработчики свойств инспектора
 *
 * Каждый handler отвечает за группу связанных свойств.
 * - Mesh handlers работают с объектами сцены (mesh)
 * - Texture Asset handlers работают с текстурами из Asset Browser
 * - Material Asset handlers работают с материалами из Asset Browser
 */

export * from './types';
export { create_base_handler } from './BaseHandler';
export { create_transform_handler } from './TransformHandler';
export { create_graphics_handler } from './GraphicsHandler';
export { create_text_handler } from './TextHandler';
export { create_audio_handler } from './AudioHandler';
export { create_model_handler } from './ModelHandler';
export { create_animation_handler } from './AnimationHandler';
export { create_flip_handler } from './FlipHandler';
export { create_texture_asset_handler, FilterMode } from './TextureAssetHandler';
export { create_material_asset_handler } from './MaterialAssetHandler';
export { create_uniform_handler, type UniformHandlerParams, type UniformActionData } from './UniformHandler';

import type { IPropertyHandler, ITextureAssetHandler, IMaterialAssetHandler, HandlerParams } from './types';
import { create_base_handler } from './BaseHandler';
import { create_transform_handler } from './TransformHandler';
import { create_graphics_handler } from './GraphicsHandler';
import { create_text_handler } from './TextHandler';
import { create_audio_handler } from './AudioHandler';
import { create_model_handler } from './ModelHandler';
import { create_animation_handler } from './AnimationHandler';
import { create_flip_handler } from './FlipHandler';
import { create_texture_asset_handler } from './TextureAssetHandler';
import { create_material_asset_handler } from './MaterialAssetHandler';
import { Property } from '../../../core/inspector/IInspectable';

/** Создать все handlers */
export function create_all_handlers(params?: HandlerParams): IPropertyHandler[] {
    return [
        create_base_handler(params),
        create_transform_handler(params),
        create_graphics_handler(params),
        create_text_handler(params),
        create_audio_handler(params),
        create_model_handler(params),
        create_animation_handler(params),
        create_flip_handler(params),
    ];
}

/** Реестр handlers по Property */
export interface IHandlerRegistry {
    /** Получить handler для свойства */
    get_handler(property: Property): IPropertyHandler | undefined;
    /** Зарегистрировать handler */
    register(handler: IPropertyHandler): void;
}

/** Создать реестр handlers */
export function create_handler_registry(params?: HandlerParams): IHandlerRegistry {
    const handlers = create_all_handlers(params);
    const property_to_handler = new Map<Property, IPropertyHandler>();

    // Индексируем handlers по свойствам
    for (const handler of handlers) {
        for (const property of handler.properties) {
            property_to_handler.set(property, handler);
        }
    }

    function get_handler(property: Property): IPropertyHandler | undefined {
        return property_to_handler.get(property);
    }

    function register(handler: IPropertyHandler): void {
        handlers.push(handler);
        for (const property of handler.properties) {
            property_to_handler.set(property, handler);
        }
    }

    return {
        get_handler,
        register,
    };
}

// ============================================================================
// Texture Asset Handler Registry (Phase 19)
// ============================================================================

/** Реестр texture asset handlers по Property */
export interface ITextureAssetHandlerRegistry {
    /** Получить handler для свойства */
    get_handler(property: Property): ITextureAssetHandler | undefined;
}

/** Создать реестр texture asset handlers */
export function create_texture_asset_handler_registry(params?: HandlerParams): ITextureAssetHandlerRegistry {
    const handler = create_texture_asset_handler(params);
    const property_to_handler = new Map<Property, ITextureAssetHandler>();

    for (const property of handler.properties) {
        property_to_handler.set(property, handler);
    }

    function get_handler(property: Property): ITextureAssetHandler | undefined {
        return property_to_handler.get(property);
    }

    return {
        get_handler,
    };
}

// ============================================================================
// Material Asset Handler Registry (Phase 19)
// ============================================================================

/** Реестр material asset handlers по Property */
export interface IMaterialAssetHandlerRegistry {
    /** Получить handler для свойства */
    get_handler(property: Property): IMaterialAssetHandler | undefined;
}

/** Создать реестр material asset handlers */
export function create_material_asset_handler_registry(params?: HandlerParams): IMaterialAssetHandlerRegistry {
    const handler = create_material_asset_handler(params);
    const property_to_handler = new Map<Property, IMaterialAssetHandler>();

    for (const property of handler.properties) {
        property_to_handler.set(property, handler);
    }

    function get_handler(property: Property): IMaterialAssetHandler | undefined {
        return property_to_handler.get(property);
    }

    return {
        get_handler,
    };
}
