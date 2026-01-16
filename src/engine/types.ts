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
    Vector3,
    Vector4,
    Intersection,
    Object3D,
    Texture,
    Mesh,
    AnimationClip,
    ShaderMaterial,
} from 'three';
import type { ILogger, IEventBus } from '@editor/core/di/types';
import type { TextureInfo, MaterialInfo, ObjectTypes, BaseEntityData } from '@editor/core/render/types';
import type { InspectorFieldDefinition } from '@editor/core/inspector/IInspectable';

// Типы для ResourceService из legacy resource_manager
export interface TextureData {
    texture: Texture;
    uvOffset: Vector2;
    uvScale: Vector2;
    uv12: Vector4;
    size: Vector2;
}

export interface AnimationInfo {
    animation: string;
    model: string;
    clip: AnimationClip;
}

export interface SceneInfo {
    is_component: boolean;
    data: BaseEntityData;
}

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

/** Слои рендеринга */
export interface RenderLayers {
    /** Основной слой сцены */
    readonly GO_LAYER: 0;
    /** Слой GUI камеры */
    readonly GUI_LAYER: 1;
    /** Слой контролов редактора */
    readonly CONTROLS_LAYER: 30;
    /** Слой для raycast */
    readonly RAYCAST_LAYER: 31;
}

/** Интерфейс RenderService */
export interface IRenderService {
    /** Three.js сцена */
    readonly scene: Scene;
    /** Основная камера */
    readonly camera: Camera;
    /** GUI камера */
    readonly camera_gui: OrthographicCamera;
    /** WebGL рендерер */
    readonly renderer: WebGLRenderer;
    /** Слои рендеринга (DC_LAYERS) */
    readonly DC_LAYERS: RenderLayers;

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
    /** Raycast по сцене (alias для совместимости) */
    raycast_scene(position: Vector2): Intersection[];
    /** Проверить пересечение с конкретным mesh */
    is_intersected_mesh(position: Vector2, mesh: Object3D): boolean;
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
    /** Тип объекта */
    readonly type: ObjectTypes;
    /** Уникальный идентификатор и метаданные */
    readonly mesh_data: {
        id: number;
        type?: ObjectTypes;
        name?: string;
        [key: string]: unknown;
    };
    /** Является ли компонентом */
    readonly is_component?: boolean;

    // === Базовые методы (обязательные для всех объектов) ===
    get_position(): Vector3;
    set_position(x: number, y: number, z?: number): void;
    get_scale(): Vector2;
    set_scale(x: number, y: number): void;
    get_active(): boolean;
    set_active(active: boolean): void;
    get_visible(): boolean;
    set_visible(visible: boolean): void;

    // === Опциональные методы (зависят от типа объекта) ===
    get_size?(): Vector2;
    set_size?(w: number, h: number): void;
    get_color?(): string;
    set_color?(hex: string): void;
    get_texture?(): string[];
    set_texture?(name: string, atlas?: string): void;
    get_pivot?(): Vector2;
    set_pivot?(x: number, y: number, is_sync?: boolean): void;
    get_anchor?(): Vector2;
    set_anchor?(x: number, y: number): void;
    get_bounds?(): number[];
    transform_changed?(): void;

    // === Сериализация ===
    serialize?(): Record<string, unknown>;
    deserialize?(data: Record<string, unknown>): void;

    // === Инспектор (IInspectable) ===
    /** Получить определения полей для инспектора */
    get_inspector_fields?(): InspectorFieldDefinition[];

    // === Опциональные флаги для совместимости с legacy ===
    /** Ключи которые не записываются в историю */
    ignore_history?: unknown;
    /** Объект не сохраняется в файл сцены */
    no_saving?: boolean;
    /** Объект нельзя удалять */
    no_removing?: boolean;
    /** Callback при изменении трансформации */
    on_transform_changed?: unknown;
}

/** Элемент графа иерархии */
export interface SceneGraphItem {
    id: number;
    pid: number;
    name: string;
    visible: boolean;
    type: ObjectTypes;
}

