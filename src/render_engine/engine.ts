/* 

ParticlePool - нельзя задать прямоугольный размер, при вращении захватывает края чужих текстур если из атласа
 InstanceBufferPool - нет Z сортировки
 InstanceMesh2Pool - при кастомных атрибутах на объект неверно сортирует их для скрытия и поэтому атрибуты назначаются другим, надо отключать куллинг для каждого и тогда теряется смысл
https://stackoverflow.com/questions/76514035/how-to-render-1000-2d-text-labels-using-three-js - хороший пример InstancedBufferGeometry для создания текста из атлас текстуры
 */
import { Clock, Color, Object3D, OrthographicCamera, Raycaster, Scene, Vector2, WebGLRenderer, } from 'three'
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
    scene.background = new Color('#222');
    const clock = new Clock();
    const camera = new OrthographicCamera(-1, 1, -1, 1, 0, 100);
    const camera_gui = new OrthographicCamera(-1, 1, -1, 1, 0, 100);
    const raycaster = new Raycaster();
    let is_active_gui_camera = false;
    const raycast_list: Object3D[] = [];

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
        EventBus.trigger('SYS_ON_UPDATE_END', { dt: delta }, false);
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
        raycaster.layers.enable(31);
        const list = raycaster.intersectObjects(scene.children);
        if (raycast_list.length > 0) {
            for (let i = 0; i < raycast_list.length; i++) {
                const tmp = raycaster.intersectObject(raycast_list[i], true);
                if (tmp.length > 0)
                    list.push(...tmp);
            }
        }
        return list;
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

    return { init, animate, get_render_size, raycast_scene, is_intersected_mesh, set_active_gui_camera, scene, camera, camera_gui, raycaster, renderer, raycast_list };
}