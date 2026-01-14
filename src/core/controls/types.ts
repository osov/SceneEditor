/**
 * Типы и интерфейсы для контролов редактора
 *
 * Определяет контракты для основных контролов:
 * - ControlManager - координация всех контролов
 * - SelectControl - управление выделением
 * - HistoryControl - undo/redo
 * - TransformControl - трансформации объектов
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
// SelectControl
// ============================================================================

/** Интерфейс SelectControl */
export interface ISelectControl {
    /** Инициализация */
    init(): void;
    /** Получить выделенный меш */
    get_selected(): IBaseMesh | null;
    /** Получить список выделенных мешей */
    get_selected_list(): IBaseMesh[];
    /** Установить список выделенных */
    set_selected_list(list: IBaseMesh[]): void;
    /** Проверить, выделен ли меш */
    is_selected(mesh: IBaseMesh): boolean;
    /** Очистить выделение */
    clear_selection(): void;
}

// ============================================================================
// HistoryControl
// ============================================================================

/** Тип операции истории */
export type HistoryAction =
    | 'MESH_TRANSLATE'
    | 'MESH_ROTATE'
    | 'MESH_SCALE'
    | 'MESH_SIZE'
    | 'MESH_DELETE'
    | 'MESH_ADD'
    | 'MESH_MOVE'
    | 'MESH_NAME'
    | 'MESH_ACTIVE'
    | 'MESH_VISIBLE'
    | 'MESH_COLOR'
    | 'MESH_TEXT'
    | 'MESH_MATERIAL';

/** Запись в истории */
export interface HistoryEntry<T = unknown> {
    action: HistoryAction;
    data: T;
    owner: string;
    timestamp: number;
}

/** Интерфейс HistoryControl */
export interface IHistoryControl {
    /** Инициализация */
    init(): void;
    /** Добавить запись в историю */
    add<T>(action: HistoryAction, data: T, owner: string): void;
    /** Отменить последнее действие */
    undo(): void;
    /** Повторить отменённое действие */
    redo(): void;
    /** Проверить, можно ли отменить */
    can_undo(): boolean;
    /** Проверить, можно ли повторить */
    can_redo(): boolean;
    /** Очистить историю */
    clear(): void;
    /** Получить размер истории undo */
    get_undo_size(): number;
    /** Получить размер истории redo */
    get_redo_size(): number;
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

