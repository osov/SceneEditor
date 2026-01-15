/**
 * Типы и интерфейсы для сервисов редактора
 *
 * Определяет контракты для SelectionService, HistoryService, TransformService,
 * ActionsService, HierarchyService.
 */

import type { ILogger, IEventBus } from '@editor/core/di/types';
import type { ISceneObject, ISceneService, IRenderService } from '@editor/engine/types';
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

    /** Инициализация обработчиков ввода */
    init(): void;
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
    /** Активен ли контрол */
    readonly is_active: boolean;

    /** Установить режим трансформации */
    set_mode(mode: TransformMode): void;
    /** Установить пространство */
    set_space(space: TransformSpace): void;
    /** Активировать/деактивировать gizmo */
    set_active(active: boolean): void;
    /** Прикрепить к объектам */
    attach(objects: ISceneObject[]): void;
    /** Установить выбранные объекты (alias для attach) */
    set_selected_list(objects: ISceneObject[]): void;
    /** Открепить */
    detach(): void;
    /** Получить прикреплённые объекты */
    get_attached(): ISceneObject[];
    /** Установить proxy в среднюю точку выбранных объектов */
    set_proxy_in_average_point(objects?: ISceneObject[]): void;
    /** Установить позицию proxy */
    set_proxy_position(x: number, y: number, z: number, objects?: ISceneObject[]): void;
    /** Установить rotation proxy */
    set_proxy_rotation(x: number, y: number, z: number, objects?: ISceneObject[]): void;
    /** Установить scale proxy */
    set_proxy_scale(x: number, y: number, z: number, objects?: ISceneObject[]): void;
    /** Получить proxy object */
    get_proxy(): import('three').Object3D;
    /** Освободить ресурсы */
    dispose(): void;
}

/** Параметры создания TransformService */
export interface TransformServiceParams {
    logger: ILogger;
    event_bus: IEventBus;
    render_service: IRenderService;
    history_service: IHistoryService;
    selection_service: ISelectionService;
}

// ============================================================================
// ActionsService
// ============================================================================

/** Параметры создания объекта */
export interface CreateObjectParams {
    /** ID родителя */
    pid?: number;
    /** Позиция */
    pos?: { x: number; y: number; z?: number };
    /** Текстура */
    texture?: string;
    /** Атлас */
    atlas?: string;
    /** Размер */
    size?: { w: number; h: number };
}

/** Интерфейс ActionsService */
export interface IActionsService {
    /** Список скопированных объектов (для проверки валидности вставки) */
    readonly copy_list: ISceneObject[];

    /** Копировать выделенные объекты */
    copy(): void;
    /** Вырезать выделенные объекты */
    cut(): void;
    /** Вставить из буфера */
    paste(as_child?: boolean, is_duplication?: boolean): ISceneObject[];
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

    // === Методы создания специфичных объектов ===

    /** Создать GUI контейнер */
    add_gui_container(params: CreateObjectParams): ISceneObject;
    /** Создать GUI box */
    add_gui_box(params: CreateObjectParams): ISceneObject;
    /** Создать GUI текст */
    add_gui_text(params: CreateObjectParams): ISceneObject;
    /** Создать GO контейнер */
    add_go_container(params: CreateObjectParams): ISceneObject;
    /** Создать GO sprite */
    add_go_sprite(params: CreateObjectParams): ISceneObject;
    /** Создать GO label */
    add_go_label(params: CreateObjectParams): ISceneObject;
    /** Создать GO model */
    add_go_model(params: CreateObjectParams): ISceneObject;
    /** Создать GO animated model */
    add_go_animated_model(params: CreateObjectParams): ISceneObject;
    /** Создать GO audio */
    add_go_audio(params: CreateObjectParams): ISceneObject;
    /** Создать GO контейнер со спрайтом внутри */
    add_go_with_sprite(params: CreateObjectParams): ISceneObject;
    /** Создать компонент (SPLINE, MOVER) */
    add_component(params: CreateObjectParams, type: number): ISceneObject;

    // === Валидация ===

    /** Проверить можно ли переместить/вставить объекты */
    is_valid_action(
        target: ISceneObject | undefined,
        objects?: ISceneObject[],
        as_child?: boolean,
        is_move?: boolean
    ): boolean;
    /** Проверить что объекты из одного мира (GUI/GO) */
    is_same_world(objects: ISceneObject[]): boolean;

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

// ============================================================================
// SizeService
// ============================================================================

/** Интерфейс SizeService - управление визуальными границами объектов */
export interface ISizeService {
    /** Установить список выделенных объектов */
    set_selected_list(list: ISceneObject[]): void;
    /** Открепить от объектов */
    detach(): void;
    /** Активировать/деактивировать контрол */
    set_active(active: boolean): void;
    /** Перерисовать границы */
    draw(): void;
    /** Освободить ресурсы */
    dispose(): void;
}

/** Параметры создания SizeService */
export interface SizeServiceParams {
    logger: ILogger;
    event_bus: IEventBus;
    render_service: IRenderService;
    selection_service: ISelectionService;
}
