import { ArrowHelper, CircleGeometry, DoubleSide, Mesh, MeshBasicMaterial, RingGeometry, SphereGeometry, Vector3 } from "three";
import { format_list_without_children } from "../render_engine/helpers/utils";
import { HistoryData } from "./HistoryControl";

declare global {
    const ViewControl: ReturnType<typeof ViewControlCreate>;
}

export function register_view_control() {
    (window as any).ViewControl = ViewControlCreate();
}

function ViewControlCreate() {
    let copy_mesh_list: any[] = [];


    function init() {
        //const geometry = new RingGeometry(4.5, 5, 12);
        //const material = new MeshBasicMaterial({ color: 0xffff00, side: DoubleSide });
        //const mesh = new Mesh(geometry, material); 
        //mesh.position.set(300, -200, 49);
        //mesh.scale.setScalar(5)
        //RenderEngine.scene.add(mesh);

        EventBus.on('SYS_VIEW_INPUT_KEY_UP', (e) => {
            if (Input.is_control() && (e.key == 'c' || e.key == 'с')) {
                const list = format_list_without_children(SelectControl.get_selected_list());
                if (list.length == 0) return;
                copy_mesh_list = [];
                for (let i = 0; i < list.length; i++) {
                    copy_mesh_list.push(SceneManager.serialize_mesh(list[i]));
                }
                //log('copy_mesh_list',copy_mesh_list);
            }
            if (Input.is_control() && (e.key == 'v' || e.key == 'м')) {
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
                SelectControl.set_selected_list(mesh_list);
            }
            if (e.key == 'Delete') {
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

        });
    }

    init();
    return {};
}