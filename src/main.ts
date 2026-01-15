/**
 * Точка входа SceneEditor v3.0
 *
 * Архитектура:
 * - DI контейнер для управления зависимостями (src/core/di/)
 * - Система плагинов для расширяемости (src/core/plugins/)
 * - Сервисы движка и редактора без legacy кода
 * - KeybindingsService для горячих клавиш
 */

import '@/assets/css/style.css';
import { PROJECT_NAME } from './config';

// === DI система ===
import { bootstrap, shutdown } from './core/bootstrap';
import { LogLevel } from './core/services/LoggerService';
import type { IContainer, IEventBus } from './core/di/types';
import { TOKENS } from './core/di/tokens';

// === Типы сервисов ===
import type {
    ISelectionService,
    IActionsService,
    IHistoryService,
} from './editor/types';
import type { ICameraService } from './engine/types';

// === Новые сервисы редактора ===
import { create_keybindings_service, create_event_bus_bridge } from './editor';
import type { IKeybindingsService, IEventBusBridge } from './editor';

// === UI модули редактора ===
import { get_control_manager } from './modules_editor/ControlManager';

/** Загрузка сцены проекта */
async function load_project_scene(logger: { error: (msg: string, ...args: unknown[]) => void }): Promise<void> {
    if (PROJECT_NAME === '') {
        logger.error('Не передано имя проекта');
        return;
    }

    try {
        const main_file = await import(`../../${PROJECT_NAME}/src/main.ts`);
        main_file.main();
    } catch (e) {
        console.error(e);
        logger.error('Проект не загружен:', PROJECT_NAME);
    }
}

/** Глобальные сервисы для доступа из консоли */
let keybindings_service: IKeybindingsService | undefined;
let event_bus_bridge: IEventBusBridge | undefined;

/**
 * Регистрация горячих клавиш
 *
 * Централизованное управление всеми горячими клавишами редактора.
 * Поддерживает русскую раскладку автоматически через KeybindingsService.
 *
 * Использует сервисы из DI контейнера.
 */
function register_default_keybindings(keybindings: IKeybindingsService, container: IContainer): void {
    // Получаем сервисы из DI контейнера
    const actions = container.resolve<IActionsService>(TOKENS.Actions);
    const history = container.resolve<IHistoryService>(TOKENS.History);
    const selection = container.resolve<ISelectionService>(TOKENS.Selection);
    const event_bus = container.resolve<IEventBus>(TOKENS.EventBus);
    const camera = container.resolve<ICameraService>(TOKENS.Camera);

    // UI модули
    const control_manager = get_control_manager();

    // === Режимы трансформации ===
    // ControlManager активирует контрол и устанавливает режим напрямую
    keybindings.register({ key: 'w', description: 'Перемещение' }, () => {
        control_manager.set_active_control('translate_transform_btn');
    });

    keybindings.register({ key: 'e', description: 'Вращение' }, () => {
        control_manager.set_active_control('rotate_transform_btn');
    });

    keybindings.register({ key: 'r', description: 'Масштаб' }, () => {
        control_manager.set_active_control('scale_transform_btn');
    });

    // === Операции с объектами ===
    keybindings.register({ key: 'c', ctrl: true, description: 'Копировать' }, () => {
        actions.copy();
    });

    keybindings.register({ key: 'x', ctrl: true, description: 'Вырезать' }, () => {
        actions.cut();
    });

    keybindings.register({ key: 'v', ctrl: true, description: 'Вставить' }, () => {
        actions.paste();
    });

    keybindings.register({ key: 'd', ctrl: true, description: 'Дублировать' }, () => {
        actions.duplicate();
    });

    keybindings.register({ key: 'Delete', description: 'Удалить' }, () => {
        actions.delete_selected();
    });

    keybindings.register({ key: 'a', ctrl: true, description: 'Выделить всё' }, () => {
        selection.select_all();
    });

    // === Камера и навигация ===
    keybindings.register({ key: 'f', description: 'Фокус на объекте' }, () => {
        camera.focus_on_selected();
    });

    // === История ===
    keybindings.register({ key: 'z', ctrl: true, description: 'Отменить' }, () => {
        history.undo();
    });

    keybindings.register({ key: 'y', ctrl: true, description: 'Повторить' }, () => {
        history.redo();
    });

    // === Сохранение ===
    keybindings.register({ key: 's', ctrl: true, description: 'Сохранить' }, () => {
        event_bus.emit('editor:save', {});
    });

    // === Отмена операции ===
    keybindings.register({ key: 'Escape', description: 'Отмена' }, () => {
        selection.clear();
    });
}

/** Главная функция инициализации */
async function main(): Promise<void> {
    console.log('[SceneEditor] Запуск v3.0...');

    // Получаем canvas для рендеринга
    const canvas = document.querySelector<HTMLCanvasElement>('canvas#scene');
    if (canvas === null) {
        throw new Error('Canvas элемент не найден');
    }

    // 1. Инициализация DI системы
    const result = await bootstrap({
        debug: true,
        logger_config: { min_level: LogLevel.DEBUG },
        plugin_config: {
            builtin_plugins: ['core-inspector'],
        },
    });

    const { container, logger, event_bus, plugin_manager, register_services } = result;

    logger.info('DI система инициализирована');
    logger.info(`Активные плагины: ${plugin_manager.get_active_plugins().map(p => p.plugin.manifest.id).join(', ')}`);

    // 2. Регистрация сервисов движка и редактора
    register_services(canvas);

    // 3. Инициализация KeybindingsService
    keybindings_service = create_keybindings_service({
        logger: logger.create_child('Keybindings'),
        event_bus,
    });
    register_default_keybindings(keybindings_service, container);

    // Регистрируем KeybindingsService в DI контейнере
    container.register_singleton(TOKENS.Keybindings, () => keybindings_service!, {
        name: 'KeybindingsService',
    });

    // 4. Запуск моста EventBus (для совместимости с legacy событиями если нужно)
    event_bus_bridge = create_event_bus_bridge({
        logger: logger.create_child('EventBusBridge'),
        new_event_bus: event_bus,
    });
    event_bus_bridge.start();

    // Регистрируем EventBusBridge в DI контейнере
    container.register_singleton(TOKENS.EventBusBridge, () => event_bus_bridge!, {
        name: 'EventBusBridge',
    });

    // 5. Загрузка проекта
    await load_project_scene(logger);

    logger.info('SceneEditor готов к работе');

    // Обработка закрытия
    window.addEventListener('beforeunload', () => {
        keybindings_service?.dispose();
        event_bus_bridge?.dispose();
        shutdown();
    });
}

// Запуск
main().catch((err) => {
    console.error('[SceneEditor] Критическая ошибка:', err);
});
