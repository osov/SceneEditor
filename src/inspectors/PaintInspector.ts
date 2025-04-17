import { NearestFilter, RepeatWrapping, ShaderMaterial, Texture, Vector2, Vector4 } from "three";
import { BeforeChangeInfo, ChangeInfo, InspectorGroup, PropertyType } from "../modules_editor/Inspector";
import { generateTextureOptions, update_option } from "./helpers";
import { IBaseMeshAndThree } from "../render_engine/types";
import { CreateDrawCanvas, get_hash_by_mesh, get_mesh_by_hash, get_name_atlas_by_texture, get_raycast_point_uv, get_selected_one_mesh, IDrawCanvas, set_raycast_last_pos } from "./ui_utils";
import { hexToRGB } from "../modules/utils";
import { shader } from "../render_engine/objects/slice9";

export function register_paint_inspector() {
    (window as any).PaintInspector = PaintInspectorCreate();
}

declare global {
    const PaintInspector: ReturnType<typeof PaintInspectorCreate>;
}

enum InspectorProperty {
    CREATE_SIZE = 'create_size',
    CREATE_BTN = 'create_btn',
    SAVE_BTN = 'save_btn',
    DEL_BTN = 'del_btn',

    VAL_SIZE = 'val_size',
    VAL_COLOR = 'val_color',

    TEX_RED = 'tex_red',
    TEX_GREEN = 'tex_green',
    TEX_BLUE = 'tex_blue',
    SIZE_RED = 'size_red',
    SIZE_GREEN = 'size_green',
    SIZE_BLUE = 'size_blue',
}

interface SavedInfo {
    tex1: string;
    tex2: string;
    tex3: string;
    size1: number;
    size2: number;
    size3: number;
}

type FileData = { [id: string]: SavedInfo };

