import {  IObjectTypes } from "../types";
import { Slice9Mesh } from "./slice9";
import { TextMesh } from "./text";
import { EntityBase } from "./entity_base";

export class GuiContainer extends EntityBase  {
    public type = IObjectTypes.GUI_CONTAINER;

    constructor() {
        super();
        this.layers.disable(RenderEngine.DC_LAYERS.GO_LAYER);
        this.layers.disable(RenderEngine.DC_LAYERS.GUI_LAYER);
    }

    set_position(x: number, y: number, z?: number): void { }
    set_pivot(x: number, y: number, is_sync?: boolean): void { }
    set_size(w: number, h: number): void { }
}

export class GoContainer extends EntityBase {
    public type = IObjectTypes.GO_CONTAINER;

    constructor() {
        super();
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


export class GoSprite extends Slice9Mesh {
    public type = IObjectTypes.GO_SPRITE_COMPONENT;
    public is_component = true;
    set_pivot(x: number, y: number, is_sync?: boolean): void { }
}

export class GoText extends TextMesh {
    public type = IObjectTypes.GO_LABEL_COMPONENT;
    public is_component = true;
}

