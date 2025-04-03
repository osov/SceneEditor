import { ShaderMaterial, Vector2, PlaneGeometry, Color, Vector3, BufferAttribute } from "three";
import { IBaseParameters, IObjectTypes } from "../types";
import { convert_width_height_to_pivot_bb, set_pivot_with_sync_pos } from "../helpers/utils";
import { EntityPlane } from "./entity_plane";

// todo optimize material list

export const shader = {
    vertexShader: `
        attribute vec4 uvData; 
        attribute vec3 color;  
#ifdef USE_SLICE
        attribute vec4 sliceData; 
        varying vec4 vSliceData; 
#endif
        varying vec2 vUv;
        varying vec4 vUvData;
        varying vec3 vColor; 
        

        void main() {
            vColor = color;
            vUv = uv; 
            vUvData = uvData;
#ifdef USE_SLICE
            vSliceData = sliceData;
#endif
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,

    fragmentShader: `
        varying vec2 vUv;
        varying vec4 vUvData;
        varying vec3 vColor; 
#ifdef USE_TEXTURE
        uniform sampler2D u_texture;
#endif
#ifdef USE_SLICE
        varying vec4 vSliceData; 

        float map(float value, float originalMin, float originalMax, float newMin, float newMax) {
            return (value - originalMin) / (originalMax - originalMin) * (newMax - newMin) + newMin;
        }

        float processAxis(float coord, float texBorder, float winBorder) {
            return (coord < winBorder) ? map(coord, 0.0, winBorder, 0.0, texBorder) :
                (coord > (1.0 - winBorder)) ? map(coord, 1.0 - winBorder, 1.0, 1.0 - texBorder, 1.0) :
                map(coord, winBorder, 1.0 - winBorder, texBorder, 1.0 - texBorder);
        }

#endif
        uniform float alpha;

        void main(void) {
#ifdef USE_SLICE
            vec2 newUV = vec2(
                processAxis(vUv.x, vSliceData.z, vSliceData.x),
                processAxis(vUv.y, vSliceData.w, vSliceData.y)
            );
#else
            vec2 newUV = vUv;
#endif
            newUV = vUvData.xy + newUV * vUvData.zw;
#ifdef USE_TEXTURE
            vec4 color = texture2D(u_texture, newUV);
            //  if (color.a < 0.5) discard;
            gl_FragColor = color * vec4(vColor, alpha);
#else
            gl_FragColor = vec4(vColor, alpha);
#endif
        }`
};

interface SerializeData {
    slice_width?: number;
    slice_height?: number;
    atlas?: string;
    texture?: string;
    alpha?: number;
}

export function CreateSlice9(material: ShaderMaterial, width = 1, height = 1, slice_width = 0, slice_height = 0) {
    const parameters: IBaseParameters = {
        pivot_x: 0.5,
        pivot_y: 0.5,
        anchor_x: -1,
        anchor_y: -1,
        width,
        height,
        slice_width,
        slice_height,
        color: '#fff',
        clip_width: 1,
        clip_height: 1,
        texture: '',
        atlas: ''
    }
    const geometry = new PlaneGeometry(width, height);
    const uvData = new Float32Array([
        0, 0, 1, 1,
        0, 0, 1, 1,
        0, 0, 1, 1,
        0, 0, 1, 1,
    ]);
    const a_color = new Float32Array([
        1, 1, 1,
        1, 1, 1,
        1, 1, 1,
        1, 1, 1,
    ]);
    const slice_data = new Float32Array([
        0, 0, 1, 1,
        0, 0, 1, 1,
        0, 0, 1, 1,
        0, 0, 1, 1,
    ]);
    geometry.setAttribute("uvData", new BufferAttribute(uvData, 4));
    geometry.setAttribute("color", new BufferAttribute(a_color, 3));
    geometry.setAttribute("sliceData", new BufferAttribute(slice_data, 4));

    function set_size(w: number, h: number) {
        const bb = convert_width_height_to_pivot_bb(w, h, parameters.pivot_x, parameters.pivot_y);
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
        parameters.width = w;
        parameters.height = h;
        update_parameters();
    }

    function update_parameters() {
        const u_dimensions_x = parameters.slice_width / parameters.width;
        const u_dimensions_y = parameters.slice_height / parameters.height;
        const u_border_x = parameters.slice_width / parameters.clip_width;
        const u_border_y = parameters.slice_height / parameters.clip_height;
        for (let i = 0; i < 4; i++)
            geometry.attributes['sliceData'].setXYZW(i, u_dimensions_x, u_dimensions_y, u_border_x, u_border_y);
        geometry.attributes['sliceData'].needsUpdate = true;
        if (parameters.slice_width > 0 || parameters.slice_height > 0) {
            if (material.defines['USE_SLICE'] == undefined) {
                material.defines['USE_SLICE'] = '';
                material.needsUpdate = true;
            }
        }
        else {
            if (material.defines['USE_SLICE'] != undefined) {
                delete material.defines['USE_SLICE'];
                material.needsUpdate = true;
            }
        }
        if (parameters.texture == '') {
            if (material.defines['USE_TEXTURE'] != undefined) {
                delete material.defines['USE_TEXTURE'];
                material.needsUpdate = true;
            }
        }
        else if (material.defines['USE_TEXTURE'] == undefined) {
            material.defines['USE_TEXTURE'] = '';
            material.needsUpdate = true;
        }
    }


    function set_texture(name: string, atlas = '') {
        parameters.texture = name;
        parameters.atlas = atlas;
        //Log.log('set_texture', name, atlas);
        if (name != '') {
            const texture_data = ResourceManager.get_texture(name, atlas);
            material.uniforms['u_texture'].value = texture_data.texture;
            parameters.clip_width = texture_data.size.x;
            parameters.clip_height = texture_data.size.y;
            for (let i = 0; i < 4; i++) {
                geometry.attributes['uvData'].array[4 * i] = texture_data.uvOffset.x;
                geometry.attributes['uvData'].array[4 * i + 1] = texture_data.uvOffset.y;
                geometry.attributes['uvData'].array[4 * i + 2] = texture_data.uvScale.x;
                geometry.attributes['uvData'].array[4 * i + 3] = texture_data.uvScale.y;
            }
            geometry.attributes['uvData'].needsUpdate = true;
        }
        else {
            material.uniforms['u_texture'].value = null;
            parameters.clip_width = 1;
            parameters.clip_height = 1;
        }
        update_parameters();
    }

    function set_slice(width: number, height: number) {
        parameters.slice_width = width;
        parameters.slice_height = height;
        update_parameters();
    }

    function set_color(hex_color: string) {
        parameters.color = hex_color;
        const clr = new Color(hex_color);
        for (let i = 0; i < 4; i++) {
            geometry.attributes['color'].array[3 * i] = clr.r;
            geometry.attributes['color'].array[3 * i + 1] = clr.g;
            geometry.attributes['color'].array[3 * i + 2] = clr.b;
        }
        geometry.attributes['color'].needsUpdate = true;
    }

    function get_bounds(wp: Vector3, ws: Vector3) {
        const bb = convert_width_height_to_pivot_bb(parameters.width, parameters.height, parameters.pivot_x, parameters.pivot_y);
        // left top right bottom
        return [
            wp.x + bb[0].x * ws.x,
            wp.y + bb[1].y * ws.y,
            wp.x + bb[2].x * ws.x,
            wp.y + bb[3].y * ws.y
        ];
    }

    function set_pivot(x: number, y: number) {
        parameters.pivot_x = x;
        parameters.pivot_y = y;
    }

    function set_anchor(x: number, y: number) {
        parameters.anchor_x = x;
        parameters.anchor_y = y;
    }

    function serialize(): SerializeData {
        const data: SerializeData = {};

        if (parameters.slice_width !== 0) {
            data.slice_width = parameters.slice_width;
        }
        if (parameters.slice_height !== 0) {
            data.slice_height = parameters.slice_height;
        }
        if (parameters.texture !== '') {
            data.texture = parameters.texture;
        }
        if (parameters.atlas !== '') {
            data.atlas = parameters.atlas;
        }

        return data;
    }

    function deserialize(data: SerializeData) {
        // NOTE: сначала устанавливаем значения по умолчанию
        set_slice(0, 0);
        set_texture('', '');

        // NOTE: затем переопределяем значения
        if (data.slice_width !== undefined) {
            parameters.slice_width = data.slice_width;
        }
        if (data.slice_height !== undefined) {
            parameters.slice_height = data.slice_height;
        }
        if (data.texture !== undefined || data.atlas !== undefined) {
            set_texture(data.texture || '', data.atlas || '');
        }
        update_parameters();
    }

    return { set_size, set_slice, set_color, set_texture, get_bounds, set_pivot, set_anchor, serialize, deserialize, geometry, parameters };
}


export class Slice9Mesh extends EntityPlane {
    public type = IObjectTypes.SLICE9_PLANE;
    public mesh_data = { id: -1 };
    private template: ReturnType<typeof CreateSlice9>;
    private _alpha: number = 1.0;

    constructor(width = 1, height = 1, slice_width = 0, slice_height = 0, custom_material?: ShaderMaterial) {
        super();
        this.matrixAutoUpdate = true;
        const material = custom_material ? custom_material : new ShaderMaterial({
            uniforms: {
                u_texture: { value: null },
                alpha: { value: 1.0 }
            },
            vertexShader: shader.vertexShader,
            fragmentShader: shader.fragmentShader,
            transparent: true
        });
        this.template = CreateSlice9(material, width, height, slice_width, slice_height);
        this.material = material;
        this.geometry = this.template.geometry;
        this.set_size(width, height);
    }

    get_alpha(): number {
        return this._alpha;
    }

    set_alpha(value: number) {
        this._alpha = value;
        (this.material as ShaderMaterial).uniforms.alpha.value = value;
    }

    set_size(w: number, h: number) {
        this.template.set_size(w, h);
        this.transform_changed();
    }

    get_size() {
        return new Vector2(this.template.parameters.width, this.template.parameters.height);
    }

    set_color(hex_color: string) {
        this.template.set_color(hex_color);
    }

    set_slice(width: number, height: number) {
        this.template.set_slice(width, height);
    }

    get_slice() {
        return new Vector2(this.template.parameters.slice_width, this.template.parameters.slice_height);
    }

    get_texture() {
        return [this.template.parameters.texture, this.template.parameters.atlas];
    }

    set_texture(name: string, atlas = '') {
        this.template.set_texture(name, atlas);
    }

    get_bounds() {
        const wp = new Vector3();
        const ws = new Vector3();
        this.getWorldPosition(wp);
        this.getWorldScale(ws);
        return this.template.get_bounds(wp, ws);
    }

    get_color() {
        return this.template.parameters.color;
    }

    set_pivot(x: number, y: number, is_sync = false) {
        if (is_sync) {
            const size = this.get_size();
            set_pivot_with_sync_pos(this, size.x, size.y, this.template.parameters.pivot_x, this.template.parameters.pivot_y, x, y);
        }
        else
            this.template.set_pivot(x, y);
        this.template.set_size(this.get_size().x, this.get_size().y);
        this.transform_changed();
    }

    get_pivot() {
        return new Vector2(this.template.parameters.pivot_x, this.template.parameters.pivot_y);
    }

    get_anchor() {
        return new Vector2(this.template.parameters.anchor_x, this.template.parameters.anchor_y);
    }

    set_anchor(x: number, y: number): void {
        this.template.set_anchor(x, y);
    }

    serialize() {
        const data: SerializeData = { ...super.serialize(), ...this.template.serialize() };

        // NOTE: только если не 1.0
        if (this._alpha !== 1.0) {
            data.alpha = this._alpha;
        }

        return data;
    }

    deserialize(data: SerializeData) {
        super.deserialize(data);
        this.template.deserialize(data);

        // NOTE: сначала устанавливаем значение по умолчанию
        this._alpha = 1.0;

        // NOTE: затем переопределяем значение
        if (data.alpha !== undefined) {
            this.set_alpha(data.alpha);
        }
    }
}   