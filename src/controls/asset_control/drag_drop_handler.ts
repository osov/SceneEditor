// Модуль Drag & Drop и загрузки файлов

import { FILE_UPLOAD_CMD, ServerResponses, URL_PATHS } from '../../modules_editor/modules_editor_const';
import { api, get_client_api } from '../../modules_editor/ClientAPI';
import { json_parsable } from '../../modules/utils';
import { error_popup } from '../../render_engine/helpers/utils';
import { Services } from '@editor/core';
import type { AssetControlState } from './types';

/** Фабрика для создания обработчика drag & drop */
export function create_drag_drop_handler(
    state: AssetControlState,
    go_to_dir: (path: string, renew?: boolean) => Promise<void>
) {
    async function handle_asset_drop(dir_to: string) {
        state.drag_asset_now = false;
        if (state.selected_assets.length !== 0) {
            for (const element of state.selected_assets) {
                const asset_path = element.getAttribute('data-path') as string;
                const name = element.getAttribute('data-name') as string;
                const move_to = `${dir_to}/${name}`;
                const r = await get_client_api().move(asset_path, move_to);
                if (r && r.result === 1) {
                    // Обновляем текущую папку, чтобы отобразить изменившееся число файлов
                    await go_to_dir(state.current_dir as string, true);
                } else {
                    error_popup(`Не удалось переместить файл ${name}, ответ сервера: ${r.message}`);
                }
            }
        }
    }

    async function on_file_upload(resp: Response) {
        const resp_text = await resp.text();
        if (!json_parsable(resp_text)) return;
        const resp_json = JSON.parse(resp_text) as ServerResponses[typeof FILE_UPLOAD_CMD];
        if (resp_json.result === 1 && resp_json.data) {
            const data = resp_json.data;
            Services.event_bus.emit('assets:file_uploaded', data);
        }
    }

    async function on_drop_upload(event: DragEvent) {
        state.drag_for_upload_now = false;
        if (state.current_project === undefined || state.current_dir === undefined) {
            Services.logger.warn('Попытка загрузить файл на сервер, но никакой проект не загружен');
            return;
        }
        if (event.dataTransfer !== null) {
            const files = Array.from(event.dataTransfer.files);
            if (files.length > 0) {
                await upload_files(files);
            }
        }
    }

    async function upload_files(files: File[]) {
        for (const file of files) {
            const data = new FormData();
            Services.logger.debug(`trying upload a file: ${file.name} in dir ${state.current_dir}`);
            data.append('file', file, file.name);
            data.append('path', state.current_dir as string);
            const resp = await api.POST(URL_PATHS.UPLOAD, [], data);
            if (resp) await on_file_upload(resp);
        }
    }

    function setup_drag_listeners() {
        state.drop_zone.addEventListener('dragenter', function (e) {
            e.preventDefault();
            state.drag_for_upload_now = true;
        });

        state.filemanager.addEventListener('dragover', function (e) {
            e.preventDefault();
            if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
        });

        state.drop_zone.addEventListener('dragleave', function (e) {
            e.preventDefault();
        });

        state.drop_zone.addEventListener('drop', async function (e) {
            e.preventDefault();
            if (state.drag_for_upload_now) await on_drop_upload(e);
        });
    }

    return {
        handle_asset_drop,
        on_drop_upload,
        upload_files,
        on_file_upload,
        setup_drag_listeners,
    };
}

export type DragDropHandler = ReturnType<typeof create_drag_drop_handler>;
