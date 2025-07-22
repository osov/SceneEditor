import { ShaderMaterial, Vector2, PlaneGeometry, Color, Vector3, BufferAttribute, Texture, NormalBlending, NoColorSpace } from "three";
import { IBaseParameters, IObjectTypes } from "../types";
import { convert_width_height_to_pivot_bb, get_file_name, set_pivot_with_sync_pos } from "../helpers/utils";
import { EntityPlane } from "./entity_plane";
import { MaterialUniformType } from "../resource_manager";
import { hex2rgba, rgb2hex } from "@editor/defold/utils";
import { BlendMode } from "@editor/inspectors/MeshInspector";

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

export interface Slice9SerializeData {
    slice_width?: number;
    slice_height?: number;
    material_name?: string;
    blending?: number;
    material_uniforms?: { [key: string]: any };
    layers?: number;
}

export function CreateSlice9(mesh: Slice9Mesh, material: ShaderMaterial, width = 1, height = 1, slice_width = 0, slice_height = 0) {
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
        for (let i = 0; i < 4; i++) {
            geometry.attributes['sliceData'].setXYZW(i, u_dimensions_x, u_dimensions_y, u_border_x, u_border_y);
        }
        geometry.attributes['sliceData'].needsUpdate = true;

        // NOTE: добавляем или убираем define в зависимости от значения slice
        const slice_value = (parameters.slice_width > 0 || parameters.slice_height > 0) ? '' : undefined;
        ResourceManager.set_material_define_for_mesh(mesh, 'USE_SLICE', slice_value);

        // NOTE: добавляем или убираем define в зависимости от значения texture
        const texture_value = (parameters.texture != '') ? '' : undefined;
        ResourceManager.set_material_define_for_mesh(mesh, 'USE_TEXTURE', texture_value);

        material.needsUpdate = true;
    }

    function set_material(new_material: ShaderMaterial) {
        material = new_material;
    }

    function set_texture(name: string, atlas = '', uniform_key = 'u_texture') {
        if (name != '') {
            const texture_data = ResourceManager.get_texture(name, atlas);
            ResourceManager.set_material_uniform_for_mesh(mesh, uniform_key, texture_data.texture);
            if (uniform_key == 'u_texture') {
                parameters.texture = name;
                parameters.atlas = atlas;
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
        }
        else {
            const material_name = mesh.material.name;
            const material_info = ResourceManager.get_material_info(material_name);
            if (material_info && material_info.uniforms[uniform_key])
                ResourceManager.set_material_uniform_for_mesh(mesh, uniform_key, null);
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
        const clr = new Color().setStyle(hex_color, NoColorSpace);
        for (let i = 0; i < 4; i++) {
            geometry.attributes['color'].array[3 * i] = clr.r;
            geometry.attributes['color'].array[3 * i + 1] = clr.g;
            geometry.attributes['color'].array[3 * i + 2] = clr.b;
        }
        geometry.attributes['color'].needsUpdate = true;
    }

    function set_alpha(value: number) {
        ResourceManager.set_material_uniform_for_mesh(mesh, 'alpha', value);
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

    function serialize(): Slice9SerializeData {
        const data: Slice9SerializeData = {};

        if (material.name != 'default') {
            data.material_name = material.name;
        }

        if (parameters.slice_width != 0) {
            data.slice_width = parameters.slice_width;
        }
        if (parameters.slice_height != 0) {
            data.slice_height = parameters.slice_height;
        }

        const material_info = ResourceManager.get_material_info(material.name);
        if (!material_info) return data;

        const hash = ResourceManager.get_material_hash_by_mesh_id(material.name, mesh.mesh_data.id);
        if (!hash) return data;

        if (material.blending != NormalBlending) {
            data.blending = material.blending;
        }

        const changed_uniforms = material_info.material_hash_to_changed_uniforms[hash];
        if (!changed_uniforms) return data;

        const modifiedUniforms: { [key: string]: any } = {};
        for (const uniformName of changed_uniforms) {
            if (material.uniforms[uniformName]) {
                const uniform = material.uniforms[uniformName];
                if (uniform.value instanceof Texture) {
                    const texture_name = uniformName == 'u_texture' ? parameters.texture : get_file_name((uniform.value as any).path || '');
                    const atlas = uniformName == 'u_texture' ? parameters.atlas : ResourceManager.get_atlas_by_texture_name(texture_name) || '';
                    modifiedUniforms[uniformName] = `${atlas}/${texture_name}`;
                } else if (material_info.uniforms[uniformName].type == MaterialUniformType.COLOR) {
                    modifiedUniforms[uniformName] = rgb2hex(uniform.value);
                } else {
                    modifiedUniforms[uniformName] = uniform.value;
                }
            }
        }

        if (Object.keys(modifiedUniforms).length > 0) {
            data.material_uniforms = modifiedUniforms;
        }

        // 0, 31, 32
        if (mesh.layers.mask != -2147483647)
            data.layers = mesh.layers.mask;


        return data;
    }

    function deserialize(data: Slice9SerializeData) {
        // NOTE: сначала устанавливаем значения по умолчанию
        set_slice(0, 0);
        set_texture('', '');

        // NOTE: затем переопределяем значения
        if (data.slice_width != undefined) {
            parameters.slice_width = data.slice_width;
        }
        if (data.slice_height != undefined) {
            parameters.slice_height = data.slice_height;
        }

        if (data.blending != undefined) {
            ResourceManager.set_material_property_for_mesh(mesh, 'blending', data.blending);
        }

        // NOTE: применяем измененные uniforms, если они есть
        if (data.material_uniforms) {
            for (const [key, value] of Object.entries(data.material_uniforms)) {
                const material_info = ResourceManager.get_material_info(material.name);
                if (!material_info) continue;

                const uniform_info = material_info.uniforms[key];
                if (!uniform_info) continue;
                if (uniform_info.type == MaterialUniformType.SAMPLER2D && typeof value === 'string') {
                    const [atlas, texture_name] = value.split('/');
                    set_texture(texture_name, atlas, key);
                } else if (uniform_info.type == MaterialUniformType.COLOR) {
                    ResourceManager.set_material_uniform_for_mesh(mesh, key, hex2rgba(value));
                } else {
                    ResourceManager.set_material_uniform_for_mesh(mesh, key, value);
                }
            }
        }
        if (data.layers != undefined)
            mesh.layers.mask = data.layers;

        update_parameters();
    }



    return { set_size, set_slice, set_color, set_alpha, set_material, set_texture, get_bounds, set_pivot, set_anchor, serialize, deserialize, geometry, parameters };
}


export class Slice9Mesh extends EntityPlane {
    public type = IObjectTypes.SLICE9_PLANE;
    private template: ReturnType<typeof CreateSlice9>;

    constructor(id: number, width = 1, height = 1, slice_width = 0, slice_height = 0, custom_material?: ShaderMaterial) {
        super(id);
        this.matrixAutoUpdate = true;
        // NOTE: по хорошему бы наверное default материал переместить из проекта в ресурсы редактора, чтобы он всегда был доступен, или может зашить его в ResourceManager при создании materials - чтобы стандарнтый был сразу в памяти
        const default_material = ResourceManager.get_material_by_mesh_id('slice9', id)!;
        const material = custom_material ? custom_material : default_material;
        this.template = CreateSlice9(this, material, width, height, slice_width, slice_height);
        this.material = material;
        this.geometry = this.template.geometry;
        this.set_size(width, height);
        // this.set_alpha(1.0);
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

    get_color() {
        return this.template.parameters.color;
    }

    get_alpha(): number {
        return this.material.uniforms.alpha.value;
    }

    set_alpha(value: number) {
        this.template.set_alpha(value);
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

    // NOTE: через uniform_key можно установливать и другие сэмплер2д юниформы
    set_texture(name: string, atlas = '', uniform_key = 'u_texture') {
        this.template.set_texture(name, atlas, uniform_key);
    }

    set_material(material_name: string) {
        if (!ResourceManager.has_material_by_mesh_id(material_name, this.mesh_data.id)) {
            ResourceManager.unlink_material_for_mesh(this.material.name, this.mesh_data.id);
        }

        const material = ResourceManager.get_material_by_mesh_id(material_name, this.mesh_data.id);
        if (!material) return;

        this.template.set_material(material);
        this.material = material;
    }

    get_bounds() {
        const wp = new Vector3();
        const ws = new Vector3();
        this.getWorldPosition(wp);
        this.getWorldScale(ws);
        return this.template.get_bounds(wp, ws);
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
        return { ...super.serialize(), ...this.template.serialize() };
    }

    deserialize(data: Slice9SerializeData) {
        if (data.material_name != undefined) {
            this.set_material(data.material_name);
        }

        super.deserialize(data);
        this.template.deserialize(data);
    }

    dispose() {
        super.dispose();
        ResourceManager.unlink_material_for_mesh(this.material.name, this.mesh_data.id);
    }
}