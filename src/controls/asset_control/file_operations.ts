// Модуль файловых операций (CRUD)

import { DataFormatType, FSObject, FONT_EXT, model_ext, texture_ext, URL_PATHS } from '../../modules_editor/modules_editor_const';
import { api } from '../../modules_editor/ClientAPI';
import { error_popup } from '../../render_engine/helpers/utils';
import { Services } from '@editor/core';
import { MoveType, RemoveType, type AssetControlState } from './types';

/** Утилита для экранирования HTML */
function escapeHTML(text: string): string {
    return text.replace(/\&/g, '&amp;').replace(/\</g, '&lt;').replace(/\>/g, '&gt;');
}

/** Утилита для экранирования regex */
function escapeRegex(text: string): string {
    return text.replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&');
}

/** Получить расширение файла */
function getFileExt(path: string): string {
    const ar = path.split('.');
    return ar[ar.length - 1];
}

/** Фабрика для создания менеджера файловых операций */
export function create_file_operations(
    state: AssetControlState,
    go_to_dir: (path: string, renew?: boolean) => Promise<void>
) {
    async function download_asset(path: string, name: string) {
        const resp = await api.GET(`${URL_PATHS.ASSETS}/${path}`);
        if (!resp) return;
        const blob = await resp.blob();
        const fileURL = URL.createObjectURL(blob);
        const fileLink = document.createElement('a');
        fileLink.href = fileURL;
        fileLink.download = name;
        fileLink.click();
        URL.revokeObjectURL(fileURL);
    }

    async function remove_assets(remove_type: RemoveType) {
        const to_remove: string[] = [];
        if (remove_type === RemoveType.SELECTED) {
            state.selected_assets.forEach((elem) => {
                const path = elem.getAttribute('data-path');
                if (path) to_remove.push(path);
            });
        } else if (remove_type === RemoveType.ACTIVE) {
            const path = state.active_asset?.getAttribute('data-path');
            to_remove.push(path as string);
        }
        let result = true;
        for (const path of to_remove) {
            const r = await Services.client_api.remove(path);
            result = result && (r.result === 1);
        }
        if (!result) error_popup(`Некоторые файлы не удалось удалить`);
        await go_to_dir(state.current_dir ? state.current_dir : '', true);
    }

    async function paste_asset(name: string, path: string, move_type?: MoveType) {
        const move_to = state.current_dir ? `${state.current_dir as string}/${name}` : name;
        if (move_type === MoveType.MOVE) {
            const resp = await Services.client_api.move(path, move_to);
            if (resp && resp.result === 1) {
                Services.event_bus.emit('assets:moved', { name, path, new_path: move_to });
            } else if (resp.result === 0) {
                error_popup(`Не удалось переместить файл ${name}, ответ сервера: ${resp.message}`);
            }
        }
        if (move_type === MoveType.COPY) {
            const resp = await Services.client_api.copy(path, move_to);
            if (resp && resp.result === 1) {
                Services.event_bus.emit('assets:copied', { name, path, new_path: move_to });
            } else if (resp.result === 0) {
                error_popup(`Не удалось скопировать файл ${name}, ответ сервера: ${resp.message}`);
            }
        }
    }

    async function paste_assets() {
        const move_type = state.move_assets_data.move_type;
        for (const element of state.move_assets_data.assets) {
            const name = escapeHTML(element.getAttribute('data-name') as string);
            const path = escapeHTML(element.getAttribute('data-path') as string);
            await paste_asset(name, path, move_type);
        }
        state.move_assets_data.assets.splice(0);
        state.move_assets_data.move_type = undefined;
        await go_to_dir(state.current_dir ? state.current_dir : '', true);
    }

    async function duplicate_asset(path: string, name: string) {
        const ext = '.' + getFileExt(name);
        const base_name = name.replace(ext, '');
        const get_folder_resp = await Services.client_api.get_folder(state.current_dir as string);
        if (!get_folder_resp || get_folder_resp.result === 0) return;
        const folder_content = get_folder_resp.data as FSObject[];

        // Ищем максимальный номер среди существующих копий
        // Паттерн: "base_name (N).ext" или "base_name.ext"
        const copy_regex = new RegExp(String.raw`^${escapeRegex(base_name)}\s*\((\d+)\)$`);
        let max_number = 0;
        let has_original = false;

        folder_content.forEach(elem => {
            const elem_ext = '.' + getFileExt(elem.name);
            if (elem_ext !== ext) return;

            const elem_base_name = elem.name.replace(elem_ext, '');

            // Проверяем оригинальное имя
            if (elem_base_name === base_name) {
                has_original = true;
                return;
            }

            // Проверяем копии с номерами
            const match = elem_base_name.match(copy_regex);
            if (match !== null) {
                const num = parseInt(match[1], 10);
                if (num > max_number) {
                    max_number = num;
                }
            }
        });

        // Если есть оригинал или копии - берём следующий номер
        const next_number = has_original || max_number > 0 ? max_number + 1 : 0;
        const new_name = next_number > 0 ? `${base_name} (${next_number})${ext}` : name;
        const move_to = `${state.current_dir}/${new_name}`;

        const resp = await Services.client_api.copy(path, move_to);
        if (resp && resp.result === 1) {
            Services.event_bus.emit('assets:copied', { name, path, new_path: move_to });
        }
    }

    async function get_file_data(path: string): Promise<string | null> {
        const resp = await Services.client_api.get_data(path);
        if (!resp || resp.result === 0 || !resp.data) {
            Services.popups.toast.error(`Не удалось получить данные: ${resp.message}`);
            return null;
        }
        return resp.data;
    }

    function save_file_data(path: string, data: string, format: DataFormatType = 'string') {
        return Services.client_api.save_data(path, data, format);
    }

    function save_base64_img(path: string, data: string) {
        return Services.client_api.save_data(path, data, 'base64');
    }

    async function rename_file(asset_path: string, new_name: string) {
        const new_path = state.current_dir ? `${state.current_dir}/${new_name}` : new_name;
        const r = await Services.client_api.rename(asset_path, new_path);
        if (r.result === 0) {
            return { success: false, message: r.message };
        }

        const ext = getFileExt(new_name);
        if (texture_ext.includes(ext)) {
            Services.resources.preload_texture('/' + new_path);
        }
        if (model_ext.includes(ext)) {
            Services.resources.preload_model('/' + new_path);
        }
        if (ext === FONT_EXT) {
            Services.resources.preload_font('/' + new_path);
        }

        return { success: true, new_path };
    }

    return {
        download_asset,
        remove_assets,
        paste_asset,
        paste_assets,
        duplicate_asset,
        get_file_data,
        save_file_data,
        save_base64_img,
        rename_file,
        escapeHTML,
    };
}

export type FileOperations = ReturnType<typeof create_file_operations>;