function PaintInspectorCreate() {

    let selected_mesh: IBaseMeshAndThree | undefined;
    const mesh_list: { [k: string]: { material: ShaderMaterial, draw_canvas: IDrawCanvas } } = {};
    const dir_path = '/map/';
    const fp_path = 'shaders/map.fp';
    const vp_path = 'shaders/map.vp';
    let shader_fp = '';
    let shader_vp = '';

    const _config: InspectorGroup[] = [
        {
            name: 'basic',
            title: 'Рисование',
            property_list: [
                {
                    name: InspectorProperty.VAL_SIZE,
                    title: 'Размер',
                    type: PropertyType.SLIDER,
                    params: { min: 0, max: 100, step: 1 },
                    onUpdate: updateParams
                },
                {
                    name: InspectorProperty.VAL_COLOR,
                    title: 'Цвет',
                    type: PropertyType.COLOR,
                    onUpdate: updateParams
                },
            ]
        },
        {
            name: 'textures',
            title: 'Текстуры',
            property_list: [
                {
                    name: InspectorProperty.SIZE_RED,
                    title: 'Красный(размер)',
                    type: PropertyType.SLIDER,
                    params: { min: 0, max: 100, step: 1 },
                    onUpdate: updateParams
                },
                {
                    name: InspectorProperty.TEX_RED,
                    title: 'Красный',
                    type: PropertyType.LIST_TEXTURES,
                    params: () => generateTextureOptions(true),
                    onUpdate: updateParams
                },
                {
                    name: InspectorProperty.SIZE_GREEN,
                    title: 'Зеленый(размер)',
                    type: PropertyType.SLIDER,
                    params: { min: 0, max: 100, step: 1 },
                    onUpdate: updateParams
                },
                {
                    name: InspectorProperty.TEX_GREEN,
                    title: 'Зеленый',
                    type: PropertyType.LIST_TEXTURES,
                    params: () => generateTextureOptions(true),
                    onUpdate: updateParams
                },
                {
                    name: InspectorProperty.SIZE_BLUE,
                    title: 'Синий(размер)',
                    type: PropertyType.SLIDER,
                    params: { min: 0, max: 100, step: 1 },
                    onUpdate: updateParams
                },
                {
                    name: InspectorProperty.TEX_BLUE,
                    title: 'Синий',
                    type: PropertyType.LIST_TEXTURES,
                    params: () => generateTextureOptions(true),
                    onUpdate: updateParams
                },

            ]
        },
        {
            name: 'buttons',
            title: 'Действия',
            property_list: [
                {
                    name: InspectorProperty.CREATE_SIZE,
                    title: 'Увеличить размер',
                    type: PropertyType.SLIDER,
                    params: { min: 1, max: 10, step: 1 },
                    onUpdate: updateParams
                },
                {
                    name: InspectorProperty.CREATE_BTN,
                    title: 'Создать',
                    type: PropertyType.BUTTON,
                },
                {
                    name: InspectorProperty.SAVE_BTN,
                    title: 'Сохранить',
                    type: PropertyType.BUTTON,
                },
                {
                    name: InspectorProperty.DEL_BTN,
                    title: 'Удалить',
                    type: PropertyType.BUTTON,
                },
            ]
        },
    ];

    const config_data = {
        [InspectorProperty.CREATE_SIZE]: 1,
        [InspectorProperty.VAL_SIZE]: 50,
        [InspectorProperty.VAL_COLOR]: '#ff0000',
        [InspectorProperty.TEX_RED]: '',
        [InspectorProperty.TEX_GREEN]: '',
        [InspectorProperty.TEX_BLUE]: '',
        [InspectorProperty.SIZE_RED]: 1,
        [InspectorProperty.SIZE_GREEN]: 1,
        [InspectorProperty.SIZE_BLUE]: 1,
    };


    function show() {
        const data: any = [{ id: 0, data: [] }];
        let tex1 = config_data[InspectorProperty.TEX_RED];
        let tex2 = config_data[InspectorProperty.TEX_GREEN];
        let tex3 = config_data[InspectorProperty.TEX_BLUE];
        const mesh = get_selected_one_mesh();

        if (selected_mesh && (selected_mesh as any).material.uniforms.tex1) {
            tex1 = get_name_atlas_by_texture((selected_mesh as any).material.uniforms.tex1.value as Texture);
            tex2 = get_name_atlas_by_texture((selected_mesh as any).material.uniforms.tex2.value as Texture);
            tex3 = get_name_atlas_by_texture((selected_mesh as any).material.uniforms.tex3.value as Texture);

            data[0].data = [
                { name: InspectorProperty.VAL_SIZE, data: config_data[InspectorProperty.VAL_SIZE] },
                { name: InspectorProperty.VAL_COLOR, data: config_data[InspectorProperty.VAL_COLOR] },

                { name: InspectorProperty.TEX_RED, data: tex1 },
                { name: InspectorProperty.TEX_GREEN, data: tex2 },
                { name: InspectorProperty.TEX_BLUE, data: tex3 },
                { name: InspectorProperty.SIZE_RED, data: config_data[InspectorProperty.SIZE_RED] },
                { name: InspectorProperty.SIZE_GREEN, data: config_data[InspectorProperty.SIZE_GREEN] },
                { name: InspectorProperty.SIZE_BLUE, data: config_data[InspectorProperty.SIZE_BLUE] },
            ];

            if (mesh) {
                data[0].data.push({ name: InspectorProperty.SAVE_BTN, data: () => save(mesh) },)
                data[0].data.push({
                    name: InspectorProperty.DEL_BTN, data: () => {
                        if (confirm('Удалить?'))
                            deactivate(mesh);
                    }
                },)
            }
        }

        else if (mesh) {
            data[0].data = [
                { name: InspectorProperty.CREATE_SIZE, data: 1 },
                { name: InspectorProperty.CREATE_BTN, data: () => activate(mesh) },
            ];
        }

        update_option(_config, InspectorProperty.TEX_RED, () => generateTextureOptions(true));
        update_option(_config, InspectorProperty.TEX_GREEN, () => generateTextureOptions(true));
        update_option(_config, InspectorProperty.TEX_BLUE, () => generateTextureOptions(true));
        Inspector.clear();
        Inspector.setData(data, _config);
    }

    function updateParams(info: ChangeInfo) {
        (config_data as any)[info.data.field.name] = info.data.event.value;
        //log('update:', info.data.field.name, info.data.event.value);
        if (!selected_mesh)
            return;
        const material = (selected_mesh as any).material as ShaderMaterial;
        if (info.data.field.name == InspectorProperty.TEX_RED)
            set_texture_slot(0, info.data.event.value as string, material);
        if (info.data.field.name == InspectorProperty.TEX_GREEN)
            set_texture_slot(1, info.data.event.value as string, material);
        if (info.data.field.name == InspectorProperty.TEX_BLUE)
            set_texture_slot(2, info.data.event.value as string, material);
        if (info.data.field.name == InspectorProperty.SIZE_RED)
            material.uniforms.tex_size_repeat.value.y = config_data[InspectorProperty.SIZE_RED];
        if (info.data.field.name == InspectorProperty.SIZE_GREEN)
            material.uniforms.tex_size_repeat.value.z = config_data[InspectorProperty.SIZE_GREEN];
        if (info.data.field.name == InspectorProperty.SIZE_BLUE)
            material.uniforms.tex_size_repeat.value.w = config_data[InspectorProperty.SIZE_BLUE];
    }


    function set_texture_slot(id: number, path: string, material: ShaderMaterial) {
        const vals = path.split('/');
        const tex_data = ResourceManager.get_texture(vals[1], vals[0]);
        const tex = tex_data.texture;
        tex.wrapS = tex.wrapT = RepeatWrapping;
        tex.needsUpdate = true;
        if (id == 0)
            material.uniforms.tex1.value = tex;
        if (id == 1)
            material.uniforms.tex2.value = tex;
        if (id == 2)
            material.uniforms.tex3.value = tex;
        return tex_data;
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
    }

    async function create_shader(mesh: IBaseMeshAndThree): Promise<[ShaderMaterial, IDrawCanvas]> {
        const size = mesh.get_size();
        size.x *= mesh.scale.x;
        size.y *= mesh.scale.y;
        size.x *= config_data[InspectorProperty.CREATE_SIZE];
        size.y *= config_data[InspectorProperty.CREATE_SIZE];
        const draw_canvas = CreateDrawCanvas(Math.floor(size.x), Math.floor(size.y));
        const mask = new Texture(draw_canvas.getCanvas());
        mask.needsUpdate = true;

        const tex = mesh.get_texture();
        const texture = ResourceManager.get_texture(tex[0], tex[1]).texture;
        const mat: ShaderMaterial = new ShaderMaterial({
            uniforms: {
                u_texture: { value: texture },
                u_mask: { value: mask },
                tex1: { value: null },
                tex2: { value: null },
                tex3: { value: null },
                uv_mask: { value: null },
                uv_tex1: { value: null },
                uv_tex2: { value: null },
                uv_tex3: { value: null },
                tex_size_repeat: { value: new Vector4(1, 1, 1, 1) },
                map_size: { value: new Vector4(1, 1, 0, 0) },
            },
            vertexShader: shader_vp,
            fragmentShader: shader_fp,
            transparent: true
        });
        set_texture_slot(0, 'Frame/1_17', mat);
        set_texture_slot(1, 'Frame/Cla_1', mat);
        set_texture_slot(2, '/sand-512', mat);
        (mesh as any).material = mat;
        return [mat, draw_canvas];
    }

    function subscribe() {
        EventBus.on('SYS_VIEW_INPUT_KEY_DOWN', (e) => {
            if (Input.is_shift()) {
                if (e.key == 'T' || e.key == 'Е') {
                    if (selected_mesh)
                        show();
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
                    draw_canvas.set_size(config_data[InspectorProperty.VAL_SIZE]);
                    draw_canvas.draw(uv.x, 1 - uv.y, get_color());
                    material.uniforms.u_mask.value.needsUpdate = true;
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
                const { draw_canvas, material } = mesh_list[key];
                const uv = get_raycast_point_uv(e.x, e.y, selected_mesh);
                if (uv) {
                    draw_canvas.set_size(config_data[InspectorProperty.VAL_SIZE]);
                    draw_canvas.draw(uv.x, 1 - uv.y, get_color());
                    material.uniforms.u_mask.value.needsUpdate = true;
                }
                set_raycast_last_pos(e.x, e.y);
            }
        });
    }

    async function load_data() {
        const data = await ClientAPI.get_data(dir_path + 'data.txt');
        let flows: FileData = {};
        if (data.result == 1 && data.data)
            flows = JSON.parse(data.data) as FileData;
        return flows;
    }

    async function load_saved() {
        const data = await load_data();
        for (const id in data) {
            const info = data[id];
            const mesh = get_mesh_by_hash(id);
            if (mesh) {
                await activate(mesh);
                config_data[InspectorProperty.SIZE_RED] = info.size1 || 1;
                config_data[InspectorProperty.SIZE_GREEN] = info.size2 || 1;
                config_data[InspectorProperty.SIZE_BLUE] = info.size3 || 1;
                const { draw_canvas, material } = mesh_list[id];
                const mask_data = ResourceManager.get_texture(id);
                //const mask_data = ResourceManager.get_texture('tex_mask', 'texture');
                const tex_mask = mask_data.texture;
                draw_canvas.loadTexture(tex_mask, () => material.uniforms.u_mask.value.needsUpdate = true);
                const tex1 = set_texture_slot(0, info.tex1, material);
                const tex2 = set_texture_slot(1, info.tex2, material);
                const tex3 = set_texture_slot(2, info.tex3, material);
                //const tex1 = ResourceManager.get_texture('tex1', 'texture');
                //const tex2 = ResourceManager.get_texture('tex2', 'texture');
                //const tex3 = ResourceManager.get_texture('tex3', 'texture');

                tex_mask.minFilter = tex1.texture.minFilter = tex2.texture.minFilter = tex3.texture.minFilter = NearestFilter;
                tex_mask.needsUpdate = tex1.texture.needsUpdate = tex2.texture.needsUpdate = tex3.texture.needsUpdate = true;

                material.uniforms.uv_mask.value = mask_data.uv12;
                material.uniforms.uv_tex1.value = tex1.uv12;
                material.uniforms.uv_tex2.value = tex2.uv12;
                material.uniforms.uv_tex3.value = tex3.uv12;
                //material.uniforms.u_mask.value = tex_mask;
                material.uniforms.tex1.value = tex1.texture;
                material.uniforms.tex2.value = tex2.texture;
                material.uniforms.tex3.value = tex3.texture;
                material.uniforms.tex_size_repeat.value.set(tex1.size.x, config_data[InspectorProperty.SIZE_RED], config_data[InspectorProperty.SIZE_GREEN], config_data[InspectorProperty.SIZE_BLUE]);
                material.uniforms.map_size.value.set(mask_data.size.x, mask_data.size.y, 0, 0);
            }
            else {
                Log.error('[Карта] меш не найден:' + id);
            }
        }
    }

    function get_color() {
        const clr = hexToRGB(config_data[InspectorProperty.VAL_COLOR]);
        return [clr.x * 255, clr.y * 255, clr.z * 255];
    }

    async function activate(mesh: IBaseMeshAndThree) {
        const key = get_hash_by_mesh(mesh);
        selected_mesh = mesh;
        if (mesh_list[key])
            return;
        const [material, draw_canvas] = await create_shader(mesh);
        mesh_list[key] = { material, draw_canvas };
        log('activated', key)
        show();
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
        const data = await load_data();
        delete data[key];
        await ClientAPI.save_data(dir_path + 'data.txt', JSON.stringify(data));
        await ClientAPI.remove(dir_path + key + '.png');
        Inspector.clear();
    }

    async function save(mesh: IBaseMeshAndThree) {
        const key = get_hash_by_mesh(mesh);
        if (!mesh_list[key])
            return;
        const { draw_canvas, material } = mesh_list[key];
        const image = draw_canvas.getCanvas();
        const imageData = image.toDataURL();
        const answer = await AssetControl.save_base64_img(dir_path + key + '.png', imageData);
        if (answer.result == 1) {
            const data = await load_data();
            data[key] = {
                tex1: get_name_atlas_by_texture(material.uniforms.tex1.value),
                tex2: get_name_atlas_by_texture(material.uniforms.tex2.value),
                tex3: get_name_atlas_by_texture(material.uniforms.tex3.value),
                size1: config_data[InspectorProperty.SIZE_RED],
                size2: config_data[InspectorProperty.SIZE_GREEN],
                size3: config_data[InspectorProperty.SIZE_BLUE]
            };
            await ClientAPI.save_data(dir_path + 'data.txt', JSON.stringify(data));
            Popups.toast.success('Карта сохранена');
        }
        else
            Popups.toast.error('Ошибка сохранения карты');
    }

    function init() {
        subscribe();
    }

    init();
    return { show, load_shader, load_saved };
}
