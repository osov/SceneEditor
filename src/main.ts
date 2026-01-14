/**
 * Точка входа SceneEditor v3.0
 *
 * Архитектура:
 * - DI контейнер для управления зависимостями (src/core/di/)
 * - Система плагинов для расширяемости (src/core/plugins/)
 * - EventBusBridge для совместимости legacy и новых событий
 * - KeybindingsService для горячих клавиш
 *
 * Legacy код остаётся для обратной совместимости и будет
 * постепенно мигрирован на новые сервисы.
 */

import '@/assets/css/style.css';
import { PROJECT_NAME } from './config';

// === DI система ===
import { bootstrap, shutdown } from './core/bootstrap';
import { LogLevel } from './core/services/LoggerService';

// === Новые сервисы редактора ===
import { create_keybindings_service, create_event_bus_bridge } from './editor';
import type { IKeybindingsService, IEventBusBridge } from './editor';

// === Legacy: Движок ===
import { register_manager } from './modules/Manager';
import { register_engine } from './render_engine/engine';
import { register_scene_manager } from './render_engine/scene_manager';
import { register_resource_manager } from './render_engine/resource_manager';
import { register_tween_manager } from './render_engine/tween_manager';
import { register_audio_manager } from './render_engine/AudioManager';
import { register_lua_core } from './defold/core';

// === Legacy: UI ===
import { register_popups } from './modules_editor/Popups';
import { register_contextmenu } from './modules_editor/ContextMenu';
import { register_mesh_inspector } from './inspectors/MeshInspector';
import { register_asset_inspector } from './inspectors/AssetInspector';
import { register_paint_inspector } from './inspectors/PaintInspector';
import { register_cmp_mover_inspector } from './inspectors/ComponentMoverInspector';

// === Legacy: Контролы ===
import { register_tree_control } from './controls/TreeControl';
import { register_select_control } from './controls/SelectControl';
import { register_camera_control } from './controls/CameraContol';
import { register_size_control } from './controls/SizeControl';
import { register_transform_control } from './controls/TransformControl';
import { register_control_manager } from './controls/ControlManager';
import { register_history_control } from './controls/HistoryControl';
import { register_actions_control } from './controls/ActionsControl';
import { register_view_control } from './controls/ViewControl';
import { register_asset_control } from './controls/AssetControl';
import { register_grass_tree_control } from './controls/GrassTreeControl';
import { register_paint_control } from './controls/PaintControl';
import { register_components_control } from './controls/ComponentsControl';

/** Регистрация менеджеров движка (legacy) */
function register_engine_managers(): void {
    register_manager();
    register_engine();
    register_resource_manager();
    register_scene_manager();
    register_tween_manager();
    register_audio_manager();
    RenderEngine.init();
}

/** Регистрация legacy контролов */
function register_legacy_controls(): void {
    register_camera_control();
    register_select_control();
    register_size_control();
    register_transform_control();
    register_actions_control();
    register_view_control();
    register_asset_control();
    register_tree_control();
    register_popups();
    register_contextmenu();
    register_control_manager();
    register_history_control();
    register_grass_tree_control();
    register_paint_control();
    register_components_control();
}

/** Регистрация legacy инспекторов */
function register_legacy_inspectors(): void {
    register_mesh_inspector();
    register_asset_inspector();
    register_paint_inspector();
    register_cmp_mover_inspector();
}

/** Загрузка сцены проекта */
async function load_project_scene(): Promise<void> {
    if (PROJECT_NAME === '') {
        Log.error('Не передано имя проекта');
        return;
    }

    try {
        const main_file = await import(`../../${PROJECT_NAME}/src/main.ts`);
        main_file.main();
    } catch (e) {
        console.error(e);
        Log.error('Проект не загружен:', PROJECT_NAME);
    }
}

/** Глобальные сервисы для доступа из консоли */
let keybindings_service: IKeybindingsService | undefined;
let event_bus_bridge: IEventBusBridge | undefined;

/**
 * Регистрация горячих клавиш
 *
 * ПРИМЕЧАНИЕ: Многие горячие клавиши уже обрабатываются в legacy контролах:
 * - ViewControl: f, Ctrl+C/X/V/B/D, Delete, F2, i
 * - InputManager: Ctrl+Z, Ctrl+S
 *
 * Здесь регистрируем только дополнительные клавиши,
 * чтобы избежать двойного срабатывания.
 */
function register_default_keybindings(keybindings: IKeybindingsService): void {
    // Режимы трансформации (не обрабатываются в legacy)
    keybindings.register({ key: 'w', description: 'Перемещение' }, () => {
        if (typeof TransformControl !== 'undefined') {
            TransformControl.set_mode('translate');
        }
    });

    keybindings.register({ key: 'e', description: 'Вращение' }, () => {
        if (typeof TransformControl !== 'undefined') {
            TransformControl.set_mode('rotate');
        }
    });

    keybindings.register({ key: 'r', description: 'Масштаб' }, () => {
        if (typeof TransformControl !== 'undefined') {
            TransformControl.set_mode('scale');
        }
    });

    // Escape для сброса режима (если нужно)
    keybindings.register({ key: 'Escape', description: 'Отмена' }, () => {
        // Можно добавить логику отмены операции
    });
}

/** Главная функция инициализации */
async function main(): Promise<void> {
    console.log('[SceneEditor] Запуск v3.0...');

    // 1. Инициализация DI системы
    const result = await bootstrap({
        debug: true,
        logger_config: { min_level: LogLevel.DEBUG },
        plugin_config: {
            builtin_plugins: ['core-inspector'],
        },
    });

    const { logger, event_bus, plugin_manager } = result;

    logger.info('DI система инициализирована');
    logger.info(`Активные плагины: ${plugin_manager.get_active_plugins().map(p => p.plugin.manifest.id).join(', ')}`);

    // 2. Legacy инициализация (временно)
    // TODO: мигрировать на новые сервисы
    register_engine_managers();
    register_legacy_controls();
    register_legacy_inspectors();
    register_lua_core();

    logger.info('Legacy модули загружены');

    // 3. Инициализация новых сервисов редактора
    keybindings_service = create_keybindings_service({
        logger: logger.create_child('Keybindings'),
        event_bus,
    });
    register_default_keybindings(keybindings_service);
    logger.info('KeybindingsService инициализирован');

    // 4. Запуск моста EventBus
    event_bus_bridge = create_event_bus_bridge({
        logger: logger.create_child('EventBusBridge'),
        new_event_bus: event_bus,
    });
    event_bus_bridge.start();
    logger.info('EventBusBridge запущен');

    // 5. Запуск рендеринга
    const game_mode = new URLSearchParams(document.location.search).get('is_game') === '1';
    RenderEngine.animate();
    Input.bind_events();

    if (!game_mode) {
        SelectControl.init();
    }

    // 6. Загрузка проекта
    await load_project_scene();

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
