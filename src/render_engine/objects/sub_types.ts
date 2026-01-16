import { IObjectTypes } from "../types";
import { Slice9Mesh, Slice9SerializeData } from "./slice9";
import { TextMesh, TextSerializeData } from "./text";
import { EntityBase } from "./entity_base";
import { flip_geometry_x, flip_geometry_y, flip_geometry_xy } from "../helpers/utils";
import * as THREE from 'three';
import { DC_LAYERS } from '@editor/engine/RenderService';
import { Services } from '@editor/core';
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

export class GoContainer extends EntityBase {
    public type = IObjectTypes.GO_CONTAINER;

    constructor(id: number) {
        super(id);
        this.layers.disable(DC_LAYERS.GO_LAYER);
        this.layers.disable(DC_LAYERS.GUI_LAYER);
    }

    // GoContainer использует базовые поля из EntityBase (не переопределяем)
}

export interface GuiBoxSerializeData extends Slice9SerializeData {
    clippingEnabled?: boolean;
    invertedClipping?: boolean;
    inheredAlpha?: number
}

export class GuiBox extends Slice9Mesh {
    public type = IObjectTypes.GUI_BOX;
    private clippingEnabled: boolean = false;
    private invertedClipping: boolean = false;
    private inheredAlpha: boolean = false;
    private alpha: number = 1;

    get_raw_alpha(): number {
        let inheredAlpha = 1;
        if (this.isInheredAlpha() && this.parent != null && (this.parent instanceof GuiBox || this.parent instanceof GuiText)) {
            const parent = this.parent as GuiBox | GuiText;
            inheredAlpha = parent.get_raw_alpha();
        }
        return this.alpha * inheredAlpha;
    }

    get_alpha(): number {
        return this.alpha;
    }

