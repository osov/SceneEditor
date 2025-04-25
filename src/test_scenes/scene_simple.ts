import { BufferGeometry, Line, LineDashedMaterial, NearestFilter, Vector3 } from 'three'
import { IObjectTypes } from '../render_engine/types';
import { run_debug_filemanager } from '../controls/AssetControl';
import { PROJECT_NAME, SERVER_URL } from '../config';
import { URL_PATHS } from '../modules_editor/modules_editor_const';
import { make_ramk } from '../render_engine/helpers/utils';

export async function run_scene_simple() {
  (window as any).scene = RenderEngine.scene;

  const tex = await ResourceManager.preload_texture('./img/2.png');
  tex.texture.magFilter = NearestFilter;

  ResourceManager.set_project_path(`${SERVER_URL}${URL_PATHS.ASSETS}`);
  await run_debug_filemanager(PROJECT_NAME);

  await ResourceManager.preload_atlas('/test_assets/atlas.tpsheet', '/test_assets/atlas.png');

  const ramk = make_ramk(540, 960);
  RenderEngine.scene.add(ramk);


  const go1 = SceneManager.create(IObjectTypes.GO_CONTAINER);
  go1.set_position(540 / 2, -960 / 2);
  SceneManager.add(go1);

  const spr1 = SceneManager.create(IObjectTypes.GO_SPRITE_COMPONENT);
  spr1.set_texture('arrow1', 'atlas');
  go1.add(spr1);

  const label1 = SceneManager.create(IObjectTypes.GO_LABEL_COMPONENT, { text: 'Надпись' });
  label1.set_font('ShantellSans-Light11');
  go1.add(label1);

  const model = SceneManager.create(IObjectTypes.GO_MODEL_COMPONENT, { width: 50, height: 50 });
  model.position.set(220, 220, 1);
  go1.add(model);

  const go2 = SceneManager.create(IObjectTypes.GO_CONTAINER);
  go2.set_position(540 / 2 + 200, -960 / 2);
  SceneManager.add(go2);

  const go3 = SceneManager.create(IObjectTypes.GO_CONTAINER);
  go2.add(go3);

  const spr2 = SceneManager.create(IObjectTypes.GO_SPRITE_COMPONENT, { width: 100, height: 100 });
  spr2.set_texture('Home', 'atlas');
  spr2.set_slice(10, 10);
  go2.add(spr2);



  const gui1 = SceneManager.create(IObjectTypes.GUI_CONTAINER);
  SceneManager.add(gui1);

  const btn1 = SceneManager.create(IObjectTypes.GUI_BOX, { width: 128, height: 32 });
  btn1.scale.setScalar(2);
  btn1.position.set(200, -200, 0);
  btn1.set_color('#0f0')
  btn1.set_texture('2');
  btn1.set_slice(8, 8);
  gui1.add(btn1);


  const text1 = SceneManager.create(IObjectTypes.GUI_TEXT, { text: 'Кнопка', width: 250, height: 50 });
  text1.set_color('#0f0');
  text1.scale.setScalar(0.5);
  text1.set_font('ShantellSans-Light11');
  btn1.add(text1)

  const box1 = SceneManager.create(IObjectTypes.GUI_BOX, { width: 128, height: 32 });
  box1.position.set(300, -300, 0);
  box1.set_color('#0f0')
  gui1.add(box1);

  const spl = SceneManager.create(IObjectTypes.COMPONENT);
  spl.set_position(320, -245, 5000);
  spl.cmp.add_point(335, -240);
  spl.cmp.add_point(345, -260);
  SceneManager.add(spl);

  ControlManager.update_graph(true, 'test');
}