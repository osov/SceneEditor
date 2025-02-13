import { ShaderMaterial, Vector2, Color } from "three";
import { IBaseMesh, IObjectTypes } from "../types";
import { shader } from "./entity_container";
import { Slice9Mesh } from "./slice9";


const empty_shader = new ShaderMaterial({
    uniforms: {
        tex: { value: null },
        u_dimensions: { value: new Vector2(1, 1) },
        u_border: { value: new Vector2(1, 1) },
        u_color: { value: new Color('#fff') },
    },
    vertexShader: shader.vertexShader,
    fragmentShader: shader.fragmentShader,
    transparent: false

})

export class GoContainer extends Slice9Mesh {
    public type = IObjectTypes.GO_CONTAINER;

    constructor(width = 1, height = 1, slice_width = 0, slice_height = 0) {
        super(width, height, slice_width, slice_height, empty_shader);
        this.layers.disable(0);
        this.layers.disable(1);
    }
}

export class GuiContainer extends Slice9Mesh implements IBaseMesh {
    public type = IObjectTypes.GUI_CONTAINER;

    constructor(width = 1, height = 1, slice_width = 0, slice_height = 0) {
        super(width, height, slice_width, slice_height, empty_shader);
        this.layers.disable(0);
        this.layers.disable(1);
    }
}