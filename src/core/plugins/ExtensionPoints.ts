/**
 * Точки расширения редактора
 *
 * Определяет все точки, в которые плагины могут добавлять функциональность
 */

/** Идентификаторы точек расширения */
export const EXTENSION_POINTS = {
    // Инспектор

    /** Типы полей инспектора */
    INSPECTOR_FIELD_TYPES: 'editor.inspector.field_types',

    /** Провайдеры инспекторов для объектов */
    OBJECT_INSPECTORS: 'editor.inspectors',

    /** Валидаторы полей */
    FIELD_VALIDATORS: 'editor.inspector.validators',

    // Контекстное меню

    /** Пункты контекстного меню */
    CONTEXT_MENU_ITEMS: 'editor.context_menu.items',

    /** Разделители контекстного меню */
    CONTEXT_MENU_SEPARATORS: 'editor.context_menu.separators',

    // Сцена

    /** Типы объектов сцены */
    SCENE_OBJECT_TYPES: 'editor.scene.object_types',

    /** Обработчики создания объектов */
    SCENE_OBJECT_CREATORS: 'editor.scene.creators',

    // Команды и горячие клавиши

    /** Команды редактора */
    COMMANDS: 'editor.commands',

    /** Горячие клавиши */
    KEYBINDINGS: 'editor.keybindings',

    // UI

    /** Панели UI */
    UI_PANELS: 'editor.ui.panels',

    /** Тулбары */
    TOOLBARS: 'editor.ui.toolbars',

    /** Пункты главного меню */
    MENU_ITEMS: 'editor.ui.menu_items',

    // Экспорт/Импорт

    /** Экспортёры */
    EXPORTERS: 'editor.exporters',

    /** Импортёры */
    IMPORTERS: 'editor.importers',

    // Ресурсы

    /** Загрузчики ресурсов */
    RESOURCE_LOADERS: 'editor.resources.loaders',

    /** Превью ресурсов */
    RESOURCE_PREVIEWS: 'editor.resources.previews',

    // Контролы

    /** Режимы редактирования */
    EDIT_MODES: 'editor.controls.edit_modes',

    /** Инструменты рисования */
    PAINT_TOOLS: 'editor.controls.paint_tools',

    // Хуки жизненного цикла

    /** Хуки при загрузке сцены */
    SCENE_LOAD_HOOKS: 'editor.hooks.scene_load',

    /** Хуки при сохранении сцены */
    SCENE_SAVE_HOOKS: 'editor.hooks.scene_save',

    /** Хуки при выделении объектов */
    SELECTION_HOOKS: 'editor.hooks.selection',
} as const;

/** Тип точки расширения */
export type ExtensionPointId = typeof EXTENSION_POINTS[keyof typeof EXTENSION_POINTS];

// Типы расширений для каждой точки

/** Тип поля инспектора */
/** @noSelf */
export interface InspectorFieldTypeExtension {
    /** Уникальный ID типа */
    id: string;
    /** Отображаемое имя */
    name: string;
    /** Функция создания UI компонента */
    create_binding: (params: unknown) => unknown;
    /** Функция сериализации значения */
    serialize?: (value: unknown) => unknown;
    /** Функция десериализации значения */
    deserialize?: (data: unknown) => unknown;
}

/** Провайдер инспектора объектов */
/** @noSelf */
export interface ObjectInspectorExtension {
    /** Уникальный ID провайдера */
    id: string;
    /** Приоритет (выше = раньше) */
    priority: number;
    /** Проверка, может ли провайдер обработать объект */
    can_inspect: (target: unknown) => boolean;
    /** Получить поля для инспекции */
    get_properties: (target: unknown) => unknown[];
}

/** Пункт контекстного меню */
export interface ContextMenuItemExtension {
    /** Уникальный ID пункта */
    id: string;
    /** Отображаемый текст */
    label: string;
    /** Иконка (опционально) */
    icon?: string;
    /** Группа пунктов */
    group?: string;
    /** Порядок в группе */
    order?: number;
    /** Проверка, показывать ли пункт */
    when?: (context: unknown) => boolean;
    /** Обработчик клика */
    execute: (context: unknown) => void;
}

/** Команда редактора */
/** @noSelf */
export interface CommandExtension {
    /** Уникальный ID команды */
    id: string;
    /** Название команды */
    title: string;
    /** Категория */
    category?: string;
    /** Выполнить команду */
    execute: (...args: unknown[]) => void | Promise<void>;
    /** Проверка, доступна ли команда */
    is_enabled?: () => boolean;
}

/** Горячая клавиша */
export interface KeybindingExtension {
    /** ID команды */
    command: string;
    /** Комбинация клавиш (например "Ctrl+S") */
    key: string;
    /** Контекст (когда работает) */
    when?: string;
}

/** Тип объекта сцены */
/** @noSelf */
export interface SceneObjectTypeExtension {
    /** Уникальный ID типа */
    id: string;
    /** Отображаемое имя */
    name: string;
    /** Иконка */
    icon?: string;
    /** Создать объект данного типа */
    create: (options?: unknown) => unknown;
    /** Проверка, является ли объект данным типом */
    is_type: (obj: unknown) => boolean;
}

/** Экспортёр */
/** @noSelf */
export interface ExporterExtension {
    /** Уникальный ID экспортёра */
    id: string;
    /** Название формата */
    name: string;
    /** Расширение файла */
    extension: string;
    /** Экспортировать сцену */
    export: (scene: unknown, options?: unknown) => Promise<Blob | string>;
}

/** Импортёр */
/** @noSelf */
export interface ImporterExtension {
    /** Уникальный ID импортёра */
    id: string;
    /** Название формата */
    name: string;
    /** Поддерживаемые расширения */
    extensions: string[];
    /** Импортировать файл */
    import: (file: File, options?: unknown) => Promise<unknown>;
}
