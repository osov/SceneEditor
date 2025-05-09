import { IBaseMeshAndThree } from "../render_engine/types";
import { get_selected_one_mesh, get_hash_by_mesh, get_mesh_by_hash } from "../inspectors/ui_utils";
import { Slice9Mesh } from "../render_engine/objects/slice9";
import { Vector2 } from "three";
import { filter_intersect_list } from "../render_engine/helpers/utils";
import { createGrassManager } from "../utils/grass_manager";

declare global {
    const GrassTreeControl: ReturnType<typeof GrassTreeControlCreate>;
}

export function register_grass_tree_control() {
    (window as any).GrassTreeControl = GrassTreeControlCreate();
}

interface GrassTreeInfo {
    u_amplitude: number;
    u_frequency: number;
    u_add_strength: number;
    u_inv_strength: number;
}

type FileData = { [id: string]: GrassTreeInfo };



function GrassTreeControlCreate() {
    const gm = createGrassManager();
    const mesh_list: { [k: string]: boolean } = {};
    const dir_path = '/tree/';
    let selected_mesh: Slice9Mesh | undefined;

    async function load_data() {
        const data = await ClientAPI.get_data(dir_path + 'data.txt');
        let flows: FileData = {};
        if (data.result == 1 && data.data)
            flows = JSON.parse(data.data) as FileData;
        return flows;
    }

    function init() {
        EventBus.on('SYS_VIEW_INPUT_KEY_DOWN', (e) => {
            if (Input.is_shift()) {
                if (e.key == 'R' || e.key == 'К') {
                    const mesh = get_selected_one_mesh();
                    if (mesh)
                        activate(mesh);
                }
                else if (e.key == 'G' || e.key == 'П') {
                    if (selected_mesh)
                        deactivate(selected_mesh);
                }
                else if (e.key == 'H' || e.key == 'Р') {
                    if (selected_mesh)
                        save_map(selected_mesh);
                }
            }
        });

        EventBus.on('SYS_SELECTED_MESH_LIST', (e) => {
            if (Input.is_shift())
                return;
            selected_mesh = get_selected_one_mesh();
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
                const list = tmp.filter((m) => (['Flowers_1', 'Flowers_2', 'Flowers_3', 'Flowers_4'].includes(m.get_texture()[0])));
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

    async function load_saved() {
        const data = await load_data();
        for (const id in data) {
            const info = data[id];
            const mesh = get_mesh_by_hash(id);
            if (mesh) {
                await activate(mesh);
                const material = mesh.material;
                for (const k in info) {
                    if (material.uniforms[k] && !['u_time'].includes(k))
                        ResourceManager.set_material_uniform_for_mesh(mesh, k, info[k as keyof GrassTreeInfo]);
                }
            }
            else {
                //Log.error('[Карта дерева] меш не найден:' + id);
            }
        }
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
        // save data
        const flow_data = await load_data();
        delete flow_data[key];
        await ClientAPI.save_data(dir_path + 'data.txt', JSON.stringify(flow_data));
        //log('deactivated', key)
    }

    async function save_map(mesh: Slice9Mesh) {
        const key = get_hash_by_mesh(mesh);
        if (!mesh_list[key])
            return;
        const mat = mesh.material;
        if (mat.name != 'tree')
            return;
        const data = await load_data();
        (data as any)[key] = {  };
        for (const k in mesh.material.uniforms) {
            if (typeof mesh.material.uniforms[k as keyof GrassTreeInfo].value == 'number' && !['u_time'].includes(k))
                (data[key] as any)[k] = mesh.material.uniforms[k].value as number;
        }
        await ClientAPI.save_data(dir_path + 'data.txt', JSON.stringify(data));
        Popups.toast.success('Карта дерева сохранена:' + key);
    }


    return { init, load_saved }
}


