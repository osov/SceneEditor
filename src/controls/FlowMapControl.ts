import { LinearFilter, LinearMipMapLinearFilter, RepeatWrapping, ShaderMaterial, Texture, Vector2, Vector4 } from "three";
import { IBaseMeshAndThree, IObjectTypes } from "../render_engine/types";
import { shader } from "../render_engine/objects/slice9";

declare global {
    const FlowMapControl: ReturnType<typeof FlowMapControlCreate>;
}

export function register_flow_map_control() {
    (window as any).FlowMapControl = FlowMapControlCreate();
}

function FlowMapControlCreate() {

    const tiles_info: { [k: string]: { material: ShaderMaterial, draw_canvas: IDrawCanvas } } = {};
    const water_fp_path = 'shaders/water.fp';
    const water_vp_path = 'shaders/water.vp';
    let normals: Texture;
    let shader_fp = '';
    let shader_vp = '';
    const cycle = 0.15; // a cycle of a flow map phase
    const halfCycle = cycle * 0.5;
    const scale = 1;
    const flowSpeed = 0.03;
    const last_pos = new Vector2(0, 0);
    const config = new Vector4(0, halfCycle, halfCycle, scale);

    function init() {
        EventBus.on('SYS_VIEW_INPUT_KEY_DOWN', (e) => {
            if (Input.is_shift()) {
                if (e.key == 'F' || e.key == 'А')
                    activate_flow();
                else if (e.key == 'G' || e.key == 'П')
                    deactivate_flow();
            }
        });

        let is_pointer_down = false;
        EventBus.on('SYS_INPUT_POINTER_DOWN', (e) => {
            if (e.button == 0)
                is_pointer_down = true;
        });

        EventBus.on('SYS_INPUT_POINTER_UP', (e) => {
            if (e.button == 0)
                is_pointer_down = false;
        });

        EventBus.on('SYS_INPUT_POINTER_MOVE', (e) => {
            if (Input.is_shift() && is_pointer_down) {
                const selected_list = SelectControl.get_selected_list();
                if (selected_list.length != 1)
                    return;
                const mesh = selected_list[0];
                if (mesh.type != IObjectTypes.GO_SPRITE_COMPONENT)
                    return;
                let key = mesh.name;
                if (mesh.userData && mesh.userData.tile)
                    key = mesh.userData.tile.x + '_' + mesh.userData.tile.y;
                if (!tiles_info[key])
                    return;
                //log("draw")
                const { draw_canvas, material } = tiles_info[key];
                const raycaster = RenderEngine.raycaster;
                const camera = RenderEngine.camera;
                raycaster.setFromCamera(new Vector2(e.x, e.y), camera);
                raycaster.layers.enable(RenderEngine.DC_LAYERS.RAYCAST_LAYER);
                const list = raycaster.intersectObject(mesh);
                if (last_pos.x == 0 && last_pos.y == 0)
                    last_pos.set(e.x, e.y);
                if (list.length > 0) {
                    const uv = list[0].uv!;
                    draw_canvas.draw(uv.x, 1 - uv.y, e.x - last_pos.x, last_pos.y - e.y);
                    material.uniforms.u_flowMap.value.needsUpdate = true;
                }
                last_pos.set(e.x, e.y);


            }
        });


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

    let cnt = 0;
    async function create_water_shader(mesh: IBaseMeshAndThree): Promise<[ShaderMaterial, IDrawCanvas]> {
        const draw_canvas = CreateDrawCanvas(256);
        const flow = new Texture(draw_canvas.getCanvas());
        //const flow = ResourceManager.get_texture('flow_map').texture;
        //flow.wrapS = flow.wrapT = RepeatWrapping;
        flow.needsUpdate = true;



        const mat = new ShaderMaterial({
            uniforms: {
                u_texture: { value: null },
                u_normal: { value: normals },
                u_flowMap: { value: flow },
                u_time: { value: 0.0 },
                alpha: { value: 1.0 },
                config: { value: config }
            },
            vertexShader: shader_vp,
            fragmentShader: shader_fp,
            transparent: true
        });
        const now = System.now_with_ms();
        cnt++;
        if (cnt == 1) {
            EventBus.on('SYS_ON_UPDATE', (e) => {
                mat.uniforms.u_time.value = System.now_with_ms() - now;
                updateFlow(e.dt, mat.uniforms.config.value);
            });
        }
        else {
            EventBus.on('SYS_ON_UPDATE', (e) => {
                mat.uniforms.u_time.value = System.now_with_ms() - now;
                // updateFlow(e.dt, mat.uniforms.config.value);
            });
        }
        const tex = mesh.get_texture();
        const texture = ResourceManager.get_texture(tex[0], tex[1]).texture;
        //texture.wrapS = texture.wrapT = RepeatWrapping;
        //texture.needsUpdate = true;
        mat.uniforms.u_texture.value = texture;


        (mesh as any).material = mat;
        return [mat, draw_canvas];
    }

    function updateFlow(delta: number, config: Vector4) {
        config.x += flowSpeed * delta; // flowMapOffset0
        config.y = config.x + halfCycle; // flowMapOffset1

        if (config.x >= cycle) {
            config.x = 0;
            config.y = halfCycle;
        } else if (config.y >= cycle)
            config.y = config.y - cycle;
    }


    async function activate_flow() {
        const selected_list = SelectControl.get_selected_list();
        if (selected_list.length != 1)
            return;
        const mesh = selected_list[0];
        if (mesh.type != IObjectTypes.GO_SPRITE_COMPONENT)
            return;
        let key = mesh.name;
        if (mesh.userData && mesh.userData.tile)
            key = mesh.userData.tile.x + '_' + mesh.userData.tile.y;
        if (tiles_info[key])
            return;
        const [material, draw_canvas] = await create_water_shader(mesh);

        tiles_info[key] = { material, draw_canvas };
        log('activated flow', key)
    }

    function deactivate_flow() {
        const selected_list = SelectControl.get_selected_list();
        if (selected_list.length != 1)
            return;
        const mesh = selected_list[0];
        if (mesh.type != IObjectTypes.GO_SPRITE_COMPONENT)
            return;
        let key = mesh.name;
        if (mesh.userData && mesh.userData.tile)
            key = mesh.userData.tile.x + '_' + mesh.userData.tile.y;
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
        (mesh as any).material = mat;
        delete tiles_info[key];
        log('deactivated flow', key)
    }

    return {
        init, load_shader
    }
}


function CreateDrawCanvas(canvas_size: number, brush_size = 40, flow_strength = 0.8) {
    const canvas = document.createElement("canvas");
    canvas.width = canvas_size;
    canvas.height = canvas_size;
    const ctx = canvas.getContext("2d")!;
    // Начальный цвет (нейтральный flow-map цвет)
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
        let centerB = 128; // Нейтральный цвет

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

    function exportImage() {
        return canvas.toDataURL();
    }

    function getCanvas() {
        return canvas;
    }

    return { draw, exportImage, getCanvas };
}

type IDrawCanvas = ReturnType<typeof CreateDrawCanvas>;
