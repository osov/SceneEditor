declare global {
    const AssetControl: ReturnType<typeof AssetControlCreate>;
}

export function register_asset_control() {
    (window as any).AssetControl = AssetControlCreate();
}


function AssetControlCreate() {
    
    // отрисовываем файлы
    function draw_assets(path:string, list:any[]) {

    }

    function get_server_assets(path:string){

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

    return { draw_assets, get_file_data, save_file_data, save_meta_file_info, get_meta_file_info };
}