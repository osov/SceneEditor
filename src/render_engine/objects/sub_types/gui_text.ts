// GuiText - текстовый элемент GUI с поддержкой наследования alpha

import { IObjectTypes } from "../../types";
import { TextMesh, TextSerializeData } from "../text";
import { Services } from '@editor/core';
import { Property, PropertyType, type InspectorFieldDefinition } from "@editor/core/inspector";
import { is_alpha_inheritable, type IAlphaInheritable } from "./alpha_types";
import { GuiBox } from "./gui_box";

export interface GuiTextSerializeData extends TextSerializeData {
    inheredAlpha?: number
}

export class GuiText extends TextMesh implements IAlphaInheritable {
    public type = IObjectTypes.GUI_TEXT;
    private inheredAlpha: boolean = false;
    private alpha: number = 1;

    get_raw_alpha(): number {
        let inheredAlpha = 1;
        if (this.isInheredAlpha() && this.parent !== null && is_alpha_inheritable(this.parent)) {
            inheredAlpha = this.parent.get_raw_alpha();
        }
        return this.alpha * inheredAlpha;
    }

    get_alpha(): number {
        return this.alpha;
    }

    set_alpha(value: number) {
        this.alpha = value;
        let inheredAlpha = 1;
        if (this.isInheredAlpha() && this.parent !== null && is_alpha_inheritable(this.parent)) {
            inheredAlpha = this.parent.get_raw_alpha();
        }
        value *= inheredAlpha;
        this.fillOpacity = value;
        this.children.forEach(child => {
            // NOTE: не меняем альфу, а меняем действительное посчитаное значение
            if (is_alpha_inheritable(child) && child.isInheredAlpha()) {
                if (child instanceof GuiBox) {
                    Services.resources.set_material_uniform_for_mesh(child, 'alpha', child.get_raw_alpha());
                } else if ('fillOpacity' in child) {
                    (child as { fillOpacity: number }).fillOpacity = child.get_raw_alpha();
                }
            }
        });
    }

    isInheredAlpha(): boolean {
        return this.inheredAlpha as boolean;
    }

    setInheredAlpha(value: boolean) {
        this.inheredAlpha = value;
        this.set_alpha(this.alpha);
    }

    serialize(): GuiTextSerializeData {
        const data = super.serialize() as GuiTextSerializeData;
        if (this.isInheredAlpha() && this.parent !== null && is_alpha_inheritable(this.parent)) {
            data.inheredAlpha = this.parent.get_raw_alpha();
        }
        return data;
    }

    deserialize(data: GuiTextSerializeData): void {
        super.deserialize(data);
        this.inheredAlpha = false;
        let inheredAlpha = 1;
        if (data.inheredAlpha !== undefined) {
            this.inheredAlpha = true;
            inheredAlpha = data.inheredAlpha;
        }
        this.alpha = this.fillOpacity / inheredAlpha;
    }

    /**
     * GuiText добавляет поля якоря к полям TextMesh
     */
    override get_inspector_fields(): InspectorFieldDefinition[] {
        return [
            ...super.get_inspector_fields(),
            // Якорь
            { group: 'anchor', property: Property.ANCHOR, type: PropertyType.VECTOR_2 },
            { group: 'anchor', property: Property.ANCHOR_PRESET, type: PropertyType.LIST_TEXT },
        ];
    }
}
