// Утилиты для работы с файлами и путями

export function get_basename(path: string) {
    return path.split('/').reverse()[0];
}

export function get_file_name(path: string) {
    const basename = get_basename(path);
    return basename.substring(0, basename.lastIndexOf(".")) || basename;
}
