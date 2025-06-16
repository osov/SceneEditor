import { MeshBasicMaterial, ShaderMaterial, Texture } from "three";
import { EntityPlane } from "./entity_plane";
import { MaterialUniformType } from "../resource_manager";
import { get_file_name } from "../helpers/utils";
import { WORLD_SCALAR } from "../../config";
import { clone as skeleton_clone } from 'three/examples/jsm/utils/SkeletonUtils';

export interface MultipleMaterialMeshSerializeData {
    mesh_name: string,
    scales: {
        x: number,
        y: number,
        z: number
    }[],
    materials: {
        [key in number]: { name: string, changed_uniforms?: string[] }
    }
}

export class MultipleMaterialMesh extends EntityPlane {
    protected mesh_name = '';
    protected materials: ShaderMaterial[] = [];
    protected textures: string[][] = [];

    protected default_material_name = 'model';

    constructor(id: number, width = 0, height = 0) {
        super(id);
        this.layers.disable(RenderEngine.DC_LAYERS.GO_LAYER);
        this.layers.enable(RenderEngine.DC_LAYERS.RAYCAST_LAYER);
        this.set_size(width, height);
    }

    set_texture(name: string, atlas = '', index = 0, uniform_key = 'u_texture') {
        this.textures[index] = [name, atlas, uniform_key];
        const texture_data = ResourceManager.get_texture(name, atlas);
        ResourceManager.set_material_uniform_for_multiple_material_mesh(this, index, uniform_key, texture_data.texture);
    }

    get_texture(index = 0) {
        return this.textures[index];
    }

    // NOTE: при сериализации и десериализации цвета может не быть материалов

    set_color(color: string, index = 0) {
        if (this.materials.length == 0 || this.materials.length < index) return;
        ResourceManager.set_material_uniform_for_multiple_material_mesh(this, index, 'u_color', color);
    }

    get_color(index = 0) {
        if (this.materials.length == 0 || this.materials.length < index || !this.materials[index].uniforms['u_color']) return "#fff";
        return this.materials[index].uniforms['u_color'].value;
    }

    set_material(name: string, index = 0) {
        if (!ResourceManager.has_material_by_mesh_id(name, this.mesh_data.id, index)) {
            ResourceManager.unlink_material_for_multiple_material_mesh(this.materials[index].name, this.mesh_data.id, index);
        }

        const material = ResourceManager.get_material_by_mesh_id(name, this.mesh_data.id, index);
        if (!material) return;

        this.materials[index] = material;
        (this.children[0].children[index] as any).material = material;
    }

    get_materials() {
        return this.materials;
    }

    get_mesh_name() {
        return this.mesh_name;
    }

    set_mesh(name: string) {
        const src = ResourceManager.get_model(name);
        if (!src)
            return Log.error('Mesh not found', name);

        this.mesh_name = name;
        this.materials = [];

        const old_maps: Texture[] = [];
        const m = skeleton_clone(src);
        m.traverse((child: any) => {
            if (child.material) {
                const old_material = (child.material as MeshBasicMaterial);
                if (old_material.map && old_material.map.image) {
                    ResourceManager.add_texture(old_material.name, 'mesh_' + name, old_material.map);
                    old_maps.push(old_material.map);
                }

                const new_material = ResourceManager.get_material_by_mesh_id(this.default_material_name, this.mesh_data.id)!;
                this.materials.push(new_material);
                child.material = new_material;
            }
        });
        m.scale.setScalar(1 * WORLD_SCALAR);
        if (this.children.length > 0)
            this.remove(this.children[0]);
        this.add(m);

        old_maps.forEach((map, index) => {
            ResourceManager.set_material_uniform_for_multiple_material_mesh(this, index, 'u_texture', map);
        });

        this.transform_changed();
    }

    serialize() {
        // NOTE: есть нюанс как минимум с сериализацией цвета, потому что может не быть материала
        const data = super.serialize();
        data.materials = [];
        data.mesh_name = this.mesh_name;
        data.scales = this.children.map(child => child.scale.clone());

        this.materials.forEach((material, idx) => {
            const info: { name: string, changed_uniforms?: { [key: string]: any } } = {
                name: material.name
            };

            const material_info = ResourceManager.get_material_info(material.name);
            if (!material_info) return null;

            const hash = ResourceManager.get_material_hash_by_mesh_id(material.name, this.mesh_data.id, idx);
            if (!hash) return data;

            const changed_uniforms = material_info.material_hash_to_changed_uniforms[hash];
            if (!changed_uniforms) return data;

            const modifiedUniforms: { [key: string]: any } = {};
            for (const uniformName of changed_uniforms) {
                if (material.uniforms[uniformName]) {
                    const uniform = material.uniforms[uniformName];
                    if (uniform.value instanceof Texture) {
                        const texture_name = uniformName == 'u_texture' ? this.get_texture(idx)[0] : get_file_name((uniform.value as any).path || '');
                        const atlas = uniformName == 'u_texture' ? this.get_texture(idx)[1] : ResourceManager.get_atlas_by_texture_name(texture_name) || '';
                        modifiedUniforms[uniformName] = `${atlas}/${texture_name}`;
                    } else {
                        modifiedUniforms[uniformName] = uniform.value;
                    }
                }
            }

            if (Object.keys(modifiedUniforms).length > 0) {
                info.changed_uniforms = modifiedUniforms;
            }

            data.materials[idx] = info;
        });

        return data;
    }

    deserialize(data: MultipleMaterialMeshSerializeData) {
        if (data.mesh_name) {
            this.set_mesh(data.mesh_name);
        }

        if (data.scales) {
            data.scales.forEach((scale, idx) => {
                if (this.children[idx])
                    this.children[idx].scale.copy(scale);
            });
        }

        for (const [idx, info] of Object.entries(data.materials)) {
            const index = parseInt(idx);

            if (info.name != 'default') {
                this.set_material(info.name, index);
            }

            if (info.changed_uniforms) {
                for (const [key, value] of Object.entries(info.changed_uniforms)) {
                    const material_info = ResourceManager.get_material_info(info.name);
                    if (!material_info) continue;

                    const uniform_info = material_info.uniforms[key];
                    if (!uniform_info) continue;

                    if (uniform_info.type === MaterialUniformType.SAMPLER2D && typeof value === 'string') {
                        const [atlas, texture_name] = value.split('/');
                        this.set_texture(texture_name, atlas, index);
                    } else {
                        ResourceManager.set_material_uniform_for_multiple_material_mesh(this, index, key, value);
                    }
                }
            }
        }

        // NOTE: сериализуем в конце, так как внутри есть методы обращающиеся к материалам которые создаются тут
        super.deserialize(data);
    }
} 