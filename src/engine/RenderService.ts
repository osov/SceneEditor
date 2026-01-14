/**
 * RenderService - сервис рендеринга Three.js
 *
 * Управляет Three.js сценой, камерой, рендерером.
 * Работает через DI без глобальных переменных.
 */

import {
    Clock,
    Color,
    OrthographicCamera,
    PerspectiveCamera,
    Raycaster,
    Scene,
    WebGLRenderer,
    NoColorSpace,
} from 'three';
import type { Camera, Intersection, Object3D, Vector2 } from 'three';
import type {
    IRenderService,
    RenderServiceParams,
    RenderServiceConfig,
    RenderSize,
} from './types';

/** Слои рендеринга для draw calls */
export enum RenderLayers {
    /** Основной слой сцены */
    GO_LAYER = 0,
    /** Слой GUI камеры */
    GUI_LAYER = 1,
    /** Слой контролов редактора */
    CONTROLS_LAYER = 30,
    /** Слой для raycast */
    RAYCAST_LAYER = 31,
}

/** Дефолтная конфигурация */
const DEFAULT_CONFIG: Required<RenderServiceConfig> = {
    canvas: undefined as unknown as HTMLCanvasElement,
    antialias: false,
    orthographic: true,
    camera_far: 10000,
    camera_z: 1000,
    half_fps: false,
};

