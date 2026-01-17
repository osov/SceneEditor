/**
 * InspectorHandlerAdapter - адаптер для интеграции handlers в InspectorControl
 *
 * Позволяет постепенно мигрировать InspectorControl на использование handlers.
 * Предоставляет централизованный интерфейс для чтения/записи свойств.
 */

import type { IBaseMeshAndThree } from '../../render_engine/types';
import { Property } from '../../core/inspector/IInspectable';
import { Services } from '@editor/core';
import {
    create_handler_registry,
    type IHandlerRegistry,
    type UpdateContext,
    type ReadContext,
    type ReadResult,
    type ChangeAxisInfo,
} from './handlers';
import {
    create_property_history_service,
    type IPropertyHistoryService,
} from './PropertyHistoryService';

/** Интерфейс адаптера */
export interface IInspectorHandlerAdapter {
    /** Прочитать значение свойства */
    read(property: Property, meshes: IBaseMeshAndThree[]): ReadResult<unknown>;

    /** Применить значение свойства */
    update(property: Property, meshes: IBaseMeshAndThree[], value: unknown, axis_info?: Partial<ChangeAxisInfo>): void;

    /** Сохранить свойство в историю перед изменением */
    save_to_history(property: Property, ids: number[]): void;

    /** Проверить поддерживается ли свойство handlers */
    is_supported(property: Property): boolean;

    /** Получить реестр handlers */
    get_registry(): IHandlerRegistry;

    /** Получить сервис истории */
    get_history_service(): IPropertyHistoryService;
}

/** Параметры создания адаптера */
export interface InspectorHandlerAdapterParams {
    /** Callback для получения mesh по id */
    get_mesh: (id: number) => IBaseMeshAndThree | undefined;
    /** Callback при изменении трансформации */
    on_transform_changed?: () => void;
    /** Callback при изменении размера */
    on_size_changed?: () => void;
    /** Callback при обновлении UI */
    on_update_ui?: () => void;
}

/** Создать адаптер для handlers */
export function create_inspector_handler_adapter(params: InspectorHandlerAdapterParams): IInspectorHandlerAdapter {
    const { get_mesh, on_transform_changed, on_size_changed, on_update_ui } = params;

    // Создаём реестр handlers с callbacks
    const registry = create_handler_registry({
        on_transform_changed: () => {
            Services.transform.set_proxy_in_average_point(Services.selection.selected as IBaseMeshAndThree[]);
            on_transform_changed?.();
        },
        on_size_changed: () => {
            Services.size.draw();
            on_size_changed?.();
        },
        on_update_ui: () => {
            Services.ui.update_hierarchy();
            on_update_ui?.();
        },
    });

    // Создаём сервис истории
    const history_service = create_property_history_service({
        mesh_resolver: {
            get_mesh,
        },
    });

    function read(property: Property, meshes: IBaseMeshAndThree[]): ReadResult<unknown> {
        const handler = registry.get_handler(property);
        if (handler === undefined) {
            return { value: undefined, values_by_id: new Map(), has_differences: false };
        }

        const context: ReadContext = { meshes };
        return handler.read(property, context);
    }

    function update(
        property: Property,
        meshes: IBaseMeshAndThree[],
        value: unknown,
        axis_info?: Partial<ChangeAxisInfo>
    ): void {
        const handler = registry.get_handler(property);
        if (handler === undefined) {
            Services.logger.warn(`[InspectorHandlerAdapter] No handler for property: ${property}`);
            return;
        }

        const ids = meshes.map(m => m.mesh_data.id);

        const full_axis_info: ChangeAxisInfo = {
            changed_x: axis_info?.changed_x ?? true,
            changed_y: axis_info?.changed_y ?? true,
            changed_z: axis_info?.changed_z ?? true,
            dragged_x: axis_info?.dragged_x ?? false,
            dragged_y: axis_info?.dragged_y ?? false,
            dragged_z: axis_info?.dragged_z ?? false,
        };

        const context: UpdateContext = {
            ids,
            meshes,
            value,
            axis_info: full_axis_info,
            is_last: true,
        };

        handler.update(property, context);
    }

    function save_to_history(property: Property, ids: number[]): void {
        history_service.save_by_property(property, ids);
    }

    function is_supported(property: Property): boolean {
        return registry.get_handler(property) !== undefined;
    }

    function get_registry(): IHandlerRegistry {
        return registry;
    }

    function get_history_service(): IPropertyHistoryService {
        return history_service;
    }

    return {
        read,
        update,
        save_to_history,
        is_supported,
        get_registry,
        get_history_service,
    };
}

/** Singleton instance */
let adapter_instance: IInspectorHandlerAdapter | undefined;

/** Получить singleton адаптер (требует предварительной инициализации) */
export function get_inspector_handler_adapter(): IInspectorHandlerAdapter {
    if (adapter_instance === undefined) {
        throw new Error('InspectorHandlerAdapter не инициализирован. Вызовите init_inspector_handler_adapter() сначала.');
    }
    return adapter_instance;
}

/** Инициализировать singleton адаптер */
export function init_inspector_handler_adapter(params: InspectorHandlerAdapterParams): IInspectorHandlerAdapter {
    adapter_instance = create_inspector_handler_adapter(params);
    return adapter_instance;
}

/** Проверить инициализирован ли адаптер */
export function is_inspector_handler_adapter_initialized(): boolean {
    return adapter_instance !== undefined;
}
