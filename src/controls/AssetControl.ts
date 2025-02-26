import { WatchEventType } from "fs";
import { SERVER_URL, WS_SERVER_URL } from "../config";
import { FILE_UPLOAD_CMD, ServerResponses, URL_PATHS } from "../modules_editor/modules_editor_const";
import { _span_elem, json_parsable } from "../modules/utils";
import { Messages } from "../modules/modules_const";

declare global {
    const AssetControl: ReturnType<typeof AssetControlCreate>;
}

export function register_asset_control() {
    (window as any).AssetControl = AssetControlCreate();
}

export type FileUploadedData = { size: number, path: string, name: string, project: string };

export type FSObjectType = "folder" | "file" | "null";

export type FSEventType = WatchEventType | "removed";

export interface FSObject { name: string, type: FSObjectType, size: number, path: string, ext?: string, num_files?: number, src?: string };

function AssetControlCreate() {
    const filemanager = document.querySelector('.filemanager') as HTMLDivElement;
    const breadcrumbs = filemanager.querySelector('.breadcrumbs') as HTMLDivElement;
    const assets_list = filemanager.querySelector('.assets_list') as HTMLDivElement;
    const menu: any = document.querySelector('.fm_wr_menu') as HTMLDivElement;
    let selected_asset: string | undefined = undefined;
    let menu_visible = false;
    let current_path = '';
    let current_project: string | undefined = undefined;

    async function set_current_project(name: string, folder_content?: FSObject[]) {
        current_project = name;
        current_path = '';
        if (folder_content) {
            draw_assets(current_path, folder_content);
            generate_breadcrumbs(current_path);
        }
        else {
            go_to_dir(current_path);
        }
    }

    async function go_to_dir(path: string) {
        if (!current_project) return;
        const resp = await ClientAPI.get_folder(current_project, path);
        if (resp.result === 1 && resp.data != undefined) {
            const folder_content = resp.data;
            current_path = path;
            draw_assets(current_path, folder_content);
            generate_breadcrumbs(current_path);
        }
        else Log.warn('cannot go to dir:', path)
    }

    async function renew_current_dir() {
        if (!current_project) return;
        const resp = await ClientAPI.get_folder(current_project, current_path);
        if (resp.result === 1 && resp.data != undefined) {
            const folder_content = resp.data;
            draw_assets(current_path, folder_content);
            generate_breadcrumbs(current_path);
        }
    }

    function draw_assets(path: string, list: FSObject[]) {
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
                folder_elem.setAttribute("data-type", "folder");
                folder_elem.appendChild(icon_elem);
                folder_elem.appendChild(name_elem);
                folder_elem.appendChild(details_elem);
                
                assets_list.appendChild(folder_elem);
			});
		}

		if(scanned_files.length)
		{
			scanned_files.forEach(function(f) {
				const file_size = bytesToSize(f.size);
                const name = escapeHTML(f.name);
                let file_type = getFileExt(name);
                let icon_elem = _span_elem("", ["icon", "file"]);
                const details_elem = _span_elem(file_size, ["details"]);
                const name_elem = _span_elem(name, ["name"]);
				const _path = f.path.replaceAll('\\', '/');
				const src = f.src ? f.src.replaceAll('\\', '/') : '';
                const src_url = new URL(src, SERVER_URL);
				const file_elem = document.createElement("li");
				if (file_type == "mtr") {
                    file_elem.setAttribute("data-type", "material");
                    file_elem.setAttribute("draggable", "true");
                    icon_elem.classList.add("icon", "drag", "f-mtr");
                }
				else if (fileIsImg(_path)) {	
                    icon_elem = document.createElement("img");
                    icon_elem.setAttribute("src", src_url.toString());
                    file_elem.setAttribute("data-type", "texture");
                    file_elem.setAttribute("draggable", "true");
                    icon_elem.classList.add("icon", "img", "drag");
				}
                file_elem.classList.add("file", "asset");
                file_elem.setAttribute("data-name", name);
                file_elem.setAttribute("data-path", _path);
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
        return await ClientAPI.get_data(current_project, path);
    }

    async function save_file_data(path: string, data: string) {
        if (!current_project) return;
        await ClientAPI.save_data(current_project, path, data);
    }

    async function save_meta_file_info(path: string, data: string) {
        if (!current_project) return;
        await ClientAPI.save_info(current_project, path, data);
    }

    async function get_meta_file_info(path: string) {
        if (!current_project) return;
        return await ClientAPI.get_info(current_project, path);
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
    
    function menu_click(event: any): void {
        const menu_elem = event.target.closest(".fs_menu a");
        if (!menu_elem) return;
        const action = menu_elem.getAttribute("data-action");
        if (!action) return;

    }

    function open_menu(event: any) {
        if (!selected_asset) return;
        if (!event.target.closest(".asset")) return;
        menu_visible = true;
        menu.classList.remove('bottom');
        menu.classList.add("active");
        menu.style.left = event.offset_x - 30 + 'px';

        toggle_menu_options();
        if (menu.clientHeight + 30 > window.innerHeight) {
            menu.classList.add('bottom');
        }

        if (menu.clientHeight + 30 > window.innerHeight) {
            menu.style.top = '15px';
        }
        else if (event.offset_y + menu.clientHeight + 30 > window.innerHeight) {
            menu.classList.add('bottom');
            if (menu.clientHeight > event.offset_y) {
                menu.style.top = '15px';
            }
            else {
                menu.style.top = event.offset_y + 18 - menu.clientHeight + 'px';
            }
        } 
        else
            menu.style.top = event.offset_y - 5 + 'px';
    }

    function close_menu() {
        menu.classList.remove('active');
        menu.removeAttribute('style');
        menu_visible = false;
    }
    
    function toggle_menu_options() {

    }

    async function on_file_upload(resp: Response) {
        const resp_text = await resp.text();
        if (!json_parsable(resp_text)) 
            return;
        const resp_json = JSON.parse(resp_text) as ServerResponses[typeof FILE_UPLOAD_CMD];
        if (resp_json.result && resp_json.result === 1) {
            const data = resp_json.data;
            EventBus.trigger("SYS_FILE_UPLOADED", data)
        }
    }

    function on_dir_change(message: Messages['SERVER_FILE_SYSTEM_EVENT']) {
        if (message.project === current_project && message.path === current_path) {
            renew_current_dir();
        }
    }

    async function draw_empty_project() {
        // draw_assets();
        generate_breadcrumbs('')
    }

    function onMouseDown(event: any) {
        if (menu_visible && !event.target.closest('.menu__context a')) {
            close_menu();
        }
    }

    function onMouseMove(event: any) {
        
    }

    async function onMouseUp(event: any) {
        if (!current_project) return;

        if (menu_visible && event.target.closest('.menu__context a') && selected_asset && event.button === 0) {
            menu_click(event);
        }
        if (menu_visible == false && (event.button === 0 || event.button === 2)) {
            if (!event.target.closest('.filemanager')) {
                return;
            }
            if (event.button === 0) {
                const folder_elem = event.target.closest('.folder.asset');
                if (folder_elem !== null) {
                    const path = folder_elem.getAttribute('data-path');
                    await go_to_dir(path);
                    return;
                }
                const breadcrumbs_elem = event.target.closest('a .folderName');
                if (breadcrumbs_elem !== null) {
                    const path = breadcrumbs_elem.getAttribute('data-path');
                    await go_to_dir(path);
                    return;
                }
                const file_elem = event.target.closest('.file.asset');
                if (file_elem !== null) {
                    const path = file_elem.getAttribute('data-path');
                    const name = file_elem.getAttribute('data-name');
                    log(`Клик на ассет файл ${name}, путь ${path}, проект ${current_project}`)
                    EventBus.trigger("SYS_CLICK_ON_FILE_ASSET", {name, path, project: current_project})
                }
            }
            if (event.button === 2) {
                open_menu(event);
                return;
            }
        }
    }

    const dropZone = document.getElementById("drop_zone");
    if (dropZone) {
        let hoverClassName = 'hover';
      
        dropZone.addEventListener("dragenter", function(e) {
            e.preventDefault();
            dropZone.classList.add(hoverClassName);
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
            dropZone.classList.remove(hoverClassName);
            if (!current_project) {
                Log.warn('Попытка загрузить файл на сервер, но никакой проект не загружен');
                return;
            }
            if (e.dataTransfer != null) {
                // const files = await getFileAsync(e.dataTransfer);
                const files = Array.from(e.dataTransfer.files);
                if (files.length > 0) {
                    const data = new FormData();
                    for (const file of files) {
                        data.append('file', file, file.name);
                        data.append('path', current_path);
                        data.append('project', current_project);
                    }
                    fetch(`${SERVER_URL}${URL_PATHS.UPLOAD}`, {
                        method: 'POST',
                        body: data
                    })
                    .then(() => console.log("file uploaded"))
                    .catch(reason => console.error(reason));
                }
            }
        });
    }

    EventBus.on('SYS_INPUT_POINTER_DOWN', onMouseDown);
    EventBus.on('SYS_INPUT_POINTER_MOVE', onMouseMove);
    EventBus.on('SYS_INPUT_POINTER_UP', onMouseUp);
    
    EventBus.on('SERVER_FILE_SYSTEM_EVENT', on_dir_change);

    return { set_current_project, draw_assets, get_file_data, save_file_data, save_meta_file_info, get_meta_file_info, draw_empty_project };
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
        // Загружаем список существующих проектов
        const projects = await ClientAPI.get_projects();
        let project_to_load = 'test';
        if (projects.length > 0) {
            // Будем загружать первый проект из доступных
            project_to_load = projects[0].name;
        }
        else {
            // Иначе создаём новый 
            await ClientAPI.new_project(project_to_load);
        }
        const load_project_resp = await ClientAPI.load_project(project_to_load);
        if (load_project_resp.result !== 1) 
            log(`Failed to load project ${project_to_load}`);
        else {
            const data = load_project_resp.data as {assets: FSObject[], name: string};
            // Устанавливаем текущий проект для ассет менеждера
            AssetControl.set_current_project(data.name, data.assets);

            // Прочие действия при открытии проекта в редакторе
        }
    }
    else {
        log('Server does not respond, cannot run debug filemanager');
        AssetControl.draw_empty_project();
    }
    
}
  
