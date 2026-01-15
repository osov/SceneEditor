/**
 * UIService - сервис координации UI
 *
 * Координирует обновления между панелями редактора:
 * - Инспектор - отображение свойств выделенных объектов
 * - Иерархия - дерево объектов сцены
 * - Toolbar - кнопки режимов трансформации
 *
 * Слушает события от DI сервисов и обновляет UI через legacy модули.
 */

import type { IDisposable, ILogger, IEventBus } from '../core/di/types';
import type { ISelectionService, IHierarchyService } from './types';
import type { ISceneObject } from '../engine/types';
import { get_control_manager, type ControlManagerType } from '../modules_editor/ControlManager';
import { get_inspector_control as get_inspector_control_import, type InspectorControlType } from '../modules_editor/InspectorControl';

/** Параметры сервиса */
export interface UIServiceParams {
    logger: ILogger;
    event_bus: IEventBus;
    selection_service: ISelectionService;
    hierarchy_service: IHierarchyService;
}

/** Интерфейс сервиса */
export interface IUIService extends IDisposable {
    /** Инициализировать UI */
    init(): void;
    /** Обновить инспектор для выделенных объектов */
    update_inspector(objects: ISceneObject[]): void;
    /** Обновить дерево иерархии */
    update_hierarchy(): void;
    /** Показать/скрыть панель */
    toggle_panel(panel: 'inspector' | 'hierarchy' | 'assets'): void;
    /** Обновить режим трансформации в toolbar */
    update_transform_mode(mode: string): void;
}

/** Получить InspectorControl безопасно */
function try_get_inspector_control(): InspectorControlType | undefined {
    try {
        return get_inspector_control_import();
    } catch {
        return undefined;
    }
}

/** Получить ControlManager безопасно */
function try_get_control_manager(): ControlManagerType | undefined {
    try {
        return get_control_manager();
    } catch {
        return undefined;
    }
}

/** Создать UIService */
export function create_ui_service(params: UIServiceParams): IUIService {
    const { logger, event_bus, selection_service: _selection_service, hierarchy_service: _hierarchy_service } = params;

    const subscriptions: IDisposable[] = [];

    function init(): void {
        logger.debug('Инициализация UIService...');

        // Подписка на изменение выделения
        subscriptions.push(
            event_bus.on('selection:changed', (data) => {
                const typed = data as { selected: ISceneObject[] };
                update_inspector(typed.selected);
            })
        );

        // Подписка на очистку выделения
        subscriptions.push(
            event_bus.on('selection:cleared', () => {
                update_inspector([]);
            })
        );

        // Подписка на обновление иерархии
        subscriptions.push(
            event_bus.on('hierarchy:refresh_requested', () => {
                update_hierarchy();
            })
        );

        // Подписка на добавление/удаление объектов
        subscriptions.push(
            event_bus.on('scene:object_added', () => {
                update_hierarchy();
            })
        );

        subscriptions.push(
            event_bus.on('scene:object_removed', () => {
                update_hierarchy();
            })
        );

        // Подписка на изменение режима трансформации
        subscriptions.push(
            event_bus.on('transform:mode_changed', (data) => {
                const typed = data as { mode: string };
                update_transform_mode(typed.mode);
            })
        );

        logger.info('UIService инициализирован');
    }

    function update_inspector(objects: ISceneObject[]): void {
        const inspector = try_get_inspector_control();
        if (inspector === undefined) {
            logger.debug('InspectorControl не доступен');
            return;
        }

        try {
            // InspectorControl.set_selected_list() обновляет инспектор
            inspector.set_selected_list(objects as unknown as import('../render_engine/types').IBaseMeshAndThree[]);
        } catch (error) {
            logger.debug('Ошибка обновления инспектора:', error);
        }
    }

    function update_hierarchy(): void {
        const control_manager = try_get_control_manager();
        if (control_manager === undefined) {
            logger.debug('ControlManager не доступен');
            return;
        }

        try {
            // ControlManager.update_graph() обновляет дерево
            control_manager.update_graph();
        } catch (error) {
            logger.debug('Ошибка обновления иерархии:', error);
        }
    }

    function toggle_panel(panel: 'inspector' | 'hierarchy' | 'assets'): void {
        const panel_map: Record<string, string> = {
            inspector: '.inspector',
            hierarchy: '#wr_tree',
            assets: '.assets',
        };

        const selector = panel_map[panel];
        if (selector === undefined) return;

        const element = document.querySelector(selector) as HTMLElement | null;
        if (element !== null) {
            const is_hidden = element.style.display === 'none';
            element.style.display = is_hidden ? '' : 'none';
            logger.debug(`Панель ${panel} ${is_hidden ? 'показана' : 'скрыта'}`);
        }
    }

    function update_transform_mode(mode: string): void {
        const control_manager = try_get_control_manager();
        if (control_manager === undefined) return;

        try {
            // Преобразуем имя режима в имя кнопки
            const button_map: Record<string, string> = {
                translate: 'translate_transform_btn',
                rotate: 'rotate_transform_btn',
                scale: 'scale_transform_btn',
                size: 'size_transform_btn',
            };

            const button_name = button_map[mode];
            if (button_name !== undefined) {
                control_manager.set_active_control(button_name as 'translate_transform_btn' | 'rotate_transform_btn' | 'scale_transform_btn' | 'size_transform_btn');
            }
        } catch (error) {
            logger.debug('Ошибка обновления режима трансформации:', error);
        }
    }

    function dispose(): void {
        for (const sub of subscriptions) {
            sub.dispose();
        }
        subscriptions.length = 0;
        logger.info('UIService освобождён');
    }

    return {
        init,
        update_inspector,
        update_hierarchy,
        toggle_panel,
        update_transform_mode,
        dispose,
    };
}
