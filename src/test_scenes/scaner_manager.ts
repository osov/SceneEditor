import { randInt, randFloat } from "three/src/math/MathUtils.js";
import { Slice9Mesh } from "../render_engine/objects/slice9";
import { IObjectTypes } from "../render_engine/types";
import { Group, Tween } from "@tweenjs/tween.js";
import { Vector2 } from "three";

const min_stone = 2;
const max_stone = 3;

interface ItemData {
    position: Vector2
}

interface BlinkData {
    _hash: Slice9Mesh;
    x: number;
    y: number;
}

export function Scanner() {
    const group = new Group();
    const fade_dist = 40;
    const max_dist = 60;
    const speed = 30;
    const a = 1; const b = 0.66;
    let next_dist = 3;
    let is_active = false;
    let s = 0.01;
    let alpha = 1;
    const actived_list: BlinkData[] = [];
    const items: ItemData[] = [];

    const cir = SceneManager.get_mesh_by_id(103)! as Slice9Mesh;
    let cx = 0;
    let cy = 0;
    cir.set_size(0, 0);

    function do_scan(x: number, y: number) {
        s = 0.01;
        alpha = 1;
        next_dist = randFloat(5, 10);
        is_active = true;
        cir.set_size(s, s);
        cir.set_alpha(a);

        cir.set_position(x, y)
        cx = cir.position.x;
        cy = cir.position.y;
    }

    function do_scanning(dt: number) {
        if (is_active) {
            s += speed * dt;
            const ra = a * s * 0.5;
            const rb = b * s * 0.5;
            if (s <= fade_dist) {
                if (s >= next_dist) {
                    next_dist += randFloat(2, 5);
                    for (let i = 1; i <= 1; i++) {
                        const p = get_point(ra, rb, randFloat(0, Math.PI * 2));
                        add_obstacle(cx + p.x, cy + p.y, randFloat(800, 1500), randInt(1, 100) > 70 ? '#efe' : '#fff');
                    }
                }
                for (let i = 0; i < items.length; i++) {
                    const it = items[i];
                    if (is_in_border(it.position.x, it.position.y, cx, cy, ra, rb)) {
                        add_obstacle(it.position.x, it.position.y, randFloat(800, 1500), '#cfc');
                    }
                }
            }
            cir.set_size(a * s, b * s);
            if (s > fade_dist) {
                alpha = 1 - (s - fade_dist) / (max_dist - fade_dist);
                if (alpha < 0)
                    alpha = 0;
                cir.set_alpha(alpha);
            }
            if (s > max_dist) {
                is_active = false;
            }
        }
    }

    function add_item(item: ItemData) {
        items.push(item);
    }


    function add_obstacle(x: number, y: number, time = 1, clr = '#fff') {
        for (let i = 0; i < actived_list.length; i++) {
            const it = actived_list[i];
            if (it.x == x && it.y == y)
                return;
        }
        const size = get_rand_size();
        const m = SceneManager.create(IObjectTypes.GO_SPRITE_COMPONENT, { width: size, height: size });
        m.set_position(x, y, 3511);
        m.set_texture(get_rand_stone());
        m.rotateZ(Math.random() * Math.PI * 2);
        SceneManager.add(m);

        const bd = { _hash: m, x, y };
        actived_list.push(bd);
        blink_item(bd, time, clr);
    }

    function del_active_list(x: number, y: number) {
        for (let i = 0; i < actived_list.length; i++) {
            const it = actived_list[i];
            if (it.x == x && it.y == y) {
                actived_list.splice(i, 1);
                return;
            }
        }
    }


    function blink_item(bd: BlinkData, time: number, clr: string) {
        const _hash = bd._hash;
        _hash.set_color('#fff');
        _hash.set_alpha(0);
        const tween = new Tween({ value: 0 });
        tween.to({ value: 1 }, time);
        tween.onUpdate(obj => _hash.set_alpha(obj.value));
        tween.onComplete(() => {
            group.remove(tween);
            _hash.set_color(clr);
            const tween2 = new Tween({ value: 1 });
            tween2.to({ value: 0 }, time * 0.3);
            tween2.onUpdate(obj => _hash.set_alpha(obj.value));
            tween2.onComplete(() => {
                group.remove(tween2);
                del_active_list(bd.x, bd.y);
                SceneManager.remove(_hash.mesh_data.id);
            });
            group.add(tween2.start());
        });
        group.add(tween.start());
    }


    function update(dt: number) {
        group.update();
        do_scanning(dt);
    }

    return { do_scan, update, add_item };
}


export function get_rand_stone() {
    return 's' + randInt(min_stone, max_stone);
}

export function get_rand_size() {
    return randFloat(1, 4);
}

function get_point(a: number, b: number, theta: number) {
    return {
        x: a * Math.cos(theta),
        y: b * Math.sin(theta),
    }
}

function is_in_border(objX: number, objY: number, cx: number, cy: number, rx: number, ry: number, tolerance = 0.05) {
    const dx = (objX - cx) / rx;
    const dy = (objY - cy) / ry;
    const d = dx * dx + dy * dy;
    return Math.abs(d - 1) < tolerance;
}