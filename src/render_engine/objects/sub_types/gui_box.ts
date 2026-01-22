// GuiBox - slice9 блок с поддержкой clipping и наследования alpha

import { IObjectTypes } from "../../types";
import { Slice9Mesh, Slice9SerializeData } from "../slice9";
import * as THREE from 'three';
import { Services } from '@editor/core/ServiceProvider';
import { Property, PropertyType, type InspectorFieldDefinition } from "@editor/core/inspector";
import { is_alpha_inheritable, type IAlphaInheritable } from "./alpha_types";

export interface GuiBoxSerializeData extends Slice9SerializeData {
    clippingEnabled?: boolean;
    invertedClipping?: boolean;
    inheredAlpha?: number
}

export class GuiBox extends Slice9Mesh implements IAlphaInheritable {
    public type = IObjectTypes.GUI_BOX;
    private clippingEnabled: boolean = false;
    private invertedClipping: boolean = false;
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
        Services.resources.set_material_uniform_for_mesh(this, 'alpha', value);
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

    enableClipping(inverted = false, visible = true): void {
        this.clippingEnabled = true;
        this.invertedClipping = inverted;

        Services.resources.set_material_property_for_mesh(this, 'colorWrite', visible);
        Services.resources.set_material_property_for_mesh(this, 'depthTest', false);
        Services.resources.set_material_property_for_mesh(this, 'stencilWrite', true);
        Services.resources.set_material_property_for_mesh(this, 'stencilRef', this.mesh_data.id);
        let stencilFunc: number = THREE.AlwaysStencilFunc;
        if (this.parent !== null && this.parent instanceof GuiBox && this.parent.isClippingEnabled()) {
            stencilFunc = this.parent.isInvertedClipping() ? THREE.NotEqualStencilFunc : THREE.EqualStencilFunc;
        }
        Services.resources.set_material_property_for_mesh(this, 'stencilFunc', stencilFunc);
        Services.resources.set_material_property_for_mesh(this, 'stencilZPass', THREE.ReplaceStencilOp);

        const setClippingForChildren = (children: THREE.Object3D[]) => {
            children.forEach(child => {
                if (child instanceof GuiBox) {
                    Services.resources.set_material_property_for_mesh(child, 'stencilWrite', true);
                    Services.resources.set_material_property_for_mesh(child, 'stencilRef', this.mesh_data.id);
                    Services.resources.set_material_property_for_mesh(child, 'stencilFunc', inverted ? THREE.NotEqualStencilFunc : THREE.EqualStencilFunc);
                    setClippingForChildren(child.children);
                }

                // NOTE: для GuiText используем duck typing через material
                if ('material' in child && child.material !== null && typeof child.material === 'object') {
                    const mat = child.material as THREE.Material;
                    mat.stencilWrite = true;
                    mat.stencilRef = this.mesh_data.id;
                    mat.stencilFunc = inverted ? THREE.NotEqualStencilFunc : THREE.EqualStencilFunc;
                    setClippingForChildren((child as THREE.Object3D).children);
                }
            });
        };

        setClippingForChildren(this.children);
    }

    disableClipping(): void {
        this.clippingEnabled = false;
        Services.resources.set_material_property_for_mesh(this, 'colorWrite', true);
        Services.resources.set_material_property_for_mesh(this, 'depthTest', true);
        Services.resources.set_material_property_for_mesh(this, 'stencilWrite', false);
        Services.resources.set_material_property_for_mesh(this, 'stencilRef', 0);
        Services.resources.set_material_property_for_mesh(this, 'stencilFunc', THREE.AlwaysStencilFunc);
        Services.resources.set_material_property_for_mesh(this, 'stencilZPass', THREE.KeepStencilOp);

        const disableClippingForChildren = (children: THREE.Object3D[]) => {
            children.forEach(child => {
                if (child instanceof GuiBox) {
                    Services.resources.set_material_property_for_mesh(child, 'stencilWrite', false);
                    Services.resources.set_material_property_for_mesh(child, 'stencilRef', 0);
                    Services.resources.set_material_property_for_mesh(child, 'stencilFunc', THREE.AlwaysStencilFunc);
                    Services.resources.set_material_property_for_mesh(child, 'stencilZPass', THREE.KeepStencilOp);
                    disableClippingForChildren(child.children);
                }

                // NOTE: для GuiText используем duck typing через material
                if ('material' in child && child.material !== null && typeof child.material === 'object') {
                    const mat = child.material as THREE.Material;
                    mat.stencilWrite = false;
                    mat.stencilRef = 0;
                    mat.stencilFunc = THREE.AlwaysStencilFunc;
                    mat.stencilZPass = THREE.KeepStencilOp;
                    disableClippingForChildren((child as THREE.Object3D).children);
                }
            });
        };

        disableClippingForChildren(this.children);
    }

    isInheredAlpha(): boolean {
        return this.inheredAlpha as boolean;
    }

    setInheredAlpha(value: boolean) {
        this.inheredAlpha = value;
        this.set_alpha(this.alpha);
    }

    isClippingEnabled(): boolean {
        return this.clippingEnabled;
    }

    isInvertedClipping(): boolean {
        return this.invertedClipping;
    }

    isClippingVisible(): boolean {
        return this.material.colorWrite;
    }

    serialize(): GuiBoxSerializeData {
        const data = super.serialize();
        if (this.clippingEnabled) data.clippingEnabled = this.clippingEnabled;
        if (this.invertedClipping) data.invertedClipping = this.invertedClipping;
        if (this.isInheredAlpha() && this.parent !== null && is_alpha_inheritable(this.parent)) {
            data.inheredAlpha = this.parent.get_raw_alpha();
        }
        return data;
    }

    deserialize(data: GuiBoxSerializeData): void {
        super.deserialize(data);
        this.clippingEnabled = data.clippingEnabled || false;
        this.invertedClipping = data.invertedClipping || false;
        this.inheredAlpha = false;
        let inheredAlpha = 1;
        if (data.inheredAlpha !== undefined) {
            this.inheredAlpha = true;
            inheredAlpha = data.inheredAlpha;
        }
        this.alpha = this.material.uniforms.alpha.value / inheredAlpha;
    }

    /**
     * GuiBox добавляет поля якоря к полям Slice9Mesh
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
