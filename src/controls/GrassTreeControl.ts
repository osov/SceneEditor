import { Vector2 } from "three";
import { Slice9Mesh } from "../render_engine/objects/slice9";
import { filter_intersect_list } from "../render_engine/helpers/utils";
import { createGrassManager } from "../utils/grass_manager";
import { get_selected_one_mesh, get_hash_by_mesh, get_selected_one_slice9 } from "../inspectors/ui_utils";
import { IObjectTypes } from "@editor/render_engine/types";

declare global {
    const GrassTreeControl: ReturnType<typeof GrassTreeControlCreate>;
}

export function register_grass_tree_control() {
    (window as any).GrassTreeControl = GrassTreeControlCreate();
}

function GrassTreeControlCreate() {
    const gm = createGrassManager();
    const mesh_list: { [k: string]: boolean } = {};
    let selected_mesh: Slice9Mesh | undefined;

    function init() {
        EventBus.on('SYS_VIEW_INPUT_KEY_DOWN', (e) => {
            if (Input.is_shift()) {
                if (e.key == 'R' || e.key == 'К') {
                    const mesh = get_selected_one_slice9();
                    if (mesh)
                        activate(mesh);
                }
                else if (e.key == 'G' || e.key == 'П') {
                    if (selected_mesh)
                        deactivate(selected_mesh);
                }
            }
        });

        EventBus.on('SYS_SELECTED_MESH_LIST', (e) => {
            if (Input.is_shift())
                return;
            selected_mesh = get_selected_one_slice9();
        });

        let is_pointer_down = false;
        EventBus.on('SYS_INPUT_POINTER_DOWN', (e) => {
            if (e.button == 0) {
                if (!selected_mesh)
                    return;
                is_pointer_down = true;
            }
        });

        EventBus.on('SYS_INPUT_POINTER_UP', (e) => {
            if (e.button == 0)
                is_pointer_down = false;
        });

        EventBus.on('SYS_INPUT_POINTER_MOVE', (e) => {
            if (Input.is_shift()) {
                const tmp = filter_intersect_list(RenderEngine.raycast_scene(new Vector2(e.x, e.y)));
                const list = tmp.filter((m) => (['Flowers_1', 'Flowers_2', 'Flowers_3', 'Flowers_4', 'Daisies_1', 'Daisies'].includes(m.get_texture()[0])));
                for (const mesh of list) {
                    gm.activate(mesh as any);
                }
            }

            if (Input.is_shift() && is_pointer_down) {
                if (!selected_mesh)
                    return;
                const key = get_hash_by_mesh(selected_mesh);
                if (!mesh_list[key])
                    return;
            }
        });
        EventBus.on('SYS_ON_UPDATE', (e) => gm.update(e.dt));

    }

    async function activate(mesh: Slice9Mesh) {
        const key = get_hash_by_mesh(mesh);
        selected_mesh = mesh;
        if (mesh_list[key])
            return;
        const tex_atlas = mesh.get_texture();
        mesh.set_material('tree');
        mesh.set_texture(tex_atlas[0], tex_atlas[1]);
        mesh_list[key] = true;
        //log('activated', key)
    }

    async function deactivate(mesh: Slice9Mesh) {
        const key = get_hash_by_mesh(mesh);
        if (!mesh_list[key])
            return;
        const tex_atlas = mesh.get_texture();
        mesh.set_material('slice9');
        mesh.set_texture(tex_atlas[0], tex_atlas[1]);
        selected_mesh = undefined;
        delete mesh_list[key];
        //log('deactivated', key)
    }

    return { init }
}


