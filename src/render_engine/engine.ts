import { Clock, Object3D, OrthographicCamera, Raycaster, Scene, Vector2, WebGLRenderer, } from 'three'
import { resize_renderer_to_display_size } from './helpers/window_utils'

declare global {
    const RenderEngine: ReturnType<typeof RenderEngineModule>;
}

export function register_engine() {
    (window as any).RenderEngine = RenderEngineModule();
}


export function RenderEngineModule() {
    const canvas = document.querySelector(`canvas#scene`)!;
    const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true })
    const scene = new Scene();
    const clock = new Clock();
    const camera = new OrthographicCamera(-1, 1, -1, 1, 0, 100);
    const camera_gui = new OrthographicCamera(-1, 1, -1, 1, 0, 100);
    const raycaster = new Raycaster();
    let is_active_gui_camera = false;

    function init() {
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
        renderer.autoClear = false
        camera.position.set(0, 0, 50)
        camera_gui.position.set(0, 0, 50)
        camera_gui.layers.disable(0)
        camera_gui.layers.enable(1)
    }

    function animate() {
        requestAnimationFrame(animate)
        const delta = clock.getDelta();
        if (resize_renderer_to_display_size(renderer))
            on_resize();
        EventBus.trigger('SYS_ON_UPDATE', { dt: delta }, false);
        renderer.clear();
        renderer.render(scene, camera);
        if (is_active_gui_camera) {
            renderer.clearDepth();
            renderer.render(scene, camera_gui);
        }
    }

    function on_resize() {
        EventBus.trigger('SYS_ON_RESIZED', get_render_size(), false);
    }

    function get_render_size() {
        const width = canvas.clientWidth
        const height = canvas.clientHeight
        return { width, height }
    }

    function raycast_scene(n_pos: Vector2) {
        raycaster.setFromCamera(n_pos, camera);
        return raycaster.intersectObjects(scene.children);
    }

    function is_intersected_mesh(n_pos: Vector2, mesh: Object3D) {
        const list = raycast_scene(n_pos);
        for (let i = 0; i < list.length; i++) {
            if (list[i].object === mesh)
                return true;
        }
        return false;
    }

    function set_active_gui_camera(is_active: boolean) {
        is_active_gui_camera = is_active;
    }

    return { init, animate, get_render_size, raycast_scene, is_intersected_mesh, set_active_gui_camera, scene, camera, camera_gui, raycaster, renderer };
}