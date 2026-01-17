/**
 * TreeDragDropHandler - обработчик drag-and-drop для дерева иерархии
 *
 * Отвечает за логику перетаскивания элементов.
 * Работает с TreeDataService для обновления данных.
 */

import type { TreeItem, ITreeDataService } from './TreeDataService';

/** Информация о drop-зоне */
export interface DropZoneInfo {
    /** ID целевого элемента */
    target_id: number;
    /** Позиция: внутрь, перед, после */
    position: 'inside' | 'before' | 'after';
}

/** Параметры drag-drop обработчика */
export interface TreeDragDropHandlerParams {
    /** Контейнер для дерева */
    container: HTMLElement;
    /** Сервис данных дерева */
    data_service: ITreeDataService;
    /** Callback при начале перетаскивания */
    on_drag_start?: (items: TreeItem[]) => void;
    /** Callback при завершении перетаскивания */
    on_drag_end?: () => void;
    /** Callback при drop */
    on_drop?: (dragged_ids: number[], drop_zone: DropZoneInfo) => boolean;
    /** Получить DOM элемент по ID */
    get_element: (id: number) => HTMLElement | undefined;
}

/** Интерфейс drag-drop обработчика */
export interface ITreeDragDropHandler {
    /** Включить drag-drop */
    enable(): void;
    /** Выключить drag-drop */
    disable(): void;
    /** Проверить активность */
    is_enabled(): boolean;
    /** Очистить состояние */
    clear(): void;
}

