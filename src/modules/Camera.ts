/**
 * Legacy Camera - модуль для работы с камерой и преобразованиями
 *
 * Управляет проекцией камеры, auto-zoom и преобразованиями координат.
 * Дополняет DI CameraService функциями для игрового движка.
 */

import { OrthographicCamera, PerspectiveCamera, AudioListener, Vector3, Frustum, Matrix4, Plane, Raycaster, Vector2 } from "three";
import type { Mesh } from "three";
import { get_window_size } from "../render_engine/helpers/window_utils";
import { IS_CAMERA_ORTHOGRAPHIC, TARGET_DISPLAY_HEIGHT, TARGET_DISPLAY_WIDTH } from "../config";
import { Services } from '@editor/core';

declare global {
    const Camera: ReturnType<typeof CameraModule>;
}

export function register_camera(): void {
    (window as unknown as Record<string, unknown>).Camera = CameraModule();
}

function CameraModule() {
    const DISPLAY_WIDTH = TARGET_DISPLAY_WIDTH;
    const DISPLAY_HEIGHT = TARGET_DISPLAY_HEIGHT;
    let WINDOW_WIDTH = DISPLAY_WIDTH;
    let WINDOW_HEIGHT = DISPLAY_HEIGHT;
    let anchor_x = 0;
    let anchor_y = 0;
    let _zoom = 1;
    let is_auto_zoom = false;
    let _dynamic_orientation = false;
    let _zoom_width = 0;
    let _zoom_height = 0;
    let is_width_projection = false;

    function init() {
        Services.event_bus.on('SYS_ON_RESIZED', () => update_window_size());
    }

    function set_width_prjection(ax: number, ay: number, near = -1, far = 1): void {
        is_width_projection = true;
        anchor_x = ax;
        anchor_y = ay;
        const camera = RenderEngine.camera as OrthographicCamera;
        camera.near = near;
        camera.far = far;
        camera.updateProjectionMatrix();
        update_window_size();
    }

    function get_width_height() {
        if (_dynamic_orientation) {
            const is_portrait = DISPLAY_WIDTH < DISPLAY_HEIGHT;
            const cur_is_portrait = WINDOW_WIDTH < WINDOW_HEIGHT;
            if (is_portrait != cur_is_portrait)
                return [DISPLAY_HEIGHT, DISPLAY_WIDTH];
        }

        return [DISPLAY_WIDTH, DISPLAY_HEIGHT];
    }

    function get_zoom() {
        return _zoom;
    }

    function set_zoom(zoom: number) {
        _zoom = zoom;
    }

    function set_listener(listener: AudioListener) {
        RenderEngine.camera.add(listener);
    }

    function screen_viewport() {
        const { width, height } = RenderEngine.get_render_size();
        const left = -width / 2;
        const right = width / 2;
        const top = height / 2;
        const bottom = -height / 2;
        return [left, right, top, bottom];
    }

    function width_viewport() {
        const [dw, dh] = get_width_height();

        const w = dw / get_zoom();
        const h = WINDOW_HEIGHT / WINDOW_WIDTH * w;

        let left = -w / 2;
        let right = w / 2;
        let bottom = -h / 2;
        let top = h / 2;

        const left_x = (dw - w) / 2;
        const top_y = (dh - h) / 2;
        // ----
        if (anchor_y == 1) {
            bottom = -h;
            top = -top_y * 0; // center Y
        }

        if (anchor_y == -1) {
            bottom = 0;
            top = h;
        }

        if (anchor_x == -1) {
            left = left_x;
            right = w + left_x;
        }

        if (anchor_x == 1) {
            left = -w;
            right = 0;
        }
        return [left, right, top, bottom];
    }

    function update_auto_zoom(width: number, height: number) {
        let dw = 0;
        let dh = 0;
        if (_zoom_width > 0 && _zoom_height > 0) {
            dw = _zoom_width;
            dh = _zoom_height;
        }
        else
            [dw, dh] = get_width_height();
        if (!is_auto_zoom)
            return;
        const window_aspect = width / height;
        const aspect = dw / dh;
        let zoom = 1;
        if (window_aspect >= aspect) {
            const height = dw / window_aspect;
            zoom = height / dh;
        }
        set_zoom(zoom);
    }

    function update_window_size() {
        const { width, height } = get_window_size();

        if (width > 0 && height > 0) {
            WINDOW_WIDTH = width;
            WINDOW_HEIGHT = height;
        }
        update_auto_zoom(width, height);
        on_resize();
    }

    function set_auto_zoom(active: boolean, zoom_width = 0, zoom_height = 0) {
        is_auto_zoom = active;
        _zoom_width = zoom_width;
        _zoom_height = zoom_height;
        update_window_size();
    }

    function set_dynamic_orientation(active: boolean) {
        _dynamic_orientation = active;
        update_window_size();
    }

    function is_dynamic_orientation() {
        return _dynamic_orientation;
    }

    // Зарезервировано для будущей реализации
    // function get_ltrb(win_space = false) { }

    function screen_to_world(x: number, y: number, is_gui = false) {
        const camera = is_gui ? RenderEngine.camera_gui : RenderEngine.camera;
        const raycaster = new Raycaster();
        const ndc = new Vector2(x, y);
        raycaster.setFromCamera(ndc, camera);
        const planeZ = new Plane(new Vector3(0, 0, 1), 0); // плоскость Z=0
        const intersection = new Vector3();
        raycaster.ray.intersectPlane(planeZ, intersection);
        return intersection;

        return new Vector3(x, y, -1).unproject(camera);
    }

    function on_resize() {
        let [left, right, top, bottom] = [0, 0, 0, 0];
        // Базовая проекция, размер = размеру канваса
        if (!is_width_projection)
            [left, right, top, bottom] = screen_viewport();

        else
            [left, right, top, bottom] = width_viewport();


        const _camera = RenderEngine.camera;
        if (IS_CAMERA_ORTHOGRAPHIC) {
            const camera = _camera as OrthographicCamera;
            camera.left = left;
            camera.right = right;
            camera.top = top;
            camera.bottom = bottom;
            camera.updateProjectionMatrix();
        }
        else {
            const camera = _camera as PerspectiveCamera;
            const aspect = window.innerWidth / window.innerHeight;
            camera.aspect = aspect;
            camera.updateProjectionMatrix();
        }

        [left, right, top, bottom] = screen_viewport();
        const camera_gui = RenderEngine.camera_gui;
        camera_gui.left = left;
        camera_gui.right = right;
        camera_gui.top = top;
        camera_gui.bottom = bottom;
        camera_gui.updateProjectionMatrix();
    }

    function is_visible(mesh: Mesh): boolean {
        if (mesh.geometry === undefined) {
            Services.logger.warn('mesh.geometry not found', mesh);
            return false;
        }
        const camera = RenderEngine.camera as OrthographicCamera;
        if (mesh.geometry.boundingBox === null) {
            mesh.geometry.computeBoundingBox();
        }
        if (mesh.geometry.boundingBox === null) {
            return false;
        }
        const boundingBox = mesh.geometry.boundingBox.clone();
        boundingBox.applyMatrix4(mesh.matrixWorld);

        const frustum = new Frustum();
        const cameraViewProjectionMatrix = new Matrix4();
        camera.updateMatrixWorld();
        cameraViewProjectionMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
        frustum.setFromProjectionMatrix(cameraViewProjectionMatrix);

        return frustum.intersectsBox(boundingBox);
    }

    init();
    return { set_width_prjection, get_zoom, set_zoom, set_auto_zoom, is_dynamic_orientation, set_dynamic_orientation, screen_to_world, set_listener, is_visible };
}