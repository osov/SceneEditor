/**
 * Контроллер инспектора
 *
 * Управляет отображением и обновлением полей инспектора.
 * Использует реестр типов полей для создания привязок.
 */

import type { ILogger } from '../di/types';
import type {
    IInspectorController,
    IFieldTypeRegistry,
    ObjectData,
    PropertyData,
    PropertyType,
    BindingResult,
} from './types';

/** Параметры создания контроллера инспектора */
interface InspectorControllerParams {
    /** Реестр типов полей */
    field_registry: IFieldTypeRegistry;
    /** HTML элемент контейнера */
    container: HTMLElement;
    /** Логгер (опционально) */
    logger?: ILogger;
}

/** Уникальное поле с ID объектов */
interface UniqueField {
    /** ID объектов с этим полем */
    ids: number[];
    /** Данные поля */
    data: PropertyData<PropertyType>;
}

/** Создать контроллер инспектора */
export function create_inspector_controller(params: InspectorControllerParams): IInspectorController {
    const { field_registry, container, logger } = params;

    /** Текущие данные */
    let _data: ObjectData[] = [];

    /** Уникальные поля */
    let _unique_fields: UniqueField[] = [];

    /** Привязки полей */
    const _bindings = new Map<string, BindingResult>();

    /** TweakPane экземпляр (загружается динамически) */
    let _pane: unknown = null;

    /** Инициализировать TweakPane */
    async function init_pane(): Promise<void> {
        if (_pane !== null) {
            return;
        }

        try {
            const { Pane } = await import('tweakpane');
            _pane = new Pane({ container });

            // Регистрируем плагины TweakPane
            await register_tweakpane_plugins();

            logger?.debug('TweakPane инициализирован');
        } catch (error) {
            logger?.error('Ошибка инициализации TweakPane:', error);
            throw error;
        }
    }

    /** Зарегистрировать плагины TweakPane */
    async function register_tweakpane_plugins(): Promise<void> {
        if (_pane === null) {
            return;
        }

        const pane = _pane as { registerPlugin: (plugin: unknown) => void };

        try {
            // Загружаем и регистрируем плагины
            const plugins = await Promise.all([
                import('tweakpane4-item-list-plugin'),
                import('tweakpane4-image-list-plugin'),
                import('tweakpane4-search-list-plugin'),
                import('@pangenerator/tweakpane-textarea-plugin'),
                import('tweakpane4-extended-vector-plugin'),
                import('tweakpane4-extended-boolean-plugin'),
            ]);

            for (const plugin of plugins) {
                pane.registerPlugin(plugin);
            }

            logger?.debug('Плагины TweakPane зарегистрированы');
        } catch (error) {
            logger?.warn('Некоторые плагины TweakPane не загружены:', error);
        }
    }

    /** Фильтровать уникальные поля - удалить те, которых нет в новом списке */
    function filter_unique_fields(
        unique_fields: UniqueField[],
        new_fields: PropertyData<PropertyType>[]
    ): void {
        const new_keys = new Set(new_fields.map(f => f.key));

        for (let i = unique_fields.length - 1; i >= 0; i--) {
            if (!new_keys.has(unique_fields[i].data.key)) {
                unique_fields.splice(i, 1);
            }
        }
    }

    /** Добавить поле в уникальные с проверкой на совпадение */
    function try_add_to_unique_field(
        object_data: ObjectData,
        unique_fields: UniqueField[],
        field: PropertyData<PropertyType>
    ): void {
        const existing = unique_fields.find(uf => uf.data.key === field.key);

        if (existing !== undefined) {
            // Добавляем ID объекта если поле совпадает
            if (existing.data.type === field.type) {
                existing.ids.push(object_data.id);
            }
        } else {
            // Новое поле
            unique_fields.push({
                ids: [object_data.id],
                data: field,
            });
        }
    }

    /** Очистить все привязки */
    function clear_bindings(): void {
        for (const [_, binding] of _bindings) {
            if (binding.dispose !== undefined) {
                binding.dispose();
            }
        }
        _bindings.clear();
    }

    /** Отрендерить поля */
    function render_fields(): void {
        if (_pane === null) {
            logger?.warn('TweakPane не инициализирован');
            return;
        }

        const pane = _pane as { children: unknown[]; addFolder: (params: { title: string; expanded?: boolean }) => unknown };

        // Очищаем предыдущие поля
        clear_bindings();

        // Очищаем pane
        while (pane.children.length > 0) {
            (pane.children[0] as { dispose: () => void }).dispose();
        }

        // Создаём привязки для каждого уникального поля
        for (const unique_field of _unique_fields) {
            const target_object: Record<string, unknown> = {
                [unique_field.data.key]: unique_field.data.value,
            };

            const result = field_registry.create_binding({
                field: unique_field.data,
                object_ids: unique_field.ids,
                folder: _pane,
                target_object,
            });

            if (result !== undefined) {
                _bindings.set(unique_field.data.key, result);
            }
        }
    }

    // Публичные методы

    function set_data(list_data: ObjectData[]): void {
        _data = list_data;
        _unique_fields = [];

        // Собираем уникальные поля
        for (const [_, obj] of list_data.entries()) {
            const fields: PropertyData<PropertyType>[] = [...obj.fields];

            // Удаляем поля которых нет в текущем объекте
            filter_unique_fields(_unique_fields, fields);

            // Добавляем поля
            for (const field of fields) {
                try_add_to_unique_field(obj, _unique_fields, field);
            }
        }

        // Рендерим
        render_fields();
    }

    function refresh(field_keys: string[]): void {
        const keys_set = new Set(field_keys);

        for (const unique_field of _unique_fields) {
            if (!keys_set.has(unique_field.data.key)) {
                continue;
            }

            // Вызываем on_refresh для получения нового значения
            if (unique_field.data.on_refresh !== undefined) {
                const new_value = unique_field.data.on_refresh(unique_field.ids);
                if (new_value !== undefined) {
                    unique_field.data.value = new_value;
                }
            }

            // Обновляем привязку
            const binding_result = _bindings.get(unique_field.data.key);
            if (binding_result !== undefined) {
                const binding_api = binding_result.binding as { refresh?: () => void };
                if (binding_api.refresh !== undefined) {
                    binding_api.refresh();
                }
            }
        }
    }

    function clear(): void {
        _data = [];
        _unique_fields = [];
        clear_bindings();

        if (_pane !== null) {
            const pane = _pane as { children: unknown[] };
            while (pane.children.length > 0) {
                (pane.children[0] as { dispose: () => void }).dispose();
            }
        }
    }

    function get_data(): ObjectData[] {
        return _data;
    }

    function dispose(): void {
        clear();

        if (_pane !== null) {
            (_pane as { dispose: () => void }).dispose();
            _pane = null;
        }
    }

    // Инициализируем TweakPane асинхронно
    init_pane().catch(error => {
        logger?.error('Ошибка инициализации инспектора:', error);
    });

    return {
        set_data,
        refresh,
        clear,
        get_data,
        dispose,
    };
}
