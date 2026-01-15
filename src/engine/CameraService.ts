/**
 * CameraService - сервис управления камерой
 *
 * Управляет режимами камеры (орто/перспектива),
 * зумом, панорамированием, фокусировкой на объектах.
 */

import {
    OrthographicCamera,
    PerspectiveCamera,
    Vector2,
    Vector3,
    Box3,
    Raycaster,
    Plane,
    Frustum,
    Matrix4,
} from 'three';
import type { Camera, Object3D, Mesh } from 'three';
import type {
    ICameraService,
    CameraServiceParams,
    CameraMode,
    CameraState,
} from './types';

/** Конфигурация по умолчанию */
const DEFAULT_CAMERA_FAR = 10000;
const DEFAULT_CAMERA_Z = 1000;
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 100;
const ZOOM_SPEED = 0.1;

/** Создать CameraService */
export function create_camera_service(params: CameraServiceParams): ICameraService {
    const { logger, event_bus, render_service, initial_mode = 'orthographic' } = params;

    // Внутреннее состояние
    let current_mode: CameraMode = initial_mode;
    let current_camera: Camera;

    // Создаём камеры
    const ortho_camera = new OrthographicCamera(-1, 1, -1, 1, 0, DEFAULT_CAMERA_FAR);
    const persp_camera = new PerspectiveCamera(60, 1, 0.01, DEFAULT_CAMERA_FAR);

    // Инициализируем позиции
    ortho_camera.position.set(0, 0, DEFAULT_CAMERA_Z);
    persp_camera.position.set(0, 0, DEFAULT_CAMERA_Z);

    // Устанавливаем начальную камеру
    current_camera = current_mode === 'orthographic' ? ortho_camera : persp_camera;

    function set_mode(mode: CameraMode): void {
        if (mode === current_mode) {
            return;
        }

        logger.debug(`Переключение камеры на режим: ${mode}`);

        // Сохраняем позицию текущей камеры
        const position = current_camera.position.clone();

        // Переключаем камеру
        current_mode = mode;
        current_camera = mode === 'orthographic' ? ortho_camera : persp_camera;

        // Восстанавливаем позицию
        current_camera.position.copy(position);

        event_bus.emit('camera:mode_changed', { mode });
    }

    function get_mode(): CameraMode {
        return current_mode;
    }

    function zoom(delta: number): void {
        if (current_camera instanceof OrthographicCamera) {
            const new_zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, current_camera.zoom + delta * ZOOM_SPEED));
            current_camera.zoom = new_zoom;
            current_camera.updateProjectionMatrix();
        } else if (current_camera instanceof PerspectiveCamera) {
            // Для перспективной камеры двигаем по Z
            const new_z = current_camera.position.z - delta * 10;
            current_camera.position.z = Math.max(1, Math.min(DEFAULT_CAMERA_FAR - 1, new_z));
        }

        event_bus.emit('camera:zoom_changed', { zoom: get_current_zoom() });
    }

    function pan(delta: Vector2): void {
        // Вычисляем смещение в мировых координатах
        const pan_speed = current_camera instanceof OrthographicCamera
            ? 1 / current_camera.zoom
            : current_camera.position.z * 0.001;

        current_camera.position.x -= delta.x * pan_speed;
        current_camera.position.y += delta.y * pan_speed;

        event_bus.emit('camera:position_changed', {
            x: current_camera.position.x,
            y: current_camera.position.y,
        });
    }

    function focus_on(object: Object3D): void {
        logger.debug(`Фокусировка на объекте: ${object.name}`);

        // Вычисляем bounding box объекта
        const box = new Box3().setFromObject(object);
        const center = box.getCenter(new Vector3());
        const size = box.getSize(new Vector3());

        // Перемещаем камеру в центр объекта
        current_camera.position.x = center.x;
        current_camera.position.y = center.y;

        // Настраиваем зум чтобы объект был виден
        if (current_camera instanceof OrthographicCamera) {
            const max_size = Math.max(size.x, size.y);
            if (max_size > 0) {
                current_camera.zoom = 2 / max_size;
                current_camera.updateProjectionMatrix();
            }
        } else if (current_camera instanceof PerspectiveCamera) {
            const max_size = Math.max(size.x, size.y, size.z);
            current_camera.position.z = center.z + max_size * 2;
        }

        event_bus.emit('camera:focused', { object_name: object.name });
    }

    function save_state(): CameraState {
        return {
            mode: current_mode,
            position: current_camera.position.toArray() as [number, number, number],
            rotation: current_camera.quaternion.toArray() as [number, number, number, number],
            zoom: get_current_zoom(),
        };
    }

    function restore_state(state: CameraState): void {
        set_mode(state.mode);
        current_camera.position.set(state.position[0], state.position[1], state.position[2]);
        current_camera.quaternion.set(state.rotation[0], state.rotation[1], state.rotation[2], state.rotation[3]);

        if (current_camera instanceof OrthographicCamera) {
            current_camera.zoom = state.zoom;
            current_camera.updateProjectionMatrix();
        }

        event_bus.emit('camera:state_restored', {});
    }

    function resize(width: number, height: number): void {
        const aspect = width / height;

        // Обновляем ортографическую камеру
        ortho_camera.left = -aspect;
        ortho_camera.right = aspect;
        ortho_camera.top = 1;
        ortho_camera.bottom = -1;
        ortho_camera.updateProjectionMatrix();

        // Обновляем перспективную камеру
        persp_camera.aspect = aspect;
        persp_camera.updateProjectionMatrix();

        logger.debug(`Камера обновлена: ${width}x${height}`);
    }

    function get_current_zoom(): number {
        if (current_camera instanceof OrthographicCamera) {
            return current_camera.zoom;
        }
        return DEFAULT_CAMERA_Z / current_camera.position.z;
    }

    function screen_to_world(x: number, y: number, is_gui = false): Vector3 {
        // Используем камеру из render_service для совместимости с legacy кодом
        const cam = is_gui ? render_service.camera_gui : render_service.camera;
        const raycaster = new Raycaster();
        const ndc = new Vector2(x, y);
        raycaster.setFromCamera(ndc, cam);
        const planeZ = new Plane(new Vector3(0, 0, 1), 0); // плоскость Z=0
        const intersection = new Vector3();
        raycaster.ray.intersectPlane(planeZ, intersection);
        return intersection;
    }

    function is_visible(mesh: Mesh): boolean {
        if (mesh.geometry === undefined) {
            logger.warn('mesh.geometry not found', mesh);
            return false;
        }
        const cam = render_service.camera as OrthographicCamera;
        if (mesh.geometry.boundingBox === null) {
            mesh.geometry.computeBoundingBox();
        }
        if (mesh.geometry.boundingBox === null) {
            return false;
        }
        const boundingBox = mesh.geometry.boundingBox.clone();
        boundingBox.applyMatrix4(mesh.matrixWorld);

        const frustum = new Frustum();
        const cameraViewProjectionMatrix = new Matrix4();
        cam.updateMatrixWorld();
        cameraViewProjectionMatrix.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
        frustum.setFromProjectionMatrix(cameraViewProjectionMatrix);

        return frustum.intersectsBox(boundingBox);
    }

    function dispose(): void {
        logger.info('CameraService освобождён');
    }

    return {
        get camera(): Camera {
            return current_camera;
        },
        get ortho_camera(): OrthographicCamera {
            return ortho_camera;
        },
        get persp_camera(): PerspectiveCamera {
            return persp_camera;
        },
        set_mode,
        get_mode,
        get_zoom: get_current_zoom,
        zoom,
        pan,
        focus_on,
        save_state,
        restore_state,
        resize,
        screen_to_world,
        is_visible,
        dispose,
    };
}
