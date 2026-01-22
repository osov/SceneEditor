// Хранилище материалов
// Централизованное состояние для всех материалов

import type { MaterialInfo } from './types';

/**
 * Создаёт хранилище состояния материалов
 */
export function create_material_state() {
    /** Все загруженные материалы по имени */
    const materials: Record<string, MaterialInfo> = {};

    /** Пути файлов которые были только что записаны и file change должен быть проигнорирован */
    const pending_self_writes = new Set<string>();

    // === Материалы ===

    function get_material(name: string): MaterialInfo | null {
        return materials[name] ?? null;
    }

    function set_material(name: string, info: MaterialInfo): void {
        materials[name] = info;
    }

    function has_material(name: string): boolean {
        return materials[name] !== undefined;
    }

    function delete_material(name: string): void {
        delete materials[name];
    }

    function get_all_names(): string[] {
        return Object.keys(materials);
    }

    function get_all_materials(): Record<string, MaterialInfo> {
        return materials;
    }

    function is_builtin_material(name: string): boolean {
        const material = materials[name];
        if (material === null || material === undefined) {
            return false;
        }
        return material.path.startsWith('__builtin__');
    }

    // === Pending writes (для игнорирования file change от собственных записей) ===

    function add_pending_write(path: string): void {
        pending_self_writes.add(path);
    }

    function remove_pending_write(path: string): boolean {
        return pending_self_writes.delete(path);
    }

    function is_pending_write(path: string): boolean {
        return pending_self_writes.has(path);
    }

    function check_and_remove_pending_write(path: string): boolean {
        if (pending_self_writes.has(path)) {
            pending_self_writes.delete(path);
            return true;
        }
        return false;
    }

    return {
        // Материалы
        get_material,
        set_material,
        has_material,
        delete_material,
        get_all_names,
        get_all_materials,
        is_builtin_material,

        // Pending writes
        add_pending_write,
        remove_pending_write,
        is_pending_write,
        check_and_remove_pending_write,
    };
}

export type MaterialState = ReturnType<typeof create_material_state>;
