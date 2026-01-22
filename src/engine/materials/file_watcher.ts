// Обработка изменений файлов материалов и шейдеров

import type { MaterialInfo } from './types';
import type { MaterialState } from './state';
import type { HashUtils } from './hash_utils';

/**
 * Создаёт обработчик изменений файлов
 */
export function create_file_watcher(state: MaterialState, hash_utils: HashUtils) {
    /**
     * Обработчик изменения шейдера - обновляет все материалы использующие его
     */
    function update_materials_on_shader_change(
        shader_path: string,
        shader_type: 'vertex' | 'fragment',
        shader_code: string
    ): void {
        const all_materials = state.get_all_materials();

        for (const material_info of Object.values(all_materials)) {
            const matches = shader_type === 'vertex'
                ? material_info.vertexShader === '/' + shader_path
                : material_info.fragmentShader === '/' + shader_path;

            if (matches) {
                const origin = hash_utils.get_material_by_hash(material_info.name, material_info.origin);
                if (origin === null) {
                    continue;
                }

                // Обновляем оригинальный материал
                if (shader_type === 'vertex') {
                    origin.vertexShader = shader_code;
                } else {
                    origin.fragmentShader = shader_code;
                }
                origin.needsUpdate = true;

                // Обновляем все копии
                const copy_hashes = Object.keys(material_info.instances).filter((hash) => hash !== material_info.origin);
                for (const hash of copy_hashes) {
                    const copy = hash_utils.get_material_by_hash(material_info.name, hash);
                    if (copy === null) {
                        continue;
                    }

                    if (shader_type === 'vertex') {
                        copy.vertexShader = shader_code;
                    } else {
                        copy.fragmentShader = shader_code;
                    }
                    copy.needsUpdate = true;
                }
            }
        }
    }

    /**
     * Проверяет pending_self_writes и удаляет запись
     * Возвращает true если файл был записан нами и file change должен быть проигнорирован
     */
    function check_pending_self_write(path: string): boolean {
        return state.check_and_remove_pending_write(path);
    }

    /**
     * Получает информацию обо всех уникальных материалах
     */
    function get_info_about_unique_materials(): Record<string, { origin: string; copies: string[] }> {
        const unique_materials: Record<string, { origin: string; copies: string[] }> = {};
        const all_materials = state.get_all_materials();

        for (const material_name of Object.keys(all_materials)) {
            const material_info = state.get_material(material_name);
            if (material_info !== null) {
                unique_materials[material_name] = {
                    origin: material_info.origin,
                    copies: [],
                };
                for (const hash of Object.keys(material_info.instances)) {
                    if (hash === material_info.origin) {
                        continue;
                    }
                    unique_materials[material_name].copies.push(hash);
                }
            }
        }

        return unique_materials;
    }

    /**
     * Получает внутренний объект materials для обратной совместимости
     */
    function get_materials_data(): Record<string, MaterialInfo> {
        return state.get_all_materials();
    }

    return {
        update_materials_on_shader_change,
        check_pending_self_write,
        get_info_about_unique_materials,
        get_materials_data,
    };
}

export type FileWatcher = ReturnType<typeof create_file_watcher>;
