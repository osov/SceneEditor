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

    function update_state_ext_keys(e:KeyboardEvent|MouseEvent) {
        _is_control = e.ctrlKey;
        _is_shift = e.shiftKey;
        _is_alt = e.altKey;
    }

    function bind_events() {
        const canvas = RenderEngine.renderer.domElement;
        const body = document.body;

        body.addEventListener('keydown', (e) => {
            update_state_ext_keys(e);
            keys_state[e.key] = true;
            if (e.repeat) return;
            EventBus.trigger('SYS_VIEW_INPUT_KEY_DOWN', { key: e.key, target: e.target }, false);
            if (e.ctrlKey && (e.key == 'd' || e.key == 'в')) {
                e.preventDefault(); // ctrl+d перехватывал браузер
            }
            if (_is_alt)
                e.preventDefault(); // alt перехватывал браузер
            if (e.ctrlKey && (e.key == 's' || e.key == 'ы')) {
                e.preventDefault();
            }
        });

        body.addEventListener('keyup', (e) => {
            update_state_ext_keys(e);
            keys_state[e.key] = false;
            EventBus.trigger('SYS_VIEW_INPUT_KEY_UP', { key: e.key, target: e.target }, false);
            if (e.ctrlKey && (e.key == 'z' || e.key == 'я'))
                EventBus.trigger('SYS_INPUT_UNDO');
            if (e.ctrlKey && (e.key == 's' || e.key == 'ы')) {
                EventBus.trigger('SYS_INPUT_SAVE');
            }
        });

        body.addEventListener('pointermove', (e) => {
            update_state_ext_keys(e);
            mouse_pos.set(e.pageX, e.pageY);
            mouse_pos_normalized.set((e.pageX / canvas.clientWidth) * 2 - 1, - (e.pageY / canvas.clientHeight) * 2 + 1);
            EventBus.trigger('SYS_INPUT_POINTER_MOVE', { x: mouse_pos_normalized.x, y: mouse_pos_normalized.y, offset_x: mouse_pos.x, offset_y: mouse_pos.y, target: e.target  }, false);
        });

        body.addEventListener('mousedown', (e) => {
            update_state_ext_keys(e);
            EventBus.trigger('SYS_INPUT_POINTER_DOWN', { x: mouse_pos_normalized.x, y: mouse_pos_normalized.y, offset_x: mouse_pos.x, offset_y: mouse_pos.y, button: e.button, target: e.target  }, false);
        });

        body.addEventListener('mouseup', (e) => {
            update_state_ext_keys(e);
            EventBus.trigger('SYS_INPUT_POINTER_UP', { x: mouse_pos_normalized.x, y: mouse_pos_normalized.y, offset_x: mouse_pos.x, offset_y: mouse_pos.y, button: e.button, target: e.target }, false);
        });

        body.addEventListener('dblclick', (e) => {
            update_state_ext_keys(e);
            EventBus.trigger('SYS_INPUT_DBL_CLICK', { x: mouse_pos_normalized.x, y: mouse_pos_normalized.y, offset_x: mouse_pos.x, offset_y: mouse_pos.y, button: e.button, target: e.target }, false);
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