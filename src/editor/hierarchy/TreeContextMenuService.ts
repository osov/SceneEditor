/**
 * TreeContextMenuService - логика контекстного меню дерева иерархии
 *
 * Извлечено из TreeControl.ts (Фаза 17)
 * Определяет доступные действия для элементов меню
 */

import type { TreeItem } from './types';
import { NodeAction, NodeActionGui, NodeActionGo, worldGo, worldGui, componentsGo } from '../../shared/types';
import { DEFOLD_LIMITS } from '../../config';

/**
 * Информация о проверке действия
 */
export interface ActionCheckResult {
    /** Активно ли действие */
    active: boolean;
    /** Причина деактивации */
    reason?: string;
}

/**
 * Элемент контекстного меню
 */
export interface ContextMenuItem {
    text: string;
    action?: number;
    not_active?: boolean;
    children?: ContextMenuItem[];
}

/**
 * Функции проверки валидности действий
 */
export interface ActionValidators {
    /** Проверка валидности вставки */
    is_valid_paste: (target_item: TreeItem | null) => boolean;
    /** Проверка валидности вставки как дочерний */
    is_valid_paste_child: (target_item: TreeItem | null) => boolean;
}

/**
 * Создаёт сервис контекстного меню дерева
 */
export function TreeContextMenuServiceCreate(validators: ActionValidators) {
    /**
     * Проверяет доступность действия для элемента
     */
    function check_action(item: TreeItem | null, action: number): ActionCheckResult {
        if (item === null) {
            return { active: false, reason: 'no_item' };
        }

        // Переименование
        if (action === NodeAction.rename) {
            if (item.no_rename === true || item.id === -1) {
                return { active: false, reason: 'no_rename' };
            }
        }

        // Вырезать / Удалить
        if (action === NodeAction.CTRL_X || action === NodeAction.remove) {
            if (item.no_remove === true || item.id === -1) {
                return { active: false, reason: 'no_remove' };
            }
        }

        // Копировать / Дублировать
        if (action === NodeAction.CTRL_C || action === NodeAction.CTRL_D) {
            if (item.id === -1) {
                return { active: false, reason: 'root_item' };
            }
        }

        // Вставить
        if (action === NodeAction.CTRL_V) {
            if (item.id === -1) {
                return { active: false, reason: 'root_item' };
            }
            if (!validators.is_valid_paste(item)) {
                return { active: false, reason: 'invalid_paste' };
            }
        }

        // Вставить дочерним
        if (action === NodeAction.CTRL_B) {
            if (item.id === -1) {
                if (!validators.is_valid_paste_child(item)) {
                    return { active: false, reason: 'invalid_paste' };
                }
            } else {
                if (item.no_drop === true || !validators.is_valid_paste_child(item)) {
                    return { active: false, reason: 'no_drop_or_invalid' };
                }
            }
        }

        // Компоненты - разрешены только удаление и дублирование
        if (item.icon.indexOf('component') > -1) {
            if (![NodeAction.remove, NodeAction.CTRL_D].includes(action)) {
                return { active: false, reason: 'component_restriction' };
            }
        }

        // Базовая сущность - только удаление
        if (item.icon === 'base_entity' && action !== NodeAction.remove) {
            return { active: false, reason: 'base_entity_restriction' };
        }

        // Ограничения Defold
        if (DEFOLD_LIMITS) {
            // Внутри Go нельзя создавать gui
            if (NodeActionGui.includes(action) && worldGo.includes(item.icon)) {
                return { active: false, reason: 'go_gui_restriction' };
            }

            // Внутри Gui нельзя создавать Go
            if (NodeActionGo.includes(action) && worldGui.includes(item.icon)) {
                return { active: false, reason: 'gui_go_restriction' };
            }

            // Внутри gui_container нельзя создавать gui_container
            if (action === NodeAction.add_gui_container && worldGui.includes(item.icon)) {
                return { active: false, reason: 'nested_gui_container' };
            }

            // Внутри sprite/label/model ничего нельзя создавать
            if ([...NodeActionGui, ...NodeActionGo].includes(action) && componentsGo.includes(item.icon)) {
                return { active: false, reason: 'component_child_restriction' };
            }

            // В корне можно создавать только GO_CONTAINER / GUI_CONTAINER
            const root_blacklist = [
                NodeAction.add_gui_box,
                NodeAction.add_gui_text,
                NodeAction.add_go_sprite_component,
                NodeAction.add_go_label_component,
                NodeAction.add_go_model_component,
                NodeAction.add_go_animated_model_component,
                NodeAction.add_go_audio_component
            ];
            if (item.id === -1 && root_blacklist.includes(action)) {
                return { active: false, reason: 'root_creation_restriction' };
            }
        }

        return { active: true };
    }

    /**
     * Создаёт элемент контекстного меню с проверкой доступности
     */
    function create_menu_item(text: string, action: number, item: TreeItem | null): ContextMenuItem {
        const result = check_action(item, action);
        return {
            text,
            action,
            not_active: !result.active
        };
    }

    /**
     * Генерирует список элементов контекстного меню
     */
    function get_menu_items(item: TreeItem | null): ContextMenuItem[] {
        const menu: ContextMenuItem[] = [];

        // Основные действия
        menu.push(create_menu_item('Переименовать', NodeAction.rename, item));
        menu.push(create_menu_item('Вырезать', NodeAction.CTRL_X, item));
        menu.push(create_menu_item('Копировать', NodeAction.CTRL_C, item));
        menu.push(create_menu_item('Вставить', NodeAction.CTRL_V, item));
        menu.push(create_menu_item('Вставить дочерним', NodeAction.CTRL_B, item));
        menu.push(create_menu_item('Дублировать', NodeAction.CTRL_D, item));
        menu.push(create_menu_item('Удалить', NodeAction.remove, item));
        menu.push({ text: 'line' });

        // UI меню
        menu.push({
            text: 'Создать UI',
            children: [
                create_menu_item('Добавить контейнер', NodeAction.add_gui_container, item),
                create_menu_item('Добавить блок', NodeAction.add_gui_box, item),
                create_menu_item('Добавить текст', NodeAction.add_gui_text, item),
                { text: 'line' },
                {
                    text: 'Расширенные',
                    children: [
                        create_menu_item('Добавить кнопку', -5, item),
                        create_menu_item('Добавить прогресс бар', -5, item),
                        create_menu_item('Добавить скрол', -5, item)
                    ]
                }
            ]
        });

        menu.push({ text: 'line' });

        // Game меню
        menu.push({
            text: 'Game',
            children: [
                create_menu_item('Добавить контейнер', NodeAction.add_go_container, item),
                create_menu_item('Добавить спрайт', NodeAction.add_go_sprite_component, item),
                create_menu_item('Добавить надпись', NodeAction.add_go_label_component, item),
                create_menu_item('Добавить модель', NodeAction.add_go_model_component, item),
                create_menu_item('Добавить аним-модель', NodeAction.add_go_animated_model_component, item),
                create_menu_item('Добавить звук', NodeAction.add_go_audio_component, item)
            ]
        });

        menu.push({ text: 'line' });

        // Компоненты
        menu.push({
            text: 'Компонент',
            children: [
                create_menu_item('Сплайн', NodeAction.add_component_spline, item),
                create_menu_item('Движение', NodeAction.add_component_mover, item)
            ]
        });

        return menu;
    }

    /**
     * Проверяет может ли элемент иметь детей определённого типа
     */
    function can_have_child(parent: TreeItem | null, child_type: 'gui' | 'go' | 'component'): boolean {
        if (parent === null) return false;

        if (DEFOLD_LIMITS) {
            if (child_type === 'gui' && worldGo.includes(parent.icon)) {
                return false;
            }
            if (child_type === 'go' && worldGui.includes(parent.icon)) {
                return false;
            }
            if ((child_type === 'gui' || child_type === 'go') && componentsGo.includes(parent.icon)) {
                return false;
            }
        }

        return !parent.no_drop;
    }

    return {
        check_action,
        create_menu_item,
        get_menu_items,
        can_have_child
    };
}

/**
 * Тип сервиса контекстного меню
 */
export type TreeContextMenuServiceType = ReturnType<typeof TreeContextMenuServiceCreate>;
