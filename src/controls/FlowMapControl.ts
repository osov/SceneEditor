import { RepeatWrapping, ShaderMaterial, Texture, Vector2 } from "three";
import { IBaseMeshAndThree, IObjectTypes } from "../render_engine/types";
import { shader } from "../render_engine/objects/slice9";
import { CreateDrawCanvas, get_hash_by_mesh, get_mesh_by_hash, get_raycast_point_uv, get_selected_one_mesh, IDrawCanvas } from "../inspectors/ui_utils";

declare global {
    const FlowMapControl: ReturnType<typeof FlowMapControlCreate>;
}

export function register_flow_map_control() {
    (window as any).FlowMapControl = FlowMapControlCreate();
}

interface FlowInfo {
    speed: number;
    size: number;
}

type FileData = { [id: string]: FlowInfo };



function FlowMapControlCreate() {

    const mesh_list: { [k: string]: { material: ShaderMaterial, draw_canvas: IDrawCanvas } } = {};
    const dir_path = '/flows/';
    const fp_path = 'shaders/water.fp';
    const vp_path = 'shaders/water.vp';
    let normals: Texture;
    let shader_fp = '';
    let shader_vp = '';
    const last_pos = new Vector2(0, 0);
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
                if (e.key == 'F' || e.key == 'А') {
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
                if (!Input.is_shift())
                    return;
                const key = get_hash_by_mesh(selected_mesh);
                if (!mesh_list[key])
                    return;
                const { draw_canvas, material } = mesh_list[key];
                const uv = get_raycast_point_uv(e.x, e.y, selected_mesh);
                if (uv) {
                    draw_canvas.draw_flow(uv.x, 1 - uv.y, 0, 0, 0.8);
                    material.uniforms.u_flowMap.value.needsUpdate = true;
                }
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
                //log("draw")
                const { draw_canvas, material } = mesh_list[key];
                const uv = get_raycast_point_uv(e.x, e.y, selected_mesh);
                if (uv) {
                    draw_canvas.draw_flow(uv.x, 1 - uv.y, e.x - last_pos.x, last_pos.y - e.y, 0.8);
                    material.uniforms.u_flowMap.value.needsUpdate = true;
                }
                last_pos.set(e.x, e.y);
            }
        });
    }

    async function load_saved() {
        const data = await load_data();
        for (const id in data) {
            const flow_info = data[id];
            const mesh = get_mesh_by_hash(id);
            if (mesh) {
                await activate(mesh);
                const { draw_canvas, material } = mesh_list[id];
                const texture_data = ResourceManager.get_texture(id);
                draw_canvas.loadTexture(texture_data.texture, () => material.uniforms.u_flowMap.value.needsUpdate = true);
            }
            else {
               //Log.error('[Карта потока] меш не найден:' + id);
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
                    const { material, draw_canvas } = mesh_list[key];
                    material.fragmentShader = shader_fp;
                    material.vertexShader = shader_vp;
                    material.needsUpdate = true;
                }
            }
        });
        normals = ResourceManager.get_texture('waternormals').texture;
        normals.wrapS = normals.wrapT = RepeatWrapping;
    }

    async function create_shader(mesh: IBaseMeshAndThree): Promise<[ShaderMaterial, IDrawCanvas]> {
        const draw_canvas = CreateDrawCanvas(256, 256, 40, 'rgb(128, 128, 0)');
        const flow = new Texture(draw_canvas.getCanvas());
        flow.needsUpdate = true;

        const mat: ShaderMaterial = new ShaderMaterial({
            uniforms: {
                u_texture: { value: null },
                u_normal: { value: normals },
                u_flowMap: { value: flow },
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
        return [mat, draw_canvas];
    }


    async function activate(mesh: IBaseMeshAndThree) {
        const key = get_hash_by_mesh(mesh);
        selected_mesh = mesh;
        if (mesh_list[key])
            return;
        const [material, draw_canvas] = await create_shader(mesh);
        mesh_list[key] = { material, draw_canvas };
        //log('activated flow', key)
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
        await ClientAPI.save_data(dir_path+'data.txt', JSON.stringify(flow_data));
        await ClientAPI.remove(dir_path + key + '.png');
        log('deactivated flow', key)
    }

    async function save_map(mesh: IBaseMeshAndThree) {
        const key = get_hash_by_mesh(mesh);
        if (!mesh_list[key])
            return;
        const { draw_canvas } = mesh_list[key];
        const image = draw_canvas.getCanvas();
        const imageData = image.toDataURL();
        const answer = await AssetControl.save_base64_img(dir_path + key + '.png', imageData);
        if (answer.result == 1) {
            const flow_data = await load_data();
            flow_data[key] = { speed: 1.0, size: 1.0 };
            await ClientAPI.save_data(dir_path+'data.txt', JSON.stringify(flow_data));
            Popups.toast.success('Карта потока сохранена:' + key);
        }
        else
            Popups.toast.error('Ошибка сохранения карты потока:' + key);
    }


    return { init, load_shader, load_saved }
}

