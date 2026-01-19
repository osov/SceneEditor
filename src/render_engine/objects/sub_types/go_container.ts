// GoContainer - контейнер для GameObject элементов

import { IObjectTypes } from "../../types";
import { EntityBase } from "../entity_base";
import { DC_LAYERS } from '@editor/engine/RenderService';

export class GoContainer extends EntityBase {
    public type = IObjectTypes.GO_CONTAINER;

    constructor(id: number) {
        super(id);
        this.layers.disable(DC_LAYERS.GO_LAYER);
        this.layers.disable(DC_LAYERS.GUI_LAYER);
    }

    // GoContainer использует базовые поля из EntityBase (не переопределяем)
}
