// TODO: [низкий приоритет] если перемещаем файл материала, то нужно обновить путь до него в ResourceManager
//   - При перемещении: обновить MaterialInfo.path
//   - При переименовании: изменить ключ в словаре materials + обновить path
//   - Требует добавления обработки в on_fs_events для .mtr файлов

import { IS_LOGGING, PROJECT_NAME, SERVER_URL, WS_RECONNECT_INTERVAL, WS_SERVER_URL } from '../config';
import {
    ASSET_MATERIAL, ASSET_SCENE_GRAPH, ASSET_TEXTURE, ASSET_AUDIO, AssetType,
    FONT_EXT, FSObject, LoadAtlasData, model_ext, ProjectLoadData, SCENE_EXT,
    TDictionary, texture_ext, URL_PATHS, AUDIO_EXT, FSEvent, ProtocolWrapper, NetMessagesEditor,
} from '../modules_editor/modules_editor_const';
import { span_elem, get_keys } from '../modules/utils';
import { get_client_api } from '../modules_editor/ClientAPI';
import { get_file_name } from '../render_engine/helpers/utils';
import { WsWrap } from '@editor/modules/ws_wrap';
import { Services } from '@editor/core';
import { get_popups } from '../modules_editor/Popups';

// Импорт модулей
import type { AssetControlState } from './asset_control/types';
import { create_asset_selection } from './asset_control/asset_selection';
import { create_file_operations } from './asset_control/file_operations';
import { create_scene_operations } from './asset_control/scene_operations';
import { create_drag_drop_handler } from './asset_control/drag_drop_handler';
import { create_asset_popups } from './asset_control/asset_popups';

/** Тип AssetControl */
export type AssetControlType = ReturnType<typeof AssetControlCreate>;

/** Модульный instance для использования через импорт */
let asset_control_instance: AssetControlType | undefined;

/** Получить instance AssetControl */
export function get_asset_control(): AssetControlType {
    if (asset_control_instance === undefined) {
        throw new Error('AssetControl не инициализирован. Вызовите register_asset_control() сначала.');
    }
    return asset_control_instance;
}

/** Попробовать получить instance AssetControl (без ошибки если не инициализирован) */
export function try_get_asset_control(): AssetControlType | undefined {
    return asset_control_instance;
}

export function register_asset_control() {
    asset_control_instance = AssetControlCreate();
}