/** Интерфейс SceneService */
export interface ISceneService {
    /** Создать объект сцены (тип может быть ObjectTypes, IObjectTypes или string) */
    create(type: string, params?: Record<string, unknown>, id?: number): ISceneObject;
    /** Добавить объект в сцену */
    add(object: ISceneObject, parent_id?: number, before_id?: number): void;
    /** Добавить объект к родителю */
    add_to_mesh(object: ISceneObject, parent: ISceneObject): void;
    /** Удалить объект из сцены */
    remove(object: ISceneObject): void;
    /** Удалить объект по ID */
    remove_by_id(id: number): void;
    /** Получить объект по ID */
    get_by_id(id: number): ISceneObject | undefined;
    /** Получить объект по имени */
    get_by_name(name: string): ISceneObject | undefined;
    /** Получить объект по URL */
    get_by_url(url: string): ISceneObject | undefined;
    /** Получить URL объекта по ID */
    get_url_by_id(id: number): string | undefined;
    /** Получить ID объекта по URL */
    get_id_by_url(url: string): number | undefined;
    /** Получить все объекты сцены */
    get_all(): ISceneObject[];
    /** Очистить сцену */
    clear(): void;
    /** Сериализовать сцену */
    serialize(): BaseEntityData[];
    /** Сериализовать сцену (alias для save_scene) */
    save_scene(): BaseEntityData[];
    /** Десериализовать сцену */
    deserialize(data: BaseEntityData[]): void;
    /** Загрузить сцену */
    load_scene(data: BaseEntityData[], sub_name?: string): void;
    /** Сериализовать объект */
    serialize_object(object: ISceneObject, clean_id_pid?: boolean, without_children?: boolean): BaseEntityData;
    /** Десериализовать объект */
    deserialize_object(data: BaseEntityData, with_id?: boolean): ISceneObject;
    /** Получить уникальный ID */
    get_unique_id(): number;
    /** Переместить объект в иерархии */
    move(object: ISceneObject, parent_id?: number, before_id?: number): void;
    /** Переместить объект по ID */
    move_by_id(id: number, parent_id?: number, before_id?: number): void;
    /** Установить имя объекта */
    set_name(object: ISceneObject, name: string): void;
    /** Обновить URL объекта */
    update_url(object: ISceneObject): void;
    /** Найти ID следующего sibling объекта */
    find_next_sibling_id(object: ISceneObject): number;
    /** Найти ближайший GUI контейнер */
    find_nearest_gui_container(object: ISceneObject): ISceneObject | null;
    /** Найти ближайший clipping родитель */
    find_nearest_clipping_parent(object: ISceneObject): ISceneObject | null;
    /** Получить граф иерархии сцены */
    make_graph(): SceneGraphItem[];
    /** Вывести граф отладки */
    debug_graph(mesh: Object3D, level?: number): string;
    /** Сохранить состояние редактора */
    save_editor(): { id_counter: number };
    /** Загрузить состояние редактора */
    load_editor(data: { id_counter: number }): void;
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

/** Интерфейс ResourceService - расширяет legacy ResourceManager */
export interface IResourceService {
    // === Загрузка ресурсов ===
    load_asset(path: string): Promise<unknown>;
    load_texture(path: string): Promise<Texture>;
    preload_texture(path: string, atlas?: string, override?: boolean): Promise<void>;
    preload_atlas(atlas_path: string, texture_path: string, override?: boolean): Promise<void>;
    preload_font(path: string, override?: boolean): Promise<void>;
    preload_audio(path: string): Promise<void>;
    preload_material(path: string): Promise<void>;
    preload_scene(path: string): Promise<void>;
    preload_model(url: string): Promise<Object3D>;
    preload_vertex_program(path: string): Promise<void>;
    preload_fragment_program(path: string): Promise<void>;

    // === Текстуры и атласы ===
    add_texture(path: string, atlas: string, texture: Texture, override?: boolean): void;
    get_texture(name: string, atlas: string): TextureData;
    get_texture_from_atlas(atlas: string, name: string): TextureInfo | undefined;
    get_atlas_textures(atlas: string): TextureInfo[];
    get_atlas(name: string): Texture | null;
    get_atlas_by_texture_name(texture_name: string): string | null;
    get_atlases(): string[];
    get_all_atlases(): string[];
    get_all_textures(): TextureInfo[];
    add_atlas(name: string): void;
    has_atlas(name: string): boolean;
    del_atlas(name: string): void;
    has_texture_name(name: string, atlas?: string): boolean;
    free_texture(name: string, atlas: string): void;
    override_atlas_texture(old_atlas: string, new_atlas: string, texture_name: string): void;

    // === Модели и анимации ===
    load_model(path: string): Promise<Object3D>;
    get_model(name: string): Object3D | undefined;
    get_all_models(): string[];
    find_animation(model_name: string, animation_name: string): { model: string, animation: string, clip: AnimationClip } | null;
    get_animations_by_model(model_name: string): AnimationClip[];
    get_all_model_animations(model_name: string): string[];

