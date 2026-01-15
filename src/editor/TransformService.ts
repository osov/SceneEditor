/**
 * TransformService - сервис трансформации объектов
 *
 * Управляет Three.js TransformControls gizmo,
 * режимами трансформации (translate/rotate/scale),
 * пространством (local/world) и историей изменений.
 */

import { TransformControls, TransformControlsMode } from 'three/examples/jsm/controls/TransformControls.js';
import { Object3D, Quaternion, Vector3 } from 'three';
import type { ISceneObject } from '@editor/engine/types';
import type {
    ITransformService,
    TransformServiceParams,
    TransformMode,
    TransformSpace,
} from './types';
import { IS_CAMERA_ORTHOGRAPHIC } from '@editor/config';
import { euler_to_quat } from '@editor/modules/utils';
import { HistoryOwner } from '../modules_editor/modules_editor_const';

// Тип для mesh с _position
interface TransformableObject extends ISceneObject {
    _position?: Vector3;
    set_position?(x: number, y: number, z: number): void;
    transform_changed?(): void;
}

/** Создать TransformService */
export function create_transform_service(params: TransformServiceParams): ITransformService {
    const { logger, event_bus, render_service, history_service, selection_service } = params;

    // Внутреннее состояние
    let current_mode: TransformMode = 'translate';
    let current_space: TransformSpace = 'local';
    let is_enabled = true;

    // Three.js объекты
    const tmp_vec3 = new Vector3();
    const _start_position = new Vector3();
    const _delta_position = new Vector3();
    const _rotation = new Quaternion();
    const _scale = new Vector3();
    const _sum = new Vector3();
    const _averagePoint = new Vector3();
    let _oldPositions: Vector3[] = [];
    let _oldScales: Vector3[] = [];
    let _oldRotations: Quaternion[] = [];

    let selectedObjects: TransformableObject[] = [];
    const proxy = new Object3D();

    // Создаём TransformControls
    const scene = render_service.scene;
    const camera = render_service.camera;
    const renderer = render_service.renderer;

    scene.add(proxy);
    const control = new TransformControls(camera, renderer.domElement);
    const gizmo = control.getHelper();
    control.size = 0.5;
    scene.add(gizmo);

    // Обработчик начала/окончания drag
    control.addEventListener('dragging-changed', (e) => {
        const is_begin = (e.value as boolean);
        event_bus.emit(is_begin ? 'transform:started' : 'transform:ended', { mode: current_mode });

        switch (control.getMode()) {
            case 'translate':
                if (is_begin) save_previous_positions();
                else write_positions_to_history();
                break;
            case 'rotate':
                if (is_begin) save_previous_rotations();
                else write_rotations_to_history();
                break;
            case 'scale':
                if (is_begin) save_previous_scales();
                else write_scales_to_history();
                break;
        }
    });

    // Обработчик изменения объекта
    control.addEventListener('objectChange', () => {
        switch (control.getMode()) {
            case 'translate':
                apply_translate();
                event_bus.emit('transform:changed', { type: 'translate' });
                break;
            case 'rotate':
                apply_rotate();
                event_bus.emit('transform:changed', { type: 'rotate' });
                break;
            case 'scale':
                apply_scale();
                event_bus.emit('transform:changed', { type: 'scale' });
                break;
        }
    });

    // Инициализация режима
    apply_mode_settings('translate');

    // === Функции трансформации ===

    function apply_translate(objects = selectedObjects): void {
        _delta_position.copy(proxy.position.clone().sub(_start_position));
        for (let i = 0; i < objects.length; i++) {
            const element = objects[i];
            const ws = new Vector3(1, 1, 1);
            if (element.parent !== null) {
                element.parent.getWorldScale(ws);
            }
            const tmp = _delta_position.clone();
            tmp.divide(ws);
            if (element._position !== undefined && element.set_position !== undefined) {
                element.set_position(
                    element._position.x + tmp.x,
                    element._position.y + tmp.y,
                    element._position.z + tmp.z
                );
            }
        }
    }

    function apply_rotate(objects = selectedObjects): void {
        _rotation.copy(proxy.quaternion);
        for (let i = 0; i < objects.length; i++) {
            const element = objects[i];
            element.quaternion.copy(_rotation);
            if (element.transform_changed !== undefined) {
                element.transform_changed();
            }
        }
    }

    function apply_scale(objects = selectedObjects): void {
        const dt_scale = proxy.scale.clone().sub(_scale);
        _scale.copy(proxy.scale);
        for (let i = 0; i < objects.length; i++) {
            const element = objects[i];
            element.scale.add(dt_scale);
            if (element.transform_changed !== undefined) {
                element.transform_changed();
            }
        }
    }

    // === Сохранение состояния для истории ===

    function save_previous_positions(): void {
        _oldPositions = [];
        selectedObjects.forEach((object) => {
            _oldPositions.push(object.position.clone());
        });
    }

    function save_previous_rotations(): void {
        _oldRotations = [];
        selectedObjects.forEach((object) => {
            _oldRotations.push(object.quaternion.clone());
        });
    }

    function save_previous_scales(): void {
        _oldScales = [];
        selectedObjects.forEach((object) => {
            _oldScales.push(object.scale.clone());
        });
    }

    // === Запись в историю ===

    function write_positions_to_history(): void {
        const pos_data: Array<{ mesh_id: number; value: Vector3 }> = [];
        for (let i = 0; i < selectedObjects.length; i++) {
            const object = selectedObjects[i];
            pos_data.push({ mesh_id: object.mesh_data.id, value: _oldPositions[i].clone() });
        }

        history_service.push({
            type: 'MESH_TRANSLATE',
            description: 'Перемещение объектов',
            data: { items: pos_data, owner: HistoryOwner.TRANSFORM_CONTROL },
            undo: (d) => {
                for (const item of d.items) {
                    const mesh = render_service.scene.getObjectByProperty('mesh_data', { id: item.mesh_id }) as TransformableObject | undefined;
                    if (mesh !== undefined) {
                        mesh.position.copy(item.value);
                        if (mesh.transform_changed !== undefined) {
                            mesh.transform_changed();
                        }
                    }
                }
                event_bus.emit('transform:undone', { type: 'translate' });
            },
            redo: () => {
                // Redo не поддерживается пока
            },
        });

        // Также эмитим legacy событие
        event_bus.emit('SYS_HISTORY_UNDO', {
            type: 'MESH_TRANSLATE',
            data: pos_data,
            owner: HistoryOwner.TRANSFORM_CONTROL,
        });
    }

    function write_rotations_to_history(): void {
        const rot_data: Array<{ mesh_id: number; value: Quaternion }> = [];
        for (let i = 0; i < selectedObjects.length; i++) {
            const object = selectedObjects[i];
            rot_data.push({ mesh_id: object.mesh_data.id, value: _oldRotations[i].clone() });
        }

        history_service.push({
            type: 'MESH_ROTATE',
            description: 'Вращение объектов',
            data: { items: rot_data, owner: HistoryOwner.TRANSFORM_CONTROL },
            undo: (d) => {
                for (const item of d.items) {
                    const mesh = render_service.scene.getObjectByProperty('mesh_data', { id: item.mesh_id }) as TransformableObject | undefined;
                    if (mesh !== undefined) {
                        mesh.quaternion.copy(item.value);
                        if (mesh.transform_changed !== undefined) {
                            mesh.transform_changed();
                        }
                    }
                }
                event_bus.emit('transform:undone', { type: 'rotate' });
            },
            redo: () => {},
        });
    }

    function write_scales_to_history(): void {
        const scale_data: Array<{ mesh_id: number; value: Vector3 }> = [];
        for (let i = 0; i < selectedObjects.length; i++) {
            const object = selectedObjects[i];
            scale_data.push({ mesh_id: object.mesh_data.id, value: _oldScales[i].clone() });
        }

        history_service.push({
            type: 'MESH_SCALE',
            description: 'Масштабирование объектов',
            data: { items: scale_data, owner: HistoryOwner.TRANSFORM_CONTROL },
            undo: (d) => {
                for (const item of d.items) {
                    const mesh = render_service.scene.getObjectByProperty('mesh_data', { id: item.mesh_id }) as TransformableObject | undefined;
                    if (mesh !== undefined) {
                        mesh.scale.copy(item.value);
                        if (mesh.transform_changed !== undefined) {
                            mesh.transform_changed();
                        }
                    }
                }
                event_bus.emit('transform:undone', { type: 'scale' });
            },
            redo: () => {},
        });
    }

    // === Публичные методы ===

    function set_mode(mode: TransformMode): void {
        if (mode === current_mode) {
            return;
        }

        current_mode = mode;
        apply_mode_settings(mode);
        logger.debug(`Режим трансформации: ${mode}`);
        event_bus.emit('transform:mode_changed', { mode });
        // Legacy событие для совместимости
        event_bus.emit('SYS_TRANSFORM_MODE_CHANGED', { mode });
    }

    function apply_mode_settings(mode: TransformMode): void {
        control.setMode(mode as TransformControlsMode);
        const is_perspective = !IS_CAMERA_ORTHOGRAPHIC;

        if (mode === 'rotate') {
            control.showX = is_perspective;
            control.showY = is_perspective;
            control.showZ = true;
        } else if (mode === 'translate') {
            control.showX = true;
            control.showY = true;
            control.showZ = is_perspective;
        } else if (mode === 'scale') {
            control.showX = true;
            control.showY = true;
            control.showZ = is_perspective;
        }
    }

    function set_space(space: TransformSpace): void {
        if (space === current_space) {
            return;
        }

        current_space = space;
        control.setSpace(space);
        logger.debug(`Пространство трансформации: ${space}`);
        event_bus.emit('transform:space_changed', { space });
    }

    function set_active(active: boolean): void {
        is_enabled = active;
        control.enabled = active;

        if (active) {
            attach_to_control();
        } else {
            detach();
        }

        gizmo.visible = active;
        logger.debug(`TransformControl ${active ? 'активирован' : 'деактивирован'}`);
    }

    function attach(objects: ISceneObject[]): void {
        if (!is_enabled) return;

        detach_internal();

        for (const obj of objects) {
            select_mesh(obj as TransformableObject);
        }

        event_bus.emit('transform:attached', {
            objects: objects.map(o => o.mesh_data.id),
        });
    }

    function set_selected_list(objects: ISceneObject[]): void {
        attach(objects);
    }

    function detach(): void {
        control.detach();
        selectedObjects = [];
        detach_from_control();

        event_bus.emit('transform:detached', {});
    }

    function detach_internal(): void {
        control.detach();
        selectedObjects = [];
    }

    function get_attached(): ISceneObject[] {
        return [...selectedObjects];
    }

    function is_object_selected(mesh: TransformableObject): boolean {
        return selectedObjects.some(m => m.mesh_data.id === mesh.mesh_data.id);
    }

    function select_mesh(mesh: TransformableObject): void {
        if (is_object_selected(mesh)) return;

        if (selectedObjects.length === 0) {
            proxy.position.copy(mesh.position);
            proxy.rotation.copy(mesh.rotation);
            proxy.scale.copy(mesh.scale);
            _scale.copy(mesh.scale);
            _start_position.copy(_averagePoint);
        }

        mesh._position = mesh.position.clone();
        selectedObjects.push(mesh);
        attach_to_control();
    }

    function attach_to_control(): void {
        if (selectedObjects.length === 0) return;
        control.detach();
        set_proxy_in_average_point_internal();
        control.attach(proxy);
    }

    function detach_from_control(): void {
        control.detach();
        if (selectedObjects.length === 0) return;
        set_proxy_in_average_point_internal();
        control.attach(proxy);
    }

    function set_proxy_in_average_point_internal(objects = selectedObjects): void {
        if (objects.length === 0) return;

        _sum.set(0, 0, 0);

        for (let i = 0; i < objects.length; i++) {
            objects[i].getWorldPosition(tmp_vec3);
            _sum.add(tmp_vec3);
        }
        _averagePoint.copy(_sum.divideScalar(objects.length));

        for (let i = 0; i < objects.length; i++) {
            const object = objects[i];
            object._position = object.position.clone();
        }

        proxy.position.copy(_averagePoint);
        _start_position.copy(_averagePoint);
    }

    function set_proxy_in_average_point(objects?: ISceneObject[]): void {
        const objs = objects !== undefined
            ? objects as TransformableObject[]
            : selectedObjects;
        set_proxy_in_average_point_internal(objs);
    }

    function set_proxy_position(x: number, y: number, z: number, objects?: ISceneObject[]): void {
        proxy.position.set(x, y, z);
        apply_translate(objects as TransformableObject[] ?? selectedObjects);
    }

    function set_proxy_rotation(x: number, y: number, z: number, objects?: ISceneObject[]): void {
        proxy.quaternion.fromArray(euler_to_quat(x, y, z));
        apply_rotate(objects as TransformableObject[] ?? selectedObjects);
    }

    function set_proxy_scale(x: number, y: number, z: number, objects?: ISceneObject[]): void {
        proxy.scale.set(x, y, z);
        apply_scale(objects as TransformableObject[] ?? selectedObjects);
    }

    function get_proxy(): Object3D {
        return proxy;
    }

    // Подписываемся на изменения выделения
    const selection_subscription = event_bus.on('selection:changed', (data) => {
        const { selected } = data as { selected: ISceneObject[] };
        attach(selected);
    });

    function dispose(): void {
        selection_subscription.dispose();
        detach();
        scene.remove(proxy);
        scene.remove(gizmo);
        control.dispose();
        logger.info('TransformService освобождён');
    }

    return {
        get mode(): TransformMode {
            return current_mode;
        },
        get space(): TransformSpace {
            return current_space;
        },
        get is_active(): boolean {
            return is_enabled;
        },
        set_mode,
        set_space,
        set_active,
        attach,
        set_selected_list,
        detach,
        get_attached,
        set_proxy_in_average_point,
        set_proxy_position,
        set_proxy_rotation,
        set_proxy_scale,
        get_proxy,
        dispose,
    };
}
