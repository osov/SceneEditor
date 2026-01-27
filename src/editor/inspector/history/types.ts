/**
 * Типы и интерфейсы для PropertyHistoryService
 */

import { Vector2 } from 'three';
import type { IBaseMeshAndThree } from '../../../render_engine/types';
import type { Property } from '@editor/core/inspector/IInspectable';

/** Интерфейс для mesh с alpha */
export interface IMeshWithAlpha {
    get_alpha(): number;
    set_alpha(alpha: number): void;
}

/** Интерфейс для mesh со slice */
export interface IMeshWithSlice {
    get_slice(): Vector2;
    set_slice(x: number, y: number): void;
}

/** Тип записи истории */
export type HistoryType =
    | 'MESH_NAME'
    | 'MESH_ACTIVE'
    | 'MESH_VISIBLE'
    | 'MESH_TRANSLATE'
    | 'MESH_ROTATE'
    | 'MESH_SCALE'
    | 'MESH_SIZE'
    | 'MESH_PIVOT'
    | 'MESH_ANCHOR'
    | 'MESH_ANCHOR_PRESET'
    | 'MESH_COLOR'
    | 'MESH_ALPHA'
    | 'MESH_TEXTURE'
    | 'MESH_SLICE'
    | 'MESH_TEXT'
    | 'MESH_FONT'
    | 'MESH_FONT_SIZE'
    | 'MESH_TEXT_ALIGN'
    | 'MESH_LINE_HEIGHT'
    | 'MESH_BLEND_MODE'
    | 'MESH_ATLAS'
    | 'MESH_MATERIAL'
    | 'MESH_UV'
    | 'MESH_MODEL_NAME'
    | 'MESH_MODEL_MATERIALS'
    | 'MESH_SLOT_MATERIAL'
    | 'TEXTURE_MIN_FILTER'
    | 'TEXTURE_MAG_FILTER';

/** Интерфейс для получения mesh по id */
export interface IMeshResolver {
    /** Получить mesh по id */
    get_mesh(id: number): IBaseMeshAndThree | undefined;
}

/** Параметры сервиса */
export interface PropertyHistoryServiceParams {
    mesh_resolver: IMeshResolver;
}

/** Зависимости для модулей истории */
export interface HistoryModuleDeps {
    get_mesh: (id: number) => IBaseMeshAndThree | undefined;
    push_history: <T>(
        type: HistoryType,
        description: string,
        undo_items: T[],
        apply_fn: (items: T[]) => void,
        capture_fn: (items: T[]) => T[]
    ) => void;
}

/** Интерфейс сервиса истории свойств */
export interface IPropertyHistoryService {
    /** Сохранить позицию для undo */
    save_position(ids: number[]): void;
    /** Сохранить вращение для undo */
    save_rotation(ids: number[]): void;
    /** Сохранить масштаб для undo */
    save_scale(ids: number[]): void;
    /** Сохранить размер для undo */
    save_size(ids: number[]): void;
    /** Сохранить pivot для undo */
    save_pivot(ids: number[]): void;
    /** Сохранить anchor для undo */
    save_anchor(ids: number[]): void;
    /** Сохранить цвет для undo */
    save_color(ids: number[]): void;
    /** Сохранить прозрачность для undo */
    save_alpha(ids: number[]): void;
    /** Сохранить текстуру для undo */
    save_texture(ids: number[]): void;
    /** Сохранить slice для undo */
    save_slice(ids: number[]): void;
    /** Сохранить имя для undo */
    save_name(ids: number[]): void;
    /** Сохранить active для undo */
    save_active(ids: number[]): void;
    /** Сохранить visible для undo */
    save_visible(ids: number[]): void;
    /** Сохранить текст для undo */
    save_text(ids: number[]): void;
    /** Сохранить шрифт для undo */
    save_font(ids: number[]): void;
    /** Сохранить выравнивание текста для undo */
    save_text_align(ids: number[]): void;
    /** Сохранить высоту строки для undo */
    save_line_height(ids: number[]): void;
    /** Сохранить режим смешивания для undo */
    save_blend_mode(ids: number[]): void;
    /** Сохранить материал для undo */
    save_material(ids: number[]): void;
    /** Сохранить UV для undo */
    save_uv(ids: number[]): void;
    /** Сохранить атлас меша для undo */
    save_atlas(ids: number[]): void;
    /** Сохранить имя 3D модели для undo */
    save_mesh_model_name(ids: number[]): void;
    /** Сохранить материалы 3D модели для undo */
    save_model_materials(ids: number[]): void;
    /** Сохранить материал слота для undo */
    save_slot_material(ids: number[], slot_index: number): void;
    /** Сохранить font size (через scale) для undo */
    save_font_size(ids: number[]): void;
    /** Сохранить свойство по ключу Property */
    save_by_property(property: Property, ids: number[], extra_data?: unknown): void;
}
