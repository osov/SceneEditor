import {
    PropertyType,
    PropertyData,
    PropertyParams,
    PropertyValues,
    ObjectData
} from '../../Inspector';

export interface UniqueField {
    ids: number[];
    data: PropertyData<PropertyType>;
}

/**
 * Filters unique fields by removing fields that don't exist in the new object's fields
 */
export function filterUniqueFields(
    unique_fields: UniqueField[],
    fields: PropertyData<PropertyType>[]
): number[] {
    const tmp: number[] = [];

    unique_fields.forEach((unique_field, index) => {
        const result = fields.findIndex((field) => {
            const is_equal_by_key = field.key == unique_field.data.key;
            const is_equal_by_type = field.type == unique_field.data.type;
            return is_equal_by_key && is_equal_by_type;
        });

        // NOTE: remember fields that are not found
        if (result == -1) {
            tmp.push(index);
            return;
        }

        if (unique_field.data.type == PropertyType.FOLDER) {
            const r = filterUniqueFields((unique_field.data.value as PropertyData<PropertyType>[]).map((field) => {
                return {
                    ids: unique_field.ids,
                    data: field
                };
            }), fields[result].value as PropertyData<PropertyType>[]);
            for (let i = r.length - 1; i >= 0; i--) {
                const index = r[i];
                (unique_field.data.value as PropertyData<PropertyType>[]).splice(index, 1);
            }
        }
    });

    // NOTE: remove fields that are not found
    for (let i = tmp.length - 1; i >= 0; i--) {
        const index = tmp[i];
        unique_fields.splice(index, 1);
    }

    return tmp;
}

/**
 * Tries to add a field to the unique fields list, handling value differences between objects
 */
export function tryAddToUniqueField(
    obj_index: number,
    obj: ObjectData,
    unique_fields: UniqueField[],
    field: PropertyData<PropertyType>,
    vector_fields: PropertyData<PropertyType>[]
): boolean {
    const index = unique_fields.findIndex((value) => {
        return value.data.key == field.key;
    });

    if (index == -1) {
        if (obj_index != 0) {
            return false;
        }

        // Add if this is the first object
        unique_fields.push({
            ids: [obj.id],
            data: field
        });

        // Track vector fields for later use
        if ([PropertyType.VECTOR_2, PropertyType.VECTOR_3, PropertyType.VECTOR_4].includes(field.type)) {
            vector_fields.push(field);
        }

        return true;
    }
    else {
        unique_fields[index].ids.push(obj.id);
    }

    // NOTE: check fields for unique values
    if (field.type == PropertyType.FOLDER) {
        let anyone_was_added = false;
        const folderFields = field.value as PropertyData<PropertyType>[];
        const uniqueFolderFields = unique_fields[index].data.value as PropertyData<PropertyType>[];

        for (const folderField of folderFields) {
            if (tryAddToUniqueField(obj_index, obj, uniqueFolderFields.map(f => ({
                ids: unique_fields[index].ids,
                data: f
            })), folderField, vector_fields)) {
                anyone_was_added = true;
            }
        }

        if (anyone_was_added) {
            return true;
        }
    }

    // NOTE: always show for buttons
    if (field.type == PropertyType.BUTTON) {
        return true;
    }

    if ([PropertyType.VECTOR_2, PropertyType.POINT_2D, PropertyType.VECTOR_3, PropertyType.VECTOR_4].includes(field.type)) {
        type T = PropertyValues[PropertyType.VECTOR_2];
        const field_data = field.value as T;
        const unique_field_data = unique_fields[index].data.value as T;

        if (typeof field_data !== typeof unique_field_data) return false;

        if ([PropertyType.VECTOR_2, PropertyType.POINT_2D, PropertyType.VECTOR_3, PropertyType.VECTOR_4].includes(field.type)) {
            if (field_data.x != unique_field_data.x) {
                const params = unique_fields[index].data.params;
                if (params) {
                    const v2p = (params as PropertyParams[PropertyType.VECTOR_2]);
                    if (v2p.x) v2p.x.disabled = true;
                    else v2p.x = { disabled: true };
                } else unique_fields[index].data.params = { x: { disabled: true } };
                unique_field_data.x = (unique_field_data.x + field_data.x) / 2;
            }

            if (field_data.y != unique_field_data.y) {
                const params = unique_fields[index].data.params;
                if (params) {
                    const v2p = (params as PropertyParams[PropertyType.VECTOR_2]);
                    if (v2p.y) v2p.y.disabled = true;
                    else v2p.y = { disabled: true };
                } else unique_fields[index].data.params = { y: { disabled: true } };
                unique_field_data.y = (unique_field_data.y + field_data.y) / 2;
            }
        }

        if ([PropertyType.VECTOR_3, PropertyType.VECTOR_4].includes(field.type)) {
            type T = PropertyValues[PropertyType.VECTOR_3];
            const field_data = field.value as T;
            const unique_field_data = unique_fields[index].data.value as T;

            if (field_data.z != unique_field_data.z) {
                const params = unique_fields[index].data.params;
                if (params) {
                    const v3p = (params as PropertyParams[PropertyType.VECTOR_3]);
                    if (v3p.z) v3p.z.disabled = true;
                    else v3p.z = { disabled: true };
                } else unique_fields[index].data.params = { z: { disabled: true } };
                unique_field_data.z = (unique_field_data.z + field_data.z) / 2;
            }
        }

        if (field.type == PropertyType.VECTOR_4) {
            type T = PropertyValues[PropertyType.VECTOR_4];
            const field_data = field.value as T;
            const unique_field_data = unique_fields[index].data.value as T;

            if (field_data.w != unique_field_data.w) {
                const params = unique_fields[index].data.params;
                if (params) {
                    const v4p = (params as PropertyParams[PropertyType.VECTOR_4]);
                    if (v4p.w) v4p.w.disabled = true;
                    else v4p.w = { disabled: true };
                } else unique_fields[index].data.params = { w: { disabled: true } };
            }
            unique_field_data.w = (unique_field_data.w + field_data.w) / 2;
        }
    }
    else {
        if (field.value != unique_fields[index].data.value) {
            if ([PropertyType.LIST_TEXT, PropertyType.LIST_TEXTURES, PropertyType.LOG_DATA].includes(field.type)) {
                // For dropdown list and text fields, if values differ between objects
                unique_fields[index].data.value = '';
            } else if (field.type == PropertyType.COLOR) {
                // For color, if values differ between objects
                unique_fields[index].data.value = "#000000";
            } else if (field.type == PropertyType.BOOLEAN) {
                // For checkbox, if values differ between objects
                unique_fields[index].data.value = false;
                unique_fields[index].data.params = { disabled: true };
            } else if (field.type == PropertyType.SLIDER) {
                const min = (unique_fields[index].data.params as PropertyParams[PropertyType.SLIDER]).min;
                unique_fields[index].data.value = min;
            } else {
                // Otherwise just remove the field
                unique_fields.splice(index, 1);
                return false;
            }
        }
    }

    return true;
}
