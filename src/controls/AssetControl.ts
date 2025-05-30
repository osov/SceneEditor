// TODO: если перемещаем файл материала, то нужно обновить путь до него в ResourceManager

import { SERVER_URL, WS_RECONNECT_INTERVAL, WS_SERVER_URL } from "../config";
import {
    ASSET_MATERIAL, ASSET_SCENE_GRAPH, ASSET_TEXTURE, ASSET_AUDIO, AssetType, DataFormatType, FILE_UPLOAD_CMD,
    FONT_EXT, FSObject, LoadAtlasData, model_ext, ProjectLoadData, SCENE_EXT, ServerResponses,
    TDictionary, texture_ext, URL_PATHS, AUDIO_EXT,
    TILES_INFO_EXT,
} from "../modules_editor/modules_editor_const";
import { span_elem, json_parsable, get_keys, hexToRGB } from "../modules/utils";
import { Messages } from "../modules/modules_const";
import { contextMenuItem } from "../modules_editor/ContextMenu";
import { NodeAction } from "./ActionsControl";
import { api } from "../modules_editor/ClientAPI";
import { IBaseEntityData } from "../render_engine/types";
import { get_file_name, is_tile } from "../render_engine/helpers/utils";
import { Blending, Quaternion, Vector3 } from "three";
import { get_hash_by_mesh } from "@editor/inspectors/ui_utils";
import { Slice9Mesh } from "@editor/render_engine/objects/slice9";
import { BlendMode } from "@editor/inspectors/MeshInspector";
import { convertBlendModeToThreeJS, convertThreeJSBlendingToBlendMode } from "@editor/inspectors/helpers";
declare global {
    const AssetControl: ReturnType<typeof AssetControlCreate>;
}

export function register_asset_control() {
    (window as any).AssetControl = AssetControlCreate();
}


