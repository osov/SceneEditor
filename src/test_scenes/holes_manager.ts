import { Vector2 } from "three";
import { Slice9Mesh } from "../render_engine/objects/slice9";
import { IObjectTypes } from "../render_engine/types";
import { Group, Tween } from "@tweenjs/tween.js";
import { createSpatialHash } from "../utils/spatial_hash";
import { WORLD_SCALAR } from "../config";

type CbEnd = () => void;

export function createHolesManager(hole_scale: number) {
    const sp = createSpatialHash(150 * WORLD_SCALAR);
    const view_range = 35;
    const group = new Group();
    let state_cells = false;
    let view_cells: { [k: number]: Slice9Mesh } = {};
    const items: { [id: number]: { pos: Vector2 } } = {};
    let counter = 0;
    const cir = SceneManager.get_mesh_by_id(102)! as Slice9Mesh;

    function add(x: number, y: number) {
        const id = counter++;
        items[id] = { pos: new Vector2(x, y) };
        sp.add({ x, y, width: hole_scale, height: hole_scale, id });
    }


    function hash_anim_alpha(hash: Slice9Mesh, value: number, time: number, cb?: CbEnd) {
        const tween = new Tween({ value: 1 - value });
        tween.to({ value }, time);
        tween.onUpdate(obj => {
            hash.set_alpha(obj.value);
        });
        tween.onComplete(() => {
            group.remove(tween);
        });
        tween.onComplete(() => cb?.());
        group.add(tween.start());
    }

    function toggle_cells() {
        state_cells = !state_cells;
        if (!state_cells) {
            for (const id in view_cells) 
                hide_cell(parseInt(id));
        }
        else {
           // show_cells();
        }
    }

    function show_cells() {
        const list = sp.query_range(cir.position.x, cir.position.y, view_range, view_range);
        const cur_ids: number[] = [];
        for (let i = 0; i < list.length; i++) {
            const it = list[i];
            const id = it.id as number;
            const cell = items[id];
            cur_ids.push(id);
            const _hash = view_cells[id];
            // если нужно показать, но его в списке активных еще нет
            if (cell && !_hash) {
                const d = cell.pos.distanceTo(cir.position);
                const t = d / view_range;
                show_cell(id, t );
            }
        }

        for (const _id in view_cells) {
            const id = parseInt(_id);
            if (!cur_ids.includes(id)) {
                hide_cell(id);
            }
        }
    }

    function hide_cell(id: number) {
        const it = view_cells[id];
        delete view_cells[id];
        hash_anim_alpha(it, 0, 300, () => SceneManager.remove(it.mesh_data.id));
    }

    function show_cell(id: number, t: number, ) {
        const cell = items[id];
     //   setTimeout(() => {
            const m = SceneManager.create(IObjectTypes.GO_SPRITE_COMPONENT, { width: hole_scale * 0.9, height: hole_scale * 0.9 });
            m.set_position(cell.pos.x, cell.pos.y, 3511);
            m.set_texture('h5');
            m.set_alpha(0);
            SceneManager.add(m);
            hash_anim_alpha(m, 1, 300);
            view_cells[id] = m;
      //  }, t * 1000);
    }

    let cell_time = 0;
    function update(dt: number) {
        group.update();
        if (state_cells && System.now_with_ms() > cell_time ){
            cell_time = System.now_with_ms() + 0.3;
            show_cells();
        }

    }


    return { add, update, toggle_cells };
}