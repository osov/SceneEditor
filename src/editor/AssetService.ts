/**
 * AssetService - сервис управления ассетами
 *
 * Централизованное управление загрузкой/сохранением сцен и файлов.
 * Делегирует к ClientAPI для сетевых операций и Services.scene для сериализации.
 */

import type { IDisposable, ILogger, IEventBus } from '../core/di/types';
import type { IBaseEntityData } from '../render_engine/types';
import { Services } from '@editor/core';

/** Параметры сервиса */
export interface AssetServiceParams {
    logger: ILogger;
    event_bus: IEventBus;
}

/** Результат операции */
export interface AssetOperationResult {
    success: boolean;
    error?: string;
}

/** Результат загрузки данных */
export interface AssetDataResult extends AssetOperationResult {
    data?: string;
}

/** Результат загрузки сцены */
export interface SceneLoadResult extends AssetOperationResult {
    scene_data?: IBaseEntityData[];
}

/** Интерфейс сервиса */
export interface IAssetService extends IDisposable {
    /** Загрузить сцену */
    load_scene(path: string): Promise<SceneLoadResult>;
    /** Сохранить сцену */
    save_scene(path: string): Promise<AssetOperationResult>;
    /** Получить данные файла */
    get_file_data(path: string): Promise<AssetDataResult>;
    /** Сохранить данные файла */
    save_file_data(path: string, data: string): Promise<AssetOperationResult>;
    /** Создать папку */
    create_folder(path: string, name: string): Promise<AssetOperationResult>;
    /** Удалить файл/папку */
    delete_path(path: string): Promise<AssetOperationResult>;
    /** Переименовать */
    rename(old_path: string, new_path: string): Promise<AssetOperationResult>;
    /** Копировать */
    copy(source: string, destination: string): Promise<AssetOperationResult>;
    /** Переместить */
    move(source: string, destination: string): Promise<AssetOperationResult>;
    /** Текущий путь сцены */
    readonly current_scene_path: string | undefined;
}

/** Получить ClientAPI из глобального scope */
function get_client_api(): typeof ClientAPI | undefined {
    return (globalThis as unknown as { ClientAPI?: typeof ClientAPI }).ClientAPI;
}


