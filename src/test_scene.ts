import { BufferGeometry, ClampToEdgeWrapping, Line, LineDashedMaterial, Mesh, MeshBasicMaterial, NearestFilter, PlaneGeometry, RepeatWrapping, ShaderMaterial, Texture, TextureLoader, Vector2, Vector3, } from 'three'
import { Slice9 } from './render_engine/slice9';



export async function run_debug_scene() {

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

  const tex = await new TextureLoader().loadAsync('2.png');
  tex.magFilter = NearestFilter;
  const go = Slice9(tex, 128, 32);
  go.mesh.scale.setScalar(2);
  go.mesh.position.set(800, -500, 0);
  scene.add(go.mesh);
  go.set_slice(8, 8)
  go.set_color('#0f0')

  const raycaster = RenderEngine.raycaster;
  const camera = RenderEngine.camera;


  const pointer = new Vector2();
  const click_point = new Vector2();
  const prev_point = new Vector2();
  let is_down = false;
  const dir = [0, 0];

  window.addEventListener('mousedown', (e) => {
    is_down = true;
    click_point.set(pointer.x, pointer.y)
  });

  window.addEventListener('mouseup', (e) => {
    is_down = false;
  });

  window.addEventListener('pointermove', (event) => {
    prev_point.set(pointer.x, pointer.y);
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = - (event.clientY / window.innerHeight) * 2 + 1;
    const wp = Camera.screen_to_world(pointer.x, pointer.y);
    const bounds = go.get_bounds();
    const range = 5;
    if (!is_down) {
      document.body.style.cursor = 'default';
      dir[0] = 0; dir[1] = 0;
      if (wp.x > bounds[0] - range && wp.x < bounds[2] + range && wp.y > bounds[3] - range && wp.y < bounds[1] + range) {
        if (Math.abs(bounds[0] - wp.x) < range) {
          document.body.style.cursor = 'e-resize';
          dir[0] = 1;
        }
        if (Math.abs(bounds[2] - wp.x) < range) {
          document.body.style.cursor = 'e-resize';
          dir[0] = 1;
        }
        if (Math.abs(bounds[1] - wp.y) < range) {
          document.body.style.cursor = 'n-resize';
          dir[1] = 1;
        }
        if (Math.abs(bounds[3] - wp.y) < range) {
          document.body.style.cursor = 'n-resize';
          dir[1] = 1;
        }
        if (Math.abs(bounds[0] - wp.x) < range && Math.abs(bounds[1] - wp.y) < range) {
          document.body.style.cursor = 'nw-resize';
          dir[0] = 1;
          dir[1] = 1;
        }
        if (Math.abs(bounds[0] - wp.x) < range && Math.abs(bounds[3] - wp.y) < range) {
          document.body.style.cursor = 'ne-resize';
          dir[0] = 1;
          dir[1] = 1;
        }
        if (Math.abs(bounds[2] - wp.x) < range && Math.abs(bounds[1] - wp.y) < range) {
          document.body.style.cursor = 'sw-resize';
          dir[0] = 1;
          dir[1] = 1;
        }
        if (Math.abs(bounds[2] - wp.x) < range && Math.abs(bounds[3] - wp.y) < range) {
          document.body.style.cursor = 'se-resize';
          dir[0] = 1;
          dir[1] = 1;
        }
      }
    }
    if (is_down) {
      const cp = Camera.screen_to_world(prev_point.x, prev_point.y);
      const delta = wp.clone().sub(cp);

      const center_x = (bounds[0] + bounds[2]) / 2;
      const center_y = (bounds[1] + bounds[3]) / 2;
      const old_pos = go.mesh.position.clone();
      const old_width = go.parameters.width;
      const old_height = go.parameters.height;
      let new_width = go.parameters.width + delta.x / go.mesh.scale.x;
      let new_height = go.parameters.height - delta.y / go.mesh.scale.y;
      let delta_width = new_width - old_width;
      let delta_height = new_height - old_height;
      if (wp.x < center_x)
        new_width = go.parameters.width - delta.x / go.mesh.scale.x;;
      if (wp.y > center_y)
        new_height = go.parameters.height + delta.y / go.mesh.scale.y;

      go.set_size(dir[0] > 0 ? new_width : old_width, dir[1] > 0 ? new_height : old_height);
      go.mesh.position.set(old_pos.x + delta_width * dir[0], old_pos.y - delta_height * dir[1], old_pos.z);
      if (dir[0] == 0 && dir[1] == 0) {
        const old_pos = go.mesh.position.clone();
        go.mesh.position.set(old_pos.x + delta.x, old_pos.y + delta.y, 0);
      }
    }
  });


  window.addEventListener('click', (event) => {
    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObjects(scene.children);
    if (intersects.length > 0) {
      if ((intersects[0].object as Mesh).userData.type == 'slice9') {
        //go.set_color('#' + Math.floor(Math.random() * 16777215).toString(16));
      }
      else
        ((intersects[0].object as Mesh).material as MeshBasicMaterial).color.setRGB(Math.random(), Math.random(), Math.random());
    }
  });








}
