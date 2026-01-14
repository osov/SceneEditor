/**
 * Модуль редактора
 *
 * Экспортирует сервисы для управления выделением,
 * историей, трансформацией, действиями и иерархией.
 */

// Типы
export type {
    ISelectionService,
    SelectionServiceParams,
    HistoryAction,
    HistoryEntry,
    IHistoryService,
    HistoryServiceParams,
    TransformMode,
    TransformSpace,
    ITransformService,
    TransformServiceParams,
    IActionsService,
    ActionsServiceParams,
    HierarchyNode,
    IHierarchyService,
    HierarchyServiceParams,
} from './types';

// Сервисы
export { create_selection_service } from './SelectionService';
export { create_history_service } from './HistoryService';
export { create_transform_service } from './TransformService';
export { create_actions_service } from './ActionsService';
export { create_hierarchy_service } from './HierarchyService';

// Keybindings
export {
    create_keybindings_service,
    type Keybinding,
    type KeybindingContext,
    type KeybindingsServiceParams,
    type IKeybindingsService,
} from './KeybindingsService';

// EventBus Bridge
export {
    create_event_bus_bridge,
    type EventBusBridgeParams,
    type IEventBusBridge,
} from './EventBusBridge';
