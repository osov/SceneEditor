// Модуль выделения ассетов

import { ASSET_AUDIO, ASSET_MATERIAL, ASSET_TEXTURE } from '../../modules_editor/modules_editor_const';
import { Services } from '@editor/core';
import type { AssetControlState } from './types';

/** Фабрика для создания менеджера выделения ассетов */
export function create_asset_selection(state: AssetControlState) {
    function clear_selected() {
        if (state.selected_assets.length === 0) return;

        state.selected_assets.forEach(element => {
            element.classList.remove('selected');
        });
        state.selected_assets.splice(0);

        Services.event_bus.emit('assets:selection_cleared');
    }

    function add_to_selected(elem: HTMLSpanElement) {
        if (state.selected_assets.includes(elem)) return;
        state.selected_assets.push(elem);
        elem.classList.add('selected');

        if (elem.getAttribute('data-type') === ASSET_TEXTURE) {
            const textures_paths = get_selected_textures();
            Services.event_bus.emit('assets:textures_selected', { paths: textures_paths });
        }

        if (elem.getAttribute('data-type') === ASSET_MATERIAL) {
            const materials_paths = get_selected_materials();
            Services.event_bus.emit('assets:materials_selected', { paths: materials_paths });
        }

        if (elem.getAttribute('data-type') === ASSET_AUDIO) {
            const audios_paths = get_selected_audios();
            Services.event_bus.emit('assets:audios_selected', { paths: audios_paths });
        }
    }

    function remove_from_selected(elem: HTMLSpanElement) {
        state.selected_assets.splice(state.selected_assets.indexOf(elem), 1);
        elem.classList.remove('selected');

        const textures_paths = get_selected_textures();
        Services.event_bus.emit('assets:textures_selected', { paths: textures_paths });

        const materials_paths = get_selected_materials();
        Services.event_bus.emit('assets:materials_selected', { paths: materials_paths });

        const audios_paths = get_selected_audios();
        Services.event_bus.emit('assets:audios_selected', { paths: audios_paths });
    }

    function set_active(elem: HTMLSpanElement) {
        state.active_asset = elem;
        state.active_asset.classList.add('active');
    }

    function clear_active() {
        state.active_asset?.classList.remove('active');
        state.active_asset = undefined;
    }

    function get_selected_textures(): string[] {
        const textures = state.selected_assets.filter(asset => asset.getAttribute('data-type') === ASSET_TEXTURE);
        const textures_paths = textures.map(asset => asset.getAttribute('data-path') || '');
        return textures_paths;
    }

    function get_selected_materials(): string[] {
        const materials = state.selected_assets.filter(asset => asset.getAttribute('data-type') === ASSET_MATERIAL);
        const materials_paths = materials.map(asset => asset.getAttribute('data-path') || '');
        return materials_paths;
    }

    function get_selected_audios(): string[] {
        const audios = state.selected_assets.filter(asset => asset.getAttribute('data-type') === ASSET_AUDIO);
        const audios_paths = audios.map(asset => asset.getAttribute('data-path') || '');
        return audios_paths;
    }

    return {
        clear_selected,
        add_to_selected,
        remove_from_selected,
        set_active,
        clear_active,
        get_selected_textures,
        get_selected_materials,
        get_selected_audios,
    };
}

export type AssetSelection = ReturnType<typeof create_asset_selection>;
