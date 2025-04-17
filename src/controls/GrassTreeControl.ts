import { ShaderMaterial } from "three";
import { IBaseMeshAndThree } from "../render_engine/types";
import { shader } from "../render_engine/objects/slice9";
import { get_selected_one_mesh, get_hash_by_mesh, get_mesh_by_hash } from "../inspectors/ui_utils";

declare global {
    const GrassTreeControl: ReturnType<typeof GrassTreeControlCreate>;
}

export function register_grass_tree_control() {
    (window as any).GrassTreeControl = GrassTreeControlCreate();
}

interface GrassTreeInfo {
    speed: number;
    size: number;
}

type FileData = { [id: string]: GrassTreeInfo };



function GrassTreeControlCreate() {

    const mesh_list: { [k: string]: { material: ShaderMaterial } } = {};
    const dir_path = '/tree/';
    const fp_path = 'shaders/tree.fp';
    const vp_path = 'shaders/tree.vp';
    let shader_fp = '';
    let shader_vp = '';
    let selected_mesh: IBaseMeshAndThree | undefined;
    const now = System.now_with_ms();

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
            if (Input.is_shift() && is_pointer_down) {
                if (!selected_mesh)
                    return;
                const key = get_hash_by_mesh(selected_mesh);
                if (!mesh_list[key])
                    return;
            }
        });
    }

    async function load_saved() {
        const data = await load_data();
        for (const id in data) {
            const mesh = get_mesh_by_hash(id);
            if (mesh) {
                await activate(mesh);
            }
            else {
                //Log.error('[Карта дерева] меш не найден:' + id);
            }
        }
    }
    async function load_shader() {
        shader_fp = (await AssetControl.get_file_data(fp_path)).data!;
        shader_vp = (await AssetControl.get_file_data(vp_path)).data!;
        EventBus.on('SERVER_FILE_SYSTEM_EVENTS', async (e) => {
            let is_change = false;
            for (let i = 0; i < e.events.length; i++) {
                const ev = e.events[i];
                if (ev.path == fp_path || ev.path == vp_path)
                    is_change = true;
            }
            if (is_change) {
                shader_fp = (await AssetControl.get_file_data(fp_path)).data!;
                shader_vp = (await AssetControl.get_file_data(vp_path)).data!;
                for (const key in mesh_list) {
                    const { material } = mesh_list[key];
                    material.fragmentShader = shader_fp;
                    material.vertexShader = shader_vp;
                    material.needsUpdate = true;
                }
            }
        });
    }

    async function create_shader(mesh: IBaseMeshAndThree): Promise<[ShaderMaterial]> {

        const mat: ShaderMaterial = new ShaderMaterial({
            uniforms: {
                u_texture: { value: null },
                u_time: { value: 0.0 },
            },
            vertexShader: shader_vp,
            fragmentShader: shader_fp,
            transparent: true
        });
        EventBus.on('SYS_ON_UPDATE', (e) => mat.uniforms.u_time.value = System.now_with_ms() - now);
        const tex = mesh.get_texture();
        const texture = ResourceManager.get_texture(tex[0], tex[1]).texture;
        //texture.wrapS = texture.wrapT = RepeatWrapping;
        //texture.needsUpdate = true;
        mat.uniforms.u_texture.value = texture;


        (mesh as any).material = mat;
        return [mat];
    }

    async function activate(mesh: IBaseMeshAndThree) {
        const key = get_hash_by_mesh(mesh);
        selected_mesh = mesh;
        if (mesh_list[key])
            return;
        const [material] = await create_shader(mesh);
        mesh_list[key] = { material };
        log('activated flow', key)
    }

    async function deactivate(mesh: IBaseMeshAndThree) {
        const key = get_hash_by_mesh(mesh);
        if (!mesh_list[key])
            return;
        const mat = new ShaderMaterial({
            uniforms: {
                u_texture: { value: mesh_list[key].material.uniforms.u_texture.value },
                alpha: { value: 1.0 }
            },
            vertexShader: shader.vertexShader,
            fragmentShader: shader.fragmentShader,
            transparent: true
        });
        mat.defines['USE_TEXTURE'] = '';
        (selected_mesh as any).material = mat;
        selected_mesh = undefined;
        delete mesh_list[key];
        // save flow data
        const flow_data = await load_data();
        delete flow_data[key];
        await ClientAPI.save_data(dir_path + 'data.txt', JSON.stringify(flow_data));
        log('deactivated flow', key)
    }

    async function save_map(mesh: IBaseMeshAndThree) {
        const key = get_hash_by_mesh(mesh);
        if (!mesh_list[key])
            return;
        const flow_data = await load_data();
        flow_data[key] = { speed: 1.0, size: 1.0 };
        await ClientAPI.save_data(dir_path + 'data.txt', JSON.stringify(flow_data));
        Popups.toast.success('Карта дерева сохранена:' + key);
    }


    return { init, load_shader, load_saved }
}