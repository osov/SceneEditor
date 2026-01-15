/**
 * Модуль контролов (legacy)
 *
 * Экспортирует типы и интерфейсы для контролов редактора.
 * SelectControl и HistoryControl удалены - используйте Services.selection и Services.history.
 */

// Типы и интерфейсы
export { TransformMode } from './types';

export type {
    IBaseMesh,
    TreeItemData,
    ITransformControl,
    ControlButton,
    IControlManager,
} from './types';
