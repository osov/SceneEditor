/**
 * Типы и интерфейсы для сервисов рендеринга
 *
 * Определяет контракты для RenderEngine, SceneManager и ResourceManager
 * для использования через DI контейнер.
 */

import type {
    Object3D,
    Scene,
    Camera,
    OrthographicCamera,
    Raycaster,
    WebGLRenderer,
    Vector2,
    Intersection,
    Texture,
    ShaderMaterial,
    Vector4,
} from 'three';

/**
 * Слои рендеринга для draw calls
 */
export enum RenderLayers {
    /** Основной слой сцены */
    GO_LAYER = 0,
    /** Слой GUI камеры */
    GUI_LAYER = 1,
    /** Слой контролов редактора */
    CONTROLS_LAYER = 30,
    /** Слой для raycast */
    RAYCAST_LAYER = 31,
}

/**
 * Размер рендера
 */
export interface RenderSize {
    width: number;
    height: number;
}

/**
 * Интерфейс RenderEngine - основной движок рендеринга
 */
export interface IRenderEngine {
    /** Слои для draw calls */
    readonly DC_LAYERS: typeof RenderLayers;
    /** Three.js сцена */
    readonly scene: Scene;
    /** Основная камера */
    readonly camera: Camera;
    /** GUI камера (ортографическая) */
    readonly camera_gui: OrthographicCamera;
    /** Raycaster для определения объектов под курсором */
    readonly raycaster: Raycaster;
    /** WebGL рендерер */
    readonly renderer: WebGLRenderer;
    /** Список объектов для raycast */
    readonly raycast_list: Object3D[];

    /** Инициализация движка */
    init(): void;
    /** Запуск цикла рендеринга */
    animate(): void;
    /** Получить размер рендера */
    get_render_size(): RenderSize;
    /** Raycast по сцене */
    raycast_scene(n_pos: Vector2): Intersection[];
    /** Проверить пересечение с мешем */
    is_intersected_mesh(n_pos: Vector2, mesh: Object3D): boolean;
    /** Включить/выключить GUI камеру */
    set_active_gui_camera(is_active: boolean): void;
    /** Включить/выключить рендеринг */
    set_active_render(is_active: boolean): void;
    /** Проверить активен ли рендеринг */
    is_active_render(): boolean;
}

/**
 * Данные текстуры
 */
export interface TextureData {
    texture: Texture;
    uvOffset: Vector2;
    uvScale: Vector2;
    uv12: Vector4;
    size: Vector2;
}

/**
 * Информация о текстуре
 */
export interface TextureInfo {
    name: string;
    atlas: string;
    data: TextureData;
}

/**
 * Типы юниформов материала
 */
export enum MaterialUniformType {
    FLOAT = 'float',
    RANGE = 'range',
    VEC2 = 'vec2',
    VEC3 = 'vec3',
    VEC4 = 'vec4',
    COLOR = 'color',
    SAMPLER2D = 'sampler2D',
}

/**
 * Информация о материале
 */
export interface MaterialInfo {
    name: string;
    path: string;
    vertexShader: string;
    fragmentShader: string;
    uniforms: Record<string, unknown>;
    origin: string;
    instances: Record<string, ShaderMaterial>;
    mesh_info_to_material_hashes: Record<number, string[]>;
    material_hash_to_meshes_info: Record<string, { id: number; index: number }[]>;
    material_hash_to_changed_uniforms: Record<string, string[]>;
}

/**
 * Интерфейс ResourceManager - управление ресурсами
 */
export interface IResourceManager {
    /** Инициализация */
    init(): void;

    // Текстуры
    /** Загрузить текстуру из атласа */
    get_texture_from_atlas(atlas: string, name: string): TextureData | undefined;
    /** Получить список текстур в атласе */
    get_list_atlas_textures(atlas: string): string[];
    /** Получить список атласов */
    get_list_atlases(): string[];
    /** Проверить существование атласа */
    has_atlas(atlas: string): boolean;

    // Шрифты
    /** Получить шрифт по имени */
    get_font(name: string): string | undefined;
    /** Получить список шрифтов */
    get_list_fonts(): string[];

    // Материалы
    /** Получить информацию о материале */
    get_material_info(name: string): MaterialInfo | undefined;
    /** Получить список материалов */
    get_all_materials(): string[];
    /** Загрузить материал */
    load_material(path: string): Promise<MaterialInfo | undefined>;

    // Модели
    /** Загрузить 3D модель */
    load_model(path: string): Promise<Object3D | undefined>;
    /** Получить загруженную модель */
    get_model(name: string): Object3D | undefined;

    // Аудио
    /** Загрузить аудио файл */
    load_audio(path: string): Promise<AudioBuffer | undefined>;
    /** Получить загруженное аудио */
    get_audio(name: string): AudioBuffer | undefined;

    // Сцены
    /** Загрузить сцену */
    load_scene(path: string): Promise<unknown>;
    /** Получить путь к проекту */
    get_project_path(): string;
    /** Установить путь к проекту */
    set_project_path(path: string): void;

