import { MeshBasicMaterial, LineBasicMaterial, Vector3, CatmullRomCurve3, Line, BufferAttribute, BufferGeometry } from "three";
import { EntityBase } from "../objects/entity_base";
import { IObjectTypes } from "../types";
import { is_base_mesh } from "../helpers/utils";
import { deepClone } from "../../modules/utils";

export function CmpSpline(cmp_mesh: EntityBase) {
    const spline_mat_helper = new MeshBasicMaterial({ color: 0x00ffff });
    const spline_mat = new LineBasicMaterial({ color: 0xff0000, opacity: 0.35, linewidth: 2 });
    let curve: CatmullRomCurve3|undefined;
    let spline_mesh: Line|undefined;
    const spline_arc_segments = 200;
    let spline_data: Vector3[] = [];
    const history_data: Vector3[][] = [];

    function init() {
        EventBus.on('SYS_MESH_REMOVE_BEFORE', on_mesh_remove);
        // todo history back

        EventBus.on('SYS_INPUT_POINTER_UP', (e) => {
            if (e.button == 0) {
                if (!Input.is_shift())
                    return;
                const selected_list = SelectControl.get_selected_list();
                if (selected_list.length == 1){
                    if (selected_list[0].parent == cmp_mesh || selected_list[0] == cmp_mesh) {
                        const cp = Camera.screen_to_world(e.x, e.y);
                        add_point(cp.x, cp.y, true);
                    }
                }
            }
        });
    }

    function on_mesh_remove(e: { id: number }) {
        const mesh = SceneManager.get_mesh_by_id(e.id);
        if (!mesh)
            return;
        if (mesh.parent == cmp_mesh) {
            history_data.push(deepClone(serialize()));
            setTimeout(() => remake_spline());
        }
    }

    function make_helper(point: Vector3, is_first: number) {
        const mesh = SceneManager.create(IObjectTypes.ENTITY);
        SceneManager.add(mesh, cmp_mesh.mesh_data.id);
        mesh.ignore_history = ['MESH_ADD'];
       // mesh.set_scale(0.3, 0.3);
        (mesh as any).material = spline_mat_helper;
        mesh.on_transform_changed = () => {
            update_spline();
            remake_spline(false);
        };
        mesh.no_saving = true;
        mesh.position.copy(point);
        return mesh;
    }

    function add_point(x: number, y: number, select = false) {
        let lp = cmp_mesh.worldToLocal(new Vector3(x, y, 0));
        lp.z = 0;
        spline_data.push(lp);
        return make_spline(select);
    }


    function update_spline() {
        if (!curve || spline_data.length == 0)
            return;
        let point = new Vector3();
        let spline = curve;
        if (!spline_mesh) {
            Log.error("spline_mesh is null");
            return;
        }
        let position = spline_mesh.geometry.attributes.position;
        for (let i = 0; i < spline_arc_segments; i++) {
            let t = i / (spline_arc_segments - 1);
            spline.getPoint(t, point);
            position.setXYZ(i, point.x, point.y, point.z);
        }
        position.needsUpdate = true;
    }

    function remake_spline(is_make = true) {
        if (cmp_mesh.children.length == 0)
            return console.warn("Remake fail");
        spline_data = [];
        for (let i = 0; i < cmp_mesh.children.length; i++) {
            if (is_base_mesh(cmp_mesh.children[i]))
                spline_data.push(cmp_mesh.children[i].position.clone());
        }
        if (is_make)
            make_spline();
    }

    function make_spline(select = false) {
        for (let i = cmp_mesh.children.length - 1; i >= 0; i--)
            cmp_mesh.remove(cmp_mesh.children[i]);
        let helper;
        let positions = [new Vector3()];
        let pos = new Vector3();
        let cnt = spline_data.length;
        for (let i = 0; i < cnt; i++) {
            pos = spline_data[i];
            var first = 0;
            if (i == 0)
                first = 1;
            if (i == cnt - 1)
                first = 2;
            helper = make_helper(pos, first);
            helper.name = "point_" + (i + 1);
            positions.push(helper.position);
            cmp_mesh.add(helper);
        }
        if (select && helper)
            SelectControl.set_selected_list([helper]);
        curve = new CatmullRomCurve3(positions);
        curve.curveType = 'catmullrom';
        curve = curve;
        let geometry = new BufferGeometry();
        geometry.setAttribute('position', new BufferAttribute(new Float32Array(spline_arc_segments * 3), 3));
        spline_mesh = new Line(geometry, spline_mat);
        spline_mesh.frustumCulled = false;
        cmp_mesh.add(spline_mesh);
        update_spline();
        return cmp_mesh;
    }


    function serialize() {
        if (cmp_mesh.children.length > 0) {
            spline_data = [];
            for (let i = 0; i < cmp_mesh.children.length; i++) {
                if (is_base_mesh(cmp_mesh.children[i]))
                    spline_data.push(cmp_mesh.children[i].position.clone());
            }
        }
        return spline_data;
    }

    function deserialize(_data: any) {
        spline_data = _data;
        make_spline();
    }


    return {
        init,
        add_point,
        serialize,
        deserialize
    }
}