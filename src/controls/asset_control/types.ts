// Типы для модулей AssetControl

import type { TDictionary } from '../../modules_editor/modules_editor_const';

/** Состояние AssetControl, передаваемое между модулями */
export interface AssetControlState {
    readonly filemanager: HTMLDivElement;
    readonly breadcrumbs: HTMLDivElement;
    readonly assets_list: HTMLDivElement;
    readonly drop_zone: HTMLDivElement;
    active_asset: Element | undefined;
    selected_assets: Element[];
    move_assets_data: MoveAssetsData;
    current_dir: string | undefined;
    current_project: string | undefined;
    current_scene: CurrentScene;
    drag_for_upload_now: boolean;
    drag_asset_now: boolean;
    history_length_cache: TDictionary<number>;
    mouse_down_on_asset: boolean;
}

export interface MoveAssetsData {
    assets: Element[];
    move_type?: 'move' | 'copy';
}

export interface CurrentScene {
    path?: string;
    name?: string;
}

/** Результат типа удаления */
export type RemoveType = 'selected' | 'active' | undefined;
