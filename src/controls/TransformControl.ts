import { TransformControls, TransformControlsMode } from 'three/examples/jsm/controls/TransformControls.js';
import { Euler, Object3D, Vector3 } from 'three';
import { PositionEventData, RotationEventData, ScaleEventData } from './types';
import { IBaseEntityAndThree } from '../render_engine/types';
import { ObjectProperty } from '../inspectors/ObjectInspector';

declare global {
    const TransformControl: ReturnType<typeof TransformControlCreate>;
}

export function register_transform_control() {
    (window as any).TransformControl = TransformControlCreate();
}


function TransformControlCreate() {
    const scene = RenderEngine.scene;
    const tmp_vec3 = new Vector3();
    const _start_position = new Vector3();
    const _delta_position = new Vector3();
    const _rotation = new Euler();
    const _scale = new Vector3();
    const _sum = new Vector3();
    const _averagePoint = new Vector3();
    let _oldPositions: Vector3[] = [];
    let _oldScales: Vector3[] = [];
    let _oldRotations: Euler[] = [];

    let selectedObjects: IBaseEntityAndThree[] = [];
    const proxy = new Object3D();
    scene.add(proxy);
    const control = new TransformControls(RenderEngine.camera, RenderEngine.renderer.domElement);
    const gizmo = control.getHelper();
    control.size = 0.5;
    scene.add(gizmo);
    set_mode('translate');

    control.addEventListener('dragging-changed', (e) => {
        const is_begin = (e.value as boolean);
        switch (control.getMode()) {
            case 'translate':
                if (is_begin) save_previous_positions();
                else write_previous_positions_in_historty();
                break;
            case 'rotate':
                if (is_begin) save_previous_rotations();
                else write_previous_rotations_in_historty();
                break;
            case 'scale':
                if (is_begin) save_previous_scales();
                else write_previous_scales_in_historty();
                break;
        }
    });

    control.addEventListener('objectChange', () => {
        switch (control.getMode()) {
            case 'translate':
                translate();
                Inspector.refresh([ObjectProperty.POSITION]);
                break;
            case 'rotate':
                rotate();
                Inspector.refresh([ObjectProperty.ROTATION]);
                break;
            case 'scale':
                scale();
                Inspector.refresh([ObjectProperty.SCALE]);
                break;
        }
    });

    function set_proxy_position(x: number, y: number, z: number, objects = selectedObjects) {
        proxy.position.set(x, y, z);
        translate(objects);
    }

    function set_proxy_rotation(x: number, y: number, z: number, objects = selectedObjects) {
        proxy.rotation.set(x, y, z);
        rotate(objects);
    }

    function set_proxy_scale(x: number, y: number, z: number, objects = selectedObjects) {
        proxy.scale.set(x, y, z);
        scale(objects);
    }

    function get_proxy() {
        return proxy;
    }

    function translate(objects = selectedObjects) {
        _delta_position.copy(proxy.position.clone().sub(_start_position));
        for (let i = 0; i < objects.length; i++) {
            const element = objects[i] as IBaseEntityAndThree & { _position: Vector3 };
            // todo если объект родителя отскейлен и вращался то здесь будут ошибки
            const ws = new Vector3(1, 1, 1);
            if (element.parent)
                element.parent.getWorldScale(ws);
            const tmp = _delta_position.clone();
            tmp.divide(ws);
            element.set_position(element._position.x + tmp.x, element._position.y + tmp.y);
        }
    }

    function rotate(objects = selectedObjects) {
        _rotation.copy(proxy.rotation);
        for (let i = 0; i < objects.length; i++) {
            const element = objects[i] as any;
            element.rotation.copy(_rotation);
            element.transform_changed();
        }
    }

    function scale(objects = selectedObjects) {
        const dt_scale = proxy.scale.clone().sub(_scale);
        _scale.copy(proxy.scale);
        for (let i = 0; i < objects.length; i++) {
            const element = objects[i] as any;
            element.scale.add(dt_scale);
            element.transform_changed();
        }
    }

    /** сохраняет текущие значения позиций выбраных обьектов */
    function save_previous_positions() {
        _oldPositions = [];
        selectedObjects.forEach((object) => {
            const oldPosition = object.position.clone();
            _oldPositions.push(oldPosition);
        });
    }

    /** сохраняет текущие значения вращений выбраных обьектов */
    function save_previous_rotations() {
        _oldRotations = [];
        selectedObjects.forEach((object) => {
            const oldRotation = object.rotation.clone();
            _oldRotations.push(oldRotation);
        });
    }

    /** сохраняет текущие значения маштабов выбраных обьектов */
    function save_previous_scales() {
        _oldScales = [];
        selectedObjects.forEach((object) => {
            const oldScale = object.scale.clone();
            _oldScales.push(oldScale);
        });
    }

    /** записывает сохраненные предыдущие значения позиций выбранных обьектов в историю изменений */
    function write_previous_positions_in_historty() {
        const pos_data: PositionEventData[] = [];
        for (let i = 0; i < selectedObjects.length; i++) {
            const object = selectedObjects[i];
            const position = _oldPositions[i].clone();
            pos_data.push({ id_mesh: object.mesh_data.id, position, });
        }
        HistoryControl.add('MESH_TRANSLATE', pos_data);
    }

    /** записывает сохраненные предыдущие значения вращений выбранных обьектов в историю изменений */
    function write_previous_rotations_in_historty() {
        const rot_data: RotationEventData[] = [];
        for (let i = 0; i < selectedObjects.length; i++) {
            const object = selectedObjects[i];
            const rotation = _oldRotations[i].clone();
            rot_data.push({ id_mesh: object.mesh_data.id, rotation, });
        }
        HistoryControl.add('MESH_ROTATE', rot_data);
    }

    /** записывает сохраненные предыдущие значения маштабов обьектов (по умолчанию выбранных) в историю изменений */
    function write_previous_scales_in_historty(objects = selectedObjects) {
        const scale_data: ScaleEventData[] = [];
        for (let i = 0; i < objects.length; i++) {
            const object = objects[i];
            const scale = _oldScales[i].clone();
            scale_data.push({ id_mesh: object.mesh_data.id, scale, });
        }
        HistoryControl.add('MESH_SCALE', scale_data);
    }

    function is_selected(mesh: IBaseEntityAndThree) {
        for (let i = 0; i < selectedObjects.length; i++) {
            const m = selectedObjects[i];
            if (m.mesh_data.id == mesh.mesh_data.id) return true;
        }
        return false;
    }

    function detach() {
        control.detach();
        selectedObjects = [];
        detach_object_to_transform_control();
    }

    function select_mesh(mesh: IBaseEntityAndThree) {
        if (is_selected(mesh)) return;
        if (selectedObjects.length == 0) {
            proxy.position.copy(mesh.position);
            proxy.rotation.copy(mesh.rotation);
            proxy.scale.copy(mesh.scale);
            _scale.copy(mesh.scale);
            _start_position.copy(_averagePoint);
        }
        (mesh as any)._position = mesh.position.clone();
        selectedObjects.push(mesh);
        attach_object_to_transform_control();
    }

    function set_selected_list(list: IBaseEntityAndThree[]) {
        if (!control.enabled)
            return;
        detach();
        for (let i = 0; i < list.length; i++)
            select_mesh(list[i]);
    }

    function attach_object_to_transform_control() {
        if (selectedObjects.length === 0) return;
        control.detach();
        set_proxy_in_average_point();
        control.attach(proxy);
    }


    function detach_object_to_transform_control() {
        control.detach();
        if (selectedObjects.length === 0) return;
        set_proxy_in_average_point();
        control.attach(proxy);
    }

    /** устанавливает прокси обьект в среднее значение среди переданных обьектов (по умолчанию выбранных) */
    function set_proxy_in_average_point(objects = selectedObjects) {
        _sum.set(0, 0, 0);

        for (let i = 0; i < objects.length; i++) {
            const object = objects[i];
            object.getWorldPosition(tmp_vec3);
            _sum.add(tmp_vec3);
        }
        _averagePoint.copy(_sum.divideScalar(objects.length));

        for (let i = 0; i < objects.length; i++) {
            const object = objects[i] as any;
            object._position = object.position.clone();
        }
        proxy.position.copy(_averagePoint);
        _start_position.copy(_averagePoint);
    }

    function set_active(val: boolean) {
        control.enabled = val;
        if (val)
            attach_object_to_transform_control();
        else
            detach();
        control.getHelper().visible = val;
    }

    function set_mode(mode: TransformControlsMode) {
        control.setMode(mode);
        if (mode == 'rotate') {
            control.showX = false;
            control.showY = false;
            control.showZ = true;
        }
        else if (mode == 'translate') {
            control.showX = true;
            control.showY = true;
            control.showZ = false;
        }
        else if (mode == 'scale') {
            control.showX = true;
            control.showY = true;
            control.showZ = false;
        }

    }

    return {
        set_active, set_selected_list, set_mode, detach,
        set_proxy_position, set_proxy_rotation, set_proxy_scale, get_proxy,
        set_proxy_in_average_point
    };
}