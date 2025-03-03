import { format_list_without_children } from "../render_engine/helpers/utils";
import { HistoryData } from "./HistoryControl";
import { IObjectTypes } from '../render_engine/types';

declare global {
    const ActionsControl: ReturnType<typeof ActionsControlCreate>;
}

export function register_actions_control() {
    (window as any).ActionsControl = ActionsControlCreate();
}

export enum NodeAction {
    CTRL_X,
    CTRL_C,
    CTRL_V,
    CTRL_B,
    CTRL_D,
    rename,
    remove,
    add_gui_container,
    add_gui_box,
    add_gui_text,
    add_go_container,
    add_go_sprite_component,
    add_go_label_component,
    add_go_model_component,
}

function ActionsControlCreate() {
    let copy_mesh_list: any[] = [];

    function copy() {
        const list = format_list_without_children(SelectControl.get_selected_list());
        if (list.length == 0) return;
        copy_mesh_list = [];
        for (let i = 0; i < list.length; i++) {
            copy_mesh_list.push(SceneManager.serialize_mesh(list[i]));
        }
        log('copy_mesh_list',copy_mesh_list);
    }

    function paste() {
        if (copy_mesh_list.length == 0) return;
        const selected = SelectControl.get_selected_list();
        const target: any = selected.length == 1 ? selected[0].parent : RenderEngine.scene;
        const mesh_list = [];
        const mesh_ids = [];
        for (let i = 0; i < copy_mesh_list.length; i++) {
            const m = SceneManager.deserialize_mesh(copy_mesh_list[i], false, target);
            m.position.x += 5;
            m.position.y -= 5;
            target.add(m);
            mesh_ids.push({ id_mesh: m.mesh_data.id });
            mesh_list.push(m);
        }
        HistoryControl.add('MESH_DELETE', mesh_ids);
    }

    function remove() {
        const list = format_list_without_children(SelectControl.get_selected_list());
        if (list.length == 0) return;
        const mesh_data: HistoryData['MESH_ADD'][] = [];
        for (let i = 0; i < list.length; i++) {
            const m = list[i];
            mesh_data.push({ mesh: SceneManager.serialize_mesh(m), next_id: SceneManager.find_next_id_mesh(m) });
            SceneManager.remove(m.mesh_data.id);
        }
        HistoryControl.add('MESH_ADD', mesh_data);
        SelectControl.set_selected_list([]);
    }

    function add_gui_box(pid: number = -1) {
        //   const mesh = SceneManager.get_mesh_by_id(plane_1.id);
        const box = SceneManager.create(IObjectTypes.GUI_BOX, { width: 128, height: 32 });
        box.scale.setScalar(1);
        box.position.set(200, -200, 0);
        box.set_color('#0f0')
        box.set_texture('2');
        box.set_slice(8, 8);
        SceneManager.add(box, pid);
        HistoryControl.add('MESH_DELETE', [{id_mesh: box.mesh_data.id}]);
        SelectControl.set_selected_list([box]);
    }


    return { copy, paste, remove, add_gui_box };
}