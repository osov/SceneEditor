/**
 * TreeDomRenderer - рендерер DOM для дерева иерархии
 *
 * Отвечает за визуальное представление дерева.
 * Работает с TreeDataService для получения данных.
 */

import type { TreeItem, ITreeDataService, TreeChangesInfo } from './TreeDataService';

/** Параметры рендерера */
export interface TreeDomRendererParams {
    /** Контейнер для дерева */
    container: HTMLElement;
    /** Сервис данных дерева */
    data_service: ITreeDataService;
    /** Callback при клике на элемент */
    on_item_click?: (item: TreeItem, event: MouseEvent) => void;
    /** Callback при двойном клике */
    on_item_dblclick?: (item: TreeItem, event: MouseEvent) => void;
    /** Callback при клике на toggle */
    on_toggle_click?: (item: TreeItem) => void;
    /** Callback при контекстном меню */
    on_context_menu?: (item: TreeItem, event: MouseEvent) => void;
}

/** Интерфейс рендерера */
export interface ITreeDomRenderer {
    /** Полная перерисовка дерева */
    render(): void;

    /** Обновить дерево по изменениям */
    update(changes: TreeChangesInfo): void;

    /** Обновить элемент по ID */
    update_item(id: number): void;

    /** Обновить выделение */
    update_selection(): void;

    /** Обновить видимость элемента */
    update_visibility(id: number): void;

    /** Получить DOM элемент по ID */
    get_element(id: number): HTMLElement | undefined;

    /** Прокрутить к элементу */
    scroll_to_item(id: number): void;

    /** Включить/выключить режим редактирования имени */
    start_rename(id: number): void;

    /** Завершить редактирование имени */
    finish_rename(): void;

    /** Очистить DOM */
    clear(): void;
}

