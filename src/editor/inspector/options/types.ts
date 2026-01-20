/**
 * Типы для Options Providers
 */

import type { TextureInfo } from '../../../render_engine/resource_manager';

/**
 * Данные для отображения текстуры в thumbnail-list
 */
export interface TextureOptionData {
    value: string;
    src: string;
    path: string;
    offset?: {
        posX: number;
        posY: number;
        width: number;
        height: number;
        sizeX: number;
        sizeY: number;
    };
}

/**
 * Словарь опций для списков (key -> value)
 */
export type ListOptions = { [key: string]: string };

/**
 * Интерфейс провайдера опций
 */
export interface IOptionsProviders {
    // Текстуры и атласы
    get_texture_options(): TextureOptionData[];
    /** Опции текстур для uniform (в формате atlas/texture) */
    get_uniform_texture_options(): TextureOptionData[];
    get_atlas_options(): ListOptions;

    // Материалы и шейдеры
    get_material_options(): ListOptions;
    get_vertex_program_options(): ListOptions;
    get_fragment_program_options(): ListOptions;

    // Шрифты
    get_font_options(): ListOptions;

    // Звуки
    get_sound_options(): ListOptions;
    get_sound_function_options(): ListOptions;

    // Модели и анимации
    get_mesh_options(): ListOptions;
    get_animation_options(animations: string[]): ListOptions;

    // Специальные
    get_zone_type_options(): ListOptions;

    // Утилиты
    cast_texture_info(info: TextureInfo): TextureOptionData;
}
