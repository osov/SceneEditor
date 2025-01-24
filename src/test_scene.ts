import { BufferGeometry, Line, LineDashedMaterial, NearestFilter, TextureLoader, Vector3, } from 'three'
import { Slice9Mesh } from './render_engine/slice9';
import { IObjectTypes } from './render_engine/types';

export async function run_debug_scene() {
  // sov width projection
  //Camera.set_width_prjection(-1, 1, 0, 100);
  const scene = RenderEngine.scene;
  (window as any).scene = RenderEngine.scene;
  const tex = await new TextureLoader().loadAsync('./img/2.png');
  tex.magFilter = NearestFilter;



  const plane_1 = SceneManager.create(IObjectTypes.SLICE9_PLANE, { width: 50, height: 50 });
  plane_1.set_color('#f00')
  plane_1.position.set(540, 0, 4);
  SceneManager.add(plane_1);

  const plane_2 = SceneManager.create(IObjectTypes.SLICE9_PLANE, { width: 16, height: 16 });
  plane_2.set_color('#0f0')
  plane_2.position.set(540, -200, 5);
  SceneManager.add(plane_2);

  const plane_3 = SceneManager.create(IObjectTypes.SLICE9_PLANE, { width: 32, height: 32 });
  plane_3.scale.setScalar(3)
  plane_3.set_color('#00f')
  plane_3.position.set(100, -200, 0.001);
  SceneManager.add(plane_3);

  const plane_4 = SceneManager.create(IObjectTypes.SLICE9_PLANE, { width: 128, height: 32 }) as Slice9Mesh;
  plane_4.scale.setScalar(2);
  plane_4.position.set(300, -500, 0);
  plane_4.set_slice(8, 8)
  plane_4.set_color('#0f0')
  plane_4.set_texture(tex);
  SceneManager.add(plane_4);



  var points = [];
  points.push(
    new Vector3(0, 0, 0),
    new Vector3(1, 0, 0),
    new Vector3(1, -1, 0),
    new Vector3(0, -1, 0),
    new Vector3(0, 0, 0),
  );
  var geometry = new BufferGeometry().setFromPoints(points);
  var line = new Line(geometry, new LineDashedMaterial({ color: 0xffaa00, dashSize: 0.005, gapSize: 0.005 }));
  line.scale.set(540, 960, 1);
  line.position.x = 0;
  line.position.y = 0;
  line.computeLineDistances();
  scene.add(line)

  let tmp = SceneManager.create(IObjectTypes.SLICE9_PLANE, { width: 32, height: 32 }, 10);
  tmp.name = 'id10';
  tmp.set_color('#f00');
  tmp.position.set(0, 0, 0)
  SceneManager.add(tmp);

  let sub_tmp = SceneManager.create(IObjectTypes.SLICE9_PLANE, { width: 32, height: 32 }, 11);
  sub_tmp.name = 'id11';
  sub_tmp.set_color('#ff0');
  sub_tmp.position.set(0, -15, 0)
  SceneManager.add(sub_tmp, 10);

  sub_tmp = SceneManager.create(IObjectTypes.SLICE9_PLANE, { width: 32, height: 32 }, 12);
  sub_tmp.name = 'id12';
  sub_tmp.set_color('#0ff');
  sub_tmp.position.set(0, -30, 0)
  SceneManager.add(sub_tmp, 10);

  sub_tmp = SceneManager.create(IObjectTypes.SLICE9_PLANE, { width: 32, height: 32 }, 13);
  sub_tmp.name = 'id13';
  sub_tmp.set_color('#0f0');
  sub_tmp.position.set(0, -50, 0)
  SceneManager.add(sub_tmp, 10);


  tmp = SceneManager.create(IObjectTypes.SLICE9_PLANE, { width: 32, height: 32 }, 20);
  tmp.name = 'id20';
  tmp.set_color('#0f0');
  tmp.position.set(50, 0, 0)
  SceneManager.add(tmp);

  sub_tmp = SceneManager.create(IObjectTypes.SLICE9_PLANE, { width: 32, height: 32 }, 21);
  sub_tmp.name = 'id21';
  sub_tmp.set_color('#0a5');
  sub_tmp.position.set(50, -15, 0)
  SceneManager.add(sub_tmp, 20);

  sub_tmp = SceneManager.create(IObjectTypes.SLICE9_PLANE, { width: 32, height: 32 }, 22);
  sub_tmp.name = 'id22';
  sub_tmp.set_color('#00f');
  sub_tmp.position.set(50, -30, 0)
  SceneManager.add(sub_tmp, 20);

  sub_tmp = SceneManager.create(IObjectTypes.SLICE9_PLANE, { width: 32, height: 32 }, 23);
  sub_tmp.name = 'id23';
  sub_tmp.set_color('#f0f');
  sub_tmp.position.set(50, -50, 0)
  SceneManager.add(sub_tmp, 20);

  tmp = SceneManager.create(IObjectTypes.SLICE9_PLANE, { width: 32, height: 32 }, 30);
  tmp.name = 'id30';
  tmp.set_color('#00f');
  tmp.position.set(100, 0, 0)
  SceneManager.add(tmp);


 //log('source:', SceneManager.debug_graph(scene));
 //SceneManager.move_mesh_id(21, 10, 13);
 //log('new:', SceneManager.debug_graph(scene));
 //log(SceneManager.make_graph());


}
