/**
 * ResourceService - сервис управления ресурсами
 *
 * Делегирует к legacy ResourceManager для обратной совместимости.
 * Все методы проксируются к глобальному ResourceManager.
 */

import type { Object3D, Texture, AnimationClip, ShaderMaterial } from 'three';
import type { TextureInfo, MaterialInfo, BaseEntityData } from '@editor/core/render/types';
import type {
    IResourceService,
    ResourceServiceParams,
    TextureData,
    SceneInfo,
    ISceneObject,
} from './types';

/** Получить legacy ResourceManager */
function get_legacy_resource_manager() {
    return (globalThis as unknown as { ResourceManager?: IResourceService }).ResourceManager;
}

/** Проверить доступность ResourceManager */
function require_resource_manager(): IResourceService {
    const rm = get_legacy_resource_manager();
    if (rm === undefined) {
        throw new Error('ResourceManager не инициализирован. Вызовите register_resource_manager() сначала.');
    }
    return rm;
}

/** Создать ResourceService */
export function create_resource_service(params: ResourceServiceParams): IResourceService {
    const { logger } = params;

    // Все методы делегируются к ResourceManager

    // === Загрузка ресурсов ===
    function load_asset(path: string): Promise<unknown> {
        return require_resource_manager().load_asset(path);
    }

    function load_texture(path: string): Promise<Texture> {
        return require_resource_manager().load_texture(path);
    }

    function preload_texture(path: string, atlas?: string, override?: boolean): Promise<void> {
        return require_resource_manager().preload_texture(path, atlas, override);
    }

    function preload_atlas(atlas_path: string, texture_path: string, override?: boolean): Promise<void> {
        return require_resource_manager().preload_atlas(atlas_path, texture_path, override);
    }

    function preload_font(path: string, override?: boolean): Promise<void> {
        return require_resource_manager().preload_font(path, override);
    }

    function preload_audio(path: string): Promise<void> {
        return require_resource_manager().preload_audio(path);
    }

    function preload_material(path: string): Promise<void> {
        return require_resource_manager().preload_material(path);
    }

    function preload_scene(path: string): Promise<void> {
        return require_resource_manager().preload_scene(path);
    }

    function preload_model(url: string): Promise<Object3D> {
        return require_resource_manager().preload_model(url);
    }

    function preload_vertex_program(path: string): Promise<void> {
        return require_resource_manager().preload_vertex_program(path);
    }

    function preload_fragment_program(path: string): Promise<void> {
        return require_resource_manager().preload_fragment_program(path);
    }

    // === Текстуры и атласы ===
    function add_texture(key: string, texture: Texture, atlasName?: string): void {
        return require_resource_manager().add_texture(key, texture, atlasName);
    }

    function get_texture(name: string, atlas: string): TextureData {
        return require_resource_manager().get_texture(name, atlas);
    }

    function get_texture_from_atlas(atlas: string, name: string): TextureInfo | undefined {
        return require_resource_manager().get_texture_from_atlas(atlas, name);
    }

    function get_atlas_textures(atlas: string): TextureInfo[] {
        return require_resource_manager().get_atlas_textures(atlas);
    }

    function get_atlas(name: string): Texture | null {
        return require_resource_manager().get_atlas(name);
    }

    function get_atlas_by_texture_name(texture_name: string): string | null {
        return require_resource_manager().get_atlas_by_texture_name(texture_name);
    }

    function get_atlases(): string[] {
        return require_resource_manager().get_atlases();
    }

    function get_all_atlases(): string[] {
        return require_resource_manager().get_all_atlases();
    }

    function get_all_textures(): TextureInfo[] {
        return require_resource_manager().get_all_textures();
    }

    function add_atlas(name: string): void {
        return require_resource_manager().add_atlas(name);
    }

    function has_atlas(name: string): boolean {
        return require_resource_manager().has_atlas(name);
    }

    function del_atlas(name: string): void {
        return require_resource_manager().del_atlas(name);
    }

    function has_texture_name(name: string, atlas?: string): boolean {
        return require_resource_manager().has_texture_name(name, atlas);
    }

    function free_texture(name: string, atlas: string): void {
        return require_resource_manager().free_texture(name, atlas);
    }

    function override_atlas_texture(name: string, atlas: string, texture: Texture): void {
        return require_resource_manager().override_atlas_texture(name, atlas, texture);
    }

    // === Модели и анимации ===
    function load_model(path: string): Promise<Object3D> {
        return require_resource_manager().load_model(path);
    }

    function get_model(name: string): Object3D | undefined {
        return require_resource_manager().get_model(name);
    }

    function get_all_models(): string[] {
        return require_resource_manager().get_all_models();
    }

    function find_animation(model_name: string, animation_name: string): AnimationClip | undefined {
        return require_resource_manager().find_animation(model_name, animation_name);
    }

    function get_animations_by_model(model_name: string): AnimationClip[] {
        return require_resource_manager().get_animations_by_model(model_name);
    }

    function get_all_model_animations(model_name: string): string[] {
        return require_resource_manager().get_all_model_animations(model_name);
    }

    // === Аудио ===
    function load_audio(path: string): Promise<AudioBuffer> {
        return require_resource_manager().load_audio(path);
    }

    function get_audio(name: string): AudioBuffer | undefined {
        return require_resource_manager().get_audio(name);
    }

    function get_all_sounds(): string[] {
        return require_resource_manager().get_all_sounds();
    }

    function get_sound_buffer(name: string): AudioBuffer | undefined {
        return require_resource_manager().get_sound_buffer(name);
    }

    // === Шрифты ===
    function get_fonts(): string[] {
        return require_resource_manager().get_fonts();
    }

    function get_all_fonts(): string[] {
        return require_resource_manager().get_all_fonts();
    }

    function get_font(name: string): string | undefined {
        return require_resource_manager().get_font(name);
    }

    // === Материалы ===
    function get_material(name: string): MaterialInfo | undefined {
        return require_resource_manager().get_material(name);
    }

    function get_material_info(name: string): MaterialInfo | undefined {
        return require_resource_manager().get_material_info(name);
    }

    function get_materials(): MaterialInfo[] {
        return require_resource_manager().get_materials();
    }

    function get_all_materials(): string[] {
        return require_resource_manager().get_all_materials();
    }

    function get_material_by_hash(name: string, hash: string): ShaderMaterial | undefined {
        return require_resource_manager().get_material_by_hash(name, hash);
    }

    function get_material_by_mesh_id(name: string, mesh_id: number, index?: number): ShaderMaterial | undefined {
        return require_resource_manager().get_material_by_mesh_id(name, mesh_id, index);
    }

    function get_material_hash_by_mesh_id(name: string, mesh_id: number, index?: number): string | undefined {
        return require_resource_manager().get_material_hash_by_mesh_id(name, mesh_id, index);
    }

    function is_material_origin_hash(name: string, hash: string): boolean {
        return require_resource_manager().is_material_origin_hash(name, hash);
    }

    function has_material_by_mesh_id(name: string, mesh_id: number, index?: number): boolean {
        return require_resource_manager().has_material_by_mesh_id(name, mesh_id, index);
    }

    function set_material_property_for_mesh(mesh: ISceneObject, prop: string, value: unknown): void {
        return require_resource_manager().set_material_property_for_mesh(mesh, prop, value);
    }

    function set_material_property_for_multiple_mesh(mesh: ISceneObject, index: number, prop: string, value: unknown): void {
        return require_resource_manager().set_material_property_for_multiple_mesh(mesh, index, prop, value);
    }

    function set_material_uniform_for_original(name: string, uniform_name: string, value: unknown): void {
        return require_resource_manager().set_material_uniform_for_original(name, uniform_name, value);
    }

    function set_material_uniform_for_mesh(mesh: ISceneObject, uniform_name: string, value: unknown): void {
        return require_resource_manager().set_material_uniform_for_mesh(mesh, uniform_name, value);
    }

    function set_material_uniform_for_multiple_material_mesh(mesh: ISceneObject, index: number, uniform_name: string, value: unknown): void {
        return require_resource_manager().set_material_uniform_for_multiple_material_mesh(mesh, index, uniform_name, value);
    }

    function set_material_define_for_mesh(mesh: ISceneObject, define: string, value: string): void {
        return require_resource_manager().set_material_define_for_mesh(mesh, define, value);
    }

    function set_material_define_for_multiple_material_mesh(mesh: ISceneObject, index: number, define: string, value: string): void {
        return require_resource_manager().set_material_define_for_multiple_material_mesh(mesh, index, define, value);
    }

    function unlink_material_for_mesh(name: string, mesh_id: number): void {
        return require_resource_manager().unlink_material_for_mesh(name, mesh_id);
    }

    function unlink_material_for_multiple_material_mesh(name: string, mesh_id: number, index: number): void {
        return require_resource_manager().unlink_material_for_multiple_material_mesh(name, mesh_id, index);
    }

    function get_info_about_unique_materials(name: string): unknown[] {
        return require_resource_manager().get_info_about_unique_materials(name);
    }

    function get_changed_uniforms_for_mesh(mesh: ISceneObject): Record<string, unknown> | undefined {
        return require_resource_manager().get_changed_uniforms_for_mesh(mesh);
    }

    function get_changed_uniforms_for_multiple_material_mesh(mesh: ISceneObject, index: number): Record<string, unknown> | undefined {
        return require_resource_manager().get_changed_uniforms_for_multiple_material_mesh(mesh, index);
    }

    // === Шейдеры ===
    function get_all_vertex_programs(): string[] {
        return require_resource_manager().get_all_vertex_programs();
    }

    function get_all_fragment_programs(): string[] {
        return require_resource_manager().get_all_fragment_programs();
    }

    // === Слои ===
    function add_layer(name: string): void {
        return require_resource_manager().add_layer(name);
    }

    function remove_layer(name: string): void {
        return require_resource_manager().remove_layer(name);
    }

    function get_layers(): string[] {
        return require_resource_manager().get_layers();
    }

    function has_layer(name: string): boolean {
        return require_resource_manager().has_layer(name);
    }

    function get_layers_mask_by_names(names: string[]): number {
        return require_resource_manager().get_layers_mask_by_names(names);
    }

    function get_layers_names_by_mask(mask: number): string[] {
        return require_resource_manager().get_layers_names_by_mask(mask);
    }

    // === Тайлмапы ===
    function set_tilemap_path(name: string, path: string): void {
        return require_resource_manager().set_tilemap_path(name, path);
    }

    function get_tilemap_path(name: string): string | undefined {
        return require_resource_manager().get_tilemap_path(name);
    }

    function set_tile_info(tilemap: string, id: string, info: string): void {
        return require_resource_manager().set_tile_info(tilemap, id, info);
    }

    function get_tile_info(tilemap: string, id: string): string | undefined {
        return require_resource_manager().get_tile_info(tilemap, id);
    }

    function get_all_loaded_tilemaps(): string[] {
        return require_resource_manager().get_all_loaded_tilemaps();
    }

    // === Сцены ===
    function get_scene_info(path: string): SceneInfo | undefined {
        return require_resource_manager().get_scene_info(path);
    }

    function cache_scene(path: string, data: BaseEntityData): void {
        return require_resource_manager().cache_scene(path, data);
    }

    // === Метаданные ===
    function update_from_metadata(): Promise<void> {
        return require_resource_manager().update_from_metadata();
    }

    function write_metadata(): Promise<void> {
        return require_resource_manager().write_metadata();
    }

    // === Проект ===
    function get_project_path(): string {
        return require_resource_manager().get_project_path();
    }

    function get_project_url(): string {
        return require_resource_manager().get_project_url();
    }

    function set_project_path(path: string): void {
        return require_resource_manager().set_project_path(path);
    }

    function set_project_name(name: string): void {
        return require_resource_manager().set_project_name(name);
    }

    // === Освобождение ===
    function dispose(): void {
        logger.info('ResourceService освобождён');
    }

    return {
        // Загрузка
        load_asset,
        load_texture,
        preload_texture,
        preload_atlas,
        preload_font,
        preload_audio,
        preload_material,
        preload_scene,
        preload_model,
        preload_vertex_program,
        preload_fragment_program,

        // Текстуры и атласы
        add_texture,
        get_texture,
        get_texture_from_atlas,
        get_atlas_textures,
        get_atlas,
        get_atlas_by_texture_name,
        get_atlases,
        get_all_atlases,
        get_all_textures,
        add_atlas,
        has_atlas,
        del_atlas,
        has_texture_name,
        free_texture,
        override_atlas_texture,

        // Модели и анимации
        load_model,
        get_model,
        get_all_models,
        find_animation,
        get_animations_by_model,
        get_all_model_animations,

        // Аудио
        load_audio,
        get_audio,
        get_all_sounds,
        get_sound_buffer,

        // Шрифты
        get_fonts,
        get_all_fonts,
        get_font,

        // Материалы
        get_material,
        get_material_info,
        get_materials,
        get_all_materials,
        get_material_by_hash,
        get_material_by_mesh_id,
        get_material_hash_by_mesh_id,
        is_material_origin_hash,
        has_material_by_mesh_id,
        set_material_property_for_mesh,
        set_material_property_for_multiple_mesh,
        set_material_uniform_for_original,
        set_material_uniform_for_mesh,
        set_material_uniform_for_multiple_material_mesh,
        set_material_define_for_mesh,
        set_material_define_for_multiple_material_mesh,
        unlink_material_for_mesh,
        unlink_material_for_multiple_material_mesh,
        get_info_about_unique_materials,
        get_changed_uniforms_for_mesh,
        get_changed_uniforms_for_multiple_material_mesh,

        // Шейдеры
        get_all_vertex_programs,
        get_all_fragment_programs,

        // Слои
        add_layer,
        remove_layer,
        get_layers,
        has_layer,
        get_layers_mask_by_names,
        get_layers_names_by_mask,

        // Тайлмапы
        set_tilemap_path,
        get_tilemap_path,
        set_tile_info,
        get_tile_info,
        get_all_loaded_tilemaps,

        // Сцены
        get_scene_info,
        cache_scene,

        // Метаданные
        update_from_metadata,
        write_metadata,

        // Проект
        get_project_path,
        get_project_url,
        set_project_path,
        set_project_name,

        // Хранилища
        get models() {
            return require_resource_manager().models;
        },
        get animations() {
            return require_resource_manager().animations;
        },

        dispose,
    };
}
