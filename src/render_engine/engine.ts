import { AmbientLight, OrthographicCamera, Raycaster, Scene, Vector3, WebGLRenderer, } from 'three'
import { resize_renderer_to_display_size } from '../helpers/window_utils'

declare global {
    const RenderEngine: ReturnType<typeof RenderEngineModule>;
}

export function register_engine() {
    (window as any).RenderEngine = RenderEngineModule();
}


export function RenderEngineModule() {
    let canvas = document.querySelector(`canvas#scene`)!;
    let renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true })
    let scene = new Scene();
    let ambientLight = new AmbientLight(0xffffff, 1);
    const camera = new OrthographicCamera(-1, 1, -1, 1, 0, 100);
    const raycaster = new Raycaster();

    function init() {
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
        scene.add(ambientLight)

        camera.position.set(0, 0, 50)
        camera.lookAt(new Vector3(0, 0, -1))
    }

    function animate() {
        requestAnimationFrame(animate)
        if (resize_renderer_to_display_size(renderer))
            on_resize();
        renderer.render(scene, camera)
    }

    function on_resize() {
        EventBus.trigger('SYS_ON_RESIZED', get_render_size(), false);
    }

    function get_render_size() {
        const width = canvas.clientWidth
        const height = canvas.clientHeight
        return { width, height }
    }

    return { init, animate, get_render_size, scene, camera, raycaster };
}