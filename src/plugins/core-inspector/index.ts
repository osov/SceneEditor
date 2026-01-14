/**
 * Плагин базовых типов полей инспектора
 *
 * Регистрирует обработчики для стандартных типов полей:
 * NUMBER, STRING, BOOLEAN, COLOR, SLIDER, VECTOR_2/3/4 и т.д.
 */

import type { IPlugin, IPluginContext, PluginManifest } from '../../core/plugins/types';
import { EXTENSION_POINTS } from '../../core/plugins/ExtensionPoints';
import type { IFieldTypeRegistry } from '../../core/inspector/types';

import { create_number_field_handler, create_slider_field_handler } from './fields/NumberField';
import { create_string_field_handler, create_log_data_field_handler } from './fields/StringField';
import { create_boolean_field_handler } from './fields/BooleanField';
import { create_color_field_handler } from './fields/ColorField';
import { create_vector_field_handlers } from './fields/VectorFields';
import { create_list_field_handlers } from './fields/ListFields';
import { create_button_field_handler } from './fields/ButtonField';
import { create_folder_field_handler } from './fields/FolderField';

/** Манифест плагина */
const manifest: PluginManifest = {
    id: 'core-inspector',
    name: 'Базовые типы полей инспектора',
    version: '1.0.0',
    description: 'Стандартные типы полей: число, строка, вектор, цвет и т.д.',
};

/** Создать плагин базовых типов полей */
export function create_plugin(): IPlugin {
    let _context: IPluginContext | undefined;

    async function activate(context: IPluginContext): Promise<void> {
        _context = context;
        const logger = context.logger;

        logger.info('Активация плагина базовых типов полей...');

        // Получаем реестр типов полей через точку расширения
        const registries = context.get_extensions<IFieldTypeRegistry>(
            EXTENSION_POINTS.INSPECTOR_FIELD_TYPES
        );

        if (registries.length === 0) {
            logger.warn('Реестр типов полей не найден');
            return;
        }

        const registry = registries[0];

        // Регистрируем обработчики
        const handlers = [
            create_number_field_handler(),
            create_slider_field_handler(),
            create_string_field_handler(),
            create_log_data_field_handler(),
            create_boolean_field_handler(),
            create_color_field_handler(),
            ...create_vector_field_handlers(),
            ...create_list_field_handlers(),
            create_button_field_handler(),
            create_folder_field_handler(),
        ];

        for (const handler of handlers) {
            const disposable = registry.register_handler(handler);
            context.subscriptions.push(disposable);
        }

        logger.info(`Зарегистрировано ${handlers.length} обработчиков типов полей`);
    }

    async function deactivate(): Promise<void> {
        _context?.logger.info('Деактивация плагина базовых типов полей');
        _context = undefined;
    }

    return {
        manifest,
        activate,
        deactivate,
    };
}

export default create_plugin;
