/**
 * EventBusBridge - транслятор имён событий
 *
 * Обеспечивает двунаправленную трансляцию событий между:
 * - Legacy именами (SYS_*) для обратной совместимости
 * - Новыми именами (namespace:event)
 *
 * Позволяет постепенно мигрировать компоненты на новую архитектуру,
 * при этом все события проходят через единый EventBus из DI системы.
 */

import type { ILogger, IEventBus, IDisposable } from '../core/di/types';

/** Параметры моста */
export interface EventBusBridgeParams {
    logger: ILogger;
    new_event_bus: IEventBus;
}

/** Маппинг событий legacy → new */
const LEGACY_TO_NEW_EVENTS: Record<string, string> = {
    // Выделение
    // ВАЖНО: НЕ маппим SYS_SELECTED_MESH_LIST → selection:changed,
    // т.к. selection:changed → SYS_SELECTED_MESH_LIST создаст цикл.
    // SelectionService уже эмитит selection:changed напрямую.
    'SYS_CLEAR_SELECT_MESH_LIST': 'selection:cleared',
    'SYS_UNSELECTED_MESH_LIST': 'selection:cleared',

    // Граф сцены
    'SYS_GRAPH_SELECTED': 'hierarchy:selected',
    'SYS_GRAPH_ADD': 'scene:object_added',
    'SYS_GRAPH_REMOVE': 'scene:object_removed',
    'SYS_GRAPH_MOVED_TO': 'hierarchy:moved',
    'SYS_GRAPH_CHANGE_NAME': 'hierarchy:renamed',
    'SYS_GRAPH_VISIBLE': 'hierarchy:visibility_changed',
    'SYS_TREE_DRAW_GRAPH': 'hierarchy:refresh_requested',

    // История
    'SYS_INPUT_UNDO': 'history:undo_requested',
    'SYS_HISTORY_UNDO': 'history:undone',
    'SYS_HISTORY_PUSH': 'history:pushed',

    // Сохранение
    'SYS_INPUT_SAVE': 'scene:save_requested',

    // Трансформация
    'SYS_MESH_TRANSLATE': 'transform:translate',
    'SYS_MESH_ROTATE': 'transform:rotate',
    'SYS_MESH_SCALE': 'transform:scale',

    // Ассеты
    'SYS_CLICK_ON_ASSET': 'assets:clicked',
    'SYS_ASSETS_SELECTED_TEXTURES': 'assets:textures_selected',
    'SYS_ASSETS_SELECTED_MATERIALS': 'assets:materials_selected',
    'SYS_CHANGED_ATLAS_DATA': 'assets:atlas_changed',
    'SYS_CHANGED_LAYER_DATA': 'assets:layer_changed',

    // Инспектор
    'SYS_INSPECTOR_UPDATE': 'inspector:update_requested',
    'SYS_INSPECTOR_REFRESH': 'inspector:refresh_requested',

    // UI
    'SYS_VIEW_INPUT_KEY_DOWN': 'ui:key_down',
    'SYS_VIEW_INPUT_KEY_UP': 'ui:key_up',
    'SYS_VIEW_INPUT_MOUSE_DOWN': 'ui:mouse_down',
    'SYS_VIEW_INPUT_MOUSE_UP': 'ui:mouse_up',

    // Контролы
    'SYS_TRANSFORM_STARTED': 'controls:transform_started',
    'SYS_TRANSFORM_ENDED': 'controls:transform_ended',
};

/** Маппинг событий new → legacy */
const NEW_TO_LEGACY_EVENTS: Record<string, string> = {
    // Выделение
    'selection:changed': 'SYS_SELECTED_MESH_LIST',
    'selection:cleared': 'SYS_CLEAR_SELECT_MESH_LIST',

    // Трансформация
    'transform:mode_changed': 'SYS_TRANSFORM_MODE_CHANGED',
    'transform:space_changed': 'SYS_TRANSFORM_SPACE_CHANGED',

    // История
    'history:pushed': 'SYS_HISTORY_PUSH',
    'history:undo_requested': 'SYS_INPUT_UNDO',

    // Иерархия
    'hierarchy:moved': 'SYS_MESH_MOVED_TO',
    'hierarchy:refresh_requested': 'SYS_TREE_DRAW_GRAPH',

    // Сцена
    'scene:save_requested': 'SYS_INPUT_SAVE',
    'scene:object_added': 'SYS_GRAPH_ADD',
    'scene:object_removed': 'SYS_GRAPH_REMOVE',

    // Цикл рендеринга (для CameraControl и др.)
    'engine:update': 'SYS_ON_UPDATE',
    'engine:update_end': 'SYS_ON_UPDATE_END',

    // Инспектор
    'inspector:update_requested': 'SYS_INSPECTOR_UPDATE',
    'inspector:refresh_requested': 'SYS_INSPECTOR_REFRESH',

    // Ассеты
    'assets:atlas_changed': 'SYS_CHANGED_ATLAS_DATA',
    'assets:layer_changed': 'SYS_CHANGED_LAYER_DATA',
};

