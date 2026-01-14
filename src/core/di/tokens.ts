/**
 * Токены сервисов для внедрения зависимостей
 *
 * Все идентификаторы сервисов определены здесь как символы
 * для типобезопасности и избежания коллизий строк.
 */

/** Базовые сервисы - фундаментальные строительные блоки */
export const CORE_TOKENS = {
    /** Сервис логирования */
    Logger: Symbol('Logger'),
    /** Шина событий для pub/sub */
    EventBus: Symbol('EventBus'),
    /** Сервис конфигурации */
    Config: Symbol('Config'),
    /** Системный сервис (время, информация о кадре) */
    System: Symbol('System'),
} as const;

/** Сервисы ввода */
export const INPUT_TOKENS = {
    /** Менеджер ввода (клавиатура, мышь) */
    InputManager: Symbol('InputManager'),
    /** Данные и конфигурация камеры */
    Camera: Symbol('Camera'),
} as const;

/** Сетевые сервисы */
export const NETWORK_TOKENS = {
    /** WebSocket клиент */
    WsClient: Symbol('WsClient'),
    /** REST API клиент */
    ClientAPI: Symbol('ClientAPI'),
} as const;

/** Сервисы рендеринга - связанные с Three.js */
export const RENDER_TOKENS = {
    /** Основной рендер движок (Three.js) - legacy */
    RenderEngine: Symbol('RenderEngine'),
    /** Менеджер сцены - управление объектами - legacy */
    SceneManager: Symbol('SceneManager'),
    /** Менеджер ресурсов - текстуры, материалы, модели - legacy */
    ResourceManager: Symbol('ResourceManager'),
    /** Менеджер анимаций (tween) */
    TweenManager: Symbol('TweenManager'),
    /** Менеджер аудио - 3D звук */
    AudioManager: Symbol('AudioManager'),
} as const;

/** Сервисы движка - новая архитектура */
export const ENGINE_TOKENS = {
    /** Сервис рендеринга */
    Render: Symbol('Render'),
    /** Сервис сцены */
    Scene: Symbol('Scene'),
    /** Сервис ресурсов */
    Resources: Symbol('Resources'),
    /** Сервис камеры */
    Camera: Symbol('Camera'),
} as const;

/** Сервисы графа сцены */
export const SCENE_TOKENS = {
    /** Сервис графа сцены - логика иерархии */
    SceneGraphService: Symbol('SceneGraphService'),
} as const;

/** Сервисы редактора - новая архитектура */
export const EDITOR_TOKENS = {
    /** Сервис выделения */
    Selection: Symbol('Selection'),
    /** Сервис истории */
    History: Symbol('History'),
    /** Сервис трансформации */
    Transform: Symbol('Transform'),
    /** Сервис действий */
    Actions: Symbol('Actions'),
    /** Сервис иерархии */
    Hierarchy: Symbol('Hierarchy'),
    /** Сервис горячих клавиш */
    Keybindings: Symbol('Keybindings'),
    /** Мост EventBus */
    EventBusBridge: Symbol('EventBusBridge'),
} as const;

/** Сервисы контролов редактора */
export const CONTROL_TOKENS = {
    /** Менеджер контролов - координирует все контролы */
    ControlManager: Symbol('ControlManager'),
    /** Контрол выделения */
    SelectControl: Symbol('SelectControl'),
    /** Контрол трансформации (перемещение, вращение, масштаб) */
    TransformControl: Symbol('TransformControl'),
    /** Контрол размера */
    SizeControl: Symbol('SizeControl'),
    /** Контрол камеры */
    CameraControl: Symbol('CameraControl'),
    /** Контрол вида */
    ViewControl: Symbol('ViewControl'),
    /** Контрол истории (undo/redo) */
    HistoryControl: Symbol('HistoryControl'),
    /** Контрол действий (копировать, вставить, удалить) */
    ActionsControl: Symbol('ActionsControl'),
    /** Контрол ассетов */
    AssetControl: Symbol('AssetControl'),
    /** Контрол дерева (иерархия сцены) */
    TreeControl: Symbol('TreeControl'),
    /** Контрол рисования */
    PaintControl: Symbol('PaintControl'),
    /** Контрол травы/деревьев */
    GrassTreeControl: Symbol('GrassTreeControl'),
    /** Контрол компонентов */
    ComponentsControl: Symbol('ComponentsControl'),
} as const;

