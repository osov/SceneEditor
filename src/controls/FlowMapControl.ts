import { RepeatWrapping, Texture, Vector2 } from "three";
import { Slice9Mesh } from "../render_engine/objects/slice9";
import { CreateDrawCanvas, get_hash_by_mesh, get_mesh_by_hash, get_raycast_point_uv, get_selected_one_mesh, IDrawCanvas } from "../inspectors/ui_utils";

declare global {
    const FlowMapControl: ReturnType<typeof FlowMapControlCreate>;
}

export function register_flow_map_control() {
    (window as any).FlowMapControl = FlowMapControlCreate();
}

function FlowMapControlCreate() {
    const mesh_list: { [k: string]: IDrawCanvas } = {};
    const dir_path = '/data/water/';
    const last_pos = new Vector2(0, 0);
    let selected_mesh: Slice9Mesh | undefined;

    function init() {
        const tex = ResourceManager.get_texture('waternormals').texture;
        tex.wrapS = tex.wrapT = RepeatWrapping;
        tex.needsUpdate = true; 
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

        EventBus.on('SYS_SELECTED_MESH_LIST', async (_e) => {
            if (Input.is_shift())
                return;
            selected_mesh = get_selected_one_mesh();
            if (!selected_mesh)
                return;
            if (selected_mesh.material.name.includes('water'))
                await foo(selected_mesh);
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

    async function foo(mesh: Slice9Mesh) {
        await activate(mesh);
        const id = get_hash_by_mesh(mesh);
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
    }

    async function setup_draw_canvas(mesh: Slice9Mesh): Promise<IDrawCanvas | null> {
        const draw_canvas = CreateDrawCanvas(256, 256, 40, 'rgb(128, 128, 0)');
        const flow = new Texture(draw_canvas.getCanvas());
        flow.needsUpdate = true;
        if (mesh.material.uniforms.u_flowMap)
            ResourceManager.set_material_uniform_for_mesh(mesh, 'u_flowMap', flow);
        return draw_canvas;
    }

    async function activate(mesh: Slice9Mesh) {
        const key = get_hash_by_mesh(mesh);
        selected_mesh = mesh;
        if (mesh_list[key])
            return;
        const draw_canvas = await setup_draw_canvas(mesh);
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
        await ClientAPI.remove(dir_path + key + '.png');
        //log('deactivated water', key)
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
        Popups.toast.success('Карта потока сохранена:' + key);

    }

    return { init }
}