import { IObjectTypes } from "../types";
import { Slice9Mesh } from "./slice9";
import { TextMesh } from "./text";
import { EntityBase } from "./entity_base";
import { flip_geometry_x, flip_geometry_y, flip_geometry_xy } from "../helpers/utils";


export class GuiContainer extends EntityBase {
    public type = IObjectTypes.GUI_CONTAINER;

    constructor(id: number) {
        super(id);
        this.layers.disable(RenderEngine.DC_LAYERS.GO_LAYER);
        this.layers.disable(RenderEngine.DC_LAYERS.GUI_LAYER);
    }

    set_position(x: number, y: number, z?: number): void { }
    set_pivot(x: number, y: number, is_sync?: boolean): void { }
    set_size(w: number, h: number): void { }
}

export class GoContainer extends EntityBase {
    public type = IObjectTypes.GO_CONTAINER;

    constructor(id: number) {
        super(id);
        this.layers.disable(RenderEngine.DC_LAYERS.GO_LAYER);
        this.layers.disable(RenderEngine.DC_LAYERS.GUI_LAYER);
    }
}


export class GuiBox extends Slice9Mesh {
    public type = IObjectTypes.GUI_BOX;

    // NOTE: если у родителя сбросить alpha в 0, то все дочерние боксы уйдут в 0 не сохранив свое состояние, и потом если этого же родителя вернуть в 1, то дочерние так и останутся в 0, и им нужно заново выставлять относительное значение 

    get_alpha(): number {
        let inheredAlpha = 1;
        if (this.parent != null && (this.parent instanceof GuiBox || this.parent instanceof GuiText)) {
            const parent = this.parent as GuiBox | GuiText;
            inheredAlpha = parent.get_alpha();
        }
        return inheredAlpha > 0.001 ? this.material.uniforms.alpha.value / inheredAlpha : this.material.uniforms.alpha.value;
    }

    set_alpha(value: number) {
        let inheredAlpha = 1;
        if (this.parent != null && (this.parent instanceof GuiBox || this.parent instanceof GuiText)) {
            const parent = this.parent as GuiBox | GuiText;
            inheredAlpha = parent.get_alpha();
        }
        value *= inheredAlpha;
        const previousAlpha = this.material.uniforms.alpha.value;
        ResourceManager.set_material_uniform_for_mesh(this, 'alpha', value);
        this.children.forEach(child => {
            if (child instanceof GuiBox) {
                let v = child.material.uniforms.alpha.value;
                if (previousAlpha > 0.001 && value > 0.001) {
                    v = child.material.uniforms.alpha.value / previousAlpha;
                }
                ResourceManager.set_material_uniform_for_mesh(child, 'alpha', v * value);
            }
            else if (child instanceof GuiText) {
                let v = child.fillOpacity
                if (previousAlpha > 0.001 && value > 0.001) {
                    v = child.fillOpacity / previousAlpha;
                }
                child.fillOpacity = v * value;
            }
        });
    }
}

export class GuiText extends TextMesh {
    public type = IObjectTypes.GUI_TEXT;

    get_alpha(): number {
        let inheredAlpha = 1;
        if (this.parent != null && (this.parent instanceof GuiBox || this.parent instanceof GuiText)) {
            const parent = this.parent as GuiBox | GuiText;
            inheredAlpha = parent.get_alpha();
        }
        return inheredAlpha > 0.001 ? this.fillOpacity / inheredAlpha : this.fillOpacity;
    }

    set_alpha(value: number) {
        let inheredAlpha = 1;
        if (this.parent != null && (this.parent instanceof GuiBox || this.parent instanceof GuiText)) {
            const parent = this.parent as GuiBox | GuiText;
            inheredAlpha = parent.get_alpha();
        }
        value *= inheredAlpha;
        const previousAlpha = this.fillOpacity;
        this.fillOpacity = value;
        this.children.forEach(child => {
            if (child instanceof GuiBox) {
                let v = child.material.uniforms.alpha.value;
                if (previousAlpha > 0.001 && value > 0.001) {
                    v = child.material.uniforms.alpha.value / previousAlpha;
                }
                ResourceManager.set_material_uniform_for_mesh(child, 'alpha', v * value);
            }
            else if (child instanceof GuiText) {
                let v = child.fillOpacity;
                if (previousAlpha > 0.001 && value > 0.001) {
                    v = child.fillOpacity / previousAlpha;
                }
                child.fillOpacity = v * value;
            }
        });
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

    set_pivot(x: number, y: number, is_sync?: boolean): void { }

    get_uv(): Float32Array {
        const geometry = this.geometry;
        const uv = geometry.attributes.uv;
        return new Float32Array(uv.array);
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
}

export class GoText extends TextMesh {
    public type = IObjectTypes.GO_LABEL_COMPONENT;
    public is_component = true;
}

