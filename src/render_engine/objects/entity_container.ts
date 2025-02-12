import { Mesh, PlaneGeometry, ShaderMaterial, Vector2, Vector3 } from "three";
import { IBaseMesh, IBaseParametersEntity, IObjectTypes, OnTransformChanged } from "../types";
import { convert_width_height_to_pivot_bb, is_base_mesh, set_pivot_with_sync_pos } from "../helpers/utils";

const tmp_shader = new ShaderMaterial({
    vertexShader: 'void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);}',
    fragmentShader: 'void main() { gl_FragColor = vec4(1.0); }'
});

export class EntityContainer extends Mesh implements IBaseMesh {
    public type = IObjectTypes.EMPTY;
    public mesh_data = { id: -1 };
    public on_transform_changed?: OnTransformChanged;

    private parameters: IBaseParametersEntity = {
        width: 1,
        height: 1,
        pivot_x: 0.5,
        pivot_y: 0.5,
        anchor_x: -1,
        anchor_y: -1,
        color: '#fff',
        slice_width: 0,
        slice_height: 0,
        texture: '',
        atlas: '',
        clip_width: 1,
        clip_height: 1
    };

    constructor() {
        super(new PlaneGeometry(1, 1), tmp_shader);
    }

    set_position(x: number, y: number, z?: number) {
        this.position.set(x, y, z == undefined ? this.position.z : z);
        this.transform_changed();
    }

    get_position() {
        return this.position.clone();
    }

    set_scale(x: number, y: number): void {
        this.scale.set(x * this.parameters.width, y * this.parameters.height, this.scale.z);
        this.transform_changed();
    }

    get_scale(): Vector2 {
        return new Vector2(this.scale.x, this.scale.y);
    }

    set_size(w: number, h: number) {
        const bb = convert_width_height_to_pivot_bb(w, h, this.parameters.pivot_x, this.parameters.pivot_y);
        const geometry = this.geometry;
        geometry.attributes['position'].array[0] = bb[1].x;
        geometry.attributes['position'].array[1] = bb[1].y;

        geometry.attributes['position'].array[3] = bb[2].x;
        geometry.attributes['position'].array[4] = bb[2].y;

        geometry.attributes['position'].array[6] = bb[0].x;
        geometry.attributes['position'].array[7] = bb[0].y;

        geometry.attributes['position'].array[9] = bb[3].x;
        geometry.attributes['position'].array[10] = bb[3].y;
        geometry.attributes['position'].needsUpdate = true;
        geometry.computeBoundingSphere();
        this.parameters.width = w;
        this.parameters.height = h;
        this.transform_changed();
    }

    get_size() {
        return new Vector2(this.parameters.width, this.parameters.height);
    }

    set_color(hex_color: string) {
        this.parameters.color = hex_color;
    }

    set_slice(width: number, height: number) {
        this.parameters.slice_width = width;
        this.parameters.slice_height = height;
    }

    get_slice() {
        return new Vector2(this.parameters.slice_width, this.parameters.slice_height);
    }

    set_texture(name: string, atlas = '') {
        this.parameters.texture = name;
        this.parameters.atlas = atlas;
    }

    get_bounds() {
        const wp = new Vector3();
        const ws = new Vector3();
        this.getWorldPosition(wp);
        this.getWorldScale(ws);
        const bb = convert_width_height_to_pivot_bb(this.parameters.width, this.parameters.height, this.parameters.pivot_x, this.parameters.pivot_y);
        return [
            wp.x + bb[0].x * ws.x,
            wp.y + bb[1].y * ws.y,
            wp.x + bb[2].x * ws.x,
            wp.y + bb[3].y * ws.y
        ];
    }

    get_color() {
        return this.parameters.color;
    }

    set_pivot(x: number, y: number, is_sync = false) {
        if (is_sync) {
            const size = this.get_size();
            set_pivot_with_sync_pos(this, size.x, size.y, this.parameters.pivot_x, this.parameters.pivot_y, x, y);
        }
        this.parameters.pivot_x = x;
        this.parameters.pivot_y = y;
        this.set_size(this.parameters.width, this.parameters.height);
    }

    get_pivot() {
        return new Vector2(this.parameters.pivot_x, this.parameters.pivot_y);
    }

    get_anchor() {
        return new Vector2(this.parameters.anchor_x, this.parameters.anchor_y);
    }

    set_anchor(x: number, y: number): void {
        this.parameters.anchor_x = x;
        this.parameters.anchor_y = y;
    }

    transform_changed() {
        if (!this.matrixAutoUpdate)
            this.updateMatrixWorld(true);
        if (this.on_transform_changed)
            this.on_transform_changed(this);
        for (let i = 0; i < this.children.length; i++) {
            const it = this.children[i];
            if (is_base_mesh(it))
                (it as unknown as IBaseMesh).transform_changed();
        }
    }

    serialize() {
        return {};
    }

    deserialize(_data: any) {

    }

}