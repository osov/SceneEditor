import { BufferGeometry, Line, LineDashedMaterial, Mesh, MeshBasicMaterial, PlaneGeometry, Vector2, Vector3, } from 'three'

export function run_debug_scene() {
  
  // sov width projection
  //Camera.set_width_prjection(-1, 1, 0, 100);

  const scene = RenderEngine.scene;
  const plane_1_geometry = new PlaneGeometry(32 * 2, 32 * 2)
  const planeMaterial = new MeshBasicMaterial({ color: 'gray', })
  const plane_1 = new Mesh(plane_1_geometry, planeMaterial)
  plane_1.position.x = 540;
  plane_1.position.y = 0;
  plane_1.position.z = 4
  scene.add(plane_1)

  const plane_2_geometry = new PlaneGeometry(32 * 4, 32 * 4)
  const planeMaterial_2 = new MeshBasicMaterial({ color: 'red', })
  const plane_2 = new Mesh(plane_2_geometry, planeMaterial_2)
  plane_2.position.x = 540 / 2;
  plane_2.position.y = -200;
  plane_2.position.z = 5
  scene.add(plane_2)

  const plane_3_geometry = new PlaneGeometry(32, 32)
  const planeMaterial_3 = new MeshBasicMaterial({ color: 'green', })
  const plane_3 = new Mesh(plane_3_geometry, planeMaterial_3)
  plane_3.position.x = 0;
  plane_3.position.y = 0;
  plane_3.position.z = 0.001
  plane_2.add(plane_3)


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



  const raycaster = RenderEngine.raycaster;
  const camera = RenderEngine.camera;
  const pointer = new Vector2();
  window.addEventListener('pointermove', (event) => {
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = - (event.clientY / window.innerHeight) * 2 + 1;
  });


  window.addEventListener('click', (event) => {
    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObjects(scene.children);
    if (intersects.length > 0)
      ((intersects[0].object as Mesh).material as MeshBasicMaterial).color.setRGB(Math.random(), Math.random(), Math.random());
  });



}

