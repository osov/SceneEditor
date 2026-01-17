/**
 * InspectorRenderer - чистый UI слой для TweakPane
 *
 * Отвечает только за рендеринг полей инспектора через TweakPane.
 * Не содержит бизнес-логики обработки свойств.
 */

import { Pane, TpChangeEvent } from 'tweakpane';
import { BindingApi, BindingParams, ButtonParams, FolderApi } from '@tweakpane/core';
import * as TweakpaneItemListPlugin from 'tweakpane4-item-list-plugin';
import * as TweakpaneImagePlugin from 'tweakpane4-image-list-plugin';
import * as TweakpaneSearchListPlugin from 'tweakpane4-search-list-plugin';
import * as TextareaPlugin from '@pangenerator/tweakpane-textarea-plugin';
import * as ExtendedPointNdInputPlugin from 'tweakpane4-extended-vector-plugin';
import * as TweakpaneExtendedBooleanPlugin from 'tweakpane4-extended-boolean-plugin';
import { Refreshable } from '@tweakpane/core/dist/blade/common/api/refreshable';

/** Тип события изменения */
export type ChangeEvent = TpChangeEvent<unknown, BindingApi<unknown, unknown>>;

/** Папка инспектора */
export interface InspectorFolder {
    type: 'folder';
    title: string;
    expanded: boolean;
    children: InspectorEntity[];
}

/** Кнопка инспектора */
export interface InspectorButton {
    type: 'button';
    title: string;
    params?: ButtonParams;
    on_click: () => void;
}

/** Поле инспектора */
export interface InspectorField {
    type: 'field';
    key: string;
    label: string;
    object: Record<string, unknown>;
    params?: BindingParams;
    readonly?: boolean;
    on_before_change?: () => void;
    on_change?: (event: ChangeEvent) => void;
}

/** Сущность инспектора */
export type InspectorEntity = InspectorFolder | InspectorButton | InspectorField;

/** Параметры рендерера */
export interface InspectorRendererParams {
    /** Контейнер для инспектора */
    container: HTMLElement;
}

/** Интерфейс рендерера */
export interface IInspectorRenderer {
    /** Рендеринг сущностей */
    render(entities: InspectorEntity[]): void;

    /** Очистить инспектор */
    clear(): void;

    /** Обновить поле по ключу */
    refresh(keys: string[]): void;

    /** Получить TweakPane instance */
    get_pane(): Pane;

    /** Пост-обработка после рендеринга */
    after_render(): void;
}

/** Создать InspectorRenderer */
export function create_inspector_renderer(params: InspectorRendererParams): IInspectorRenderer {
    const { container } = params;

    const pane = new Pane({ container });
    const field_bindings: Map<string, Refreshable> = new Map();

    // Регистрация плагинов
    pane.registerPlugin(TweakpaneItemListPlugin);
    pane.registerPlugin(TweakpaneImagePlugin);
    pane.registerPlugin(TweakpaneSearchListPlugin);
    pane.registerPlugin(TextareaPlugin);
    pane.registerPlugin(ExtendedPointNdInputPlugin);
    pane.registerPlugin(TweakpaneExtendedBooleanPlugin);

    function render(entities: InspectorEntity[]): void {
        clear();
        render_entities(entities, pane);
    }

    function render_entities(entities: InspectorEntity[], parent: FolderApi | Pane): void {
        for (const entity of entities) {
            if (entity.type === 'folder') {
                const folder = parent.addFolder({
                    title: entity.title,
                    expanded: entity.expanded,
                });
                render_entities(entity.children, folder);
                continue;
            }

            if (entity.type === 'button') {
                parent.addButton(entity.params ?? { title: entity.title }).on('click', entity.on_click);
                continue;
            }

            // Field
            const binding_params: BindingParams = {
                label: entity.label,
                ...entity.params,
            };

            // Add readonly only if explicitly true
            if (entity.readonly === true) {
                (binding_params as Record<string, unknown>).readonly = true;
            }

            const binding = parent.addBinding(entity.object, 'value', binding_params);

            if (entity.on_before_change !== undefined) {
                binding.controller.value.emitter.on('beforechange', entity.on_before_change);
            }

            if (entity.on_change !== undefined) {
                binding.on('change', entity.on_change);
            }

            field_bindings.set(entity.key, binding as Refreshable);
        }
    }

    function clear(): void {
        for (const child of [...pane.children]) {
            child.dispose();
        }
        field_bindings.clear();
    }

    function refresh(keys: string[]): void {
        for (const key of keys) {
            const binding = field_bindings.get(key);
            if (binding !== undefined) {
                binding.refresh();
            }
        }
    }

    function get_pane(): Pane {
        return pane;
    }

    function after_render(): void {
        // Добавляем кастомный скролл
        const search_options = document.querySelector('.tp-search-listv_options') as HTMLDivElement | null;
        if (search_options !== null) {
            search_options.classList.add('my_scroll');
        }

        const thumb_overlay = document.querySelector('.tp-thumbv_ovl') as HTMLDivElement | null;
        if (thumb_overlay !== null) {
            thumb_overlay.classList.add('my_scroll');
        }

        // Фикс ширины для позиции
        document.querySelectorAll('.tp-lblv').forEach(el => {
            const label = el.querySelector('.tp-lblv_l') as HTMLElement | null;
            const value = el.querySelector('.tp-lblv_v') as HTMLElement | null;
            if (label !== null && value !== null && label.textContent?.trim() === 'Позиция') {
                value.style.width = '225px';
            }
        });
    }

    return {
        render,
        clear,
        refresh,
        get_pane,
        after_render,
    };
}

/** Singleton instance */
let renderer_instance: IInspectorRenderer | undefined;

/** Инициализировать singleton рендерер */
export function init_inspector_renderer(params: InspectorRendererParams): IInspectorRenderer {
    renderer_instance = create_inspector_renderer(params);
    return renderer_instance;
}

/** Получить singleton рендерер */
export function get_inspector_renderer(): IInspectorRenderer {
    if (renderer_instance === undefined) {
        throw new Error('InspectorRenderer не инициализирован. Вызовите init_inspector_renderer() сначала.');
    }
    return renderer_instance;
}

/** Проверить инициализацию */
export function is_inspector_renderer_initialized(): boolean {
    return renderer_instance !== undefined;
}
