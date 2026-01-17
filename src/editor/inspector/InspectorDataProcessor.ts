/**
 * InspectorDataProcessor - обработчик данных инспектора
 *
 * Обрабатывает данные от нескольких выделенных объектов:
 * - Объединение полей
 * - Вычисление средних значений для векторов
 * - Определение различающихся значений
 */

import { PropertyType, PropertyData, PropertyValues, PropertyParams } from '@editor/core/inspector/types';

/** Данные объекта для инспектора */
export interface ObjectData {
    id: number;
    fields: PropertyData<PropertyType>[];
}

/** Уникальное поле с информацией об объектах */
export interface UniqueField {
    /** ID объектов, имеющих это поле */
    ids: number[];
    /** Данные поля */
    data: PropertyData<PropertyType>;
}

/** Результат обработки данных */
export interface ProcessedData {
    /** Уникальные поля */
    unique_fields: UniqueField[];
    /** Поля с различающимися осями (для векторов) */
    different_axes: Map<string, { x: boolean; y: boolean; z?: boolean; w?: boolean }>;
}

/** Параметры процессора */
export interface InspectorDataProcessorParams {
    /** Callback при возникновении ошибки */
    on_error?: (message: string) => void;
}

/** Интерфейс процессора */
export interface IInspectorDataProcessor {
    /** Обработать данные объектов */
    process(objects: ObjectData[]): ProcessedData;

    /** Обновить значение поля */
    update_field_value(unique_fields: UniqueField[], key: string, value: unknown): void;

    /** Найти поле по ключу */
    find_field(unique_fields: UniqueField[], key: string): UniqueField | undefined;
}