/** UI сервисы */
export const UI_TOKENS = {
    /** Инспектор - редактирование свойств */
    Inspector: Symbol('Inspector'),
    /** Менеджер всплывающих окон */
    Popups: Symbol('Popups'),
    /** Контекстное меню */
    ContextMenu: Symbol('ContextMenu'),
} as const;

/** Сервисы инспекторов */
export const INSPECTOR_TOKENS = {
    /** Инспектор мешей */
    MeshInspector: Symbol('MeshInspector'),
    /** Инспектор ассетов */
    AssetInspector: Symbol('AssetInspector'),
    /** Инспектор рисования */
    PaintInspector: Symbol('PaintInspector'),
    /** Инспектор компонента перемещения */
    ComponentMoverInspector: Symbol('ComponentMoverInspector'),
    /** Реестр инспекторов - управляет типами полей */
    InspectorRegistry: Symbol('InspectorRegistry'),
} as const;

/** Сервисы плагинов */
export const PLUGIN_TOKENS = {
    /** Менеджер плагинов */
    PluginManager: Symbol('PluginManager'),
} as const;

/** Аудио сервисы */
export const AUDIO_TOKENS = {
    /** Менеджер звука */
    Sound: Symbol('Sound'),
} as const;

/** Все токены объединённые для удобства */
export const TOKENS = {
    ...CORE_TOKENS,
    ...INPUT_TOKENS,
    ...NETWORK_TOKENS,
    ...RENDER_TOKENS,
    ...ENGINE_TOKENS,
    ...SCENE_TOKENS,
    ...EDITOR_TOKENS,
    ...CONTROL_TOKENS,
    ...UI_TOKENS,
    ...INSPECTOR_TOKENS,
    ...PLUGIN_TOKENS,
    ...AUDIO_TOKENS,
} as const;

/** Тип-хелпер для получения типа токена */
export type TokenType = typeof TOKENS;
export type TokenKey = keyof TokenType;
export type Token = TokenType[TokenKey];

/**
 * Константы порядка инициализации
 * Меньшие числа инициализируются раньше
 *
 * Группы:
 * - Core (0-99): базовые сервисы
 * - Engine (100-199): сервисы движка
 * - Editor (200-299): сервисы редактора
 * - Inspector (300-399): инспекторы
 * - Plugins (1000+): плагины
 */
export const INIT_ORDER = {
    // === Core (0-99) ===
    /** Логирование (нужно большинству сервисов) */
    LOGGER: 0,
    /** Системная конфигурация */
    CONFIG: 10,
    /** Базовые сервисы, от которых зависят другие */
    CORE: 10,
    /** Шина событий (основа коммуникации) */
    EVENT_BUS: 20,
    /** Обработка ввода */
    INPUT: 30,
    /** Сетевые сервисы */
    NETWORK: 40,
    /** Менеджер плагинов */
    PLUGIN_MANAGER: 50,

    // === Engine (100-199) ===
    /** Сервис рендеринга */
    ENGINE_RENDER: 100,
    /** Сервис ресурсов */
    ENGINE_RESOURCES: 110,
    /** Сервис сцены */
    ENGINE_SCENE: 120,
    /** Сервис камеры */
    ENGINE_CAMERA: 130,
    /** Legacy рендер */
    RENDER: 100,
    /** Legacy сцена */
    SCENE: 120,
    /** Legacy ресурсы */
    RESOURCES: 110,
    /** Граф сцены (иерархия) */
    SCENE_GRAPH: 125,

    // === Editor (200-299) ===
    /** Сервис выделения */
    EDITOR_SELECTION: 200,
    /** Сервис истории */
    EDITOR_HISTORY: 210,
    /** Сервис трансформации */
    EDITOR_TRANSFORM: 220,
    /** Сервис действий */
    EDITOR_ACTIONS: 230,
    /** Сервис иерархии */
    EDITOR_HIERARCHY: 240,
    /** Legacy контролы */
    CONTROLS: 200,
    /** UI сервисы */
    UI: 250,

    // === Inspector (300-399) ===
    /** Реестр полей инспектора */
    INSPECTOR_REGISTRY: 300,
    /** Инспекторы */
    INSPECTORS: 310,

    // === Plugins (1000+) ===
    /** Система плагинов */
    PLUGINS: 1000,

    /** По умолчанию для неуказанных сервисов */
    DEFAULT: 500,
} as const;
