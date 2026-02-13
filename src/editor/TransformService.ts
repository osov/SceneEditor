/**
 * TransformService - координатор трансформации объектов
 *
 * Phase 32: Разделён на модули в transform/
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

// Импорт из модулей трансформации
import {
    type TransformableObject,
    apply_translate as apply_translate_fn,
    apply_rotate as apply_rotate_fn,
    apply_scale as apply_scale_fn,
    save_positions,
    save_rotations,
    save_scales,
    write_positions_to_history,
    write_rotations_to_history,
    write_scales_to_history,
    set_proxy_in_average_point as set_proxy_avg_point,
} from './transform';

/** Создать TransformService */
export function create_transform_service(params: TransformServiceParams): ITransformService {
    const { logger, event_bus, render_service, history_service, selection_service: _selection_service } = params;

    // Внутреннее состояние
    let current_mode: TransformMode = 'translate';
    let current_space: TransformSpace = 'local';
    let is_enabled = true;

    // Three.js объекты
    const _start_position = new Vector3();
    const _scale = new Vector3();
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

    // Зависимости для истории
    const history_deps = {
        history_service,
        event_bus,
        scene,
    };

    // Обработчик начала/окончания drag
    control.addEventListener('dragging-changed', (e) => {
        const is_begin = (e.value as boolean);
        event_bus.emit(is_begin ? 'transform:started' : 'transform:ended', { mode: current_mode });

        switch (control.getMode()) {
            case 'translate':
                if (is_begin) _oldPositions = save_positions(selectedObjects);
                else write_positions_to_history(selectedObjects, _oldPositions, history_deps);
                break;
            case 'rotate':
                if (is_begin) _oldRotations = save_rotations(selectedObjects);
                else write_rotations_to_history(selectedObjects, _oldRotations, history_deps);
                break;
            case 'scale':
                if (is_begin) _oldScales = save_scales(selectedObjects);
                else write_scales_to_history(selectedObjects, _oldScales, history_deps);
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

    // === Функции трансформации (обёртки) ===

    function apply_translate(objects = selectedObjects): void {
        apply_translate_fn(proxy, _start_position, objects);
    }

    function apply_rotate(objects = selectedObjects): void {
        apply_rotate_fn(proxy, objects);
    }

    function apply_scale(objects = selectedObjects): void {
        const new_scale = apply_scale_fn(proxy, _scale, objects);
        _scale.copy(new_scale);
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
        }

        mesh._position = mesh.position.clone();
        selectedObjects.push(mesh);
        attach_to_control();
    }

    function attach_to_control(): void {
        if (selectedObjects.length === 0) return;
        control.detach();
        set_proxy_avg_point(proxy, _start_position, selectedObjects);
        control.attach(proxy);
    }

    function detach_from_control(): void {
        control.detach();
        if (selectedObjects.length === 0) return;
        set_proxy_avg_point(proxy, _start_position, selectedObjects);
        control.attach(proxy);
    }

    function set_proxy_in_average_point(objects?: ISceneObject[]): void {
        const objs = objects !== undefined
            ? objects as TransformableObject[]
            : selectedObjects;
        set_proxy_avg_point(proxy, _start_position, objs);
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

// Реэкспорт типов трансформации
export * from './transform';
