import { NearestFilter, RepeatWrapping, ShaderMaterial, Texture, Vector4 } from "three";
import { ChangeInfo, ObjectData, PropertyData, PropertyType } from "../modules_editor/Inspector";
import { generateTextureOptions } from "./helpers";
import { IBaseMeshAndThree } from "../render_engine/types";
import { CreateDrawCanvas, get_hash_by_mesh, get_mesh_by_hash, get_name_atlas_by_texture, get_raycast_point_uv, get_selected_one_mesh, IDrawCanvas, set_raycast_last_pos } from "./ui_utils";
import { hexToRGB } from "../modules/utils";
import { shader, Slice9Mesh } from "../render_engine/objects/slice9";
export function register_paint_inspector() {
    (window as any).PaintInspector = PaintInspectorCreate();
}

declare global {
    const PaintInspector: ReturnType<typeof PaintInspectorCreate>;
}

export enum PaintProperty {
    DRAWING = 'drawing',
    BUTTONS = 'buttons',
    TEXTURES = 'textures',
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
    SIZE_BLUE = 'size_blue'
}

export enum PaintPropertyTitle {
    DRAWING = 'Рисование',
    BUTTONS = 'Кнопки',
    TEXTURES = 'Текстуры',
    CREATE_SIZE = 'Увеличить размер',
    CREATE_BTN = 'Создать',
    SAVE_BTN = 'Сохранить',
    DEL_BTN = 'Удалить',
    VAL_SIZE = 'Размер',
    VAL_COLOR = 'Цвет',
    TEX_RED = 'Красный',
    TEX_GREEN = 'Зеленый',
    TEX_BLUE = 'Синий',
    SIZE_RED = 'Красный(размер)',
    SIZE_GREEN = 'Зеленый(размер)',
    SIZE_BLUE = 'Синий(размер)'
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

    const config_data = {
        [PaintProperty.CREATE_SIZE]: 1,
        [PaintProperty.VAL_SIZE]: 50,
        [PaintProperty.VAL_COLOR]: '#ff0000',
        [PaintProperty.TEX_RED]: '',
        [PaintProperty.TEX_GREEN]: '',
        [PaintProperty.TEX_BLUE]: '',
        [PaintProperty.SIZE_RED]: 1,
        [PaintProperty.SIZE_GREEN]: 1,
        [PaintProperty.SIZE_BLUE]: 1,
    };


    function show() {
        const data: ObjectData[] = [{ id: 0, fields: [] as PropertyData<PropertyType>[] }];
        let tex1 = config_data[PaintProperty.TEX_RED];
        let tex2 = config_data[PaintProperty.TEX_GREEN];
        let tex3 = config_data[PaintProperty.TEX_BLUE];
        const mesh = get_selected_one_mesh();

        const button_fields: PropertyData<PropertyType>[] = [];

        if (selected_mesh && (selected_mesh as any).material.uniforms.tex1) {
            tex1 = get_name_atlas_by_texture((selected_mesh as any).material.uniforms.tex1.value as Texture);
            tex2 = get_name_atlas_by_texture((selected_mesh as any).material.uniforms.tex2.value as Texture);
            tex3 = get_name_atlas_by_texture((selected_mesh as any).material.uniforms.tex3.value as Texture);

            const texture_options = generateTextureOptions(true);

            const draw_fields: PropertyData<PropertyType>[] = [];
            draw_fields.push({
                key: PaintProperty.VAL_SIZE,
                title: PaintPropertyTitle.VAL_SIZE,
                value: config_data[PaintProperty.VAL_SIZE],
                type: PropertyType.SLIDER,
                params: { min: 0, max: 100, step: 1 },
                onChange: updateParams
            });
            draw_fields.push({
                key: PaintProperty.VAL_COLOR,
                title: PaintPropertyTitle.VAL_COLOR,
                value: config_data[PaintProperty.VAL_COLOR],
                type: PropertyType.COLOR,
                onChange: updateParams
            });

            data[0].fields.push({
                key: PaintProperty.DRAWING,
                title: PaintPropertyTitle.DRAWING,
                value: draw_fields,
                type: PropertyType.FOLDER,
                params: { expanded: true }
            });

            const texture_fields: PropertyData<PropertyType>[] = [];
            texture_fields.push({
                key: PaintProperty.SIZE_RED,
                title: PaintPropertyTitle.SIZE_RED,
                value: config_data[PaintProperty.SIZE_RED],
                type: PropertyType.SLIDER,
                params: { min: 0, max: 100, step: 1 },
                onChange: updateParams
            });
            texture_fields.push({
                key: PaintProperty.TEX_RED,
                title: PaintPropertyTitle.TEX_RED,
                value: tex1,
                type: PropertyType.LIST_TEXTURES,
                params: texture_options,
                onChange: updateParams
            });
            texture_fields.push({
                key: PaintProperty.SIZE_GREEN,
                title: PaintPropertyTitle.SIZE_GREEN,
                value: config_data[PaintProperty.SIZE_GREEN],
                type: PropertyType.SLIDER,
                params: { min: 0, max: 100, step: 1 },
                onChange: updateParams
            });
            texture_fields.push({
                key: PaintProperty.TEX_GREEN,
                title: PaintPropertyTitle.TEX_GREEN,
                value: tex2,
                type: PropertyType.LIST_TEXTURES,
                params: texture_options,
                onChange: updateParams
            });
            texture_fields.push({
                key: PaintProperty.SIZE_BLUE,
                title: PaintPropertyTitle.SIZE_BLUE,
                value: config_data[PaintProperty.SIZE_BLUE],
                type: PropertyType.SLIDER,
                params: { min: 0, max: 100, step: 1 },
                onChange: updateParams
            });
            texture_fields.push({
                key: PaintProperty.TEX_BLUE,
                title: PaintPropertyTitle.TEX_BLUE,
                value: tex3,
                type: PropertyType.LIST_TEXTURES,
                params: texture_options,
                onChange: updateParams
            });

            data[0].fields.push({
                key: PaintProperty.TEXTURES,
                title: PaintPropertyTitle.TEXTURES,
                value: texture_fields,
                type: PropertyType.FOLDER,
                params: { expanded: true }
            });

            if (mesh) {
                button_fields.push({
                    key: PaintProperty.SAVE_BTN,
                    title: PaintPropertyTitle.SAVE_BTN,
                    value: () => save(mesh),
                    type: PropertyType.BUTTON,
                });
                button_fields.push({
                    key: PaintProperty.DEL_BTN,
                    title: PaintPropertyTitle.DEL_BTN,
                    value: () => {
                        if (confirm('Удалить?'))
                            deactivate(mesh);
                    },
                    type: PropertyType.BUTTON,
                });
            }
        }

        else if (mesh) {
            button_fields.push({
                key: PaintProperty.CREATE_SIZE,
                title: PaintPropertyTitle.CREATE_SIZE,
                value: 1,
                type: PropertyType.SLIDER,
                params: { min: 1, max: 10, step: 1 },
                onChange: updateParams
            });
            button_fields.push({
                key: PaintProperty.CREATE_BTN,
                title: PaintPropertyTitle.CREATE_BTN,
                value: () => activate(mesh),
                type: PropertyType.BUTTON,
            });
        }

        data[0].fields.push({
            key: PaintProperty.BUTTONS,
            title: PaintPropertyTitle.BUTTONS,
            value: button_fields,
            type: PropertyType.FOLDER,
            params: { expanded: true }
        });

        Inspector.clear();
        Inspector.setData(data);
    }

