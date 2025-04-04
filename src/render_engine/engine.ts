/* 
TODO:
на старом телефоне не работает движок, тк WebGL2 недоступен, а он последний раз был в версии 0.162

инфа по пулам:
ParticlePool - нельзя задать прямоугольный размер, при вращении захватывает края чужих текстур если из атласа
InstanceBufferPool - нет Z сортировки
https://stackoverflow.com/questions/76514035/how-to-render-1000-2d-text-labels-using-three-js - хороший пример InstancedBufferGeometry для создания текста из атлас текстуры
*/
import { Clock, Color, Object3D, OrthographicCamera, PerspectiveCamera, Raycaster, Scene, Vector2, WebGLRenderer, } from 'three'
import { resize_renderer_to_display_size } from './helpers/window_utils'
import { CAMERA_FAR, CAMERA_Z, IS_CAMERA_ORTHOGRAPHIC } from '../config';
declare global {
    const RenderEngine: ReturnType<typeof RenderEngineModule>;
}

export function register_engine() {
    (window as any).RenderEngine = RenderEngineModule();
}


export function RenderEngineModule() {
    const canvas = document.querySelector(`canvas#scene`)!;
    const renderer = new WebGLRenderer({ canvas, antialias: !true, alpha: false, preserveDrawingBuffer: true })
    const scene = new Scene();
    scene.background = new Color('#222');
    const clock = new Clock();
    const camera =
        IS_CAMERA_ORTHOGRAPHIC ?
            new OrthographicCamera(-1, 1, -1, 1, 0, CAMERA_FAR) :
            new PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.01, CAMERA_FAR);

    const camera_gui = new OrthographicCamera(-1, 1, -1, 1, 0, 100);
    const raycaster = new Raycaster();
    let is_active_gui_camera = false;
    const raycast_list: Object3D[] = [];
    let _is_active_render = true;

    enum DC_LAYERS {
        GO_LAYER = 0, // Сцена
        GUI_LAYER = 1, // Гуи камера
        CONTROLS_LAYER = 30, // контролы
        RAYCAST_LAYER = 31, // можно рейкастить
    }

    function init() {
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
        // renderer.autoClear = false;
        renderer.autoClearColor = false
        //  renderer.autoClearDepth = false
        // renderer.autoClearStencil = false
        camera.position.set(0, 0, CAMERA_Z)
        camera_gui.position.set(0, 0, CAMERA_Z)
        camera_gui.layers.disable(DC_LAYERS.GO_LAYER)
        camera_gui.layers.enable(DC_LAYERS.GUI_LAYER)
    }

    function animate() {
        requestAnimationFrame(animate)
        const delta = clock.getDelta();
        if (resize_renderer_to_display_size(renderer))
            on_resize();
        EventBus.trigger('SYS_ON_UPDATE', { dt: delta }, false);
        if (_is_active_render) {
            renderer.clear();
            renderer.render(scene, camera);
            if (is_active_gui_camera) {
                renderer.clearDepth();
                renderer.render(scene, camera_gui);
            }
        }
        EventBus.trigger('SYS_ON_UPDATE_END', { dt: delta }, false);
        // controls рисуем позже чем тригер чтобы верно посчитать DC
        if (_is_active_render) {
            const mask = camera.layers.mask;
            camera.layers.set(DC_LAYERS.CONTROLS_LAYER);
            renderer.clearDepth();
            renderer.render(scene, camera);
            camera.layers.mask = mask;
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
        raycaster.layers.enable(DC_LAYERS.RAYCAST_LAYER);
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

    function set_active_render(is_active: boolean) {
        _is_active_render = is_active;
    }

    function is_active_render() {
        return _is_active_render;
    }

    return { DC_LAYERS, init, animate, get_render_size, raycast_scene, is_intersected_mesh, set_active_gui_camera, set_active_render, is_active_render, scene, camera, camera_gui, raycaster, renderer, raycast_list };
}