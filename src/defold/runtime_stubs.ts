/**
 * Runtime заглушки для функций, которые раньше предоставлял AssetControl
 *
 * TODO: Заменить заглушки реальными реализациями через сервисы
 */

import type { Vector3, Quaternion } from 'three';
import type { IBaseEntityAndThree } from '@editor/render_engine/types';
import type { HistoryOwner } from '@editor/modules_editor/modules_editor_const';

/**
 * Загрузить часть сцены в указанную позицию
 *
 * @deprecated Требуется реализация через SceneService/ResourceService
 */
export function load_part_of_scene_in_pos(
    _url: string,
    _position?: Vector3,
    _rotation?: Quaternion,
    _scale?: Vector3
): IBaseEntityAndThree | null {
    console.warn('[Runtime] load_part_of_scene_in_pos не реализован - требуется миграция на сервисы');
    return null;
}

/**
 * Получить данные файла
 *
 * @deprecated Требуется реализация через ResourceService
 */
export async function get_file_data(path: string): Promise<string | null> {
    // Простая реализация через fetch для локальных файлов
    try {
        const response = await fetch(path);
        if (!response.ok) {
            console.warn(`[Runtime] Не удалось загрузить файл: ${path}`);
            return null;
        }
        return await response.text();
    } catch (e) {
        console.warn(`[Runtime] Ошибка загрузки файла ${path}:`, e);
        return null;
    }
}

/**
 * Сохранить данные в файл
 *
 * @deprecated Требуется реализация через ResourceService
 */
export async function save_file_data(_path: string, _data: string): Promise<boolean> {
    console.warn('[Runtime] save_file_data не реализован - требуется миграция на сервисы');
    return false;
}

/**
 * Перейти в директорию
 *
 * @deprecated Требуется реализация через ResourceService
 */
export async function go_to_dir(_dir: string, _create?: boolean): Promise<boolean> {
    console.warn('[Runtime] go_to_dir не реализован - требуется миграция на сервисы');
    return false;
}

/**
 * Выбрать файл в браузере ассетов
 *
 * @deprecated Требуется реализация через UI сервис
 */
export function select_file(_path: string): void {
    console.warn('[Runtime] select_file не реализован - требуется миграция на сервисы');
}

/**
 * Открыть попап создания новой сцены
 *
 * @deprecated Требуется реализация через UI сервис
 */
export function new_scene_popup(_current_dir: string, _duplicate?: boolean, _as_template?: boolean): void {
    console.warn('[Runtime] new_scene_popup не реализован - требуется миграция на сервисы');
}

/**
 * Сохранить текущую сцену
 *
 * @deprecated Требуется реализация через SceneService
 */
export function save_current_scene(): void {
    console.warn('[Runtime] save_current_scene не реализован - требуется миграция на сервисы');
}

/**
 * Получить список выделенных объектов
 *
 * @deprecated Требуется реализация через SelectionService
 */
export function get_selected_list(): IBaseEntityAndThree[] {
    console.warn('[Runtime] get_selected_list не реализован - требуется миграция на сервисы');
    return [];
}

/**
 * Установить список выделенных объектов
 *
 * @deprecated Требуется реализация через SelectionService
 */
export function set_selected_list(_list: IBaseEntityAndThree[]): void {
    console.warn('[Runtime] set_selected_list не реализован - требуется миграция на сервисы');
}

/**
 * Добавить действие в историю
 *
 * @deprecated Требуется реализация через HistoryService
 */
export function history_add(_type: string, _data: unknown[], _owner: HistoryOwner): void {
    console.warn('[Runtime] history_add не реализован - требуется миграция на сервисы');
}

/**
 * Принудительно обновить инспектор
 *
 * @deprecated Требуется реализация через плагин инспектора
 */
export function inspector_force_refresh(): void {
    // Не логируем предупреждение, т.к. вызывается часто
}

/**
 * Глобальный объект SelectControl (заглушка)
 *
 * @deprecated Использовать SelectionService через DI
 */
export const SelectControlStub = {
    get_selected_list: get_selected_list,
    set_selected_list: set_selected_list,
    select: (_mesh: IBaseEntityAndThree) => {
        console.warn('[Runtime] SelectControl.select не реализован');
    },
    clear: () => {
        console.warn('[Runtime] SelectControl.clear не реализован');
    },
};

/**
 * Регистрация глобального SelectControl
 */
export function register_select_control_stub(): void {
    (window as unknown as Record<string, unknown>).SelectControl = SelectControlStub;
}
