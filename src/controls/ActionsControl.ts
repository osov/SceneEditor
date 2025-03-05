import { format_list_without_children } from "../render_engine/helpers/utils";
import { HistoryData } from "./HistoryControl";
import { IObjectTypes } from '../render_engine/types';
import { TreeItem } from "./TreeControl";

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
    refresh,
    download,
    new_folder,
    material_base,
    new_particles,
}

function ActionsControlCreate() {
    let copy_mesh_list: any[] = [];
    let is_cut: boolean = false;

    function cut() {
        copy();
        if (copy_mesh_list.length > 0) {
            TreeControl.setCutList();
            is_cut = true;
        }
    }

    function copy() {
        const list = format_list_without_children(SelectControl.get_selected_list());
        if (list.length == 0) return;
        copy_mesh_list = [];
        for (let i = 0; i < list.length; i++) {
            copy_mesh_list.push(SceneManager.serialize_mesh(list[i]));
        }
        
        if (copy_mesh_list.length > 0) TreeControl.setIsCopied();ControlManager.get_tree_graph()
    }

    function paste(asChild: boolean = false) {
        if (copy_mesh_list.length == 0) return;
        const selected = SelectControl.get_selected_list();
        let target: any = selected.length == 1 ? selected[0].parent : RenderEngine.scene;

        if(asChild && selected.length == 1) target = selected[0];

        if (is_cut) {
            const id_mlist: number[] = [];
            copy_mesh_list.forEach(i => id_mlist.push(i.id));
            TreeControl.setCutList(true);
            is_cut = false;
            copy_mesh_list.length = 0;
            TreeControl.setIsCopied(false);
            EventBus.trigger("SYS_GRAPH_MOVED_TO", { pid: target.mesh_data?.id || -1, next_id: -1, id_mesh_list: id_mlist });
            return;
        }

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
        setUniqueNameMeshList(ControlManager.get_tree_graph());

        HistoryControl.add('MESH_DELETE', mesh_ids);
        SelectControl.set_selected_list(mesh_list);
    }

    function duplication() {
        copy();
        paste();
        TreeControl.setIsCopied(false);
        copy_mesh_list = [];
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

    function setUniqueNameMeshList(list: TreeItem[]): void {
        if (!list.length) return;

        const namesMap: { [key: string]: number } = {};

        list.forEach(item => {
            const match = item.name.match(/^(.+?)\s*\(\d+\)$/);
            const baseName = match ? match[1] : item.name;

            if (namesMap[baseName]) {
                namesMap[baseName]++;
                const mesh = SceneManager.get_mesh_by_id(item.id);
                if (mesh) mesh.name = baseName + ` (${namesMap[baseName] - 1})`;
            } else {
                namesMap[baseName] = 1;
            }
        });
    }

    return { cut, copy, paste, duplication, remove, add_gui_box };
}