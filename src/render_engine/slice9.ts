import { Texture, ShaderMaterial, Vector2, PlaneGeometry, Color, Vector3, BufferGeometry, Object3D, Intersection, Raycaster, Sphere, Mesh } from "three";

const slice_9_shader = {
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

const simple_shader = {
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
    slice_width: number;
    slice_height: number;
    color: string;
    clip_width: number;
    clip_height: number;
}

export function Slice9(material: ShaderMaterial, width = 1, height = 1, slice_width = 0, slice_height = 0) {
    const parameters: IParameters = {
        width,
        height,
        slice_width,
        slice_height,
        color: '#fff',
        clip_width: 1,
        clip_height: 1
    }

    const geometry = new PlaneGeometry(width, height);

    function update_parameters() {
        material.uniforms['u_dimensions'].value.set(parameters.slice_width / parameters.width, parameters.slice_height / parameters.height);
        material.uniforms['u_border'].value.set(parameters.slice_width / parameters.clip_width, parameters.slice_height / parameters.clip_height);
    }

    function set_texture(texture: Texture | null) {
        material.uniforms['tex'].value = texture;
        if (texture) {
            parameters.clip_width = texture.image.width;
            parameters.clip_height = texture.image.height;
        }
        else {
            parameters.clip_width = 1;
            parameters.clip_height = 1;
        }
        if (texture) {
            material.vertexShader = slice_9_shader.vertexShader;
            material.fragmentShader = slice_9_shader.fragmentShader;
        }
        else {
            material.vertexShader = simple_shader.vertexShader;
            material.fragmentShader = simple_shader.fragmentShader;
        }
        material.needsUpdate = true;
        update_parameters();
    }

    function set_size(w: number, h: number) {
        geometry.attributes['position'].array[0] = -w / 2;
        geometry.attributes['position'].array[1] = h / 2;

        geometry.attributes['position'].array[3] = w / 2;
        geometry.attributes['position'].array[4] = h / 2;

        geometry.attributes['position'].array[6] = -w / 2;
        geometry.attributes['position'].array[7] = -h / 2;

        geometry.attributes['position'].array[9] = w / 2;
        geometry.attributes['position'].array[10] = -h / 2;
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
        // left top right bottom
        return [
            wp.x - parameters.width / 2 * ws.x,
            wp.y + parameters.height / 2 * ws.y,
            wp.x + parameters.width / 2 * ws.x,
            wp.y - parameters.height / 2 * ws.y
        ];
    }

    return { set_size, set_slice, set_color, set_texture, get_bounds, geometry, parameters };
}


export class Slice9Mesh extends Mesh {
    private template: ReturnType<typeof Slice9>;
    public parameters: IParameters;

    constructor(width = 1, height = 1, slice_width = 0, slice_height = 0) {
        super();
        (this as any).type = 'Slice9Mesh';
        const material = new ShaderMaterial({
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
        this.template = Slice9(material, width, height, slice_width, slice_height);
        this.parameters = this.template.parameters;
        this.material = material;
        this.geometry = this.template.geometry;
    }

    set_slice(width: number, height: number) {
        this.template.set_slice(width, height);
    }

    set_color(hex_color: string) {
        this.template.set_color(hex_color);
    }

    set_size(w: number, h: number) {
        this.template.set_size(w, h);
    }

    set_texture(texture: Texture | null) {
        this.template.set_texture(texture);
    }

    get_bounds() {
        const wp = new Vector3();
        const ws = new Vector3();
        this.getWorldPosition(wp);
        this.getWorldScale(ws);
        return this.template.get_bounds(wp, ws);
    }


}