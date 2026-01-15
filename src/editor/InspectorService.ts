/**
 * InspectorService - сервис инспектора свойств
 *
 * Управляет отображением и редактированием свойств объектов.
 * Использует FieldTypeRegistry для рендеринга полей через плагины.
 */

import type { IDisposable, ILogger, IEventBus } from '../core/di/types';
import type { IFieldTypeRegistry, ObjectData, PropertyData, PropertyType } from '../core/inspector/types';
import type { ISelectionService } from './types';
import type { ISceneObject } from '../engine/types';
import { get_inspector_control as get_inspector_control_import, type InspectorControlType } from '../modules_editor/InspectorControl';

/** Параметры сервиса */
export interface InspectorServiceParams {
    logger: ILogger;
    event_bus: IEventBus;
    selection_service: ISelectionService;
    field_registry?: IFieldTypeRegistry;
}

/** Провайдер полей для типа объекта */
export interface IFieldProvider {
    /** Уникальный ID провайдера */
    readonly id: string;
    /** Приоритет (выше = проверяется раньше) */
    readonly priority: number;
    /** Проверить, может ли провайдер обработать объект */
    can_handle(object: ISceneObject): boolean;
    /** Получить поля для объекта */
    get_fields(object: ISceneObject): PropertyData<PropertyType>[];
}

/** Интерфейс сервиса */
export interface IInspectorService extends IDisposable {
    /** Обновить инспектор для текущего выделения */
    update(): void;
    /** Обновить инспектор для указанных объектов */
    update_for_objects(objects: ISceneObject[]): void;
    /** Очистить инспектор */
    clear(): void;
    /** Обновить значения указанных полей */
    refresh_fields(field_keys: string[]): void;
    /** Зарегистрировать провайдер полей */
    register_field_provider(provider: IFieldProvider): IDisposable;
    /** Получить текущие данные инспектора */
    get_current_data(): ObjectData[];
    /** Проверить доступность FieldTypeRegistry */
    has_field_registry(): boolean;
}

/** Получить InspectorControl безопасно */
function try_get_inspector_control(): InspectorControlType | undefined {
    try {
        return get_inspector_control_import();
    } catch {
        return undefined;
    }
}

/** Создать InspectorService */
export function create_inspector_service(params: InspectorServiceParams): IInspectorService {
    const { logger, event_bus, selection_service, field_registry } = params;

    const subscriptions: IDisposable[] = [];
    const field_providers: IFieldProvider[] = [];
    let current_data: ObjectData[] = [];

    function init(): void {
        // Подписка на изменение выделения
        subscriptions.push(
            event_bus.on('selection:changed', () => {
                update();
            })
        );

        subscriptions.push(
            event_bus.on('selection:cleared', () => {
                clear();
            })
        );

        // Подписка на запрос обновления инспектора
        subscriptions.push(
            event_bus.on('inspector:update_requested', () => {
                update();
            })
        );

        subscriptions.push(
            event_bus.on('inspector:refresh_requested', (data) => {
                const typed = data as { fields?: string[] };
                if (typed.fields !== undefined) {
                    refresh_fields(typed.fields);
                }
            })
        );

        // Подписка на undo/redo для обновления инспектора
        subscriptions.push(
            event_bus.on('history:undo', () => {
                update();
            })
        );

        subscriptions.push(
            event_bus.on('history:redo', () => {
                update();
            })
        );

        logger.info('InspectorService инициализирован');
    }

    function update(): void {
        const selected = selection_service.selected;
        update_for_objects(selected);
    }

    function update_for_objects(objects: ISceneObject[]): void {
        if (objects.length === 0) {
            clear();
            return;
        }

        // Собираем данные для каждого объекта
        const data: ObjectData[] = [];

        for (const object of objects) {
            const fields = get_fields_for_object(object);
            data.push({
                id: object.mesh_data?.id ?? 0,
                fields,
            });
        }

        current_data = data;

        // Передаём данные в legacy InspectorControl
        const inspector = try_get_inspector_control();
        if (inspector !== undefined) {
            try {
                inspector.set_selected_list(objects);
            } catch (error) {
                logger.debug('Ошибка обновления InspectorControl:', error);
            }
        }

        event_bus.emit('inspector:updated', { objects, data });
        logger.debug(`Инспектор обновлён для ${objects.length} объектов`);
    }

    function get_fields_for_object(object: ISceneObject): PropertyData<PropertyType>[] {
        // Ищем провайдер, который может обработать объект
        // Сортируем по приоритету (высший сначала)
        const sorted_providers = [...field_providers].sort((a, b) => b.priority - a.priority);

        for (const provider of sorted_providers) {
            if (provider.can_handle(object)) {
                return provider.get_fields(object);
            }
        }

        // Если нет провайдера, возвращаем пустой список
        // Legacy InspectorControl сам определит поля
        return [];
    }

    function clear(): void {
        current_data = [];

        const inspector = try_get_inspector_control();
        if (inspector !== undefined) {
            try {
                inspector.clear();
            } catch (error) {
                logger.debug('Ошибка очистки InspectorControl:', error);
            }
        }

        event_bus.emit('inspector:cleared', {});
        logger.debug('Инспектор очищен');
    }

    function refresh_fields(field_keys: string[]): void {
        const inspector = try_get_inspector_control();
        if (inspector !== undefined) {
            try {
                inspector.refresh(field_keys);
            } catch (error) {
                logger.debug('Ошибка обновления полей:', error);
            }
        }

        logger.debug(`Обновлены поля: ${field_keys.join(', ')}`);
    }

    function register_field_provider(provider: IFieldProvider): IDisposable {
        field_providers.push(provider);
        logger.debug(`Зарегистрирован провайдер полей: ${provider.id}`);

        return {
            dispose: () => {
                const index = field_providers.indexOf(provider);
                if (index !== -1) {
                    field_providers.splice(index, 1);
                    logger.debug(`Удалён провайдер полей: ${provider.id}`);
                }
            },
        };
    }

    function get_current_data(): ObjectData[] {
        return current_data;
    }

    function has_field_registry(): boolean {
        return field_registry !== undefined;
    }

    function dispose(): void {
        for (const sub of subscriptions) {
            sub.dispose();
        }
        subscriptions.length = 0;
        field_providers.length = 0;
        current_data = [];
        logger.info('InspectorService освобождён');
    }

    // Инициализация
    init();

    return {
        update,
        update_for_objects,
        clear,
        refresh_fields,
        register_field_provider,
        get_current_data,
        has_field_registry,
        dispose,
    };
}
