import { RepeatWrapping, Texture, Vector2 } from "three";
import { Slice9Mesh } from "../render_engine/objects/slice9";
import { CreateDrawCanvas, get_hash_by_mesh, get_mesh_by_hash, get_raycast_point_uv, get_selected_one_mesh, IDrawCanvas } from "../inspectors/ui_utils";

declare global {
    const FlowMapControl: ReturnType<typeof FlowMapControlCreate>;
}

export function register_flow_map_control() {
    (window as any).FlowMapControl = FlowMapControlCreate();
}

interface FlowInfo {
    material_name: string;
    // water
    u_speed: number;
    u_normal_scale: number
    u_normal_scale_2: number
    // water simple
    u_angle: number
    u_padding_left: number
    u_padding_right: number
    u_padding_top: number
    u_padding_bottom: number
}

type FileData = { [id: string]: FlowInfo };



function FlowMapControlCreate() {
    let normals: Texture | undefined;
    const mesh_list: { [k: string]: IDrawCanvas } = {};
    const dir_path = '/water/';
    const last_pos = new Vector2(0, 0);
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
                const draw_canvas = mesh_list[key];
                const material = selected_mesh.material;
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
                const draw_canvas = mesh_list[key];
                const material = selected_mesh.material;
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
        normals = ResourceManager.get_texture('waternormals').texture;
        normals.wrapS = normals.wrapT = RepeatWrapping;
        ResourceManager.set_material_uniform_for_original('water', 'u_normal', normals);
        ResourceManager.set_material_uniform_for_original('water_simple', 'u_normal', normals);
        ResourceManager.set_material_uniform_for_original('water_sea', 'u_normal', normals);
        const data = await load_data();
        for (const id in data) {
            const flow_info = data[id];
            const mesh = get_mesh_by_hash(id);
            if (mesh) {
                await activate(mesh, flow_info.material_name);
                const material = mesh.material;
                // flow map
                if (material.uniforms.u_flowMap) {
                    const draw_canvas = mesh_list[id];
                    const texture_data = ResourceManager.get_texture(id);
                    draw_canvas.loadTexture(texture_data.texture, () => {
                        // именно mesh.material, а не material, тк ниже set_material_uniform_for_mesh создает копию материала и нам нужно у актуального именно изменить
                        mesh.material.uniforms.u_flowMap.value.needsUpdate = true; 
                    });
                }
                for (const k in flow_info) {
                    if (material.uniforms[k] && !['u_time', 'u_flowMap'].includes(k) )
                        ResourceManager.set_material_uniform_for_mesh(mesh, k, flow_info[k as keyof FlowInfo]);
                }
            }
            else {
                //Log.error('[Карта потока] меш не найден:' + id);
            }
        }
    }


    async function setup_shader(mesh: Slice9Mesh, material_name = ''): Promise<IDrawCanvas | null> {
        if (material_name == '') {
            if (mesh.material.name.indexOf('water') == -1) {
                Popups.toast.error('Ошибка: задайте материал воды');
                return null;
            }
        }
        else {
            const tex_atlas = mesh.get_texture();
            mesh.set_material(material_name);
            mesh.set_texture(tex_atlas[0], tex_atlas[1]);
        }
        const draw_canvas = CreateDrawCanvas(256, 256, 40, 'rgb(128, 128, 0)');
        const flow = new Texture(draw_canvas.getCanvas());
        flow.needsUpdate = true;
        if (mesh.material.uniforms.u_flowMap)
            ResourceManager.set_material_uniform_for_mesh(mesh, 'u_flowMap', flow);
        return draw_canvas;
    }

    async function activate(mesh: Slice9Mesh, material_name = '') {
        const key = get_hash_by_mesh(mesh);
        selected_mesh = mesh;
        if (mesh_list[key])
            return;
        const draw_canvas = await setup_shader(mesh, material_name);
        if (!draw_canvas)
            return;
        mesh_list[key] = draw_canvas;
        log('activated water', key)
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
        // save flow data
        const flow_data = await load_data();
        delete flow_data[key];
        await ClientAPI.save_data(dir_path + 'data.txt', JSON.stringify(flow_data));
        await ClientAPI.remove(dir_path + key + '.png');
        log('deactivated water', key)
    }

    async function save_map(mesh: Slice9Mesh) {
        const key = get_hash_by_mesh(mesh);
        if (!mesh_list[key])
            return;
        const draw_canvas = mesh_list[key];
        const image = draw_canvas.getCanvas();
        const imageData = image.toDataURL();
        if (mesh.material.name == 'water') {
            const answer = await AssetControl.save_base64_img(dir_path + key + '.png', imageData);
            if (answer.result != 1)
                Popups.toast.error('Ошибка сохранения карты потока:' + key);
        }
        const data = await load_data();
        (data as any)[key] = { material_name: mesh.material.name };
        for (const k in mesh.material.uniforms) {
            if (typeof mesh.material.uniforms[k as keyof FlowInfo].value == 'number' && !['u_time'].includes(k))
                (data[key] as any)[k] = mesh.material.uniforms[k].value as number;
        }
        await ClientAPI.save_data(dir_path + 'data.txt', JSON.stringify(data));
        Popups.toast.success('Карта потока сохранена:' + key);

    }


    return { init, load_saved }
}

