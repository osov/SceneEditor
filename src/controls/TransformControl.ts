import { TransformControls, TransformControlsMode } from 'three/examples/jsm/controls/TransformControls.js';
import { IBaseMeshDataAndThree } from '../render_engine/types';

declare global {
    const TransformControl: ReturnType<typeof TransformControlModule>;
}

export function register_transform_control() {
    (window as any).TransformControl = TransformControlModule();
}

function TransformControlModule() {
    const control = new TransformControls(RenderEngine.camera, RenderEngine.renderer.domElement);
    const gizmo = control.getHelper();
    control.size = 0.5;
    RenderEngine.scene.add(gizmo);
    set_mode('translate');
    control.addEventListener('dragging-changed', (e) => {
        //log('dragging-changed', e.value);
    });


    function set_mesh(mesh: IBaseMeshDataAndThree | null) {
        if (mesh)
            control.attach(mesh);
        else
            control.detach();
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

    return { set_mesh, set_mode };
}