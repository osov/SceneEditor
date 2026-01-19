/**
 * InspectorOptionsUpdater - обновление опций выпадающих списков в инспекторе
 *
 * Извлечено из InspectorControl.ts
 * Обновляет params для LIST_TEXT и LIST_TEXTURES полей при изменении ресурсов
 */

import { Property } from '../../core/inspector/IInspectable';
import type { IOptionsProviders } from '../../editor/inspector/options';
import type { InspectorGroup } from './types';

/**
 * Тип опций для текстур (LIST_TEXTURES)
 */
type TextureOptions = { value: string; src: string }[];

/**
 * Интерфейс для обновления опций
 */
export interface IInspectorOptionsUpdater {
    update_atlas_options(): void;
    update_material_options(): void;
    update_vertex_program_options(): void;
    update_fragment_program_options(): void;
    update_texture_options(properties: Property[], method?: () => TextureOptions): void;
    update_font_options(): void;
    update_sound_options(): void;
    update_sound_function_options(): void;
    update_zone_type_options(): void;
    update_mesh_options(): void;
    update_animation_options(animations: string[]): void;
}

/**
 * Создаёт updater для опций инспектора
 */
export function InspectorOptionsUpdaterCreate(
    get_config: () => InspectorGroup[],
    options_providers: IOptionsProviders
): IInspectorOptionsUpdater {

    /**
     * Обновить опции для свойства в конфиге
     */
    function update_property_options(
        property_names: Property | Property[],
        get_options: () => unknown
    ): void {
        const names = Array.isArray(property_names) ? property_names : [property_names];
        get_config().forEach((group) => {
            const property = group.property_list.find((p) => names.includes(p.name as Property));
            if (property === undefined) return;
            property.params = get_options();
        });
    }

    function update_atlas_options(): void {
        update_property_options(
            [Property.ASSET_ATLAS, Property.ATLAS],
            () => options_providers.get_atlas_options()
        );
    }

    function update_material_options(): void {
        update_property_options(
            Property.MATERIAL,
            () => options_providers.get_material_options()
        );
    }

    function update_vertex_program_options(): void {
        update_property_options(
            Property.VERTEX_PROGRAM,
            () => options_providers.get_vertex_program_options()
        );
    }

    function update_fragment_program_options(): void {
        update_property_options(
            Property.FRAGMENT_PROGRAM,
            () => options_providers.get_fragment_program_options()
        );
    }

    function update_texture_options(
        properties: Property[],
        method = () => options_providers.get_texture_options()
    ): void {
        update_property_options(properties, method);
    }

    function update_font_options(): void {
        update_property_options(
            Property.FONT,
            () => options_providers.get_font_options()
        );
    }

    function update_sound_options(): void {
        update_property_options(
            Property.SOUND,
            () => options_providers.get_sound_options()
        );
    }

    function update_sound_function_options(): void {
        update_property_options(
            Property.SOUND_FUNCTION,
            () => options_providers.get_sound_function_options()
        );
    }

    function update_zone_type_options(): void {
        update_property_options(
            Property.ZONE_TYPE,
            () => options_providers.get_zone_type_options()
        );
    }

    function update_mesh_options(): void {
        update_property_options(
            Property.MESH_NAME,
            () => options_providers.get_mesh_options()
        );
    }

    function update_animation_options(animations: string[]): void {
        update_property_options(
            Property.CURRENT_ANIMATION,
            () => options_providers.get_animation_options(animations)
        );
    }

    return {
        update_atlas_options,
        update_material_options,
        update_vertex_program_options,
        update_fragment_program_options,
        update_texture_options,
        update_font_options,
        update_sound_options,
        update_sound_function_options,
        update_zone_type_options,
        update_mesh_options,
        update_animation_options
    };
}
