/**
 * Кэширование DOM элементов дерева
 *
 * Ускоряет поиск элементов по ID
 */

import type { ElementCache } from './types';

/**
 * Создаёт фабрику для управления кэшем элементов
 */
export function create_element_cache() {
    let element_cache: ElementCache = {};

    /**
     * Инициализирует кэш из DOM
     */
    function setup_element_cache(): void {
        clear_cache();
        const items = document.querySelectorAll('.tree__item') as NodeListOf<HTMLElement>;
        items.forEach(item => {
            const id = Number(item.getAttribute('data-id') ?? '0');
            if (id !== 0) {
                element_cache[id] = item;
            }
        });
    }

    /**
     * Получает элемент по ID из кэша или DOM
     */
    function get_element_by_id(id: number): HTMLElement | null {
        const cached_element = element_cache[id];
        if (cached_element !== undefined) {
            // Дополнительная проверка, что элемент ещё в DOM
            if (document.contains(cached_element)) return cached_element;
            delete element_cache[id];
        }
        const element = document.querySelector(`.tree__item[data-id="${id}"]`) as HTMLElement | null;
        if (element !== null) {
            element_cache[id] = element;
        }
        return element;
    }

    /**
     * Добавляет элемент в кэш
     */
    function set_element(id: number, element: HTMLElement): void {
        element_cache[id] = element;
    }

    /**
     * Удаляет элемент из кэша
     */
    function remove_element(id: number): void {
        delete element_cache[id];
    }

    /**
     * Очищает кэш
     */
    function clear_cache(): void {
        element_cache = {};
    }

    /**
     * Получает весь кэш (для отладки)
     */
    function get_cache(): ElementCache {
        return element_cache;
    }

    return {
        setup_element_cache,
        get_element_by_id,
        set_element,
        remove_element,
        clear_cache,
        get_cache,
    };
}

/**
 * Тип для фабрики кэша элементов
 */
export type ElementCacheFactory = ReturnType<typeof create_element_cache>;