function AssetControlCreate() {
    // Инициализация состояния
    const filemanager = document.querySelector('.filemanager') as HTMLDivElement;
    const breadcrumbs = filemanager.querySelector('.breadcrumbs') as HTMLDivElement;
    const assets_list = filemanager.querySelector('.assets_list') as HTMLDivElement;
    const drop_zone = document.getElementById('drop_zone') as HTMLDivElement;

    const state: AssetControlState = {
        filemanager,
        breadcrumbs,
        assets_list,
        drop_zone,
        active_asset: undefined,
        selected_assets: [],
        move_assets_data: { assets: [] },
        current_dir: undefined,
        current_project: undefined,
        current_scene: {},
        drag_for_upload_now: false,
        drag_asset_now: false,
        history_length_cache: {} as TDictionary<number>,
        mouse_down_on_asset: false,
    };

    // Инициализация модулей (go_to_dir передаётся позже)
    const selection = create_asset_selection(state);
    const file_ops = create_file_operations(state, go_to_dir);
    const scene_ops = create_scene_operations(state, go_to_dir);
    const drag_drop = create_drag_drop_handler(state, go_to_dir);
    const popups = create_asset_popups(state, file_ops, scene_ops, go_to_dir);

    function init() {
        document.querySelector('.filemanager')?.addEventListener('contextmenu', (event: Event) => {
            event.preventDefault();
        });
        drag_drop.setup_drag_listeners();
        subscribe();
    }

    function subscribe() {
        Services.event_bus.on('input:key_up', on_key_up);
        Services.event_bus.on('input:pointer_down', on_mouse_down);
        Services.event_bus.on('input:pointer_move', on_mouse_move);
        Services.event_bus.on('input:pointer_up', on_mouse_up);
        Services.event_bus.on('input:dblclick', on_dbl_click);
        Services.event_bus.on('input:save', save_current_scene);
        Services.event_bus.on('hierarchy:dropped_in_assets', on_graph_drop);
        Services.event_bus.on('server:file_system_events', on_fs_events);
    }

    async function load_project(data: ProjectLoadData, folder_content?: FSObject[], to_dir?: string) {
        state.current_project = data.name;
        localStorage.setItem('current_project', state.current_project);

        Services.resources.set_project_name(state.current_project);
        Services.logger.info('[load_project] Materials from server:', data.paths.materials);

        const textures: { func: (...args: any[]) => Promise<any>, path: string | LoadAtlasData }[] = [];
        const shaders: { func: (...args: any[]) => Promise<any>, path: string | LoadAtlasData }[] = [];
        const materials_list: { func: (...args: any[]) => Promise<any>, path: string | LoadAtlasData }[] = [];
        const other: { func: (...args: any[]) => Promise<any>, path: string | LoadAtlasData }[] = [];

        for (const key of get_keys(data.paths)) {
            const paths = data.paths[key];
            let func: (...args: any[]) => Promise<any>;
            if (key === 'textures') {
                func = (path: string) => Services.resources.preload_texture('/' + path);
            } else if (key === 'vertex_programs') {
                func = (path: string) => Services.resources.preload_vertex_program('/' + path);
            } else if (key === 'fragment_programs') {
                func = (path: string) => Services.resources.preload_fragment_program('/' + path);
            } else if (key === 'materials') {
                func = (path: string) => Services.resources.preload_material('/' + path);
            } else if (key === 'fonts') {
                func = (path: string) => Services.resources.preload_font('/' + path);
            } else if (key === 'models') {
                func = (path: string) => Services.resources.preload_model('/' + path);
            } else if (key === 'atlases') {
                func = (paths: LoadAtlasData) => Services.resources.preload_atlas('/' + paths.atlas, '/' + paths.texture);
            } else if (key === 'scenes') {
                func = (path: string) => Services.resources.preload_scene('/' + path);
            } else if (key === 'audios') {
                func = (path: string) => Services.resources.preload_audio('/' + path);
            } else func = async () => { };

            if (func !== undefined) {
                for (const path of paths) {
                    switch (key) {
                        case 'vertex_programs': case 'fragment_programs':
                            shaders.push({ func, path }); break;
                        case 'textures':
                            textures.push({ func, path }); break;
                        case 'materials':
                            materials_list.push({ func, path }); break;
                        default:
                            other.push({ func, path }); break;
                    }
                }
            }
        }

        // Загрузка в правильном порядке: шейдеры → текстуры → материалы → остальное
        await Promise.all(shaders.map(info => info.func(info.path)));
        await Promise.all(textures.map(info => info.func(info.path)));
        await Promise.all(materials_list.map(info => info.func(info.path)));
        await Promise.all(other.map(info => info.func(info.path)));

        await Services.resources.update_from_metadata();
        await Services.resources.write_metadata();

        if (folder_content && to_dir === undefined) {
            state.current_dir = '';
            await draw_assets(folder_content);
            generate_breadcrumbs(state.current_dir);
        } else if (to_dir !== undefined) {
            await go_to_dir(to_dir);
        }
    }

    async function go_to_dir(path: string, renew = false) {
        if (!state.current_project) return;
        if (state.current_dir === path && !renew) return;
        const resp = await get_client_api().get_folder(path);
        if (resp.result === 1 && resp.data !== undefined) {
            localStorage.setItem('current_dir', path);
            const folder_content = resp.data;
            state.current_dir = path;
            await draw_assets(folder_content);
            generate_breadcrumbs(state.current_dir);
            if (renew) Services.logger.debug('refresh current assets dir ok');
        } else if (path !== '') {
            Services.logger.warn('cannot go to dir:', path, ', returning to root dir');
            await go_to_dir('', true);
        } else {
            Services.logger.warn('failed to load root dir!');
        }
    }

    async function select_file(file_path: string) {
        if (!file_path) return;

        const dir_path = file_path.substring(0, file_path.lastIndexOf('/'));
        const file_name = file_path.substring(file_path.lastIndexOf('/') + 1);

        await go_to_dir(dir_path, true);

        const assets = Array.from(assets_list.querySelectorAll('.asset'));
        for (const asset of assets) {
            if (asset.getAttribute('data-name') === file_name) {
                selection.add_to_selected(asset as HTMLElement);
                asset.scrollIntoView({ behavior: 'smooth', block: 'center' });
                break;
            }
        }
    }

    async function renew_current_dir() {
        if (state.current_project === undefined || state.current_dir === undefined) return;
        await go_to_dir(state.current_dir, true);
    }

    async function draw_assets(list: FSObject[]) {
        const scanned_folders: FSObject[] = [];
        const scanned_files: FSObject[] = [];
        list.forEach(function (d) {
            if (d.type === 'folder') scanned_folders.push(d);
            else if (d.type === 'file') scanned_files.push(d);
        });

        assets_list.innerHTML = '';
        assets_list.hidden = true;

        if (scanned_folders.length) {
            for (const folder of scanned_folders) {
                const num_files = folder.num_files as number;
                const _path = folder.path.replaceAll('\\', '/');
                const asset_type: AssetType = 'folder';
                let items_length = '';
                const name = escapeHTML(folder.name);
                const icon_elem = span_elem('', ['icon', 'folder']);
                if (num_files) icon_elem.classList.add('full');
                if (num_files === 1) items_length = `${num_files} Файл`;
                else if (num_files > 1) items_length = `${num_files} Файлов`;
                else items_length = 'Пусто';
                const details_elem = span_elem(items_length, ['details']);
                const name_elem = span_elem(name, ['name']);
                const folder_elem = document.createElement('li');
                folder_elem.classList.add('folder', 'asset');
                folder_elem.setAttribute('data-name', name);
                folder_elem.setAttribute('data-path', _path);
                folder_elem.setAttribute('data-type', asset_type);
                folder_elem.appendChild(icon_elem);
                folder_elem.appendChild(name_elem);
                folder_elem.appendChild(details_elem);
                folder_elem.addEventListener('drop', async () => {
                    if (state.drag_asset_now) await drag_drop.handle_asset_drop(_path);
                });
                assets_list.appendChild(folder_elem);
            }
        }

        if (scanned_files.length) {
            for (const file of scanned_files) {
                const file_size = bytesToSize(file.size);
                const name = escapeHTML(file.name);
                let file_type = getFileExt(name);
                const ext = file.ext ? file.ext : '';
                const _path = file.path.replaceAll('\\', '/');
                let asset_type: AssetType = 'other';
                const src = file.path ? file.path.replaceAll('\\', '/') : '';
                const src_url = new URL(URL_PATHS.ASSETS + `/${state.current_project}/${src}`, SERVER_URL);
                const file_elem = document.createElement('li');
                let icon_elem = span_elem(`.${ext}`, ['icon', 'file']);
                const details_elem = span_elem(file_size, ['details']);
                icon_elem.classList.add('drag', `f-${ext}`);
                const name_elem = span_elem(name, ['name']);
                if (file_type === 'mtr') asset_type = ASSET_MATERIAL;
                else if (file_type === SCENE_EXT) asset_type = ASSET_SCENE_GRAPH;
                else if (fileIsImg(_path)) {
                    asset_type = ASSET_TEXTURE;
                    icon_elem = document.createElement('img');
                    icon_elem.setAttribute('src', src_url.toString());
                    icon_elem.setAttribute('draggable', 'false');
                    icon_elem.classList.add('icon', 'img', 'drag');
                } else if (AUDIO_EXT.includes(ext)) {
                    asset_type = ASSET_AUDIO;
                }
                file_elem.setAttribute('data-type', asset_type);
                file_elem.setAttribute('data-name', name);
                file_elem.setAttribute('data-path', _path);
                file_elem.setAttribute('data-ext', ext);
                file_elem.setAttribute('draggable', 'true');
                file_elem.classList.add('file', 'asset');
                file_elem.appendChild(icon_elem);
                file_elem.appendChild(name_elem);
                file_elem.appendChild(details_elem);
                file_elem.addEventListener('dragstart', function () {
                    state.drag_asset_now = true;
                });
                assets_list.appendChild(file_elem);
            }
        }

        // Настройка dragstart для текстур, материалов и сцен
        setup_asset_dragstart();
        assets_list.hidden = false;
    }

    function setup_asset_dragstart() {
        const texture_files = document.querySelectorAll<HTMLElement>(`[data-type=${ASSET_TEXTURE}]`);
        texture_files.forEach((file) => {
            file.addEventListener('dragstart', (event: DragEvent) => {
                if (!event.dataTransfer) return;
                event.dataTransfer.clearData();
                const path = file.getAttribute('data-path') || '';
                const data = Services.resources.get_all_textures().find((info) => {
                    const texture_path = (info.data.texture.userData as { path?: string }).path;
                    return texture_path === `${SERVER_URL}${URL_PATHS.ASSETS}/${PROJECT_NAME}/${path}`;
                });
                if (data === undefined) {
                    Services.logger.warn(`[AssetControl] Texture not found for drag: ${path}`);
                    return;
                }
                event.dataTransfer.setData('text/plain', `${data.atlas}/${data.name}`);
                event.dataTransfer.setData('textureSize', `${data.data?.size?.x ?? 0}x${data.data?.size?.y ?? 0}`);
                event.dataTransfer.setData('asset_type', ASSET_TEXTURE);
                event.dataTransfer.setData('path', path);
            });
        });
        const material_files = document.querySelectorAll<HTMLElement>(`[data-type=${ASSET_MATERIAL}]`);
        material_files.forEach((file) => {
            file.addEventListener('dragstart', (event: DragEvent) => {
                if (!event.dataTransfer) return;
                event.dataTransfer.clearData();
                const path = file.getAttribute('data-path') || '';
                const name = get_file_name(path);
                event.dataTransfer.setData('text/plain', `${name}`);
                event.dataTransfer.setData('asset_type', ASSET_MATERIAL);
                event.dataTransfer.setData('path', path);
            });
        });
        const scene_elem_files = document.querySelectorAll<HTMLElement>(`[data-type=${ASSET_SCENE_GRAPH}]`);
        scene_elem_files.forEach((file) => {
            file.addEventListener('dragstart', (event: DragEvent) => {
                if (!event.dataTransfer) return;
                event.dataTransfer.clearData();
                const path = file.getAttribute('data-path') || '';
                if (path) {
                    event.dataTransfer.setData('asset_type', ASSET_SCENE_GRAPH);
                    event.dataTransfer.setData('path', path);
                }
            });
        });
    }

    function generate_breadcrumbs(dir: string) {
        breadcrumbs.innerHTML = '';
        const asset_type: AssetType = 'folder';
        let path = [''];
        if (dir !== '') path = ('/' + dir.replaceAll('\\', '/')).split('/');
        for (let i = 1; i < path.length; i++) path[i] = path[i - 1] + '/' + path[i];
        path.forEach(function (u, i) {
            const temp = u.split('/');
            let name = temp[temp.length - 1];
            name = (name === '') ? 'Файлы' : name;
            if (i === 0 || i !== path.length - 1) {
                const arrow = span_elem('→', ['arrow']);
                const a_elem = document.createElement('a');
                const s_elem = span_elem(name, ['folderName']);
                const _path = u.replace('/', '');
                s_elem.setAttribute('data-path', _path);
                s_elem.setAttribute('data-type', asset_type);
                a_elem.setAttribute('href', 'javascript:void(0);');
                a_elem.appendChild(s_elem);
                breadcrumbs.appendChild(a_elem);
                breadcrumbs.appendChild(arrow);
                s_elem.addEventListener('drop', async () => {
                    if (state.drag_asset_now) await drag_drop.handle_asset_drop(_path);
                });
                s_elem.addEventListener('dragenter', async () => {
                    if (state.drag_asset_now) s_elem.classList.add('marked');
                });
                s_elem.addEventListener('dragleave', async () => {
                    if (state.drag_asset_now) s_elem.classList.remove('marked');
                });
            } else {
                const s_elem = span_elem(name, ['folderName']);
                breadcrumbs.appendChild(s_elem);
            }
        });
    }

    function on_fs_events(message: { events: FSEvent[] }) {
        const events = message.events;
        let renew_required = false;
        if (events && events.length !== 0) {
            events.forEach(async (event: FSEvent) => {
                if (event.project === state.current_project) {
                    if (event.folder_path === state.current_dir) {
                        renew_required = true;
                    }
                    if (event.ext) {
                        if (event.event_type === 'change' || event.event_type === 'rename') {
                            if (texture_ext.includes(event.ext)) await Services.resources.preload_texture('/' + event.path);
                            if (model_ext.includes(event.ext)) await Services.resources.preload_model('/' + event.path);
                            if (event.ext === FONT_EXT) await Services.resources.preload_font('/' + event.path);
                        } else if (event.event_type === 'remove') {
                            if (texture_ext.includes(event.ext)) {
                                const name = get_file_name(event.path);
                                Services.resources.free_texture(name, '');
                            }
                        }
                    }
                }
            });
        }
        if (renew_required) renew_current_dir();
    }

    async function draw_empty_project() {
        generate_breadcrumbs('');
    }

    // Обработчики событий мыши и клавиатуры
    function on_mouse_move(_event: unknown) { }

    function on_mouse_down(event: any) {
        const popup_elem = event.target.closest('.bgpopup');
        const menu_elem = event.target.closest('.wr_menu__context');
        const menu_popup_elem = event.target.closest('.wr_popup');
        const inspector_elem = event.target.closest('.inspector__body');
        if (!state.current_project || menu_elem || popup_elem || menu_popup_elem || inspector_elem) return;
        const folder_elem = event.target.closest('.folder.asset');
        const file_elem = event.target.closest('.file.asset');
        const asset_elem = folder_elem ? folder_elem : file_elem ? file_elem : undefined;
        if (event.button === 0 || (asset_elem && event.button === 2)) {
            if (asset_elem) {
                state.mouse_down_on_asset = true;
            }
            if (!Services.input.is_control()) {
                if (!asset_elem || (asset_elem && !state.selected_assets.includes(asset_elem))) {
                    selection.clear_selected();
                }
            }
        }
    }

    async function on_mouse_up(event: any) {
        state.drag_asset_now = false;
        const popup_elem = event.target.closest('.bgpopup');
        const menu_elem = event.target.closest('.wr_menu__context');
        const menu_popup_elem = event.target.closest('.wr_popup');
        const inspector_elem = event.target.closest('.inspector__body');
        if (!state.current_project || menu_elem || popup_elem || menu_popup_elem || inspector_elem) return;
        const folder_elem = event.target.closest('.folder.asset');
        const file_elem = event.target.closest('.file.asset');
        const asset_elem = folder_elem ? folder_elem : file_elem ? file_elem : undefined;
        selection.clear_active();
        if (event.button === 0 || event.button === 2) {
            if (state.mouse_down_on_asset) {
                state.mouse_down_on_asset = false;
                if (asset_elem) selection.set_active(asset_elem);
                if (!Services.input.is_control()) {
                    selection.clear_selected();
                    if (asset_elem) selection.add_to_selected(asset_elem);
                } else if (Services.input.is_control()) {
                    if (asset_elem)
                        if (state.selected_assets.includes(asset_elem)) selection.remove_from_selected(asset_elem);
                        else selection.add_to_selected(asset_elem);
                }
                if (file_elem) {
                    const path = file_elem.getAttribute('data-path');
                    const name = file_elem.getAttribute('data-name');
                    const ext = file_elem.getAttribute('data-ext');
                    Services.logger.debug(`Клик на ассет файл ${name}, путь ${path}, проект ${state.current_project}`);
                    Services.event_bus.emit('assets:clicked', { name, path, ext, button: event.button });
                }
            }
            const breadcrumbs_elem = event.target.closest('a .folderName');
            if (breadcrumbs_elem !== null && event.button === 0) {
                const path = breadcrumbs_elem.getAttribute('data-path');
                return await go_to_dir(path);
            }
        }
        if (event.button === 0) {
            if (folder_elem) {
                const path = folder_elem.getAttribute('data-path');
                return await go_to_dir(path);
            }
        } else if (event.button === 2 && event.target.closest('.filemanager')) {
            popups.open_menu(event);
            return;
        }
    }

    async function on_key_up(event: any) {
        if (event.key === 'F2' && state.active_asset && !get_popups().is_visible()) {
            const path = state.active_asset.getAttribute('data-path') as string;
            const name = state.active_asset.getAttribute('data-name') as string;
            popups.rename_popup(path, name);
        }
        if (event.key === 'Delete' && !get_popups().is_visible()) {
            popups.remove_popup();
        }
        if (Services.input.is_control()) {
            if ((event.key === 'c' || event.key === 'с') && state.selected_assets.length) {
                state.move_assets_data.assets = state.selected_assets.slice();
                state.move_assets_data.move_type = 'copy';
                Services.logger.debug('copy assets, amount = ', state.move_assets_data.assets.length);
            }
            if ((event.key === 'x' || event.key === 'ч') && state.selected_assets.length) {
                state.move_assets_data.assets = state.selected_assets.slice();
                state.move_assets_data.move_type = 'move';
                Services.logger.debug('cut assets, amount = ', state.move_assets_data.assets.length);
            }
            if ((event.key === 'v' || event.key === 'м') && state.move_assets_data.assets.length) {
                await file_ops.paste_assets();
            }
        }
    }

    async function on_dbl_click(event: any) {
        const file_elem = event.target.closest('.file.asset');
        if (file_elem) {
            const ext = file_elem.getAttribute('data-ext');
            const new_path = file_elem.getAttribute('data-path');
            const current_path = state.current_scene.path;
            if (ext === SCENE_EXT && new_path !== current_path) {
                if (current_path !== undefined && state.history_length_cache[current_path] !== Services.history.get_undo_stack().length)
                    scene_ops.open_scene_exit_popup(current_path, new_path);
                else if (new_path !== undefined)
                    await scene_ops.open_scene(new_path);
            }
        }
    }

    async function on_graph_drop(id: number) {
        const scene_object = Services.scene.get_by_id(id);
        if (scene_object) {
            const data = Services.scene.serialize_object(scene_object);
            popups.save_graph_popup(state.current_dir as string, data);
        }
    }

    function save_current_scene() {
        scene_ops.save_current_scene(popups.new_scene_popup);
    }

    async function reload_current_project() {
        if (state.current_project) {
            const load_project_resp = await get_client_api().load_project(state.current_project);
            if (load_project_resp.result !== 1) {
                Services.logger.warn(`Failed to reload current project (${state.current_project})`);
                return;
            }
            const data = load_project_resp.data as ProjectLoadData;
            const to_dir = state.current_dir ? state.current_dir : '';
            await load_project(data, undefined, to_dir);
            if (state.current_scene.path === undefined) {
                Services.logger.warn('[reload_current_project] Не удалось установить сцену, путь undefined');
                return;
            }
            await scene_ops.set_current_scene(state.current_scene.path);
        }
    }

    init();

    return {
        load_project,
        new_scene: scene_ops.new_scene,
        new_scene_popup: popups.new_scene_popup,
        save_current_scene,
        open_scene: scene_ops.open_scene,
        set_current_scene: scene_ops.set_current_scene,
        draw_assets,
        get_file_data: file_ops.get_file_data,
        save_file_data: file_ops.save_file_data,
        save_base64_img: file_ops.save_base64_img,
        draw_empty_project,
        get_current_scene: scene_ops.get_current_scene,
        select_file,
        loadPartOfSceneInPos: scene_ops.loadPartOfSceneInPos,
        go_to_dir,
        reload_current_project,
    };
}

