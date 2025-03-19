// https://github.com/yomotsu/camera-controls
import CameraControls from 'camera-controls';
import { Vector2, Vector3, Vector4, Quaternion, Matrix4, Spherical, Box3, Sphere, Raycaster } from 'three';

declare global {
    const CameraControl: ReturnType<typeof CameraControlCreate>;
}

export function register_camera_control() {
    (window as any).CameraControl = CameraControlCreate();
}

function CameraControlCreate() {
    let active_scene = '';
    const subsetOfTHREE = {
        Vector2: Vector2,
        Vector3: Vector3,
        Vector4: Vector4,
        Quaternion: Quaternion,
        Matrix4: Matrix4,
        Spherical: Spherical,
        Box3: Box3,
        Sphere: Sphere,
        Raycaster: Raycaster,
    };
    CameraControls.install({ THREE: subsetOfTHREE });
    const control = new CameraControls(RenderEngine.camera, RenderEngine.renderer.domElement);

    function init() {

        control.mouseButtons.left = CameraControls.ACTION.NONE;
        control.mouseButtons.middle = CameraControls.ACTION.TRUCK;
        control.mouseButtons.right = CameraControls.ACTION.TRUCK;
        control.truckSpeed = 1;
        control.dollySpeed = 3;
        control.dollyToCursor = true;
        control.zoomTo(0.9);
        set_position(540 / 2, -960 / 2);

        EventBus.on('SYS_ON_UPDATE', (e) => control.update(e.dt));

        control.addEventListener('controlend', () => save_state())
        control.addEventListener('sleep', () => save_state());
    }

    function set_position(x: number, y: number, is_transition = false) {
        control.setTarget(x, y, 0, is_transition);
        control.setPosition(x, y, 50, is_transition);
    }

    function set_zoom(zoom: number, is_transition = false) {
        control.zoomTo(zoom, is_transition);
    }

    function save_state() {
        const state = save();
        const key = 'camera_control-' + active_scene;
        localStorage.setItem(key, JSON.stringify(state));
    }

    function load_state(name:string) {
        active_scene = name;
        const key = 'camera_control-' + active_scene;
        const state = localStorage.getItem(key);
        if (state === null) return;
        const state_json = JSON.parse(state);
        restore(state_json);
    }

    function save() {
        const up = new Vector3();
        const target = new Vector3();
        const pos = new Vector3();
        const zoom = (control as any)._zoom;
        const focal = new Vector3();
        up.copy(control.camera.up);
        control.getTarget(target);
        control.getPosition(pos);
        control.getFocalOffset(focal, false);
        return { up, target, pos, zoom, focal };
    }

    function restore(data: { up: Vector3, target: Vector3, pos: Vector3, zoom: number, focal: Vector3 }) {
        const { up, target, pos, zoom, focal } = data;
        control.camera.up.copy(up);
        control.updateCameraUp();
        control.setPosition(pos.x, pos.y, pos.z);
        control.setLookAt(pos.x, pos.y, pos.z, target.x, target.y, target.z);
        control.setFocalOffset(focal.x, focal.y, focal.z);
        control.zoomTo(zoom);
    }

    function get_bounds_from_list(list: any) {
        if (list.length == 0)
            return [0, 0, 0, 0];
        const bb = list[0].get_bounds();
        log('bb1: ', bb)
        for (let i = 1; i < list.length; i++) {
            const b = list[i].get_bounds();
            bb[0] = Math.min(bb[0], b[0]);
            bb[1] = Math.max(bb[1], b[1]);
            bb[2] = Math.max(bb[2], b[2]);
            bb[3] = Math.min(bb[3], b[3]);
        }
        return bb;
    }
    
    function focus() {
        const selected_list = SelectControl.get_selected_list();
        if (selected_list.length > 0) {
            const wp = new Vector3();
            selected_list[0].getWorldPosition(wp);
            const bb = get_bounds_from_list(selected_list);
            const x = bb[0] + Math.abs(bb[2] - bb[0]) / 2;
            const y = bb[1] - Math.abs(bb[3] - bb[1]) / 2;
            set_position(x, y, true);

            //const width = Math.abs(bb[2] - bb[0]);
            //const height = Math.abs(bb[3] - bb[1]);
            //const zoomWidth = window.innerWidth / width;
            //const zoomHeight = window.innerHeight / height;
            //const zoom = Math.min(zoomWidth, zoomHeight);
            //const k_zoom = true ? zoom * 0.5 : zoom;
            //set_zoom(k_zoom, true);
        }
    }

    init();
    return { set_position, set_zoom, load_state, focus };
}