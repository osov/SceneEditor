import { AnimationAction, AnimationMixer, MeshBasicMaterial, ShaderMaterial, Texture } from "three";
import { IObjectTypes } from "../types";
import { clone as skeleton_clone } from 'three/examples/jsm/utils/SkeletonUtils';
import { EntityPlane } from "./entity_plane";
import { get_file_name } from "../helpers/utils";
import { MaterialUniformType } from "../resource_manager";

const shader = {
  vertexShader: `
     uniform float offsetZ;
     varying vec2 vUv;
     #include <skinning_pars_vertex>
     
     void main() {
       #include <skinbase_vertex>
       #include <begin_vertex>
       #include <skinning_vertex>
       vUv = uv; 
       vec4 worldPosition = modelMatrix * vec4(transformed, 1.0);

      // worldPosition.z /= 10000.0;
     //  worldPosition.z += offsetZ;
       gl_Position = projectionMatrix * viewMatrix * worldPosition;
     }
`,

  fragmentShader: `
        uniform sampler2D uTexture;
          varying vec2 vUv;
          void main() {
            vec4 texColor = texture2D(uTexture, vUv);
            gl_FragColor = texColor;
          }
`
};

interface SerializeData {
  materials: {
    [key in number]: { name: string, changed_uniforms?: string[] }
  }
}

export class AnimatedMesh extends EntityPlane {
  public type = IObjectTypes.GO_MODEL_COMPONENT;
  private mixer = new AnimationMixer(this);
  private animations_list: { [k: string]: AnimationAction } = {};
  private activeAction: AnimationAction | null = null;
  private lastAction: AnimationAction | null = null;
  private mesh_name = '';
  private materials: ShaderMaterial[] = [];

  constructor(id: number, width = 0, height = 0) {
    super(id);
    this.layers.disable(RenderEngine.DC_LAYERS.GO_LAYER);
    this.layers.enable(RenderEngine.DC_LAYERS.RAYCAST_LAYER);
    this.set_size(width, height);
    EventBus.on('SYS_ON_UPDATE', this.on_mixer_update.bind(this));
  }

  set_texture(name: string, atlas = '', index = 0) {
    super.set_texture(name, atlas);
    this.materials[index].uniforms.uTexture.value = ResourceManager.get_texture(name, atlas).texture;
  }

  set_material(name: string, index = 0) {
    Log.log(name, index);
  }

  set_mesh(name: string) {
    const src = ResourceManager.get_model(name);
    if (!src)
      return Log.error('Mesh not found', name);
    this.mesh_name = name;
    const m = skeleton_clone(src);
    let index_material = 0;
    m.traverse((child) => {
      if ((child as any).material) {
        const old_material = ((child as any).material as MeshBasicMaterial);
        if (old_material.map && old_material.map.image) {
          ResourceManager.add_texture(old_material.name, 'mesh_' + name, old_material.map);
          log('Texture added', old_material.name, 'mesh_' + name);
        }
        const new_material = new ShaderMaterial({
          uniforms: {
            uTexture: { value: old_material.map },
            offsetZ: { value: 0 },
          },
          vertexShader: shader.vertexShader,
          fragmentShader: shader.fragmentShader,
        });
        this.materials.push(new_material);
        (child as any).material = new_material;
        index_material++;
      }
    });
    m.scale.setScalar(0.2);
    if (this.children.length > 0)
      this.remove(this.children[0]);
    this.add(m);
    if (!this.mixer)
      this.mixer = new AnimationMixer(m);
    this.transform_changed();
  }

  on_mixer_update(e: { dt: number }) {
    if (this.mixer)
      this.mixer.update(e.dt);
    for (let i = 0; i < this.materials.length; i++)
      this.materials[i].uniforms.offsetZ.value = this.position.z;
  }

  add_animation(name: string, alias = '') {
    const clip = ResourceManager.find_animation(name, this.mesh_name);
    if (!clip)
      return Log.error('Animation not found', name);
    const animationAction = this.mixer.clipAction(clip.clip)
    this.animations_list[alias == '' ? name : alias] = animationAction;
    if (Object.keys(this.animations_list).length == 1) {
      this.activeAction = animationAction;
      animationAction.play();
    }
  }

  set_animation(alias: string, offset = 0) {
    if (this.animations_list[alias]) {
      const toAction = this.animations_list[alias];
      if (toAction != this.activeAction) {
        this.lastAction = this.activeAction
        this.activeAction = toAction
        const t = 0.3;
        this.lastAction!.fadeOut(t)
        this.activeAction.reset()
        this.activeAction.fadeIn(t)
        this.activeAction.startAt(offset)
        this.activeAction.play()
      }
    }
  }

  serialize() {
    const data = { ... super.serialize() };
    data.materials = [];

    this.materials.forEach((material, idx) => {
      const info: { name: string, changed_uniforms?: { [key: string]: any } } = {
        name: material.name
      };

      const material_info = ResourceManager.get_material_info(material.name);
      if (!material_info) return null;

      const hash = ResourceManager.get_material_hash_by_mesh_id(material.name, this.mesh_data.id);
      if (!hash) return data;

      const changed_uniforms = material_info.material_hash_to_changed_uniforms[hash];
      if (!changed_uniforms) return data;

      const modifiedUniforms: { [key: string]: any } = {};
      for (const uniformName of changed_uniforms) {
        if (material.uniforms[uniformName]) {
          const uniform = material.uniforms[uniformName];
          if (uniform.value instanceof Texture) {
            // For texture uniforms, save the texture name and atlas instead of the full Texture object
            const texture_name = get_file_name((uniform.value as any).path || '');
            const atlas = ResourceManager.get_atlas_by_texture_name(texture_name) || '';
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

  deserialize(data: SerializeData) {
    super.deserialize(data);

    for (const [idx, info] of Object.entries(data.materials)) {
      const index = parseInt(idx);

      if (info.name != 'default') {
        this.set_material(info.name, index);
      }

      // NOTE: применяем измененные uniforms, если они есть
      if (info.changed_uniforms) {
        for (const [key, value] of Object.entries(info.changed_uniforms)) {
          const material_info = ResourceManager.get_material_info(info.name);
          if (!material_info) continue;

          const uniform_info = material_info.uniforms[key];
          if (!uniform_info) continue;

          if (uniform_info.type === MaterialUniformType.SAMPLER2D && typeof value === 'string') {
            const [atlas, texture_name] = value.split('/');
            this.set_texture(texture_name, atlas, index);
          }
        }
      }
    }
  }
}