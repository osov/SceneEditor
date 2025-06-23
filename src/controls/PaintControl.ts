import { Texture, Vector2 } from "three";
import { Slice9Mesh } from "@editor/render_engine/objects/slice9";
import { CreateDrawCanvas, get_hash_by_mesh, get_raycast_point_uv, get_selected_one_mesh, IDrawCanvas, set_raycast_last_pos } from "../inspectors/ui_utils";
import { IBaseMeshAndThree, IObjectTypes } from "@editor/render_engine/types";
import { hexToRGB } from "@editor/modules/utils";
import { MultipleMaterialMesh } from "@editor/render_engine/objects/multiple_material_mesh";


declare global {
    const PaintControl: ReturnType<typeof PaintControlCreate>;
}

export function register_paint_control() {
    (window as any).PaintControl = PaintControlCreate();
}

export enum PaintProperty {
    BRUSH = 'brush',
    CREATE_SIZE = 'create_size',
    CREATE_BTN = 'create_btn',
    SAVE_BTN = 'save_btn',
    DEL_BTN = 'del_btn',
    VAL_SIZE = 'val_size',
    VAL_COLOR = 'val_color',
    MODE = 'mode'
}

export enum PAINT_MODE {
    COLOR = 'color',
    NORMAL = 'normal'
}

export type AllowedMeshType = Slice9Mesh | MultipleMaterialMesh;

const MAP_DIR = '/data/map/';
const FLOW_DIR = '/data/water/';

const ALLOWED_TYPES = [
    IObjectTypes.GO_SPRITE_COMPONENT,
    IObjectTypes.GO_MODEL_COMPONENT,
    IObjectTypes.GO_ANIMATED_MODEL_COMPONENT
];

