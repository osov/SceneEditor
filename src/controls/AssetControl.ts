import { SERVER_URL, WS_RECONNECT_INTERVAL, WS_SERVER_URL } from "../config";
import { AssetType, FILE_UPLOAD_CMD, FSObject, ProjectCache, ProjectLoadData, SCENE_EXT, ServerResponses, TDictionary, TRecursiveDict, URL_PATHS } from "../modules_editor/modules_editor_const";
import { _span_elem, json_parsable } from "../modules/utils";
import { Messages } from "../modules/modules_const";
import { contextMenuItem } from "../modules_editor/ContextMenu";
import { NodeAction } from "./ActionsControl";
import { api } from "../modules_editor/ClientAPI";
import { TextureData } from "../render_engine/resource_manager";
import { IBaseEntityData } from "../render_engine/types";

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
    let move_assets_data: {assets: Element[], move_type?: "move" | "copy"} = {assets: []};
    let current_dir: string | undefined = undefined;
    let current_project: string | undefined = undefined;
    let current_scene: {path?: string, name?: string} = {};
    let drag_for_upload_now = false;
    let drag_asset_now = false;

    async function load_project(name: string, folder_content?: FSObject[], to_dir?: string) {
        current_project = name;
        if (folder_content && to_dir == undefined) {
            current_dir = "";
            draw_assets(folder_content);
            generate_breadcrumbs(current_dir);
        }
        else if (to_dir != undefined) {
            await go_to_dir(to_dir);
        }
    }

    async function go_to_dir(path: string, renew = false) {
        if (!current_project) return;
        if (current_dir === path && !renew) return;
        const resp = await ClientAPI.get_folder(path);
        if (resp.result === 1 && resp.data != undefined) {
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
                const icon_elem = _span_elem("", ["icon", "folder"]);
                if (num_files) {
                    icon_elem.classList.add("full");
                }
                if (num_files == 1)
                    items_length = `${num_files} Файл`;
                else if (num_files > 1)
                    items_length = `${num_files} Файлов`;
                else
                    items_length = 'Пусто';
                const details_elem = _span_elem(items_length, ["details"]);
                const name_elem = _span_elem(name, ["name"]);
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
                let icon_elem = _span_elem(`.${ext}`, ["icon", "file"]);
                const details_elem = _span_elem(file_size, ["details"]);
                icon_elem.classList.add("drag", `f-${ext}`);
                const name_elem = _span_elem(name, ["name"]);
                if (file_type == "mtr") {
                    asset_type = "material";
                }
                else if (fileIsImg(_path)) {
                    asset_type = "texture";
                    icon_elem = document.createElement("img");
                    icon_elem.setAttribute("src", src_url.toString());
                    icon_elem.setAttribute("draggable", "false");
                    icon_elem.classList.add("icon", "img", "drag");
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
                file_elem.addEventListener("dragstart", function(e) {
                    drag_asset_now = true;
                })
                assets_list.appendChild(file_elem);
            });
        }
        assets_list.hidden = false;
    }

    async function get_file_data(path: string) {
        return await ClientAPI.get_data(path);
    }

    async function save_file_data(path: string, data: string) {
        await ClientAPI.save_data(path, data);
    }

    async function save_meta_info(path: string, data: TRecursiveDict) {
        await ClientAPI.save_info(path, data);
    }

    async function get_meta_info(path: string) {
        const resp = await ClientAPI.get_info(path);
        if (resp && resp.result === 1 && resp.data) {
            return resp.data;
        }
        return undefined;
    }

    async function del_meta_info(path: string) {
        await ClientAPI.del_info(path);
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
                const arrow = _span_elem("→", ["arrow"]);
                const a_elem = document.createElement("a");
                const span_elem = _span_elem(name, ["folderName"]);
                const _path = u.replace("/", "");
                span_elem.setAttribute("data-path", _path);
                span_elem.setAttribute("data-type", asset_type);
                a_elem.setAttribute("href", "javascript:void(0);");
                a_elem.appendChild(span_elem);
                breadcrumbs.appendChild(a_elem);
                breadcrumbs.appendChild(arrow);
                span_elem.addEventListener("drop", async (e) => {
                    if (drag_asset_now) 
                        await handle_asset_drop(_path);
                });
                span_elem.addEventListener("dragenter", async (e) => {
                    if (drag_asset_now) 
                        span_elem.classList.add("marked");
                });
                span_elem.addEventListener("dragleave", async (e) => {
                    if (drag_asset_now) 
                        span_elem.classList.remove("marked");
                });
            }
            else {
                const span_elem = _span_elem(name, ["folderName"]);
                breadcrumbs.appendChild(span_elem);
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
        const r = await ClientAPI.save_data(scene_path, {scene_data: []});
        if (r.result === 0)
            error_popup(`Не удалось создать сцену, ответ сервера: ${r.message}`);
        if (r.result && r.data) {
            await go_to_dir(path, true);
        }
        return scene_path;
    }

    function new_scene_popup(current_path: string) {
        Popups.open({
            type: "Rename",
            params: { title: "Новая сцена:", button: "Ok", auto_close: true },
            callback: async (success, name) => {
                if (success && name) {
                    await new_scene(current_path, name);
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
                    if (r.result && r.data && current_dir) {
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
                EventBus.trigger("SYS_ASSET_MOVED", { name, path, new_path: move_to });
            }
            else if (resp.result === 0) {
                error_popup(`Не удалось переместить файл ${name}, ответ сервера: ${resp.message}`);
            }
        }
        if (move_type == "copy") {
            const resp = await ClientAPI.copy(path, move_to);
            if (resp && resp.result === 1) {
                EventBus.trigger("SYS_ASSET_COPIED", { name, path, new_path: move_to });
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
            EventBus.trigger("SYS_ASSET_COPIED", { name, path, new_path: move_to });
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
            EventBus.trigger("SYS_FILE_UPLOADED", data)
        }
    }

    function on_fs_events(message: Messages['SERVER_FILE_SYSTEM_EVENTS']) {
        const events = message.events;
        let renew_required = false;
        if (events && events.length != 0) {
            events.forEach(event => {
                if (event.project === current_project && event.path === current_dir) {
                    renew_required = true;
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
        selected_assets.forEach(element => {
            element.classList.remove("selected");
        });
        selected_assets.splice(0);
    }

    function add_to_selected(elem: HTMLSpanElement) {
        if (selected_assets.includes(elem)) return;
        selected_assets.push(elem);
        elem.classList.add("selected");
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
    }

    function onMouseMove(event: any) {

    }

    function onMouseDown(event: any) {
        const popup_elem = event.target.closest('.bgpopup');
        const menu_elem = event.target.closest('.wr_menu__context');
        const menu_popup_elem = event.target.closest('.wr_popup');
        if (!current_project || menu_elem || popup_elem || menu_popup_elem) return;
        const folder_elem = event.target.closest('.folder.asset');
        const file_elem = event.target.closest('.file.asset');
        const asset_elem = folder_elem ? folder_elem : file_elem ? file_elem : undefined;
        if (event.button === 0 || event.button === 2) {
            if (!Input.is_control()) {
                // При нажатии ЛКМ / ПКМ вне всех ассетов либо на ассет не из списка выбранных, и ctrl отпущена, делаем сброс всех выбранных ассетов
                if (!asset_elem || (asset_elem && !selected_assets.includes(asset_elem)))
                        clear_selected();
                // Если ctrl отпущена, при нажатии ЛКМ или ПКМ на ассет просто добавляем его в список выбранных
                if (asset_elem && (!ContextMenu.isVisible()))
                    add_to_selected(asset_elem);  
            }

            else if (Input.is_control()) {
                if (asset_elem && event.button === 0)
                    // Если ctrl нажата, добавляем ассет в список выбранных при нажатии ЛКМ на него, если его нет в этом списке
                    if (!selected_assets.includes(asset_elem) && (!ContextMenu.isVisible())) 
                        add_to_selected(asset_elem);  
                    // Либо убираем если он уже в списке
                    else
                        remove_from_selected(asset_elem);
            } 
        }
    }

    async function onMouseUp(event: any) {
        const popup_elem = event.target.closest('.bgpopup');
        const menu_elem = event.target.closest('.wr_menu__context');
        const menu_popup_elem = event.target.closest('.wr_popup');
        if (!current_project || menu_elem || popup_elem || menu_popup_elem) return;
        const folder_elem = event.target.closest('.folder.asset');
        const file_elem = event.target.closest('.file.asset');
        clear_active();
        if (event.button === 0 || event.button === 2) {
            if (folder_elem) {
                set_active(folder_elem);
                add_to_selected(folder_elem);
            }
            if (file_elem) {
                set_active(file_elem);
                add_to_selected(file_elem);
                const path = file_elem.getAttribute('data-path');
                const name = file_elem.getAttribute('data-name');
                const ext = file_elem.getAttribute('data-ext');
                log(`Клик на ассет файл ${name}, путь ${path}, проект ${current_project}`);
                EventBus.trigger("SYS_CLICK_ON_ASSET", { name, path, ext, button: event.button });
            }
            const breadcrumbs_elem = event.target.closest('a .folderName');
            if (breadcrumbs_elem !== null && event.button === 0) {
                const path = breadcrumbs_elem.getAttribute('data-path');
                return await go_to_dir(path);
            }
        }
        if (event.button === 0) {
            if (folder_elem)  {
                const path = folder_elem.getAttribute('data-path');
                return await go_to_dir(path);
            }
        }
        else if (event.button === 2 && event.target.closest('.filemanager')) {
            open_menu(event);
            return;
        }
    }

    async function onKeyUp(event: any) {
        if (event.key == 'F2' && active_asset) {
            const path = active_asset.getAttribute('data-path') as string;
            const name = active_asset.getAttribute('data-name') as string;
            rename_popup(path, name);
        }
        if (event.key == 'Delete') {
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

    async function onDblClick(event: any) {
        const file_elem = event.target.closest('.file.asset');
        if (file_elem) {
            const path = file_elem.getAttribute('data-path');
            const ext = file_elem.getAttribute('data-ext');
            if (ext === SCENE_EXT) {
                const result = await set_current_scene(path);
                if (result) 
                    await load_scene(path);
            }
        }
    }

    async function set_current_scene(path: string) {
        const r1 = await ClientAPI.set_current_scene(path);
        if (!r1 || r1.result === 0) {
            Popups.toast.error(`Не удалось сделать сцену текущей: ${r1.message}`);
            return false;
        }
        current_scene.name = r1.data?.name as string;
        current_scene.path = r1.data?.path as string;
        return true;
    }

    async function load_scene(path: string) {
        const r2 = await ClientAPI.get_data(path);
        if (!r2 || r2.result === 0)
            return Popups.toast.error(`Не удалось получить данные сцены: ${r2.message}`);
        const data = r2.data as TDictionary<IBaseEntityData[]>;
        SceneManager.load_scene(data.scene_data);
        ControlManager.update_graph(true, current_scene.name);
    }
    
    async function save_current_scene(event?: any) {
        if (!current_scene.name) return;
        const path = current_scene.path as string;
        const name = current_scene.name as string;
        const data = SceneManager.save_scene();
        const r = await ClientAPI.save_data(path, {scene_data: data});
        if (!r || r.result === 0)
            return Popups.toast.error(`Не удалось сохранить сцену ${name}, путь: ${path}: ${r.message}`);
        else
            return Popups.toast.success(`Сцена ${name} сохранена, путь: ${path}`);
    }

    if (filemanager) {
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
            await handle_upload_drop(e);
        });
    }

    async function handle_upload_drop(event: DragEvent) {
        if (!drag_for_upload_now) return;
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

    document.querySelector('.filemanager')?.addEventListener('contextmenu', (event: any) => {
        event.preventDefault();
    });
    EventBus.on('SYS_VIEW_INPUT_KEY_UP', onKeyUp);
    EventBus.on('SYS_INPUT_POINTER_DOWN', onMouseDown);
    EventBus.on('SYS_INPUT_POINTER_MOVE', onMouseMove);
    EventBus.on('SYS_INPUT_POINTER_UP', onMouseUp);
    EventBus.on('SYS_INPUT_DBL_CLICK', onDblClick);
    EventBus.on('SYS_INPUT_SAVE', save_current_scene);

    EventBus.on('SERVER_FILE_SYSTEM_EVENTS', on_fs_events);

    EventBus.on('LOADED_PROJECT', async (m) => {
        if (m.name && m.current_dir) {
            const load_project_resp = await ClientAPI.load_project(m.name);
            if (load_project_resp.result !== 1) {
                log(`Failed to load previously loaded project ${m.name}`);
                return;
            }
            const data = load_project_resp.data as { assets: FSObject[], name: string };
            // Устанавливаем текущий проект для ассет менеждера
            AssetControl.load_project(data.name, undefined, m.current_dir);
        }
    });

    return { 
        load_project, new_scene, set_current_scene, load_scene, save_current_scene, draw_assets, get_file_data, save_file_data, save_meta_info, 
        get_meta_info, del_meta_info, draw_empty_project 
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

function getFileName(path: string) {
    var ar = path.split("/");
    return ar[ar.length - 1];
}

function getFilePath(path: string) {
    var fn = getFileName(path);
    return path.slice(0, path.length - fn.length);
}

function fileIsImg(path: string) {
    var ext = getFileExt(path);
    return (['png', 'jpg', 'jpeg', 'gif'].includes(ext));
}

export async function run_debug_filemanager() {
    let server_ok = false;
    let project_loaded = false;
    const resp = await ClientAPI.test_server_ok();
    if (resp) {
        const text_response = await resp.text();
        const resp_data = JSON.parse(text_response);
        server_ok = resp_data.result === 1;
    }
    if (server_ok) {
        WsClient.set_reconnect_timer(WS_SERVER_URL, WS_RECONNECT_INTERVAL);
        const projects = await ClientAPI.get_projects();
        const project_to_load = 'SceneEditor_ExampleProject';
        const names: string[] = [];
        // Ищем проект с именем project_to_load и пробуем его загрузить
        for (const project of projects) {
            names.push(project);
        }
        // Достаём данные о последнем открытом проекте
        let last_project_data: ProjectCache = { name: undefined, current_dir: "", current_scene: {} };
        const last_project_r = await ClientAPI.get_current_project();
        if (last_project_r.result) {
            last_project_data = last_project_r.data as ProjectCache;
        }
        // Если проект project_to_load существует, пробуем загрузить
        if (names.includes(project_to_load)) {
            const r = await ClientAPI.load_project(project_to_load);
            if (r.result === 1) {
                const data = r.data as ProjectLoadData;
                let assets: FSObject[] | undefined = data.assets;
                let go_to_dir: string | undefined = undefined;
                // Если project_to_load это последний открытый проект, будем переходить в последнюю открытую папку
                if (project_to_load === last_project_data.name) {
                    assets = undefined;
                    go_to_dir = last_project_data.current_dir;
                }
                const list:Promise<TextureData>[] = [];
                for (const path of data.textures_paths) 
                    list.push(ResourceManager.preload_texture("/" + path));
                await Promise.all(list);
                AssetControl.load_project(data.name, assets, go_to_dir);
                log('Project loaded', data.name);
                return;
            }
        }
        // Если не удалось загрузить project_to_load, пробуем загрузить последний открытый проект
        if (last_project_data.name) {
            AssetControl.load_project(last_project_data.name, undefined, last_project_data.current_dir);
            log('Previously opened project loaded', last_project_data.name);
            return;
        }

        log('Failed to load any project!');
    }
    else {
        log('Server does not respond, cannot run debug filemanager');
        AssetControl.draw_empty_project();
    }

}

