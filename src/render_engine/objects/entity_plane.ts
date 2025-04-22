import { Vector2 } from "three";
import { IBaseMesh } from "../types";
import { convert_width_height_to_pivot_bb, set_pivot_with_sync_pos } from "../helpers/utils";
import { EntityBase } from "./entity_base";
import { WORLD_SCALAR } from "../../config";


export class EntityPlane extends EntityBase implements IBaseMesh {

    set_pivot(x: number, y: number, is_sync = false) {
        if (is_sync) {
            const size = this.get_size();
            set_pivot_with_sync_pos(this, size.x, size.y, this.parameters.pivot_x, this.parameters.pivot_y, x, y);
        }
        this.parameters.pivot_x = x;
        this.parameters.pivot_y = y;
        this.set_size(this.parameters.width, this.parameters.height);
    }

    set_size(w: number, h: number) {
        const bb = convert_width_height_to_pivot_bb(w, h, this.parameters.pivot_x, this.parameters.pivot_y);
        const geometry = this.geometry;
        geometry.attributes['position'].array[0] = bb[1].x;
        geometry.attributes['position'].array[1] = bb[1].y;

        geometry.attributes['position'].array[3] = bb[2].x;
        geometry.attributes['position'].array[4] = bb[2].y;

        geometry.attributes['position'].array[6] = bb[0].x;
        geometry.attributes['position'].array[7] = bb[0].y;

        geometry.attributes['position'].array[9] = bb[3].x;
        geometry.attributes['position'].array[10] = bb[3].y;
        geometry.attributes['position'].needsUpdate = true;
        geometry.computeBoundingSphere();
        this.parameters.width = w;
        this.parameters.height = h;
        this.transform_changed();
    }

    set_color(hex_color: string) {
        this.parameters.color = hex_color;
    }

    get_color() {
        return this.parameters.color;
    }

    set_slice(width: number, height: number) {
        this.parameters.slice_width = width;
        this.parameters.slice_height = height;
    }

    get_slice() {
        return new Vector2(this.parameters.slice_width, this.parameters.slice_height);
    }


    serialize() {
        const data: any = {};
        const size = this.get_size();
        const pivot = this.get_pivot();
        const color = this.get_color();

        // NOTE: только если не 32 * WORLD_SCALAR
        if (size.x !== 32 * WORLD_SCALAR || size.y !== 32 * WORLD_SCALAR) {
            data.size = size.toArray();
        }

        // NOTE: только если не #fff
        if (color !== '#fff') {
            data.color = color;
        }

        // NOTE: только если не (0.5, 0.5)
        if (pivot.x !== 0.5 || pivot.y !== 0.5) {
            data.pivot = pivot;
        }

        // NOTE: только если не true
        if (!this.get_active()) {
            data.active = false;
        }

        return data;
    }

    deserialize(_data: any) {
        this.set_pivot(0.5, 0.5, false);
        this.set_size(32 * WORLD_SCALAR, 32 * WORLD_SCALAR);
        this.set_color('#fff');
        this.set_active(true);

        if (_data.pivot) {
            this.set_pivot(_data.pivot.x, _data.pivot.y, false);
        }
        if (_data.size) {
            this.set_size(_data.size[0], _data.size[1]);
        }
        if (_data.color) {
            this.set_color(_data.color);
        }
        if (_data.active != undefined) {
            this.set_active(_data.active);
        }
    }
}