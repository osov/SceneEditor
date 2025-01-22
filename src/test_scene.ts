import { BufferGeometry, Line, LineDashedMaterial,  NearestFilter,  TextureLoader,  Vector3,  } from 'three'
import { Slice9Mesh } from './render_engine/slice9';

export async function run_debug_scene() {
  // sov width projection
  //Camera.set_width_prjection(-1, 1, 0, 100);
  const scene = RenderEngine.scene;
  const tex = await new TextureLoader().loadAsync('./img/2.png');
  tex.magFilter = NearestFilter;



  const plane_1 = new Slice9Mesh(50, 50);
  plane_1.set_color('#f00')
  plane_1.position.set(540, 0, 4);
  scene.add(plane_1);

  const plane_2 = new Slice9Mesh(16, 16);
  plane_2.set_color('#0f0')
  plane_2.position.set(540, -200, 5);
  //scene.add(plane_2);

  const plane_3 = new Slice9Mesh(32, 32);
  plane_3.scale.setScalar(3)
  plane_3.set_color('#00f')
  //plane_3.position.set(800, -200, 0.001);
  // scene.add(plane_3);

  const plane_4 = new Slice9Mesh(128, 32);
  plane_4.scale.setScalar(2);
  plane_4.position.set(800, -500, 0);
  plane_4.set_slice(8, 8)
  plane_4.set_color('#0f0')
  plane_4.set_texture(tex);
  scene.add(plane_4);

  // debug childs
  plane_3.position.set(10, 2, 0.1);
  plane_4.add(plane_3);
  plane_2.position.set(10, 3, 0.2)
  plane_3.add(plane_2);

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

  EventBus.on('SYS_SELECTED_MESH', (mesh) => {
     // SizeControl.set_mesh(mesh.mesh);
      TransformControl.set_mesh(mesh.mesh);
  });

  EventBus.on('SYS_UNSELECTED_MESH', () => {
    //  SizeControl.set_mesh(null);
      TransformControl.set_mesh(null);
  })
}
