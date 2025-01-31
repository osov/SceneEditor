import { Vector2 } from "three";

declare global {
    const Input: ReturnType<typeof InputModule>;
}

export function register_input() {
    (window as any).Input = InputModule();
}

function InputModule() {
    let keys_state: { [key: string]: boolean } = {};
    let _is_control = false;
    let _is_shift = false;
    let _is_alt = false;
    const mouse_pos = new Vector2();
    const mouse_pos_normalized = new Vector2();

    function bind_events() {
        const canvas = RenderEngine.renderer.domElement;

        canvas.addEventListener('keydown', (e) => {
            if (e.repeat) return;
            _is_control = e.ctrlKey;
            _is_shift = e.shiftKey;
            _is_alt = e.altKey;
            keys_state[e.key] = true;
            EventBus.trigger('SYS_VIEW_INPUT_KEY_DOWN', { key: e.key }, false);
            if (_is_alt)
                e.preventDefault(); // alt перехватывал браузер
        });

        canvas.addEventListener('keyup', (e) => {
            _is_control = e.ctrlKey;
            _is_shift = e.shiftKey;
            _is_alt = e.altKey;
            keys_state[e.key] = false;
            EventBus.trigger('SYS_VIEW_INPUT_KEY_UP', { key: e.key }, false);
            if (e.ctrlKey && (e.key == 'z' || e.key == 'я'))
                EventBus.trigger('SYS_INPUT_UNDO');
        });

        canvas.addEventListener('pointermove', (event: any) => {
            mouse_pos.set(event.offsetX, event.offsetY);
            mouse_pos_normalized.set((event.offsetX / canvas.clientWidth) * 2 - 1, - (event.offsetY / canvas.clientHeight) * 2 + 1);
            EventBus.trigger('SYS_INPUT_POINTER_MOVE', { x: mouse_pos_normalized.x, y: mouse_pos_normalized.y, offset_x: mouse_pos.x, offset_y: mouse_pos.y }, false);
        });

        canvas.addEventListener('mousedown', (e: any) => {
            EventBus.trigger('SYS_INPUT_POINTER_DOWN', { x: mouse_pos_normalized.x, y: mouse_pos_normalized.y, offset_x: mouse_pos.x, offset_y: mouse_pos.y, button: e.button }, false);
        });

        canvas.addEventListener('mouseup', (e: any) => {
            EventBus.trigger('SYS_INPUT_POINTER_UP', { x: mouse_pos_normalized.x, y: mouse_pos_normalized.y, offset_x: mouse_pos.x, offset_y: mouse_pos.y, button: e.button }, false);
        });
    }

    function is_control() {
        return _is_control;
    }

    function is_shift() {
        return _is_shift;
    }

    function is_alt() {
        return _is_alt;
    }

    return { bind_events, is_control, is_shift, is_alt, keys_state };

}