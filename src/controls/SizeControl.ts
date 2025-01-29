import { Mesh, SphereGeometry, MeshBasicMaterial, Vector3, Vector2, CircleGeometry } from "three";
import { IBaseMeshDataAndThree, PivotX, PivotY } from "../render_engine/types";
import { PositionEventData, SizeEventData } from "./types";

declare global {
    const SizeControl: ReturnType<typeof SizeControlCreate>;
}

export function register_size_control() {
    (window as any).SizeControl = SizeControlCreate();
}

function SizeControlCreate() {
    const scene = RenderEngine.scene;
    let debug_center: Mesh;
    const bb_points: Mesh[] = [];
    const pivot_points: Mesh[] = [];
    const pointer = new Vector2();
    const click_point = new Vector2();
    const prev_point = new Vector2();
    let click_pos = new Vector3();
    let offset_move = 0;
    let selected_list: IBaseMeshDataAndThree[] = [];
    let is_down = false;
    let is_active = false;
    let old_size: SizeEventData[] = [];
    let old_pos: PositionEventData[] = [];
    let is_changed_size = false;
    let is_changed_pos = false;
    const dir = [0, 0];
    const range = 5;

    function init() {
        const geometry = new SphereGeometry(8, 4, 2);
        const material = new MeshBasicMaterial({ color: 0xffff00 });
        for (let i = 0; i < 4; i++) {
            const sphere = new Mesh(geometry, material);
            sphere.visible = false;
            scene.add(sphere)
            bb_points.push(sphere);
        }
        for (let i = 0; i < 9; i++) {
            const material = new MeshBasicMaterial({ color: 0xff0000 });
            const geometry = new CircleGeometry(7, 4);
            const mesh = new Mesh(geometry, material);
            mesh.visible = false;
            scene.add(mesh)
            pivot_points.push(mesh);
        }

        EventBus.on('SYS_VIEW_INPUT_KEY_DOWN', (e) => {
            if (!is_active) return;
            if (Input.is_shift())
                set_pivot_visible(true);
        })

        EventBus.on('SYS_VIEW_INPUT_KEY_UP', (e) => {
            if (!is_active) return;
            if (!Input.is_shift())
                set_pivot_visible(false);
        })

        EventBus.on('SYS_INPUT_POINTER_UP', (e) => {
            if (!is_active) return;
            if (e.button != 0)
                return;
            for (let i = 0; i < pivot_points.length; i++) {
                const pp = pivot_points[i];
                if (RenderEngine.is_intersected_mesh(new Vector2(e.x, e.y), pp))
                    log('pp', i);

            }
        })

        debug_center = new Mesh(geometry, new MeshBasicMaterial({ color: 0xff0000 }));
        debug_center.visible = false;
        debug_center.scale.setScalar(0.5)
        scene.add(debug_center);


        EventBus.on('SYS_INPUT_POINTER_DOWN', (e) => {
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
                old_pos.push({ id_mesh: m.mesh_data.id, position: m.position.clone() });
            }
            old_size = [];
            is_changed_size = false;
            for (let i = 0; i < selected_list.length; i++) {
                const m = selected_list[i];
                old_size.push({ id_mesh: m.mesh_data.id, size: m.get_size(), position: m.position.clone() });
            }
        });

        EventBus.on('SYS_INPUT_POINTER_UP', (e) => {
            if (!is_active) return;
            if (e.button != 0)
                return;
            is_down = false;
            if (is_changed_pos)
                HistoryControl.add('MESH_TRANSLATE', old_pos);
            if (is_changed_size)
                HistoryControl.add('MESH_SIZE', old_size);

        });

        EventBus.on('SYS_INPUT_POINTER_MOVE', (event) => {
            if (!is_active) return;
            if (Input.is_shift())
                return;
            prev_point.set(pointer.x, pointer.y);
            pointer.x = event.x;
            pointer.y = event.y;
            if (selected_list.length == 0)
                return;
            const wp = Camera.screen_to_world(pointer.x, pointer.y);
            const bounds = get_bounds_from_list();
            if (!is_down) {
                document.body.style.cursor = 'default';
                dir[0] = 0; dir[1] = 0;
                if (wp.x > bounds[0] - range && wp.x < bounds[2] + range && wp.y > bounds[3] - range && wp.y < bounds[1] + range) {
                    if (Math.abs(bounds[0] - wp.x) < range) {
                        document.body.style.cursor = 'e-resize';
                        dir[0] = 1;
                    }
                    if (Math.abs(bounds[2] - wp.x) < range) {
                        document.body.style.cursor = 'e-resize';
                        dir[0] = 1;
                    }
                    if (Math.abs(bounds[1] - wp.y) < range) {
                        document.body.style.cursor = 'n-resize';
                        dir[1] = 1;
                    }
                    if (Math.abs(bounds[3] - wp.y) < range) {
                        document.body.style.cursor = 'n-resize';
                        dir[1] = 1;
                    }
                    if (Math.abs(bounds[0] - wp.x) < range && Math.abs(bounds[1] - wp.y) < range) {
                        document.body.style.cursor = 'nw-resize';
                        dir[0] = 1;
                        dir[1] = 1;
                    }
                    if (Math.abs(bounds[0] - wp.x) < range && Math.abs(bounds[3] - wp.y) < range) {
                        document.body.style.cursor = 'ne-resize';
                        dir[0] = 1;
                        dir[1] = 1;
                    }
                    if (Math.abs(bounds[2] - wp.x) < range && Math.abs(bounds[1] - wp.y) < range) {
                        document.body.style.cursor = 'sw-resize';
                        dir[0] = 1;
                        dir[1] = 1;
                    }
                    if (Math.abs(bounds[2] - wp.x) < range && Math.abs(bounds[3] - wp.y) < range) {
                        document.body.style.cursor = 'se-resize';
                        dir[0] = 1;
                        dir[1] = 1;
                    }
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
                        const lp = selected_go.parent!.worldToLocal(new Vector3(old_pos.x + diff_pos.x, old_pos.y + diff_pos.y, 0));
                        selected_go.position.x = lp.x;
                        selected_go.position.y = lp.y;
                        is_changed_size = true;
                    }
                }
                if (dir[0] == 0 && dir[1] == 0) {
                    // если маленькое смещение и при этом не выделен никакой меш
                    if (offset_move < 10) {
                        let is_select = false;
                        for (let i = 0; i < selected_list.length; i++) {
                            const selected_go = selected_list[i];
                            if (RenderEngine.is_intersected_mesh(pointer, selected_go)) {
                                is_select = true;
                                break;
                            }
                        }
                        if (!is_select) {
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
                        const lp = selected_go.parent!.worldToLocal(new Vector3(old_pos.x + delta.x * ws.x, old_pos.y + delta.y * ws.y, old_pos.z));
                        selected_go.position.copy(lp);
                        is_changed_pos = true;
                    }
                }
                draw_debug_bb(bounds);
            }
        });
    }

    // todo
    function pivot_index_to_pivot(id:number):Vector2{
        return new Vector2(0,0);
    }

    function pivot_to_index(pivot:Vector2):number{
        if (pivot.x == PivotX.CENTER && pivot.y == PivotY.CENTER)
            return 4;
        return 0;
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

    function draw_debug_bb(bb: number[]) {
        const z = 49;
        // left top, right top, right bottom, left bottom
        bb_points[0].position.set(bb[0], bb[1], z);
        bb_points[1].position.set(bb[2], bb[1], z);
        bb_points[2].position.set(bb[2], bb[3], z);
        bb_points[3].position.set(bb[0], bb[3], z);

        for (let i = 0; i < pivot_points.length; i++) {
            const pp = pivot_points[i];
            (pp.material as MeshBasicMaterial).color.set(0xffffff);
        }
        const offset = 0;
        pivot_points[0].position.set(bb[0] + offset, bb[1] - offset, z);
        pivot_points[1].position.set(bb[2] - offset, bb[1] - offset, z);
        pivot_points[2].position.set(bb[2] - offset, bb[3] + offset, z);
        pivot_points[3].position.set(bb[0] + offset, bb[3] + offset, z);
        pivot_points[4].position.set(bb[0] + offset, bb[1] - Math.abs(bb[3] - bb[1]) / 2, z);
        pivot_points[5].position.set(bb[2] - offset, bb[1] - Math.abs(bb[3] - bb[1]) / 2, z);
        pivot_points[6].position.set(bb[0] + Math.abs(bb[2] - bb[0]) / 2, bb[1] - offset, z);
        pivot_points[7].position.set(bb[0] + Math.abs(bb[2] - bb[0]) / 2, bb[3] + offset, z);
        pivot_points[8].position.set(bb[0] + Math.abs(bb[2] - bb[0]) / 2, bb[1] - Math.abs(bb[3] - bb[1]) / 2, z);

        if (selected_list.length == 1) {
            const wp = new Vector3();
            selected_list[0].getWorldPosition(wp);
            debug_center.position.x = wp.x;
            debug_center.position.y = wp.y;
            const pivot = selected_list[0].get_pivot();
            (pivot_points[pivot_to_index(pivot)].material as MeshBasicMaterial).color.set(0xff0000);
        }
        set_bb_visible(true);
        if (selected_list.length != 1)
            debug_center.visible = false;
    }

    function set_bb_visible(visible: boolean) {
        bb_points.forEach(p => p.visible = visible);
        debug_center.visible = visible;
    }

    function set_pivot_visible(visible: boolean) {
        if (visible)
            document.body.style.cursor = 'default';
        pivot_points.forEach(p => p.visible = visible);
    }

    function detach() {
        selected_list = [];
        set_bb_visible(false);
        set_pivot_visible(false);
        document.body.style.cursor = 'default';
    }

    function set_selected_list(list: IBaseMeshDataAndThree[]) {
        if (!is_active) return;
        selected_list = list;
        draw_debug_bb(get_bounds_from_list());
        if (list.length == 0)
            return;
    }

    function set_active(val: boolean) {
        is_active = val;
        if (!val) {
            set_bb_visible(false);
            set_pivot_visible(false);
        }
    }

    init();
    return { set_selected_list, detach, set_active };
}