/** Интерфейс моста */
export interface IEventBusBridge extends IDisposable {
    /** Запустить мост */
    start(): void;
    /** Остановить мост */
    stop(): void;
    /** Проверить активен ли мост */
    is_active(): boolean;
    /** Добавить маппинг legacy → new */
    add_legacy_mapping(legacy_event: string, new_event: string): void;
    /** Добавить маппинг new → legacy */
    add_new_mapping(new_event: string, legacy_event: string): void;
}

/** Создать мост EventBus */
export function create_event_bus_bridge(params: EventBusBridgeParams): IEventBusBridge {
    const { logger, new_event_bus } = params;

    let is_running = false;
    const subscriptions: IDisposable[] = [];

    // Копии маппингов для возможности расширения
    const legacy_to_new = { ...LEGACY_TO_NEW_EVENTS };
    const new_to_legacy = { ...NEW_TO_LEGACY_EVENTS };

    // Защита от рекурсии: отслеживаем события, которые сейчас в процессе трансляции
    const events_in_flight = new Set<string>();

    // События, которые не нужно логировать (слишком частые)
    const SILENT_EVENTS = new Set(['engine:update', 'engine:update_end', 'SYS_ON_UPDATE', 'SYS_ON_UPDATE_END']);

    /** Подписаться на legacy-именованные события и транслировать в новые */
    function subscribe_legacy_to_new(): void {
        for (const [legacy_event, new_event] of Object.entries(legacy_to_new)) {
            const subscription = new_event_bus.on(legacy_event, (data) => {
                const bridge_key = `l2n:${legacy_event}`;
                if (events_in_flight.has(bridge_key)) {
                    return;
                }

                events_in_flight.add(bridge_key);
                try {
                    if (!SILENT_EVENTS.has(legacy_event)) {
                        logger.debug(`[Bridge] ${legacy_event} → ${new_event}`);
                    }
                    new_event_bus.emit(new_event, transform_legacy_data(legacy_event, data));
                } finally {
                    events_in_flight.delete(bridge_key);
                }
            });
            subscriptions.push(subscription);
        }
    }

    /** Подписаться на новые события и транслировать в legacy-именованные */
    function subscribe_new_to_legacy(): void {
        for (const [new_event, legacy_event] of Object.entries(new_to_legacy)) {
            const subscription = new_event_bus.on(new_event, (data) => {
                const bridge_key = `n2l:${new_event}`;
                if (events_in_flight.has(bridge_key)) {
                    return;
                }

                events_in_flight.add(bridge_key);
                try {
                    if (!SILENT_EVENTS.has(new_event)) {
                        logger.debug(`[Bridge] ${new_event} → ${legacy_event}`);
                    }
                    const transformed_data = transform_new_data(new_event, data);
                    new_event_bus.emit(legacy_event, transformed_data);
                } finally {
                    events_in_flight.delete(bridge_key);
                }
            });
            subscriptions.push(subscription);
        }
    }

    /** Трансформировать данные из legacy формата */
    function transform_legacy_data(event: string, data: unknown): unknown {
        switch (event) {
            case 'SYS_SELECTED_MESH_LIST': {
                const typed = data as { list: unknown[] };
                return { selected: typed.list };
            }
            case 'SYS_GRAPH_MOVED_TO': {
                const typed = data as { pid: number; next_id: number; id_mesh_list: number[] };
                return {
                    ids: typed.id_mesh_list,
                    parent_id: typed.pid,
                    next_id: typed.next_id,
                };
            }
            default:
                return data;
        }
    }

    /** Трансформировать данные в legacy формат */
    function transform_new_data(event: string, data: unknown): unknown {
        switch (event) {
            case 'selection:changed': {
                const typed = data as { selected: unknown[] };
                return { list: typed.selected };
            }
            default:
                return data;
        }
    }

    /** Отписаться от всех событий */
    function unsubscribe_all(): void {
        for (const sub of subscriptions) {
            sub.dispose();
        }
        subscriptions.length = 0;
    }

    function start(): void {
        if (is_running) {
            logger.warn('EventBusBridge уже запущен');
            return;
        }

        subscribe_legacy_to_new();
        subscribe_new_to_legacy();
        is_running = true;

        logger.info('EventBusBridge запущен');
    }

    function stop(): void {
        if (!is_running) return;

        unsubscribe_all();
        is_running = false;

        logger.info('EventBusBridge остановлен');
    }

    function is_active(): boolean {
        return is_running;
    }

    function add_legacy_mapping(legacy_event: string, new_event: string): void {
        legacy_to_new[legacy_event] = new_event;
        logger.debug(`Добавлен маппинг: ${legacy_event} → ${new_event}`);
    }

    function add_new_mapping(new_event: string, legacy_event: string): void {
        new_to_legacy[new_event] = legacy_event;
        logger.debug(`Добавлен маппинг: ${new_event} → ${legacy_event}`);
    }

    function dispose(): void {
        stop();
        logger.info('EventBusBridge освобождён');
    }

    return {
        start,
        stop,
        is_active,
        add_legacy_mapping,
        add_new_mapping,
        dispose,
    };
}
