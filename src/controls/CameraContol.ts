// https://github.com/yomotsu/camera-control_orthographics
import CameraControls from 'camera-controls';
import { Vector2, Vector3, Vector4, Quaternion, Matrix4, Spherical, Box3, Sphere, Raycaster, PerspectiveCamera } from 'three';
import { CAMERA_Z, IS_CAMERA_ORTHOGRAPHIC } from '../config';
import { createCameraPerspectiveControl } from './CameraPerspectiveControl';
import type { IBaseMeshAndThree } from '../render_engine/types';
import { Services } from '@editor/core';

declare global {
    const CameraControl: ReturnType<typeof CameraControlCreate>;
}

export function register_camera_control() {
    (window as any).CameraControl = CameraControlCreate();
}

function CameraControlCreate() {
    let active_scene = '';
    const is_perspective = !IS_CAMERA_ORTHOGRAPHIC;
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
    let control_orthographic: CameraControls;
    let control_perspective: ReturnType<typeof createCameraPerspectiveControl>;

    function init() {
        if (is_perspective) {
            Services.render.camera.position.set(0, 0, 0);
            control_perspective = createCameraPerspectiveControl(Services.render.camera as PerspectiveCamera);
            Services.render.scene.add(control_perspective.getObject());
            Services.event_bus.on('SYS_ON_UPDATE', (data) => {
                const e = data as { dt: number };
                control_perspective.update(e.dt * 3);
            });
            setInterval(() => save_state(), 1000); // todo
            //   const gridHelper = new GridHelper(1000, 50);
            //  Services.render.scene.add(gridHelper);
        }
        else {
            control_orthographic = new CameraControls(Services.render.camera, Services.render.renderer.domElement);
            control_orthographic.mouseButtons.left = CameraControls.ACTION.NONE;
            control_orthographic.mouseButtons.middle = CameraControls.ACTION.TRUCK;
            control_orthographic.mouseButtons.right = CameraControls.ACTION.TRUCK;
            control_orthographic.truckSpeed = 1;
            control_orthographic.dollySpeed = 1;
            control_orthographic.dollyToCursor = true;
            control_orthographic.zoomTo(0.9);
            control_orthographic.addEventListener('controlend', () => save_state())
            control_orthographic.addEventListener('sleep', () => save_state());

            Services.event_bus.on('SYS_ON_UPDATE', (data) => {
                const e = data as { dt: number };
                control_orthographic.update(e.dt);
            });
        }
        set_position(540 / 2, -960 / 2);
    }

    function set_position(x: number, y: number, is_transition = false) {
        if (!is_perspective) {
            control_orthographic.setTarget(x, y, 0, is_transition);
            control_orthographic.setPosition(x, y, CAMERA_Z, is_transition);
        }
    }

    function set_zoom(zoom: number, is_transition = false) {
        if (!is_perspective) {
            control_orthographic.zoomTo(zoom, is_transition);
        }
    }

    function get_zoom() {
        if (!is_perspective) {
            return (control_orthographic as any)._zoom;
        }
        return 1;
    }

    async function save_state() {
        const state = save();
        const key = 'camera_control_orthographic-' + active_scene;
        localStorage.setItem(key, JSON.stringify(state));
    }

    async function load_state(name: string) {
        active_scene = name;
        const key = 'camera_control_orthographic-' + active_scene;
        const state = localStorage.getItem(key);
        if (state === null) return;
        const state_json = JSON.parse(state);
        restore(state_json);
    }

    function save() {
        if (is_perspective) {
            const ctr = control_perspective;
            return {
                pos: ctr.getObject().position,
                target: ctr.getDir()
            };
        }

        const up = new Vector3();
        const target = new Vector3();
        const pos = new Vector3();
        const zoom = (control_orthographic as any)._zoom;
        const focal = new Vector3();

        up.copy(control_orthographic.camera.up);
        control_orthographic.getTarget(target);
        control_orthographic.getPosition(pos);
        control_orthographic.getFocalOffset(focal, false);

        return { up, target, pos, zoom, focal };
    }

    function restore(data: { up: Vector3, target: Vector3, pos: Vector3, zoom: number, focal: Vector3 }) {
        if (is_perspective) {
            control_perspective.getObject().position.set(data.pos.x, data.pos.y, data.pos.z);
            control_perspective.setDir(data.target.x, data.target.y);
        }
        else {
            const { up, target, pos, zoom, focal } = data;

            control_orthographic.camera.up.copy(up);
            control_orthographic.updateCameraUp();
            control_orthographic.setPosition(pos.x, pos.y, CAMERA_Z);
            control_orthographic.setLookAt(pos.x, pos.y, CAMERA_Z, target.x, target.y, target.z);
            control_orthographic.setFocalOffset(focal.x, focal.y, focal.z);
            control_orthographic.zoomTo(zoom);
        }
    }

    function get_bounds_from_list(list: any) {
        if (list.length == 0)
            return [0, 0, 0, 0];
        const bb = list[0].get_bounds();
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
        const selected_list = Services.selection.selected as IBaseMeshAndThree[];
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
    return { set_position, set_zoom, get_zoom, load_state, focus };
}