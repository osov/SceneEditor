import { IObjectTypes } from "../types";
import { MultipleMaterialMesh } from "./multiple_material_mesh";
import { Property, PropertyType, type InspectorFieldDefinition } from "@editor/core/inspector";

export class Model extends MultipleMaterialMesh {
    public type = IObjectTypes.GO_MODEL_COMPONENT;

    /**
     * Model добавляет поле выбора меша к базовым полям MultipleMaterialMesh
     */
    override get_inspector_fields(): InspectorFieldDefinition[] {
        return [
            ...super.get_inspector_fields(),
            // Модель
            { group: 'model', property: Property.MESH_NAME, type: PropertyType.LIST_TEXT },
        ];
    }
}