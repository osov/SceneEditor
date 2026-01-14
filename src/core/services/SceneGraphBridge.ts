/**
 * Мост между legacy TreeControl и новым SceneGraphService
 *
 * Обеспечивает двустороннюю синхронизацию между системами:
 * - TreeControl → SceneGraphService (через EventBus)
 * - SceneGraphService → другие компоненты (через callbacks)
 *
 * Этот модуль позволяет постепенно мигрировать на новую архитектуру
 * без переписывания всего TreeControl сразу.
 */

import type { ILogger } from '../di/types';
import type { ISceneGraphService, SceneGraphItem } from './SceneGraphService';

/** Параметры bridge */
export interface SceneGraphBridgeParams {
    scene_graph_service: ISceneGraphService;
    logger?: ILogger;
}

/** Интерфейс bridge */
export interface ISceneGraphBridge {
    /** Инициализировать подписки на EventBus */
    init(): void;
    /** Отключить все подписки */
    dispose(): void;
    /** Проверить, инициализирован ли bridge */
    is_initialized(): boolean;
}

/** Интерфейс legacy EventBus */
interface LegacyEventBus {
    on(event: string, callback: (...args: unknown[]) => void): void;
    off(event: string, callback: (...args: unknown[]) => void): void;
    trigger(event: string, data?: unknown): void;
}

/** Item из TreeControl */
interface TreeItem {
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

/**
 * Создаёт bridge между TreeControl и SceneGraphService
 */
export function create_scene_graph_bridge(params: SceneGraphBridgeParams): ISceneGraphBridge {
    const { scene_graph_service, logger } = params;

    let _initialized = false;
    const _subscriptions: Array<() => void> = [];

    /** Получить глобальный EventBus */
    function get_event_bus(): LegacyEventBus | undefined {
        const global_obj = globalThis as unknown as { EventBus?: LegacyEventBus };
        return global_obj.EventBus;
    }

    /** Преобразовать TreeItem в SceneGraphItem */
    function convert_tree_item(item: TreeItem): SceneGraphItem {
        return {
            id: item.id,
            pid: item.pid,
            name: item.name,
            type: item.icon,
            active: item.visible,
            visible: item.visible,
            draggable: item.no_drag !== true,
            droppable: item.no_drop !== true,
            renamable: item.no_rename !== true,
            removable: item.no_remove !== true,
        };
    }

    /** Обработчик события SYS_GRAPH_SELECTED */
    function on_graph_selected(data: { list: number[] }) {
        logger?.debug('Bridge: получено SYS_GRAPH_SELECTED', data);
        scene_graph_service.set_selected(data.list);
    }

    /** Обработчик события SYS_TREE_DRAW_GRAPH (когда TreeControl рисует дерево) */
    function on_tree_draw(data: { list: TreeItem[] }) {
        logger?.debug('Bridge: получено SYS_TREE_DRAW_GRAPH', { count: data.list?.length });
        if (data.list !== undefined) {
            const items = data.list.map(convert_tree_item);
            scene_graph_service.set_items(items);
        }
    }

    /** Подписаться на EventBus событие */
    function subscribe_event(event: string, callback: (data: unknown) => void) {
        const event_bus = get_event_bus();
        if (event_bus === undefined) {
            logger?.warn('Bridge: EventBus не найден');
            return;
        }

        event_bus.on(event, callback);
        _subscriptions.push(() => event_bus.off(event, callback));
        logger?.debug(`Bridge: подписан на ${event}`);
    }

    /** Инициализировать подписки */
    function init() {
        if (_initialized) {
            logger?.warn('Bridge: уже инициализирован');
            return;
        }

        const event_bus = get_event_bus();
        if (event_bus === undefined) {
            logger?.error('Bridge: EventBus не доступен, инициализация отложена');
            // Повторим попытку через 100мс
            setTimeout(init, 100);
            return;
        }

        // Подписываемся на события TreeControl
        subscribe_event('SYS_GRAPH_SELECTED', on_graph_selected as (data: unknown) => void);
        subscribe_event('SYS_TREE_DRAW_GRAPH', on_tree_draw as (data: unknown) => void);

        // Подписываемся на события SceneGraphService и транслируем их в EventBus
        const unsubscribe_selection = scene_graph_service.on_selection_changed((event) => {
            logger?.debug('Bridge: SceneGraphService selection changed', event);
            // Не триггерим SYS_GRAPH_SELECTED чтобы избежать цикла
            // Вместо этого триггерим специальное событие для новых компонентов
            event_bus.trigger('SYS_SCENE_GRAPH_SELECTION_CHANGED', {
                selected: event.selected,
                previous: event.previous,
            });
        });
        _subscriptions.push(unsubscribe_selection);

        const unsubscribe_graph = scene_graph_service.on_graph_changed((event) => {
            logger?.debug('Bridge: SceneGraphService graph changed', event);
            event_bus.trigger('SYS_SCENE_GRAPH_CHANGED', {
                added: event.added,
                removed: event.removed,
                modified: event.modified,
            });
        });
        _subscriptions.push(unsubscribe_graph);

        _initialized = true;
        logger?.info('Bridge: инициализирован');
    }

    /** Отключить все подписки */
    function dispose() {
        for (const unsubscribe of _subscriptions) {
            unsubscribe();
        }
        _subscriptions.length = 0;
        _initialized = false;
        logger?.info('Bridge: отключён');
    }

    /** Проверить статус инициализации */
    function is_initialized(): boolean {
        return _initialized;
    }

    return {
        init,
        dispose,
        is_initialized,
    };
}
