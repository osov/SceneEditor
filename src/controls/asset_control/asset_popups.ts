// Модуль попапов и контекстного меню

import { AssetType, SCENE_EXT, FONT_EXT, model_ext, texture_ext } from '../../modules_editor/modules_editor_const';
import { contextMenuItem, get_contextmenu } from '../../modules_editor/ContextMenu';
import { NodeAction } from '@editor/shared';
import { get_client_api } from '../../modules_editor/ClientAPI';
import { error_popup } from '../../render_engine/helpers/utils';
import { Services } from '@editor/core';
import { get_popups } from '../../modules_editor/Popups';
import { MoveType, RemoveType, type AssetControlState } from './types';
import type { FileOperations } from './file_operations';
import type { SceneOperations } from './scene_operations';
import type { IBaseEntityData } from '../../render_engine/types';
import type { PointerEventData } from '@editor/core/services/InputService';

/** Утилита для экранирования HTML */
function escapeHTML(text: string): string {
    return text.replace(/\&/g, '&amp;').replace(/\</g, '&lt;').replace(/\>/g, '&gt;');
}

/** Получить расширение файла */
function getFileExt(path: string): string {
    const ar = path.split('.');
    return ar[ar.length - 1];
}

/** Фабрика для создания менеджера попапов и меню */
export function create_asset_popups(
    state: AssetControlState,
    file_ops: FileOperations,
    scene_ops: SceneOperations,
    go_to_dir: (path: string, renew?: boolean) => Promise<void>
) {
    function open_menu(event: PointerEventData) {
        const assets_menu_list = toggle_menu_options();
        get_contextmenu().open(assets_menu_list, event, menuContextClick);
    }

    function toggle_menu_options(): contextMenuItem[] {
        const type = state.active_asset?.getAttribute('data-type');
        const assets_menu_list: contextMenuItem[] = [];
        if (!type) {
            assets_menu_list.push({ text: 'Обновить', action: NodeAction.refresh });
            assets_menu_list.push({ text: 'Показать', action: NodeAction.open_in_explorer });
            if (state.move_assets_data.assets.length)
                assets_menu_list.push({ text: 'Вставить', action: NodeAction.CTRL_V });
            assets_menu_list.push({
                text: '+ материал', children: [
                    { text: 'Базовый', action: NodeAction.material_base },
                ]
            });
            assets_menu_list.push({ text: 'Создать папку', action: NodeAction.new_folder });
            assets_menu_list.push({ text: 'Создать сцену', action: NodeAction.new_scene });
        }
        if (state.selected_assets.length === 1) {
            assets_menu_list.push({ text: 'Копировать', action: NodeAction.CTRL_C });
            assets_menu_list.push({ text: 'Вырезать', action: NodeAction.CTRL_X });
            assets_menu_list.push({ text: 'Дублировать', action: NodeAction.CTRL_D });
        } else if (state.selected_assets.length > 1) {
            assets_menu_list.push({ text: 'Копир. выделенные', action: NodeAction.CTRL_C });
            assets_menu_list.push({ text: 'Вырез. выделенные', action: NodeAction.CTRL_X });
            assets_menu_list.push({ text: 'Дублир. выделенные', action: NodeAction.CTRL_D });
        }

        if (type && type !== 'folder') {
            assets_menu_list.push({ text: 'Скачать', action: NodeAction.download });
        }
        if (type) {
            assets_menu_list.push({ text: 'Переименовать', action: NodeAction.rename });
        }
        if (state.selected_assets.length === 1) {
            assets_menu_list.push({ text: 'Удалить', action: NodeAction.remove });
        } else if (state.selected_assets.length > 1) {
            assets_menu_list.push({ text: 'Удал. выделенные', action: NodeAction.remove });
        }
        return assets_menu_list;
    }

    async function menuContextClick(success: boolean, action?: number | string): Promise<void> {
        if (!success || action === undefined || action === null || state.current_dir === undefined) return;
        if (action === NodeAction.refresh) {
            await go_to_dir(state.current_dir, true);
        }
        if (action === NodeAction.open_in_explorer) {
            await get_client_api().open_explorer(state.current_dir);
        }
        if (action === NodeAction.material_base) {
            // open_material_popup(asset_path);
        }
        if (action === NodeAction.new_folder) {
            new_folder_popup(state.current_dir);
        }
        if (action === NodeAction.new_scene) {
            new_scene_popup(state.current_dir);
        }
        if (state.active_asset) {
            const path = state.active_asset.getAttribute('data-path') as string;
            const name = escapeHTML(state.active_asset.getAttribute('data-name') as string);
            const type = state.active_asset.getAttribute('data-type') as AssetType | undefined;
            if (action === NodeAction.download) file_ops.download_asset(path, name);

            if (action === NodeAction.rename) {
                rename_popup(path, name, type);
            }
        }
        if (state.selected_assets.length > 0) {
            if (action === NodeAction.remove) {
                remove_popup();
            }
            if (action === NodeAction.CTRL_X) {
                state.move_assets_data.assets = state.selected_assets.slice();
                state.move_assets_data.move_type = MoveType.MOVE;
                Services.logger.debug('cut assets, amount = ', state.move_assets_data.assets.length);
            }
            if (action === NodeAction.CTRL_C) {
                state.move_assets_data.assets = state.selected_assets.slice();
                state.move_assets_data.move_type = MoveType.COPY;
                Services.logger.debug('copy assets, amount = ', state.move_assets_data.assets.length);
            }
            if (action === NodeAction.CTRL_D) {
                for (const element of state.selected_assets) {
                    const path = element.getAttribute('data-path') as string;
                    const name = escapeHTML(element.getAttribute('data-name') as string);
                    await file_ops.duplicate_asset(path, name);
                }
                await go_to_dir(state.current_dir ? state.current_dir : '', true);
            }
        }
        if (state.move_assets_data.assets.length > 0) {
            if (action === NodeAction.CTRL_V) {
                await file_ops.paste_assets();
            }
        }
    }

    function new_folder_popup(current_path: string) {
        get_popups().open({
            type: 'Rename',
            params: { title: 'Новая папка:', button: 'Ok', auto_close: true },
            callback: async (success, name) => {
                if (success && name) {
                    const r = await get_client_api().new_folder(current_path, name);
                    if (r.result === 0)
                        error_popup(`Не удалось создать папку, ответ сервера: ${r.message}`);
                    if (r.result && r.data) {
                        await go_to_dir(current_path, true);
                    }
                }
            }
        });
    }

    function new_scene_popup(current_path: string, set_scene_current = false, save_scene = false) {
        get_popups().open({
            type: 'Rename',
            params: { title: 'Новая сцена:', button: 'Ok', auto_close: true },
            callback: async (success, name) => {
                if (success && name) {
                    const scene_path = await scene_ops.new_scene(current_path, name);
                    if (set_scene_current) {
                        if (scene_path === undefined) {
                            get_popups().toast.error('Не удалось создать сцену, путь undefined');
                            return;
                        }
                        const scene_is_set = await scene_ops.set_current_scene(scene_path);
                        if (scene_is_set && save_scene)
                            scene_ops.save_current_scene(new_scene_popup);
                    }
                }
            }
        });
    }

    function save_graph_popup(current_path: string, data: IBaseEntityData) {
        const currentName = data.name;
        get_popups().open({
            type: 'Rename',
            params: { title: 'Сохранить элемент сцены:', button: 'Ok', currentName, auto_close: true },
            callback: async (success, name) => {
                if (success && name) {
                    const path = `${current_path}/${name}.${SCENE_EXT}`;
                    Services.resources.cache_scene(path, data);
                    // NOTE: для чего сохраняем как IBaseEntityData[] ?
                    const r = await get_client_api().save_data(path, JSON.stringify({ scene_data: [data] }));
                    if (r && r.result)
                        return get_popups().toast.success(`Объект ${name} сохранён, путь: ${path}`);
                    else
                        return get_popups().toast.error(`Не удалось сохранить объект ${name}`);
                }
                return get_popups().toast.error(`Не удалось сохранить объект ${name}`);
            }
        });
    }

    function rename_popup(asset_path: string, name: string, type?: AssetType) {
        let type_name = 'файл';
        if (type === 'folder') type_name = 'папку';
        get_popups().open({
            type: 'Rename',
            params: { title: `Переименовать ${type_name} ${name}`, button: 'Ok', currentName: name, auto_close: true },
            callback: async (success, name) => {
                if (success && name) {
                    const new_path = state.current_dir ? `${state.current_dir}/${name}` : name;
                    const r = await get_client_api().rename(asset_path, new_path);
                    if (r.result === 0)
                        error_popup(`Не удалось переименовать ${type_name}, ответ сервера: ${r.message}`);
                    if (r.result) {
                        const ext = getFileExt(name);
                        if (texture_ext.includes(ext)) {
                            Services.resources.preload_texture('/' + new_path);
                        }
                        if (model_ext.includes(ext)) {
                            Services.resources.preload_model('/' + new_path);
                        }
                        if (ext === FONT_EXT) {
                            Services.resources.preload_font('/' + new_path);
                        }
                        if (state.current_dir) await go_to_dir(state.current_dir, true);
                    }
                }
            }
        });
    }

    function remove_popup() {
        let title = '';
        let text = '';
        const name = state.active_asset?.getAttribute('data-name');
        const type = state.active_asset?.getAttribute('data-type');
        let remove_type: RemoveType | undefined = undefined;
        if (state.selected_assets.length > 1) {
            title = 'Удаление файлов';
            text = 'Удалить выбранные файлы?';
            remove_type = RemoveType.SELECTED;
        } else if (state.active_asset) {
            title = 'Удаление файла';
            let type_name = 'файл';
            if (type === 'folder') type_name = 'папку';
            text = `Удалить ${type_name} ${name}?`;
            remove_type = RemoveType.ACTIVE;
        }
        if (remove_type) {
            get_popups().open({
                type: 'Confirm',
                params: { title, text, button: 'Да', buttonNo: 'Нет', auto_close: true },
                callback: async (success) => {
                    if (success) {
                        await file_ops.remove_assets(remove_type);
                    }
                }
            });
        }
    }

    return {
        open_menu,
        toggle_menu_options,
        menuContextClick,
        new_folder_popup,
        new_scene_popup,
        save_graph_popup,
        rename_popup,
        remove_popup,
    };
}

export type AssetPopups = ReturnType<typeof create_asset_popups>;
