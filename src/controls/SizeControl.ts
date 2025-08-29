import { Mesh, SphereGeometry, MeshBasicMaterial, Vector3, Vector2, CircleGeometry, LineDashedMaterial, BufferGeometry, Line, Object3DEventMap, Scene } from "three";
import { IBaseMeshAndThree, IObjectTypes, PivotX, PivotY } from "../render_engine/types";
import { MeshPropertyInfo } from "./types";
import { Slice9Mesh } from "../render_engine/objects/slice9";
import { is_base_mesh } from "../render_engine/helpers/utils";
import { WORLD_SCALAR } from "../config";
import { MeshProperty } from "../inspectors/MeshInspector";
import { HistoryOwner, THistoryUndo } from "../modules_editor/modules_editor_const";

declare global {
    const SizeControl: ReturnType<typeof SizeControlCreate>;
}

export function register_size_control() {
    (window as any).SizeControl = SizeControlCreate();
}

const DEBUG_BB_POINT_SIZE_MIN = 0.03; // NOTE: минимальный размер точки (не зависит от растояния)
const DEBUG_BB_POINT_MAX_SIZE_PERCENT = 0.04; // NOTE: максимальный размер точки в процентах от растояния
const DEBUG_BB_POINT_SIZE_MAX = 0.1; // NOTE: самый большой возможный размер точки (не от растояния)

// todo
// модуль не умеет правильно работать если сделан scale в минус или rotation(точки не строит правильно)

