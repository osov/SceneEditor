// GuiContainer - контейнер для GUI элементов

import { IObjectTypes } from "../../types";
import { EntityBase } from "../entity_base";
import { DC_LAYERS } from '@editor/engine/RenderService';
import { Property, PropertyType, type InspectorFieldDefinition } from "@editor/core/inspector";

export class GuiContainer extends EntityBase {
    public type = IObjectTypes.GUI_CONTAINER;

    constructor(id: number) {
        super(id);
        this.layers.disable(DC_LAYERS.GO_LAYER);
        this.layers.disable(DC_LAYERS.GUI_LAYER);
    }

    set_position(_x: number, _y: number, _z?: number): void { }
    set_pivot(_x: number, _y: number, _is_sync?: boolean): void { }
    set_size(_w: number, _h: number): void { }

    /**
     * GuiContainer имеет только базовые поля (без трансформации)
     */
    override get_inspector_fields(): InspectorFieldDefinition[] {
        return [
            { group: 'base', property: Property.TYPE, type: PropertyType.STRING, readonly: true },
            { group: 'base', property: Property.NAME, type: PropertyType.STRING },
            { group: 'base', property: Property.ACTIVE, type: PropertyType.BOOLEAN },
        ];
    }
}
