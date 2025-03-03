import { Vector2, Vector3 } from "three";
import { IBaseMesh } from "../types";
import { convert_width_height_to_pivot_bb, set_pivot_with_sync_pos } from "../helpers/utils";
import { EntityBase } from "./entity_base";


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

    set_texture(name: string, atlas = '') {
        this.parameters.texture = name;
        this.parameters.atlas = atlas;
    }

    get_texture() {
        return [this.parameters.texture, this.parameters.atlas];
    }


    serialize() {
        return {
            size: this.get_size().toArray(),
            color: this.get_color(),
            pivot: this.get_pivot(),
        };
    }

    deserialize(_data: any) {
        this.set_pivot(_data.pivot.x, _data.pivot.y, false);
        this.set_size(_data.size[0], _data.size[1]);
        this.set_color(_data.color);
    }

}