/** Создать TreeDomRenderer */
export function create_tree_dom_renderer(params: TreeDomRendererParams): ITreeDomRenderer {
    const { container, data_service, on_item_click, on_item_dblclick, on_toggle_click, on_context_menu } = params;

    const element_cache: Map<number, HTMLElement> = new Map();
    let rename_input: HTMLInputElement | undefined;
    let rename_item_id: number | undefined;

    function render(): void {
        clear();

        const items = data_service.get_items();
        const root_items = items.filter(item => item.pid === 0);

        const ul = document.createElement('ul');
        ul.className = 'tree__list';

        for (const item of root_items) {
            const li = render_item(item);
            ul.appendChild(li);
        }

        container.appendChild(ul);
    }

    function render_item(item: TreeItem): HTMLLIElement {
        const li = document.createElement('li');
        li.className = 'tree__node';
        li.setAttribute('data-id', String(item.id));

        // Основной элемент
        const div = document.createElement('div');
        div.className = 'tree__item';
        div.setAttribute('data-id', String(item.id));

        if (item.selected) {
            div.classList.add('selected');
        }

        if (!item.visible) {
            div.classList.add('hidden');
        }

        // Отступ по глубине
        div.style.paddingLeft = `${item.depth * 16 + 4}px`;

        // Toggle (стрелка раскрытия)
        const children = data_service.get_children(item.id);
        if (children.length > 0) {
            const toggle = document.createElement('span');
            toggle.className = `tree__toggle ${item.expanded ? 'expanded' : ''}`;
            toggle.innerHTML = '<i class="gg-chevron-right"></i>';
            toggle.addEventListener('click', (e) => {
                e.stopPropagation();
                on_toggle_click?.(item);
            });
            div.appendChild(toggle);
        } else {
            // Пустой спейсер
            const spacer = document.createElement('span');
            spacer.className = 'tree__toggle-spacer';
            div.appendChild(spacer);
        }

        // Иконка
        const icon = document.createElement('span');
        icon.className = 'tree__icon';
        icon.innerHTML = `<i class="${item.icon}"></i>`;
        div.appendChild(icon);

        // Имя
        const name = document.createElement('span');
        name.className = 'tree__item_name';
        name.textContent = item.name;
        div.appendChild(name);

        // События
        div.addEventListener('click', (e) => on_item_click?.(item, e));
        div.addEventListener('dblclick', (e) => on_item_dblclick?.(item, e));
        div.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            on_context_menu?.(item, e);
        });

        li.appendChild(div);

        // Дочерние элементы
        if (children.length > 0 && item.expanded) {
            const child_ul = document.createElement('ul');
            child_ul.className = 'tree__children';

            for (const child of children) {
                const child_li = render_item(child);
                child_ul.appendChild(child_li);
            }

            li.appendChild(child_ul);
        }

        element_cache.set(item.id, div);
        return li;
    }

    function update(changes: TreeChangesInfo): void {
        if (changes.structure_changed) {
            // При изменении структуры перерисовываем всё
            render();
            return;
        }

        // Обновляем только изменённые элементы
        for (const item of changes.modified_items) {
            update_item(item.id);
        }

        // Удаляем DOM для удалённых элементов
        for (const id of changes.deleted_ids) {
            const element = element_cache.get(id);
            if (element !== undefined) {
                element.closest('li')?.remove();
                element_cache.delete(id);
            }
        }
    }

    function update_item(id: number): void {
        const item = data_service.get_item(id);
        if (item === undefined) return;

        const element = element_cache.get(id);
        if (element === undefined) return;

        // Обновляем классы
        element.classList.toggle('selected', item.selected);
        element.classList.toggle('hidden', !item.visible);

        // Обновляем имя
        const name_el = element.querySelector('.tree__item_name');
        if (name_el !== null) {
            name_el.textContent = item.name;
        }

        // Обновляем toggle
        const toggle = element.querySelector('.tree__toggle');
        if (toggle !== null) {
            toggle.classList.toggle('expanded', item.expanded);
        }
    }

    function update_selection(): void {
        const selected_ids = data_service.get_selected_ids();

        // Убираем выделение со всех
        element_cache.forEach((element) => {
            element.classList.remove('selected');
        });

        // Выделяем нужные
        for (const id of selected_ids) {
            const element = element_cache.get(id);
            if (element !== undefined) {
                element.classList.add('selected');
            }
        }
    }

    function update_visibility(id: number): void {
        const item = data_service.get_item(id);
        if (item === undefined) return;

        const element = element_cache.get(id);
        if (element !== undefined) {
            element.classList.toggle('hidden', !item.visible);
        }
    }

    function get_element(id: number): HTMLElement | undefined {
        return element_cache.get(id);
    }

    function scroll_to_item(id: number): void {
        const element = element_cache.get(id);
        if (element !== undefined) {
            element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    function start_rename(id: number): void {
        finish_rename();

        const item = data_service.get_item(id);
        if (item === undefined || item.no_rename) return;

        const element = element_cache.get(id);
        if (element === undefined) return;

        const name_el = element.querySelector('.tree__item_name');
        if (name_el === null) return;

        // Скрываем текст
        (name_el as HTMLElement).style.display = 'none';

        // Создаём input
        rename_input = document.createElement('input');
        rename_input.className = 'tree__rename-input';
        rename_input.type = 'text';
        rename_input.value = item.name;
        rename_input.addEventListener('blur', finish_rename);
        rename_input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                finish_rename();
            } else if (e.key === 'Escape') {
                cancel_rename();
            }
        });

        name_el.parentNode?.insertBefore(rename_input, name_el.nextSibling);
        rename_input.focus();
        rename_input.select();

        rename_item_id = id;
    }

    function finish_rename(): void {
        if (rename_input === undefined || rename_item_id === undefined) return;

        const new_name = rename_input.value.trim();
        if (new_name !== '') {
            data_service.rename_item(rename_item_id, new_name);
        }

        cleanup_rename();
    }

    function cancel_rename(): void {
        cleanup_rename();
    }

    function cleanup_rename(): void {
        if (rename_input !== undefined) {
            rename_input.remove();
            rename_input = undefined;
        }

        if (rename_item_id !== undefined) {
            const element = element_cache.get(rename_item_id);
            if (element !== undefined) {
                const name_el = element.querySelector('.tree__item_name');
                if (name_el !== null) {
                    (name_el as HTMLElement).style.display = '';
                }
            }
            rename_item_id = undefined;
        }
    }

    function clear(): void {
        container.innerHTML = '';
        element_cache.clear();
        cleanup_rename();
    }

    return {
        render,
        update,
        update_item,
        update_selection,
        update_visibility,
        get_element,
        scroll_to_item,
        start_rename,
        finish_rename,
        clear,
    };
}
