import { RepeatWrapping, ShaderMaterial, Texture, Vector2 } from "three";
import { IBaseMeshAndThree, IObjectTypes } from "../render_engine/types";
import { shader } from "../render_engine/objects/slice9";

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

    const tiles_info: { [k: string]: { material: ShaderMaterial, draw_canvas: IDrawCanvas } } = {};
    const flows_path = '/flows/data.txt';
    const water_fp_path = 'shaders/water.fp';
    const water_vp_path = 'shaders/water.vp';
    let normals: Texture;
    let shader_fp = '';
    let shader_vp = '';
    const last_pos = new Vector2(0, 0);
    let selected_mesh: IBaseMeshAndThree | undefined = undefined;

    function get_selected_mesh() {
        const selected_list = SelectControl.get_selected_list();
        if (selected_list.length != 1)
            return;
        const mesh = selected_list[0];
        if (mesh.type != IObjectTypes.GO_SPRITE_COMPONENT)
            return;
        return mesh;
    }

    function get_raycast_point(x: number, y: number, mesh: IBaseMeshAndThree) {
        const raycaster = RenderEngine.raycaster;
        const camera = RenderEngine.camera;
        raycaster.setFromCamera(new Vector2(x, y), camera);
        raycaster.layers.enable(RenderEngine.DC_LAYERS.RAYCAST_LAYER);
        const list = raycaster.intersectObject(mesh);
        if (last_pos.x == 0 && last_pos.y == 0)
            last_pos.set(x, y);
        if (list.length > 0)
            return list[0].uv!;
        else
            return null;
    }

    async function load_flow_data() {
        const data = await ClientAPI.get_data(flows_path);
        let flows: FileData = {};
        if (data.result == 1 && data.data)
            flows = JSON.parse(data.data) as FileData;
        return flows;
    }

    function find_mesh(key: string) {
        let m!: IBaseMeshAndThree;
        RenderEngine.scene.traverse((child) => {
            if (child.name == key)
                m = child as IBaseMeshAndThree;
            if (child.userData && child.userData.tile) {
                const k = getKey(child as IBaseMeshAndThree);
                if (k == key)
                    m = child as IBaseMeshAndThree;
            }
        });
        return m;
    }

    function init() {
        EventBus.on('SYS_VIEW_INPUT_KEY_DOWN', (e) => {
            if (Input.is_shift()) {
                if (e.key == 'F' || e.key == 'А') {
                    const mesh = get_selected_mesh();
                    if (mesh)
                        activate_flow(mesh);
                }
                else if (e.key == 'G' || e.key == 'П') {
                    if (selected_mesh)
                        deactivate_flow(selected_mesh);
                }
                else if (e.key == 'H' || e.key == 'Р') {
                    if (selected_mesh)
                        save_flow_map(selected_mesh);
                }
            }
        });

        EventBus.on('SYS_SELECTED_MESH_LIST', (e) => {
            if (Input.is_shift())
                return;
            selected_mesh = get_selected_mesh();
        });

        let is_pointer_down = false;
        EventBus.on('SYS_INPUT_POINTER_DOWN', (e) => {
            if (e.button == 0) {
                if (!selected_mesh)
                    return;
                is_pointer_down = true;
                if (!Input.is_shift())
                    return;
                const key = getKey(selected_mesh);
                if (!tiles_info[key])
                    return;
                const { draw_canvas, material } = tiles_info[key];
                const uv = get_raycast_point(e.x, e.y, selected_mesh);
                if (uv) {
                    draw_canvas.draw(uv.x, 1 - uv.y, 0, 0);
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
                const key = getKey(selected_mesh);
                if (!tiles_info[key])
                    return;
                //log("draw")
                const { draw_canvas, material } = tiles_info[key];
                const uv = get_raycast_point(e.x, e.y, selected_mesh);
                if (uv) {
                    draw_canvas.draw(uv.x, 1 - uv.y, e.x - last_pos.x, last_pos.y - e.y);
                    material.uniforms.u_flowMap.value.needsUpdate = true;
                }
                last_pos.set(e.x, e.y);
            }
        });
    }

    async function load_saved_flows() {
        const data = await load_flow_data();
        for (const id in data) {
            const flow_info = data[id];
            const mesh = find_mesh(id);
            if (mesh) {
                await activate_flow(mesh);
                const { draw_canvas, material } = tiles_info[id];
                const texture_data = ResourceManager.get_texture(id);
                draw_canvas.loadTexture(texture_data.texture, () => material.uniforms.u_flowMap.value.needsUpdate = true);
            }
            else {
                Popups.toast.error('Карта потока не найдена:' + id);
            }
        }
    }
    async function load_shader() {
        shader_fp = (await AssetControl.get_file_data(water_fp_path)).data!;
        shader_vp = (await AssetControl.get_file_data(water_vp_path)).data!;
        EventBus.on('SERVER_FILE_SYSTEM_EVENTS', async (e) => {
            let is_change = false;
            for (let i = 0; i < e.events.length; i++) {
                const ev = e.events[i];
                if (ev.path == water_fp_path || ev.path == water_vp_path)
                    is_change = true;
            }
            if (is_change) {
                shader_fp = (await AssetControl.get_file_data(water_fp_path)).data!;
                shader_vp = (await AssetControl.get_file_data(water_vp_path)).data!;
                for (const key in tiles_info) {
                    const { material, draw_canvas } = tiles_info[key];
                    material.fragmentShader = shader_fp;
                    material.vertexShader = shader_vp;
                    material.needsUpdate = true;
                }
            }
        });
        normals = ResourceManager.get_texture('waternormals').texture;
        normals.wrapS = normals.wrapT = RepeatWrapping;
    }

    async function create_water_shader(mesh: IBaseMeshAndThree): Promise<[ShaderMaterial, IDrawCanvas]> {
        const draw_canvas = CreateDrawCanvas(256);
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
        const now = System.now_with_ms();
        EventBus.on('SYS_ON_UPDATE', (e) => mat.uniforms.u_time.value = System.now_with_ms() - now);
        const tex = mesh.get_texture();
        const texture = ResourceManager.get_texture(tex[0], tex[1]).texture;
        //texture.wrapS = texture.wrapT = RepeatWrapping;
        //texture.needsUpdate = true;
        mat.uniforms.u_texture.value = texture;


        (mesh as any).material = mat;
        return [mat, draw_canvas];
    }


    function getKey(mesh: IBaseMeshAndThree) {
        let key = mesh.name;
        if (mesh.userData && mesh.userData.tile)
            key = mesh.userData.tile.x + '.' + mesh.userData.tile.y;
        return key;
    }


    async function activate_flow(mesh: IBaseMeshAndThree) {
        const key = getKey(mesh);
        selected_mesh = mesh;
        if (tiles_info[key])
            return;
        const [material, draw_canvas] = await create_water_shader(mesh);
        tiles_info[key] = { material, draw_canvas };
        log('activated flow', key)
    }

    async function deactivate_flow(mesh: IBaseMeshAndThree) {
        const key = getKey(mesh);
        if (!tiles_info[key])
            return;
        const mat = new ShaderMaterial({
            uniforms: {
                u_texture: { value: tiles_info[key].material.uniforms.u_texture.value },
                alpha: { value: 1.0 }
            },
            vertexShader: shader.vertexShader,
            fragmentShader: shader.fragmentShader,
            transparent: true
        });
        mat.defines['USE_TEXTURE'] = '';
        (selected_mesh as any).material = mat;
        selected_mesh = undefined;
        delete tiles_info[key];
        // save flow data
        const flow_data = await load_flow_data();
        delete flow_data[key];
        await ClientAPI.save_data(flows_path, JSON.stringify(flow_data));
        await ClientAPI.remove('/flows/' + key + '.png');
        log('deactivated flow', key)
    }

    async function save_flow_map(mesh: IBaseMeshAndThree) {
        const key = getKey(mesh);
        if (!tiles_info[key])
            return;
        const { draw_canvas } = tiles_info[key];
        const image = draw_canvas.getCanvas();
        const imageData = image.toDataURL();
        const answer = await AssetControl.save_base64_img('/flows/' + key + '.png', imageData);
        if (answer.result == 1) {
            const flow_data = await load_flow_data();
            flow_data[key] = { speed: 1.0, size: 1.0 };
            await ClientAPI.save_data(flows_path, JSON.stringify(flow_data));
            Popups.toast.success('Карта потока сохранена:' + key);
        }
        else
            Popups.toast.error('Ошибка сохранения карты потока:' + key);
    }


    return { init, load_shader, load_saved_flows }
}


