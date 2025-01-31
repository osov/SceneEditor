import { ShaderMaterial, Vector2, PlaneGeometry, Color, Vector3, Mesh } from "three";
import { IBaseMesh, IObjectTypes } from "../types";
import { convert_width_height_to_pivot_bb, set_pivot_with_sync_pos } from "../helpers/utils";

// todo optimize material list + attributes color
// todo set visible only mesh(visible+enabled)

export const slice_9_shader = {
    vertexShader: `
        varying vec2 texCoord;
            void main() {
                texCoord = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }`,

    fragmentShader: `
        varying vec2 texCoord;

        uniform sampler2D tex;
        uniform vec2 u_dimensions;
        uniform vec2 u_border;
        uniform vec3 u_color;

        float map(float value, float originalMin, float originalMax, float newMin, float newMax) {
            return (value - originalMin) / (originalMax - originalMin) * (newMax - newMin) + newMin;
        }

        float processAxis(float coord, float textureBorder, float windowBorder) {
            if (coord < windowBorder)
                return map(coord, 0., windowBorder, 0., textureBorder) ;
            if (coord < 1. - windowBorder) 
                return map(coord,  windowBorder, 1. - windowBorder, textureBorder, 1. - textureBorder);
            return map(coord, 1. - windowBorder, 1., 1. - textureBorder, 1.);
        } 

        void main(void) {
            vec2 newUV = vec2(
                processAxis(texCoord.x, u_border.x, u_dimensions.x),
                processAxis(texCoord.y, u_border.y, u_dimensions.y)
            );

            gl_FragColor = texture2D(tex, newUV) * vec4(u_color, 1.);
        }`
};

export const simple_shader = {
    vertexShader: `
            void main() {
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }`,

    fragmentShader: `
        uniform vec3 u_color;
        void main(void) {
            gl_FragColor =  vec4(u_color, 1.);
        }`
};

interface IParameters {
    width: number;
    height: number;
    pivot_x: number;
    pivot_y: number;
    anchor_x: number;
    anchor_y: number;
    slice_width: number;
    slice_height: number;
    color: string;
    clip_width: number;
    clip_height: number;
    texture: string;
    atlas: string
}

interface SerializeData {
    slice_width: number;
    slice_height: number;
    atlas: string;
    texture: string
}

export function CreateSlice9(material: ShaderMaterial, width = 1, height = 1, slice_width = 0, slice_height = 0) {
    const parameters: IParameters = {
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

    function update_parameters() {
        if (material.uniforms && material.uniforms['u_dimensions']) {
            material.uniforms['u_dimensions'].value.set(parameters.slice_width / parameters.width, parameters.slice_height / parameters.height);
            material.uniforms['u_border'].value.set(parameters.slice_width / parameters.clip_width, parameters.slice_height / parameters.clip_height);
        }
    }

    function set_texture(name: string, atlas = '') {
        parameters.texture = name;
        parameters.atlas = atlas;
        let texture = name == '' ? null : ResourceManager.get_texture(name, atlas);
        material.uniforms['tex'].value = texture;
        if (texture) {
            parameters.clip_width = texture.image.width;
            parameters.clip_height = texture.image.height;
            material.vertexShader = slice_9_shader.vertexShader;
            material.fragmentShader = slice_9_shader.fragmentShader;
        }
        else {
            parameters.clip_width = 1;
            parameters.clip_height = 1;
            material.vertexShader = simple_shader.vertexShader;
            material.fragmentShader = simple_shader.fragmentShader;
        }
        material.needsUpdate = true;
        update_parameters();
    }



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

    function set_slice(width: number, height: number) {
        parameters.slice_width = width;
        parameters.slice_height = height;
        update_parameters();
    }

    function set_color(hex_color: string) {
        parameters.color = hex_color;
        material.uniforms['u_color'].value.set(new Color(hex_color));
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
        return {
            slice_width: parameters.slice_width,
            slice_height: parameters.slice_height,
            texture: parameters.texture,
            atlas: parameters.atlas
        };
    }

    function deserialize(data: SerializeData) {
        set_texture(data.texture, data.atlas);
        set_slice(data.slice_width, data.slice_height);
    }

    return { set_size, set_slice, set_color, set_texture, get_bounds, set_pivot, set_anchor, serialize, deserialize, geometry, parameters };
}


export class Slice9Mesh extends Mesh implements IBaseMesh {
    public type = IObjectTypes.SLICE9_PLANE;
    public mesh_data = { id: -1 };
    private template: ReturnType<typeof CreateSlice9>;

    constructor(width = 1, height = 1, slice_width = 0, slice_height = 0, custom_material?: ShaderMaterial) {
        super();
        const material = custom_material ? custom_material : new ShaderMaterial({
            uniforms: {
                tex: { value: null },
                u_dimensions: { value: new Vector2(1, 1) },
                u_border: { value: new Vector2(1, 1) },
                u_color: { value: new Color('#fff') },
            },
            vertexShader: simple_shader.vertexShader,
            fragmentShader: simple_shader.fragmentShader,
            transparent: true

        });
        this.template = CreateSlice9(material, width, height, slice_width, slice_height);
        this.material = material;
        this.geometry = this.template.geometry;
        this.set_size(width, height);
    }

    set_size(w: number, h: number) {
        this.template.set_size(w, h);
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
        return this.template.serialize();
    }

    deserialize(data: any) {
        this.template.deserialize(data);
    }


}   