import { BufferGeometry, Line, LineDashedMaterial, Mesh, MeshBasicMaterial, NearestFilter, PlaneGeometry, SphereGeometry, TextureLoader, Vector2, Vector3, Vector4, } from 'three'
import { Slice9Mesh } from './render_engine/slice9';

const debug_poins: Mesh[] = [];

function draw_debug_bb(bb: number[]) {
  debug_poins[0].position.set(bb[0], bb[1], 10);
  debug_poins[1].position.set(bb[2], bb[1], 10);
  debug_poins[2].position.set(bb[2], bb[3], 10);
  debug_poins[3].position.set(bb[0], bb[3], 10);
}



export async function run_debug_scene() {
  // sov width projection
  //Camera.set_width_prjection(-1, 1, 0, 100);
  const scene = RenderEngine.scene;
  const tex = await new TextureLoader().loadAsync('./img/2.png');
  tex.magFilter = NearestFilter;

  for (let i = 0; i < 4; i++) {
    const geometry = new SphereGeometry(8, 4, 2);
    const material = new MeshBasicMaterial({ color: 0xffff00 });
    const sphere = new Mesh(geometry, material);
    scene.add(sphere)
    debug_poins.push(sphere);
  }

  const plane_1 = new Slice9Mesh(64, 64);
  plane_1.set_color('#f00')
  plane_1.position.set(540, 0, 4);
  scene.add(plane_1);

  const plane_2 = new Slice9Mesh(128, 128);
  plane_2.set_color('#0f0')
  plane_2.position.set(540 / 2, -200, 5);
  scene.add(plane_2);

  const plane_3 = new Slice9Mesh(32, 32);
  plane_3.set_color('#00f')
  plane_3.position.set(800, -200, 0.001);
  scene.add(plane_3);

  const plane_4 = new Slice9Mesh(128, 32);
  plane_4.scale.setScalar(2);
  plane_4.position.set(800, -500, 0);
  plane_4.set_slice(8, 8)
  plane_4.set_color('#0f0')
  plane_4.set_texture(tex);
  scene.add(plane_4);

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


  const pointer = new Vector2();
  const click_point = new Vector2();
  const prev_point = new Vector2();
  let is_down = false;
  const dir = [0, 0];

  let selected_go: Slice9Mesh | null = plane_4;
  EventBus.on('SYS_INPUT_POINTER_DOWN', (e) => {
    is_down = true;
    click_point.set(e.x, e.y)
  });

  EventBus.on('SYS_INPUT_POINTER_UP', (e) => {
    is_down = false;
    const len = click_point.clone().sub(pointer).length();
    if (len > 0.001)
      return;

    const intersects = RenderEngine.raycast_scene(pointer);
    if (intersects.length > 0 && intersects[0].object instanceof Slice9Mesh) {
      selected_go = intersects[0].object;
      draw_debug_bb(selected_go.get_bounds());
      //((intersects[0].object as Slice9Mesh).set_color('#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')));
    }
    else {
      selected_go = null;
      draw_debug_bb([0, 0, 0, 0]);
    }
  });



  EventBus.on('SYS_INPUT_POINTER_MOVE', (event) => {
    prev_point.set(pointer.x, pointer.y);
    pointer.x = event.x;
    pointer.y = event.y;
    if (!selected_go)
      return;
    const wp = Camera.screen_to_world(pointer.x, pointer.y);
    const bounds = selected_go.get_bounds();
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
      const old_pos = selected_go.position.clone();
      const old_width = selected_go.parameters.width;
      const old_height = selected_go.parameters.height;
      let new_width = selected_go.parameters.width + delta.x / selected_go.scale.x;
      let new_height = selected_go.parameters.height - delta.y / selected_go.scale.y;
      if (wp.x < center_x)
        new_width = selected_go.parameters.width - delta.x / selected_go.scale.x;
      if (wp.y > center_y)
        new_height = selected_go.parameters.height + delta.y / selected_go.scale.y;
      selected_go.set_size(dir[0] > 0 ? new_width : old_width, dir[1] > 0 ? new_height : old_height);
      selected_go.position.set(old_pos.x + delta.x * dir[0] * 0.5, old_pos.y + delta.y * dir[1] * 0.5, old_pos.z);
      if (dir[0] == 0 && dir[1] == 0) {
        const old_pos = selected_go.position.clone();
        selected_go.position.set(old_pos.x + delta.x, old_pos.y + delta.y, selected_go.position.z);
      }
      draw_debug_bb(selected_go.get_bounds());
    }
  });











}
