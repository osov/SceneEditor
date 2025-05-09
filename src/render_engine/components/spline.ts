import { MeshBasicMaterial, LineBasicMaterial, Vector3, CatmullRomCurve3, Line, BufferAttribute, BufferGeometry, Vector2 } from "three";
import { EntityBase } from "../objects/entity_base";
import { IBaseEntityAndThree, IObjectTypes } from "../types";
import { is_base_mesh } from "../helpers/utils";
import { deepClone } from "../../modules/utils";
import { HistoryOwner, THistoryUndo } from "../../modules_editor/modules_editor_const";
import { MeshPropertyInfo } from "../../controls/types";

export function CmpSpline(cmp_mesh: EntityBase) {
    const spline_mat_helper = new MeshBasicMaterial({ color: 0x00ffff });
    const spline_mat = new LineBasicMaterial({ color: 0xff0000, opacity: 0.35, linewidth: 2 });
    let curve: CatmullRomCurve3 | undefined;
    let spline_mesh: Line | undefined;
    const spline_arc_segments = 200;
    let spline_data: Vector2[] = [];

    function init() {
        EventBus.on('SYS_MESH_REMOVE_BEFORE', on_mesh_remove);
        EventBus.on('SYS_INPUT_POINTER_UP', (e) => {
            if (e.button == 0) {
                if (!Input.is_shift())
                    return;
                const selected_list = SelectControl.get_selected_list();
                if (selected_list.length == 1) {
                    if (selected_list[0].parent == cmp_mesh || selected_list[0] == cmp_mesh) {
                        add_to_history();
                        const cp = Camera.screen_to_world(e.x, e.y);
                        add_point(cp.x, cp.y, true);
                    }
                }
            }
        });

        EventBus.on('SYS_HISTORY_UNDO', (event: THistoryUndo) => {
            if (event.owner != HistoryOwner.COMPONENT) return;
            const data = event.data[0] as MeshPropertyInfo<Vector3>[];
            if (data[0].index != cmp_mesh.mesh_data.id)
                return;
            const positions = [];
            const ids = [];
            for (let i = 0; i < data.length; i++) {
                const it = data[i];
                positions.push(it.value);
                ids.push(it.mesh_id);
            }
            deserialize(positions);
            let counter = 0;
            for (let i = 0; i < cmp_mesh.children.length; i++) {
                if (is_base_mesh(cmp_mesh.children[i])) {
                    (cmp_mesh.children[i] as any).mesh_data.id = ids[counter];
                    counter++;
                }
            }
        });
    }

    function add_to_history() {
        const data = deepClone(serialize(true)) as any as MeshPropertyInfo<Vector3>[];
        if (data.length == 0)
            return;
        data[0].index = cmp_mesh.mesh_data.id;
        HistoryControl.add('SPLINE_STATE', [data], HistoryOwner.COMPONENT);
    }

    function on_mesh_remove(e: { id: number }) {
        const mesh = SceneManager.get_mesh_by_id(e.id);
        if (!mesh)
            return;
        if (mesh.parent == cmp_mesh) {
            add_to_history();
            setTimeout(() => remake_spline());
        }
    }

    function make_helper(point: Vector3, is_first: number) {
        const mesh = SceneManager.create(IObjectTypes.ENTITY);
        mesh.ignore_history = ['MESH_ADD'];
        mesh.no_saving = true;
        // mesh.set_scale(0.3, 0.3);
        (mesh as any).material = spline_mat_helper;
        mesh.on_transform_changed = () => {
            update_spline();
            remake_spline(false);
        };
        mesh.position.copy(point);
        return mesh;
    }

    function add_point(x: number, y: number, select = false) {
        let lp = cmp_mesh.worldToLocal(new Vector3(x, y, 0));
        spline_data.push(new Vector2(lp.x, lp.y));
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
            if (is_base_mesh(cmp_mesh.children[i])){
                const pos = cmp_mesh.children[i].position;
                spline_data.push(new Vector2(pos.x, pos.y));
            }
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
            pos = new Vector3(spline_data[i].x, spline_data[i].y, 0);
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


    function serialize(with_id = false) {
        const tmp: MeshPropertyInfo<Vector3>[] = [];
        if (cmp_mesh.children.length > 0) {
            spline_data = [];
            for (let i = 0; i < cmp_mesh.children.length; i++) {
                if (is_base_mesh(cmp_mesh.children[i])) {
                    if (with_id)
                        tmp.push({ mesh_id: (cmp_mesh.children[i] as IBaseEntityAndThree).mesh_data.id, value: cmp_mesh.children[i].position.clone() });
                    else
                        tmp.push({ mesh_id: -1, value: cmp_mesh.children[i].position.clone() });
                    const pos = tmp[tmp.length - 1].value;
                    spline_data.push(new Vector2(pos.x, pos.y));
                }
            }
        }
        if (with_id)
            return tmp;
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