/**
 * Модуль PropertyHistoryService
 * Реэкспорт всех публичных типов и функций
 */

// Типы
export type {
    HistoryType,
    IMeshResolver,
    PropertyHistoryServiceParams,
    IPropertyHistoryService,
    HistoryModuleDeps,
    IMeshWithAlpha,
    IMeshWithSlice,
} from './types';

// Основной сервис
export { create_property_history_service } from './PropertyHistoryService';

// Модули истории (для прямого использования если нужно)
export { create_transform_history } from './transform_history';
export { create_visual_history } from './visual_history';
export { create_state_history } from './state_history';
export { create_text_history } from './text_history';
export { create_model_history } from './model_history';
