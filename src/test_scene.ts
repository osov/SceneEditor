import { BufferGeometry, Line, LineDashedMaterial, NearestFilter, Vector2, Vector3, Vector4, } from 'three'
import { IObjectTypes } from './render_engine/types';
import { ChangeInfo, PropertyType } from './controls/InspectorControl';
import { CreateInstanceMesh2Pool } from './render_engine/objects/pools/instance_mesh_2_pool';
import { run_debug_filemanager } from './controls/AssetControl';

export async function run_debug_scene() {
  // sov width projection
  //Camera.set_width_prjection(-1, 1, 0, 100);
  const scene = RenderEngine.scene;
  (window as any).scene = RenderEngine.scene;
  await ResourceManager.preload_font('ShantellSans-Light11.ttf')
  const tex = await ResourceManager.preload_texture('./img/2.png');
  tex.texture.magFilter = NearestFilter;

  //const tex2 = await ResourceManager.preload_texture('/assets/textures/cir_b.png');


  const plane_1 = SceneManager.create(IObjectTypes.SLICE9_PLANE, { width: 50, height: 50 });
  plane_1.set_color('#f00')
  plane_1.position.set(540, 0, 4);
  SceneManager.add(plane_1);

  const plane_2 = SceneManager.create(IObjectTypes.SLICE9_PLANE, { width: 16, height: 16 });
  plane_2.set_color('#0f0')
  plane_2.position.set(540, -200, 5);
  SceneManager.add(plane_2);

  const plane_3 = SceneManager.create(IObjectTypes.SLICE9_PLANE, { width: 200, height: 200 });
  plane_3.set_color('#00f')
  plane_3.position.set(300, -300, 0.001);
  SceneManager.add(plane_3);

  const plane_4 = SceneManager.create(IObjectTypes.SLICE9_PLANE, { width: 128, height: 32 });
  plane_4.scale.setScalar(2);
  plane_4.position.set(300, -500, 0);
  plane_4.set_slice(8, 8)
  plane_4.set_color('#0f0')
  plane_4.set_texture('2');
  SceneManager.add(plane_4);



  const offset = 0.5;
  var points = [
    new Vector3(-offset, offset, 0),
    new Vector3(offset, offset, 0),
    new Vector3(offset, - offset, 0),
    new Vector3(-offset, - offset, 0),
    new Vector3(-offset, offset, 0),
  ];

  var geometry = new BufferGeometry().setFromPoints(points);
  var line = new Line(geometry, new LineDashedMaterial({ color: 0xffaa00, dashSize: 0.005, gapSize: 0.005 }));
  line.scale.set(540, 960, 1);
  line.position.x = 270;
  line.position.y = -480;
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


  const t = SceneManager.create(IObjectTypes.TEXT, { text: 'Образец текста раз два три', width: 250, height: 50 });
  t.set_color('#0f0');
  t.set_font('ShantellSans-Light11');
  t.fontSize = 32;
  t.position.set(300, -300, 0.3)
  SceneManager.add(t);


  tmp = SceneManager.create(IObjectTypes.SLICE9_PLANE, { width: 15, height: 2 });
  tmp.position.set(300, -305, 0.2)
  SceneManager.add(tmp);

  CameraControl.set_position(300, -450);
  CameraControl.set_zoom(1.);

  plane_3.set_size(50, 50);
  SceneManager.move_mesh_id(plane_3.mesh_data.id, plane_4.mesh_data.id, 0);

  //log('source:', SceneManager.debug_graph(scene));
  //SceneManager.move_mesh_id(21, 10, 13);
  //log('new:', SceneManager.debug_graph(scene));
  //log(SceneManager.make_graph());

  ControlManager.update_graph();

  run_debug_inpector();
  run_debug_filemanager();

  await ResourceManager.preload_atlas('./img/example_atlas.tpsheet', './img/example_atlas.png');
  const count = 400;
  const pool = CreateInstanceMesh2Pool(count);
  pool.set_atlas('example_atlas');
  scene.add(pool.mesh);
  (window as any).pool = pool;
  let id = 0;

  const dc = ['b2', 'b3', 'b4', 'b5', 'b6', 'b7', 'b8', 'b9', 'b10', 'bt'];
  for (let i = 0; i < 20; i++) {
    for (let j = 0; j < 10; j++) {
      pool.set_position(id, new Vector3(j * 35 - 250, - i * 35 - 150, (i + j) * 0.001));
      pool.set_texture(id, dc[i % dc.length])
      pool.set_rotation(id, -i * 10)
      pool.set_size(id, 32, 50)
      id++;
    }
  }

  for (let i = 0; i < 10; i++) {
    for (let j = 0; j < 10; j++) {
      pool.set_texture(id, 'Rectangle 207')
      pool.set_slice(id, 15, 20)
      pool.set_size(id, 30 * (i + 2), 30 * (j + 2))
      pool.set_position(id, new Vector3(i * 40 + 450, - j * 55 - 150, (i + j) * 0.001));
      pool.set_rotation(id, i * 10)
      id++;
    }
  }
}

