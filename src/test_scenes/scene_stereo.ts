import { AdditiveBlending, BoxGeometry, CatmullRomCurve3, CylinderGeometry, DepthFormat, FloatType, LinearFilter, MathUtils, Mesh, MeshBasicMaterial, NearestFilter, PointLight, RepeatWrapping, RGBAFormat, ShaderMaterial, SphereGeometry, TorusGeometry, TorusKnotGeometry, TubeGeometry, Vector2, Vector3, WebGLRenderTarget } from 'three'
import { run_debug_filemanager } from '../controls/AssetControl';
import { PROJECT_NAME, SERVER_URL, WORLD_SCALAR } from '../config';
import { URL_PATHS } from '../modules_editor/modules_editor_const';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';
import { MapData, preload_tiled_textures, get_all_tiled_textures } from '../render_engine/parsers/tile_parser';
import { IBaseMeshAndThree, IObjectTypes } from '../render_engine/types';
import { TileLoader } from '../render_engine/tile_loader';



export async function run_scene_stereo() {
    (window as any).scene = RenderEngine.scene;
    const renderer = RenderEngine.renderer;
    const camera = RenderEngine.camera;
    const scene = RenderEngine.scene;

    ResourceManager.set_project_path(`${SERVER_URL}${URL_PATHS.ASSETS}`);
    await run_debug_filemanager(PROJECT_NAME);

    const material = new MeshBasicMaterial({ color: 0xa00f0f });
    // const cube = new THREE.Mesh(geometry, material);
    // cube.position.z = 500;
    // cube.rotation.x += 0.5;
    // cube.rotation.y += 0.8;
    // RenderSystem.scene.add(cube);
    // light 
    const light = new PointLight(0xffffff, 1, 1000, 2);
    light.position.set(200, 0, 0);
    scene.add(light);

    var cubes: Mesh[] = [];
    if (false) {

        var arr = [];
        for (let x = 0; x < 15; x++)
            arr.push(new Vector3(MathUtils.randInt(-900, 900), MathUtils.randInt(-450, 450), MathUtils.randInt(0, 900)));

        const extrudePath = new CatmullRomCurve3(arr);
        geometry = new TubeGeometry(extrudePath, 200, 40, 30, true);

        const cube = new Mesh(geometry, material);
        RenderEngine.scene.add(cube);

    }
    else {
        for (let i = 0; i < 10; i++) {

            var s = MathUtils.randInt(30, 200);
            var r = MathUtils.randFloat(20, 100);
            var geometry: any;
            var ra = MathUtils.randInt(0, 100);
            if (ra < 20)
                geometry = new TorusGeometry(r, r * MathUtils.randFloat(0.1, 0.7), 16, 100);
            else if (ra > 20 && ra < 40)
                geometry = new CylinderGeometry(MathUtils.randFloat(20, 100), MathUtils.randFloat(20, 100), MathUtils.randFloat(10, 200), 32);
            else if (ra > 40 && ra < 70)
                geometry = new SphereGeometry(MathUtils.randFloat(20, 100), 32, 16);
            else if (ra > 70 && ra < 80)
                geometry = new TorusKnotGeometry(r, r * MathUtils.randFloat(0.2, 0.5), 100, 16);
            else
                geometry = new BoxGeometry(s, s, s);

            const cube = new Mesh(geometry, material);
            RenderEngine.scene.add(cube);
            cube.position.z = MathUtils.randInt(200, 700);
            cube.position.x = MathUtils.randInt(-700, 700);
            cube.position.y = MathUtils.randInt(-340, 450);
            cube.rotation.x += MathUtils.randInt(0, 628) / 100;
            cube.rotation.y += MathUtils.randInt(0, 628) / 100;
            (cube as any).sp = cube.position.clone();
            cubes.push(cube);
        }
    }



    const renderTargetOptions = {
        format: RGBAFormat,
        type: FloatType
    };
    const sceneRenderTarget = new WebGLRenderTarget(window.innerWidth, window.innerHeight, renderTargetOptions);
    const composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);


    scene.background = null;
    RenderEngine.set_active_render(false);

    EventBus.on('SYS_ON_UPDATE', (e) => {
        renderer.setRenderTarget(sceneRenderTarget);
        renderer.setClearColor(0x000000, 1);
        renderer.clear();
        renderer.render(scene, camera);

        // Финальный рендер с постпроцессингом
        renderer.setRenderTarget(null);
        renderer.setClearColor(0x000000, 1);
        renderer.clear();
        composer.render();
    });
}