function SizeControlCreate() {
    const scene = RenderEngine.scene;
    const editor_z = 0;
    let debug_center: Mesh;
    const bb_points: Mesh<SphereGeometry, MeshBasicMaterial, Object3DEventMap>[] = [];
    const pivot_points: Mesh<CircleGeometry, MeshBasicMaterial, Object3DEventMap>[] = [];
    let anchor_mesh: Mesh<CircleGeometry, MeshBasicMaterial, Object3DEventMap>;
    let slice_box: Line;
    let slice_box_range: Line;
    const pointer = new Vector2();
    const click_point = new Vector2();
    const prev_point = new Vector2();
    let click_pos = new Vector3();
    let offset_move = 0;
    let selected_list: IBaseMeshAndThree[] = [];
    let is_down = false;
    let is_active = false;
    let is_selected_anchor = false;
    let old_size: MeshPropertyInfo<{ size: Vector2, pos: Vector3 }>[] = [];
    let old_pos: MeshPropertyInfo<Vector3>[] = [];
    let old_slice: MeshPropertyInfo<Vector2>[] = [];
    let old_anchor: MeshPropertyInfo<Vector2>[] = [];
    let is_changed_size = false;
    let is_changed_pos = false;
    let is_changed_slice = false;
    let is_changed_anchor = false;
    const dir = [0, 0];
    const layer_control = RenderEngine.DC_LAYERS.CONTROLS_LAYER;

    function init() {
        const geometry = new SphereGeometry(8, 4, 2);
        const material = new MeshBasicMaterial({ color: 0xffff00 });
        for (let i = 0; i < 4; i++) {
            const sphere = new Mesh(geometry, material);
            sphere.visible = false;
            sphere.layers.set(layer_control);
            scene.add(sphere)
            bb_points.push(sphere);
        }
        for (let i = 0; i < 9; i++) {
            const material = new MeshBasicMaterial({ color: 0xff0000 });
            const geometry = new CircleGeometry(7, 4);
            const mesh = new Mesh(geometry, material);
            mesh.visible = false;
            mesh.layers.set(layer_control);
            mesh.layers.enable(RenderEngine.DC_LAYERS.RAYCAST_LAYER);
            scene.add(mesh)
            pivot_points.push(mesh);
        }

        anchor_mesh = new Mesh(new CircleGeometry(15 * WORLD_SCALAR, 12), new MeshBasicMaterial({ color: 0xffff00, transparent: true }));
        anchor_mesh.position.set(300, -220, editor_z);
        anchor_mesh.layers.set(layer_control);
        anchor_mesh.layers.enable(RenderEngine.DC_LAYERS.RAYCAST_LAYER);
        ResourceManager.preload_texture('img/target.png', 'editor').then(() => {
            anchor_mesh.material.map = ResourceManager.get_texture('target', 'editor').texture;
            anchor_mesh.material.needsUpdate = true;
        })
        anchor_mesh.visible = false;
        scene.add(anchor_mesh)


        const offset = 0.5;
        var points = [
            new Vector3(-offset, offset, 0),
            new Vector3(offset, offset, 0),
            new Vector3(offset, -offset, 0),
            new Vector3(-offset, -offset, 0),
            new Vector3(-offset, offset, 0),
        ];
        slice_box = new Line(new BufferGeometry().setFromPoints(points), new LineDashedMaterial({ color: 0xffaa00, dashSize: 0.1, gapSize: 0.05 }));
        slice_box.computeLineDistances();
        slice_box.position.set(0, 0, editor_z);
        slice_box.layers.set(layer_control);
        scene.add(slice_box)
        slice_box.visible = false;
        slice_box_range = new Line(new BufferGeometry().setFromPoints(points), new LineDashedMaterial({ color: 0xffaaff, dashSize: 0.1, gapSize: 0.05 }));
        slice_box_range.computeLineDistances();
        slice_box_range.position.set(0, 0, editor_z);
        slice_box_range.layers.set(layer_control);
        scene.add(slice_box_range)

        EventBus.on('SYS_VIEW_INPUT_KEY_DOWN', (e) => {
            if (!is_active) return;
            if (e.target != RenderEngine.renderer.domElement)
                return;
            if (Input.is_shift()) {
                document.body.style.cursor = 'default';
                set_pivot_visible(true);
                draw_anchor_point();
            }

            if (Input.is_alt() && selected_list.length == 1 && (selected_list[0] instanceof Slice9Mesh)) {
                if (!slice_box.visible) {
                    set_slice_visible(true);
                    draw();
                }
            }

        })

        EventBus.on('SYS_VIEW_INPUT_KEY_UP', (_e) => {
            if (!is_active) return;
            if (!Input.is_shift()) {
                is_selected_anchor = false;
                set_pivot_visible(false);
            }
            if (!Input.is_alt())
                set_slice_visible(false);
        })

        // pivots/anchor logic
        EventBus.on('SYS_INPUT_POINTER_UP', (e) => {
            if (!is_active) return;
            if (e.button != 0)
                return;
            if (!Input.is_shift())
                return;
            if (selected_list.length == 1) {
                const mesh = selected_list[0];
                if (is_selected_anchor) {
                    is_selected_anchor = false;
                }
                else {
                    if (is_supported_pivot()) {
                        for (let i = 0; i < pivot_points.length; i++) {
                            const pp = pivot_points[i];
                            if (RenderEngine.is_intersected_mesh(new Vector2(e.x, e.y), pp)) {
                                const pivot = index_to_pivot(i);
                                HistoryControl.add('MESH_PIVOT', [{ mesh_id: mesh.mesh_data.id, value: mesh.get_pivot() }], HistoryOwner.SIZE_CONTROL);
                                mesh.set_pivot(pivot.x, pivot.y, true);
                                Inspector.refresh([MeshProperty.PIVOT]);
                                // для текста почему-то прыгает размер и поэтому bb определяется неверно на ближайших кадрах
                                // поэтому не обновляем draw_debug_bb
                                for (let i = 0; i < pivot_points.length; i++)
                                    pivot_points[i].material.color.set(0xffffff);
                                pivot_points[i].material.color.set(0xff0000);
                                const wp = new Vector3();
                                mesh.getWorldPosition(wp);
                                debug_center.position.x = wp.x;
                                debug_center.position.y = wp.y;
                                // draw_debug_bb(get_bounds_from_list());
                            }
                        }
                    }
                }
            }
        })

        debug_center = new Mesh(geometry, new MeshBasicMaterial({ color: 0xff0000 }));
        debug_center.visible = false;
        debug_center.scale.setScalar(0.5)
        debug_center.layers.set(layer_control);
        scene.add(debug_center);


        EventBus.on('SYS_INPUT_POINTER_DOWN', (e) => {
            if (e.target != RenderEngine.renderer.domElement)
                return;
            if (!is_active) return;
            if (e.button != 0)
                return;
            is_down = true;
            click_point.set(e.x, e.y)
            offset_move = 0;
            click_pos = Camera.screen_to_world(click_point.x, click_point.y);
            // save
            old_pos = [];
            is_changed_pos = false;
            for (let i = 0; i < selected_list.length; i++) {
                const m = selected_list[i];
                old_pos.push({ mesh_id: m.mesh_data.id, value: m.position.clone() });
            }
            old_size = [];
            is_changed_size = false;
            for (let i = 0; i < selected_list.length; i++) {
                const m = selected_list[i];
                old_size.push({ mesh_id: m.mesh_data.id, value: { size: m.get_size(), pos: m.position.clone() } });
            }
            is_changed_slice = false;
            old_slice = [];
            for (let i = 0; i < selected_list.length; i++) {
                const m = selected_list[i];
                if (m instanceof Slice9Mesh) {
                    old_slice.push({ mesh_id: m.mesh_data.id, value: m.get_slice() });
                }
            }
            is_changed_anchor = false;
            old_anchor = [];
            for (let i = 0; i < selected_list.length; i++) {
                const m = selected_list[i];
                old_anchor.push({ mesh_id: m.mesh_data.id, value: m.get_anchor() });
            }
            if (RenderEngine.is_intersected_mesh(new Vector2(pointer.x, pointer.y), anchor_mesh))
                is_selected_anchor = true;
        });

        EventBus.on('SYS_INPUT_POINTER_UP', (e) => {
            if (!is_active) return;
            if (e.button != 0)
                return;
            is_down = false;
            if (is_changed_pos) {
                is_changed_pos = false;
                HistoryControl.add('MESH_TRANSLATE', old_pos, HistoryOwner.SIZE_CONTROL);
            }
            if (is_changed_size) {
                is_changed_size = false;
                HistoryControl.add('MESH_SIZE', old_size, HistoryOwner.SIZE_CONTROL);
            }
            if (is_changed_slice) {
                is_changed_slice = false;
                HistoryControl.add('MESH_SLICE', old_slice, HistoryOwner.SIZE_CONTROL);
            }
            if (is_changed_anchor) {
                is_changed_anchor = false;
                HistoryControl.add('MESH_ANCHOR', old_anchor, HistoryOwner.SIZE_CONTROL);
            }
        });

        EventBus.on('SYS_INPUT_POINTER_MOVE', (event) => {
            if (!is_active) return;
            prev_point.set(pointer.x, pointer.y);
            pointer.x = event.x;
            pointer.y = event.y;
            const wp = Camera.screen_to_world(pointer.x, pointer.y);
            const bounds = get_bounds_from_list();
            if (Input.is_shift() && is_selected_anchor) {
                draw_anchor_point(true);
            }
            // slice logic
            if (Input.is_alt() && selected_list.length == 1 && (selected_list[0] instanceof Slice9Mesh)) {
                if (!is_down) {
                    const size = selected_list[0].get_slice();
                    const ws = new Vector3();
                    selected_list[0].getWorldScale(ws);
                    const dx = size.x / ws.x;
                    const dy = size.y / ws.y;
                    const bounds2 = get_bounds_from_list();
                    bounds2[0] += dx * ws.x;
                    bounds2[1] -= dy * ws.y;
                    bounds2[2] -= dx * ws.x;
                    bounds2[3] += dy * ws.y;
                    if (is_supported_size()) {
                        const tmp = get_cursor_dir(wp, bounds2);
                        dir[0] = tmp[0];
                        dir[1] = tmp[1];
                    }
                }
                draw_debug_bb(bounds);
                Inspector.refresh([MeshProperty.SLICE9]);
                return;
            }
            if (Input.is_shift() || Input.is_alt())
                return;
            if (selected_list.length == 0)
                return;

            if (!is_down) {
                if (is_supported_size()) {
                    const tmp = get_cursor_dir(wp, bounds);
                    dir[0] = tmp[0];
                    dir[1] = tmp[1];
                }
            }
            if (is_down) {
                offset_move = click_pos.clone().sub(wp).length();
                const cp = Camera.screen_to_world(prev_point.x, prev_point.y);
                for (let i = 0; i < selected_list.length; i++) {
                    const selected_go = selected_list[i];
                    const ws = new Vector3();
                    selected_go.getWorldScale(ws);
                    const delta = wp.clone().sub(cp).divide(ws);
                    const old_pos = new Vector3();
                    selected_go.getWorldPosition(old_pos);
                    if (dir[0] != 0 || dir[1] != 0) {
                        const old_size = selected_go.get_size();
                        const center_x = (bounds[0] + bounds[2]) / 2;
                        const center_y = (bounds[1] + bounds[3]) / 2;

                        const diff_size = new Vector2(0, 0);
                        const diff_pos = new Vector2(0, 0);
                        const pivot = selected_go.get_pivot();
                        const ax = pivot.x;
                        const ay = pivot.y;
                        if (dir[0] > 0) {
                            diff_pos.x = delta.x * ws.x * ax;
                            diff_size.x = delta.x;
                            if (wp.x < center_x) {
                                diff_size.x = - delta.x;
                                diff_pos.x = delta.x * ws.x * (1 - ax);
                            }
                        }
                        if (dir[1] > 0) {
                            diff_pos.y = delta.y * ws.y * (1 - ay);
                            diff_size.y = -delta.y;
                            if (wp.y > center_y) {
                                diff_size.y = delta.y;
                                diff_pos.y = delta.y * ws.y * ay;
                            }
                        }
                        selected_go.set_size(old_size.x + diff_size.x, old_size.y + diff_size.y);
                        let lp = new Vector3(old_pos.x + diff_pos.x, old_pos.y + diff_pos.y, 0);
                        if (selected_go.parent != null)
                            lp = selected_go.parent.worldToLocal(new Vector3(old_pos.x + diff_pos.x, old_pos.y + diff_pos.y, 0));

                        selected_go.set_position(lp.x, lp.y);
                        is_changed_size = true;

                        Inspector.refresh([MeshProperty.POSITION, MeshProperty.SIZE]);
                    }
                }
                if (dir[0] == 0 && dir[1] == 0) {
                    // если маленькое смещение и при этом не выделен никакой меш
                    // тк объект выделенный определяем по отпусканию кнопки, то тут мы зажимаем и либо что-то тащим либо нет
                    if (offset_move < 0.1 * WORLD_SCALAR) {
                        let is_select = false;
                        for (let i = 0; i < selected_list.length; i++) {
                            const selected_go = selected_list[i];
                            if (RenderEngine.is_intersected_mesh(pointer, selected_go)) {
                                is_select = true;
                                break;
                            }
                        }
                        if (!is_select) {
                            //log('Unselect', offset_move, WORLD_SCALAR);
                            if (!Input.is_control())
                                EventBus.trigger('SYS_UNSELECTED_MESH_LIST');
                            return;
                        }
                    }
                    for (let i = 0; i < selected_list.length; i++) {
                        const selected_go = selected_list[i];
                        const old_pos = new Vector3();
                        selected_go.getWorldPosition(old_pos);
                        const ws = new Vector3();
                        selected_go.getWorldScale(ws);
                        const delta = wp.clone().sub(cp).divide(ws);
                        let lp = new Vector3(old_pos.x + delta.x * ws.x, old_pos.y + delta.y * ws.y, old_pos.z);
                        if (selected_go.parent != null)
                            lp = selected_go.parent.worldToLocal(lp);
                        selected_go.set_position(lp.x, lp.y, lp.z);
                        is_changed_pos = true;
                    }
                }
                draw_debug_bb(bounds);

                TransformControl.set_proxy_in_average_point(selected_list);
                Inspector.refresh([MeshProperty.POSITION]);
            }
        });

        EventBus.on('SYS_HISTORY_UNDO', (event: THistoryUndo) => {
            if (event.owner !== HistoryOwner.SIZE_CONTROL) return;

            switch (event.type) {
                case 'MESH_TRANSLATE':
                    for (const data of event.data) {
                        const mesh = SceneManager.get_mesh_by_id(data.mesh_id)!;
                        mesh.position.copy(data.value);
                        mesh.transform_changed();
                    }
                    break;
                case 'MESH_SIZE':
                    for (const data of event.data) {
                        const mesh = SceneManager.get_mesh_by_id(data.mesh_id)!;
                        mesh.set_size(data.value.size.x, data.value.size.y);
                        mesh.position.copy(data.value.pos);
                        mesh.transform_changed();
                    }
                    break;
                case 'MESH_SLICE':
                    for (const data of event.data) {
                        const mesh = SceneManager.get_mesh_by_id(data.mesh_id)!;
                        if (mesh instanceof Slice9Mesh) {
                            mesh.set_slice(data.value.x, data.value.y);
                            mesh.transform_changed();
                        }
                    }
                    break;
                case 'MESH_ANCHOR':
                    for (const data of event.data) {
                        const mesh = SceneManager.get_mesh_by_id(data.mesh_id)!;
                        mesh.set_anchor(data.value.x, data.value.y);
                        mesh.transform_changed();
                    }
                    break;
                case 'MESH_PIVOT':
                    for (const data of event.data) {
                        const mesh = SceneManager.get_mesh_by_id(data.mesh_id)!;
                        mesh.set_pivot(data.value.x, data.value.y, true);
                        mesh.transform_changed();
                    }
                    break;
            }

            // Update selection and graph
            const meshes = event.data.map(data => SceneManager.get_mesh_by_id(data.mesh_id)!);
            SelectControl.set_selected_list(meshes);
            ControlManager.update_graph();
        });

        EventBus.on('SYS_ON_UPDATE_END', () => {
            draw();
        });
    }

    function get_cursor_dir(wp: Vector3, bounds: number[], range = 7) {
        const dist = Math.abs(bounds[2] - bounds[0]);
        range *= (dist / 300);
        const tmp_dir = [0, 0];
        document.body.style.cursor = 'default';
        tmp_dir[0] = 0;
        tmp_dir[1] = 0;
        if (wp.x > bounds[0] - range && wp.x < bounds[2] + range && wp.y > bounds[3] - range && wp.y < bounds[1] + range) {
            if (Math.abs(bounds[0] - wp.x) < range) {
                document.body.style.cursor = 'e-resize';
                tmp_dir[0] = 1;
            }
            if (Math.abs(bounds[2] - wp.x) < range) {
                document.body.style.cursor = 'e-resize';
                tmp_dir[0] = 1;
            }
            if (Math.abs(bounds[1] - wp.y) < range) {
                document.body.style.cursor = 'n-resize';
                tmp_dir[1] = 1;
            }
            if (Math.abs(bounds[3] - wp.y) < range) {
                document.body.style.cursor = 'n-resize';
                tmp_dir[1] = 1;
            }
            if (Math.abs(bounds[0] - wp.x) < range && Math.abs(bounds[1] - wp.y) < range) {
                document.body.style.cursor = 'nw-resize';
                tmp_dir[0] = 1;
                tmp_dir[1] = 1;
            }
            if (Math.abs(bounds[0] - wp.x) < range && Math.abs(bounds[3] - wp.y) < range) {
                document.body.style.cursor = 'ne-resize';
                tmp_dir[0] = 1;
                tmp_dir[1] = 1;
            }
            if (Math.abs(bounds[2] - wp.x) < range && Math.abs(bounds[1] - wp.y) < range) {
                document.body.style.cursor = 'sw-resize';
                tmp_dir[0] = 1;
                tmp_dir[1] = 1;
            }
            if (Math.abs(bounds[2] - wp.x) < range && Math.abs(bounds[3] - wp.y) < range) {
                document.body.style.cursor = 'se-resize';
                tmp_dir[0] = 1;
                tmp_dir[1] = 1;
            }
        }
        return tmp_dir;
    }

    function index_to_pivot(id: number): Vector2 {
        if (id == 4)
            return new Vector2(PivotX.LEFT, PivotY.CENTER);
        if (id == 0)
            return new Vector2(PivotX.LEFT, PivotY.TOP);
        if (id == 6)
            return new Vector2(PivotX.CENTER, PivotY.TOP);
        if (id == 1)
            return new Vector2(PivotX.RIGHT, PivotY.TOP);
        if (id == 5)
            return new Vector2(PivotX.RIGHT, PivotY.CENTER);
        if (id == 2)
            return new Vector2(PivotX.RIGHT, PivotY.BOTTOM);
        if (id == 7)
            return new Vector2(PivotX.CENTER, PivotY.BOTTOM);
        if (id == 3)
            return new Vector2(PivotX.LEFT, PivotY.BOTTOM);
        if (id == 8)
            return new Vector2(PivotX.CENTER, PivotY.CENTER);
        return new Vector2(PivotX.CENTER, PivotY.CENTER);
    }

    function pivot_to_index(pivot: Vector2): number {
        for (let i = 0; i < 9; i++) {
            if (index_to_pivot(i).equals(pivot))
                return i;
        }
        Log.error("Pivot not found", pivot);
        return -1;
    }

    function get_bounds_from_list() {
        const list = selected_list;
        if (list.length == 0)
            return [0, 0, 0, 0];
        const bb = list[0].get_bounds();
        for (let i = 1; i < list.length; i++) {
            const b = list[i].get_bounds();
            bb[0] = Math.min(bb[0], b[0]);
            bb[1] = Math.max(bb[1], b[1]);
            bb[2] = Math.max(bb[2], b[2]);
            bb[3] = Math.min(bb[3], b[3]);
        }
        return bb;
    }

    function calc_debug_sub_scalar(bb: number[]) {
        const height = Math.abs(bb[3] - bb[1]);
        const width = Math.abs(bb[2] - bb[0]);
        const dist = Math.min(width, height);
        const size = ((dist * DEBUG_BB_POINT_MAX_SIZE_PERCENT) / bb_points[0].geometry.parameters.radius * 2);
        return Math.max(Math.min(size, DEBUG_BB_POINT_SIZE_MAX), DEBUG_BB_POINT_SIZE_MIN);
    }

    function draw_debug_bb(bb: number[]) {
        const SUB_SCALAR = calc_debug_sub_scalar(bb);
        for (let i = 0; i < bb_points.length; i++) {
            bb_points[i].scale.setScalar(SUB_SCALAR);
        }
        for (let i = 0; i < pivot_points.length; i++) {
            pivot_points[i].scale.setScalar(SUB_SCALAR);
        }
        debug_center.scale.setScalar(SUB_SCALAR);

        // left top, right top, right bottom, left bottom
        bb_points[0].position.set(bb[0], bb[1], editor_z);
        bb_points[1].position.set(bb[2], bb[1], editor_z);
        bb_points[2].position.set(bb[2], bb[3], editor_z);
        bb_points[3].position.set(bb[0], bb[3], editor_z);

        for (let i = 0; i < pivot_points.length; i++)
            pivot_points[i].material.color.set(0xffffff);

        const offset = 0;
        pivot_points[0].position.set(bb[0] + offset, bb[1] - offset, editor_z);
        pivot_points[1].position.set(bb[2] - offset, bb[1] - offset, editor_z);
        pivot_points[2].position.set(bb[2] - offset, bb[3] + offset, editor_z);
        pivot_points[3].position.set(bb[0] + offset, bb[3] + offset, editor_z);
        pivot_points[4].position.set(bb[0] + offset, bb[1] - Math.abs(bb[3] - bb[1]) / 2, editor_z);
        pivot_points[5].position.set(bb[2] - offset, bb[1] - Math.abs(bb[3] - bb[1]) / 2, editor_z);
        pivot_points[6].position.set(bb[0] + Math.abs(bb[2] - bb[0]) / 2, bb[1] - offset, editor_z);
        pivot_points[7].position.set(bb[0] + Math.abs(bb[2] - bb[0]) / 2, bb[3] + offset, editor_z);
        pivot_points[8].position.set(bb[0] + Math.abs(bb[2] - bb[0]) / 2, bb[1] - Math.abs(bb[3] - bb[1]) / 2, editor_z);
        if (selected_list.length == 1) {
            const mesh = selected_list[0];
            const wp = new Vector3();
            mesh.getWorldPosition(wp);
            debug_center.position.x = wp.x;
            debug_center.position.y = wp.y;
            const pivot = mesh.get_pivot();
            pivot_points[pivot_to_index(pivot)].material.color.set(0xff0000);
            // slice box
            if (mesh instanceof Slice9Mesh && Input.is_alt()) {
                const slice = mesh.get_slice();
                const scale = mesh.get_size();
                const ws = new Vector3();
                mesh.getWorldScale(ws);
                scale.x *= ws.x;
                scale.y *= ws.y;
                slice_box.position.x = bb[0] + Math.abs(bb[2] - bb[0]) / 2;
                slice_box.position.y = bb[1] - Math.abs(bb[3] - bb[1]) / 2;
                slice_box.scale.set(scale.x, scale.y, 1);

                slice_box_range.position.copy(slice_box.position);
                slice_box_range.scale.copy(slice_box.scale);
                slice_box_range.scale.x -= slice.x * 2;
                slice_box_range.scale.y -= slice.y * 2;
                const cp = Camera.screen_to_world(pointer.x, pointer.y);
                const pp = Camera.screen_to_world(prev_point.x, prev_point.y);
                const delta = cp.clone().sub(pp);
                const center_x = (bb[0] + bb[2]) / 2;
                const center_y = (bb[1] + bb[3]) / 2;
                const diff_size = new Vector2();
                if (is_down) {
                    if (dir[0] > 0 || dir[1] > 0) {
                        if (dir[0] > 0) {
                            diff_size.x = delta.x;
                            if (cp.x < center_x) {
                                diff_size.x = - delta.x;
                            }
                        }
                        if (dir[1] > 0) {
                            diff_size.y = -delta.y;
                            if (cp.y > center_y) {
                                diff_size.y = delta.y;
                            }
                        }
                        const slice = mesh.get_slice();
                        slice.x -= diff_size.x;
                        slice.y -= diff_size.y;
                        if (slice.x < 0) slice.x = 0;
                        if (slice.y < 0) slice.y = 0;
                        mesh.set_slice(slice.x, slice.y);
                        is_changed_slice = true;
                    }
                }
            }
        }
        set_bb_visible(true);
        if (selected_list.length != 1)
            debug_center.visible = false;
        draw_anchor_point();
        if (selected_list.length == 0)
            set_bb_visible(false);
    }

    function get_parent_bb(mesh: IBaseMeshAndThree) {
        if (mesh.parent == null) return [0, 0, 0, 0];
        if (mesh.parent instanceof Scene) {
            return [0, 0, 540, -960];
        }
        else if (is_base_mesh(mesh.parent)) {
            const parent = mesh.parent as IBaseMeshAndThree;
            return parent.get_bounds();
        }
        return [0, 0, 0, 0];
    }

    function draw_anchor_point(is_set_pos = false) {
        if (selected_list.length != 1)
            return;
        if (!is_supported_anchor())
            return;
        const mesh = selected_list[0];
        const wp = new Vector3();
        mesh.getWorldPosition(wp);
        const bb_limit = get_parent_bb(mesh);
        if (is_set_pos) {
            const cp = Camera.screen_to_world(pointer.x, pointer.y);
            if (cp.x < bb_limit[0]) cp.x = bb_limit[0];
            if (cp.x > bb_limit[2]) cp.x = bb_limit[2];
            if (cp.y > bb_limit[1]) cp.y = bb_limit[1];
            if (cp.y < bb_limit[3]) cp.y = bb_limit[3];
            anchor_mesh.position.x = cp.x;
            anchor_mesh.position.y = cp.y;
            const size_x = bb_limit[2] - bb_limit[0];
            const size_y = bb_limit[1] - bb_limit[3];
            const ax = (cp.x - bb_limit[0]) / size_x;
            const ay = (cp.y - bb_limit[3]) / size_y;
            is_changed_anchor = true;
            mesh.set_anchor(ax, ay);
            //log(ax, ay);
        }
        else {
            const anchor = mesh.get_anchor();
            if (anchor.x == -1 || anchor.y == -1) {
                anchor_mesh.position.x = wp.x;
                anchor_mesh.position.y = wp.y;
                return;
            }
            else {
                const target = new Vector2();
                const size_x = bb_limit[2] - bb_limit[0];
                const size_y = bb_limit[1] - bb_limit[3];
                target.x = anchor.x * size_x + bb_limit[0];
                target.y = anchor.y * size_y + bb_limit[3];
                anchor_mesh.position.x = target.x;
                anchor_mesh.position.y = target.y;
            }
        }

    }

    function set_bb_visible(visible: boolean) {
        bb_points.forEach(p => p.visible = visible);
        debug_center.visible = visible;
    }


    function set_pivot_visible(visible: boolean) {
        if (visible && selected_list.length != 1)
            return;
        if (visible && !is_supported_pivot())
            return;
        anchor_mesh.visible = visible;
        pivot_points.forEach(p => p.visible = visible);
        //anchor_mesh.visible = visible;
    }

    function set_slice_visible(visible: boolean) {
        slice_box.visible = visible;
        slice_box_range.visible = visible;
    }

    function detach() {
        selected_list = [];
        set_bb_visible(false);
        set_pivot_visible(false);
        set_slice_visible(false);
        document.body.style.cursor = 'default';
    }

    function set_selected_list(list: IBaseMeshAndThree[]) {
        if (!is_active) return;
        selected_list = list;
        draw();
    }

    function set_active(val: boolean) {
        is_active = val;
        if (!val) {
            set_bb_visible(false);
            set_pivot_visible(false);
            set_slice_visible(false);
        }
    }

    function draw() {
        if (!is_active) return;
        draw_debug_bb(get_bounds_from_list());
    }

    function is_supported_pivot() {
        if (selected_list.length > 0)
            return (selected_list[0].type == IObjectTypes.GUI_BOX || selected_list[0].type == IObjectTypes.GUI_TEXT);
        else
            return false;
    }

    function is_supported_anchor() {
        return is_supported_pivot();
    }

    function is_supported_size() {
        for (let i = 0; i < selected_list.length; i++) {
            const it = selected_list[i];
            if (![IObjectTypes.SLICE9_PLANE, IObjectTypes.GUI_TEXT, IObjectTypes.GUI_BOX, IObjectTypes.GO_SPRITE_COMPONENT, IObjectTypes.GO_LABEL_COMPONENT].includes(it.type))
                return false;
        }
        return true;
    }

    init();
    return { set_selected_list, detach, set_active, draw };
}