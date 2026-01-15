/**
 * Типы и интерфейсы для контролов редактора (legacy)
 *
 * Определяет контракты для основных контролов:
 * - ControlManager - координация всех контролов
 * - TransformControl - трансформации объектов
 *
 * ПРИМЕЧАНИЕ: SelectControl и HistoryControl удалены.
 * Используйте Services.selection и Services.history.
 */

import type { Object3D } from 'three';

// ============================================================================
// Базовые типы
// ============================================================================

/** Базовый интерфейс меша с данными */
export interface IBaseMesh extends Object3D {
    mesh_data: {
        id: number;
        [key: string]: unknown;
    };
}

/** Элемент дерева сцены */
export interface TreeItemData {
    id: number;
    pid: number;
    name: string;
    visible: boolean;
    selected?: boolean;
    icon: string;
    no_drag?: boolean;
    no_drop?: boolean;
    no_rename?: boolean;
    no_remove?: boolean;
}

// ============================================================================
// TransformControl
// ============================================================================

/** Режим трансформации */
export enum TransformMode {
    TRANSLATE = 'translate',
    ROTATE = 'rotate',
    SCALE = 'scale',
}

/** Интерфейс TransformControl */
export interface ITransformControl {
    /** Инициализация */
    init(): void;
    /** Установить список выделенных мешей */
    set_selected_list(list: IBaseMesh[]): void;
    /** Открепить от текущего меша */
    detach(): void;
    /** Установить режим трансформации */
    set_mode(mode: TransformMode): void;
    /** Получить текущий режим */
    get_mode(): TransformMode;
    /** Установить пространство трансформации */
    set_space(space: 'local' | 'world'): void;
}

// ============================================================================
// ControlManager
// ============================================================================

/** Тип кнопки управления */
export type ControlButton =
    | 'translate_transform_btn'
    | 'scale_transform_btn'
    | 'rotate_transform_btn'
    | 'size_transform_btn';

/** Интерфейс ControlManager */
export interface IControlManager {
    /** Инициализация */
    init(): void;
    /** Установить активный контрол */
    set_active_control(btn: ControlButton): void;
    /** Получить активный контрол */
    get_active_control(): ControlButton | '';
    /** Обновить граф сцены */
    update_graph(): void;
    /** Получить граф для дерева */
    get_tree_graph(): TreeItemData[];
    /** Установить имя сцены */
    set_current_scene_name(name: string): void;
    /** Получить имя сцены */
    get_current_scene_name(): string;
}

