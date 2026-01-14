/**
 * HistoryService - сервис истории (undo/redo)
 *
 * Управляет историей действий для отмены и повтора.
 * Поддерживает группировку действий.
 */

import type {
    IHistoryService,
    HistoryServiceParams,
    HistoryAction,
    HistoryEntry,
} from './types';

/** Внутренняя запись истории с полным действием */
interface InternalHistoryEntry {
    action: HistoryAction<unknown>;
    timestamp: number;
}

/** Группа действий */
interface ActionGroup {
    description: string;
    actions: HistoryAction<unknown>[];
}

/** Максимальный размер истории по умолчанию */
const DEFAULT_MAX_HISTORY_SIZE = 100;

/** Создать HistoryService */
export function create_history_service(params: HistoryServiceParams): IHistoryService {
    const { logger, event_bus, max_history_size = DEFAULT_MAX_HISTORY_SIZE } = params;

    // Стеки истории
    const undo_stack: InternalHistoryEntry[] = [];
    const redo_stack: InternalHistoryEntry[] = [];

    // Группировка
    let current_group: ActionGroup | null = null;

    function push<T>(action: HistoryAction<T>): void {
        // Если идёт группировка, добавляем в группу
        if (current_group !== null) {
            current_group.actions.push(action as HistoryAction<unknown>);
            return;
        }

        // Добавляем в undo стек
        undo_stack.push({
            action: action as HistoryAction<unknown>,
            timestamp: Date.now(),
        });

        // Очищаем redo стек при новом действии
        redo_stack.length = 0;

        // Ограничиваем размер истории
        while (undo_stack.length > max_history_size) {
            undo_stack.shift();
        }

        logger.debug(`История: добавлено "${action.description ?? action.type}"`);
        emit_changed();
    }

    function undo(): void {
        if (!can_undo()) {
            logger.warn('Нечего отменять');
            return;
        }

        const entry = undo_stack.pop()!;
        const { action } = entry;

        try {
            action.undo(action.data);
            redo_stack.push(entry);
            logger.debug(`Отмена: "${action.description ?? action.type}"`);
            event_bus.emit('history:undo', { type: action.type });
        } catch (error) {
            logger.error('Ошибка при отмене', error);
            // Возвращаем в undo стек при ошибке
            undo_stack.push(entry);
        }

        emit_changed();
    }

    function redo(): void {
        if (!can_redo()) {
            logger.warn('Нечего повторять');
            return;
        }

        const entry = redo_stack.pop()!;
        const { action } = entry;

        try {
            action.redo(action.data);
            undo_stack.push(entry);
            logger.debug(`Повтор: "${action.description ?? action.type}"`);
            event_bus.emit('history:redo', { type: action.type });
        } catch (error) {
            logger.error('Ошибка при повторе', error);
            // Возвращаем в redo стек при ошибке
            redo_stack.push(entry);
        }

        emit_changed();
    }

    function can_undo(): boolean {
        return undo_stack.length > 0;
    }

    function can_redo(): boolean {
        return redo_stack.length > 0;
    }

    function clear(): void {
        undo_stack.length = 0;
        redo_stack.length = 0;
        current_group = null;
        logger.info('История очищена');
        emit_changed();
    }

    function get_undo_stack(): HistoryEntry[] {
        return undo_stack.map(entry => ({
            type: entry.action.type,
            description: entry.action.description ?? entry.action.type,
            timestamp: entry.timestamp,
        }));
    }

    function get_redo_stack(): HistoryEntry[] {
        return redo_stack.map(entry => ({
            type: entry.action.type,
            description: entry.action.description ?? entry.action.type,
            timestamp: entry.timestamp,
        }));
    }

    function begin_group(description: string): void {
        if (current_group !== null) {
            logger.warn('Группа уже начата');
            return;
        }
        current_group = {
            description,
            actions: [],
        };
        logger.debug(`Начата группа: "${description}"`);
    }

    function end_group(): void {
        if (current_group === null) {
            logger.warn('Нет активной группы');
            return;
        }

        const group = current_group;
        current_group = null;

        if (group.actions.length === 0) {
            logger.debug('Пустая группа, пропускаем');
            return;
        }

        // Создаём составное действие
        const composite_action: HistoryAction<HistoryAction<unknown>[]> = {
            type: 'group',
            description: group.description,
            data: group.actions,
            undo: (actions) => {
                // Отменяем в обратном порядке
                for (let i = actions.length - 1; i >= 0; i--) {
                    actions[i].undo(actions[i].data);
                }
            },
            redo: (actions) => {
                // Повторяем в прямом порядке
                for (const action of actions) {
                    action.redo(action.data);
                }
            },
        };

        push(composite_action);
        logger.debug(`Завершена группа: "${group.description}" (${group.actions.length} действий)`);
    }

    function emit_changed(): void {
        event_bus.emit('history:changed', {
            can_undo: can_undo(),
            can_redo: can_redo(),
            undo_count: undo_stack.length,
            redo_count: redo_stack.length,
        });
    }

    function dispose(): void {
        clear();
        logger.info('HistoryService освобождён');
    }

    return {
        push,
        undo,
        redo,
        can_undo,
        can_redo,
        clear,
        get_undo_stack,
        get_redo_stack,
        begin_group,
        end_group,
        dispose,
    };
}
