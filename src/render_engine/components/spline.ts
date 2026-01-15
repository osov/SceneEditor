import { MeshBasicMaterial, LineBasicMaterial, Vector3, CatmullRomCurve3, Line, BufferAttribute, BufferGeometry, Vector2 } from "three";
import { EntityBase } from "../objects/entity_base";
import { IBaseEntityAndThree, IObjectTypes } from "../types";
import { is_base_mesh } from "../helpers/utils";
import { deepClone } from "../../modules/utils";
import { HistoryOwner } from "../../modules_editor/modules_editor_const";
import { MeshPropertyInfo } from "@editor/core/render/types";
import { Services } from '@editor/core';


export function CmpSpline(cmp_mesh: EntityBase) {
    const spline_mat_helper = new MeshBasicMaterial({ color: 0x00ffff });
    const spline_mat = new LineBasicMaterial({ color: 0xff0000, opacity: 0.35, linewidth: 2 });
    let curve: CatmullRomCurve3 | undefined;
    let spline_mesh: Line | undefined;
    const spline_arc_segments = 200;
    let spline_data: Vector2[] = [];

    function init() {
        Services.event_bus.on('scene:object_removing', (data) => {
            const e = data as { id: number };
            on_mesh_remove(e);
        });
        Services.event_bus.on('input:pointer_up', (data) => {
            const e = data as { button: number; x: number; y: number };
            if (e.button == 0) {
                if (!Services.input.is_shift())
                    return;
                const selected_list = Services.selection.selected;
                if (selected_list.length == 1) {
                    if (selected_list[0].parent == cmp_mesh || selected_list[0] == cmp_mesh) {
                        add_to_history();
                        const cp = Services.camera.screen_to_world(e.x, e.y);
                        add_point(cp.x, cp.y, true);
                    }
                }
            }
        });

    }

    function add_to_history() {
        const data = deepClone(serialize(true)) as any as MeshPropertyInfo<Vector3>[];
        if (data.length === 0)
            return;
        data[0].index = cmp_mesh.mesh_data.id;

        Services.history.push({
            type: 'SPLINE_STATE',
            description: 'Изменение сплайна',
            data: { items: data, owner: HistoryOwner.COMPONENT },
            undo: (d) => {
                const history_data = d.items as MeshPropertyInfo<Vector3>[];
                if (history_data[0].index !== cmp_mesh.mesh_data.id) return;

                const positions: Vector3[] = [];
                const ids: number[] = [];
                for (const it of history_data) {
                    positions.push(it.value);
                    ids.push(it.mesh_id);
                }
                deserialize(positions);
                let counter = 0;
                for (const child of cmp_mesh.children) {
                    if (is_base_mesh(child)) {
                        (child as any).mesh_data.id = ids[counter];
                        counter++;
                    }
                }
            },
            redo: () => {},
        });
    }

    function on_mesh_remove(e: { id: number }) {
        const mesh = Services.scene.get_by_id(e.id);
        if (!mesh)
            return;
        if (mesh.parent == cmp_mesh) {
            add_to_history();
            setTimeout(() => remake_spline());
        }
    }

    function make_helper(point: Vector3, is_first: number) {
        const mesh = Services.scene.create(IObjectTypes.ENTITY);
        mesh.ignore_history = ['MESH_ADD'];
        mesh.no_saving = true;
        (mesh as any).material = spline_mat_helper;
        mesh.on_transform_changed = () => {
            update_spline();
            remake_spline(false);
        };
        const lp = cmp_mesh.worldToLocal(point);
        lp.z = 0;
        mesh.position.copy(lp);
        return mesh;
    }

    function add_point(x: number, y: number, select = false) {
        spline_data.push(new Vector2(x, y));
        return make_spline(select);
    }


    function update_spline() {
        if (!curve || spline_data.length == 0)
            return;
        let point = new Vector3();
        if (!spline_mesh) {
            Services.logger.error("spline_mesh is null");
            return;
        }
        let position = spline_mesh.geometry.attributes.position;
        for (let i = 0; i < spline_arc_segments; i++) {
            let t = i / (spline_arc_segments - 1);
            curve.getPoint(t, point);
            position.setXYZ(i, point.x, point.y, point.z);
        }
        position.needsUpdate = true;
    }

    function remake_spline(is_make = true) {
        if (cmp_mesh.children.length == 0)
            return console.warn("Remake fail");
        spline_data = [];
        for (let i = 0; i < cmp_mesh.children.length; i++) {
            if (is_base_mesh(cmp_mesh.children[i])) {
                const m = cmp_mesh.children[i];
                const wp = new Vector3();
                m.getWorldPosition(wp);
                spline_data.push(new Vector2(wp.x, wp.y));
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
        let cnt = spline_data.length;
        for (let i = 0; i < cnt; i++) {
          const  pos = new Vector3(spline_data[i].x, spline_data[i].y, 0);
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
            Services.selection.set_selected([helper]);
        curve = new CatmullRomCurve3(positions);
        curve.curveType = 'catmullrom';
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
                    const m = cmp_mesh.children[i];
                    const wp = new Vector3();
                    m.getWorldPosition(wp);
                    wp.z = 0;
                    if (with_id)
                        tmp.push({ mesh_id: (cmp_mesh.children[i] as IBaseEntityAndThree).mesh_data.id, value: wp });
                    else
                        tmp.push({ mesh_id: -1, value: wp });
                    spline_data.push(new Vector2(wp.x, wp.y));
                }
            }
        }
        if (with_id)
            return tmp;
        for (let i = 0; i < spline_data.length; i++) {
            const it = spline_data[i];
            it.x = Number(it.x.toFixed(2));
            it.y = Number(it.y.toFixed(2));
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