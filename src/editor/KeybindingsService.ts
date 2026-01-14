/**
 * KeybindingsService - сервис горячих клавиш
 *
 * Централизованное управление клавиатурными сочетаниями.
 * Поддерживает модификаторы (Ctrl, Shift, Alt) и контексты.
 */

import type { IDisposable, ILogger, IEventBus } from '../core/di/types';

/** Контекст горячей клавиши */
export type KeybindingContext = 'global' | 'editor' | 'inspector' | 'hierarchy' | 'assets';

/** Описание горячей клавиши */
export interface Keybinding {
    /** Основная клавиша */
    key: string;
    /** Требуется Ctrl/Cmd */
    ctrl?: boolean;
    /** Требуется Shift */
    shift?: boolean;
    /** Требуется Alt */
    alt?: boolean;
    /** Контекст применения */
    context?: KeybindingContext;
    /** Описание действия */
    description?: string;
}

/** Параметры сервиса */
export interface KeybindingsServiceParams {
    logger: ILogger;
    event_bus: IEventBus;
}

/** Интерфейс сервиса */
export interface IKeybindingsService extends IDisposable {
    /** Зарегистрировать горячую клавишу */
    register(binding: Keybinding, action: () => void): IDisposable;
    /** Снять регистрацию по ключу */
    unregister(key: string): void;
    /** Установить активный контекст */
    set_context(context: KeybindingContext): void;
    /** Получить активный контекст */
    get_context(): KeybindingContext;
    /** Проверить, активна ли горячая клавиша */
    is_active(binding: Keybinding): boolean;
    /** Получить все зарегистрированные клавиши */
    get_all(): Map<string, Keybinding>;
}

/** Внутренняя запись о горячей клавише */
interface KeybindingEntry {
    binding: Keybinding;
    action: () => void;
}

/** Создать уникальный ключ для сочетания клавиш */
function create_binding_key(binding: Keybinding): string {
    const parts: string[] = [];
    if (binding.ctrl === true) parts.push('ctrl');
    if (binding.shift === true) parts.push('shift');
    if (binding.alt === true) parts.push('alt');
    parts.push(binding.key.toLowerCase());
    return parts.join('+');
}

/** Создать KeybindingsService */
export function create_keybindings_service(params: KeybindingsServiceParams): IKeybindingsService {
    const { logger, event_bus } = params;

    const bindings = new Map<string, KeybindingEntry>();
    let current_context: KeybindingContext = 'global';
    let is_enabled = true;

    /** Обработчик нажатия клавиши */
    function handle_keydown(event: KeyboardEvent): void {
        if (!is_enabled) return;

        // Игнорируем ввод в полях ввода
        const target = event.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
            return;
        }

        const binding: Keybinding = {
            key: event.key,
            ctrl: event.ctrlKey || event.metaKey,
            shift: event.shiftKey,
            alt: event.altKey,
        };

        const key = create_binding_key(binding);
        const entry = bindings.get(key);

        if (entry === undefined) return;

        // Проверяем контекст
        const entry_context = entry.binding.context ?? 'global';
        if (entry_context !== 'global' && entry_context !== current_context) {
            return;
        }

        // Выполняем действие
        event.preventDefault();
        event.stopPropagation();

        logger.debug(`Горячая клавиша: ${key}`);
        entry.action();

        // Отправляем событие
        event_bus.emit('keybinding:triggered', { key, binding: entry.binding });
    }

    /** Зарегистрировать обработчик */
    function init(): void {
        document.addEventListener('keydown', handle_keydown);
        logger.info('KeybindingsService инициализирован');
    }

    function register(binding: Keybinding, action: () => void): IDisposable {
        const key = create_binding_key(binding);

        if (bindings.has(key)) {
            logger.warn(`Горячая клавиша ${key} уже зарегистрирована, перезаписываем`);
        }

        bindings.set(key, { binding, action });
        logger.debug(`Зарегистрирована горячая клавиша: ${key}`);

        return {
            dispose: () => {
                bindings.delete(key);
                logger.debug(`Снята регистрация горячей клавиши: ${key}`);
            },
        };
    }

    function unregister(key: string): void {
        const normalized_key = key.toLowerCase();
        if (bindings.delete(normalized_key)) {
            logger.debug(`Снята регистрация горячей клавиши: ${normalized_key}`);
        }
    }

    function set_context(context: KeybindingContext): void {
        if (context !== current_context) {
            current_context = context;
            logger.debug(`Контекст горячих клавиш: ${context}`);
            event_bus.emit('keybinding:context_changed', { context });
        }
    }

    function get_context(): KeybindingContext {
        return current_context;
    }

    function is_active(binding: Keybinding): boolean {
        const key = create_binding_key(binding);
        return bindings.has(key);
    }

    function get_all(): Map<string, Keybinding> {
        const result = new Map<string, Keybinding>();
        for (const [key, entry] of bindings) {
            result.set(key, entry.binding);
        }
        return result;
    }

    function dispose(): void {
        document.removeEventListener('keydown', handle_keydown);
        bindings.clear();
        is_enabled = false;
        logger.info('KeybindingsService освобождён');
    }

    // Инициализация
    init();

    return {
        register,
        unregister,
        set_context,
        get_context,
        is_active,
        get_all,
        dispose,
    };
}
