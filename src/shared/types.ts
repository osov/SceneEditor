/**
 * Общие типы для редактора
 *
 * Эти типы используются в разных частях системы
 * и вынесены в отдельный модуль для совместимости.
 */

/** Данные события перемещения меша */
export type MeshMoveEventData = {
    id_mesh: number;
    pid: number;
    next_id: number;
};

/** Информация о свойстве меша */
export interface MeshPropertyInfo<T> {
    mesh_id: number;
    index?: number;
    value: T;
}

/** Информация о свойстве материала меша */
export interface MeshMaterialPropertyInfo<T> {
    mesh_id: number;
    material_index: number;
    value: T;
}

/** Информация о uniform материала меша */
export interface MeshMaterialUniformInfo<T> {
    mesh_id: number;
    material_index: number;
    uniform_name: string;
    value: T;
}

/** Информация о текстуре ассета */
export interface AssetTextureInfo<T> {
    texture_path: string;
    value: T;
}

/** Информация о материале ассета */
export interface AssetMaterialInfo<T> {
    material_path: string;
    name: string;
    value: T;
}

/** Информация об аудио ассета */
export interface AssetAudioInfo<T> {
    audio_path: string;
    audio_id: number;
    value: T;
}

/** Действия с нодами */
export enum NodeAction {
    rename = 1,
    remove = 2,
    CTRL_C = 3,
    CTRL_V = 4,
    CTRL_X = 5,
    CTRL_D = 6,
    CTRL_B = 7,
    add_gui_container = 10,
    add_gui_box = 11,
    add_gui_text = 12,
    add_go_container = 21,
    add_go_sprite_component = 22,
    add_go_label_component = 23,
    add_go_model_component = 24,
    add_go_animated_model_component = 25,
    add_go_audio_component = 26,
    add_button = 31,
    add_scroll = 32,
    add_component_spline = 40,
    add_component_mover = 41,
    new_scene = 51,
    scene_save = 52,
    scene_save_as = 53,
    new_folder = 60,
    refresh = 61,
    open_in_explorer = 62,
    material_base = 63,
    download = 64,
}

/** Ключи данных истории */
export type HistoryDataKeys =
    | 'transform'
    | 'visible'
    | 'name'
    | 'material'
    | 'texture'
    | 'parent'
    | 'color'
    | 'alpha'
    | 'blend'
    | 'size'
    | 'font'
    | 'outline'
    | 'shadow'
    | 'text'
    | 'pivot'
    | 'anchor'
    | 'leading'
    | 'tracking'
    | 'slice9'
    | 'adjust_mode'
    | 'size_mode'
    | 'inherit_alpha'
    | 'clipping'
    | 'layer'
    | 'enabled'
    | 'xanchor'
    | 'yanchor'
    | 'MESH_ADD';

/** Свойства рисования */
export enum PaintProperty {
    CREATE_SIZE = 'create_size',
    CREATE_BTN = 'create_btn',
    MODE = 'mode',
    VAL_SIZE = 'val_size',
    VAL_COLOR = 'val_color',
    SAVE_BTN = 'save_btn',
    DEL_BTN = 'del_btn',
}

/** Режимы рисования */
export enum PAINT_MODE {
    COLOR = 'color',
    NORMAL = 'normal',
}

/** Действия для GUI нод */
export const NodeActionGui: number[] = [
    NodeAction.add_gui_container,
    NodeAction.add_gui_box,
    NodeAction.add_gui_text,
];

/** Действия для GO нод */
export const NodeActionGo: number[] = [
    NodeAction.add_go_container,
    NodeAction.add_go_sprite_component,
    NodeAction.add_go_label_component,
    NodeAction.add_go_model_component,
    NodeAction.add_go_animated_model_component,
    NodeAction.add_go_audio_component,
];

/** Типы GO миров */
export const worldGo: string[] = [
    'go_container',
    'go_model_component',
    'go_animated_model_component',
    'go_sprite_component',
    'go_label_component',
    'go_audio_component',
];

/** Компоненты GO */
export const componentsGo: string[] = [
    'go_model_component',
    'go_animated_model_component',
    'go_sprite_component',
    'go_label_component',
    'go_audio_component',
];

/** Типы GUI миров */
export const worldGui: string[] = [
    'gui_container',
    'gui_box',
    'gui_text',
];

/** Параметры текстуры */
export type ParamsTexture = {
    texture: string;
    atlas: string;
    size: { w: number; h: number };
    pid: number;
    pos: { x: number; y: number };
};
