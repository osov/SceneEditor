import { Mesh, MeshBasicMaterial, NormalBlending, ShaderMaterial, SkinnedMesh, Texture, Vector2, Vector3 } from "three";
import { EntityPlane } from "./entity_plane";
import { MaterialUniformType } from "../resource_manager";
import { get_file_name } from "../helpers/utils";
import { FLOAT_PRECISION, WORLD_SCALAR } from "../../config";
import { clone as skeleton_clone } from 'three/examples/jsm/utils/SkeletonUtils';
import { hex2rgba, rgb2hex } from "@editor/defold/utils";

export interface MultipleMaterialMeshSerializeData {
    mesh_name: string,
    materials: {
        [key in number]: { name: string, blending?: number, changed_uniforms?: string[] }
    }
    layers: number;
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

    set_scale(x: number, y: number): void {
        if (!this.children[0]) return;
        this.children[0].scale.setScalar(Math.max(x, y) * WORLD_SCALAR);
        this.transform_changed();
    }

    get_scale(): Vector2 {
        if (!this.children[0]) return new Vector2(1 / WORLD_SCALAR, 1 / WORLD_SCALAR);
        return new Vector2(this.children[0].scale.x / WORLD_SCALAR, this.children[0].scale.y / WORLD_SCALAR);
    }

    // NOTE: при сериализации и десериализации цвета может не быть материалов
    set_color(color: string) {
        if (this.materials.length == 0 || this.materials.length <= 0) return;
        if (!this.materials[0].uniforms['u_color']) {
            Log.warn('Material has no u_color uniform', this.materials[0].name);
            return;
        }
        ResourceManager.set_material_uniform_for_multiple_material_mesh(this, 0, 'u_color', color);
    }

    get_color() {
        if (this.materials.length == 0 || this.materials.length <= 0) return;
        if (!this.materials[0].uniforms['u_color']) {
            Log.warn('Material has no u_color uniform', this.materials[0].name);
            return "#fff";
        }
        return rgb2hex(this.materials[0].uniforms['u_color'].value) as any;
    }

    set_material(name: string, index = 0) {
        if (!ResourceManager.has_material_by_mesh_id(name, this.mesh_data.id, index)) {
            ResourceManager.unlink_material_for_multiple_material_mesh(this.materials[index].name, this.mesh_data.id, index);
        }

        const material = ResourceManager.get_material_by_mesh_id(name, this.mesh_data.id, index);
        if (!material) return;

        this.materials[index] = material;
        let idx = 0;
        this.children[0].traverse((child: any) => {
            if ((child instanceof Mesh || child instanceof SkinnedMesh) && child.material) {
                if (idx == index) child.material = material;
                idx++;
            }
        });
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
            if ((child instanceof Mesh || child instanceof SkinnedMesh) && child.material) {
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

        if (this.children.length > 0)
            this.remove(this.children[0]);
        this.add(m);
        this.set_scale(1, 1);

        old_maps.forEach((map, index) => {
            ResourceManager.set_material_uniform_for_multiple_material_mesh(this, index, 'u_texture', map);
        });

        this.transform_changed();
    }

    serialize() {
        // NOTE: кусок serialize из EntityPlane, без get_color
        const data: any = {};
        const size = this.get_size();
        const pivot = this.get_pivot();

        // NOTE: только если не 32 * WORLD_SCALAR
        if (size.x !== 32 * WORLD_SCALAR || size.y !== 32 * WORLD_SCALAR) {
            data.size = size.toArray().map(value => Number(value.toFixed(FLOAT_PRECISION)));
        }

        // NOTE: только если не (0.5, 0.5)
        if (pivot.x !== 0.5 || pivot.y !== 0.5) {
            data.pivot = pivot;
        }
        data.materials = [];
        data.mesh_name = this.mesh_name;

        this.materials.forEach((material, idx) => {
            const info: { name: string, blending?: number, changed_uniforms?: { [key: string]: any } } = {
                name: material.name,
            };

            if (material.blending != NormalBlending) {
                info.blending = material.blending;
            }

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
                    } else if (material_info.uniforms[uniformName].type == MaterialUniformType.COLOR) {
                        modifiedUniforms[uniformName] = rgb2hex(uniform.value);
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

        let mask = 0;
        this.traverse((m) => {
            if (["Mesh", "SkinnedMesh"].includes(m.type))
                mask = m.layers.mask;
        });
        if (mask != 0)
            data.layers = mask;

        return data;
    }

    deserialize(data: MultipleMaterialMeshSerializeData) {
        if (data.mesh_name) {
            this.set_mesh(data.mesh_name);
        }

        for (const [idx, info] of Object.entries(data.materials)) {
            const index = parseInt(idx);

            if (info.name != 'default') {
                this.set_material(info.name, index);
            }

            if (info.blending != undefined) {
                ResourceManager.set_material_property_for_multiple_mesh(this, index, 'blending', info.blending);
            }

            if (info.changed_uniforms) {
                for (const [key, value] of Object.entries(info.changed_uniforms)) {
                    const material_info = ResourceManager.get_material_info(info.name);
                    if (!material_info) continue;

                    const uniform_info = material_info.uniforms[key];
                    if (!uniform_info) continue;

                    if (uniform_info.type == MaterialUniformType.SAMPLER2D && typeof value === 'string') {
                        const [atlas, texture_name] = value.split('/');
                        this.set_texture(texture_name, atlas, index, key);
                    } else if (uniform_info.type == MaterialUniformType.COLOR) {
                        ResourceManager.set_material_uniform_for_multiple_material_mesh(this, index, key, hex2rgba(value));
                    } else {
                        ResourceManager.set_material_uniform_for_multiple_material_mesh(this, index, key, value);
                    }
                }
            }
        }

        if (data.layers != undefined) {
            this.traverse((m) => {
                if (["Mesh", "SkinnedMesh"].includes(m.type))
                    m.layers.mask = data.layers;
            });
        }

        // NOTE: кусок deserialize из EntityPlane без set_color
        this.set_pivot(0.5, 0.5, false);
        this.set_size(32 * WORLD_SCALAR, 32 * WORLD_SCALAR);

        if ((data as any).pivot) {
            this.set_pivot((data as any).pivot.x, (data as any).pivot.y, false);
        }
        if ((data as any).size) {
            this.set_size((data as any).size[0], (data as any).size[1]);
        }

        // NOTE: для обратной совместимости, после пересохранения всех сцен которые содежат модели, можно удалить
        const scales = (data as any).scales;
        if (scales) {
            scales.forEach((scale: Vector3, idx: number) => {
                if (this.children[idx])
                    this.children[idx].scale.copy(scale);
            });
        }
    }
} 