function AssetControlCreate() {
    const filemanager = document.querySelector('.filemanager') as HTMLDivElement;
    const breadcrumbs = filemanager.querySelector('.breadcrumbs') as HTMLDivElement;
    const assets_list = filemanager.querySelector('.assets_list') as HTMLDivElement;
    const drop_zone = document.getElementById("drop_zone") as HTMLDivElement;
    let active_asset: Element | undefined = undefined;
    let selected_assets: Element[] = [];
    let move_assets_data: { assets: Element[], move_type?: "move" | "copy" } = { assets: [] };
    let current_dir: string | undefined = undefined;
    let current_project: string | undefined = undefined;
    let current_scene: { path?: string, name?: string } = {};
    let drag_for_upload_now = false;
    let drag_asset_now = false;
    let history_length_cache: TDictionary<number> = {};
    let mouse_down_on_asset = false;

    function init() {
        document.querySelector('.filemanager')?.addEventListener('contextmenu', (event: any) => {
            event.preventDefault();
        });

        subscribe();
    }

    function subscribe() {
        EventBus.on('SYS_VIEW_INPUT_KEY_UP', on_key_up);
        EventBus.on('SYS_INPUT_POINTER_DOWN', on_mouse_down);
        EventBus.on('SYS_INPUT_POINTER_MOVE', on_mouse_move);
        EventBus.on('SYS_INPUT_POINTER_UP', on_mouse_up);
        EventBus.on('SYS_INPUT_DBL_CLICK', on_dbl_click);
        EventBus.on('SYS_INPUT_SAVE', save_current_scene);
        EventBus.on('SYS_INPUT_SAVE_TILES', save_tilesinfo_popup);
        EventBus.on('SYS_GRAPH_DROP_IN_ASSETS', on_graph_drop);

        EventBus.on('SERVER_FILE_SYSTEM_EVENTS', on_fs_events);
        EventBus.on('ON_WS_CONNECTED', reload_current_project);
    }

    async function load_project(data: ProjectLoadData, folder_content?: FSObject[], to_dir?: string) {
        current_project = data.name;
        localStorage.setItem("current_project", current_project);
        if (folder_content && to_dir == undefined) {
            current_dir = "";
            draw_assets(folder_content);
            generate_breadcrumbs(current_dir);
        }
        else if (to_dir != undefined) {
            await go_to_dir(to_dir);
        }

        const textures: { func: (...args: any[]) => Promise<any>, path: string | LoadAtlasData }[] = [];
        const shaders: { func: (...args: any[]) => Promise<any>, path: string | LoadAtlasData }[] = [];
        const other: { func: (...args: any[]) => Promise<any>, path: string | LoadAtlasData }[] = [];
        for (const key of get_keys(data.paths)) {
            const paths = data.paths[key];
            let func: (...args: any[]) => Promise<any>;
            // Log.log('Preload', key, paths);
            if (key == "textures") {
                func = (path: string) => {
                    return ResourceManager.preload_texture("/" + path);
                }
            }
            else if (key == "vertex_programs") {
                func = (path: string) => {
                    return ResourceManager.preload_vertex_program("/" + path);
                }
            }
            else if (key == "fragment_programs") {
                func = (path: string) => {
                    return ResourceManager.preload_fragment_program("/" + path);
                }
            }
            else if (key == "materials") {
                func = (path: string) => {
                    return ResourceManager.preload_material("/" + path);
                }
            }
            else if (key == "fonts") {
                func = (path: string) => {
                    return ResourceManager.preload_font("/" + path);
                }
            }
            else if (key == "models") {
                func = (path: string) => {
                    return ResourceManager.preload_model("/" + path);
                }
            }
            else if (key == "atlases") {
                func = (paths: LoadAtlasData) => {
                    return ResourceManager.preload_atlas("/" + paths.atlas, "/" + paths.texture);
                }
            }
            else if (key == "scenes") {
                func = (path: string) => {
                    return ResourceManager.preload_scene("/" + path);
                }
            }
            else if (key == "audios") {
                func = (path: string) => {
                    return ResourceManager.preload_audio("/" + path);
                }
            }
            else func = async () => { };

            if (func != undefined) {
                for (const path of paths) {
                    switch (key) {
                        case 'vertex_programs': case 'fragment_programs':
                            shaders.push({ func, path });
                            break;
                        case 'textures':
                            textures.push({ func, path });
                            break;
                        default:
                            other.push({ func, path });
                            break;
                    }
                }
            }
        }

        const shader_loaders: Promise<any>[] = [];
        for (const info of shaders) {
            shader_loaders.push(info.func(info.path));
        }
        await Promise.all(shader_loaders);

        const texture_loaders: Promise<any>[] = [];
        for (const info of textures) {
            texture_loaders.push(info.func(info.path));
        }
        await Promise.all(texture_loaders);

        const other_loaders: Promise<any>[] = [];
        for (const info of other) {
            other_loaders.push(info.func(info.path));
        }
        await Promise.all(other_loaders);

        await ResourceManager.update_from_metadata();
        await ResourceManager.write_metadata();
    }

    async function go_to_dir(path: string, renew = false) {
        if (!current_project) return;
        if (current_dir === path && !renew) return;
        const resp = await ClientAPI.get_folder(path);
        if (resp.result === 1 && resp.data != undefined) {
            localStorage.setItem("current_dir", path);
            const folder_content = resp.data;
            current_dir = path;
            draw_assets(folder_content);
            generate_breadcrumbs(current_dir);
            if (renew)
                log("refresh current assets dir ok");
        }
        else if (path != "") {
            Log.warn("cannot go to dir:", path, ", returning to root dir");
            await go_to_dir("", true);
        }
        else
            Log.warn('failed to load root dir!');
    }

    async function select_file(file_path: string) {
        if (!file_path) return;

        // Get directory path by removing filename
        const dir_path = file_path.substring(0, file_path.lastIndexOf('/'));
        const file_name = file_path.substring(file_path.lastIndexOf('/') + 1);

        // First navigate to containing directory
        await go_to_dir(dir_path, true);

        // Find and select the file in the assets list
        const assets = Array.from(assets_list.querySelectorAll('.asset'));
        for (const asset of assets) {
            if (asset.getAttribute('data-name') == file_name) {
                add_to_selected(asset as HTMLElement);
                asset.scrollIntoView({
                    behavior: "smooth",
                    block: "center"
                })
                break;
            }
        }
    }

    async function renew_current_dir() {
        if (current_project == undefined || current_dir == undefined) return;
        await go_to_dir(current_dir, true);
    }

    function draw_assets(list: FSObject[]) {
        const scanned_folders: FSObject[] = [];
        const scanned_files: FSObject[] = [];
        list.forEach(function (d) {
            if (d.type === "folder")
                scanned_folders.push(d);
            else if (d.type === "file")
                scanned_files.push(d);
        });

        assets_list.innerHTML = "";
        assets_list.hidden = true;

        // const nothing_found_elem = filemanager.querySelector('.nothingfound') as HTMLDivElement;
        // if(!scannedFolders.length && !scannedFiles.length)
        // 	nothing_found_elem.hidden = false;
        // else
        //     nothing_found_elem.hidden = true;

        if (scanned_folders.length) {
            scanned_folders.forEach(function (f) {
                const num_files = f.num_files as number;
                const _path = f.path.replaceAll('\\', '/');
                const asset_type: AssetType = "folder";
                let items_length = '';
                let name = escapeHTML(f.name);
                const icon_elem = span_elem("", ["icon", "folder"]);
                if (num_files) {
                    icon_elem.classList.add("full");
                }
                if (num_files == 1)
                    items_length = `${num_files} Файл`;
                else if (num_files > 1)
                    items_length = `${num_files} Файлов`;
                else
                    items_length = 'Пусто';
                const details_elem = span_elem(items_length, ["details"]);
                const name_elem = span_elem(name, ["name"]);
                const folder_elem = document.createElement("li");
                folder_elem.classList.add("folder", "asset");
                folder_elem.setAttribute("data-name", name);
                folder_elem.setAttribute("data-path", _path);
                folder_elem.setAttribute("data-type", asset_type);
                folder_elem.appendChild(icon_elem);
                folder_elem.appendChild(name_elem);
                folder_elem.appendChild(details_elem);
                folder_elem.addEventListener("drop", async (e) => {
                    if (drag_asset_now)
                        await handle_asset_drop(_path);
                });
                assets_list.appendChild(folder_elem);
            });
        }

        if (scanned_files.length) {
            scanned_files.forEach(function (f) {
                const file_size = bytesToSize(f.size);
                const name = escapeHTML(f.name);
                let file_type = getFileExt(name);
                const ext = f.ext ? f.ext : "";
                const _path = f.path.replaceAll('\\', '/');
                let asset_type: AssetType = "other";
                const src = f.src ? f.src.replaceAll('\\', '/') : '';
                const src_url = new URL(src, SERVER_URL);
                const file_elem = document.createElement("li");
                let icon_elem = span_elem(`.${ext}`, ["icon", "file"]);
                const details_elem = span_elem(file_size, ["details"]);
                icon_elem.classList.add("drag", `f-${ext}`);
                const name_elem = span_elem(name, ["name"]);
                if (file_type == "mtr")
                    asset_type = ASSET_MATERIAL;
                else if (file_type == SCENE_EXT)
                    asset_type = ASSET_SCENE_GRAPH;
                else if (fileIsImg(_path)) {
                    asset_type = ASSET_TEXTURE;
                    icon_elem = document.createElement("img");
                    icon_elem.setAttribute("src", src_url.toString());
                    icon_elem.setAttribute("draggable", "false");
                    icon_elem.classList.add("icon", "img", "drag");
                }
                else if (AUDIO_EXT.includes(ext)) {
                    asset_type = ASSET_AUDIO;
                }
                file_elem.setAttribute("data-type", asset_type);
                file_elem.setAttribute("data-name", name);
                file_elem.setAttribute("data-path", _path);
                file_elem.setAttribute("data-ext", ext);
                file_elem.setAttribute("draggable", "true");
                file_elem.classList.add("file", "asset");
                file_elem.appendChild(icon_elem);
                file_elem.appendChild(name_elem);
                file_elem.appendChild(details_elem);
                file_elem.addEventListener("dragstart", function (e) {
                    drag_asset_now = true;
                })
                assets_list.appendChild(file_elem);
            });
        }
        const texture_files = document.querySelectorAll<HTMLElement>(`[data-type=${ASSET_TEXTURE}]`);
        texture_files.forEach((file) => {
            file.addEventListener("dragstart", (event: DragEvent) => {
                if (!event.dataTransfer)
                    return;
                event.dataTransfer.clearData();
                const path = file.getAttribute("data-path") || '';
                const data = ResourceManager.get_all_textures().find((info) => {
                    return (info.data.texture as any).path == `${SERVER_URL}${URL_PATHS.ASSETS}/${path}`;
                });
                event.dataTransfer.setData("text/plain", `${data?.atlas}/${data?.name}`);
                event.dataTransfer.setData("textureSize", `${data?.data?.size?.x}x${data?.data?.size?.y}`);
                event.dataTransfer.setData("asset_type", ASSET_TEXTURE);
                event.dataTransfer.setData("path", path);
            });
        });
        const material_files = document.querySelectorAll<HTMLElement>(`[data-type=${ASSET_MATERIAL}]`);
        material_files.forEach((file) => {
            file.addEventListener("dragstart", (event: DragEvent) => {
                if (!event.dataTransfer)
                    return;
                event.dataTransfer.clearData();
                const path = file.getAttribute("data-path") || '';
                const name = get_file_name(path);
                event.dataTransfer.setData("text/plain", `${name}`);
                event.dataTransfer.setData("asset_type", ASSET_MATERIAL);
                event.dataTransfer.setData("path", path);
            });
        });
        const scene_elem_files = document.querySelectorAll<HTMLElement>(`[data-type=${ASSET_SCENE_GRAPH}]`);
        scene_elem_files.forEach((file) => {
            file.addEventListener("dragstart", (event: DragEvent) => {
                if (!event.dataTransfer)
                    return;
                event.dataTransfer.clearData();
                const path = file.getAttribute("data-path") || '';
                if (path) {
                    event.dataTransfer.setData("asset_type", ASSET_SCENE_GRAPH);
                    event.dataTransfer.setData("path", path);
                }
            });
        });
        assets_list.hidden = false;
    }

    function save_base64_img(path: string, data: string) {
        return ClientAPI.save_data(path, data, "base64");
    }

    async function get_file_data(path: string) {
        const resp = await ClientAPI.get_data(path);
        if (!resp || resp.result === 0 || !resp.data) {
            Popups.toast.error(`Не удалось получить данные: ${resp.message}`);
            return null;
        }
        return resp.data;
    }

    function save_file_data(path: string, data: string, format: DataFormatType = "string") {
        return ClientAPI.save_data(path, data, format);
    }

    function generate_breadcrumbs(dir: string) {
        breadcrumbs.innerHTML = "";
        const asset_type: AssetType = "folder";
        let path = [""];
        if (dir !== "") path = ("/" + dir.replaceAll("\\", "/")).split("/");
        for (let i = 1; i < path.length; i++)
            path[i] = path[i - 1] + "/" + path[i];
        path.forEach(function (u, i) {
            const temp = u.split("/");
            let name = temp[temp.length - 1];
            name = (name === "") ? "Файлы" : name;
            if (i === 0 || i !== path.length - 1) {
                const arrow = span_elem("→", ["arrow"]);
                const a_elem = document.createElement("a");
                const s_elem = span_elem(name, ["folderName"]);
                const _path = u.replace("/", "");
                s_elem.setAttribute("data-path", _path);
                s_elem.setAttribute("data-type", asset_type);
                a_elem.setAttribute("href", "javascript:void(0);");
                a_elem.appendChild(s_elem);
                breadcrumbs.appendChild(a_elem);
                breadcrumbs.appendChild(arrow);
                s_elem.addEventListener("drop", async (e) => {
                    if (drag_asset_now)
                        await handle_asset_drop(_path);
                });
                s_elem.addEventListener("dragenter", async (e) => {
                    if (drag_asset_now)
                        s_elem.classList.add("marked");
                });
                s_elem.addEventListener("dragleave", async (e) => {
                    if (drag_asset_now)
                        s_elem.classList.remove("marked");
                });
            }
            else {
                const s_elem = span_elem(name, ["folderName"]);
                breadcrumbs.appendChild(s_elem);
            }
        });
    }

    async function getFileAsync(dataTranfer: DataTransfer) {
        const files = [];
        for (var i = 0; i < dataTranfer.items.length; i++) {
            const item = dataTranfer.items[i];
            if (item.kind === 'file') {
                if (typeof item.webkitGetAsEntry === 'function') {
                    const entry = item.webkitGetAsEntry();
                    if (entry != null) {
                        const entryContent = await readEntryContentAsync(entry);
                        files.push(...entryContent);
                        continue;
                    }
                }

                const file = item.getAsFile();
                if (file) { files.push(file); }
            }
        }
        return files;
    };

    function readEntryContentAsync(entry: FileSystemEntry): Promise<File[]> {
        return new Promise((resolve, reject) => {
            let reading = 0;
            const contents: File[] = [];

            readEntry(entry);

            function readEntry(entry: FileSystemEntry) {
                if (entry.isFile) {
                    const file_entry = entry as FileSystemFileEntry;
                    reading++;
                    file_entry.file(file => {
                        reading--;
                        contents.push(file);

                        if (reading === 0) {
                            resolve(contents);
                        }
                    });
                } else if (entry.isDirectory) {
                    const dir_entry = entry as FileSystemDirectoryEntry;
                    readReaderContent(dir_entry.createReader());
                }
            };

            function readReaderContent(reader: FileSystemDirectoryReader) {
                reading++;
                reader.readEntries(function (entries) {
                    reading--;
                    for (const entry of entries) {
                        readEntry(entry);
                    }
                    if (reading === 0) {
                        resolve(contents);
                    }
                });
            };
        });
    };

    function open_menu(event: any) {
        const assets_menu_list = toggle_menu_options();
        ContextMenu.open(assets_menu_list, event, menuContextClick);
    }

    function toggle_menu_options() {
        const type = active_asset?.getAttribute('data-type');
        const assets_menu_list: contextMenuItem[] = [];
        if (!type) {
            assets_menu_list.push({ text: 'Обновить', action: NodeAction.refresh });
            assets_menu_list.push({ text: 'Показать', action: NodeAction.open_in_explorer });
            if (move_assets_data.assets.length)
                assets_menu_list.push({ text: 'Вставить', action: NodeAction.CTRL_V });
            assets_menu_list.push({
                text: '+ материал', children: [
                    { text: 'Базовый', action: NodeAction.material_base },
                ]
            });
            assets_menu_list.push({ text: 'Создать папку', action: NodeAction.new_folder });
            assets_menu_list.push({ text: 'Создать сцену', action: NodeAction.new_scene });
        }
        if (selected_assets.length == 1) {
            assets_menu_list.push({ text: 'Копировать', action: NodeAction.CTRL_C });
            assets_menu_list.push({ text: 'Вырезать', action: NodeAction.CTRL_X });
            assets_menu_list.push({ text: 'Дублировать', action: NodeAction.CTRL_D });
        }
        else if (selected_assets.length > 1) {
            assets_menu_list.push({ text: 'Копир. выделенные', action: NodeAction.CTRL_C });
            assets_menu_list.push({ text: 'Вырез. выделенные', action: NodeAction.CTRL_X });
            assets_menu_list.push({ text: 'Дублир. выделенные', action: NodeAction.CTRL_D });
        }

        if (type && type != "folder") {
            assets_menu_list.push({ text: 'Скачать', action: NodeAction.download });
        }
        if (type) {
            assets_menu_list.push({ text: 'Переименовать', action: NodeAction.rename });
        }
        if (selected_assets.length == 1) {
            assets_menu_list.push({ text: 'Удалить', action: NodeAction.remove });
        }
        else if (selected_assets.length > 1) {
            assets_menu_list.push({ text: 'Удал. выделенные', action: NodeAction.remove });
        }
        return assets_menu_list;
    }

    async function menuContextClick(success: boolean, action?: number | string): Promise<void> {
        if (!success || action == undefined || action == null || current_dir === undefined) return;
        if (action == NodeAction.refresh) {
            await go_to_dir(current_dir, true);
        }
        if (action == NodeAction.open_in_explorer) {
            await ClientAPI.open_explorer(current_dir);
        }
        if (action == NodeAction.material_base) {
            // open_material_popup(asset_path);
        }
        if (action == NodeAction.new_folder) {
            new_folder_popup(current_dir);
        }
        if (action == NodeAction.new_scene) {
            new_scene_popup(current_dir);
        }
        if (active_asset) {
            const path = active_asset.getAttribute('data-path') as string;
            const name = escapeHTML(active_asset.getAttribute('data-name') as string);
            const type = active_asset.getAttribute('data-type') as AssetType | undefined;
            if (action == NodeAction.download)
                download_asset(path, name);

            if (action == NodeAction.rename) {
                rename_popup(path, name, type);
            }
        }
        if (selected_assets.length > 0) {
            if (action == NodeAction.remove) {
                remove_popup();
            }
            if (action == NodeAction.CTRL_X) {
                move_assets_data.assets = selected_assets.slice();
                move_assets_data.move_type = "move";
                log("cut assets, amount = ", move_assets_data.assets.length);
            }
            if (action == NodeAction.CTRL_C) {
                move_assets_data.assets = selected_assets.slice();
                move_assets_data.move_type = "copy";
                log("copy assets, amount = ", move_assets_data.assets.length);
            }
            if (action == NodeAction.CTRL_D) {
                for (const element of selected_assets) {
                    const path = element.getAttribute('data-path') as string;
                    const name = escapeHTML(element.getAttribute('data-name') as string);
                    await duplicate_asset(path, name);
                };
                await go_to_dir(current_dir ? current_dir : "", true);
            }
        }
        if (move_assets_data.assets.length > 0) {
            if (action == NodeAction.CTRL_V) {
                await paste_assets()
            }
        }
    }

    async function paste_assets() {
        const move_type = move_assets_data.move_type;
        for (const element of move_assets_data.assets) {
            const name = escapeHTML(element.getAttribute('data-name') as string);
            const path = escapeHTML(element.getAttribute("data-path") as string);
            await paste_asset(name, path, move_type);
        }
        move_assets_data.assets.splice(0);
        move_assets_data.move_type = undefined;
        await go_to_dir(current_dir ? current_dir : "", true);
    }

    function new_folder_popup(current_path: string) {
        Popups.open({
            type: "Rename",
            params: { title: "Новая папка:", button: "Ok", auto_close: true },
            callback: async (success, name) => {
                if (success && name) {
                    const r = await ClientAPI.new_folder(current_path, name);
                    if (r.result === 0)
                        error_popup(`Не удалось создать папку, ответ сервера: ${r.message}`);
                    if (r.result && r.data) {
                        await go_to_dir(current_path, true);
                    }
                }
            }
        });
    }

    async function new_scene(path: string, name: string) {
        const scene_path = `${path}/${name}.${SCENE_EXT}`
        const r = await ClientAPI.save_data(scene_path, JSON.stringify({ scene_data: [] }));
        if (r.result === 0) {
            error_popup(`Не удалось создать сцену, ответ сервера: ${r.message}`);
            return;
        }
        if (r.result && r.data) {
            await go_to_dir(path, true);
        }
        return scene_path;
    }

    function new_scene_popup(current_path: string, set_scene_current = false, save_scene = false) {
        Popups.open({
            type: "Rename",
            params: { title: "Новая сцена:", button: "Ok", auto_close: true },
            callback: async (success, name) => {
                if (success && name) {
                    const scene_path = await new_scene(current_path, name);
                    if (scene_path != undefined && set_scene_current) {
                        const scene_is_set = await set_current_scene(scene_path);
                        if (scene_is_set && save_scene)
                            save_current_scene();
                    }
                }
            }
        });
    }

    function save_graph_popup(current_path: string, data: any) {
        const currentName = data.name;
        Popups.open({
            type: "Rename",
            params: { title: "Сохранить элемент сцены:", button: "Ok", currentName, auto_close: true },
            callback: async (success, name) => {
                if (success && name) {
                    const path = `${current_path}/${name}.${SCENE_EXT}`;

                    ResourceManager.cache_scene(path, data);

                    // NOTE: для чего сохраянем как IBaseEntityData[] ?
                    const r = await ClientAPI.save_data(path, JSON.stringify({ scene_data: [data] }))
                    if (r && r.result)
                        Popups.toast.success(`Объект ${name} сохранён, путь: ${path}`);
                    else
                        return Popups.toast.error(`Не удалось сохранить объект ${name}`);
                }
            }
        });
    }

    function rename_popup(asset_path: string, name: string, type?: AssetType) {
        let type_name = "файл";
        if (type == "folder") type_name = "папку";
        Popups.open({
            type: "Rename",
            params: { title: `Переименовать ${type_name} ${name}`, button: "Ok", currentName: name, auto_close: true },
            callback: async (success, name) => {
                if (success && name) {
                    const new_path = (current_dir) ? `${current_dir}/${name}` : name;
                    const r = await ClientAPI.rename(asset_path, new_path);
                    if (r.result === 0)
                        error_popup(`Не удалось переименовать ${type_name}, ответ сервера: ${r.message}`);
                    if (r.result) {
                        const ext = getFileExt(name);
                        if (texture_ext.includes(ext)) {
                            ResourceManager.preload_texture("/" + new_path);
                        }
                        if (model_ext.includes(ext)) {
                            ResourceManager.preload_model("/" + new_path);
                        }
                        if (ext == FONT_EXT) {
                            ResourceManager.preload_font("/" + new_path);
                        }
                        if (current_dir)
                            await go_to_dir(current_dir, true);
                    }
                }
            }
        });
    }

    function remove_popup() {
        let title = "";
        let text = "";
        const name = active_asset?.getAttribute('data-name');
        const type = active_asset?.getAttribute('data-type');
        let remove_type: "selected" | "active" | undefined = undefined;
        if (selected_assets.length > 1) {
            title = "Удаление файлов";
            text = "Удалить выбранные файлы?";
            remove_type = "selected";
        }
        else if (active_asset) {
            title = "Удаление файла";
            let type_name = "файл";
            if (type == "folder") type_name = "папку";
            text = `Удалить ${type_name} ${name}?`;
            remove_type = "active";
        }
        if (remove_type) {
            Popups.open({
                type: "Confirm",
                params: { title, text, button: "Да", buttonNo: "Нет", auto_close: true },
                callback: async (success) => {
                    if (success) {
                        await remove_assets(remove_type);
                    }
                }
            });
        }
    }

    function error_popup(message: string) {
        Popups.open({
            type: "Notify",
            params: { title: "Ошибка", text: message, button: "Ok", auto_close: true },
            callback: () => { }   // (success: boolean) => void
        });
    }

    async function download_asset(path: string, name: string) {
        const resp = await api.GET(`${URL_PATHS.ASSETS}/${path}`);
        if (!resp) return;
        const blob = await resp.blob();
        let fileURL = URL.createObjectURL(blob);
        let fileLink = document.createElement('a');
        fileLink.href = fileURL;
        fileLink.download = name;
        fileLink.click();
    }

    async function remove_assets(remove_type: "selected" | "active" | undefined) {
        const to_remove: string[] = [];
        if (remove_type == "selected") {
            selected_assets.forEach((elem) => {
                const path = elem.getAttribute('data-path');
                if (path)
                    to_remove.push(path);
            })
        }
        else if (remove_type == "active") {
            const path = active_asset?.getAttribute('data-path');
            to_remove.push(path as string);
        }
        let result = 1;
        for (const path of to_remove) {
            const r = await ClientAPI.remove(path);
            result == result && r.result;
        }
        if (!result)
            error_popup(`Некоторые файлы не удалось удалить`);
        await go_to_dir(current_dir ? current_dir : "", true);
    }

    async function paste_asset(name: string, path: string, move_type?: string) {
        const move_to = (current_dir) ? `${current_dir as string}/${name}` : name;
        if (move_type == "move") {
            const resp = await ClientAPI.move(path, move_to);
            if (resp && resp.result === 1) {
                EventBus.trigger("SYS_ASSET_MOVED", { name, path, new_path: move_to }, false);
            }
            else if (resp.result === 0) {
                error_popup(`Не удалось переместить файл ${name}, ответ сервера: ${resp.message}`);
            }
        }
        if (move_type == "copy") {
            const resp = await ClientAPI.copy(path, move_to);
            if (resp && resp.result === 1) {
                EventBus.trigger("SYS_ASSET_COPIED", { name, path, new_path: move_to }, false);
            }
            else if (resp.result === 0) {
                error_popup(`Не удалось скопировать файл ${name}, ответ сервера: ${resp.message}`);
            }
        }
    }

    async function duplicate_asset(path: string, name: string) {
        const ext = "." + getFileExt(name);
        let base_name = name.replace(ext, "");
        const get_folder_resp = await ClientAPI.get_folder(current_dir as string);
        if (!get_folder_resp || get_folder_resp.result === 0) return;
        const folder_content = get_folder_resp.data as FSObject[];
        const names: string[] = [];
        let names_counter = 0;
        folder_content.forEach(elem => {
            const elem_ext = "." + getFileExt(elem.name);
            const elem_base_name = elem.name.replace(elem_ext, "");
            // TODO: Возможно стоит полностью скопировать логику выдачи имён для дублей у файловой системы
            const regex = new RegExp(String.raw`^(${escapeRegex(base_name)})\s*\(\d+\)$`);
            const match = elem_base_name.match(regex);
            const matched_elem_name = match ? match[1] : elem_base_name;
            if (matched_elem_name == base_name && elem_ext == ext) {
                names_counter++;
                names.push(elem.name);
            }
        });
        const new_name = (names_counter !== 0) ? `${base_name} (${names_counter})${ext}` : name;
        const move_to = `${current_dir}/${new_name}`;
        const resp = await ClientAPI.copy(path, move_to);
        if (resp && resp.result === 1) {
            EventBus.trigger("SYS_ASSET_COPIED", { name, path, new_path: move_to }, false);
        }
    }

    async function on_file_upload(resp: Response) {
        const resp_text = await resp.text();
        if (!json_parsable(resp_text))
            return;
        const resp_json = JSON.parse(resp_text) as ServerResponses[typeof FILE_UPLOAD_CMD];
        if (resp_json.result === 1 && resp_json.data) {
            const data = resp_json.data;
            console.log(`file ${data.name} uploaded in dir ${data.path}`);
            EventBus.trigger("SYS_FILE_UPLOADED", data, false)
        }
    }

    function on_fs_events(message: Messages['SERVER_FILE_SYSTEM_EVENTS']) {
        const events = message.events;
        let renew_required = false;
        if (events && events.length != 0) {
            events.forEach(async event => {
                if (event.project === current_project) {
                    if (event.folder_path === current_dir) {
                        renew_required = true;
                    }
                    if (event.ext) {
                        if (event.event_type == "change" || event.event_type == "rename") {
                            if (texture_ext.includes(event.ext))
                                await ResourceManager.preload_texture("/" + event.path);
                            if (model_ext.includes(event.ext))
                                await ResourceManager.preload_model("/" + event.path);
                            if (event.ext == FONT_EXT)
                                await ResourceManager.preload_font("/" + event.path);
                        }
                        else if (event.event_type == "remove") {
                            if (texture_ext.includes(event.ext)) {
                                const name = get_file_name(event.path);
                                ResourceManager.free_texture(name);
                            }
                            // if (model_ext.includes(event.ext)) {
                            //     const name = get_file_name(event.path);
                            //     ResourceManager.free_model(name);
                            // }
                        }
                    }
                }
            });
        }
        if (renew_required)
            renew_current_dir();
    }

    async function draw_empty_project() {
        // draw_assets();
        generate_breadcrumbs('')
    }

    async function handle_asset_drop(dir_to: string) {
        drag_asset_now = false;
        if (selected_assets.length != 0) {
            selected_assets.forEach(async element => {
                const asset_path = element.getAttribute('data-path') as string;
                const name = element.getAttribute('data-name') as string;
                const move_to = `${dir_to}/${name}`;
                const r = await ClientAPI.move(asset_path, move_to);
                if (r && r.result === 1)
                    // обновляем текущую папку, чтобы отобразить изменившееся число файлов в той папке, куда переместили файл
                    await go_to_dir(current_dir as string, true);
                else {
                    error_popup(`Не удалось переместить файл ${name}, ответ сервера: ${r.message}`);
                }
            });
        }
    }

    function clear_selected() {
        if (selected_assets.length == 0) return;

        selected_assets.forEach(element => {
            element.classList.remove("selected");
        });
        selected_assets.splice(0);

        EventBus.trigger("SYS_ASSETS_CLEAR_SELECTED");
    }

    function add_to_selected(elem: HTMLSpanElement) {
        if (selected_assets.includes(elem)) return;
        selected_assets.push(elem);
        elem.classList.add("selected");

        if (elem.getAttribute('data-type') == ASSET_TEXTURE) {
            const textures_paths = get_selected_textures();
            EventBus.trigger("SYS_ASSETS_SELECTED_TEXTURES", { paths: textures_paths });
        }

        if (elem.getAttribute('data-type') == ASSET_MATERIAL) {
            const materials_paths = get_selected_materials();
            EventBus.trigger("SYS_ASSETS_SELECTED_MATERIALS", { paths: materials_paths });
        }

        if (elem.getAttribute('data-type') == ASSET_AUDIO) {
            const audios_paths = get_selected_audios();
            EventBus.trigger("SYS_ASSETS_SELECTED_AUDIOS", { paths: audios_paths });
        }
    }

    function get_selected_textures() {
        const textures = selected_assets.filter(asset => asset.getAttribute('data-type') === ASSET_TEXTURE);
        const textures_paths = textures.map(asset => asset.getAttribute('data-path') || '');
        return textures_paths;
    }

    function get_selected_materials() {
        const materials = selected_assets.filter(asset => asset.getAttribute('data-type') === ASSET_MATERIAL);
        const materials_paths = materials.map(asset => asset.getAttribute('data-path') || '');
        return materials_paths;
    }

    function get_selected_audios() {
        const audios = selected_assets.filter(asset => asset.getAttribute('data-type') === ASSET_AUDIO);
        const audios_paths = audios.map(asset => asset.getAttribute('data-path') || '');
        return audios_paths;
    }

    function set_active(elem: HTMLSpanElement) {
        active_asset = elem;
        active_asset.classList.add("active");
    }

    function clear_active() {
        active_asset?.classList.remove("active");
        active_asset = undefined;
    }

    function remove_from_selected(elem: HTMLSpanElement) {
        selected_assets.splice(selected_assets.indexOf(elem), 1);
        elem.classList.remove("selected");

        const textures_paths = get_selected_textures();
        EventBus.trigger("SYS_ASSETS_SELECTED_TEXTURES", { paths: textures_paths });

        const materials_paths = get_selected_materials();
        EventBus.trigger("SYS_ASSETS_SELECTED_MATERIALS", { paths: materials_paths });

        const audios_paths = get_selected_audios();
        EventBus.trigger("SYS_ASSETS_SELECTED_AUDIOS", { paths: audios_paths });
    }

    function on_mouse_move(event: any) {

    }

    function on_mouse_down(event: any) {
        const popup_elem = event.target.closest('.bgpopup');
        const menu_elem = event.target.closest('.wr_menu__context');
        const menu_popup_elem = event.target.closest('.wr_popup');
        const inspector_elem = event.target.closest('.inspector__body');
        if (!current_project || menu_elem || popup_elem || menu_popup_elem || inspector_elem) return;
        const folder_elem = event.target.closest('.folder.asset');
        const file_elem = event.target.closest('.file.asset');
        const asset_elem = folder_elem ? folder_elem : file_elem ? file_elem : undefined;
        if (event.button === 0 || event.button === 2) {
            if (asset_elem) {
                mouse_down_on_asset = true;
            }
            if (!Input.is_control()) {
                // При нажатии ЛКМ / ПКМ вне всех ассетов либо на ассет не из списка выбранных, и ctrl отпущена, делаем сброс всех выбранных ассетов
                if (!asset_elem || (asset_elem && !selected_assets.includes(asset_elem))) {
                    clear_selected();
                }
            }
        }
    }

    async function on_mouse_up(event: any) {
        drag_asset_now = false;
        const popup_elem = event.target.closest('.bgpopup');
        const menu_elem = event.target.closest('.wr_menu__context');
        const menu_popup_elem = event.target.closest('.wr_popup');
        const inspector_elem = event.target.closest('.inspector__body');
        if (!current_project || menu_elem || popup_elem || menu_popup_elem || inspector_elem) return;
        const folder_elem = event.target.closest('.folder.asset');
        const file_elem = event.target.closest('.file.asset');
        const asset_elem = folder_elem ? folder_elem : file_elem ? file_elem : undefined;
        clear_active();
        if (event.button === 0 || event.button === 2) {
            if (mouse_down_on_asset) {
                mouse_down_on_asset = false;
                if (asset_elem)
                    set_active(asset_elem);
                if (!Input.is_control()) {
                    clear_selected();
                    if (asset_elem)
                        add_to_selected(asset_elem);
                }
                else if (Input.is_control()) {
                    if (asset_elem)
                        if (selected_assets.includes(asset_elem))
                            remove_from_selected(asset_elem);
                        else
                            add_to_selected(asset_elem);
                }
                if (file_elem) {
                    const path = file_elem.getAttribute('data-path');
                    const name = file_elem.getAttribute('data-name');
                    const ext = file_elem.getAttribute('data-ext');
                    log(`Клик на ассет файл ${name}, путь ${path}, проект ${current_project}`);
                    EventBus.trigger("SYS_CLICK_ON_ASSET", { name, path, ext, button: event.button }, false);
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
        }
        else if (event.button === 2 && event.target.closest('.filemanager')) {
            open_menu(event);
            return;
        }
    }

    async function on_key_up(event: any) {
        if (event.key == 'F2' && active_asset && !Popups.is_visible()) {
            const path = active_asset.getAttribute('data-path') as string;
            const name = active_asset.getAttribute('data-name') as string;
            rename_popup(path, name);
        }
        if (event.key == 'Delete' && !Popups.is_visible()) {
            remove_popup();
        }
        if (Input.is_control()) {
            if ((event.key == 'c' || event.key == 'с') && selected_assets.length) {
                move_assets_data.assets = selected_assets.slice();
                move_assets_data.move_type = "copy";
                log("cut assets, amount = ", move_assets_data.assets.length);
            }
            if ((event.key == 'x' || event.key == 'ч') && selected_assets.length) {
                move_assets_data.assets = selected_assets.slice();
                move_assets_data.move_type = "move";
                log("copy assets, amount = ", move_assets_data.assets.length);
            }
            if ((event.key == 'v' || event.key == 'м') && move_assets_data.assets.length) {
                await paste_assets()
            }
        }
    }

    async function open_scene(path: string) {
        const result = await set_current_scene(path);
        if (result) {
            await load_scene(path);
        }
    }

    async function on_dbl_click(event: any) {
        const file_elem = event.target.closest('.file.asset');
        if (file_elem) {
            const ext = file_elem.getAttribute('data-ext');
            const new_path = file_elem.getAttribute('data-path');
            const current_path = current_scene.path;
            if (ext === SCENE_EXT && new_path != current_path) {
                if (current_path != undefined && history_length_cache[current_path] != HistoryControl.get_history(current_scene.path).length)
                    open_scene_exit_popup(current_path, new_path)
                else
                    await open_scene(new_path)
            }
        }
    }

    function open_scene_exit_popup(current_path: string, new_path: string) {
        Popups.open({
            type: "Confirm",
            params: { title: "", text: `У сцены "${current_path}" есть несохранённые изменения, закрыть без сохранения?`, button: "Да", buttonNo: "Нет", auto_close: true },
            callback: async (success) => {
                if (success) {
                    HistoryControl.clear(current_scene.path);
                    await open_scene(new_path);
                }
            }
        });
    }

    async function set_current_scene(path: string) {
        const resp = await ClientAPI.set_current_scene(path);
        if (!resp || resp.result === 0) {
            Popups.toast.error(`Серверу не удалось установить сцену текущей: ${resp.message}`);
            return false;
        }
        current_scene.name = resp.data?.name as string;
        current_scene.path = resp.data?.path as string;
        localStorage.setItem("current_scene_name", current_scene.name);
        localStorage.setItem("current_scene_path", current_scene.path);
        history_length_cache[path] = HistoryControl.get_history(current_scene.path).length;
        return true;
    }

    async function load_scene(path: string) {
        const resp = await ClientAPI.get_data(path);
        if (!resp || resp.result === 0 || !resp.data)
            return Popups.toast.error(`Не удалось получить данные сцены от сервера: ${resp.message}`);
        const data = JSON.parse(resp.data) as TDictionary<IBaseEntityData[]>;
        SceneManager.load_scene(data.scene_data);
        ControlManager.update_graph(true, current_scene.name);
    }

    function loadPartOfSceneInPos(
        pathToScene: string,
        position?: Vector3,
        rotation?: Quaternion,
        scale?: Vector3,
        with_check = false
    ) {
        if (pathToScene.substring(0, 1) != "/")
            pathToScene = `/${pathToScene}`;
        const info = ResourceManager.get_scene_info(pathToScene);
        if (!info) {
            return Log.error(`Не удалось получить данные сцены: ${pathToScene}`);
        }

        if (with_check && !info.is_component) {
            return Log.error(`${pathToScene} не может быть создан, так как он содержит вложенные GO`);
        }

        const obj_data = info.data;
        const root = SceneManager.deserialize_mesh(obj_data, false);

        // NOTE: ищем уникальное имя для root и всех его детей
        const baseName = obj_data.name;
        let counter = 1;
        let uniqueName = baseName;
        while (SceneManager.get_mesh_id_by_url(':/' + uniqueName)) {
            uniqueName = `${baseName}_${counter}`;
            counter++;
        }
        SceneManager.set_mesh_name(root, uniqueName);

        if (position) root.set_position(position.x, position.y, position.z);
        // TODO: set_rotation нету в EntityBase
        // if (rotation) obj.set_rotation(rotation);
        if (scale) root.set_scale(scale.x, scale.y);
        SceneManager.add(root);
        return root;
    }

    async function save_current_scene() {
        if (!current_scene.name && current_dir != undefined) {
            // Если у AssetControl нет данных о текущем открытом файле сцены, создаём новый файл сцены, указаем его 
            // как текущую сцену и сохраняем туда данные из SceneManager
            new_scene_popup(current_dir, true, true);
            return;
        };
        const path = current_scene.path as string;
        const name = current_scene.name as string;
        const data = SceneManager.save_scene();
        const r = await ClientAPI.save_data(path, JSON.stringify({ scene_data: data }));
        if (r && r.result) {
            history_length_cache[path] = HistoryControl.get_history(current_scene.path).length;
            return Popups.toast.success(`Сцена ${name} сохранена, путь: ${path}`);
        }
        else return Popups.toast.error(`Не удалось сохранить сцену ${name}, путь: ${path}: ${r.message}`);
    }

    function save_tilesinfo_popup() {
        // NOTE: если нет директории, то сохраняем в корневую папку
        if (!current_dir) current_dir = '/';
        Popups.open({
            type: "Rename",
            params: { title: "Имя файла:", button: "Ok", auto_close: true, currentName: 'tiles' },
            callback: async (success, name) => {
                if (success && name) {
                    const path = await new_tilesinfo(current_dir!, name);
                    if (path) {
                        save_tilesinfo(path);
                    }
                }
            }
        });
    }

    async function new_tilesinfo(path: string, name: string) {
        const tilesinfo_path = `${path}/${name}.${TILES_INFO_EXT}`
        const r = await ClientAPI.save_data(tilesinfo_path, JSON.stringify({}));
        if (r.result === 0) {
            error_popup(`Не удалось создать tilesinfo, ответ сервера: ${r.message}`);
            return;
        }
        if (r.result && r.data) {
            await go_to_dir(path, true);
        }

        return tilesinfo_path;
    }

    async function save_tilesinfo(path: string) {
        const tiles_data: TDictionary<{ texture?: string, material_name?: string, blending?: Blending, color?: string, alpha?: number, uniforms?: TDictionary<any> }> = {};
        SceneManager.get_scene_list().forEach(mesh => {
            if (!is_tile(mesh)) return;

            const hash = get_hash_by_mesh(mesh);
            const current_texture = `${mesh.get_texture()[1]}/${mesh.get_texture()[0]}`;

            if (ResourceManager.tiles_info[hash] != current_texture) {
                tiles_data[hash] = {
                    texture: current_texture
                };
            }

            const material = (mesh as Slice9Mesh).material;
            if (!material) {
                Log.warn(`Material not found for tile ${mesh.name}`);
                return;
            }

            const default_material_name = 'slice9';
            if (material.name != default_material_name) {
                if (!tiles_data[hash]) tiles_data[hash] = {};
                tiles_data[hash].material_name = material.name;
            }

            const default_blend_mode = BlendMode.NORMAL;
            const current_blend_mode = convertThreeJSBlendingToBlendMode(material.blending);
            const is_not_equal_blend_mode = current_blend_mode != default_blend_mode;
            if (is_not_equal_blend_mode) {
                if (!tiles_data[hash]) tiles_data[hash] = {};
                tiles_data[hash].blending = convertBlendModeToThreeJS(current_blend_mode);
            }

            const default_color = '#fff';
            const current_color = mesh.get_color();
            const is_not_equal_color = current_color != default_color;
            if (is_not_equal_color) {
                if (!tiles_data[hash]) tiles_data[hash] = {};
                tiles_data[hash].color = current_color;
            }

            const changed_uniforms = ResourceManager.get_changed_uniforms_for_mesh(mesh as Slice9Mesh);
            if (changed_uniforms) {
                Object.keys(changed_uniforms).forEach((key) => {
                    if (key != 'u_texture') return;
                    delete changed_uniforms[key];
                });
                if (Object.keys(changed_uniforms).length > 0) {
                    if (!tiles_data[hash]) tiles_data[hash] = {};
                    tiles_data[hash].uniforms = changed_uniforms;
                }
            }
        });

        const r = await ClientAPI.save_data(path, JSON.stringify(tiles_data));
        if (r && r.result) return Popups.toast.success(`Тайлы сохранены, путь: ${path}`);
        else return Popups.toast.error(`Не удалось сохранить тайлы, путь: ${path}: ${r.message}`);
    }

    function get_current_scene() {
        return current_scene;
    }

    async function on_graph_drop(id: number) {

        const scene_object = SceneManager.get_mesh_by_id(id);
        if (scene_object) {
            const data = SceneManager.serialize_mesh(scene_object);
            save_graph_popup(current_dir as string, data);
        }
    }

    drop_zone.addEventListener("dragenter", function (e) {
        e.preventDefault();
        drag_for_upload_now = true;
    });

    filemanager.addEventListener("dragover", function (e) {
        e.preventDefault();
        if (e.dataTransfer)
            e.dataTransfer.dropEffect = 'copy';
    });

    drop_zone.addEventListener("dragleave", function (e) {
        e.preventDefault();
    });

    drop_zone.addEventListener("drop", async function (e) {
        e.preventDefault();
        if (drag_for_upload_now)
            await on_drop_upload(e);
    });

    async function on_drop_upload(event: DragEvent) {
        drag_for_upload_now = false;
        if (current_project == undefined || current_dir == undefined) {
            Log.warn('Попытка загрузить файл на сервер, но никакой проект не загружен');
            return;
        }
        if (event.dataTransfer != null) {
            const files = Array.from(event.dataTransfer.files);
            if (files.length > 0) {
                upload_files(files);
            }
        }
    }

    async function upload_files(files: File[],) {
        for (const file of files) {
            const data = new FormData();
            log(`trying upload a file: ${file.name} in dir ${current_dir}`);
            data.append('file', file, file.name);
            data.append('path', current_dir as string);
            const resp = await api.POST(URL_PATHS.UPLOAD, [], data);
            if (resp)
                await on_file_upload(resp);
        }
    }

    async function reload_current_project() {
        if (current_project) {
            const load_project_resp = await ClientAPI.load_project(current_project);
            if (load_project_resp.result !== 1) {
                log(`Failed to reload current project (${current_project})`);
                return;
            }
            const data = load_project_resp.data as ProjectLoadData;
            let to_dir = (current_dir) ? current_dir : "";

            await load_project(data, undefined, to_dir);
            if (current_scene.path)
                await set_current_scene(current_scene.path);
        }
    }

    init();
    return {
        load_project, new_scene, new_scene_popup, save_current_scene, open_scene, set_current_scene, draw_assets, get_file_data, save_file_data, save_base64_img, draw_empty_project, get_current_scene, select_file, loadPartOfSceneInPos
    };
}

function escapeHTML(text: string) {
    return text.replace(/\&/g, '&amp;').replace(/\</g, '&lt;').replace(/\>/g, '&gt;');
}

function escapeRegex(text: string) {
    return text.replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&');
}

function bytesToSize(bytes: number) {
    var sizes = ['б', 'Кб', 'Мб'];
    if (bytes == 0) return '0 байт';
    var i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i)) + ' ' + sizes[i];
}

