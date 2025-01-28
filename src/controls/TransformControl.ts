import { TransformControls, TransformControlsMode } from 'three/examples/jsm/controls/TransformControls.js';
import { IBaseMeshDataAndThree } from '../render_engine/types';
import { Euler, Object3D, Vector3 } from 'three';
import { PositionEventData, RotationEventData, ScaleEventData } from './types';

declare global {
    const TransformControl: ReturnType<typeof TransformControlCreate>;
}

export function register_transform_control() {
    (window as any).TransformControl = TransformControlCreate();
}


function TransformControlCreate() {
    const scene = RenderEngine.scene;
    const _position = new Vector3();
    const _rotation = new Euler();
    const _scale = new Vector3();
    const _sum = new Vector3();
    const _averagePoint = new Vector3();
    let _oldPositions: Vector3[] = [];
    let _oldScales: Vector3[] = [];
    let _oldRotations: Euler[] = [];

    let selectedObjects: IBaseMeshDataAndThree[] = [];
    const proxy = new Object3D();
    scene.add(proxy);
    const control = new TransformControls(RenderEngine.camera, RenderEngine.renderer.domElement);
    const gizmo = control.getHelper();
    control.size = 0.5;
    scene.add(gizmo);
    set_mode('translate');

    control.addEventListener('dragging-changed', (e) => {
        _on_dragging_changed(e.value as boolean);
    });

    control.addEventListener('objectChange', () => {
        switch (control.getMode()) {
            case 'translate':
                _position.copy(proxy.position);
                for (let i = 0; i < selectedObjects.length; i++) {
                    const element = selectedObjects[i] as any;
                    element.position.copy(element._position).add(_position);
                }
                break;
            case 'rotate':
                _rotation.copy(proxy.rotation);
                for (let i = 0; i < selectedObjects.length; i++) {
                    const element = selectedObjects[i] as any;
                    element.rotation.copy(_rotation);
                }
                break;
            case 'scale':
                const dt_scale = proxy.scale.clone().sub(_scale);
                _scale.copy(proxy.scale);
                for (let i = 0; i < selectedObjects.length; i++) {
                    const element = selectedObjects[i] as any;
                    element.scale.add(dt_scale);
                }
                break;
            default:
                break;
        }
    });


    function _on_dragging_changed(storeInitialState: boolean) {
        if (storeInitialState) {
            _oldPositions = [];
            _oldScales = [];
            _oldRotations = [];
            selectedObjects.forEach((object) => {
                if (control.getMode() == 'translate') {
                    const oldPosition = object.position.clone();
                    _oldPositions.push(oldPosition);
                }
                else if (control.getMode() == 'rotate') {
                    const oldRotation = object.rotation.clone();
                    _oldRotations.push(oldRotation);
                }
                else if (control.getMode() == 'scale') {
                    const oldScale = object.scale.clone();
                    _oldScales.push(oldScale);
                }
            });
        } else {
            if (control.getMode() == 'translate') {
                const pos_data: PositionEventData[] = [];
                for (let i = 0; i < selectedObjects.length; i++) {
                    const object = selectedObjects[i];
                    const position = _oldPositions[i].clone();
                    pos_data.push({ id_mesh: object.mesh_data.id, position, });
                }
                HistoryControl.add('MESH_TRANSLATE', pos_data);
            }
            else if (control.getMode() == 'rotate') {
                const rot_data: RotationEventData[] = [];
                for (let i = 0; i < selectedObjects.length; i++) {
                    const object = selectedObjects[i];
                    const rotation = _oldRotations[i].clone();
                    rot_data.push({ id_mesh: object.mesh_data.id, rotation, });
                }
                HistoryControl.add('MESH_ROTATE', rot_data);
            }
            else if (control.getMode() == 'scale') {
                const scale_data: ScaleEventData[] = [];
                for (let i = 0; i < selectedObjects.length; i++) {
                    const object = selectedObjects[i];
                    const scale = _oldScales[i].clone();
                    scale_data.push({ id_mesh: object.mesh_data.id, scale, });
                }
                HistoryControl.add('MESH_SCALE', scale_data);
            }
        }
    }

    function is_selected(mesh: IBaseMeshDataAndThree) {
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

    function select_mesh(mesh: IBaseMeshDataAndThree) {
        if (is_selected(mesh)) return;
        if (selectedObjects.length == 0) {
            proxy.position.copy(mesh.position);
            proxy.rotation.copy(mesh.rotation);
            proxy.scale.copy(mesh.scale);
            _scale.copy(mesh.scale);
        }
        (mesh as any)._position = mesh.position.clone();
        selectedObjects.push(mesh);
        attach_object_to_transform_control();
    }

    function set_selected_list(list: IBaseMeshDataAndThree[]) {
        if (!control.enabled)
            return;
        detach();
        for (let i = 0; i < list.length; i++)
            select_mesh(list[i]);
    }

    function attach_object_to_transform_control() {
        if (selectedObjects.length === 0) return;
        control.detach();
        handle_transform_control_center();
        control.attach(proxy);
    }


    function detach_object_to_transform_control() {
        control.detach();
        if (selectedObjects.length === 0) return;
        handle_transform_control_center();
        control.attach(proxy);

    }

    function handle_transform_control_center() {
        _sum.set(0, 0, 0);

        for (let i = 0; i < selectedObjects.length; i++) {
            const object = selectedObjects[i];
            object.getWorldPosition(_position);
            _sum.add(_position);
        }
        _averagePoint.copy(_sum.divideScalar(selectedObjects.length));

        for (let i = 0; i < selectedObjects.length; i++) {
            const object = selectedObjects[i] as any;
            object._position = object.position.clone().sub(_averagePoint);
        }
        proxy.position.copy(_averagePoint);
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

    return { set_active, set_selected_list, detach, set_mode };
}