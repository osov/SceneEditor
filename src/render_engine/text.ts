import { Vector2, Vector3 } from "three";
import { Text } from 'troika-three-text';
import { IBaseMesh, IObjectTypes } from "./types";
import { convert_width_height_to_pivot_bb, set_pivot_with_sync_pos } from "./helpers/utils";

interface IParameters {
    width: number;
    height: number;
    pivot_x: number;
    pivot_y: number;
    color: string;
}

interface SerializeData {

}


export class TextMesh extends Text implements IBaseMesh {
    public type = IObjectTypes.TEXT;
    public mesh_data = { id: -1 };
    private parameters: IParameters = {
        width: 1,
        height: 1,
        pivot_x: 0.5,
        pivot_y: 0.5,
        color: '#fff'
    };

    constructor(text = '', width = 1, height = 1) {
        super();
        this.text = text;
        this.textAlign = 'center';
        this.anchorX = '50%';
        this.anchorY = '50%';
        // this.letterSpacing = 0.013; // 0.013+ есть границы размеров текста maxWidth при которых defold и threeJs расходятся переносы
        this.set_size(width, height);
    }

    set_size(w: number, h: number) {
        this.parameters.width = w;
        this.parameters.height = h;
        this.maxWidth = w;
        this.sync();
    }

    get_size() {
        const bb = this._get_bounds();
        const size = new Vector2(Math.abs(bb[2] - bb[0]), Math.abs(bb[3] - bb[1]));
        return size;
    }

    set_color(hex_color: string) {
        this.color = hex_color;
    }

    _get_bounds() {
        if (this.textRenderInfo.blockBounds) {
            const br = this.textRenderInfo.blockBounds;
            const bb = convert_width_height_to_pivot_bb(this.parameters.width, this.parameters.height, this.parameters.pivot_x, this.parameters.pivot_y);
            return [
                Math.min(br[0], bb[0].x),
                Math.max(br[3], bb[1].y),
                Math.max(br[2], bb[2].x),
                Math.min(br[1], bb[3].y)
            ];
        }
        return [0, 0, 0, 0]
    }

    get_bounds() {
        const wp = new Vector3();
        const ws = new Vector3();
        this.getWorldPosition(wp);
        this.getWorldScale(ws);
        const bb = this._get_bounds();
        return [
            wp.x + bb[0] * ws.x,
            wp.y + bb[1] * ws.y,
            wp.x + bb[2] * ws.x,
            wp.y + bb[3] * ws.y
        ]
    }

    get_color() {
        return this.parameters.color;
    }

    get_pivot() {
        return new Vector2(this.parameters.pivot_x, this.parameters.pivot_y);
    }

    set_pivot(x: number, y: number, is_sync = false) {
        if (is_sync){
            const size = this.get_size();
            set_pivot_with_sync_pos(this, size.x, size.y, this.parameters.pivot_x, this.parameters.pivot_y, x, y);
        }
        this.anchorX = `${(x) * 100}%`;
        this.anchorY = `${(1 - y) * 100}%`;
        this.parameters.pivot_x = x;
        this.parameters.pivot_y = y;
        this.sync();
    }

    serialize(): SerializeData {
        return {};
    }

    deserialize(data: SerializeData) {

    }
}