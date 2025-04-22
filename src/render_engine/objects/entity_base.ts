import { BufferGeometry, Mesh, Object3DEventMap, PlaneGeometry, ShaderMaterial, Vector2, Vector3 } from "three";
import { IBaseEntity, IBaseParameters, IObjectTypes, OnTransformChanged } from "../types";
import { convert_width_height_to_pivot_bb, is_base_mesh, set_pivot_with_sync_pos } from "../helpers/utils";
import { WORLD_SCALAR } from "../../config";
import { HistoryDataKeys } from "../../controls/HistoryControl";

export const shader = new ShaderMaterial({
    vertexShader: 'void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);}',
    fragmentShader: 'void main() { gl_FragColor = vec4(1.0); }'
});

const tmp_size = 32 * WORLD_SCALAR;

export class EntityBase extends Mesh<BufferGeometry, ShaderMaterial, Object3DEventMap> implements IBaseEntity {
    public type = IObjectTypes.ENTITY;
    public is_component = false;
    public mesh_data = { id: -1 };
    public on_transform_changed?: OnTransformChanged;
    public no_saving = false;
    public no_removing = false;
    public ignore_history:HistoryDataKeys[] = [];

    protected parameters: IBaseParameters = {
        width: tmp_size,
        height: tmp_size,
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

    constructor(id: number) {
        super(new PlaneGeometry(tmp_size, tmp_size), shader);
        this.mesh_data.id = id;
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


    get_anchor() {
        return new Vector2(this.parameters.anchor_x, this.parameters.anchor_y);
    }

    set_anchor(x: number, y: number): void {
        this.parameters.anchor_x = x;
        this.parameters.anchor_y = y;
    }

    set_active(val: boolean) {
        this.visible = val;
    }

    get_active() {
        return this.visible;
    }

    set_visible(val: boolean) {
        this.geometry.setDrawRange(0, val ? Infinity : 0);
    }

    get_visible() {
        return this.geometry.drawRange.count != 0;
    }

    transform_changed() {
        if (!this.matrixAutoUpdate)
            this.updateMatrixWorld(true);
        if (this.on_transform_changed)
            this.on_transform_changed(this);
        for (let i = 0; i < this.children.length; i++) {
            const it = this.children[i];
            if (is_base_mesh(it))
                (it as unknown as EntityBase).transform_changed();
        }
    }

    get_pivot() {
        return new Vector2(this.parameters.pivot_x, this.parameters.pivot_y);
    }

    get_size() {
        return new Vector2(this.parameters.width, this.parameters.height);
    }

    set_pivot(x: number, y: number, is_sync = false) {
    }

    set_size(w: number, h: number) {
    }

    set_color(hex_color: string) { }
    get_color() { return '' }


    set_texture(name: string, atlas = '') {
        this.parameters.texture = name;
        this.parameters.atlas = atlas;
    }

    get_texture() {
        return [this.parameters.texture, this.parameters.atlas];
    }
    serialize() {
        return {};
    }

    deserialize(_data: any) {
    }

}