/** Создать RenderService */
export function create_render_service(params: RenderServiceParams): IRenderService {
    const { logger, event_bus, config } = params;
    const merged_config = { ...DEFAULT_CONFIG, ...config };

    // Внутреннее состояние
    let canvas: HTMLCanvasElement | undefined;
    let renderer: WebGLRenderer | undefined;
    let scene: Scene | undefined;
    let clock: Clock | undefined;
    let camera: Camera | undefined;
    let camera_gui: OrthographicCamera | undefined;
    let raycaster: Raycaster | undefined;
    let is_gui_camera_active = false;
    let is_render_active = true;
    let animation_frame_id: number | undefined;
    let ticks = 0;

    // Список объектов для дополнительного raycast
    const raycast_list: Object3D[] = [];

    function init(target_canvas: HTMLCanvasElement): void {
        logger.debug('Инициализация RenderService');

        canvas = target_canvas;

        // Создаём рендерер
        renderer = new WebGLRenderer({
            canvas: target_canvas,
            antialias: merged_config.antialias,
            stencil: true,
            alpha: false,
            preserveDrawingBuffer: true,
        });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.autoClearColor = false;

        // Создаём сцену
        scene = new Scene();
        scene.background = new Color().setStyle('#222', NoColorSpace);

        // Создаём часы
        clock = new Clock();

        // Создаём камеры
        if (merged_config.orthographic) {
            camera = new OrthographicCamera(-1, 1, -1, 1, 0, merged_config.camera_far);
        } else {
            camera = new PerspectiveCamera(
                60,
                window.innerWidth / window.innerHeight,
                0.01,
                merged_config.camera_far
            );
        }
        camera.position.set(0, 0, merged_config.camera_z);

        // GUI камера (всегда ортографическая)
        camera_gui = new OrthographicCamera(-1, 1, -1, 1, 0, 100);
        camera_gui.position.set(0, 0, merged_config.camera_z);
        camera_gui.layers.disable(RenderLayers.GO_LAYER);
        camera_gui.layers.enable(RenderLayers.GUI_LAYER);

        // Raycaster
        raycaster = new Raycaster();

        logger.info('RenderService инициализирован');
    }

    function render(): void {
        if (renderer === undefined || scene === undefined || camera === undefined) {
            return;
        }

        if (!is_render_active) {
            return;
        }

        renderer.clear();
        renderer.render(scene, camera);

        // Рендерим GUI слой если активен
        if (is_gui_camera_active && camera_gui !== undefined) {
            renderer.clearDepth();
            renderer.render(scene, camera_gui);
        }

        // Рендерим контролы отдельным проходом
        const mask = camera.layers.mask;
        camera.layers.set(RenderLayers.CONTROLS_LAYER);
        renderer.clearDepth();
        renderer.render(scene, camera);
        camera.layers.mask = mask;
    }

    function start(): void {
        logger.debug('Запуск цикла рендеринга');

        function animate(): void {
            animation_frame_id = requestAnimationFrame(animate);

            ticks++;
            if (merged_config.half_fps && ticks % 2 !== 0) {
                return;
            }

            if (clock === undefined) {
                return;
            }

            const delta = clock.getDelta();

            // Проверяем изменение размера
            if (renderer !== undefined && canvas !== undefined) {
                const needs_resize = canvas.width !== canvas.clientWidth ||
                    canvas.height !== canvas.clientHeight;

                if (needs_resize) {
                    resize();
                }
            }

            // Событие обновления
            event_bus.emit('engine:update', { dt: delta });

            // Рендерим
            render();

            // Событие окончания обновления
            event_bus.emit('engine:update_end', { dt: delta });
        }

        animate();
    }

    function stop(): void {
        if (animation_frame_id !== undefined) {
            cancelAnimationFrame(animation_frame_id);
            animation_frame_id = undefined;
            logger.debug('Цикл рендеринга остановлен');
        }
    }

    function resize(): void {
        if (renderer === undefined || canvas === undefined || camera === undefined) {
            return;
        }

        const width = canvas.clientWidth;
        const height = canvas.clientHeight;

        renderer.setSize(width, height, false);

        if (camera instanceof OrthographicCamera) {
            const aspect = width / height;
            camera.left = -aspect;
            camera.right = aspect;
            camera.top = 1;
            camera.bottom = -1;
            camera.updateProjectionMatrix();
        } else if (camera instanceof PerspectiveCamera) {
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
        }

        if (camera_gui !== undefined) {
            const aspect = width / height;
            camera_gui.left = -aspect;
            camera_gui.right = aspect;
            camera_gui.top = 1;
            camera_gui.bottom = -1;
            camera_gui.updateProjectionMatrix();
        }

        event_bus.emit('engine:resize', get_render_size());
        logger.debug(`Размер изменён: ${width}x${height}`);
    }

    function get_render_size(): RenderSize {
        if (canvas === undefined) {
            return { width: 0, height: 0 };
        }
        return {
            width: canvas.clientWidth,
            height: canvas.clientHeight,
        };
    }

    function raycast(position: Vector2): Intersection[] {
        if (raycaster === undefined || scene === undefined || camera === undefined) {
            return [];
        }

        raycaster.setFromCamera(position, camera);
        raycaster.layers.enable(RenderLayers.RAYCAST_LAYER);

        const results = raycaster.intersectObjects(scene.children);

        // Дополнительный raycast для объектов из списка
        for (const obj of raycast_list) {
            const hits = raycaster.intersectObject(obj, true);
            results.push(...hits);
        }

        return results;
    }

    function is_active(): boolean {
        return is_render_active;
    }

    function set_active(active: boolean): void {
        is_render_active = active;
    }

    function set_gui_camera_active(active: boolean): void {
        is_gui_camera_active = active;
    }

    function dispose(): void {
        logger.debug('Освобождение ресурсов RenderService');

        stop();

        if (renderer !== undefined) {
            renderer.dispose();
            renderer = undefined;
        }

        scene = undefined;
        camera = undefined;
        camera_gui = undefined;
        raycaster = undefined;
        clock = undefined;
        canvas = undefined;

        logger.info('RenderService освобождён');
    }

    // Возвращаем объект сервиса
    return {
        get scene(): Scene {
            if (scene === undefined) {
                throw new Error('RenderService не инициализирован');
            }
            return scene;
        },
        get camera(): Camera {
            if (camera === undefined) {
                throw new Error('RenderService не инициализирован');
            }
            return camera;
        },
        get renderer(): WebGLRenderer {
            if (renderer === undefined) {
                throw new Error('RenderService не инициализирован');
            }
            return renderer;
        },
        init,
        render,
        start,
        stop,
        resize,
        get_render_size,
        raycast,
        is_active,
        set_active,
        set_gui_camera_active,
        dispose,
    };
}
