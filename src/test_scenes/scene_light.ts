import { FloatType, NearestFilter, RGBAFormat, Vector2, Vector3, WebGLRenderTarget } from 'three'
import { run_debug_filemanager } from '../controls/AssetControl';
import { PROJECT_NAME, SERVER_URL, WORLD_SCALAR } from '../config';
import { URL_PATHS } from '../modules_editor/modules_editor_const';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';
import { MapData, preload_tiled_textures, get_all_tiled_textures } from '../render_engine/parsers/tile_parser';
import { IObjectTypes } from '../render_engine/types';
import { TileLoader } from '../render_engine/tile_loader';
import { calculate_borders, default_settings, MovementLogic, PathFinderMode, PlayerMovementSettings } from '../modules/PlayerMovement';
import { Segment } from '2d-geometry';



export async function run_scene_light() {
    (window as any).scene = RenderEngine.scene;
    const renderer = RenderEngine.renderer;
    const camera = RenderEngine.camera;
    const scene = RenderEngine.scene;

    ResourceManager.set_project_path(`${SERVER_URL}${URL_PATHS.ASSETS}`);
    await run_debug_filemanager(PROJECT_NAME);
    await ResourceManager.preload_atlas('/test_assets/texture.tpsheet', '/test_assets/texture.png');

    const map_data = await ResourceManager.load_asset('/tiled/parsed_map.json') as MapData;
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
    tl.load(map_data);

    //const spl = SceneManager.create(IObjectTypes.COMPONENT_SPLINE);
    //spl.set_position(320, -245, 5000);
    //spl.add_point(335, -240);
    //spl.add_point(345, -260);
    //SceneManager.add(spl);

    FlowMapControl.init();
    await FlowMapControl.load_shader();
    await FlowMapControl.load_saved();

    GrassTreeControl.init();
    await GrassTreeControl.load_shader();
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
            path_finder_mode: PathFinderMode.WAY_PREDICTION,
            collision_radius: 2,
            max_try_dist: 0.5,
            target_stop_distance: 0.2,
            speed: { WALK: 18 },
            blocked_move_min_dist: 0.01
        }
        const obstacles: Segment[] = [];
        const all_objects = SceneManager.get_scene_list();
        for (const id in all_objects) {
            const obj = all_objects[id];
            if (obj.name.includes("Fence")) {
                obstacles.push(...calculate_borders(obj))
            }
        }
        const move_logic = MovementLogic(movement_settings);
        move_logic.init(am, obstacles);
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

}
