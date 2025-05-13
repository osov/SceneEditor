import { Vector2 } from "three";
import { EntityBase } from "../objects/entity_base";
import { IBaseEntityAndThree } from "../types";
import { lerp } from "../helpers/utils";

export function CmpMover(cmp_mesh: EntityBase) {
    cmp_mesh.userData = { p1: new Vector2(), p2: new Vector2(), s: 1 };
    const config: { p1: Vector2, p2: Vector2, s: number } = cmp_mesh.userData as any;

    function init() {
        let dir = 1;
        let t = 0;
        const p1 = new Vector2();
        const p2 = new Vector2();

        setTimeout(() => {
            const base_pos = cmp_mesh.parent!.position.clone();
            EventBus.on('SYS_ON_UPDATE', (e) => {
                p1.x = base_pos.x + config.p1.x;
                p1.y = base_pos.y + config.p1.y;
                p2.x = base_pos.x + config.p2.x;
                p2.y = base_pos.y + config.p2.y;

               const t_raw = (System.now_with_ms() * config.s) % 2; // 0..2
                const t = t_raw < 1 ? t_raw : 2 - t_raw; // зеркалка: 0→1→0

                const x = lerp(p1.x, p2.x, t);
                const y = lerp(p1.y, p2.y, t);
                if (cmp_mesh && cmp_mesh.parent)
                    (cmp_mesh.parent as IBaseEntityAndThree).set_position(x, y);
            })
        }, 100);
    }



    function serialize() {
        return config;
    }

    function deserialize(_data: any) {
        config.p1 = _data.p1;
        config.p2 = _data.p2;
        config.s = _data.s;
    }


    return {
        init,
        serialize,
        deserialize
    }
}