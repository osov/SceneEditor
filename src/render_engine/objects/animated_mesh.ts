import { AnimationAction, AnimationMixer, MeshBasicMaterial, ShaderMaterial } from "three";
import { IObjectTypes } from "../types";
import { EntityContainer } from "./entity_container";
import { clone as skeleton_clone } from 'three/examples/jsm/utils/SkeletonUtils';

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
       worldPosition.z /= 10000.0;
       worldPosition.z += offsetZ;
       //worldPosition.z += modelMatrix[3].z;
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

export class AnimatedMesh extends EntityContainer {
  public type = IObjectTypes.SLICE9_PLANE;
  public mesh_data = { id: -1 };
  private mixer = new AnimationMixer(this);
  private animations_list: { [k: string]: AnimationAction } = {};
  private activeAction: AnimationAction | null = null;
  private lastAction: AnimationAction | null = null;
  private mesh_name = '';
  private materials: ShaderMaterial[] = [];

  constructor(width = 1, height = 1) {
    super();
    this.layers.disable(0)
    this.layers.enable(31)
    this.set_size(width, height);
    EventBus.on('SYS_ON_UPDATE', this.on_mixer_update.bind(this));
  }

  set_texture(name: string, atlas = '', index = 0) {
    super.set_texture(name, atlas);
    this.materials[index].uniforms.uTexture.value = ResourceManager.get_texture(name, atlas).texture;
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


}