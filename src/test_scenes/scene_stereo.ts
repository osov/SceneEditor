import { BoxGeometry, CatmullRomCurve3, CylinderGeometry, DepthFormat, DepthTexture, FloatType, LinearFilter, MathUtils, Mesh, MeshBasicMaterial, NearestFilter, OrthographicCamera, PerspectiveCamera, PlaneGeometry, PointLight, RepeatWrapping, RGBAFormat, Scene, ShaderMaterial, SphereGeometry, TorusGeometry, TorusKnotGeometry, TubeGeometry, UnsignedShortType, Vector2, Vector3, WebGLRenderTarget } from 'three'
import { run_debug_filemanager } from '../controls/AssetControl';
import { PROJECT_NAME, SERVER_URL } from '../config';
import { URL_PATHS } from '../modules_editor/modules_editor_const';

const vp = `
varying vec2 vUv;
void main() {
	vUv = uv;
	gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;



let target: WebGLRenderTarget;
function setupRenderTarget() {
    target = new WebGLRenderTarget(window.innerWidth, window.innerHeight);
    target.texture.minFilter = NearestFilter;
    target.texture.magFilter = NearestFilter;
    target.texture.generateMipmaps = false;
    target.depthTexture = new DepthTexture(window.innerWidth, window.innerHeight);
    target.depthTexture.format = DepthFormat;
    target.depthTexture.type = FloatType;
}

let postCamera: OrthographicCamera;
let postMaterial: ShaderMaterial;
let postScene: Scene;
let camera: PerspectiveCamera;
async function setupPost() {
    const shader_path = 'shaders/stereo.fp';
    const fp = (await AssetControl.get_file_data(shader_path)).data!;
    const tex_name = fp.split('\n')[0].substr(2).trim();
    const tex = ResourceManager.get_texture(tex_name).texture;
    tex.wrapS = tex.wrapT = RepeatWrapping;
    tex.minFilter = LinearFilter;
    tex.magFilter = LinearFilter;

    tex.needsUpdate = true;
    const now = System.now_with_ms();
    postCamera = new OrthographicCamera(- 1, 1, 1, - 1, 0, 1);
    postMaterial = new ShaderMaterial({
        vertexShader: vp,
        fragmentShader: fp,
        uniforms: {
            cameraNear: { value: camera.near },
            cameraFar: { value: camera.far },
            tDiffuse: { value: target.texture },
            tDepth: { value: target.depthTexture },
            tRepeat: { value: tex },
            resolution: { value: new Vector2(window.innerWidth, window.innerHeight) },
            u_time: { value: System.now_with_ms() - now }
        }
    });
    EventBus.on('SYS_ON_UPDATE', () => postMaterial.uniforms.u_time.value = System.now_with_ms() - now);
    const postPlane = new PlaneGeometry(2, 2);
    const postQuad = new Mesh(postPlane, postMaterial);
    postScene = new Scene();
    postScene.add(postQuad);

    EventBus.on('SERVER_FILE_SYSTEM_EVENTS', async (e) => {
        let is_change = false;
        for (let i = 0; i < e.events.length; i++) {
            const ev = e.events[i];
            if (ev.path == shader_path)
                is_change = true;
        }
        if (is_change) {
            const fp_data = await AssetControl.get_file_data(shader_path);
            const fp = fp_data.data!;
            postMaterial.fragmentShader = fp;
            const tex_name = fp.split('\n')[0].substr(2).trim();
            const tex = ResourceManager.get_texture(tex_name).texture;
            tex.wrapS = tex.wrapT = RepeatWrapping;
            tex.minFilter = LinearFilter;
            tex.needsUpdate = true;
            postMaterial.uniforms.tRepeat.value = tex;
            postMaterial.needsUpdate = true;
        }
    });
}

export async function run_scene_stereo() {
    (window as any).scene = RenderEngine.scene;
    const renderer = RenderEngine.renderer;
    const scene = RenderEngine.scene;
    camera = RenderEngine.camera as PerspectiveCamera;

    ResourceManager.set_project_path(`${SERVER_URL}${URL_PATHS.ASSETS}`);
    await run_debug_filemanager(PROJECT_NAME);

    const material = new MeshBasicMaterial({ color: 0xffffff });


    var cubes: Mesh[] = [];
    if (false) {

        var arr = [];
        for (let x = 0; x < 15; x++)
            arr.push(new Vector3(MathUtils.randInt(-700, 700), MathUtils.randInt(-450, 450), MathUtils.randInt(0, 900)));

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
            cube.position.z = MathUtils.randInt(0, 500);
            cube.position.x = MathUtils.randInt(-700, 700);
            cube.position.y = MathUtils.randInt(-340, 450);
            cube.rotation.x += MathUtils.randInt(0, 628) / 100;
            cube.rotation.y += MathUtils.randInt(0, 628) / 100;
            (cube as any).sp = cube.position.clone();
            cubes.push(cube);
        }
    }

    setupRenderTarget();
    setupPost();

    RenderEngine.set_active_render(false);

    EventBus.on('SYS_ON_UPDATE', (e) => {
        // render scene into target
        renderer.setRenderTarget(target);
        renderer.clear();
        renderer.render(scene, camera);

        // render post FX
        renderer.setRenderTarget(null);
        renderer.clear();
        renderer.render(postScene, postCamera);

    });
}