function getFileExt(path: string) {
    var ar = path.split(".");
    return ar[ar.length - 1];
}

function fileIsImg(path: string) {
    var ext = getFileExt(path);
    return (texture_ext.includes(ext));
}

export async function run_debug_filemanager(project_to_load: string) {
    let server_ok = false;
    const resp = await ClientAPI.test_server_ok();
    if (resp) {
        const text_response = await resp.text();
        const resp_data = JSON.parse(text_response);
        server_ok = resp_data.result === 1;
    }
    if (server_ok) {
        WsClient.set_reconnect_timer(WS_SERVER_URL, WS_RECONNECT_INTERVAL);
        const projects = await ClientAPI.get_projects();
        const names: string[] = [];
        // Ищем проект с именем project_to_load и пробуем его загрузить
        for (const project of projects) {
            names.push(project);
        }
        // Достаём данные о последнем открытом проекте
        const current_project = localStorage.getItem("current_project");
        const current_dir = localStorage.getItem("current_dir");
        //const current_scene_name = localStorage.getItem("current_scene_name");
        //const current_scene_path = localStorage.getItem("current_scene_path");
        // Если проект project_to_load существует, пробуем загрузить
        if (names.includes(project_to_load)) {
            const r = await ClientAPI.load_project(project_to_load);
            if (r.result === 1) {
                const data = r.data as ProjectLoadData;
                let assets: FSObject[] | undefined = data.assets;
                let go_to_dir: string | undefined = undefined;
                // Если project_to_load это последний открытый проект, будем переходить в последнюю открытую папку
                if (project_to_load === current_project && current_dir) {
                    assets = undefined;
                    go_to_dir = current_dir;
                }
                await AssetControl.load_project(data, assets, go_to_dir);
                log('Project loaded', data.name);
                return;
            }
        }
        log(`Failed to load project ${project_to_load}`);
    }
    else {
        log('Server does not respond, cannot run debug filemanager');
        await AssetControl.draw_empty_project();
    }
}