function run_debug_inpector() {
  const spriteFiles = document.querySelectorAll<HTMLElement>("#sprite-file");
  spriteFiles.forEach((file) => {
    file.addEventListener("dragstart", (event: DragEvent) => {
      if (!event.dataTransfer)
        return;
      event.dataTransfer.clearData();
      event.dataTransfer.setData("text/plain", file.getAttribute("data-value") || '');
    });
  });

  InspectorControl.setup_config([
    {
      name: 'base',
      title: '',
      property_list: [
        { name: 'id', title: 'ID', type: PropertyType.NUMBER, readonly: true },
        { name: 'name', title: 'Название', type: PropertyType.STRING, }
      ]
    },
    {
      name: 'transform',
      title: 'Трансформ',
      property_list: [
        { name: 'position', title: 'Позиция', type: PropertyType.VECTOR_3 },
        { name: 'rotation', title: 'Вращение', type: PropertyType.VECTOR_3 },
        { name: 'scale', title: 'Маштаб', type: PropertyType.VECTOR_3 }
      ]
    },
    {
      name: 'test',
      title: 'Тестовые',
      property_list: [
        { name: 'point', title: 'Поинт', type: PropertyType.POINT_2D },
        { name: 'vec2', title: 'Вектор2', type: PropertyType.VECTOR_2 },
        { name: 'vec4', title: 'Вектор4', type: PropertyType.VECTOR_4 },
        { name: 'checkbox', title: 'Чек', type: PropertyType.BOOLEAN },
        { name: 'color', title: 'Цвет', type: PropertyType.COLOR },
        { name: 'click', title: 'Кликнуть', type: PropertyType.BUTTON },
        {
          name: 'textures', title: 'Текстура', type: PropertyType.LIST_TEXTURES, params: [
            { value: 'test', src: './img/2.png' },
            { value: 'img_1', src: 'https://images.freeimages.com/image/previews/b48/nature-stroke-png-design-5690476.png?fmt=webp&w=500' },
            { value: 'img_2', src: 'https://images.freeimages.com/image/previews/50b/japanese-bonsai-nature-hand-png-5692400.png?fmt=webp&w=500' }
          ]
        },
        {
          name: 'list', title: 'Лист', type: PropertyType.LIST_TEXT, params: {
            'C++': 'C++',
            Test: 'Test',
            Key: 'Key'
          }
        },
        { name: 'mult', title: 'Текст', type: PropertyType.LOG_DATA }
      ]
    }
  ]);

  InspectorControl.set_data([
    {
      id: 1, data: [
        { name: 'id', data: 1 },
        { name: 'name', data: 'test1' },
        { name: 'position', data: new Vector3(0, 5, 0) },
        { name: 'rotation', data: new Vector3(0, 0, 0) },
        { name: 'scale', data: new Vector3(1, 1, 1) },
        { name: 'point', data: new Vector2(134, 234) },
        { name: 'vec2', data: new Vector2(134, 234) },
        { name: 'vec4', data: new Vector4(1, 343, 1, 6565) },
        { name: 'checkbox', data: true },
        { name: 'color', data: "#ff0000" },
        { name: 'click', data: () => log('click') },
        { name: 'textures', data: '' },
        { name: 'mult', data: 'text1\ntext2' },
        { name: 'list', data: 'C++' },
      ]
    },
    {
      id: 2, data: [
        { name: 'id', data: 1 },
        { name: 'name', data: 'test1' },
        { name: 'position', data: new Vector3(0, 10, 0) },
        { name: 'rotation', data: new Vector3(0, 0, 0) },
        { name: 'scale', data: new Vector3(1, 1, 1) },
        { name: 'point', data: new Vector2(134, 234) },
        { name: 'vec2', data: new Vector2(134, 234) },
        { name: 'vec4', data: new Vector4(1, 343, 1, 6565) },
        { name: 'checkbox', data: true },
        { name: 'color', data: "#ff0000" },
        { name: 'click', data: () => log('click') },
        { name: 'textures', data: '' },
        { name: 'mult', data: 'text1\ntext2' },
        { name: 'list', data: 'C++' },
      ]
    }
  ]);

  EventBus.on('SYS_INSPECTOR_UPDATED_VALUE', (data: ChangeInfo) => {
    console.log(data);
  });
}