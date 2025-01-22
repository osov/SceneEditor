import { Intersection, Object3D, Object3DEventMap, Vector2, Vector3 } from "three";
import { IBaseMeshDataAndThree } from "../render_engine/types";

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
    let is_down = false;

    function init() {

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
            const len = click_point.clone().sub(pointer).length();
            if (len > 0.001)
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
        })
        EventBus.on('SYS_UNSELECTED_MESH', () => {
            selected = null;
        })


    }

    function set_selected(tmp: Intersection<Object3D<Object3DEventMap>>[]) {
        if (tmp.length == 0)
            return EventBus.trigger('SYS_UNSELECTED_MESH');
        const list: IBaseMeshDataAndThree[] = [];
        for (let i = 0; i < tmp.length; i++) {
            const it = tmp[i];
            if ((it.object as any).is_base_mesh) {
                list.push(it.object as any as IBaseMeshDataAndThree);
            }
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


    init();
    return {};
}