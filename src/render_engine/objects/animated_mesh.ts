import { AnimationAction, AnimationMixer, ShaderMaterial } from "three";
import { IObjectTypes } from "../types";
import { EntityContainer } from "./entity_container";
import { clone as skeleton_clone } from 'three/examples/jsm/utils/SkeletonUtils';

const shader = {
  vertexShader: `
     varying vec2 vUv;
     
     #include <skinning_pars_vertex>
     
     void main() {
       #include <skinbase_vertex>
       #include <begin_vertex>
       #include <skinning_vertex>
       vUv = uv; 
       vec4 worldPosition = modelMatrix * vec4(transformed, 1.0);
       worldPosition.z /= 10000.0;
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

  private skin_material = new ShaderMaterial({
    uniforms: {
      uTexture: { value: null }
    },
    vertexShader: shader.vertexShader,
    fragmentShader: shader.fragmentShader,
  });

  constructor(width = 1, height = 1) {
    super();
    this.layers.disable(0)
    this.layers.enable(31)
    this.set_size(width, height);
    EventBus.on('SYS_ON_UPDATE', this.on_mixer_update.bind(this));
  }

  set_texture(name: string, atlas = '') {
    super.set_texture(name, atlas);
    this.skin_material.uniforms.uTexture.value = ResourceManager.get_texture(name, atlas).texture;
  }


  set_mesh(name: string) {
    const src = ResourceManager.get_model(name);
    if (!src)
      return Log.error('Mesh not found', name);
    const m = skeleton_clone(src);
    m.traverse((child) => {
      if ((child as any).material)
        (child as any).material = this.skin_material;
    });
    m.scale.setScalar(0.1);
    if (this.children.length > 0)
      this.remove(this.children[0]);
    this.add(m);
    this.mixer = new AnimationMixer(m);
  }

  on_mixer_update(e: { dt: number }) {
    if (this.mixer)
      this.mixer.update(e.dt);
  }

  add_animation(name: string, alias: string) {
    const src = ResourceManager.get_model(name);
    if (!src)
      return Log.error('Mesh not found', name);
    const m = skeleton_clone(src);
    if (m.animations && m.animations.length) {
      const animationAction = this.mixer.clipAction(m.animations[0])
      this.animations_list[alias] = animationAction;
      if (Object.keys(this.animations_list).length == 1) {
        this.activeAction = animationAction;
        animationAction.play();
      }
    }
  }

  set_animation(alias: string) {
    if (this.animations_list[alias]) {
      const toAction = this.animations_list[alias];
      if (toAction != this.activeAction) {
        this.lastAction = this.activeAction
        this.activeAction = toAction
        const t = 0.3;
        this.lastAction!.fadeOut(t)
        this.activeAction.reset()
        this.activeAction.fadeIn(t)
        this.activeAction.play()
      }
    }
  }

}