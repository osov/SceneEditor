/**
 * Options Providers - генерация опций для выпадающих списков инспектора
 *
 * Извлечено из InspectorControl.ts (Фаза 15)
 */

import { Services } from '@editor/core';
import type { TextureInfo } from '../../../render_engine/resource_manager';
import type { IOptionsProviders, TextureOptionData, ListOptions } from './types';

/**
 * Создаёт провайдер опций для инспектора
 */
export function OptionsProvidersCreate(): IOptionsProviders {
    /**
     * Преобразует TextureInfo в формат для thumbnail-list плагина
     */
    function cast_texture_info(info: TextureInfo): TextureOptionData {
        const texture_path = (info.data.texture.userData as { path?: string } | undefined)?.path ?? '';
        const data: TextureOptionData = {
            value: info.name,
            src: texture_path,
            path: texture_path
        };

        if (info.atlas !== '') {
            const texture_image = info.data.texture.image as { width: number; height: number } | null;
            // Пропускаем расчёт offset если изображение ещё не загружено (FBX текстуры грузятся асинхронно)
            if (texture_image === null) {
                return data;
            }
            const sizeX = texture_image.width;
            const sizeY = texture_image.height;

            data.offset = {
                posX: -(sizeX * info.data.uvOffset.x),
                posY: -(sizeY - (sizeY * info.data.uvOffset.y)),
                width: info.data.size.x,
                height: info.data.size.y,
                sizeX,
                sizeY
            };

            // Масштабирование для превью
            if (info.data.size.x > info.data.size.y) {
                // По ширине
                if (info.data.size.x > 40) {
                    const delta = info.data.size.x / 40;
                    data.offset.posX /= delta;
                    data.offset.posY /= delta;
                    data.offset.width = 40;
                    data.offset.height = info.data.size.y / delta;
                    data.offset.sizeX = sizeX / delta;
                    data.offset.sizeY = sizeY / delta;
                }
            } else {
                // По высоте
                if (info.data.size.y > 40) {
                    const delta = info.data.size.y / 40;
                    data.offset.posX /= delta;
                    data.offset.posY /= delta;
                    data.offset.width = info.data.size.x / delta;
                    data.offset.height = 40;
                    data.offset.sizeX = sizeX / delta;
                    data.offset.sizeY = sizeY / delta;
                }
            }

            data.offset.posY += data.offset.height;
        }

        return data;
    }

    function get_texture_options(): TextureOptionData[] {
        return Services.resources.get_all_textures().map(cast_texture_info);
    }

    /**
     * Получить опции текстур для uniform (в формате atlas/texture)
     * Используется для UNIFORM_SAMPLER2D где значение включает атлас
     */
    function get_uniform_texture_options(): TextureOptionData[] {
        return Services.resources.get_all_textures().map((info) => {
            const base_data = cast_texture_info(info);
            // Для uniforms используем формат atlas/texture в value
            const full_value = info.atlas !== '' ? `${info.atlas}/${info.name}` : info.name;
            return {
                ...base_data,
                value: full_value
            };
        });
    }

    function get_atlas_options(): ListOptions {
        const data: ListOptions = {};
        Services.resources.get_all_atlases().forEach((atlas) => {
            data[atlas === '' ? 'Без атласа' : atlas] = atlas;
        });
        return data;
    }

    function get_material_options(): ListOptions {
        const data: ListOptions = {};
        Services.resources.get_all_materials().forEach((material) => {
            data[material] = material;
        });
        return data;
    }

    function get_vertex_program_options(): ListOptions {
        const data: ListOptions = {};
        Services.resources.get_all_vertex_programs().forEach((path) => {
            data[path] = path;
        });
        return data;
    }

    function get_fragment_program_options(): ListOptions {
        const data: ListOptions = {};
        Services.resources.get_all_fragment_programs().forEach((path) => {
            data[path] = path;
        });
        return data;
    }

    function get_font_options(): ListOptions {
        const data: ListOptions = {};
        Services.resources.get_all_fonts().forEach((font) => {
            data[font] = font;
        });
        return data;
    }

    function get_sound_options(): ListOptions {
        const data: ListOptions = {};
        data['Не выбрано'] = '';
        Services.resources.get_all_sounds().forEach((sound) => {
            data[sound] = sound;
        });
        return data;
    }

    function get_sound_function_options(): ListOptions {
        return {
            'Линейная': 'linear',
            'Квадратичная': 'quadratic',
            'Экспоненциальная': 'exponential'
        };
    }

    function get_zone_type_options(): ListOptions {
        return {
            'Круг': 'circle',
            'Прямоугольник': 'rectangle'
        };
    }

    function get_mesh_options(): ListOptions {
        const data: ListOptions = {};
        data['Не выбрано'] = '';
        Services.resources.get_all_models().forEach((mesh) => {
            data[mesh] = mesh;
        });
        return data;
    }

    function get_animation_options(animations: string[]): ListOptions {
        const data: ListOptions = {};
        data['Нет анимации'] = '';
        for (const anim of animations) {
            data[anim] = anim;
        }
        return data;
    }

    return {
        get_texture_options,
        get_uniform_texture_options,
        get_atlas_options,
        get_material_options,
        get_vertex_program_options,
        get_fragment_program_options,
        get_font_options,
        get_sound_options,
        get_sound_function_options,
        get_zone_type_options,
        get_mesh_options,
        get_animation_options,
        cast_texture_info
    };
}

// Singleton instance
let _options_providers: IOptionsProviders | undefined;

/**
 * Получить singleton OptionsProviders
 */
export function get_options_providers(): IOptionsProviders {
    if (_options_providers === undefined) {
        _options_providers = OptionsProvidersCreate();
    }
    return _options_providers;
}