// Утилиты

function escapeHTML(text: string): string {
    return text.replace(/\&/g, '&amp;').replace(/\</g, '&lt;').replace(/\>/g, '&gt;');
}

function bytesToSize(bytes: number): string {
    const sizes = ['б', 'Кб', 'Мб'];
    if (bytes === 0) return '0 байт';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i)) + ' ' + sizes[i];
}

function getFileExt(path: string): string {
    const ar = path.split('.');
    return ar[ar.length - 1];
}

function fileIsImg(path: string): boolean {
    const ext = getFileExt(path);
    return texture_ext.includes(ext);
}

export async function run_debug_filemanager(project_to_load: string) {
    const asset_control = get_asset_control();
    let server_ok = false;
    try {
        const resp = await get_client_api().test_server_ok();
        if (resp) {
            const text_response = await resp.text();
            const resp_data = JSON.parse(text_response);
            server_ok = resp_data.result === 1;
        }
    } catch (e) {
        Services.logger.error('Ошибка проверки сервера:', e);
        await asset_control.draw_empty_project();
        return;
    }
    if (server_ok) {
        let ws_client: ReturnType<typeof WsWrap> | undefined;
        const ws_connected = new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
                ws_client?.stop_reconnect_timer();
                reject(new Error('WebSocket connection timeout'));
            }, 10000);

            ws_client = WsWrap(
                () => {
                    clearTimeout(timeout);
                    resolve();
                    Services.event_bus.on('ON_WS_CONNECTED', () => asset_control.reload_current_project());
                },
                () => { },
                () => { },
                (m) => {
                    const data = JSON.parse(m as string) as ProtocolWrapper;
                    get_client_api().on_message_socket(data.id as keyof NetMessagesEditor, data.message);
                }
            );
            ws_client.set_reconnect_timer(WS_SERVER_URL, WS_RECONNECT_INTERVAL);
        });

        try {
            await ws_connected;
        } catch (e) {
            Services.logger.error('Ошибка подключения WebSocket:', e);
            ws_client?.stop_reconnect_timer();
        }

        const sessionResult = await get_client_api().waitForSessionId();
        if (!sessionResult.success) {
            Services.logger.warn('Не удалось получить sessionId:', sessionResult.error);
        }

        const projects = await get_client_api().get_projects();
        const normalized_project_name = project_to_load.replace(/^\.\.\//, '');
        const current_project = localStorage.getItem('current_project');
        const current_dir = localStorage.getItem('current_dir');
        if (projects.includes(normalized_project_name)) {
            const r = await get_client_api().load_project(normalized_project_name);
            if (r.result === 1) {
                const data = r.data as ProjectLoadData;
                let assets: FSObject[] | undefined = data.assets;
                let go_to_dir_path: string | undefined = undefined;
                if (normalized_project_name === current_project && current_dir) {
                    assets = undefined;
                    go_to_dir_path = current_dir;
                }
                await asset_control.load_project(data, assets, go_to_dir_path);
                IS_LOGGING && Services.logger.debug('Загружен проект', data.name);
                return;
            } else {
                Services.logger.warn(`Не удалось загрузить проект ${normalized_project_name}, result: ${r.result}, message: ${r.message}`);
            }
        }
        Services.logger.warn(`Не удалось загрузить проект ${normalized_project_name}`);
    } else {
        Services.logger.warn('Сервер не отвечает, невозможно запустить отладчик файлового менеджера');
        await asset_control.draw_empty_project();
    }
}
