import { MeshBasicMaterial, LineBasicMaterial, SphereGeometry, Vector3, Mesh, CatmullRomCurve3, Line, BufferAttribute, BufferGeometry } from "three";
import { EntityBase } from "../objects/entity_base";
import { IBaseEntity, IObjectTypes } from "../types";
import { is_base_mesh } from "../helpers/utils";
import { deepClone } from "../../modules/utils";

export class SplineComponent extends EntityBase implements IBaseEntity {
    public type = IObjectTypes.COMPONENT_SPLINE;
    public is_component = true;

    private spline_mat_helper = new MeshBasicMaterial({ color: 0x00ffff });
    private spline_mat = new LineBasicMaterial({ color: 0xff0000, opacity: 0.35, linewidth: 2 });
    private curve?: CatmullRomCurve3;
    private spline_mesh?: Line;
    private spline_arc_segments = 200;
    private spline_data: Vector3[] = [];
    private history_data: Vector3[][] = [];
    constructor() {
        super();
        this.set_scale(0.1, 0.1);
        EventBus.on('SYS_MESH_REMOVE_BEFORE', this.on_mesh_remove.bind(this));
        // todo history back

        EventBus.on('SYS_INPUT_POINTER_UP', (e) => {
            if (e.button == 0) {
                if (!Input.is_shift())
                    return;
                const selected_list = SelectControl.get_selected_list();
                if (selected_list.length == 1){
                    log("AA",selected_list[0].name)
                    if (selected_list[0].parent == this || selected_list[0] == this) {
                        log("AA ok")
                        const cp = Camera.screen_to_world(e.x, e.y);
                        this.add_point(cp.x, cp.y, true);
                    }
                }
            }
        });
    }

    private on_mesh_remove(e: { id: number }) {
        const mesh = SceneManager.get_mesh_by_id(e.id);
        if (!mesh)
            return;
        if (mesh.parent == this) {
            this.history_data.push(deepClone(this.serialize()));
            setTimeout(() => this.remake_spline());
        }
    }

    private make_helper(point: Vector3, is_first: number) {
        const mesh = SceneManager.create(IObjectTypes.ENTITY);
        SceneManager.add(mesh, this.mesh_data.id);
        mesh.ignore_history = ['MESH_ADD'];
        mesh.set_scale(0.3, 0.3);
        (mesh as any).material = this.spline_mat_helper;
        mesh.on_transform_changed = this.update_spline.bind(this);
        mesh.no_saving = true;
        mesh.position.copy(point);
        return mesh;
    }

    add_point(x: number, y: number, select = false) {
        let lp = this.worldToLocal(new Vector3(x, y, 0));
        lp.z = 0;
        this.spline_data.push(lp);
        return this.make_spline(select);
    }


    private update_spline() {
        if (!this.curve || this.spline_data.length == 0)
            return;
        let point = new Vector3();
        let spline = this.curve;
        if (!this.spline_mesh) {
            Log.error("this.spline_mesh is null");
            return;
        }
        let position = this.spline_mesh.geometry.attributes.position;
        for (let i = 0; i < this.spline_arc_segments; i++) {
            let t = i / (this.spline_arc_segments - 1);
            spline.getPoint(t, point);
            position.setXYZ(i, point.x, point.y, point.z);
        }
        position.needsUpdate = true;
    }

    private remake_spline() {
        if (this.children.length == 0)
            return console.warn("Remake fail");
        this.spline_data = [];
        for (let i = 0; i < this.children.length; i++) {
            if (is_base_mesh(this.children[i]))
                this.spline_data.push(this.children[i].position.clone());
        }
        this.make_spline();
    }

    private make_spline(select = false) {
        for (let i = this.children.length - 1; i >= 0; i--)
            this.remove(this.children[i]);
        let helper;
        let positions = [new Vector3()];
        let pos = new Vector3();
        let cnt = this.spline_data.length;
        for (let i = 0; i < cnt; i++) {
            pos = this.spline_data[i];
            var first = 0;
            if (i == 0)
                first = 1;
            if (i == cnt - 1)
                first = 2;
            helper = this.make_helper(pos, first);
            helper.name = "point_" + (i + 1);
            positions.push(helper.position);
            this.add(helper);
        }
        if (select && helper)
            SelectControl.set_selected_list([helper]);
        let curve = new CatmullRomCurve3(positions);
        curve.curveType = 'catmullrom';
        this.curve = curve;
        let geometry = new BufferGeometry();
        geometry.setAttribute('position', new BufferAttribute(new Float32Array(this.spline_arc_segments * 3), 3));
        this.spline_mesh = new Line(geometry, this.spline_mat);
        this.spline_mesh.frustumCulled = false;
        this.add(this.spline_mesh);
        this.update_spline();
        return this;
    }


    serialize() {
        if (this.children.length > 0) {
            this.spline_data = [];
            for (let i = 0; i < this.children.length; i++) {
                if (is_base_mesh(this.children[i]))
                    this.spline_data.push(this.children[i].position.clone());
            }
        }
        return this.spline_data;

    }

    deserialize(_data: any) {
        this.spline_data = _data;
        this.make_spline();
    }



}