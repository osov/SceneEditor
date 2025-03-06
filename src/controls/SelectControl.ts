// todo select https://threejs.org/examples/?q=box#misc_boxselection
import { Intersection, Object3D, Object3DEventMap, Vector2 } from "three";
import { IBaseEntityAndThree, IBaseMeshAndThree } from "../render_engine/types";
import { filter_list_base_mesh } from "../render_engine/helpers/utils";


declare global {
    const SelectControl: ReturnType<typeof SelectControlCreate>;
}

export function register_select_control() {
    (window as any).SelectControl = SelectControlCreate();
}

function SelectControlCreate() {
    const pointer = new Vector2();
    const click_point = new Vector2();
    const prev_point = new Vector2();
    let selected: IBaseMeshAndThree | null = null;
    let selected_list: IBaseMeshAndThree[] = [];
    function init() {

        EventBus.on('SYS_INPUT_POINTER_DOWN', (e) => {
            if (e.target != RenderEngine.renderer.domElement)
                return;
            if (e.button != 0)
                return;
            click_point.set(e.x, e.y);
        });

        EventBus.on('SYS_INPUT_POINTER_UP', (e) => {
            if (e.target != RenderEngine.renderer.domElement)
                return;
            if (e.button != 0)
                return;
            if (Input.is_shift())
                return;
            prev_point.set(pointer.x, pointer.y);
            pointer.x = e.x;
            pointer.y = e.y;
            const old_pos = Camera.screen_to_world(click_point.x, click_point.y);
            const cur_pos = Camera.screen_to_world(pointer.x, pointer.y);
            const len = cur_pos.sub(old_pos).length();
            if (len > 5)
                return;
            const intersects = RenderEngine.raycast_scene(pointer);
            set_selected_intersect(intersects);
        });

        EventBus.on('SYS_INPUT_POINTER_MOVE', (event) => {
            prev_point.set(pointer.x, pointer.y);
            pointer.x = event.x;
            pointer.y = event.y;
        });


        EventBus.on('SYS_SELECTED_MESH', (e) => {
            if (Input.is_control()) {
                if (TreeControl.isItPossibleToChoose(selected_list, e.mesh, true)) { // можно ли выбрать...
                    if (!is_selected(e.mesh))
                    selected_list.push(e.mesh);
                    else {
                        const index = selected_list.indexOf(e.mesh);
                        selected_list.splice(index, 1);
                    }
                }
            }
            else {
                selected_list = [e.mesh];
            }
            EventBus.trigger('SYS_SELECTED_MESH_LIST', { list: selected_list });
        });

        EventBus.on('SYS_UNSELECTED_MESH_LIST', () => {
            selected = null;
            if (!Input.is_control())
                selected_list = [];
        });
    }


    function is_selected(mesh: IBaseEntityAndThree) {
        for (let i = 0; i < selected_list.length; i++) {
            const m = selected_list[i];
            if (m.mesh_data.id == mesh.mesh_data.id)
                return true;
        }
        return false;
    }

    function set_selected_intersect(tmp: Intersection<Object3D<Object3DEventMap>>[]) {
        let tmp_list = [];
        for (let i = 0; i < tmp.length; i++)
            tmp_list.push(tmp[i].object);
        const list = filter_list_base_mesh(tmp_list);
        set_selected_list(list, false);
    }

    function set_selected_list(list: IBaseMeshAndThree[], clear_old = true) {
        if (clear_old) {
            selected_list = [];
        }
        if (list.length == 0) {
            if (!Input.is_control())
                EventBus.trigger('SYS_UNSELECTED_MESH_LIST');
            return;
        }
        let is_breaked = false;
        for (let i = 0; i < list.length; i++) {
            const it = list[i];
            // если еще ничего не выбрано то выбирается первый
            if (selected == null) {
                selected = it;
                if (!clear_old)
                    EventBus.trigger('SYS_SELECTED_MESH', { mesh: selected });
                is_breaked = true;
                break;
            }
            // если уже выбрано то выбирается следующий
            if (it == selected) {
                let next_index = i + 1;
                if (next_index >= list.length)
                    next_index = 0;
                selected = list[next_index];
                if (!clear_old)
                    EventBus.trigger('SYS_SELECTED_MESH', { mesh: selected });
                is_breaked = true;
                break;
            }
        }
        if (!is_breaked) {
            // ситуация когда что-то было выбрано, но в этом списке не оказалось
            selected = list[0];
            if (!clear_old)
                EventBus.trigger('SYS_SELECTED_MESH', { mesh: selected });
        }

        if (clear_old) {
            selected_list = list.slice(0);
            EventBus.trigger('SYS_SELECTED_MESH_LIST', { list: selected_list });
        }
    }

    function get_selected_list() {
        return selected_list;
    }


    init();
    return { get_selected_list, set_selected_list };
}