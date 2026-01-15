/**
 * Legacy RenderEngine - обёртка над DI RenderService
 *
 * Сохраняет обратную совместимость с существующим кодом,
 * делегируя работу к DI RenderService.
 */

import { Object3D, OrthographicCamera, Raycaster, Vector2 } from 'three';
import type { Camera, Scene, WebGLRenderer } from 'three';
import type { IRenderService } from '../engine/types';
import { get_container } from '../core/di/Container';
import { TOKENS } from '../core/di/tokens';
import { CAMERA_Z } from '../config';

declare global {
    const RenderEngine: ILegacyRenderEngine;
}

/** Слои рендеринга */
const DC_LAYERS = {
    GO_LAYER: 0,        // Сцена
    GUI_LAYER: 1,       // Гуи камера
    CONTROLS_LAYER: 30, // Контролы
    RAYCAST_LAYER: 31,  // Можно рейкастить
} as const;

/** Интерфейс legacy RenderEngine */
interface ILegacyRenderEngine {
    DC_LAYERS: typeof DC_LAYERS;
    init(): void;
    animate(): void;
    get_render_size(): { width: number; height: number };
    raycast_scene(n_pos: Vector2): ReturnType<Raycaster['intersectObjects']>;
    is_intersected_mesh(n_pos: Vector2, mesh: Object3D): boolean;
    set_active_gui_camera(is_active: boolean): void;
    set_active_render(is_active: boolean): void;
    is_active_render(): boolean;
    scene: Scene;
    camera: Camera;
    camera_gui: OrthographicCamera;
    raycaster: Raycaster;
    renderer: WebGLRenderer;
    raycast_list: Object3D[];
}

/** Кэш для DI RenderService */
let _render_service: IRenderService | undefined;

/** Получить DI RenderService */
function get_render_service(): IRenderService | undefined {
    if (_render_service === undefined) {
        const container = get_container();
        if (container !== undefined) {
            _render_service = container.try_resolve<IRenderService>(TOKENS.Render);
        }
    }
    return _render_service;
}

/** Регистрация глобального RenderEngine */
export function register_engine(): void {
    (window as unknown as Record<string, unknown>).RenderEngine = create_legacy_render_engine();
}

/** Создать legacy RenderEngine обёртку */
function create_legacy_render_engine(): ILegacyRenderEngine {
    // Создаём GUI камеру (она не часть DI RenderService)
    const camera_gui = new OrthographicCamera(-1, 1, -1, 1, 0, 100);
    camera_gui.position.set(0, 0, CAMERA_Z);
    camera_gui.layers.disable(DC_LAYERS.GO_LAYER);
    camera_gui.layers.enable(DC_LAYERS.GUI_LAYER);

    // Создаём raycaster
    const raycaster = new Raycaster();

    // Дополнительный список для raycast
    const raycast_list: Object3D[] = [];

    // Геттеры для объектов из DI
    const get_scene = (): Scene => {
        const svc = get_render_service();
        if (svc === undefined) {
            throw new Error('RenderService не инициализирован');
        }
        return svc.scene;
    };

    const get_camera = (): Camera => {
        const svc = get_render_service();
        if (svc === undefined) {
            throw new Error('RenderService не инициализирован');
        }
        return svc.camera;
    };

    const get_renderer = (): WebGLRenderer => {
        const svc = get_render_service();
        if (svc === undefined) {
            throw new Error('RenderService не инициализирован');
        }
        return svc.renderer;
    };

    // Методы

    function init(): void {
        // Инициализация уже выполнена в DI RenderService
        // Настраиваем только GUI камеру
        camera_gui.position.set(0, 0, CAMERA_Z);
    }

    function animate(): void {
        // Цикл рендеринга управляется DI RenderService.start()
        // Этот метод оставлен для совместимости, но ничего не делает
    }

    function get_render_size(): { width: number; height: number } {
        const svc = get_render_service();
        if (svc !== undefined) {
            return svc.get_render_size();
        }
        return { width: window.innerWidth, height: window.innerHeight };
    }

    function raycast_scene(n_pos: Vector2): ReturnType<Raycaster['intersectObjects']> {
        const camera = get_camera();
        const scene = get_scene();

        raycaster.setFromCamera(n_pos, camera);
        raycaster.layers.enable(DC_LAYERS.RAYCAST_LAYER);

        const list = raycaster.intersectObjects(scene.children);

        // Добавляем результаты из дополнительного списка
        for (const obj of raycast_list) {
            const tmp = raycaster.intersectObject(obj, true);
            if (tmp.length > 0) {
                list.push(...tmp);
            }
        }

        return list;
    }

    function is_intersected_mesh(n_pos: Vector2, mesh: Object3D): boolean {
        const list = raycast_scene(n_pos);
        for (const intersection of list) {
            if (intersection.object === mesh) {
                return true;
            }
        }
        return false;
    }

    function set_active_gui_camera(is_active: boolean): void {
        const svc = get_render_service();
        if (svc !== undefined) {
            svc.set_gui_camera_active(is_active);
        }
    }

    function set_active_render(is_active: boolean): void {
        const svc = get_render_service();
        if (svc !== undefined) {
            svc.set_active(is_active);
        }
    }

    function is_active_render_fn(): boolean {
        const svc = get_render_service();
        return svc?.is_active() ?? true;
    }

    // Создаём объект с геттерами для scene/camera/renderer
    return {
        DC_LAYERS,
        init,
        animate,
        get_render_size,
        raycast_scene,
        is_intersected_mesh,
        set_active_gui_camera,
        set_active_render,
        is_active_render: is_active_render_fn,
        get scene() { return get_scene(); },
        get camera() { return get_camera(); },
        camera_gui,
        raycaster,
        get renderer() { return get_renderer(); },
        raycast_list,
    };
}

/** Сброс кэша (для тестов) */
export function reset_render_engine_cache(): void {
    _render_service = undefined;
}