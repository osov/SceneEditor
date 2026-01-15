/**
 * Типы и интерфейсы для сервисов редактора
 *
 * Определяет контракты для SelectionService, HistoryService, TransformService,
 * ActionsService, HierarchyService.
 */

import type { ILogger, IEventBus } from '@editor/core/di/types';
import type { ISceneObject, ISceneService } from '@editor/engine/types';
import type { ObjectTypes } from '@editor/core/render/types';

// ============================================================================
// SelectionService
// ============================================================================

/** Интерфейс SelectionService */
export interface ISelectionService {
    /** Список выделенных объектов */
    readonly selected: ISceneObject[];
    /** Основной (первый) выделенный объект */
    readonly primary: ISceneObject | null;

    /** Выделить объект */
    select(object: ISceneObject, additive?: boolean): void;
    /** Снять выделение с объекта */
    deselect(object: ISceneObject): void;
    /** Очистить выделение */
    clear(): void;
    /** Выделить все объекты */
    select_all(): void;
    /** Проверить выделен ли объект */
    is_selected(object: ISceneObject): boolean;
    /** Установить список выделенных */
    set_selected(objects: ISceneObject[]): void;
    /** Освободить ресурсы */
    dispose(): void;
}

/** Параметры создания SelectionService */
export interface SelectionServiceParams {
    logger: ILogger;
    event_bus: IEventBus;
    scene_service: ISceneService;
}

// ============================================================================
// HistoryService
// ============================================================================

/** Действие в истории */
export interface HistoryAction<T = unknown> {
    /** Тип действия */
    type: string;
    /** Данные для undo/redo */
    data: T;
    /** Функция отмены */
    undo: (data: T) => void;
    /** Функция повтора */
    redo: (data: T) => void;
    /** Описание для UI */
    description?: string;
}

/** Запись в истории */
export interface HistoryEntry {
    /** Тип действия */
    type: string;
    /** Описание */
    description: string;
    /** Временная метка */
    timestamp: number;
}

/** Интерфейс HistoryService */
export interface IHistoryService {
    /** Добавить действие в историю */
    push<T>(action: HistoryAction<T>): void;
    /** Отменить последнее действие */
    undo(): void;
    /** Повторить отменённое действие */
    redo(): void;
    /** Можно ли отменить */
    can_undo(): boolean;
    /** Можно ли повторить */
    can_redo(): boolean;
    /** Очистить историю */
    clear(): void;
    /** Получить стек undo */
    get_undo_stack(): HistoryEntry[];
    /** Получить стек redo */
    get_redo_stack(): HistoryEntry[];
    /** Начать групповое действие */
    begin_group(description: string): void;
    /** Завершить групповое действие */
    end_group(): void;
    /** Освободить ресурсы */
    dispose(): void;
}

/** Параметры создания HistoryService */
export interface HistoryServiceParams {
    logger: ILogger;
    event_bus: IEventBus;
    max_history_size?: number;
}

// ============================================================================
// TransformService
// ============================================================================

/** Режим трансформации */
export type TransformMode = 'translate' | 'rotate' | 'scale';

/** Пространство трансформации */
export type TransformSpace = 'local' | 'world';

/** Интерфейс TransformService */
export interface ITransformService {
    /** Текущий режим трансформации */
    readonly mode: TransformMode;
    /** Текущее пространство */
    readonly space: TransformSpace;

    /** Установить режим трансформации */
    set_mode(mode: TransformMode): void;
    /** Установить пространство */
    set_space(space: TransformSpace): void;
    /** Прикрепить к объектам */
    attach(objects: ISceneObject[]): void;
    /** Открепить */
    detach(): void;
    /** Получить прикреплённые объекты */
    get_attached(): ISceneObject[];
    /** Освободить ресурсы */
    dispose(): void;
}

/** Параметры создания TransformService */
export interface TransformServiceParams {
    logger: ILogger;
    event_bus: IEventBus;
}

// ============================================================================
// ActionsService
// ============================================================================

/** Интерфейс ActionsService */
export interface IActionsService {
    /** Копировать выделенные объекты */
    copy(): void;
    /** Вырезать выделенные объекты */
    cut(): void;
    /** Вставить из буфера */
    paste(): ISceneObject[];
    /** Вставить как дочерний */
    paste_as_child(parent: ISceneObject): ISceneObject[];
    /** Дублировать выделенные объекты */
    duplicate(): ISceneObject[];
    /** Удалить выделенные объекты */
    delete_selected(): void;
    /** Создать объект */
    create(type: ObjectTypes, params?: Record<string, unknown>): ISceneObject;
    /** Проверить есть ли что-то в буфере */
    has_clipboard(): boolean;
    /** Освободить ресурсы */
    dispose(): void;
}

/** Параметры создания ActionsService */
export interface ActionsServiceParams {
    logger: ILogger;
    event_bus: IEventBus;
    scene_service: ISceneService;
    selection_service: ISelectionService;
    history_service: IHistoryService;
}

// ============================================================================
// HierarchyService
// ============================================================================

/** Узел иерархии */
export interface HierarchyNode {
    /** ID объекта */
    id: number;
    /** ID родителя */
    pid: number | null;
    /** Имя */
    name: string;
    /** Видимость */
    visible: boolean;
    /** Выделен ли */
    selected: boolean;
    /** Иконка */
    icon: string;
    /** Развёрнут ли */
    expanded: boolean;
    /** Можно ли перетаскивать */
    draggable: boolean;
    /** Можно ли принимать drop */
    droppable: boolean;
}

/** Интерфейс HierarchyService */
export interface IHierarchyService {
    /** Получить дерево иерархии */
    get_tree(): HierarchyNode[];
    /** Переместить объект */
    move(object: ISceneObject, parent: ISceneObject | null, index?: number): void;
    /** Переименовать объект */
    rename(object: ISceneObject, name: string): void;
    /** Установить видимость */
    set_visible(object: ISceneObject, visible: boolean): void;
    /** Развернуть узел */
    expand(id: number): void;
    /** Свернуть узел */
    collapse(id: number): void;
    /** Развернуть все */
    expand_all(): void;
    /** Свернуть все */
    collapse_all(): void;
    /** Освободить ресурсы */
    dispose(): void;
}

/** Параметры создания HierarchyService */
export interface HierarchyServiceParams {
    logger: ILogger;
    event_bus: IEventBus;
    scene_service: ISceneService;
    selection_service: ISelectionService;
}
