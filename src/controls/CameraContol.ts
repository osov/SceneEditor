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


    init();
    return { set_position, set_zoom, load_state };
}