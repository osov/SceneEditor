import * as fs from 'fs/promises';
import { openExplorer } from 'explorer-opener';
import path from 'path';
import { CACHE, FSObject, METADATA, PUBLIC, URL_PATHS } from '../../src/modules_editor/modules_editor_const';
import { working_folder_path } from '../config';


export async function is_folder(path: string) {
    const exists = await fs.exists(path);
    if (exists) {
        const stats = await fs.stat(path);
        return stats.isDirectory();
    }
    return false;
}

export async function mk_dir(name: string) {
    await fs.mkdir(name);
}

export async function rename(old_name: string, new_name: string) {
	await fs.rename(old_name, new_name);
}

export async function copy(src: string, dst: string) {
	await fs.copyFile(src, dst);
}

export async function remove_path(path: string) {
	await fs.rm(path, {recursive: true, force: true,});
    return path
}

export async function read_dir_assets(dir: string, root_dir?: string, recursive = false) {
    const list: FSObject[] = [];
    const items = await fs.readdir(dir);
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const item_path = path.join(dir, item);
        const rel_path = path.relative(root_dir ? root_dir : dir, item_path).replaceAll(path.sep, "/");
        const exists = await fs.exists(item_path);
        if (exists) {
            const stats = await fs.stat(item_path);
            const is_file = stats.isFile();
            const num_files = is_file ? 0 : await get_files_amount(item_path);
            const ext = is_file ?  path.extname(item).slice(1) : undefined;
            const src = is_file ?  path.join(URL_PATHS.ASSETS, rel_path).replaceAll(path.sep, "/") : undefined;
            const info: FSObject = {name: item, type: is_file ? "file" : "folder", size: stats.size, path: rel_path, num_files, ext, src};
            list.push(info);
            if (stats.isDirectory() && recursive) {
                const sub_list = await read_dir_assets(item_path, root_dir ? root_dir : dir, true);
                list.push(...sub_list);
            }
        }
    }
    return list;
}

export async function get_files_amount(dir: string) {
    const items = await fs.readdir(dir);
    return items.length;
}

export async function exists(dir: string) {
	return await fs.exists(dir);
}

export function get_full_path(dir: string) {
    return path.join(path.resolve(working_folder_path), dir);    
}

export function get_data_folder_path(project_name: string) {
    return path.join(path.resolve(working_folder_path), project_name, PUBLIC);  
}

export function get_data_file_path(project_name: string, dir: string) {
    return path.join(path.resolve(working_folder_path), project_name, PUBLIC, dir);  
}

export function get_assets_folder_path(project_name: string) {
    return path.join(path.resolve(working_folder_path), project_name, PUBLIC);  
}

export function get_asset_path(project_name: string, dir: string) {
    return path.join(path.resolve(working_folder_path), project_name, PUBLIC, dir); 
}

export function get_metadata_path(project_name: string) {
    return path.join(path.resolve(working_folder_path), project_name, METADATA);  
}

export function get_cache_path() {
    return path.join(__dirname, "../", "../", CACHE);  
}

export async function new_folder(dir: string, name: string) {
    const full_path = path.join(dir, name);
    mk_dir(full_path);
    return full_path;
}

export async function new_project(name: string) {
    const full_path = get_full_path(name);
    mk_dir(full_path);
    mk_dir(path.join(full_path, PUBLIC));
}

export async function open_explorer(project_name: string, dir: string) {
    const full_path = get_asset_path(project_name, dir);
    // require('child_process').exec(`start "" "${full_path}"`);
    return openExplorer(full_path)
    .then(() => {
        return true;
    })
    .catch((error) => {
        return false;
    });    
}
