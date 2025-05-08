import { IObjectTypes } from "../types";
import { Slice9Mesh } from "./slice9";
import { TextMesh } from "./text";
import { EntityBase } from "./entity_base";
import { flip_geometry_x, flip_geometry_y, flip_geometry_xy } from "../helpers/utils";
import { deepClone } from "../../modules/utils";


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
}

export class GuiText extends TextMesh {
    public type = IObjectTypes.GUI_TEXT;
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

