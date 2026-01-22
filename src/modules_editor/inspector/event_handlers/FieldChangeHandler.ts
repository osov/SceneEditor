import { Vector2, Vector3, Vector4 } from 'three';
import { FLOAT_PRECISION } from '../../../config';
import {
    PropertyType,
    PropertyData,
    ChangeInfo,
    BeforeChangeInfo,
    ObjectData
} from '../../Inspector';

/**
 * Handles the before change event for a field
 */
export function handleBeforeChange(info: BeforeChangeInfo): void {
    if (info.field.onBeforeChange) {
        info.field.onBeforeChange(info);
    }
}

/**
 * Handles the change event for a field
 */
export function handleChange(
    info: ChangeInfo,
    data: ObjectData[]
): void {
    if (info.data.field.onChange) {
        cutFloatPrecision(info, info.data.field);
        info.data.field.onChange(info);
    }
    data.filter(item => info.ids.includes(item.id)).forEach(item => {
        item.fields.filter(field => field.key == info.data.field.key).forEach(field => {
            field.value = info.data.field.value;
        });
    });
}

/**
 * Cuts floating point precision for numeric values
 */
export function cutFloatPrecision(info: ChangeInfo, field: PropertyData<PropertyType>): void {
    switch (field.type) {
        case PropertyType.NUMBER:
        case PropertyType.SLIDER:
            (info.data.event.value as number) = Number((info.data.event.value as number).toFixed(FLOAT_PRECISION));
            break;
        case PropertyType.VECTOR_2:
            (info.data.event.value as Vector2) = new Vector2(
                Number((info.data.event.value as Vector2).x.toFixed(FLOAT_PRECISION)),
                Number((info.data.event.value as Vector2).y.toFixed(FLOAT_PRECISION))
            );
            break;
        case PropertyType.VECTOR_3:
            (info.data.event.value as Vector3) = new Vector3(
                Number((info.data.event.value as Vector3).x.toFixed(FLOAT_PRECISION)),
                Number((info.data.event.value as Vector3).y.toFixed(FLOAT_PRECISION)),
                Number((info.data.event.value as Vector3).z.toFixed(FLOAT_PRECISION))
            );
            break;
        case PropertyType.VECTOR_4:
            (info.data.event.value as Vector4) = new Vector4(
                Number((info.data.event.value as Vector4).x.toFixed(FLOAT_PRECISION)),
                Number((info.data.event.value as Vector4).y.toFixed(FLOAT_PRECISION)),
                Number((info.data.event.value as Vector4).z.toFixed(FLOAT_PRECISION)),
                Number((info.data.event.value as Vector4).w.toFixed(FLOAT_PRECISION))
            );
            break;
    }
}

/**
 * Finds a field recursively in a list of fields
 */
export function findFieldRecursive(
    fields: PropertyData<PropertyType>[],
    name: string
): PropertyData<PropertyType> | undefined {
    for (const field of fields) {
        if (field.key == name) {
            return field;
        }
        if (field.type == PropertyType.FOLDER) {
            const found = findFieldRecursive(field.value as PropertyData<PropertyType>[], name);
            if (found) return found;
        }
    }
    return undefined;
}

/**
 * Tries to disable vector value inputs when values differ between selected objects
 */
export function tryDisabledVectorValueByAxis(
    info: ChangeInfo,
    data: ObjectData[]
): void {
    const isVectorField = [PropertyType.VECTOR_2, PropertyType.VECTOR_3, PropertyType.VECTOR_4].includes(info.data.field.type);

    if (!isVectorField || !info.data.event.target.controller.view.valueElement) {
        return;
    }

    const inputs = info.data.event.target.controller.view.valueElement.querySelectorAll('input');
    const axisCount = inputs.length;

    const differentAxes = new Array(axisCount).fill(false);

    const firstObj = data.find(obj => obj.id == info.ids[0]);
    if (!firstObj) {
        Log.warn('[tryDisabledVectorValueByAxis] First object not found for id:', info.ids[0]);
        return;
    }

    const firstField = findFieldRecursive(firstObj.fields, info.data.field.key);
    if (!firstField) {
        Log.warn('[tryDisabledVectorValueByAxis] Field not found in first object:', info.data.field.key);
        return;
    }

    const referenceValue = firstField.value as { x: number, y: number, z?: number, w?: number };

    for (let i = 1; i < info.ids.length; i++) {
        const currentObj = data.find(obj => obj.id == info.ids[i]);
        if (!currentObj) {
            Log.warn('[tryDisabledVectorValueByAxis] Object not found for id:', info.ids[i]);
            continue;
        }

        const currentField = currentObj.fields.find(field => field.key == info.data.field.key);
        if (!currentField) {
            Log.warn('[tryDisabledVectorValueByAxis] Field not found in object:', info.data.field.key, currentObj);
            continue;
        }

        const currentValue = currentField.value as { x: number, y: number, z?: number, w?: number };

        if (axisCount >= 1 && !differentAxes[0] && currentValue.x != referenceValue.x) {
            differentAxes[0] = true;
        }
        if (axisCount >= 2 && !differentAxes[1] && currentValue.y != referenceValue.y) {
            differentAxes[1] = true;
        }
        if (axisCount >= 3 && !differentAxes[2] && currentValue.z != referenceValue.z) {
            differentAxes[2] = true;
        }
        if (axisCount >= 4 && !differentAxes[3] && currentValue.w != referenceValue.w) {
            differentAxes[3] = true;
        }

        if (differentAxes.every(axis => axis)) {
            break;
        }
    }

    for (let axis = 0; axis < axisCount; axis++) {
        if (differentAxes[axis]) {
            inputs[axis].value = '-';
        }
    }
}
