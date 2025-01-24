import { Intersection, Object3D, Object3DEventMap, Vector2, Vector3 } from "three";
import { IBaseMeshDataAndThree } from "../render_engine/types";
import { filter_list_base_mesh } from "../render_engine/helpers/utils";

declare global {
    const SelectControl: ReturnType<typeof SelectControlModule>;
}

export function register_select_control() {
    (window as any).SelectControl = SelectControlModule();
}

function SelectControlModule() {
    const pointer = new Vector2();
    const click_point = new Vector2();
    const prev_point = new Vector2();
    let selected: IBaseMeshDataAndThree | null = null;
    let selected_list: IBaseMeshDataAndThree[] = [];
    let is_down = false;
    let is_control = false;
    function init() {

        RenderEngine.renderer.domElement.addEventListener('keydown', (e) => {
            is_control = e.ctrlKey;
        });


        RenderEngine.renderer.domElement.addEventListener('keyup', (e) => {
            is_control = e.ctrlKey;
        });

        EventBus.on('SYS_INPUT_POINTER_DOWN', (e) => {
            if (e.button != 0)
                return;
            is_down = true;
            click_point.set(e.x, e.y);
        });

        EventBus.on('SYS_INPUT_POINTER_UP', (e) => {
            if (e.button != 0)
                return;
            is_down = false;
            prev_point.set(pointer.x, pointer.y);
            pointer.x = e.x;
            pointer.y = e.y;
            const old_pos = Camera.screen_to_world(click_point.x, click_point.y);
            const cur_pos = Camera.screen_to_world(pointer.x, pointer.y);
            const len = cur_pos.sub(old_pos).length();
            if (len > 5)
                return;
            const intersects = RenderEngine.raycast_scene(pointer);
            set_selected(intersects);
        });

        EventBus.on('SYS_INPUT_POINTER_MOVE', (event) => {
            prev_point.set(pointer.x, pointer.y);
            pointer.x = event.x;
            pointer.y = event.y;
        });


        EventBus.on('SYS_SELECTED_MESH', (e) => {
            (window as any).selected = e.mesh;
            if (is_control) {
                if (!is_selected(e.mesh))
                    selected_list.push(e.mesh);
                else {
                    const index = selected_list.indexOf(e.mesh);
                    selected_list.splice(index, 1);
                }
            }
            else {
                selected_list = [e.mesh];
            }
            EventBus.trigger('SYS_SELECTED_MESH_LIST', { list: selected_list });
        });

        EventBus.on('SYS_UNSELECTED_MESH', () => {
            selected = null;
            if (!is_control)
                selected_list = [];
        });
    }


    function is_selected(mesh: IBaseMeshDataAndThree) {
        for (let i = 0; i < selected_list.length; i++) {
            const m = selected_list[i];
            if (m.mesh_data.id == mesh.mesh_data.id)
                return true;
        }
        return false;
    }

    function set_selected(tmp: Intersection<Object3D<Object3DEventMap>>[]) {
        if (tmp.length == 0) {
            if (!is_control)
                EventBus.trigger('SYS_UNSELECTED_MESH');
            return;
        }
        let tmp_list = [];
        for (let i = 0; i < tmp.length; i++)
            tmp_list.push(tmp[i].object);
        const list = filter_list_base_mesh(tmp_list);
        if (list.length == 0) {
            if (!is_control)
                EventBus.trigger('SYS_UNSELECTED_MESH');
            return;
        }
        for (let i = 0; i < list.length; i++) {
            const it = list[i];
            // если еще ничего не выбрано то выбирается первый
            if (selected == null) {
                selected = it;
                EventBus.trigger('SYS_SELECTED_MESH', { mesh: selected });
                return;
            }
            // если уже выбрано то выбирается следующий
            if (it == selected) {
                let next_index = i + 1;
                if (next_index >= list.length)
                    next_index = 0;
                selected = list[next_index];
                EventBus.trigger('SYS_SELECTED_MESH', { mesh: selected });
                return;
            }
        }
        // ситуация когда что-то было выбрано, но в этом списке не оказалось
        selected = list[0];
        EventBus.trigger('SYS_SELECTED_MESH', { mesh: selected });
    }

    function get_selected_list() {
        return selected_list;
    }


    init();
    return { get_selected_list };
}