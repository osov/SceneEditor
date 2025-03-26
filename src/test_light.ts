import {  FloatType, RGBAFormat, Vector2, Vector3, WebGLRenderTarget } from 'three'
import { run_debug_filemanager } from './controls/AssetControl';
import { SERVER_URL } from './config';
import { URL_PATHS } from './modules_editor/modules_editor_const';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';


export async function run_debug_scene_light() {
  (window as any).scene = RenderEngine.scene;

  await ResourceManager.preload_atlas('./img/example_atlas.tpsheet', './img/example_atlas.png');
  const renderer = RenderEngine.renderer;
  const camera = RenderEngine.camera;


  ResourceManager.set_project_path(`${SERVER_URL}${URL_PATHS.ASSETS}`);
  const project_to_load = 'SceneEditor_ExampleProject';
  const scene_to_set = 'test.scn';
  await run_debug_filemanager(project_to_load, scene_to_set);
  ControlManager.update_graph(true, 'test');

  await AssetControl.open_scene('/shaders/scene.scn');
  const scene = RenderEngine.scene;
  for (let i = 1; i <= 4; i++) {
    const light = scene.getObjectByName('l' + i)!;
    light.layers.enable(2);
    light.layers.disable(0);
    // ((light as any).material as MeshBasicMaterial).blending = AdditiveBlending;
  }

  const renderTargetOptions = {
    format: RGBAFormat,
    type: FloatType
  };
  const sceneRenderTarget = new WebGLRenderTarget(window.innerWidth, window.innerHeight, renderTargetOptions);
  const lightRenderTarget = new WebGLRenderTarget(window.innerWidth, window.innerHeight, renderTargetOptions);

  const composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  
const LightShader = {
  uniforms: {
    'tScene': { value: null },  
    'tLight': { value: null },   
    'lightIntensity': { value: 1.0 } 
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: (await AssetControl.get_file_data('shaders/light.fp')).data!
};
  const lightPass = new ShaderPass(LightShader);
  lightPass.uniforms.tScene.value = sceneRenderTarget.texture;
  lightPass.uniforms.tLight.value = lightRenderTarget.texture;
  lightPass.uniforms.lightIntensity.value = 1.0;
  composer.addPass(lightPass);
  (window as any).lightPass = lightPass;

  EventBus.on('SERVER_FILE_SYSTEM_EVENTS', async (e) => {
    let is_change = false;
    for (let i = 0; i < e.events.length; i++) {
      const ev = e.events[i];
      if (ev.path == 'shaders/light.fp')
        is_change = true;
    }
    if (is_change){
      log('changed');
      const fp_data = await AssetControl.get_file_data('shaders/light.fp');
      lightPass.material.fragmentShader = fp_data.data!;
      lightPass.material.needsUpdate = true;
    }
  });

  scene.background = null;
  RenderEngine.set_active_render(false);

  EventBus.on('SYS_ON_UPDATE_END', (e) => {
    const old = camera.layers.mask;

    // Рендерим сцену в текстуру
    renderer.setRenderTarget(sceneRenderTarget);
    renderer.setClearColor(0x000000, 1);
    renderer.clear();
    renderer.render(scene, camera);

    // Рендерим светящиеся объекты в другую текстуру
    camera.layers.set(2);
    renderer.setRenderTarget(lightRenderTarget);
    renderer.setClearColor(0x222222, 1);
    renderer.clear();
    renderer.render(scene, camera);
    camera.layers.mask = old;


    // Финальный рендер с постпроцессингом
    renderer.setRenderTarget(null);
    renderer.setClearColor(0x000000, 1);
    renderer.clear();
    composer.render();

    // Controls
    camera.layers.set(RenderEngine.DC_LAYERS.CONTROLS_LAYER);
    renderer.clearDepth();
    renderer.render(scene, camera);
    camera.layers.mask = old;


  });
}