/** Создать AssetService */
export function create_asset_service(params: AssetServiceParams): IAssetService {
    const { logger, event_bus } = params;

    let _current_scene_path: string | undefined;

    async function load_scene(path: string): Promise<SceneLoadResult> {
        logger.debug(`Загрузка сцены: ${path}`);

        const client_api = get_client_api();
        if (client_api === undefined) {
            return { success: false, error: 'ClientAPI недоступен' };
        }

        try {
            const response = await client_api.get_data(path);
            if (response.result !== 1 || response.data === undefined) {
                return { success: false, error: response.error ?? 'Ошибка загрузки' };
            }

            const scene_data = JSON.parse(response.data) as IBaseEntityData[];

            Services.scene.load_scene(scene_data);

            _current_scene_path = path;

            event_bus.emit('asset:scene_loaded', { path, scene_data });
            logger.info(`Сцена загружена: ${path}`);

            return { success: true, scene_data };
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            logger.error(`Ошибка загрузки сцены: ${msg}`);
            return { success: false, error: msg };
        }
    }

    async function save_scene(path: string): Promise<AssetOperationResult> {
        logger.debug(`Сохранение сцены: ${path}`);

        const client_api = get_client_api();
        if (client_api === undefined) {
            return { success: false, error: 'ClientAPI недоступен' };
        }

        try {
            const scene_data = Services.scene.save_scene();
            const json_data = JSON.stringify(scene_data, null, 2);

            const response = await client_api.save_data(path, json_data);
            if (response.result !== 1) {
                return { success: false, error: response.error ?? 'Ошибка сохранения' };
            }

            _current_scene_path = path;

            event_bus.emit('asset:scene_saved', { path });
            logger.info(`Сцена сохранена: ${path}`);

            return { success: true };
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            logger.error(`Ошибка сохранения сцены: ${msg}`);
            return { success: false, error: msg };
        }
    }

    async function get_file_data(path: string): Promise<AssetDataResult> {
        logger.debug(`Чтение файла: ${path}`);

        const client_api = get_client_api();
        if (client_api === undefined) {
            return { success: false, error: 'ClientAPI недоступен' };
        }

        try {
            const response = await client_api.get_data(path);
            if (response.result !== 1 || response.data === undefined) {
                return { success: false, error: response.error ?? 'Ошибка чтения' };
            }

            return { success: true, data: response.data };
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            logger.error(`Ошибка чтения файла: ${msg}`);
            return { success: false, error: msg };
        }
    }

    async function save_file_data(path: string, data: string): Promise<AssetOperationResult> {
        logger.debug(`Сохранение файла: ${path}`);

        const client_api = get_client_api();
        if (client_api === undefined) {
            return { success: false, error: 'ClientAPI недоступен' };
        }

        try {
            const response = await client_api.save_data(path, data);
            if (response.result !== 1) {
                return { success: false, error: response.error ?? 'Ошибка сохранения' };
            }

            event_bus.emit('asset:file_saved', { path });
            return { success: true };
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            logger.error(`Ошибка сохранения файла: ${msg}`);
            return { success: false, error: msg };
        }
    }

    async function create_folder(path: string, name: string): Promise<AssetOperationResult> {
        logger.debug(`Создание папки: ${path}/${name}`);

        const client_api = get_client_api();
        if (client_api === undefined) {
            return { success: false, error: 'ClientAPI недоступен' };
        }

        try {
            const response = await client_api.new_folder(path, name);
            if (response.result !== 1) {
                return { success: false, error: response.error ?? 'Ошибка создания папки' };
            }

            event_bus.emit('asset:folder_created', { path: `${path}/${name}` });
            return { success: true };
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            logger.error(`Ошибка создания папки: ${msg}`);
            return { success: false, error: msg };
        }
    }

    async function delete_path(path: string): Promise<AssetOperationResult> {
        logger.debug(`Удаление: ${path}`);

        const client_api = get_client_api();
        if (client_api === undefined) {
            return { success: false, error: 'ClientAPI недоступен' };
        }

        try {
            const response = await client_api.remove(path);
            if (response.result !== 1) {
                return { success: false, error: response.error ?? 'Ошибка удаления' };
            }

            event_bus.emit('asset:deleted', { path });
            return { success: true };
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            logger.error(`Ошибка удаления: ${msg}`);
            return { success: false, error: msg };
        }
    }

    async function rename_asset(old_path: string, new_path: string): Promise<AssetOperationResult> {
        logger.debug(`Переименование: ${old_path} -> ${new_path}`);

        const client_api = get_client_api();
        if (client_api === undefined) {
            return { success: false, error: 'ClientAPI недоступен' };
        }

        try {
            const response = await client_api.rename(old_path, new_path);
            if (response.result !== 1) {
                return { success: false, error: response.error ?? 'Ошибка переименования' };
            }

            event_bus.emit('asset:renamed', { old_path, new_path });
            return { success: true };
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            logger.error(`Ошибка переименования: ${msg}`);
            return { success: false, error: msg };
        }
    }

    async function copy_asset(source: string, destination: string): Promise<AssetOperationResult> {
        logger.debug(`Копирование: ${source} -> ${destination}`);

        const client_api = get_client_api();
        if (client_api === undefined) {
            return { success: false, error: 'ClientAPI недоступен' };
        }

        try {
            const response = await client_api.copy(source, destination);
            if (response.result !== 1) {
                return { success: false, error: response.error ?? 'Ошибка копирования' };
            }

            event_bus.emit('asset:copied', { source, destination });
            return { success: true };
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            logger.error(`Ошибка копирования: ${msg}`);
            return { success: false, error: msg };
        }
    }

    async function move_asset(source: string, destination: string): Promise<AssetOperationResult> {
        logger.debug(`Перемещение: ${source} -> ${destination}`);

        const client_api = get_client_api();
        if (client_api === undefined) {
            return { success: false, error: 'ClientAPI недоступен' };
        }

        try {
            const response = await client_api.move(source, destination);
            if (response.result !== 1) {
                return { success: false, error: response.error ?? 'Ошибка перемещения' };
            }

            event_bus.emit('asset:moved', { source, destination });
            return { success: true };
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            logger.error(`Ошибка перемещения: ${msg}`);
            return { success: false, error: msg };
        }
    }

    function dispose(): void {
        _current_scene_path = undefined;
        logger.info('AssetService освобождён');
    }

    logger.info('AssetService создан');

    return {
        load_scene,
        save_scene,
        get_file_data,
        save_file_data,
        create_folder,
        delete_path,
        rename: rename_asset,
        copy: copy_asset,
        move: move_asset,
        get current_scene_path() {
            return _current_scene_path;
        },
        dispose,
    };
}