function CreateDrawCanvas(canvas_size: number, brush_size = 40, flow_strength = 0.8) {
    const canvas = document.createElement("canvas");
    canvas.width = canvas_size;
    canvas.height = canvas_size;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "rgb(128, 128, 0)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    function draw(x: number, y: number, dx: number, dy: number) {
        x *= canvas_size;
        y *= canvas_size;
        let len = Math.sqrt(dx * dx + dy * dy);
        if (len > 0) {
            dx /= len;
            dy /= len;
        }

        let centerR = Math.floor((dx * flow_strength + 1) * 127.5);
        let centerG = Math.floor((dy * flow_strength + 1) * 127.5);
        let centerB = (dx == 0 && dy == 0) ? 0 : 128;
        let imageData = ctx.getImageData(x - brush_size, y - brush_size, brush_size * 2, brush_size * 2);
        let data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            let px = (i / 4) % (brush_size * 2);
            let py = Math.floor(i / 4 / (brush_size * 2));

            let dist = Math.sqrt((px - brush_size) ** 2 + (py - brush_size) ** 2) / brush_size;
            if (dist > 1) continue;

            let fade = 1 - dist; // Чем дальше от центра, тем меньше влияние

            let oldR = data[i];
            let oldG = data[i + 1];

            let newR = Math.floor(centerR * fade + oldR * (1 - fade));
            let newG = Math.floor(centerG * fade + oldG * (1 - fade));

            data[i] = newR;
            data[i + 1] = newG;
            data[i + 2] = centerB;
        }

        ctx.putImageData(imageData, x - brush_size, y - brush_size);
    }

    function loadTexture(texture: Texture, callback?: () => void) {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            if (callback) callback();
        };

        // Проверяем, есть ли источник изображения
        if (texture.image && texture.image.src) {
            img.src = texture.image.src;
        } else {
            console.warn("Текстура не содержит изображение или источник.");
        }
    }

    function getCanvas() {
        return canvas;
    }

    return { draw, getCanvas, loadTexture };
}

type IDrawCanvas = ReturnType<typeof CreateDrawCanvas>;