    set_alpha(value: number) {
        this.alpha = value;

        let inheredAlpha = 1;
        if (this.isInheredAlpha() && this.parent != null && (this.parent instanceof GuiBox || this.parent instanceof GuiText)) {
            const parent = this.parent as GuiBox | GuiText;
            inheredAlpha = parent.get_raw_alpha();
        }
        value *= inheredAlpha;
        Services.resources.set_material_uniform_for_mesh(this, 'alpha', value);
        this.children.forEach(child => {
            // NOTE: не меняем альфу, а меняем действительное посчитаное значение
            if (child instanceof GuiBox && child.isInheredAlpha()) Services.resources.set_material_uniform_for_mesh(child, 'alpha', child.get_raw_alpha());
            else if (child instanceof GuiText && child.isInheredAlpha()) child.fillOpacity = child.get_raw_alpha();
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
        if (this.parent != null && this.parent instanceof GuiBox && this.parent.isClippingEnabled()) {
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

                if (child instanceof GuiText && child.material) {
                    child.material.stencilWrite = true;
                    child.material.stencilRef = this.mesh_data.id;
                    child.material.stencilFunc = inverted ? THREE.NotEqualStencilFunc : THREE.EqualStencilFunc;
                    setClippingForChildren(child.children);
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

                if (child instanceof GuiText && child.material) {
                    child.material.stencilWrite = false;
                    child.material.stencilRef = 0;
                    child.material.stencilFunc = THREE.AlwaysStencilFunc;
                    child.material.stencilZPass = THREE.KeepStencilOp;
                    disableClippingForChildren(child.children);
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
        if (this.isInheredAlpha() && this.parent != null && (this.parent instanceof GuiBox || this.parent instanceof GuiText)) {
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
        if (data.inheredAlpha) {
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

export interface GuiTextSerializeData extends TextSerializeData {
    inheredAlpha?: number
}

export class GuiText extends TextMesh {
    public type = IObjectTypes.GUI_TEXT;
    private inheredAlpha: boolean = false;
    private alpha: number = 1;

    get_raw_alpha(): number {
        let inheredAlpha = 1;
        if (this.isInheredAlpha() && this.parent != null && (this.parent instanceof GuiBox || this.parent instanceof GuiText)) {
            const parent = this.parent as GuiBox | GuiText;
            inheredAlpha = parent.get_raw_alpha();
        }
        return this.alpha * inheredAlpha;
    }

    get_alpha(): number {
        return this.alpha;
    }

    set_alpha(value: number) {
        this.alpha = value;
        let inheredAlpha = 1;
        if (this.isInheredAlpha() && this.parent != null && (this.parent instanceof GuiBox || this.parent instanceof GuiText)) {
            const parent = this.parent as GuiBox | GuiText;
            inheredAlpha = parent.get_raw_alpha();
        }
        value *= inheredAlpha;
        this.fillOpacity = value;
        this.children.forEach(child => {
            // NOTE: не меняем альфу, а меняем действительное посчитаное значение
            if (child instanceof GuiBox && child.isInheredAlpha()) Services.resources.set_material_uniform_for_mesh(child, 'alpha', child.get_raw_alpha());
            else if (child instanceof GuiText && child.isInheredAlpha()) child.fillOpacity = child.get_raw_alpha();
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
        if (this.isInheredAlpha() && this.parent != null && (this.parent instanceof GuiBox || this.parent instanceof GuiText)) {
            data.inheredAlpha = this.parent.get_raw_alpha();
        }
        return data;
    }

    deserialize(data: GuiTextSerializeData): void {
        super.deserialize(data);
        this.inheredAlpha = false;
        let inheredAlpha = 1;
        if (data.inheredAlpha) {
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

export enum FlipMode {
    NONE,
    VERTICAL,
    HORIZONTAL,
    DIAGONAL
}

export class GoSprite extends Slice9Mesh {
    public type = IObjectTypes.GO_SPRITE_COMPONENT;
    public is_component = true;

    private original_uv: Float32Array | null = null;

    set_pivot(_x: number, _y: number, _is_sync?: boolean): void { }

    get_uv(): Float32Array {
        const geometry = this.geometry;
        const uv = geometry.attributes.uv;
        return new Float32Array(uv.array);
    }

    set_uv(uv_data: Float32Array | number[]): void {
        const geometry = this.geometry;
        geometry.attributes.uv.array.set(uv_data);
        geometry.attributes.uv.needsUpdate = true;
        this.transform_changed();
    }

    get_flip(): FlipMode {
        const geometry = this.geometry;
        const uv = geometry.attributes.uv;

        if (!this.original_uv) {
            return FlipMode.NONE;
        }

        // NOTE: Проверяем все UV координаты
        let has_changed = false;
        for (let i = 0; i < uv.array.length; i++) {
            if (uv.array[i] !== this.original_uv[i]) {
                has_changed = true;
                break;
            }
        }

        if (has_changed) {
            // NOTE: Проверяем все пары UV координат
            let is_horizontal = true;
            let is_vertical = true;
            let is_diagonal = true;

            for (let i = 0; i < uv.array.length; i += 2) {
                const current_x = uv.array[i];
                const current_y = uv.array[i + 1];
                const original_x = this.original_uv[i];
                const original_y = this.original_uv[i + 1];

                if (current_x !== 1 - original_x) is_horizontal = false;
                if (current_y !== 1 - original_y) is_vertical = false;
                if (current_x !== 1 - original_y || current_y !== 1 - original_x) is_diagonal = false;
            }

            if (is_diagonal) return FlipMode.DIAGONAL;
            if (is_horizontal) return FlipMode.HORIZONTAL;
            if (is_vertical) return FlipMode.VERTICAL;
        }

        return FlipMode.NONE;
    }

    set_flip(value: FlipMode) {
        const geometry = this.geometry;
        const uv = geometry.attributes.uv;

        // NOTE: сохраняем оригинальные координаты UV
        if (this.original_uv == null) {
            this.original_uv = new Float32Array(uv.array);
        }

        switch (value) {
            case FlipMode.HORIZONTAL:
                flip_geometry_x(geometry);
                break;
            case FlipMode.VERTICAL:
                flip_geometry_y(geometry);
                break;
            case FlipMode.DIAGONAL:
                flip_geometry_xy(geometry);
                break;
            case FlipMode.NONE:
                // NOTE: возвращаем оригинальные координаты UV
                uv.array.set(this.original_uv);
                break;
        }

        geometry.attributes.uv.needsUpdate = true;
        this.transform_changed();
    }

    serialize() {
        const data: any = {
            ...super.serialize(),
            current_uv: Array.from(this.geometry.attributes.uv.array)
        };

        if (this.original_uv) {
            data.original_uv = Array.from(this.original_uv);
        }

        return data;
    }

    deserialize(data: any) {
        super.deserialize(data);
        if (data.original_uv) {
            this.original_uv = new Float32Array(data.original_uv);
        }
        if (data.current_uv) {
            this.geometry.attributes.uv.array.set(data.current_uv);
            this.geometry.attributes.uv.needsUpdate = true;
        }
    }

    /**
     * GoSprite добавляет поля отражения к полям Slice9Mesh
     */
    override get_inspector_fields(): InspectorFieldDefinition[] {
        return [
            ...super.get_inspector_fields(),
            // Отражение
            { group: 'flip', property: Property.FLIP_VERTICAL, type: PropertyType.BOOLEAN },
            { group: 'flip', property: Property.FLIP_HORIZONTAL, type: PropertyType.BOOLEAN },
            { group: 'flip', property: Property.FLIP_DIAGONAL, type: PropertyType.BOOLEAN },
        ];
    }
}

export class GoText extends TextMesh {
    public type = IObjectTypes.GO_LABEL_COMPONENT;
    public is_component = true;

    // GoText использует поля из TextMesh (не переопределяем)
}

