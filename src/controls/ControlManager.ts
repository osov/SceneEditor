declare global {
    const ControlManager: ReturnType<typeof ControlManagerCreate>;
}

export function register_control_manager() {
    (window as any).ControlManager = ControlManagerCreate();
}

type ButtonsList = 'translate_transform_btn' | 'scale_transform_btn' | 'rotate_transform_btn' | 'size_transform_btn';

function ControlManagerCreate() {
    let active_control = '';
    function init() {
        bind_btn('translate_transform_btn', () => set_active_control('translate_transform_btn'));
        bind_btn('scale_transform_btn', () => set_active_control('scale_transform_btn'));
        bind_btn('rotate_transform_btn', () => set_active_control('rotate_transform_btn'));
        bind_btn('size_transform_btn', () => set_active_control('size_transform_btn'));

        EventBus.on('SYS_SELECTED_MESH_LIST', (e) => {
            TransformControl.set_selected_list(e.list);
            SizeControl.set_selected_list(e.list);
        });

        EventBus.on('SYS_UNSELECTED_MESH_LIST', () => {
            TransformControl.detach();
            SizeControl.detach();
        });

        set_active_control('size_transform_btn');
    }



    function bind_btn(name: ButtonsList, callback: Function) {
        document.querySelector('.menu_min a.' + name)!.addEventListener('click', () => {
            callback();
        })
    }

    function set_active_control(name: ButtonsList) {
        if (name == active_control) return;
        clear_all_controls();
        set_active_btn(name);
        if (name == 'translate_transform_btn') {
            active_control = 'translate';
            TransformControl.set_active(true);
            TransformControl.set_mode('translate');
            TransformControl.set_selected_list(SelectControl.get_selected_list());
        }
        if (name == 'scale_transform_btn') {
            active_control = 'scale';
            TransformControl.set_active(true);
            TransformControl.set_mode('scale');
            TransformControl.set_selected_list(SelectControl.get_selected_list());
        }
        if (name == 'rotate_transform_btn') {
            active_control = 'rotate';
            TransformControl.set_active(true);
            TransformControl.set_mode('rotate');
            TransformControl.set_selected_list(SelectControl.get_selected_list());
        }
        if (name == 'size_transform_btn') {
            active_control = 'size';
            SizeControl.set_active(true);
           SizeControl.set_selected_list(SelectControl.get_selected_list());
        }
    }

    function clear_all_controls() {
        const list = document.querySelectorAll('.menu_min a');
        for (let i = 0; i < list.length; i++) {
            list[i].classList.remove('active');
        }
        TransformControl.set_active(false);
        SizeControl.set_active(false);
    }

    function set_active_btn(name: ButtonsList) {
        document.querySelector('.menu_min a.' + name)!.classList.add('active');
    }

    init();
    return { clear_all_controls, set_active_control };
}