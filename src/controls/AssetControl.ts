import { SERVER_URL } from "../config";
import { FSObject, FSObjectType } from "../modules/modules_const";

declare global {
    const AssetControl: ReturnType<typeof AssetControlCreate>;
}

export function register_asset_control() {
    (window as any).AssetControl = AssetControlCreate();
}


function AssetControlCreate() {
    const filemanager = document.querySelector('.filemanager') as HTMLDivElement;
    const breadcrumbs = filemanager.querySelector('.breadcrumbs') as HTMLDivElement;
    const file_list = filemanager.querySelector('.data') as HTMLDivElement;
    let current_path = '/';

    async function load_project(name: string) {
        const resp = await ClientAPI.load_project(name);
        if (resp.result === 1 && resp.data != undefined) {
            const root_folder_content = resp.data;
            const path = '';
            draw_assets(path, root_folder_content);
            generate_breadcrumbs(path);
        }
    }

    // отрисовываем файлы
    function draw_assets(path: string, list: FSObject[]) {
		const scannedFolders: FSObject[] = [];
		const scannedFiles: FSObject[] = [];
		list.forEach(function (d)
		{
			if (d.type === FSObjectType.FOLDER)
				scannedFolders.push(d);
			else if (d.type === FSObjectType.FILE)
				scannedFiles.push(d);
		});

		file_list.innerHTML = "";
        file_list.hidden = true;

        // const nothing_found_elem = filemanager.querySelector('.nothingfound') as HTMLDivElement;
		// if(!scannedFolders.length && !scannedFiles.length)
		// 	nothing_found_elem.hidden = false;
		// else
        //     nothing_found_elem.hidden = true;

		if(scannedFolders.length)
		{
			scannedFolders.forEach(function(f)
			{   
                const num_files = f.num_files as number;
				let itemsLength = '';
                let name = escapeHTML(f.name);
                let icon = '<span class="icon folder"></span>';

				if(num_files) {
					icon = '<span class="icon folder full"></span>';
				}

				if(num_files == 1)
					itemsLength = `${num_files} Файл`;
				else if(num_files > 1)
					itemsLength = `${num_files} Файлов`;
				else
					itemsLength = 'Пусто';
				const folder = '<li class="folders" data-info="'+ f.path +'"><a href="'+ f.path +'" title="'+ f.name +'" class="folders" >'+ icon +'<span class="name">' + name + '</span> <span class="details">' + itemsLength + '</span></a></li>';
				file_list.innerHTML += folder;
			});
		}

		if(scannedFiles.length)
		{
			scannedFiles.forEach(function(f)
			{
				const file_size = bytesToSize(f.size);
                const name = escapeHTML(f.name);
                let file_type = getFileExt(name);
				let icon = '<span class="icon file"></span>';
				const _path = f.path;
				const src = f.src ? f.src.replace('\\', '/') : '';
                const src_url = new URL(src, SERVER_URL);
				let wtype = "none";
				if (file_type == 'mtr')
					wtype = "material";
				icon = '<span data-id="'+ _path +'" class="icon drag file f-'+ file_type +'" data-type="'+ wtype +'" draggable="true">.'+ file_type +'</span>';
				if (fileIsImg(_path))
				{
					const img_path = _path.split("/").join("/");
					icon = `<img src="${src_url}" data-id="${_path}" class="icon img drag" data-type="texture" draggable="true"/>`;
				}
				const file = '<li class="files" data-info="'+ _path +'"><a href="javascript:void(0);" title="'+ f.name +'" class="files" >'+ icon +'<span class="name">'+ name +'</span> <span class="details">'+ file_size +'</span></a></li>';
				file_list.innerHTML += file;
			});
		}
    }

    // выдает информацию о содержимом файла, обычно для текстоподобных нужно будет
    // текстуры/модели сюда не будут относиться
    function get_file_data(path: string) {
        return '';
    }

    // Запись непосредственно в файл
    function save_file_data(path: string, data: string) {

    }

    // информация о файле(храним в 1 общем файле с мета информацией обо всех файлах(если были изменены))
    // для примера можем каждой текстуре задать свойства в каком она атласе
    function save_meta_file_info(path: string, data: string) {
    }

    // извлекает информация о каком-то файле
    function get_meta_file_info(path: string) {
        return '';
    }

    function generate_breadcrumbs(dir: string) {
		let path = dir.split('/').slice(0);
		for(let i=1; i < path.length; i++)
			path[i] = path[i-1]+ '/' +path[i];
		if (path[0] == "")
			path[0] = 'Файлы';
		let url = '';
        path.forEach(function (u, i)
			{
				var name = u.split("/");
				if (i !== path.length - 1) {
                    const ref = 
					url += '<a href="'+u+'"><span class="folderName">' + name[name.length-1] + '</span></a> <span class="arrow">→</span> ';                    
                }
				else
					url += '<span class="folderName">' + name[name.length-1] + '</span>';
			});
        breadcrumbs.innerHTML = url;
	}

    async function draw_empty_project() {
        // draw_assets();
        generate_breadcrumbs('')
    }

    function onMouseDown(event: any) {
        const folder_item = event.target.closest('.folders');
        const file_item = event.target.closest('.files');
        log(folder_item, file_item)
    }

    function onMouseMove(event: any) {
        
    }

    function onMouseUp(event: any) {
        
    }

    EventBus.on('SYS_INPUT_POINTER_DOWN', onMouseDown);
    EventBus.on('SYS_INPUT_POINTER_MOVE', onMouseMove);
    EventBus.on('SYS_INPUT_POINTER_UP', onMouseUp);

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
    const resp = await ClientAPI.test_server_ok();
    if (resp && resp.result === 1) {
        await AssetControl.load_project('test');
    }
    else {
        log('Server does not respond, cannot run debug filemanager');
        AssetControl.draw_empty_project();
    }
    
}
  
