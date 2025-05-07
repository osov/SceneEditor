import { IBaseMeshAndThree } from "../render_engine/types";
import { get_selected_one_mesh, get_hash_by_mesh, get_mesh_by_hash } from "../inspectors/ui_utils";
import { Slice9Mesh } from "../render_engine/objects/slice9";
import { Vector2 } from "three";
import { filter_intersect_list } from "../render_engine/helpers/utils";

declare global {
    const GrassTreeControl: ReturnType<typeof GrassTreeControlCreate>;
}

export function register_grass_tree_control() {
    (window as any).GrassTreeControl = GrassTreeControlCreate();
}

interface GrassTreeInfo {
    u_amplitude: number;
    u_frequency: number;
}

type FileData = { [id: string]: GrassTreeInfo };



function GrassTreeControlCreate() {
    const gm = GrassManager();
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
            const mesh = get_mesh_by_hash(id);
            if (mesh) {
                await activate(mesh);
                ResourceManager.set_material_uniform_for_mesh(mesh, 'u_amplitude', data[id].u_amplitude);
                ResourceManager.set_material_uniform_for_mesh(mesh, 'u_frequency', data[id].u_frequency);
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
        log('activated', key)
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
        log('deactivated', key)
    }

    async function save_map(mesh: Slice9Mesh) {
        const key = get_hash_by_mesh(mesh);
        if (!mesh_list[key])
            return;
        const mat = mesh.material;
        if (mat.name != 'tree')
            return;
        const flow_data = await load_data();
        flow_data[key] = { u_amplitude: mat.uniforms.u_amplitude.value, u_frequency: mat.uniforms.u_frequency.value };
        await ClientAPI.save_data(dir_path + 'data.txt', JSON.stringify(flow_data));
        Popups.toast.success('Карта дерева сохранена:' + key);
    }


    return { init, load_saved }
}


interface GrassItem {
    added: number;
    amlitude: number;
    mesh: Slice9Mesh;
}

function GrassManager() {
    let active_list: GrassItem[] = [];
    const effect_time = 0.7;
    const speed = 5;
    const max_amplitude = 1;

    function update(dt: number) {
        const now = System.now_with_ms();
        for (let i = active_list.length - 1; i >= 0; i--) {
            const it = active_list[i];
            if (it.added + effect_time < now) {
                let val = it.amlitude - dt * speed;
                if (val < 0)
                    val = 0;
                it.amlitude = val;
                ResourceManager.set_material_uniform_for_mesh(it.mesh, 'u_amplitude', val);
                if (val == 0) {
                    deactivate(it.mesh, false);
                    active_list.splice(i, 1);
                }
            }
            else {
                let val =  it.amlitude + dt * speed;
                if (val > max_amplitude)
                    val = max_amplitude;
                if (val < max_amplitude) {
                    it.amlitude = val;
                    ResourceManager.set_material_uniform_for_mesh(it.mesh, 'u_amplitude', val);
                }
            }
        }
    }

    function is_actived(mesh: Slice9Mesh) {
        for (const it of active_list) {
            if (it.mesh == mesh) {
                return true;
            }
        }
        return false;
    }

    function activate(mesh: Slice9Mesh) {
        if (is_actived(mesh))
            return;
        const tex_atlas = mesh.get_texture();
        mesh.set_material('grass');
        mesh.set_texture(tex_atlas[0], tex_atlas[1]);
        ResourceManager.set_material_uniform_for_mesh(mesh, 'u_frequency', 3);
        ResourceManager.set_material_uniform_for_mesh(mesh, 'u_amplitude', 0);
        active_list.push({ mesh, added: System.now_with_ms(), amlitude: 0 });
    }

    function deactivate(mesh: Slice9Mesh, with_del = true) {
        if (!is_actived(mesh))
            return;
        const tex_atlas = mesh.get_texture();
        mesh.set_material('slice9');
        mesh.set_texture(tex_atlas[0], tex_atlas[1]);
        if (with_del) {
            for (let i = active_list.length - 1; i >= 0; i--) {
                const it = active_list[i];
                if (it.mesh == mesh) {
                    active_list.splice(i, 1);
                    break;
                }
            }
        }
    }





    return { update, activate,deactivate };
}