import { WatchEventType } from "fs";
import { SERVER_URL, WS_SERVER_URL } from "../config";
import { FILE_UPLOAD_CMD, ServerResponses, URL_PATHS } from "../modules_editor/modules_editor_const";
import { _span_elem, json_parsable } from "../modules/utils";
import { Messages } from "../modules/modules_const";
import { contextMenuItem } from "../modules_editor/ContextMenu";
import { NodeAction } from "./ActionsControl";

declare global {
    const AssetControl: ReturnType<typeof AssetControlCreate>;
}

export function register_asset_control() {
    (window as any).AssetControl = AssetControlCreate();
}

export type FileUploadedData = { size: number, path: string, name: string, project: string };

export type FSObjectType = "folder" | "file" | "null";

export type AssetType = "folder" | "material" | "texture" | "other";

export type FSEventType = WatchEventType | "removed";

export interface FSObject { name: string, type: FSObjectType, size: number, path: string, ext?: string, num_files?: number, src?: string };


function AssetControlCreate() {
    const filemanager = document.querySelector('.filemanager') as HTMLDivElement;
    const breadcrumbs = filemanager.querySelector('.breadcrumbs') as HTMLDivElement;
    const assets_list = filemanager.querySelector('.assets_list') as HTMLDivElement;
    const menu: any = document.querySelector('.fm_wr_menu') as HTMLDivElement;
    let active_asset: Element | undefined = undefined;
    let menu_visible = false;
    let current_dir: string | undefined = undefined;
    let current_project: string | undefined = undefined;
    let copy_asset_path: string | undefined = "";
    let cut_asset_path: string | undefined = "";
    let moving_asset_name: string | undefined = undefined;
    let drag_now = false;

    async function load_project(name: string, folder_content?: FSObject[], to_dir?: string) {
        current_project = name;
        if (folder_content && to_dir == undefined) {
            current_dir = "";
            draw_assets(folder_content);
            generate_breadcrumbs(current_dir);
        }
        else if (to_dir != undefined) {
            go_to_dir(to_dir);
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
                log('refresh current assets dir ok');
        }
        else Log.warn('cannot go to dir:', path)
    }

    async function renew_current_dir() {
        if (current_project == undefined || current_dir == undefined) return;
        go_to_dir(current_dir, true);
    }

    function draw_assets(list: FSObject[]) {
		const scanned_folders: FSObject[] = [];
		const scanned_files: FSObject[] = [];
		list.forEach(function (d)
		{
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

		if(scanned_folders.length) {
			scanned_folders.forEach(function(f) {   
                const num_files = f.num_files as number;
				const _path = f.path.replaceAll('\\', '/');
                const asset_type: AssetType = "folder";
				let items_length = '';
                let name = escapeHTML(f.name);
                const icon_elem = _span_elem("", ["icon", "folder"]);
				if(num_files) {
                    icon_elem.classList.add("full");
				}
				if(num_files == 1)
					items_length = `${num_files} Файл`;
				else if(num_files > 1)
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
                folder_elem.addEventListener("drop", async function(e) {
                    await drop_into_folder(e, folder_elem);
                });
                
                assets_list.appendChild(folder_elem);
			});
		}

		if(scanned_files.length) {
			scanned_files.forEach(function(f) {
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
                file_elem.setAttribute("draggable", "true");
                file_elem.classList.add("file", "asset");
                file_elem.appendChild(icon_elem);
                file_elem.appendChild(name_elem);
                file_elem.appendChild(details_elem);
                
                assets_list.appendChild(file_elem);
			});
		}
        assets_list.hidden = false;
    }

    async function get_file_data(path: string) {
        if (!current_project) return;
        return await ClientAPI.get_data(path);
    }

    async function save_file_data(path: string, data: string) {
        if (!current_project) return;
        await ClientAPI.save_data(path, data);
    }

    async function save_meta_file_info(path: string, data: string) {
        if (!current_project) return;
        await ClientAPI.save_info(path, data);
    }

    async function get_meta_file_info(path: string) {
        if (!current_project) return;
        return await ClientAPI.get_info(path);
    }

    function generate_breadcrumbs(dir: string) {
        breadcrumbs.innerHTML = "";
        let path = [""];
        if (dir !== "") path = ("/" + dir.replaceAll("\\", "/")).split("/");
		for(let i=1; i < path.length; i++)
			path[i] = path[i-1] + "/" + path[i];
        path.forEach(function (u, i) {
            const temp = u.split("/");
            let name = temp[temp.length-1];
            name = (name === "") ? "Файлы" : name;
            if (i === 0 || i !== path.length - 1) {
                const arrow = _span_elem("→", ["arrow"]);
                const a_elem = document.createElement("a");
                const span_elem = _span_elem(name, ["folderName"]);
                span_elem.setAttribute("data-path", u.replace("/", ""));
                a_elem.setAttribute("href", "javascript:void(0);");
                a_elem.appendChild(span_elem);
                breadcrumbs.appendChild(a_elem);
                breadcrumbs.appendChild(arrow);                  
            }
            else {
                const span_elem = _span_elem(name, ["folderName"]);
                breadcrumbs.appendChild(span_elem);
            }
        });
	}

    async function getFileAsync(dataTranfer: DataTransfer) {
        const files = [];
        log('length', dataTranfer.items.length)
        for (var i = 0; i < dataTranfer.items.length; i++) {
            const item = dataTranfer.items[i];
            if (item.kind === 'file') {
                if (typeof item.webkitGetAsEntry === 'function'){
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
                reader.readEntries(function(entries) {
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
        const type = active_asset?.getAttribute('data-type');
        const assets_menu_list = toggle_menu_options(type as AssetType);
        ContextMenu.open(assets_menu_list, event, menuContextClick);
    }

    function toggle_menu_options(type?: AssetType) {
        const assets_menu_list: contextMenuItem [] = [];
        if (!type) {
            assets_menu_list.push({ text: 'Обновить', action: NodeAction.refresh });
            if (moving_asset_name) 
                assets_menu_list.push({ text: 'Вставить', action: NodeAction.CTRL_V });
            assets_menu_list.push({ text: '+ материал', children: [                                        
                { text: 'Базовый', action: NodeAction.material_base }, 
            ]});  
            assets_menu_list.push({ text: '+ система частиц', action: NodeAction.new_particles });  
            assets_menu_list.push({ text: 'Создать папку', action: NodeAction.new_folder });
        }
        if (type && type != "folder") {
            assets_menu_list.push({ text: 'Скачать', action: NodeAction.download });   
            assets_menu_list.push({ text: 'Вырезать', action: NodeAction.CTRL_X });  
            assets_menu_list.push({ text: 'Копировать', action: NodeAction.CTRL_C });      
        }
        if (type) {
            assets_menu_list.push({ text: 'Переименовать', action: NodeAction.rename });    
            assets_menu_list.push({ text: 'Удалить', action: NodeAction.remove });
        }  
        return assets_menu_list;
    }

    async function menuContextClick(success: boolean, action?: number | string): Promise<void> {
        if(!success || action == undefined || action == null || current_dir === undefined) return;
        if (action == NodeAction.refresh) {
            await go_to_dir(current_dir, true);
        }
        if (action == NodeAction.material_base) {
            // open_material_popup(asset_path);
        }
        if (action == NodeAction.new_folder) {
            new_folder_popup(current_dir);
        }
        if (action == NodeAction.CTRL_V && moving_asset_name) {
            const move_to = `${current_dir}/${moving_asset_name}`;
            let r = {result: 0};
            if (cut_asset_path) {
                r = await ClientAPI.rename(cut_asset_path, move_to);                
            }
            if (copy_asset_path) {
                r = await ClientAPI.copy(copy_asset_path, move_to);   
            }
            if (r.result) go_to_dir(current_dir, true);
            moving_asset_name = undefined;
            cut_asset_path = "";
            copy_asset_path = "";
        }
        if (active_asset) {
            const path = active_asset.getAttribute('data-path') as string;
            const name = active_asset.getAttribute('data-name') as string;
            const type = active_asset.getAttribute('data-type') as AssetType | undefined;
            if (action == NodeAction.download) 
                download_asset(path, name);
            
            if (action == NodeAction.rename) {
                rename_popup(path, name, type);
            }
            if (action == NodeAction.CTRL_X) {
                moving_asset_name = name;
                cut_asset_path = path;
            }
            if (action == NodeAction.CTRL_C) {
                moving_asset_name = name;
                copy_asset_path = path;
            }
            if (action == NodeAction.remove) {
                const asset_path = active_asset.getAttribute("data-path") as string;
                remove_popup(asset_path, name);
            }
        }
    }

    function new_folder_popup(current_path: string) {
        Popups.open({
            type: "Rename",
            params: {title: "Новая папка:", button: "Ok", auto_close: true},
            callback: async (success, name) => {
                if (success && name) {
                    const r = await ClientAPI.new_folder(current_path, name);
                    if (r.result === 0) 
                        error_popup(`Не удалось создать папку, ответ сервера: ${r.message}`);
                    if (r.result && r.data) {
                        go_to_dir(current_path, true);
                    }
                }
            }
        });
    }

    function rename_popup(asset_path: string, name: string, type?: AssetType) {
        let type_name = "файл";
        if (type == "folder") type_name = "папку";
        Popups.open({
            type: "Rename",
            params: {title: `Переименовать ${type_name} ${name}`, button: "Ok", currentName: name, auto_close: true},
            callback: async (success, name) => {
                if (success && name) {
                    const new_path = `${current_dir}/${name}`;
                    const r = await ClientAPI.rename(asset_path, new_path);
                    if (r.result === 0)
                        error_popup(`Не удалось переименовать ${type_name}, ответ сервера: ${r.message}`);
                    if (r.result && r.data && current_dir) {
                        go_to_dir(current_dir, true);
                    }
                }
            }
        });
    }

    function remove_popup(asset_path: string, name: string, type?: AssetType) {
        let type_name = "файл";
        if (type == "folder") type_name = "папку";
        Popups.open({
            type: "Confirm",
            params: {title: `Удаление файла`, text: `Удалить ${type_name} ${name}?`, button: "Да", buttonNo: "Нет", auto_close: true},
            callback: async (success) => {
                if (success) {
                    const r = await ClientAPI.remove(asset_path);
                    if (r.result === 0) 
                        error_popup(`Не удалось удалить ${type_name}, ответ сервера: ${r.message}`);
                    if (r.result && r.data && current_dir) {
                        go_to_dir(current_dir, true);
                    }
                }
            }
        });
    }

    function error_popup(message: string) {
        Popups.open({
            type: "Notify",
            params: {title: "Ошибка", text: message, button: "Ok", auto_close: true},
            callback: () => {}   // (success: boolean) => void
        });
    }

    async function download_asset(path: string, name: string) {
        const url = `${SERVER_URL}${URL_PATHS.ASSETS}/${path}`;
        const resp = await fetch(url);
        const blob = await resp.blob();
        let fileURL = URL.createObjectURL(blob);
        let fileLink = document.createElement('a');
        fileLink.href = fileURL;
        fileLink.download = name;
        fileLink.click();
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

    function on_dir_change(message: Messages['SERVER_FILE_SYSTEM_EVENT']) {
        if (message.project === current_project && message.path === current_dir) {
            renew_current_dir();
        }
    }

    async function draw_empty_project() {
        // draw_assets();
        generate_breadcrumbs('')
    }

    function onMouseDown(event: any) {
        if (!ContextMenu.isVisible()) {
            active_asset?.classList.remove("active")
            active_asset = undefined;
        }
    }

    function onMouseMove(event: any) {
        
    }

    async function onMouseUp(event: any) {
        if (!current_project || drag_now) return;
        if (event.button === 0 || event.button === 2) {
            if (!event.target.closest('.filemanager')) {
                return;
            }
            let path = "";
            const folder_elem = event.target.closest('.folder.asset');
            if (folder_elem !== null) {
                folder_elem.classList.add("active");
                active_asset?.classList.remove("active")
                active_asset = folder_elem;
                path = folder_elem.getAttribute('data-path');
                if (event.button === 0) {
                    return await go_to_dir(path);
                }
            }
            const file_elem = event.target.closest('.file.asset');
            if (file_elem !== null) {
                active_asset?.classList.remove("active");
                active_asset = file_elem;
                file_elem.classList.add("active");
                path = file_elem.getAttribute('data-path');
                const name = file_elem.getAttribute('data-name');
                log(`Клик на ассет файл ${name}, путь ${path}, проект ${current_project}`);
                EventBus.trigger("SYS_CLICK_ON_ASSET", {name, path});
            }
            if (!file_elem && !folder_elem) {
                active_asset?.classList.remove("active");
                active_asset = undefined;
            }
            const breadcrumbs_elem = event.target.closest('a .folderName');
            if (breadcrumbs_elem !== null && event.button === 0) {
                path = breadcrumbs_elem.getAttribute('data-path');
                return await go_to_dir(path);
            }
            if (event.button === 2) {
                open_menu(event);
                return;
            }
        }
    }

    async function onKeyUp(event: any) {
        if (Input.is_control() && (event.key == 'i' || event.key == 'ш')) {
            log(`\ncurrent project: ${current_project}\ncurrent directory: ${current_dir}\nactive asset name: ${name}\nmoving asset name: ${moving_asset_name}`)
        }
        if (active_asset) {
            const path = active_asset.getAttribute('data-path') as string;
            const name = active_asset.getAttribute('data-name') as string;
            if (event.key == 'F2' && active_asset) {
                rename_popup(path, name);
            }
            if (Input.is_control() && (event.key == 'c' || event.key == 'с')) {
                moving_asset_name = name;
                copy_asset_path = path;
            }
            if (Input.is_control() && (event.key == 'x' || event.key == 'ч')) {
                moving_asset_name = name;
                cut_asset_path = path;
            }
            
            if (Input.is_control() && (event.key == 'v' || event.key == 'м') && moving_asset_name) {
                const move_to = `${current_dir}/${moving_asset_name}`;
                if (cut_asset_path) {
                    await ClientAPI.rename(cut_asset_path, move_to);                
                }
                if (copy_asset_path) {
                    await ClientAPI.copy(copy_asset_path, move_to);   
                }
                moving_asset_name = undefined;
            }
            if (event.key == 'Delete') {
                remove_popup(path, name);
            }  
        }
    }
    
    const dropZone = document.getElementById("drop_zone");
    if (dropZone) {
        let hoverClassName = 'hover';
      
        dropZone.addEventListener("dragenter", function(e) {
            e.preventDefault();
            drag_now = true;
            dropZone.classList.add(hoverClassName);
        });
        dropZone.addEventListener("dragstart", function(e) {
            const elem = e.target as HTMLInputElement;
            const path = elem.getAttribute("data-path");
            const name = elem.getAttribute("data-name");
            if (path && name && e.dataTransfer) {
                e.dataTransfer.setData("data-path", path);
                e.dataTransfer.setData("data-name", name);
            }
        });
      
        dropZone.addEventListener("dragover", function(e) {
            e.preventDefault();
            dropZone.classList.add(hoverClassName);
        });
      
        dropZone.addEventListener("dragleave", function(e) {
            e.preventDefault();
            dropZone.classList.remove(hoverClassName);
        });
      
        dropZone.addEventListener("drop", async function(e) {
            e.preventDefault();
            if (current_project == undefined || current_dir == undefined) {
                Log.warn('Попытка загрузить файл на сервер, но никакой проект не загружен');
                return;
            }
            drag_now = false;
            dropZone.classList.remove(hoverClassName);
            if (e.dataTransfer != null) {

                // const files = await getFileAsync(e.dataTransfer);
                const files = Array.from(e.dataTransfer.files);
                if (files.length > 0) {
                    upload_files(files);
                }
            }
        });
    }

    async function drop_into_folder(e: DragEvent, target: HTMLElement) {
        if (e.dataTransfer != null && current_dir != undefined) {
            const type = target.getAttribute("data-type") as AssetType;
            const target_path = target.getAttribute("data-path");
            if (type == "folder" && target_path) {
                const _path = e.dataTransfer.getData("data-path");
                const name = e.dataTransfer.getData("data-name");
                const move_to = `${target_path}/${name}`;
                await ClientAPI.rename(_path, move_to);
                // обновляем текущую папку, чтобы отобразить изменившееся число файлов в той папке, куда переместили файл
                await go_to_dir(current_dir, true);
            }
        }
    }  

    async function upload_files(files: File[], ) {
        for (const file of files) {
            const data = new FormData();
            console.log(`trying upload a file: ${file.name} in dir ${current_dir}`);
            data.append('file', file, file.name);
            data.append('path', current_dir as string);
            try {
                const resp = await fetch(`${SERVER_URL}${URL_PATHS.UPLOAD}`, {
                    method: 'POST',
                    body: data
                });
                on_file_upload(resp)
            } catch (e) {
                console.error(e)
            }
        }
    }

    document.querySelector('.filemanager')?.addEventListener('contextmenu', (event: any) => {
        event.preventDefault();
    });
    EventBus.on('SYS_VIEW_INPUT_KEY_UP', onKeyUp);
    EventBus.on('SYS_INPUT_POINTER_DOWN', onMouseDown);
    EventBus.on('SYS_INPUT_POINTER_MOVE', onMouseMove);
    EventBus.on('SYS_INPUT_POINTER_UP', onMouseUp);
    
    EventBus.on('SERVER_FILE_SYSTEM_EVENT', on_dir_change);
    
    EventBus.on('LOADED_PROJECT', async (m) => {
        if (m.project && m.current_dir) {
            const load_project_resp = await ClientAPI.load_project(m.project);
            if (load_project_resp.result !== 1)  {
                log(`Failed to load previously loaded project ${m.project}`);
                return;
            }
            const data = load_project_resp.data as {assets: FSObject[], name: string};
            // Устанавливаем текущий проект для ассет менеждера
            AssetControl.load_project(data.name, undefined, m.current_dir);
        }
    });

    return { load_project, draw_assets, get_file_data, save_file_data, save_meta_file_info, get_meta_file_info, draw_empty_project };
}

function escapeHTML(text: string) {
    return text.replace(/\&/g,'&amp;').replace(/\</g,'&lt;').replace(/\>/g,'&gt;');
}

function bytesToSize(bytes: number) {
    var sizes = ['б', 'Кб', 'Мб'];
    if (bytes == 0) return '0 байт';
    var i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i)) + ' ' + sizes[i];
}

function getFileExt(path: string) {
	var ar = path.split(".");
	return ar[ar.length-1];
}

function getFileName(path: string) {
	var ar = path.split("/");
	return ar[ar.length-1];
}

function getFilePath(path: string) {
	var fn = getFileName(path);
	return path.slice(0, path.length-fn.length);
}

function fileIsImg(path: string) {
	var ext = getFileExt(path);
	return (['png', 'jpg', 'jpeg', 'gif'].includes(ext));
}

export async function run_debug_filemanager() {
    // Подключаемся к серверу
    const resp = await ClientAPI.test_server_ok();
    if (resp && resp.result === 1) {
        
        WsClient.connect(WS_SERVER_URL);

        // Пробуем загрузить последний открытый проект
        const result = await ClientAPI.get_loaded_project();
        if (result.result) {
            const data = result.data as {project?: string, current_dir: string};
            if (data.project) {
                AssetControl.load_project(data.project, undefined, data.current_dir);
                return;
            }   
        }

        // Иначе загружаем список существующих проектов
        const projects = await ClientAPI.get_projects();
        const project_to_load = 'ExampleProject';
        const names: string[] = [];

        // Ищем проект с именем project_to_load и пробуем его загрузить
        for (const project of projects) {
            names.push(project);
        }

        // Если не найден, пробуем создать его
        // if (!names.includes(project_to_load)) {
        //     await ClientAPI.new_project(project_to_load);
        // }

        const load_project_resp = await ClientAPI.load_project(project_to_load);
        if (load_project_resp.result !== 1)  {
            log(`Failed to load project ${project_to_load}`);
            return;
        }
        const data = load_project_resp.data as {assets: FSObject[], name: string};
        // Устанавливаем текущий проект для ассет менеждера
        AssetControl.load_project(data.name, data.assets);

        // Прочие действия при открытии проекта в редакторе
        
    }
    else {
        log('Server does not respond, cannot run debug filemanager');
        AssetControl.draw_empty_project();
    }
    
}

