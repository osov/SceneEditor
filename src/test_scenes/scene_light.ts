import { FloatType, NearestFilter, RGBAFormat, Vector2, Vector3, WebGLRenderTarget } from 'three'
import { run_debug_filemanager } from '../controls/AssetControl';
import { PROJECT_NAME, SERVER_URL, WORLD_SCALAR } from '../config';
import { URL_PATHS } from '../modules_editor/modules_editor_const';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';
import { MapData, preload_tiled_textures, get_all_tiled_textures } from '../render_engine/parsers/tile_parser';
import { IBaseMeshAndThree, IObjectTypes } from '../render_engine/types';
import { TileLoader } from '../render_engine/tile_loader';
import { default_settings, load_obstacles, MovementLogic, PlayerMovementSettings, PointerControl } from '../modules/PlayerMovement';
import { make_ramk, rotate_point, rotate_point_pivot } from '../render_engine/helpers/utils';
import { createRegionManager } from '../utils/region_manager';



export async function run_scene_light() {
    (window as any).scene = RenderEngine.scene;
    const renderer = RenderEngine.renderer;
    const camera = RenderEngine.camera;
    const scene = RenderEngine.scene;

    ResourceManager.set_project_path(`${SERVER_URL}${URL_PATHS.ASSETS}`);
    await run_debug_filemanager(PROJECT_NAME);
    await ResourceManager.preload_atlas('/test_assets/texture.tpsheet', '/test_assets/texture.png');

    const map_data = await ResourceManager.load_asset('/tiled/parsed_map.json') as MapData;
    const physic_layer = { "layer_name": "\u0424\u0438\u0437\u0438\u043a\u0430", "objects": [{ "id": 6779, "x": 2791.0, "y": 2548.0, "polygon": [0.0, 11.0, 261.0, 7.0, 277.0, 53.0, 513.667, 56.6667, 537.667, -3.0, 774.0, -3.0, 796.0, 55.0, 1085.0, 54.0, 1083.0, -3.0, 843.0, 3.0, 829.0, -43.0, 485.667, -43.3333, 476.667, 11.0, 326.0, 11.3333, 305.0, -35.0, -8.0, -35.3333] }, { "id": 6780, "x": 2787.5, "y": 2279.5, "polygon": [22.3333, 65.3333, 38.3329, 7.10877, 257.416, 1.0, 290.598, 53.0, 524.603, 54.0, 544.736, -3.0, 778.28, -3.0, 795.069, 55.0, 1042.67, 73.0, 1016.99, 11.6667, 833.717, 16.3333, 806.479, -38.6667, -33.3333, -30.6667, -33.941, 71.2443] }, { "id": 6783, "x": 2768.0, "y": 2256.0, "polyline": [-10.6667, -8.0, -26.6667, -1.0, -29.0, -272.333, -5.33333, -187.667, 236.667, -207.333, 236.0, -452.667, 249.667, -454.0, 250.0, -258.667, 320.0, -258.0, 365.0, -303.0, 409.0, -324.0, 579.0, -326.0, 625.0, -259.0, 715.0, -223.0, 791.0, -241.0, 829.0, -286.0, 810.0, -345.0, 728.0, -393.0, 639.0, -431.0, 594.0, -514.0, 620.0, -608.0, 711.0, -653.0, 782.0, -668.0, 1006.0, -662.0, 1415.67, -677.333, 1527.53, -644.924, 1537.7, -536.006, 1414.71, -513.277, 1150.67, -543.333, 1039.0, -523.0, 946.0, -434.0, 966.0, -401.0, 949.0, -351.0, 976.0, -261.0, 973.0, -208.0, 911.0, -149.0, 887.0, -85.0, 836.0, -52.0, 838.0, -8.0] }, { "id": 6784, "x": 2602.0, "y": 2255.67, "polygon": [0.0, 0.0, 19.0, -35.0, 9.0, -55.0, 13.0, -277.0, -513.0, -277.0, -521.0, -186.0, -579.667, -197.0, -576.667, -260.333, -587.0, -336.0, -708.0, -407.0, -968.0, -403.0, -1058.0, -308.0, -1058.0, -173.0, -1242.0, -161.0, -1388.0, -164.0, -1397.0, -288.0, -1396.0, -1.0, -1370.0, -34.0, -702.0, -49.0, -586.0, -50.0, -559.0, 195.0, -511.0, 246.0, -136.0, 241.0, -129.0, 106.0] }, { "id": 6786, "x": 3974.67, "y": 2274.67, "polyline": [2.66667, -4.0, -125.333, -2.66667, -122.667, -296.0, 9.33333, -293.333] }] };
    map_data.objects.push(physic_layer as any);
    preload_tiled_textures(map_data);

    // hack atlases
    //const all = get_all_tiled_textures();
    //for (const id in all) {
    //    const tex = all[id];
    //    ResourceManager.override_atlas_texture('', tex.atlas, tex.name);
    //}
    //await ResourceManager.write_metadata();


    const world = SceneManager.create(IObjectTypes.GO_CONTAINER, {});
    world.name = 'TILES';
    SceneManager.add(world);
    world.no_saving = true; //  чтобы не сохранять в файл
    world.no_removing = true; //  чтобы не удалять из сцены
    const tl = TileLoader(world, 256);
    const tiles = tl.load(map_data);

    const cell_size = 150 * WORLD_SCALAR;
    const rm = createRegionManager(cell_size, 3);
    (window as any).rm = rm;
    for (const id in tiles) {
        const info = tiles[id];
        if (['Flowers_1', 'Flowers_2', 'Flowers_3', 'Flowers_4'].includes(info.tile_info.name)) {
            const size = info._hash.get_size();
            rm.add_region(info._hash.position.x, info._hash.position.y, size.x, size.y);
        }
    }
    const cells = rm.get_debug_cells();
    for (let i = 0; i < cells.length; i++) {
        const it = cells[i];
        const l = make_ramk(cell_size, cell_size);
        l.position.set(it.x + cell_size / 2, it.y + cell_size / 2, 9000);
        //RenderEngine.scene.add(l);
        const m = SceneManager.create(IObjectTypes.GO_LABEL_COMPONENT, { text: it.x + '\n' + it.y });
        (m as any).no_saving = true; //  чтобы не сохранять в файл
        (m as any).no_removing = true;
        m.maxWidth = 100;
        m.scale.setScalar(0.04);
        //SceneManager.add(m);
        m.position.set(it.x + cell_size / 2, it.y + cell_size / 2, 9000);
    }
    setInterval(() => rm.update(), 200);


    FlowMapControl.init();
    await FlowMapControl.load_saved();

    GrassTreeControl.init();
    await GrassTreeControl.load_saved();

    await PaintInspector.load_shader();

    // await AssetControl.open_scene('/LIGHT.scn');
    await PaintInspector.load_saved();

    const am = SceneManager.create(IObjectTypes.GO_MODEL_COMPONENT, { width: 50 * WORLD_SCALAR, height: 50 * WORLD_SCALAR });
    am.set_mesh('Unarmed Idle');
    am.children[0].scale.setScalar(1 / 150 * WORLD_SCALAR);
    am.add_animation('Unarmed Idle', 'idle');
    am.add_animation('Unarmed Run Forward', 'walk');
    am.set_texture('PolygonExplorers_Texture_01_A')
    am.rotateX(30 / 180 * Math.PI)
    am.position.set(313, -245, 6000)
    am.no_saving = true;
    SceneManager.add(am);

    let game_mode = new URLSearchParams(document.location.search).get('is_game') == '1';
    if (game_mode) {
        const movement_settings: PlayerMovementSettings = {
            ...default_settings,
            collision_radius: 2,
            speed: { WALK: 18 },
            debug: true,
        }
        const obstacles = load_obstacles(map_data);
        const move_logic = MovementLogic(movement_settings);
        move_logic.init({ model: am, obstacles });
        EventBus.on('SYS_VIEW_INPUT_KEY_UP', (e) => {
            if (e.key == 'ь' || e.key == 'm') {
                if (move_logic.check_obstacles_enabled()) move_logic.enable_obstacles(false);
                else move_logic.enable_obstacles(true);
            }
        })
    }

    function rebuild_light() {
        const lights = scene.getObjectByName('LIGHTS');
        if (lights) {
            lights.traverse((light) => {
                if (light.type == IObjectTypes.GO_CONTAINER)
                    return;
                light.layers.enable(2);
                light.layers.disable(0);
                //((light as any).material as MeshBasicMaterial).blending = AdditiveBlending;
            });
        }

    }
    EventBus.on('SYS_SELECTED_MESH_LIST', rebuild_light);
    rebuild_light();



    const renderTargetOptions = {
        format: RGBAFormat,
        type: FloatType
    };
    const sceneRenderTarget = new WebGLRenderTarget(window.innerWidth, window.innerHeight, renderTargetOptions);
    const lightRenderTarget = new WebGLRenderTarget(window.innerWidth, window.innerHeight, renderTargetOptions);

    const composer = new EffectComposer(renderer);
    const fp = (await AssetControl.get_file_data('shaders/light.fp')).data!;
    const lut_name = fp.split('\n')[0].substr(2).trim();

    const LightShader = {
        uniforms: {
            'tScene': { value: null },
            'tLight': { value: null },
            'tLUT': { value: null },
            'lightIntensity': { value: 1.0 },
            'resolution': { value: new Vector2(window.innerWidth, window.innerHeight) }

        },
        vertexShader: (await AssetControl.get_file_data('shaders/light.vp')).data,
        fragmentShader: fp
    };
    const lut = ResourceManager.get_texture(lut_name).texture;
    lut.minFilter = NearestFilter;
    const lightPass = new ShaderPass(LightShader);
    lightPass.uniforms.tScene.value = sceneRenderTarget.texture;
    lightPass.uniforms.tLight.value = lightRenderTarget.texture;
    lightPass.uniforms.tLUT.value = lut;
    lightPass.uniforms.lightIntensity.value = 1.0;
    lightPass.uniforms.resolution.value = new Vector2(window.innerWidth, window.innerHeight);
    composer.addPass(lightPass);
    (window as any).lightPass = lightPass;

    //const fxaaPass = new ShaderPass(FXAAShader);
    //fxaaPass.uniforms['resolution'].value.set(1 / window.innerWidth, 1 / window.innerHeight);
    //composer.addPass(fxaaPass);

    EventBus.on('SERVER_FILE_SYSTEM_EVENTS', async (e) => {
        let is_change = false;
        for (let i = 0; i < e.events.length; i++) {
            const ev = e.events[i];
            if (ev.path == 'shaders/light.fp')
                is_change = true;
        }
        if (is_change) {
            const fp_data = await AssetControl.get_file_data('shaders/light.fp');
            const fp = fp_data.data!;
            lightPass.material.fragmentShader = fp;
            const lut = fp.split('\n')[0].substr(2).trim();
            log('changed', lut);
            const tex = ResourceManager.get_texture(lut).texture;
            tex.minFilter = NearestFilter;
            lightPass.material.uniforms.tLUT.value = tex;
            lightPass.material.needsUpdate = true;
        }
    });

    scene.background = null;
    RenderEngine.set_active_render(false);

    EventBus.on('SYS_ON_UPDATE', (e) => {
        const old = camera.layers.mask;
        ControlManager.clear_draw_calls();
        // Рендерим сцену в текстуру
        renderer.setRenderTarget(sceneRenderTarget);
        renderer.setClearColor(0x000000, 1);
        renderer.clear();
        renderer.render(scene, camera);
        ControlManager.inc_draw_calls(renderer.info.render.calls);

        // Рендерим светящиеся объекты в другую текстуру
        camera.layers.set(2);
        renderer.setRenderTarget(lightRenderTarget);
        renderer.setClearColor(0x222222, 1);
        renderer.clear();
        renderer.render(scene, camera);
        ControlManager.inc_draw_calls(renderer.info.render.calls);
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

    ControlManager.update_graph(true, 'light');

    const now = System.now_with_ms();
    EventBus.on('SYS_ON_UPDATE', (e) => {
        const materials = ResourceManager.get_all_materials();
        const t = System.now_with_ms() - now;
        for (const m of materials)
            ResourceManager.set_material_uniform_for_original(m, 'u_time', t);
    });

    rotate_obj(2322);
    rotate_obj(2323);
    rotate_obj(2324);
    rotate_obj(2325);
}

function rotate_obj(id: number) {
    const m = SceneManager.get_mesh_by_id(id)!;
    let angle = m.rotation.z / Math.PI * 180;
    EventBus.on('SYS_ON_UPDATE', (e) => {
        const p = m.position;
        const offset = -1;
        angle += offset;
        const new_p = rotate_point_pivot(new Vector3(p.x, p.y, 0), new Vector2(-7.9, -182), offset);
        m.set_position(new_p.x, new_p.y);
        m.rotation.z = angle * Math.PI / 180;
    });
}

