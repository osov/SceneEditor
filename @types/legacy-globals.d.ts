/**
 * Декларации глобальных типов для legacy модулей
 *
 * Эти типы расширяют Window для TypeScript совместимости
 * с legacy глобальными модулями SceneEditor.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

/// <reference types="three" />

import type { Object3D, Scene, Camera, OrthographicCamera, Raycaster, WebGLRenderer, Vector2, Intersection } from 'three';

declare global {
    interface Window {
        /** Legacy RenderEngine модуль */
        RenderEngine: {
            scene: Scene;
            camera: Camera;
            camera_gui: OrthographicCamera;
            raycaster: Raycaster;
            renderer: WebGLRenderer;
            raycast_list: Object3D[];
            DC_LAYERS: Record<string, number>;
            init(): void;
            animate(): void;
            get_render_size(): { width: number; height: number };
            raycast_scene(n_pos: Vector2): Intersection[];
            is_intersected_mesh(n_pos: Vector2, mesh: Object3D): boolean;
            set_active_gui_camera(is_active: boolean): void;
            set_active_render(is_active: boolean): void;
            is_active_render(): boolean;
        };

        /** Legacy SceneManager модуль */
        SceneManager: {
            create(type: string, params?: Record<string, unknown>, id?: number): Object3D;
            add(mesh: Object3D): void;
            remove(mesh: Object3D): void;
            get_mesh_by_id(id: number): Object3D | undefined;
            get_all_meshes(): Object3D[];
            serialize_mesh(mesh: Object3D): Record<string, unknown>;
            deserialize_mesh(data: Record<string, unknown>): Object3D | undefined;
            get_unique_id(): number;
            set_mesh_name(mesh: Object3D, name: string): void;
            get_mesh_url_by_id(id: number): string | undefined;
            get_mesh_id_by_url(url: string): number | undefined;
            clear(): void;
        };

        /** Legacy ResourceManager модуль */
        ResourceManager: {
            init?(): void;
            get_texture_data?(atlas: string, name: string): unknown;
            get_list_atlas_textures?(atlas: string): string[];
            get_list_atlases?(): string[];
            has_atlas?(atlas: string): boolean;
            get_font?(name: string): string | undefined;
            get_list_fonts?(): string[];
            get_material_info?(name: string): unknown;
            get_all_materials?(): string[];
            load_material?(path: string): Promise<unknown>;
            load_model?(path: string): Promise<Object3D | undefined>;
            get_model?(name: string): Object3D | undefined;
            load_audio?(path: string): Promise<AudioBuffer | undefined>;
            get_audio?(name: string): AudioBuffer | undefined;
            load_scene?(path: string): Promise<unknown>;
            get_layers?(): string[];
            add_layer?(name: string): void;
        };

        /** Legacy SelectControl модуль */
        SelectControl: {
            init?(): void;
            get_selected?(): Object3D | null;
            get_selected_list?(): Object3D[];
            set_selected_list?(list: Object3D[]): void;
            is_selected?(mesh: Object3D): boolean;
        };

        /** Legacy HistoryControl модуль */
        HistoryControl: {
            init?(): void;
            add?(action: string, data: unknown, owner: string): void;
            undo?(): void;
            redo?(): void;
            can_undo?(): boolean;
            can_redo?(): boolean;
            clear?(): void;
            get_undo_size?(): number;
            get_redo_size?(): number;
            undo_stack?: unknown[];
            redo_stack?: unknown[];
        };

        /** Legacy ControlManager модуль */
        ControlManager: {
            init?(): void;
            set_active_control?(btn: string): void;
            get_active_control?(): string;
            update_graph?(): void;
            get_tree_graph?(): unknown[];
            set_current_scene_name?(name: string): void;
            get_current_scene_name?(): string;
        };
    }
}

export {};
