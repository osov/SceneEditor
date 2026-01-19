/**
 * EntityRenderer - отрисовка UI элементов в TweakPane
 *
 * Извлечено из InspectorControl.ts (Фаза 16)
 */

import type { FolderApi } from '@tweakpane/core';
import type { Pane } from 'tweakpane';
import type { Entities } from './entity_types';
import { is_folder, is_button } from './entity_types';

/**
 * Отрисовывает массив entities в указанное место TweakPane
 * @param entities - массив UI элементов для отрисовки
 * @param place - целевая панель или папка (по умолчанию корневая панель)
 */
export function render_entities(entities: Entities[], place: FolderApi | Pane): void {
    for (const entity of entities) {
        // Папка
        if (is_folder(entity)) {
            const folder = place.addFolder({ title: entity.title });
            // Рекурсивно добавляем дочерние entities
            render_entities(entity.childrens, folder);
            continue;
        }

        // Кнопка
        if (is_button(entity)) {
            place.addButton(entity.params).on('click', entity.onClick);
            continue;
        }

        // Обычное поле (binding)
        const binding = place.addBinding(entity.obj, entity.key, entity.params);

        // Подписка на события
        if (entity.onBeforeChange !== undefined) {
            binding.controller.value.emitter.on('beforechange', entity.onBeforeChange);
        }
        if (entity.onChange !== undefined) {
            binding.on('change', entity.onChange);
        }
    }
}

/**
 * Интерфейс рендерера
 */
export interface IEntityRenderer {
    render: typeof render_entities;
}

/**
 * Создаёт рендерер UI элементов
 */
export function EntityRendererCreate(): IEntityRenderer {
    return {
        render: render_entities
    };
}