/** Создать TreeDragDropHandler */
export function create_tree_drag_drop_handler(params: TreeDragDropHandlerParams): ITreeDragDropHandler {
    const { container, data_service, on_drag_start, on_drag_end, on_drop, get_element } = params;

    let enabled = false;
    let dragged_ids: number[] = [];
    let current_drop_zone: DropZoneInfo | undefined;
    let drag_ghost: HTMLElement | undefined;
    let drop_indicator: HTMLElement | undefined;

    function enable(): void {
        if (enabled) return;
        enabled = true;

        container.addEventListener('dragstart', handle_drag_start);
        container.addEventListener('dragend', handle_drag_end);
        container.addEventListener('dragover', handle_drag_over);
        container.addEventListener('dragleave', handle_drag_leave);
        container.addEventListener('drop', handle_drop);

        // Делаем элементы draggable
        update_draggable_state();
    }

    function disable(): void {
        if (!enabled) return;
        enabled = false;

        container.removeEventListener('dragstart', handle_drag_start);
        container.removeEventListener('dragend', handle_drag_end);
        container.removeEventListener('dragover', handle_drag_over);
        container.removeEventListener('dragleave', handle_drag_leave);
        container.removeEventListener('drop', handle_drop);

        clear();
    }

    function is_enabled(): boolean {
        return enabled;
    }

    function clear(): void {
        dragged_ids = [];
        current_drop_zone = undefined;
        remove_drag_ghost();
        remove_drop_indicator();
        clear_drop_highlights();
    }

    function update_draggable_state(): void {
        const items = data_service.get_items();
        for (const item of items) {
            const element = get_element(item.id);
            if (element !== undefined) {
                element.setAttribute('draggable', item.no_drag ? 'false' : 'true');
            }
        }
    }

    function handle_drag_start(e: DragEvent): void {
        const target = e.target as HTMLElement;
        const item_element = target.closest('.tree__item') as HTMLElement | null;
        if (item_element === null) return;

        const id = parseInt(item_element.dataset.id ?? '0', 10);
        if (id === 0) return;

        const item = data_service.get_item(id);
        if (item === undefined || item.no_drag) {
            e.preventDefault();
            return;
        }

        // Собираем все выделенные элементы для перетаскивания
        const selected = data_service.get_selected();
        if (selected.some(s => s.id === id)) {
            // Перетаскиваем все выделенные
            dragged_ids = selected.filter(s => !s.no_drag).map(s => s.id);
        } else {
            // Перетаскиваем только текущий
            dragged_ids = [id];
        }

        // Настраиваем dataTransfer
        if (e.dataTransfer !== null) {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', dragged_ids.join(','));

            // Создаём ghost элемент
            create_drag_ghost(dragged_ids.length);
            if (drag_ghost !== undefined) {
                e.dataTransfer.setDragImage(drag_ghost, 0, 0);
            }
        }

        // Добавляем класс перетаскивания
        for (const drag_id of dragged_ids) {
            const el = get_element(drag_id);
            if (el !== undefined) {
                el.classList.add('dragging');
            }
        }

        on_drag_start?.(dragged_ids.map(drag_id => data_service.get_item(drag_id)).filter((i): i is TreeItem => i !== undefined));
    }

    function handle_drag_end(_e: DragEvent): void {
        // Убираем классы перетаскивания
        for (const drag_id of dragged_ids) {
            const el = get_element(drag_id);
            if (el !== undefined) {
                el.classList.remove('dragging');
            }
        }

        clear();
        on_drag_end?.();
    }

    function handle_drag_over(e: DragEvent): void {
        e.preventDefault();

        const target = e.target as HTMLElement;
        const item_element = target.closest('.tree__item') as HTMLElement | null;

        if (item_element === null) {
            clear_drop_highlights();
            current_drop_zone = undefined;
            return;
        }

        const id = parseInt(item_element.dataset.id ?? '0', 10);
        if (id === 0 || dragged_ids.includes(id)) {
            clear_drop_highlights();
            current_drop_zone = undefined;
            return;
        }

        const item = data_service.get_item(id);
        if (item === undefined) return;

        // Проверяем что не перетаскиваем в потомка
        if (is_descendant_of_any(id, dragged_ids)) {
            clear_drop_highlights();
            current_drop_zone = undefined;
            return;
        }

        // Определяем позицию drop
        const rect = item_element.getBoundingClientRect();
        const y = e.clientY - rect.top;
        const height = rect.height;

        let position: 'inside' | 'before' | 'after';
        if (y < height * 0.25) {
            position = 'before';
        } else if (y > height * 0.75) {
            position = 'after';
        } else {
            position = item.no_drop ? 'after' : 'inside';
        }

        current_drop_zone = { target_id: id, position };

        // Обновляем визуальные индикаторы
        update_drop_indicator(item_element, position);

        if (e.dataTransfer !== null) {
            e.dataTransfer.dropEffect = 'move';
        }
    }

    function handle_drag_leave(e: DragEvent): void {
        const related = e.relatedTarget as HTMLElement | null;
        if (related === null || !container.contains(related)) {
            clear_drop_highlights();
            current_drop_zone = undefined;
        }
    }

    function handle_drop(e: DragEvent): void {
        e.preventDefault();

        if (current_drop_zone === undefined || dragged_ids.length === 0) {
            clear();
            return;
        }

        // Вызываем callback
        const success = on_drop?.(dragged_ids, current_drop_zone) ?? false;

        if (success) {
            // Перемещаем в data service
            const new_parent_id = current_drop_zone.position === 'inside'
                ? current_drop_zone.target_id
                : data_service.get_item(current_drop_zone.target_id)?.pid ?? 0;

            let before_id: number | null = null;
            if (current_drop_zone.position === 'before') {
                before_id = current_drop_zone.target_id;
            } else if (current_drop_zone.position === 'after') {
                // Находим следующий sibling
                const siblings = data_service.get_children(new_parent_id);
                const target_index = siblings.findIndex(s => s.id === current_drop_zone?.target_id);
                if (target_index >= 0 && target_index < siblings.length - 1) {
                    before_id = siblings[target_index + 1].id;
                }
            }

            for (const drag_id of dragged_ids) {
                data_service.move_item(drag_id, new_parent_id, before_id);
            }
        }

        clear();
    }

    function is_descendant_of_any(id: number, ancestor_ids: number[]): boolean {
        for (const ancestor_id of ancestor_ids) {
            if (is_descendant_of(id, ancestor_id)) {
                return true;
            }
        }
        return false;
    }

    function is_descendant_of(id: number, ancestor_id: number): boolean {
        const path = data_service.get_path(id);
        return path.some(item => item.id === ancestor_id);
    }

    function create_drag_ghost(count: number): void {
        remove_drag_ghost();

        drag_ghost = document.createElement('div');
        drag_ghost.className = 'tree__drag-ghost';
        drag_ghost.textContent = count > 1 ? `${count} items` : '1 item';
        drag_ghost.style.position = 'absolute';
        drag_ghost.style.top = '-1000px';
        drag_ghost.style.left = '-1000px';
        document.body.appendChild(drag_ghost);
    }

    function remove_drag_ghost(): void {
        if (drag_ghost !== undefined) {
            drag_ghost.remove();
            drag_ghost = undefined;
        }
    }

    function update_drop_indicator(target_element: HTMLElement, position: 'inside' | 'before' | 'after'): void {
        clear_drop_highlights();

        if (position === 'inside') {
            target_element.classList.add('drop-target');
        } else {
            // Создаём или перемещаем индикатор линии
            if (drop_indicator === undefined) {
                drop_indicator = document.createElement('div');
                drop_indicator.className = 'tree__drop-indicator';
                container.appendChild(drop_indicator);
            }

            const rect = target_element.getBoundingClientRect();
            const container_rect = container.getBoundingClientRect();

            drop_indicator.style.display = 'block';
            drop_indicator.style.left = `${rect.left - container_rect.left}px`;
            drop_indicator.style.width = `${rect.width}px`;

            if (position === 'before') {
                drop_indicator.style.top = `${rect.top - container_rect.top}px`;
            } else {
                drop_indicator.style.top = `${rect.bottom - container_rect.top}px`;
            }
        }
    }

    function remove_drop_indicator(): void {
        if (drop_indicator !== undefined) {
            drop_indicator.remove();
            drop_indicator = undefined;
        }
    }

    function clear_drop_highlights(): void {
        // Убираем класс drop-target со всех элементов
        const drop_targets = container.querySelectorAll('.drop-target');
        drop_targets.forEach(el => el.classList.remove('drop-target'));

        // Скрываем индикатор
        if (drop_indicator !== undefined) {
            drop_indicator.style.display = 'none';
        }
    }

    return {
        enable,
        disable,
        is_enabled,
        clear,
    };
}
