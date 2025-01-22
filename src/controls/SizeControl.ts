import { Mesh, SphereGeometry, MeshBasicMaterial, Vector3, Vector2 } from "three";
import { IBaseMeshDataAndThree } from "../render_engine/types";

declare global {
    const SizeControl: ReturnType<typeof SizeControlModule>;
}

export function register_size_control() {
    (window as any).SizeControl = SizeControlModule();
}

function SizeControlModule() {
    const scene = RenderEngine.scene;
    const debug_poins: Mesh[] = [];
    const pointer = new Vector2();
    const click_point = new Vector2();
    const prev_point = new Vector2();
    let click_pos = new Vector3();
    let offset_move = 0;
    let selected_go: IBaseMeshDataAndThree | null = null;
    let is_down = false;
    const dir = [0, 0];
    const range = 5;

    function init() {
        for (let i = 0; i < 4; i++) {
            const geometry = new SphereGeometry(8, 4, 2);
            const material = new MeshBasicMaterial({ color: 0xffff00 });
            const sphere = new Mesh(geometry, material);
            sphere.visible = false;
            scene.add(sphere)
            debug_poins.push(sphere);
        }


        EventBus.on('SYS_INPUT_POINTER_DOWN', (e) => {
            if (e.button != 0)
                return;
            is_down = true;
            click_point.set(e.x, e.y)
            offset_move = 0;
            click_pos = Camera.screen_to_world(click_point.x, click_point.y);
        });

        EventBus.on('SYS_INPUT_POINTER_UP', (e) => {
            if (e.button != 0)
                return;
            is_down = false;
        });

        EventBus.on('SYS_INPUT_POINTER_MOVE', (event) => {
            prev_point.set(pointer.x, pointer.y);
            pointer.x = event.x;
            pointer.y = event.y;
            if (!selected_go)
                return;
            const wp = Camera.screen_to_world(pointer.x, pointer.y);
            const bounds = selected_go.get_bounds();

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
                offset_move =click_pos.clone().sub(wp).length();
                const cp = Camera.screen_to_world(prev_point.x, prev_point.y);
                const ws = new Vector3();
                selected_go.getWorldScale(ws);
                const delta = wp.clone().sub(cp).divide(ws);
                const old_pos = new Vector3();
                selected_go.getWorldPosition(old_pos);
                if (dir[0] != 0 || dir[1] != 0) {
                    const old_size = selected_go.get_size();
                    const center_x = (bounds[0] + bounds[2]) / 2;
                    const center_y = (bounds[1] + bounds[3]) / 2;

                    const new_size = new Vector2(old_size.x + delta.x, old_size.y - delta.y);
                    if (wp.x < center_x)
                        new_size.x = old_size.x - delta.x;
                    if (wp.y > center_y)
                        new_size.y = old_size.y + delta.y;
                    selected_go.set_size(dir[0] > 0 ? new_size.x : old_size.x, dir[1] > 0 ? new_size.y : old_size.y);
                    const lp = selected_go.parent!.worldToLocal(new Vector3(old_pos.x + delta.x * dir[0] * ws.x * 0.5, old_pos.y + delta.y * dir[1] * ws.y * 0.5, old_pos.z));
                    selected_go.position.copy(lp);
                }
                else {
                    if (offset_move < 10){
                        if (!RenderEngine.is_intersected_mesh(pointer, selected_go)){
                            EventBus.trigger('SYS_UNSELECTED_MESH');
                            return;
                        }
                    }
                    const lp = selected_go.parent!.worldToLocal(new Vector3(old_pos.x + delta.x * ws.x, old_pos.y + delta.y * ws.y, old_pos.z));
                    selected_go.position.copy(lp);
                }
                draw_debug_bb(selected_go.get_bounds());
            }
        });
    }

    function draw_debug_bb(bb: number[]) {
        const z = 49;
        debug_poins[0].position.set(bb[0], bb[1], z);
        debug_poins[1].position.set(bb[2], bb[1], z);
        debug_poins[2].position.set(bb[2], bb[3], z);
        debug_poins[3].position.set(bb[0], bb[3], z);
        set_debug_visible(true);
    }

    function set_debug_visible(visible: boolean) {
        debug_poins.forEach(p => p.visible = visible);
    }

    function set_mesh(mesh: IBaseMeshDataAndThree | null) {
        selected_go = mesh;
        if (selected_go) {
            draw_debug_bb(selected_go.get_bounds());
        }
        else
        set_debug_visible(false);
    }

    init();
    return { set_mesh };
}