function PaintControlCreate() {
    const state = {
        [PaintProperty.CREATE_SIZE]: 1,
        [PaintProperty.VAL_SIZE]: 50,
        [PaintProperty.VAL_COLOR]: '#ff0000',
        [PaintProperty.MODE]: PAINT_MODE.COLOR,
    };

    const last_pos = new Vector2();
    const mesh_list: { [k: string]: IDrawCanvas } = {};

    let selected_mesh: AllowedMeshType | undefined;
    let dir_path = MAP_DIR;

    function init() {
        subscribe();
    }

    function subscribe() {
        EventBus.on('SYS_SELECTED_MESH_LIST', (e) => {
            if (Input.is_shift())
                return;
            selected_mesh = get_selected_one_mesh(ALLOWED_TYPES) as AllowedMeshType;
        });

        // NOTE: shift + D для активации
        EventBus.on('SYS_VIEW_INPUT_KEY_DOWN', (e) => {
            if (Input.is_shift()) {
                if (e.key == 'D' || e.key == 'В') {
                    if (selected_mesh)
                        PaintInspector.show(selected_mesh);
                }
            }
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
                const uv = get_raycast_point_uv(e.x, e.y, selected_mesh as Slice9Mesh);
                if (uv) {
                    draw_canvas.set_size(state[PaintProperty.VAL_SIZE]);
                    switch (state[PaintProperty.MODE]) {
                        case PAINT_MODE.COLOR:
                            draw_canvas.draw(uv.x, 1 - uv.y, get_color());
                            if (selected_mesh instanceof Slice9Mesh) {
                                selected_mesh.material.uniforms.u_mask.value.needsUpdate = true;
                            } else if (selected_mesh instanceof MultipleMaterialMesh) {
                                selected_mesh.get_materials().forEach((material) => {
                                    if (material.uniforms.u_mask)
                                        material.uniforms.u_mask.value.needsUpdate = true;
                                });
                            } else Popups.toast.error('Неподдерживаемый тип mesh');
                            break;
                        case PAINT_MODE.NORMAL:
                            draw_canvas.draw_flow(uv.x, 1 - uv.y, 0, 0, 0.8);
                            if (selected_mesh instanceof Slice9Mesh) {
                                selected_mesh.material.uniforms.u_flowMap.value.needsUpdate = true;
                            } else if (selected_mesh instanceof MultipleMaterialMesh) {
                                selected_mesh.get_materials().forEach((material) => {
                                    if (material.uniforms.u_flowMap)
                                        material.uniforms.u_flowMap.value.needsUpdate = true;
                                });
                            } else Popups.toast.error('Неподдерживаемый тип mesh');
                            break;
                    }
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
                const draw_canvas = mesh_list[key];
                const uv = get_raycast_point_uv(e.x, e.y, selected_mesh as Slice9Mesh);
                if (uv) {
                    draw_canvas.set_size(state[PaintProperty.VAL_SIZE]);
                    switch (state[PaintProperty.MODE]) {
                        case PAINT_MODE.COLOR:
                            draw_canvas.draw(uv.x, 1 - uv.y, get_color());
                            if (selected_mesh instanceof Slice9Mesh) {
                                selected_mesh.material.uniforms.u_mask.value.needsUpdate = true;
                            } else if (selected_mesh instanceof MultipleMaterialMesh) {
                                selected_mesh.get_materials().forEach((material) => {
                                    if (material.uniforms.u_mask)
                                        material.uniforms.u_mask.value.needsUpdate = true;
                                });
                            } else Popups.toast.error('Неподдерживаемый тип mesh');
                            break;
                        case PAINT_MODE.NORMAL:
                            draw_canvas.draw_flow(uv.x, 1 - uv.y, e.x - last_pos.x, last_pos.y - e.y, 0.8);
                            if (selected_mesh instanceof Slice9Mesh) {
                                selected_mesh.material.uniforms.u_flowMap.value.needsUpdate = true;
                            } else if (selected_mesh instanceof MultipleMaterialMesh) {
                                selected_mesh.get_materials().forEach((material) => {
                                    if (material.uniforms.u_flowMap)
                                        material.uniforms.u_flowMap.value.needsUpdate = true;
                                });
                            } else Popups.toast.error('Неподдерживаемый тип mesh');
                            break;
                    }
                }
                // NOTE: может можно использовать только set_raycast_last_pos ?
                last_pos.set(e.x, e.y);
                set_raycast_last_pos(e.x, e.y);
            }
        });
    }

    function get_color() {
        const clr = hexToRGB(state[PaintProperty.VAL_COLOR]);
        return [clr.x * 255, clr.y * 255, clr.z * 255];
    }

    async function setup_draw_canvas(mesh: AllowedMeshType): Promise<IDrawCanvas | null> {
        let draw_canvas: IDrawCanvas | null = null;

        let uniform_name = '';
        switch (state[PaintProperty.MODE]) {
            case PAINT_MODE.COLOR:
                dir_path = MAP_DIR;
                uniform_name = 'u_mask';
                break;
            case PAINT_MODE.NORMAL:
                dir_path = FLOW_DIR;
                uniform_name = 'u_flowMap';
                break;
        }

        if (uniform_name == '') return null;

        let material;
        if (mesh instanceof Slice9Mesh) {
            material = mesh.material;
        } else if (mesh instanceof MultipleMaterialMesh) {
            const materials = mesh.get_materials();
            if (materials.length > 0) material = materials[0];
            else Popups.toast.error('Нет материалов');
        } else {
            Popups.toast.error('Неподдерживаемый тип mesh');
            return null;
        }
        if (!material) return null;

        const uniform = material.uniforms[uniform_name];
        if (uniform && uniform.value && uniform.value.image) {
            const image = uniform.value.image;
            draw_canvas = CreateDrawCanvas(image.width, image.height);
            draw_canvas.getCanvas().getContext('2d')?.drawImage(image, 0, 0);
        } else {
            const size = mesh.get_size();
            size.x *= mesh.scale.x;
            size.y *= mesh.scale.y;
            size.x *= state[PaintProperty.CREATE_SIZE];
            size.y *= state[PaintProperty.CREATE_SIZE];
            draw_canvas = CreateDrawCanvas(Math.floor(size.x), Math.floor(size.y));
        }

        if (!draw_canvas) {
            return null;
        }

        const texture = new Texture(draw_canvas.getCanvas());
        texture.needsUpdate = true;

        if (mesh instanceof Slice9Mesh) {
            ResourceManager.set_material_uniform_for_mesh(mesh, uniform_name, texture);
        } else if (mesh instanceof MultipleMaterialMesh) {
            mesh.get_materials().forEach((material, index) => {
                if (material.uniforms[uniform_name])
                    ResourceManager.set_material_uniform_for_multiple_material_mesh(mesh, index, uniform_name, texture);
            });
        } else {
            Popups.toast.error('Неподдерживаемый тип mesh');
            return null;
        }

        return draw_canvas;
    }

    async function activate(mesh: AllowedMeshType, and_refresh_inspector = true) {
        const key = get_hash_by_mesh(mesh);
        if (mesh_list[key]) return;

        selected_mesh = mesh;
        const draw_canvas = await setup_draw_canvas(mesh);
        if (!draw_canvas)
            return;
        mesh_list[key] = draw_canvas;

        if (and_refresh_inspector) {
            PaintInspector.show(selected_mesh);
        }
    }

    async function deactivate(mesh: AllowedMeshType) {
        const key = get_hash_by_mesh(mesh);
        if (!mesh_list[key])
            return;
        let uniform_name = '';
        switch (state[PaintProperty.MODE]) {
            case PAINT_MODE.COLOR:
                dir_path = MAP_DIR;
                uniform_name = 'u_mask';
                break;
            case PAINT_MODE.NORMAL:
                dir_path = FLOW_DIR;
                uniform_name = 'u_flowMap';
                break;
        }
        if (uniform_name != '') {
            if (mesh instanceof Slice9Mesh) {
                ResourceManager.set_material_uniform_for_mesh(mesh, uniform_name, ResourceManager.get_texture('').texture);
            } else if (mesh instanceof MultipleMaterialMesh) {
                mesh.get_materials().forEach((material, index) => {
                    if (material.uniforms[uniform_name])
                        ResourceManager.set_material_uniform_for_multiple_material_mesh(mesh, index, uniform_name, ResourceManager.get_texture('').texture);
                });
            } else Popups.toast.error('Неподдерживаемый тип mesh');
        }

        selected_mesh = undefined;
        delete mesh_list[key];

        await ClientAPI.remove(dir_path + key + '.png');

        Inspector.clear();
    }

    async function save(mesh: IBaseMeshAndThree) {
        const key = get_hash_by_mesh(mesh);
        if (!mesh_list[key])
            return;
        const draw_canvas = mesh_list[key];
        const image = draw_canvas.getCanvas();
        const imageData = image.toDataURL();
        const answer = await AssetControl.save_base64_img(dir_path + key + '.png', imageData);
        if (answer.result == 1) {
            const data = await ResourceManager.preload_texture(dir_path + key + '.png', '', true);
            let uniform_name = '';
            switch (state[PaintProperty.MODE]) {
                case PAINT_MODE.COLOR: uniform_name = 'u_mask'; break;
                case PAINT_MODE.NORMAL: uniform_name = 'u_flowMap'; break;
            }
            if (uniform_name != '') {
                if (mesh instanceof Slice9Mesh) {
                    ResourceManager.set_material_uniform_for_mesh(mesh, uniform_name, data.texture);
                } else if (mesh instanceof MultipleMaterialMesh) {
                    mesh.get_materials().forEach((material, index) => {
                        if (material.uniforms[uniform_name])
                            ResourceManager.set_material_uniform_for_multiple_material_mesh(mesh, index, uniform_name, data.texture);
                    });
                }
            }
            Popups.toast.success('Карта сохранена');
        }
        else Popups.toast.error('Ошибка сохранения карты');
    }

    init();
    return { save, activate, deactivate, state }
}