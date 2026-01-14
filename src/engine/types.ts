/**
 * Типы и интерфейсы для сервисов движка
 *
 * Определяет контракты для RenderService, SceneService, ResourceService, CameraService.
 * Эти сервисы работают напрямую с Three.js без legacy обёрток.
 */

import type {
    Scene,
    Camera,
    OrthographicCamera,
    PerspectiveCamera,
    WebGLRenderer,
    Vector2,
    Intersection,
    Object3D,
    Texture,
} from 'three';
import type { ILogger, IEventBus } from '@editor/core/di/types';
import type { TextureInfo, MaterialInfo, ObjectTypes, BaseEntityData } from '@editor/core/render/types';

// ============================================================================
// RenderService
// ============================================================================

/** Конфигурация RenderService */
export interface RenderServiceConfig {
    /** Canvas элемент для рендеринга */
    canvas?: HTMLCanvasElement;
    /** Включить антиалиасинг */
    antialias?: boolean;
    /** Использовать ортографическую камеру */
    orthographic?: boolean;
    /** Дистанция до far plane камеры */
    camera_far?: number;
    /** Начальная Z позиция камеры */
    camera_z?: number;
    /** Половинный FPS для экономии ресурсов */
    half_fps?: boolean;
}

/** Размер рендера */
export interface RenderSize {
    width: number;
    height: number;
}

/** Интерфейс RenderService */
export interface IRenderService {
    /** Three.js сцена */
    readonly scene: Scene;
    /** Основная камера */
    readonly camera: Camera;
    /** WebGL рендерер */
    readonly renderer: WebGLRenderer;

    /** Инициализация с canvas */
    init(canvas: HTMLCanvasElement): void;
    /** Один кадр рендеринга */
    render(): void;
    /** Запустить цикл рендеринга */
    start(): void;
    /** Остановить цикл рендеринга */
    stop(): void;
    /** Обработать изменение размера */
    resize(): void;
    /** Получить размер рендера */
    get_render_size(): RenderSize;
    /** Raycast по сцене */
    raycast(position: Vector2): Intersection[];
    /** Проверить активен ли рендеринг */
    is_active(): boolean;
    /** Установить активность рендеринга */
    set_active(active: boolean): void;
    /** Установить активность GUI камеры */
    set_gui_camera_active(active: boolean): void;
    /** Освободить ресурсы */
    dispose(): void;
}

/** Параметры создания RenderService */
export interface RenderServiceParams {
    logger: ILogger;
    event_bus: IEventBus;
    config?: RenderServiceConfig;
}

// ============================================================================
// SceneService
// ============================================================================

/** Интерфейс объекта сцены */
export interface ISceneObject extends Object3D {
    /** Уникальный идентификатор */
    readonly mesh_data: {
        id: number;
        type?: ObjectTypes;
        name?: string;
        [key: string]: unknown;
    };
}

/** Интерфейс SceneService */
export interface ISceneService {
    /** Создать объект сцены */
    create<T extends ObjectTypes>(type: T, params?: Record<string, unknown>): ISceneObject;
    /** Добавить объект в сцену */
    add(object: ISceneObject): void;
    /** Удалить объект из сцены */
    remove(object: ISceneObject): void;
    /** Получить объект по ID */
    get_by_id(id: number): ISceneObject | undefined;
    /** Получить объект по URL */
    get_by_url(url: string): ISceneObject | undefined;
    /** Получить URL объекта по ID */
    get_url_by_id(id: number): string | undefined;
    /** Получить все объекты сцены */
    get_all(): ISceneObject[];
    /** Очистить сцену */
    clear(): void;
    /** Сериализовать сцену */
    serialize(): BaseEntityData[];
    /** Десериализовать сцену */
    deserialize(data: BaseEntityData[]): void;
    /** Сериализовать объект */
    serialize_object(object: ISceneObject): BaseEntityData;
    /** Получить уникальный ID */
    get_unique_id(): number;
    /** Освободить ресурсы */
    dispose(): void;
}

/** Параметры создания SceneService */
export interface SceneServiceParams {
    logger: ILogger;
    event_bus: IEventBus;
    render_service: IRenderService;
}

// ============================================================================
// ResourceService
// ============================================================================

/** Интерфейс ResourceService */
export interface IResourceService {
    /** Загрузить текстуру */
    load_texture(path: string): Promise<Texture>;
    /** Получить текстуру из атласа */
    get_texture_from_atlas(atlas: string, name: string): TextureInfo | undefined;
    /** Получить все текстуры из атласа */
    get_atlas_textures(atlas: string): TextureInfo[];
    /** Получить список атласов */
    get_atlases(): string[];

    /** Загрузить 3D модель */
    load_model(path: string): Promise<Object3D>;
    /** Получить загруженную модель */
    get_model(name: string): Object3D | undefined;

    /** Загрузить аудио файл */
    load_audio(path: string): Promise<AudioBuffer>;
    /** Получить загруженное аудио */
    get_audio(name: string): AudioBuffer | undefined;

    /** Получить список шрифтов */
    get_fonts(): string[];
    /** Получить шрифт по имени */
    get_font(name: string): string | undefined;

    /** Получить информацию о материале */
    get_material(name: string): MaterialInfo | undefined;
    /** Получить список материалов */
    get_materials(): MaterialInfo[];

    /** Получить путь к проекту */
    get_project_path(): string;
    /** Установить путь к проекту */
    set_project_path(path: string): void;

    /** Освободить ресурсы */
    dispose(): void;
}

/** Параметры создания ResourceService */
export interface ResourceServiceParams {
    logger: ILogger;
    event_bus: IEventBus;
    project_path?: string;
}

// ============================================================================
// CameraService
// ============================================================================

/** Режим камеры */
export type CameraMode = 'orthographic' | 'perspective';

/** Состояние камеры для сохранения/восстановления */
export interface CameraState {
    mode: CameraMode;
    position: [number, number, number];
    rotation: [number, number, number, number];
    zoom: number;
}

/** Интерфейс CameraService */
export interface ICameraService {
    /** Текущая камера */
    readonly camera: Camera;
    /** Ортографическая камера */
    readonly ortho_camera: OrthographicCamera;
    /** Перспективная камера */
    readonly persp_camera: PerspectiveCamera;

    /** Установить режим камеры */
    set_mode(mode: CameraMode): void;
    /** Получить текущий режим */
    get_mode(): CameraMode;
    /** Масштабирование */
    zoom(delta: number): void;
    /** Панорамирование */
    pan(delta: Vector2): void;
    /** Сфокусироваться на объекте */
    focus_on(object: Object3D): void;
    /** Сохранить состояние камеры */
    save_state(): CameraState;
    /** Восстановить состояние камеры */
    restore_state(state: CameraState): void;
    /** Обработать изменение размера */
    resize(width: number, height: number): void;
    /** Освободить ресурсы */
    dispose(): void;
}

/** Параметры создания CameraService */
export interface CameraServiceParams {
    logger: ILogger;
    event_bus: IEventBus;
    render_service: IRenderService;
    initial_mode?: CameraMode;
}