    // Слои
    /** Получить список слоёв */
    get_layers(): string[];
    /** Добавить слой */
    add_layer(name: string): void;
}

/**
 * Типы объектов сцены
 */
export enum ObjectTypes {
    EMPTY = 'empty',
    ENTITY = 'entity',
    SLICE9_PLANE = 'slice9_plane',
    TEXT = 'text',

    GUI_CONTAINER = 'gui_container',
    GUI_BOX = 'gui_box',
    GUI_TEXT = 'gui_text',

    GO_CONTAINER = 'go_container',
    GO_SPRITE_COMPONENT = 'go_sprite_component',
    GO_LABEL_COMPONENT = 'go_label_component',
    GO_MODEL_COMPONENT = 'go_model_component',
    GO_ANIMATED_MODEL_COMPONENT = 'go_animated_model_component',
    GO_AUDIO_COMPONENT = 'go_audio_component',

    COMPONENT = 'component',
}

/**
 * Базовые данные сущности
 */
export interface BaseEntityData {
    id: number;
    pid?: number;
    type: ObjectTypes;
    name: string;
    visible: boolean;
    position: [number, number, number];
    rotation: [number, number, number, number];
    scale: [number, number];
    other_data?: Record<string, unknown>;
    children?: BaseEntityData[];
}

/**
 * Интерфейс базовой сущности (mesh)
 */
export interface IBaseEntity extends Object3D {
    readonly mesh_data: { id: number };
    readonly type: ObjectTypes;

    get_position(): Vector2;
    set_position(x: number, y: number, z?: number): void;
    get_scale(): Vector2;
    set_scale(x: number, y: number): void;
    get_active(): boolean;
    set_active(value: boolean): void;
    serialize(): Record<string, unknown>;
}

/**
 * Интерфейс SceneManager - управление объектами сцены
 */
export interface ISceneManager {
    /** Создать объект сцены */
    create<T extends ObjectTypes>(type: T, params?: Record<string, unknown>, id?: number): IBaseEntity;
    /** Добавить объект в сцену */
    add(mesh: IBaseEntity): void;
    /** Удалить объект из сцены */
    remove(mesh: IBaseEntity): void;
    /** Получить объект по ID */
    get_mesh_by_id(id: number): IBaseEntity | undefined;
    /** Получить все объекты сцены */
    get_all_meshes(): IBaseEntity[];
    /** Сериализовать объект */
    serialize_mesh(mesh: IBaseEntity, clean_id_pid?: boolean, without_children?: boolean): BaseEntityData;
    /** Десериализовать объект */
    deserialize_mesh(data: BaseEntityData): IBaseEntity | undefined;
    /** Получить уникальный ID */
    get_unique_id(): number;
    /** Установить имя меша */
    set_mesh_name(mesh: IBaseEntity, name: string): void;
    /** Получить URL меша по ID */
    get_mesh_url_by_id(id: number): string | undefined;
    /** Получить ID меша по URL */
    get_mesh_id_by_url(url: string): number | undefined;
    /** Очистить сцену */
    clear(): void;
}

/**
 * Параметры создания RenderEngine
 */
export interface RenderEngineConfig {
    /** Canvas элемент для рендеринга */
    canvas?: HTMLCanvasElement;
    /** Включить антиалиасинг */
    antialias?: boolean;
    /** Включить stencil buffer */
    stencil?: boolean;
    /** Включить альфа канал */
    alpha?: boolean;
    /** Использовать ортографическую камеру */
    orthographic?: boolean;
    /** Дистанция до far plane камеры */
    cameraFar?: number;
    /** Начальная Z позиция камеры */
    cameraZ?: number;
    /** Включить режим половинного FPS */
    halfFps?: boolean;
}

/**
 * Параметры создания SceneManager
 */
export interface SceneManagerConfig {
    /** Ссылка на RenderEngine */
    renderEngine: IRenderEngine;
}

/**
 * Параметры создания ResourceManager
 */
export interface ResourceManagerConfig {
    /** Путь к проекту */
    projectPath?: string;
}

// ============================================================================
// Типы свойств (перенесено из controls/types.ts)
// ============================================================================

/** Данные перемещения меша */
export type MeshMoveEventData = {
    id_mesh: number;
    pid: number;
    next_id: number;
};

/** Информация о свойстве меша */
export interface MeshPropertyInfo<T> {
    mesh_id: number;
    index?: number;
    value: T;
}

/** Информация о свойстве материала */
export interface MeshMaterialPropertyInfo<T> {
    mesh_id: number;
    material_index: number;
    value: T;
}

/** Информация о юниформе материала */
export interface MeshMaterialUniformInfo<T> {
    mesh_id: number;
    material_index: number;
    uniform_name: string;
    value: T;
}

/** Информация о текстуре ассета */
export interface AssetTextureInfo<T> {
    texture_path: string;
    value: T;
}

/** Информация о материале ассета */
export interface AssetMaterialInfo<T> {
    material_path: string;
    name: string;
    value: T;
}

/** Информация об аудио ассета */
export interface AssetAudioInfo<T> {
    audio_path: string;
    audio_id: number;
    value: T;
}
