/*
    Модуль для работы с камерой и преобразованиями
*/

import { get_window_size } from "../helpers/window_utils";

declare global {
    const Camera: ReturnType<typeof CameraModule>;
}

export function register_camera() {
    (window as any).Camera = CameraModule();
}

function CameraModule() {
    const DISPLAY_WIDTH = GAME_CONFIG.DISPLAY_WIDTH;
    const DISPLAY_HEIGHT = GAME_CONFIG.DISPLAY_HEIGHT;
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
        EventBus.on('SYS_ON_RESIZED', () => update_window_size());
    }

    function set_width_prjection(ax: number, ay: number, near = -1, far = 1) {
        is_width_projection = true;
        anchor_x = ax;
        anchor_y = ay;
        const camera = RenderEngine.camera;
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

    function get_ltrb(win_space = false) {
        // todo
    }

    function on_resize() {
        let [left, right, top, bottom] = [0, 0, 0, 0];
        // Базовая проекция, размер = размеру канваса
        if (!is_width_projection) {
            const { width, height } = RenderEngine.get_render_size();
            left = 0;
            right = width;
            top = 0;
            bottom = -height;
        }
        else {
            [left, right, top, bottom] = width_viewport();
        }

        const camera = RenderEngine.camera;
        camera.left = left;
        camera.right = right;
        camera.top = top;
        camera.bottom = bottom;
        camera.updateProjectionMatrix();
    }

    init();
    return { set_width_prjection, get_zoom, set_zoom, set_auto_zoom, is_dynamic_orientation, set_dynamic_orientation };
}