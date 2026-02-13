/**
 * ResourceDialogService - сервис диалогов управления ресурсами
 *
 * Отвечает за:
 * - Открытие диалога управления атласами
 * - Открытие диалога управления слоями
 */

import { Action, type cbDataItem } from '../modules_editor/Popups';
import { Services } from '@editor/core';
import type { ILogger, IEventBus } from '@editor/core/di/types';

/** Интерфейс сервиса диалогов ресурсов */
export interface IResourceDialogService {
    /** Открыть менеджер атласов */
    open_atlas_manager(): void;
    /** Открыть менеджер слоёв */
    open_layer_manager(): void;
}

/** Интерфейс сервиса ресурсов */
interface IResourceService {
    get_all_atlases(): string[];
    add_atlas(name: string): void;
    del_atlas(name: string): void;
    get_layers(): string[];
    add_layer(name: string): void;
    remove_layer(name: string): void;
    write_metadata(): void;
}

/** Параметры создания сервиса */
export interface ResourceDialogServiceParams {
    logger: ILogger;
    event_bus: IEventBus;
    resources_service: IResourceService;
}

/** Создать ResourceDialogService */
export function create_resource_dialog_service(params: ResourceDialogServiceParams): IResourceDialogService {
    const { event_bus, resources_service } = params;

    /**
     * Открыть менеджер атласов
     */
    function open_atlas_manager(): void {
        const atlases = resources_service.get_all_atlases();

        // Удаляем пустой атлас из списка
        const empty_index = atlases.findIndex((atlas: string) => atlas === '');
        if (empty_index !== -1) {
            atlases.splice(empty_index, 1);
        }

        const list = atlases.map((title: string, id: number) => ({
            id: id.toString(),
            title,
            can_delete: true,
        }));

        Services.popups.open({
            type: 'Layers',
            params: {
                title: 'Atlas',
                button: 'Add',
                list,
            },
            callback: (success: boolean, data?: cbDataItem) => {
                if (!success) {
                    return;
                }

                switch (data?.action) {
                    case Action.ADD: {
                        const added_item = data.item;
                        resources_service.add_atlas(added_item.title);
                        resources_service.write_metadata();
                        break;
                    }
                    case Action.DELETE: {
                        const deleted_item = data.item;
                        resources_service.del_atlas(deleted_item.title);
                        resources_service.write_metadata();
                        break;
                    }
                }

                event_bus.emit('assets:atlas_changed', {});
            },
        });
    }

    /**
     * Открыть менеджер слоёв
     */
    function open_layer_manager(): void {
        const layers = resources_service.get_layers();

        // Отфильтровываем дефолтный слой
        const list = layers
            .filter((l: string) => l !== 'default')
            .map((title: string, id: number) => ({
                id: id.toString(),
                title,
                can_delete: true,
            }));

        Services.popups.open({
            type: 'Layers',
            params: {
                title: 'Layer',
                button: 'Add',
                list,
                with_index: true,
            },
            callback: (success: boolean, data?: cbDataItem) => {
                if (!success) {
                    return;
                }

                switch (data?.action) {
                    case Action.ADD: {
                        const added_item = data.item;
                        resources_service.add_layer(added_item.title);
                        resources_service.write_metadata();
                        break;
                    }
                    case Action.DELETE: {
                        const deleted_item = data.item;
                        resources_service.remove_layer(deleted_item.title);
                        resources_service.write_metadata();
                        break;
                    }
                }

                event_bus.emit('assets:layer_changed', {});
            },
        });
    }

    return {
        open_atlas_manager,
        open_layer_manager,
    };
}