    function updateParams(info: ChangeInfo) {
        (config_data as any)[info.data.field.key] = info.data.event.value;
        //log('update:', info.data.field.name, info.data.event.value);
        if (!selected_mesh)
            return;
        const material = (selected_mesh as any).material as ShaderMaterial;
        if (info.data.field.key == PaintProperty.TEX_RED) {
            const tex_data = set_texture_slot(0, info.data.event.value as string, material);
            material.uniforms.tex_size_repeat.value.x = tex_data.size.x;
        }
        if (info.data.field.key == PaintProperty.TEX_GREEN)
            set_texture_slot(1, info.data.event.value as string, material);
        if (info.data.field.key == PaintProperty.TEX_BLUE)
            set_texture_slot(2, info.data.event.value as string, material);

        if (info.data.field.key == PaintProperty.SIZE_RED)
            material.uniforms.tex_size_repeat.value.y = config_data[PaintProperty.SIZE_RED];
        if (info.data.field.key == PaintProperty.SIZE_GREEN)
            material.uniforms.tex_size_repeat.value.z = config_data[PaintProperty.SIZE_GREEN];
        if (info.data.field.key == PaintProperty.SIZE_BLUE)
            material.uniforms.tex_size_repeat.value.w = config_data[PaintProperty.SIZE_BLUE];
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
        size.x *= config_data[PaintProperty.CREATE_SIZE];
        size.y *= config_data[PaintProperty.CREATE_SIZE];
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
                const uv = get_raycast_point_uv(e.x, e.y, selected_mesh as Slice9Mesh);
                if (uv) {
                    draw_canvas.set_size(config_data[PaintProperty.VAL_SIZE]);
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
                const uv = get_raycast_point_uv(e.x, e.y, selected_mesh as Slice9Mesh);
                if (uv) {
                    draw_canvas.set_size(config_data[PaintProperty.VAL_SIZE]);
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
                config_data[PaintProperty.SIZE_RED] = info.size1 || 1;
                config_data[PaintProperty.SIZE_GREEN] = info.size2 || 1;
                config_data[PaintProperty.SIZE_BLUE] = info.size3 || 1;
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
                material.uniforms.tex_size_repeat.value.set(tex1.size.x, config_data[PaintProperty.SIZE_RED], config_data[PaintProperty.SIZE_GREEN], config_data[PaintProperty.SIZE_BLUE]);
                material.uniforms.map_size.value.set(mask_data.size.x, mask_data.size.y, 0, 0);
            }
            else {
                Log.error('[Карта] меш не найден:' + id);
            }
        }
    }

    function get_color() {
        const clr = hexToRGB(config_data[PaintProperty.VAL_COLOR]);
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
                size1: config_data[PaintProperty.SIZE_RED],
                size2: config_data[PaintProperty.SIZE_GREEN],
                size3: config_data[PaintProperty.SIZE_BLUE]
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
