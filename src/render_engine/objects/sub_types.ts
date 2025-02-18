import { IBaseMesh, IObjectTypes } from "../types";
import { EntityContainer } from "./entity_container";
import { Slice9Mesh } from "./slice9";
import { TextMesh } from "./text";

export class GoContainer extends EntityContainer {
    public type = IObjectTypes.GO_CONTAINER;

    constructor() {
        super();
        this.layers.disable(0);
        this.layers.disable(1);
    }
}

export class GuiContainer extends EntityContainer implements IBaseMesh {
    public type = IObjectTypes.GUI_CONTAINER;

    constructor() {
        super();
        this.layers.disable(0);
        this.layers.disable(1);
    }

    set_position(x: number, y: number, z?: number): void { }
    set_pivot(x: number, y: number, is_sync?: boolean): void { }
    set_size(w: number, h: number): void { }
}

export class GuiBox extends Slice9Mesh {
    public type = IObjectTypes.GUI_BOX;
}

export class GoSprite extends Slice9Mesh {
    public type = IObjectTypes.GO_SPRITE;
}

export class GuiText extends TextMesh {
    public type = IObjectTypes.GUI_TEXT;
}

export class GoText extends TextMesh {
    public type = IObjectTypes.GO_TEXT;
}