    // === Аудио ===
    load_audio(path: string): Promise<AudioBuffer>;
    get_audio(name: string): AudioBuffer | undefined;
    get_all_sounds(): string[];
    get_sound_buffer(name: string): AudioBuffer | undefined;

    // === Шрифты ===
    get_fonts(): string[];
    get_all_fonts(): string[];
    get_font(name: string): string | undefined;

    // === Материалы ===
    get_material(name: string): MaterialInfo | undefined;
    get_material_info(name: string): MaterialInfo | undefined;
    get_materials(): MaterialInfo[];
    get_all_materials(): string[];
    get_material_by_hash(name: string, hash: string): ShaderMaterial | undefined;
    get_material_by_mesh_id(name: string, mesh_id: number, index?: number): ShaderMaterial | undefined;
    get_material_hash_by_mesh_id(name: string, mesh_id: number, index?: number): string | undefined;
    is_material_origin_hash(name: string, hash: string): boolean;
    has_material_by_mesh_id(name: string, mesh_id: number, index?: number): boolean;
    set_material_property_for_mesh(mesh: ISceneObject, prop: string, value: unknown): void;
    set_material_property_for_multiple_mesh(mesh: ISceneObject, index: number, prop: string, value: unknown): void;
    set_material_uniform_for_original(name: string, uniform_name: string, value: unknown): void;
    set_material_uniform_for_mesh(mesh: ISceneObject, uniform_name: string, value: unknown): void;
    set_material_uniform_for_multiple_material_mesh(mesh: ISceneObject, index: number, uniform_name: string, value: unknown): void;
    set_material_define_for_mesh(mesh: ISceneObject, define: string, value?: string): void;
    set_material_define_for_multiple_material_mesh(mesh: ISceneObject, index: number, define: string, value?: string): void;
    unlink_material_for_mesh(name: string, mesh_id: number): void;
    unlink_material_for_multiple_material_mesh(name: string, mesh_id: number, index: number): void;
    get_info_about_unique_materials(name: string): unknown[];
    get_changed_uniforms_for_mesh(mesh: ISceneObject): Record<string, unknown> | undefined;
    get_changed_uniforms_for_multiple_material_mesh(mesh: ISceneObject, index: number): Record<string, unknown> | undefined;

    // === Шейдеры ===
    get_all_vertex_programs(): string[];
    get_all_fragment_programs(): string[];

    // === Слои ===
    add_layer(name: string): void;
    remove_layer(name: string): void;
    get_layers(): string[];
    has_layer(name: string): boolean;
    get_layers_mask_by_names(names: string[]): number;
    get_layers_names_by_mask(mask: number): string[];

    // === Тайлмапы ===
    set_tilemap_path(name: string, path: string): void;
    get_tilemap_path(name: string): string | undefined;
    set_tile_info(tilemap: string, id: string, info: string): void;
    get_tile_info(tilemap: string, id: string): string | undefined;
    get_all_loaded_tilemaps(): string[];

    // === Сцены ===
    get_scene_info(path: string): SceneInfo | undefined;
    cache_scene(path: string, data: BaseEntityData): void;

    // === Метаданные ===
    update_from_metadata(): Promise<void>;
    write_metadata(): Promise<void>;

    // === Проект ===
    get_project_path(): string;
    get_project_url(): string;
    set_project_path(path: string): void;
    set_project_name(name: string): void;

    // === Хранилища (для прямого доступа) ===
    readonly models: Record<string, Object3D>;
    readonly animations: AnimationInfo[];

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
    /** Получить текущий зум */
    get_zoom(): number;
    /** Масштабирование */
    zoom(delta: number): void;
    /** Панорамирование */
    pan(delta: Vector2): void;
    /** Сфокусироваться на объекте */
    focus_on(object: Object3D): void;
    /** Сфокусироваться на выделенных объектах */
    focus_on_selected(): void;
    /** Сохранить состояние камеры */
    save_state(): CameraState;
    /** Восстановить состояние камеры */
    restore_state(state: CameraState): void;
    /** Сохранить состояние камеры для сцены в localStorage */
    save_scene_state(scene_name: string): void;
    /** Загрузить состояние камеры для сцены из localStorage */
    load_scene_state(scene_name: string): void;
    /** Обработать изменение размера */
    resize(width: number, height: number): void;
    /** Преобразовать экранные координаты в мировые (на плоскости Z=0) */
    screen_to_world(x: number, y: number, is_gui?: boolean): Vector3;
    /** Проверить видимость меша в камере */
    is_visible(mesh: Mesh): boolean;
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
