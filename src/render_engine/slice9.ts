import { Texture, ShaderMaterial, Vector2, PlaneGeometry, BufferGeometry, Mesh, Vector4, Color, Vector3 } from "three";

const vertexShader = `
varying vec2 texCoord;
        void main() {
            texCoord = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`;

const fragmentShader = `
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
}`;

export function Slice9(texture: Texture, width = 1, height = 1, slice_width = 0, slice_height = 0) {
    const parameters = {
        width,
        height,
        slice_width,
        slice_height,
        color: '#fff',
    }
    const clip_w = texture.image.width;
    const clip_h = texture.image.height;
    const material = new ShaderMaterial({
        uniforms: {
            tex: { value: texture },
            u_dimensions: { value: new Vector2(parameters.slice_width / parameters.width, parameters.slice_height / parameters.height) },
            u_border: { value: new Vector2(parameters.slice_width / clip_w, parameters.slice_height / clip_h) },
            u_color: { value: new Color(parameters.color) },
        },
        vertexShader,
        fragmentShader,
        transparent: true

    });
    const geometry = new PlaneGeometry(width, height);
    const mesh = new Mesh(geometry, material);
    mesh.userData = { type: 'slice9' };

    function update_parameters() {
        material.uniforms['u_dimensions'].value.set(parameters.slice_width / parameters.width, parameters.slice_height / parameters.height);
        material.uniforms['u_border'].value.set(parameters.slice_width / clip_w, parameters.slice_height / clip_h);
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
        parameters.width = w;
        parameters.height = h;
        update_parameters();
    }

    function set_slice(w: number, h: number) {
        parameters.slice_width = w;
        parameters.slice_height = h;
        update_parameters();
    }

    function set_color(hex_color: string) {
        parameters.color = hex_color;
        material.uniforms['u_color'].value.set(new Color(hex_color));
    }

    function get_bounds() {
        const wp = new Vector3();
        mesh.getWorldPosition(wp);
        // left top right bottom
        return [
            wp.x - parameters.width,
            wp.y + parameters.height,
            wp.x + parameters.width,
            wp.y - parameters.height
        ];
    }

    return { mesh, set_size, set_slice, set_color, get_bounds, parameters };
}