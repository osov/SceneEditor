// todo select https://threejs.org/examples/?q=box#misc_boxselection
import { Intersection, Object3D, Object3DEventMap, Texture, Vector2 } from "three";
import { IBaseEntityAndThree, IBaseMeshAndThree } from "../render_engine/types";
import { is_base_mesh } from "../render_engine/helpers/utils";
import { WORLD_SCALAR } from "../config";
import { Services } from '@editor/core';


declare global {
    const SelectControl: ReturnType<typeof SelectControlCreate>;
}

export function register_select_control() {
    (window as any).SelectControl = SelectControlCreate();
}

function SelectControlCreate() {
    const pointer = new Vector2();
    const click_point = new Vector2();
    const prev_point = new Vector2();
    let selected: IBaseMeshAndThree | null = null;
    let selected_list: IBaseMeshAndThree[] = [];
    function init() {
        Services.event_bus.on('SYS_INPUT_POINTER_DOWN', (e) => {
            if (e.target != Services.render.renderer.domElement)
                return;
            if (e.button != 0)
                return;
            click_point.set(e.x, e.y);
        });

        Services.event_bus.on('SYS_INPUT_POINTER_UP', (e) => {
            if (e.target != Services.render.renderer.domElement)
                return;
            if (e.button != 0)
                return;
            if (Services.input.is_shift())
                return;
            prev_point.set(pointer.x, pointer.y);
            pointer.x = e.x;
            pointer.y = e.y;
            const old_pos = Services.camera.screen_to_world(click_point.x, click_point.y);
            const cur_pos = Services.camera.screen_to_world(pointer.x, pointer.y);
            const len = cur_pos.clone().sub(old_pos).length();
            if (len > 5 * WORLD_SCALAR)
                return;
            const intersects = Services.render.raycast_scene(pointer);
            set_selected_intersect(intersects);
        });

        Services.event_bus.on('SYS_INPUT_POINTER_MOVE', (event) => {
            prev_point.set(pointer.x, pointer.y);
            pointer.x = event.x;
            pointer.y = event.y;
        });


        Services.event_bus.on('SYS_SELECTED_MESH', (e) => {
            if (Services.input.is_control()) {
                if (!is_selected(e.mesh))
                    selected_list.push(e.mesh);
                else {
                    const index = selected_list.indexOf(e.mesh);
                    selected_list.splice(index, 1);
                }
            }
            else {
                selected_list = [e.mesh];
            }
            Services.event_bus.emit('SYS_SELECTED_MESH_LIST', { list: selected_list });
        });

        Services.event_bus.on('SYS_UNSELECTED_MESH_LIST', () => {
            selected = null;
            if (!Services.input.is_control())
                selected_list = [];
        });
    }


    function is_selected(mesh: IBaseEntityAndThree) {
        for (let i = 0; i < selected_list.length; i++) {
            const m = selected_list[i];
            if (m.mesh_data.id == mesh.mesh_data.id)
                return true;
        }
        return false;
    }

    function set_selected_intersect(tmp: Intersection<Object3D<Object3DEventMap>>[]) {
        let tmp_list: Object3D[] = [];
        for (let i = 0; i < tmp.length; i++) {
            const it = tmp[i];
            if (is_base_mesh(it.object)) {
                const bm = it.object as IBaseMeshAndThree;
                const tex_data = bm.get_texture();
                const texture = Services.resources.get_texture(tex_data[0], tex_data[1]);
                // bad texture
                if ((texture as any).system)
                    tmp_list.push(it.object);
                else if (it.uv) {
                    if (check_transparent(it.uv, texture.texture, it.object.name))
                        tmp_list.push(it.object);
                }
                else
                    tmp_list.push(it.object);
            }
        }
        const list = tmp_list as IBaseMeshAndThree[];
        set_selected_list(list, false);
    }


    function check_transparent(uv: Vector2, texture: Texture, name: string) {
        return true;
        const image = texture.image;
        const x = Math.floor(uv.x * image.width);
        const y = Math.floor((1 - uv.y) * image.height);
        // Один раз при загрузке текстуры:
        const canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(image, 0, 0);
        const pixel = ctx.getImageData(x, y, 1, 1).data;
        const alpha = pixel[3];
        //log(name, alpha)
        return alpha > 255 / 2;
    }

    function set_selected_list(list: IBaseMeshAndThree[], clear_old = true) {
        if (clear_old) {
            selected_list = [];
            Services.event_bus.emit('SYS_CLEAR_SELECT_MESH_LIST');
        }
        if (list.length == 0) {
            if (!Services.input.is_control())
                Services.event_bus.emit('SYS_UNSELECTED_MESH_LIST');
            return;
        }
        let is_breaked = false;
        for (let i = 0; i < list.length; i++) {
            const it = list[i];
            // если еще ничего не выбрано то выбирается первый
            if (selected == null) {
                selected = it;
                if (!clear_old)
                    Services.event_bus.emit('SYS_SELECTED_MESH', { mesh: selected });
                is_breaked = true;
                break;
            }
            // если уже выбрано то выбирается следующий
            if (it == selected) {
                let next_index = i + 1;
                if (next_index >= list.length)
                    next_index = 0;
                selected = list[next_index];
                if (!clear_old)
                    Services.event_bus.emit('SYS_SELECTED_MESH', { mesh: selected });
                is_breaked = true;
                break;
            }
        }

        if (!is_breaked) {
            // ситуация когда что-то было выбрано, но в этом списке не оказалось
            selected = list[0];
            if (!clear_old)
                Services.event_bus.emit('SYS_SELECTED_MESH', { mesh: selected });
        }

        if (clear_old) {
            selected_list = list.slice(0);
            Services.event_bus.emit('SYS_SELECTED_MESH_LIST', { list: selected_list });
        }
    }

    function get_selected_list() {
        return selected_list;
    }


    return { init, get_selected_list, set_selected_list };
}