/** Создать InspectorDataProcessor */
export function create_inspector_data_processor(_params?: InspectorDataProcessorParams): IInspectorDataProcessor {
    function process(objects: ObjectData[]): ProcessedData {
        const unique_fields: UniqueField[] = [];
        const different_axes: Map<string, { x: boolean; y: boolean; z?: boolean; w?: boolean }> = new Map();

        for (let index = 0; index < objects.length; index++) {
            const obj = objects[index];

            // Фильтруем поля, которых нет в текущем объекте
            if (index > 0) {
                filter_unique_fields(unique_fields, obj.fields);
            }

            // Добавляем/обновляем поля
            for (const field of obj.fields) {
                try_add_to_unique_field(index, obj, unique_fields, field, different_axes);
            }
        }

        return { unique_fields, different_axes };
    }

    function filter_unique_fields(unique_fields: UniqueField[], fields: PropertyData<PropertyType>[]): void {
        const to_remove: number[] = [];

        for (let i = 0; i < unique_fields.length; i++) {
            const unique_field = unique_fields[i];
            const found = fields.find(f => f.key === unique_field.data.key && f.type === unique_field.data.type);

            if (found === undefined) {
                to_remove.push(i);
                continue;
            }

            // Рекурсивно для папок
            if (unique_field.data.type === PropertyType.FOLDER) {
                const folder_fields = unique_field.data.value as PropertyData<PropertyType>[];
                const found_folder_fields = found.value as PropertyData<PropertyType>[];

                const folder_unique: UniqueField[] = folder_fields.map(f => ({
                    ids: unique_field.ids,
                    data: f,
                }));

                filter_unique_fields(folder_unique, found_folder_fields);

                // Обновляем поля папки
                unique_field.data.value = folder_unique.map(uf => uf.data);
            }
        }

        // Удаляем с конца
        for (let i = to_remove.length - 1; i >= 0; i--) {
            unique_fields.splice(to_remove[i], 1);
        }
    }

    function try_add_to_unique_field(
        obj_index: number,
        obj: ObjectData,
        unique_fields: UniqueField[],
        field: PropertyData<PropertyType>,
        different_axes: Map<string, { x: boolean; y: boolean; z?: boolean; w?: boolean }>
    ): boolean {
        const index = unique_fields.findIndex(uf => uf.data.key === field.key);

        // Новое поле
        if (index === -1) {
            if (obj_index !== 0) {
                return false;
            }

            unique_fields.push({
                ids: [obj.id],
                data: { ...field },
            });

            return true;
        }

        // Добавляем ID объекта
        unique_fields[index].ids.push(obj.id);

        // Обработка папок
        if (field.type === PropertyType.FOLDER) {
            const folder_fields = field.value as PropertyData<PropertyType>[];
            const unique_folder = unique_fields[index].data.value as PropertyData<PropertyType>[];

            for (const folder_field of folder_fields) {
                const folder_unique_wrapped: UniqueField[] = unique_folder.map(f => ({
                    ids: unique_fields[index].ids,
                    data: f,
                }));

                try_add_to_unique_field(obj_index, obj, folder_unique_wrapped, folder_field, different_axes);
            }

            return true;
        }

        // Кнопки всегда показываем
        if (field.type === PropertyType.BUTTON) {
            return true;
        }

        // Обработка векторов
        if (is_vector_type(field.type)) {
            process_vector_field(unique_fields[index], field, different_axes);
            return true;
        }

        // Обработка простых типов
        if (field.value !== unique_fields[index].data.value) {
            handle_different_values(unique_fields, index, field);
        }

        return true;
    }

    function is_vector_type(type: PropertyType): boolean {
        return [
            PropertyType.VECTOR_2,
            PropertyType.VECTOR_3,
            PropertyType.VECTOR_4,
            PropertyType.POINT_2D,
        ].includes(type);
    }

    function process_vector_field(
        unique_field: UniqueField,
        field: PropertyData<PropertyType>,
        different_axes: Map<string, { x: boolean; y: boolean; z?: boolean; w?: boolean }>
    ): void {
        type VectorValue = { x: number; y: number; z?: number; w?: number };
        const field_value = field.value as VectorValue;
        const unique_value = unique_field.data.value as VectorValue;

        let axes = different_axes.get(field.key);
        if (axes === undefined) {
            axes = { x: false, y: false };
            if (field.type === PropertyType.VECTOR_3 || field.type === PropertyType.VECTOR_4) {
                axes.z = false;
            }
            if (field.type === PropertyType.VECTOR_4) {
                axes.w = false;
            }
            different_axes.set(field.key, axes);
        }

        // Проверяем и обновляем каждую ось
        if (field_value.x !== unique_value.x) {
            axes.x = true;
            mark_axis_disabled(unique_field, 'x');
            unique_value.x = (unique_value.x + field_value.x) / 2;
        }

        if (field_value.y !== unique_value.y) {
            axes.y = true;
            mark_axis_disabled(unique_field, 'y');
            unique_value.y = (unique_value.y + field_value.y) / 2;
        }

        if (axes.z !== undefined && field_value.z !== undefined && unique_value.z !== undefined) {
            if (field_value.z !== unique_value.z) {
                axes.z = true;
                mark_axis_disabled(unique_field, 'z');
                unique_value.z = (unique_value.z + field_value.z) / 2;
            }
        }

        if (axes.w !== undefined && field_value.w !== undefined && unique_value.w !== undefined) {
            if (field_value.w !== unique_value.w) {
                axes.w = true;
                mark_axis_disabled(unique_field, 'w');
                unique_value.w = (unique_value.w + field_value.w) / 2;
            }
        }
    }

    function mark_axis_disabled(unique_field: UniqueField, axis: 'x' | 'y' | 'z' | 'w'): void {
        const params = unique_field.data.params as Record<string, { disabled?: boolean }> | undefined;
        if (params !== undefined) {
            if (params[axis] !== undefined) {
                params[axis].disabled = true;
            } else {
                params[axis] = { disabled: true };
            }
        } else {
            unique_field.data.params = { [axis]: { disabled: true } } as PropertyParams[PropertyType];
        }
    }

    function handle_different_values(
        unique_fields: UniqueField[],
        index: number,
        field: PropertyData<PropertyType>
    ): void {
        const unique_field = unique_fields[index];

        switch (field.type) {
            case PropertyType.LIST_TEXT:
            case PropertyType.LIST_TEXTURES:
            case PropertyType.LOG_DATA:
                unique_field.data.value = '';
                break;

            case PropertyType.COLOR:
                unique_field.data.value = '#000000';
                break;

            case PropertyType.BOOLEAN:
                unique_field.data.value = false;
                unique_field.data.params = { disabled: true } as PropertyParams[PropertyType.BOOLEAN];
                break;

            case PropertyType.SLIDER:
                const slider_params = unique_field.data.params as PropertyParams[PropertyType.SLIDER] | undefined;
                if (slider_params !== undefined) {
                    unique_field.data.value = slider_params.min;
                }
                break;

            default:
                // Удаляем поле если значения разные
                unique_fields.splice(index, 1);
                break;
        }
    }

    function update_field_value(unique_fields: UniqueField[], key: string, value: unknown): void {
        const field = find_field(unique_fields, key);
        if (field !== undefined) {
            field.data.value = value as PropertyValues[PropertyType];
        }
    }

    function find_field(unique_fields: UniqueField[], key: string): UniqueField | undefined {
        for (const uf of unique_fields) {
            if (uf.data.key === key) {
                return uf;
            }

            if (uf.data.type === PropertyType.FOLDER) {
                const folder_fields = (uf.data.value as PropertyData<PropertyType>[]).map(f => ({
                    ids: uf.ids,
                    data: f,
                }));
                const found = find_field(folder_fields, key);
                if (found !== undefined) {
                    return found;
                }
            }
        }

        return undefined;
    }

    return {
        process,
        update_field_value,
        find_field,
    };
}
