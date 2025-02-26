// https://protectwise.github.io/troika/troika-three-text/
import { Vector2, Vector3 } from "three";
import { Text } from 'troika-three-text';
import { IBaseMesh, IObjectTypes } from "../types";
import { convert_width_height_to_pivot_bb, set_pivot_with_sync_pos } from "../helpers/utils";


interface IParameters {
    width: number;
    height: number;
    pivot_x: number;
    pivot_y: number;
    anchor_x: number;
    anchor_y: number;
    color: string;
    font: string;
}

interface SerializeData {
    text: string
    font: string
    font_size: number
}


export class TextMesh extends Text implements IBaseMesh {
    public type = IObjectTypes.TEXT;
    public mesh_data = { id: -1 };
    private parameters: IParameters = {
        width: 1,
        height: 1,
        pivot_x: 0.5,
        pivot_y: 0.5,
        anchor_x: -1,
        anchor_y: -1,
        color: '#fff',
        font: '',
    };

    constructor(text = '', width = 1, height = 1) {
        super();
        this.textAlign = 'center';
        this.anchorX = '50%';
        this.anchorY = '50%';
        this.letterSpacing = 0.013; // 0.013+ есть границы размеров текста maxWidth при которых defold и threeJs расходятся переносы
        this.set_size(width, height, false);
        this.set_text(text);
    }

    set_position(x: number, y: number, z?: number) {
        this.position.set(x, y, z == undefined ? this.position.z : z);
        this.transform_changed();
    }

    get_position() {
        return this.position.clone();
    }

    set_scale(x: number, y: number): void {
        this.scale.set(x, y, this.scale.z);
    }

    get_scale(): Vector2 {
        return new Vector2(this.scale.x, this.scale.y);
    }

    set_size(w: number, h: number, is_sync = true) {
        this.parameters.width = w;
        this.parameters.height = h;
        this.maxWidth = w;
        if (is_sync)
            this.sync();
    }

    get_size() {
        const bb = this._get_bounds();
        const size = new Vector2(Math.abs(bb[2] - bb[0]), Math.abs(bb[3] - bb[1]));
        return size;
    }

    get_anchor() {
        return new Vector2(this.parameters.anchor_x, this.parameters.anchor_y);
    }

    set_anchor(x: number, y: number): void {
        this.parameters.anchor_x = x;
        this.parameters.anchor_y = y;
    }

    set_color(hex_color: string) {
        this.parameters.color = hex_color;
        this.color = hex_color;
    }

    _get_bounds() {
        let br = [0, 0, 0, 0];
        if (this.textRenderInfo && this.textRenderInfo.blockBounds) {
            br = this.textRenderInfo.blockBounds;
        }
        const bb = convert_width_height_to_pivot_bb(this.parameters.width, this.parameters.height, this.parameters.pivot_x, this.parameters.pivot_y);
        return [
            Math.min(br[0], bb[0].x),
            Math.max(br[3], bb[1].y),
            Math.max(br[2], bb[2].x),
            Math.min(br[1], bb[3].y)
        ];
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

    set_pivot(x: number, y: number, is_sync_pos = false, is_sync = false) {
        if (is_sync_pos) {
            const size = this.get_size();
            set_pivot_with_sync_pos(this, size.x, size.y, this.parameters.pivot_x, this.parameters.pivot_y, x, y);
        }
        this.anchorX = `${(x) * 100}%`;
        this.anchorY = `${(1 - y) * 100}%`;
        this.parameters.pivot_x = x;
        this.parameters.pivot_y = y;
        if (x == 0)
            this.textAlign = 'left';
        if (x == 1)
            this.textAlign = 'right';
        if (x == 0.5)
            this.textAlign = 'center';
        if (is_sync)
            this.sync();
    }

    set_text(text: string, is_sync = true) {
        this.text = text;
        if (is_sync)
            this.sync();
    }

    set_font(name: string, is_sync = true) {
        this.font = ResourceManager.get_font(name);
        this.parameters.font = name;
        if (is_sync)
            this.sync();
    }

    get_texture() {
        return ['', ''];
    }

    set_texture(name: string, atlas = '') {
    }

    set_active(val: boolean) {
        this.visible = val;
    }

    get_active() {
        return this.visible;
    }

    set_visible(val: boolean) {
        this.geometry.setDrawRange(0, val ? Infinity : 0);
    }

    get_visible() {
        return this.geometry.drawRange.count != 0;
    }

    serialize(): SerializeData {
        return { text: this.text, font: this.parameters.font, font_size: this.fontSize };
    }

    deserialize(data: SerializeData) {
        this.fontSize = data.font_size;
        this.set_font(data.font, false);
        this.set_text(data.text);
    }

    transform_changed() {

    }
}