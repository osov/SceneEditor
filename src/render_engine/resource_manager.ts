// TODO: использовать set_material_uniform_for_original в on_material_file_change
// TODO: сделать две основных функции merge_with_instance (с проверкой на то что предыдущая не оригинал чтоб не удалить, и на то что текущая не оригинал чтоб не записать измения в оригинал, изменения обновляются у текущей по предыдущей + текущее изменение) и new_copy (для cоздания копии)
// TODO: перепроверить все использования мап c обработкой ошибок

/*
NOTE: API для материалов:
    гетеры c обработкой ошибки существования:
        get_material_info
        get_material_by_mesh_id
        get_material_by_hash
        get_material_hash_by_mesh_id
        get_mesh_id_by_material_hash
    основные:
        preload_material + load_material
        on_material_file_change
        link_material_to_mesh
        unlink_material_for_mesh
        set_material_uniform_for_original
        set_material_uniform_for_mesh
        set_material_define_for_mesh
    вспомогательные:
        get_all_materials
        get_info_about_unique_materials
*/

import { AnimationClip, CanvasTexture, Group, LoadingManager, Object3D, RepeatWrapping, Scene, SkinnedMesh, Texture, TextureLoader, Vector2, MinificationTextureFilter, MagnificationTextureFilter, ShaderMaterial, Vector3, IUniform, Vector4, AudioLoader } from 'three';
import { copy_material, get_file_name, get_material_hash } from './helpers/utils';
import { parse_tp_data_to_uv } from './parsers/atlas_parser';
import { preloadFont } from 'troika-three-text'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { ColladaLoader } from 'three/examples/jsm/loaders/ColladaLoader';
import { FSEvent, TDictionary, TRecursiveDict } from '../modules_editor/modules_editor_const';
import { shader } from './objects/entity_base';
import { deepClone, getObjectHash, hexToRGB, rgbToHex } from '../modules/utils';
import { Slice9Mesh } from './objects/slice9';
import { IBaseEntityData } from './types';
import { MultipleMaterialMesh } from './objects/multiple_material_mesh';


declare global {
    const ResourceManager: ReturnType<typeof ResourceManagerModule>;
}

export function register_resource_manager() {
    (window as any).ResourceManager = ResourceManagerModule();
}
interface AssetData<T> {
    [k: string]: { data: T };
}

export interface TextureData {
    texture: Texture;
    uvOffset: Vector2;
    uvScale: Vector2;
    uv12: Vector4;
    size: Vector2;
}

export interface TextureInfo {
    name: string;
    atlas: string;
    data: TextureData;
}

interface AnimationInfo {
    animation: string;
    model: string;
    clip: AnimationClip;
}

export type MaterialUniformParams = {
    [MaterialUniformType.FLOAT]: {};
    [MaterialUniformType.RANGE]: { min?: number, max?: number, step?: number };
    [MaterialUniformType.VEC2]: {
        x: { min?: number, max?: number, step?: number };
        y: { min?: number, max?: number, step?: number };
    };
    [MaterialUniformType.VEC3]: {
        x: { min?: number, max?: number, step?: number };
        y: { min?: number, max?: number, step?: number };
        z: { min?: number, max?: number, step?: number };
    };
    [MaterialUniformType.VEC4]: {
        x: { min?: number, max?: number, step?: number };
        y: { min?: number, max?: number, step?: number };
        z: { min?: number, max?: number, step?: number };
        w: { min?: number, max?: number, step?: number };
    };
    [MaterialUniformType.COLOR]: {};
    [MaterialUniformType.SAMPLER2D]: {};
}

export interface MaterialUniform<T extends keyof MaterialUniformParams> {
    type: T;
    params: MaterialUniformParams[T];
    readonly?: boolean;
    hide?: boolean;
}

export interface MaterialInstance {
    changed_uniforms: string[];
    data: ShaderMaterial;
}

export interface MaterialInfo {
    name: string;
    path: string;
    vertexShader: string;
    fragmentShader: string;
    uniforms: {
        [key: string]: MaterialUniform<keyof MaterialUniformParams>
    };
    // NOTE: храним hash оригинального материала, для сравнений
    origin: string;
    // NOTE: храним все копии материала, получение по хешу
    instances: {
        [key: string]: ShaderMaterial;
    };
    // NOTE: для того чтобы быстро найти используемый мешем материал
    mesh_info_to_material_hashes: {
        [key: number]: string[];
    };
    // NOTE: для того чтобы быстро найти меши которые используют один и тот же материал
    material_hash_to_meshes_info: {
        [key: string]: {
            id: number;
            index: number;
        }[];
    };
    // NOTE: для того чтобы быстро найти измененные юниформы у копии материала
    material_hash_to_changed_uniforms: {
        [key: string]: string[];
    };
}

export interface SceneInfo {
    is_component: boolean;
    data: IBaseEntityData
};

export enum MaterialUniformType {
    FLOAT = 'float',
    RANGE = 'range',
    VEC2 = 'vec2',
    VEC3 = 'vec3',
    VEC4 = 'vec4',
    COLOR = 'color',
    SAMPLER2D = 'sampler2D'
}

export function ResourceManagerModule() {
    const font_characters = " !\"#$%&'()*+,-./0123456789:;<=> ?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\]^_`abcdefghijklmnopqrstuvwxyz{|}~йцукенгшщзхфывапролджэячсмитьбюЙЦУКЕНГШЩЗХФЫВАПРОЛДЖЯЧСМИТЬБЮЭ";
    const texture_loader = new TextureLoader();
    const audio_loader = new AudioLoader();
    const scenes: { [path: string]: SceneInfo } = {};
    const audios: { [name: string]: AudioBuffer } = {};
    const atlases: { [name: string]: AssetData<TextureData> } = { '': {} };
    const fonts: { [name: string]: string } = {};
    const layers: string[] = ['default'];
    const tilemap_paths: TDictionary<string> = {};
    const tilemap_info: TDictionary<TDictionary<string>> = {};
    const vertex_programs: { [path: string]: string } = {};
    const fragment_programs: { [path: string]: string } = {};
    const materials: { [name: string]: MaterialInfo } = {};
    const models: { [name: string]: Object3D } = {};
    const animations: AnimationInfo[] = [];
    const manager = new LoadingManager();
    let bad_texture: CanvasTexture;
    let project_path = '';

    function init() {
        gen_textures();
        subscribe();
    }

    function subscribe() {
        EventBus.on('SERVER_FILE_SYSTEM_EVENTS', async (e) => {
            for (const event of e.events) {
                await on_file_change(event);
            }
        });
    }

    async function on_file_change(event: FSEvent) {
        switch (event.ext) {
            case 'vp': await on_vertex_shader_change(event.path); break;
            case 'fp': await on_fragment_shader_change(event.path); break;
            case 'mtr': await on_material_file_change(event.path); break;
        }
    }

    async function on_vertex_shader_change(path: string) {
        const vertexShader = await AssetControl.get_file_data(path);
        if (!vertexShader) return;

        vertex_programs[path] = vertexShader;

        // NOTE: изменяем оригинальные материалы и копии
        for (const material_info of Object.values(materials)) {
            if (material_info.vertexShader == '/' + path) {
                const origin = get_material_by_hash(material_info.name, material_info.origin);
                if (!origin) continue;

                origin.vertexShader = vertexShader;
                origin.needsUpdate = true;

                Object.keys(material_info.instances).filter((hash) => hash != material_info.origin).forEach((hash) => {
                    const copy = get_material_by_hash(material_info.name, hash);
                    if (!copy) return;

                    copy.vertexShader = vertexShader;
                    copy.needsUpdate = true;
                });
            }
        }
    }

    async function on_fragment_shader_change(path: string) {
        const fragmentShader = await AssetControl.get_file_data(path);
        if (!fragmentShader) return;

        fragment_programs[path] = fragmentShader;

        // NOTE: изменяем оригинальные материалы и копии
        for (const material_info of Object.values(materials)) {
            if (material_info.fragmentShader == '/' + path) {
                const origin = get_material_by_hash(material_info.name, material_info.origin);
                if (!origin) continue;

                origin.fragmentShader = fragmentShader;
                origin.needsUpdate = true;

                Object.keys(material_info.instances).filter((hash) => hash != material_info.origin).forEach((hash) => {
                    const copy = get_material_by_hash(material_info.name, hash);
                    if (!copy) return;

                    copy.fragmentShader = fragmentShader;
                    copy.needsUpdate = true;
                });
            }
        }
    }


    async function on_material_file_change(path: string) {
        const changed_material_info = await load_material(path);
        if (!changed_material_info) return;

        const changed_origin = changed_material_info.instances[changed_material_info.origin];
        if (!changed_origin) return;

        const material_name = get_file_name(path);
        const material_info = get_material_info(material_name);
        if (!material_info) return;

        const origin = get_material_by_hash(material_info.name, material_info.origin);
        if (!origin) return;

        // NOTE: обновляем шейдеры
        if (material_info.vertexShader != changed_material_info.vertexShader) {
            material_info.vertexShader = changed_material_info.vertexShader;
            await on_vertex_shader_change(changed_material_info.vertexShader);
        }

        if (material_info.fragmentShader != changed_material_info.fragmentShader) {
            material_info.fragmentShader = changed_material_info.fragmentShader;
            await on_fragment_shader_change(changed_material_info.fragmentShader);
        }

        // NOTE: обновляем прозрачность
        if (origin.transparent != changed_origin.transparent) {
            origin.transparent = changed_origin.transparent;

            // Update transparency in all copies if they match old value
            Object.keys(material_info.instances).filter((hash) => hash != material_info.origin).forEach((hash) => {
                const copy = get_material_by_hash(material_info.name, hash);
                if (!copy) return;

                copy.transparent = changed_origin.transparent;
            });
        }

        // NOTE: обновляем или добавляем новые юниформы если они не существуют
        for (const [key, uniform] of Object.entries(changed_material_info.uniforms)) {
            const undefined_uniform = material_info.uniforms[key] == undefined;
            if (undefined_uniform || material_info.uniforms[key] != uniform) {
                material_info.uniforms[key] = { ...uniform };
                origin.uniforms[key] = changed_origin.uniforms[key];

                // NOTE/TODO: возможно здесь тоже нужно будет перезаписывать hash и переорганизовывать копии, так как может быть кейс при котором в юниформе оригинального материала обновилось значение, на то, которое есть в одной из копий, и тогда нет смысла иметь копии в которых отличается только это значение

                Object.keys(material_info.instances).filter((hash) => hash != material_info.origin).forEach((hash) => {
                    const copy = get_material_by_hash(material_info.name, hash);
                    if (!copy) return;

                    // NOTE: обновляем только те копии, которые не изменяли этот юниформ
                    const is_changed_uniform = material_info.material_hash_to_changed_uniforms[hash].includes(key);
                    if (undefined_uniform || !is_changed_uniform) {
                        copy.uniforms[key] = changed_origin.uniforms[key];
                    }
                });
            }
        }

        // NOTE: удаляем юниформы если они не существуют в измененном материале
        for (const key of Object.keys(material_info.uniforms)) {
            if (!changed_material_info.uniforms[key]) {
                delete material_info.uniforms[key];
                delete origin.uniforms[key];

                Object.keys(material_info.instances).filter((hash) => hash != material_info.origin).forEach((hash) => {
                    const copy = get_material_by_hash(material_info.name, hash);
                    if (!copy) return;

                    // NOTE: проверяем будут ли в этой копии еще измененные юниформы если удалить текущую

                    const changed_uniforms = material_info.material_hash_to_changed_uniforms[hash];
                    const changed_uniform_index = changed_uniforms.indexOf(key);
                    if (changed_uniform_index == -1) {
                        Log.error('[on_material_file_change] changed_uniform_index not found', key, material_info);
                        return;
                    }

                    changed_uniforms.splice(changed_uniform_index, 1);

                    // NOTE: больше измененных юниформ нет, удаляем копию и cсылаем все подвязанные к ней меши на оригинальный материал
                    if (changed_uniforms.length == 0) {
                        delete material_info.instances[hash];
                        delete material_info.material_hash_to_changed_uniforms[hash];

                        const meshes_info = deepClone(material_info.material_hash_to_meshes_info[hash]);
                        delete material_info.material_hash_to_meshes_info[hash];

                        meshes_info.forEach((mesh_info) => {
                            material_info.material_hash_to_meshes_info[material_info.origin].push(mesh_info);
                            if (!material_info.mesh_info_to_material_hashes[mesh_info.id]) {
                                material_info.mesh_info_to_material_hashes[mesh_info.id] = [];
                            }
                            material_info.mesh_info_to_material_hashes[mesh_info.id][mesh_info.index] = material_info.origin;

                            const mesh = SceneManager.get_mesh_by_id(mesh_info.id) as Slice9Mesh;
                            if (!mesh) return;

                            mesh.set_material(material_info.name);
                        });

                        return;
                    }

                    // NOTE: перегенерируем hash и переорганизуем копии

                    const new_material = copy_material(copy);
                    delete new_material.uniforms[key];
                    const new_hash = get_material_hash(new_material);

                    // NOTE: все значения как в оригинале
                    if (material_info.origin == new_hash) {
                        delete material_info.instances[hash];
                        delete material_info.material_hash_to_changed_uniforms[hash];

                        const meshes_info = deepClone(material_info.material_hash_to_meshes_info[hash]);
                        delete material_info.material_hash_to_meshes_info[hash];

                        meshes_info.forEach((mesh_info) => {
                            material_info.material_hash_to_meshes_info[material_info.origin].push(mesh_info);
                            if (!material_info.mesh_info_to_material_hashes[mesh_info.id]) {
                                material_info.mesh_info_to_material_hashes[mesh_info.id] = [];
                            }
                            material_info.mesh_info_to_material_hashes[mesh_info.id][mesh_info.index] = material_info.origin;

                            const mesh = SceneManager.get_mesh_by_id(mesh_info.id) as Slice9Mesh;
                            if (!mesh) return;

                            mesh.set_material(material_info.name);
                        });

                        return;
                    }

                    // NOTE: копия с такими же значениями уже существует
                    if (material_info.instances[new_hash]) {
                        delete material_info.instances[hash];
                        delete material_info.material_hash_to_changed_uniforms[hash];

                        const meshes_info = deepClone(material_info.material_hash_to_meshes_info[hash]);
                        delete material_info.material_hash_to_meshes_info[hash];

                        meshes_info.forEach((mesh_info) => {
                            material_info.material_hash_to_meshes_info[new_hash].push(mesh_info);
                            if (!material_info.mesh_info_to_material_hashes[mesh_info.id]) {
                                material_info.mesh_info_to_material_hashes[mesh_info.id] = [];
                            }
                            material_info.mesh_info_to_material_hashes[mesh_info.id][mesh_info.index] = new_hash;

                            const mesh = SceneManager.get_mesh_by_id(mesh_info.id) as Slice9Mesh;
                            if (!mesh) return;

                            mesh.set_material(material_info.name);
                        });

                        return;
                    }

                    // NOTE: создаем новую копию

                    material_info.instances[new_hash] = new_material;

                    delete material_info.instances[hash];
                    delete material_info.material_hash_to_changed_uniforms[hash];

                    const meshes_info = deepClone(material_info.material_hash_to_meshes_info[hash]);
                    delete material_info.material_hash_to_meshes_info[hash];

                    meshes_info.forEach((mesh_info) => {
                        material_info.material_hash_to_meshes_info[new_hash].push(mesh_info);
                        if (!material_info.mesh_info_to_material_hashes[mesh_info.id]) {
                            material_info.mesh_info_to_material_hashes[mesh_info.id] = [];
                        }
                        material_info.mesh_info_to_material_hashes[mesh_info.id][mesh_info.index] = new_hash;

                        const mesh = SceneManager.get_mesh_by_id(mesh_info.id) as Slice9Mesh;
                        if (!mesh) return;

                        mesh.set_material(material_info.name);
                    });
                });
            }
        }
    }



    function set_project_path(path: string) {
        project_path = path;
    }

    function gen_textures() {
        var imageCanvas = document.createElement("canvas");
        var context = imageCanvas.getContext("2d")!;
        imageCanvas.width = imageCanvas.height = 128;
        context.fillStyle = "#444";
        context.fillRect(0, 0, 128, 128);
        context.fillStyle = "#fff";
        context.fillRect(0, 0, 64, 64);
        context.fillRect(64, 64, 64, 64);
        var textureCanvas = new CanvasTexture(imageCanvas);
        textureCanvas.wrapS = RepeatWrapping;
        textureCanvas.wrapT = RepeatWrapping;
        (textureCanvas as any).system = true;
        bad_texture = textureCanvas;
    }

    function has_texture_name(name: string, atlas = '') {
        if (!has_atlas(atlas)) return false;
        return (atlases[atlas][name] != undefined);
    }

    async function load_texture(path: string) {
        path = project_path + path;
        const texture = await texture_loader.loadAsync(path);
        // TODO: лучше добавить в Texture.userData
        (texture as any).path = path;
        return texture;
    }

    async function preload_audio(path: string) {
        path = project_path + path;
        console.log('preload_audio', path);
        const audio_buffer = await audio_loader.loadAsync(path);
        audios[get_file_name(path)] = audio_buffer;
    }

    function get_all_sounds() {
        return Object.keys(audios);
    }

    function get_sound_buffer(name: string) {
        return audios[name];
    }

    async function preload_scene(path: string) {
        const response = await AssetControl.get_file_data(path);
        if (!response) {
            return;
        }

        const data = JSON.parse(response) as TDictionary<IBaseEntityData[]>;
        if (data.scene_data.length > 0)
            cache_scene(path, data.scene_data[0]);
    }

    function cache_scene(path: string, data: IBaseEntityData) {
        if (data.children != undefined) {
            for (const obj of data.children) {
                if (["sprite", "text", "lable"].includes(obj.type))
                    continue;
                scenes[path] = { is_component: false, data };
                return;
            }
        }
        scenes[path] = { is_component: true, data };
    }

    function get_scene_info(path: string) {
        return scenes[path];
    }

    async function preload_texture(path: string, atlas = '', override = false) {
        const name = get_file_name(path);
        if (!override && has_texture_name(name, atlas)) {
            Log.warn('texture exists', name, atlas);
            return atlases[atlas][name].data;
        }
        const texture = await load_texture(path);
        if (!has_atlas(atlas)) {
            add_atlas(atlas);
        }
        if (atlases[atlas][name]) {
            Log.warn('texture exists already', name, atlas);
        }
        atlases[atlas][name] = {
            data: {
                texture,
                uvOffset: new Vector2(0, 0),
                uv12: new Vector4(0, 1, 1, 0),
                uvScale: new Vector2(1, 1),
                size: new Vector2(texture.image.width, texture.image.height)
            }
        };

        return atlases[atlas][name].data;
    }

    function add_texture(path: string, atlas = '', texture: Texture, override = false) {
        const name = get_file_name(path);
        if (!override && has_texture_name(name, atlas)) {
            Log.warn('Texture already exists', name, atlas);
            return atlases[atlas][name].data;
        }

        if (!has_atlas(atlas)) {
            add_atlas(atlas);
        }

        if (atlases[atlas][name]) {
            Log.warn('Texture already exists', name, atlas);
        }

        atlases[atlas][name] = {
            data: {
                texture,
                uvOffset: new Vector2(0, 0),
                uv12: new Vector4(0, 1, 1, 0),
                uvScale: new Vector2(1, 1),
                size: new Vector2(texture.image.width, texture.image.height)
            }
        };
        (texture as any).path = path;

        return atlases[atlas][name].data;
    }

    async function preload_atlas(atlas_path: string, texture_path: string, override = false) {
        const name = get_file_name(atlas_path);
        if (!override && atlases[name]) {
            Log.warn('atlas exists', name);
            const textures = Object.values(atlases[name]);
            if (textures[0]) {
                return textures[0].data.texture;
            }
        }

        const data = await (await fetch(project_path + atlas_path)).text();
        const texture = await load_texture(texture_path);
        const texture_data = parse_tp_data_to_uv(data, texture.image.width, texture.image.height);

        if (!has_atlas(name)) {
            add_atlas(name);
        }

        for (const texture_name in texture_data) {
            const tex_data = texture_data[texture_name];
            atlases[name][texture_name] = {
                data: {
                    texture,
                    size: new Vector2(texture.image.width * tex_data.uvScale[0], texture.image.width * tex_data.uvScale[1]),
                    uvOffset: new Vector2(tex_data.uvOffset[0], tex_data.uvOffset[1]),
                    uv12: new Vector4(tex_data.uv12[0], tex_data.uv12[1], tex_data.uv12[2], tex_data.uv12[3]),
                    uvScale: new Vector2(tex_data.uvScale[0], tex_data.uvScale[1])
                }
            };
        }
        //log('Atlas preloaded:', atlas_path);
        return texture;
    }

    async function preload_font(path: string, override = false) {
        path = project_path + path;
        const name = get_file_name(path);
        if (!override && fonts[name]) {
            Log.warn('font exists', name, path);
            return true;
        }
        return new Promise<boolean>((resolve, _reject) => {
            preloadFont({
                font: path,
                characters: font_characters
            }, () => {
                if (fonts[name])
                    Log.warn('font exists already', name, path);
                fonts[name] = path;
                //log('Font preloaded:', path);
                resolve(true);
            });
        })
    }

    function has_vertex_program(path: string) {
        return vertex_programs[path] != undefined;
    }

    function get_vertex_program(path: string) {
        const vertex_program = vertex_programs[path];
        if (!vertex_program) {
            Log.error('vertex program not found', path);
            return;
        }
        return vertex_program;
    }

    async function preload_vertex_program(path: string) {
        if (has_vertex_program(path)) {
            Log.warn('vertex program exists', path);
            return;
        }
        const shader_program = await AssetControl.get_file_data(path);
        if (!shader_program) {
            return;
        }
        vertex_programs[path] = shader_program;
        return shader_program;
    }

    function has_fragment_program(path: string) {
        return fragment_programs[path] != undefined;
    }

    function get_fragment_program(path: string) {
        const fragment_program = fragment_programs[path];
        if (!fragment_program) {
            Log.error('fragment program not found', path);
            return;
        }
        return fragment_program;
    }

    async function preload_fragment_program(path: string) {
        if (has_fragment_program(path)) {
            Log.warn('fragment program exists', path);
            return;
        }
        const shader_program = await AssetControl.get_file_data(path);
        if (!shader_program) {
            return;
        }
        fragment_programs[path] = shader_program;
        return shader_program;
    }

    async function load_material(path: string) {
        const response = await AssetControl.get_file_data(path);
        if (!response) {
            return;
        }

        const data = JSON.parse(response);
        const material_info = {} as MaterialInfo;
        const name = get_file_name(path);

        material_info.name = name;
        material_info.path = path;
        material_info.vertexShader = data.vertexShader;
        material_info.fragmentShader = data.fragmentShader;
        material_info.uniforms = {};
        material_info.instances = {};
        material_info.mesh_info_to_material_hashes = {};
        material_info.material_hash_to_meshes_info = {};
        material_info.material_hash_to_changed_uniforms = {};

        const material = new ShaderMaterial();
        material.name = material_info.name;

        const vertexShader = get_vertex_program(data.vertexShader);
        material.vertexShader = (vertexShader) ? vertexShader : shader.vertexShader;

        const fragmentShader = get_fragment_program(data.fragmentShader)
        material.fragmentShader = (fragmentShader) ? fragmentShader : shader.fragmentShader;

        material.transparent = data.transparent;

        Object.keys(data.uniforms).forEach((key) => {
            material_info.uniforms[key] = {
                type: data.uniforms[key].type,
                params: { ...data.uniforms[key].params },
                readonly: data.uniforms[key].readonly,
                hide: data.uniforms[key].hide
            };
            switch (data.uniforms[key].type) {
                case MaterialUniformType.SAMPLER2D:
                    const texture_name = get_file_name(data.data[key] || '');
                    const atlas = get_atlas_by_texture_name(texture_name);
                    const texture_data = get_texture(texture_name, atlas || '');
                    const result = { value: texture_data.texture } as IUniform<Texture>;
                    material.uniforms[key] = result;
                    break;
                case MaterialUniformType.VEC2:
                    material.uniforms[key] = { value: new Vector2(...data.data[key]) } as IUniform<Vector2>;
                    break;
                case MaterialUniformType.VEC3:
                    material.uniforms[key] = { value: new Vector3(...data.data[key]) } as IUniform<Vector3>;
                    break;
                case MaterialUniformType.VEC4:
                    material.uniforms[key] = { value: new Vector4(...data.data[key]) } as IUniform<Vector4>;
                    break;
                case MaterialUniformType.COLOR:
                    material.uniforms[key] = { value: hexToRGB(data.data[key]) } as IUniform<Vector3>;
                    break;
                default:
                    material.uniforms[key] = { value: data.data[key] };
                    break;
            }
        });

        // NOTE: без вызова get_material_hash потому что еще пока не создан material_info
        // TODO: потенциальная проблема, общую логику нужно вынести в отдельную функцию
        const not_readonly_uniforms: { [uniform: string]: IUniform<any> } = {};
        Object.entries(material.uniforms).forEach(([key, uniform]) => {
            if (material_info.uniforms[key].readonly) {
                return;
            }
            not_readonly_uniforms[key] = uniform;
        });

        material_info.origin = getObjectHash({
            uniforms: not_readonly_uniforms,
            defines: material.defines,
            depthTest: material.depthTest,
            stencilWrite: material.stencilWrite,
            stencilRef: material.stencilRef,
            stencilFunc: material.stencilFunc,
            stencilZPass: material.stencilZPass,
            colorWrite: material.colorWrite,
        });

        material_info.instances[material_info.origin] = material;
        material_info.material_hash_to_meshes_info[material_info.origin] = [];

        return material_info;
    }

    async function preload_material(path: string) {
        let name = get_file_name(path);
        if (has_material(name)) {
            Log.warn('Material already exists', name, path);
            return materials[name];
        }

        const material = await load_material(path);
        if (!material) return;

        materials[name] = material;
        return material;
    }

    function get_material_info(name: string) {
        const material_info = materials[name];
        if (!material_info) {
            Log.error('Material info not found', name, materials);
            return null;
        }
        return material_info;
    }

    function is_material_origin_hash(material_name: string, hash: string) {
        const material_info = get_material_info(material_name);
        if (!material_info) return false;
        return material_info.origin == hash;
    }

    function get_material_by_hash(material_name: string, hash: string) {
        const material_info = get_material_info(material_name);
        if (!material_info) return null;
        const material = material_info.instances[hash];
        if (!material) {
            Log.error('Material by hash not found', hash, material_info);
            return null;
        }
        return material;
    }

    function get_material_hash_by_mesh_id(material_name: string, mesh_id: number, index = 0) {
        const material_info = get_material_info(material_name);
        if (!material_info) return null;
        const hash = material_info.mesh_info_to_material_hashes[mesh_id][index];
        if (!hash) {
            Log.error('Material hash by mesh id not found', mesh_id, index, material_info);
            return null;
        }
        return hash;
    }

    function has_material_by_mesh_id(material_name: string, mesh_id: number, index = 0) {
        const material_info = get_material_info(material_name);
        if (!material_info || !material_info.mesh_info_to_material_hashes[mesh_id]) return false;
        return material_info.mesh_info_to_material_hashes[mesh_id][index] != undefined;
    }

    function get_material_by_mesh_id(material_name: string, mesh_id: number, index = 0) {
        const material_info = get_material_info(material_name);
        if (!material_info) return null;
        const hashes = material_info.mesh_info_to_material_hashes[mesh_id];
        // NOTE: если hash не найден, то устанавливаем hash в origin и возвращаем оригинальный материал
        if (!hashes || !hashes[index]) {
            if (!material_info.mesh_info_to_material_hashes[mesh_id]) {
                material_info.mesh_info_to_material_hashes[mesh_id] = [];
            }
            material_info.mesh_info_to_material_hashes[mesh_id][index] = material_info.origin;
            material_info.material_hash_to_meshes_info[material_info.origin].push({ id: mesh_id, index });
            return get_material_by_hash(material_name, material_info.origin);
        }
        return get_material_by_hash(material_name, hashes[index]);
    }

    function set_to_origin(material_info: MaterialInfo, mesh_id: number, index: number, hash: string) {
        const mesh_info_index = material_info.material_hash_to_meshes_info[hash].findIndex((mesh_info) => {
            return mesh_info.id == mesh_id && mesh_info.index == index;
        });
        if (mesh_info_index != -1) {
            material_info.material_hash_to_meshes_info[hash].splice(mesh_info_index, 1);
            if (material_info.material_hash_to_meshes_info[hash].length == 0 && hash != material_info.origin) {
                // NOTE: если нет мешей которые используют этот материал, то удаляем материал
                delete_material_instance(material_info, hash);
            }
        } else {
            Log.error('Mesh id not found in material_hash_to_mesh_id', mesh_id, material_info);
        }
        if (!material_info.mesh_info_to_material_hashes[mesh_id]) {
            material_info.mesh_info_to_material_hashes[mesh_id] = [];
        }
        material_info.mesh_info_to_material_hashes[mesh_id][index] = material_info.origin;
        material_info.material_hash_to_meshes_info[material_info.origin].push({ id: mesh_id, index });
    }

    function set_to_existing_copy(material_info: MaterialInfo, mesh_id: number, index: number, new_hash: string, hash: string) {
        const mesh_info_index_new_hash = material_info.material_hash_to_meshes_info[new_hash].findIndex((mesh_info) => {
            return mesh_info.id == mesh_id && mesh_info.index == index;
        });
        if (mesh_info_index_new_hash != -1) return;

        material_info.material_hash_to_meshes_info[new_hash].push({ id: mesh_id, index });

        if (!material_info.mesh_info_to_material_hashes[mesh_id]) {
            material_info.mesh_info_to_material_hashes[mesh_id] = [];
        }
        material_info.mesh_info_to_material_hashes[mesh_id][index] = new_hash;

        const prev_changed_uniforms = material_info.material_hash_to_changed_uniforms[new_hash];
        prev_changed_uniforms.forEach((uniform) => {
            if (!material_info.material_hash_to_changed_uniforms[new_hash].includes(uniform)) {
                material_info.material_hash_to_changed_uniforms[new_hash].push(uniform);
            }
        });

        const mesh_info_index = material_info.material_hash_to_meshes_info[hash].findIndex((mesh_info) => {
            return mesh_info.id == mesh_id && mesh_info.index == index;
        });
        if (mesh_info_index != -1) {
            material_info.material_hash_to_meshes_info[hash].splice(mesh_info_index, 1);
            if (material_info.material_hash_to_meshes_info[hash].length == 0 && hash != material_info.origin && new_hash != hash) {
                // NOTE: если нет мешей которые используют этот материал, то удаляем материал
                delete_material_instance(material_info, hash);
            }
        } else {
            Log.error('Mesh id not found in material_hash_to_mesh_id', mesh_id, material_info);
        }
    }

    function set_to_new_copy(material_info: MaterialInfo, mesh_id: number, index: number, hash: string, new_hash: string, copy: ShaderMaterial) {
        material_info.instances[new_hash] = copy;

        if (!material_info.mesh_info_to_material_hashes[mesh_id]) {
            material_info.mesh_info_to_material_hashes[mesh_id] = [];
        }
        material_info.mesh_info_to_material_hashes[mesh_id][index] = new_hash;

        material_info.material_hash_to_meshes_info[new_hash] = [];
        material_info.material_hash_to_meshes_info[new_hash].push({ id: mesh_id, index });

        const copy_prev_changed_uniforms = deepClone(material_info.material_hash_to_changed_uniforms[hash] || []);
        material_info.material_hash_to_changed_uniforms[new_hash] = copy_prev_changed_uniforms;

        const mesh_info_index = material_info.material_hash_to_meshes_info[hash].findIndex((mesh_info) => {
            return mesh_info.id == mesh_id && mesh_info.index == index;
        });
        if (mesh_info_index != -1) {
            material_info.material_hash_to_meshes_info[hash].splice(mesh_info_index, 1);
            if (material_info.material_hash_to_meshes_info[hash].length == 0 && hash != material_info.origin) {
                // NOTE: если нет мешей которые используют этот материал, то удаляем материал
                delete_material_instance(material_info, hash);
            }
        } else {
            Log.error('Mesh id not found in material_hash_to_mesh_id', mesh_id, material_info);
        }
    }

    function delete_material_instance(material_info: MaterialInfo, hash: string) {
        delete material_info.material_hash_to_changed_uniforms[hash];
        delete material_info.material_hash_to_meshes_info[hash];
        delete material_info.instances[hash];
    }

    function set_material_property_for_mesh(mesh: Slice9Mesh, property_name: string, value: any) {
        const mesh_id = mesh.mesh_data.id;
        const material_name = mesh.material.name;

        const material_info = get_material_info(material_name);
        if (!material_info) return;

        if (set_material_property(material_info, mesh_id, 0, property_name, value)) {
            mesh.set_material(material_info.name);
        }
    }

    function set_material_property(material_info: MaterialInfo, mesh_id: number, index: number, property_name: string, value: any) {
        const hash = get_material_hash_by_mesh_id(material_info.name, mesh_id, index);
        if (!hash) {
            return false;
        }

        const material = material_info.instances[hash];
        if (!material) {
            return false;
        }

        (material as any)[property_name] = value;

        const new_hash = get_material_hash(material);

        if (new_hash == hash) {
            return false;
        }

        if (material_info.instances[new_hash]) {
            set_to_existing_copy(material_info, mesh_id, index, hash, new_hash);
            return true;
        }

        const copy = copy_material(material);
        (copy as any)[property_name] = value;
        set_to_new_copy(material_info, mesh_id, index, hash, new_hash, copy);
        return true;
    }

    async function set_material_uniform_for_original<T>(material_name: string, uniform_name: string, value: T, is_save = true) {
        const material_info = get_material_info(material_name);
        if (!material_info) return;

        const material = material_info.instances[material_info.origin];
        if (!material) return;

        if (material.uniforms[uniform_name] == undefined) return;

        material.uniforms[uniform_name].value = value;

        const is_readonly = material_info.uniforms[uniform_name].readonly;

        if (!is_readonly) {
            // NOTE: обновляем hash оригинального материала
            const new_origin_hash = get_material_hash(material);
            if (new_origin_hash != material_info.origin) {
                material_info.instances[new_origin_hash] = material;
                delete material_info.instances[material_info.origin];

                material_info.material_hash_to_meshes_info[material_info.origin].forEach((mesh_info) => {
                    if (!material_info.mesh_info_to_material_hashes[mesh_info.id]) {
                        material_info.mesh_info_to_material_hashes[mesh_info.id] = [];
                    }
                    material_info.mesh_info_to_material_hashes[mesh_info.id][mesh_info.index] = new_origin_hash;
                });

                const mesh_ids = material_info.material_hash_to_meshes_info[material_info.origin];
                material_info.material_hash_to_meshes_info[new_origin_hash] = deepClone(mesh_ids);

                delete material_info.material_hash_to_meshes_info[material_info.origin];

                material_info.origin = new_origin_hash;
            }
        }

        // NOTE: проходимся по всем копиям материала
        Object.keys(material_info.instances).filter((hash) => hash != material_info.origin).forEach((hash) => {
            const copy = get_material_by_hash(material_info.name, hash);
            if (!copy) return;

            // NOTE: обновляем только те копии, которые не изменяли этот юниформ
            const is_changed_uniform = material_info.material_hash_to_changed_uniforms[hash].includes(uniform_name);
            if (!is_changed_uniform) {
                copy.uniforms[uniform_name] = material.uniforms[uniform_name];

                if (!is_readonly) {
                    // NOTE: обновляем hash в копии материала
                    const new_hash = get_material_hash(copy);
                    if (new_hash != hash) {
                        material_info.instances[new_hash] = copy;
                        delete material_info.instances[hash];

                        material_info.material_hash_to_meshes_info[hash].forEach((mesh_info) => {
                            if (!material_info.mesh_info_to_material_hashes[mesh_info.id]) {
                                material_info.mesh_info_to_material_hashes[mesh_info.id] = [];
                            }
                            material_info.mesh_info_to_material_hashes[mesh_info.id][mesh_info.index] = new_hash;
                        });

                        const mesh_ids = material_info.material_hash_to_meshes_info[hash];
                        material_info.material_hash_to_meshes_info[new_hash] = deepClone(mesh_ids);

                        delete material_info.material_hash_to_meshes_info[hash];

                        const changed_uniforms = material_info.material_hash_to_changed_uniforms[hash];
                        material_info.material_hash_to_changed_uniforms[new_hash] = deepClone(changed_uniforms);

                        delete material_info.material_hash_to_changed_uniforms[hash];
                    }
                }
            }
        });

        if (is_save && !is_readonly) {
            // NOTE: обновляем значение в файле
            const response = await AssetControl.get_file_data(material_info.path);
            if (!response) return;

            const material_data = JSON.parse(response);

            // NOTE: в случае если юниформа это текстура, то составляем строку атлас/текстура
            if (value instanceof Texture) {
                const texture_name = get_file_name((value as any).path || '');
                const atlas = get_atlas_by_texture_name(texture_name) || '';
                material_data.data[uniform_name] = `${atlas}/${texture_name}`;
            } else if (material_data.uniforms[uniform_name].type == MaterialUniformType.COLOR) {
                material_data.data[uniform_name] = rgbToHex(value as Vector3);
            } else {
                material_data.data[uniform_name] = value;
            }

            await AssetControl.save_file_data(material_info.path, JSON.stringify(material_data, null, 2));
            // TODO: нужно сделать так чтобы не обновляли повторно, после того как файл запишеться
        }
    }

    function set_material_uniform_for_mesh<T>(mesh: Slice9Mesh, uniform_name: string, value: T) {
        const mesh_id = mesh.mesh_data.id;
        const material_name = mesh.material.name;

        const material_info = get_material_info(material_name);
        if (!material_info) return;

        if (set_material_uniform(material_info, mesh_id, 0, uniform_name, value)) {
            mesh.set_material(material_info.name);
        }
    }

    function set_material_uniform_for_multiple_material_mesh<T>(mesh: MultipleMaterialMesh, index: number, uniform_name: string, value: T) {
        const materials = mesh.get_materials();
        if (materials.length < index) {
            Log.error('[set_material_uniform_for_multiple_material_mesh] Material index out of range:', index);
            return;
        }

        const material_name = materials[index].name;
        const material_info = get_material_info(material_name);
        if (!material_info) return;

        if (set_material_uniform(material_info, mesh.mesh_data.id, index, uniform_name, value)) {
            mesh.set_material(material_info.name, index);
        }
    }

    // TODO: как вызывать установку материала для меша, и при этом для анимационого меша еще нужен index
    function set_material_uniform<T>(material_info: MaterialInfo, mesh_id: number, index: number, uniform_name: string, value: T) {
        const uniform = material_info.uniforms[uniform_name];
        if (!uniform) {
            Log.error('Uniform not found', uniform_name, material_info.name);
            return false;
        }

        if (uniform.readonly) {
            Log.error('Uniform is readonly', uniform_name, material_info.name);
            return false;
        }

        const mesh_material = get_material_by_mesh_id(material_info.name, mesh_id);
        if (!mesh_material) return false;

        const hash = material_info.mesh_info_to_material_hashes[mesh_id][index];

        const mesh_material_copy = copy_material(mesh_material);
        mesh_material_copy.uniforms[uniform_name].value = value;

        const new_hash = get_material_hash(mesh_material_copy);

        if (material_info.origin == new_hash) {
            set_to_origin(material_info, mesh_id, index, hash);
            return true;
        }

        // NOTE: проверяем, существует ли копия материала с таким hash
        if (material_info.instances[new_hash]) {
            set_to_existing_copy(material_info, mesh_id, index, new_hash, hash);
            return true;
        }

        // NOTE: создаем новую копию
        set_to_new_copy(material_info, mesh_id, index, hash, new_hash, mesh_material_copy);

        if (!material_info.material_hash_to_changed_uniforms[new_hash].includes(uniform_name)) {
            material_info.material_hash_to_changed_uniforms[new_hash].push(uniform_name);
        }

        return true;
    }

    function set_material_define_for_mesh<T>(mesh: Slice9Mesh, define_name: string, value?: T) {
        const mesh_id = mesh.mesh_data.id;
        const material_name = mesh.material.name;
        const material_info = get_material_info(material_name);
        if (!material_info) return;

        if (set_material_define(material_info, mesh_id, 0, define_name, value)) {
            mesh.set_material(material_info.name);
        }
    }

    function set_material_define_for_multiple_material_mesh<T>(mesh: MultipleMaterialMesh, index: number, define_name: string, value?: T) {
        const mesh_id = mesh.mesh_data.id;
        const material_name = mesh.get_materials()[index].name;
        const material_info = get_material_info(material_name);
        if (!material_info) return;

        if (set_material_define(material_info, mesh_id, index, define_name, value)) {
            mesh.set_material(material_info.name, index);
        }
    }

    function set_material_define<T>(material_info: MaterialInfo, mesh_id: number, index: number, define_name: string, value?: T) {
        const mesh_material = get_material_by_mesh_id(material_info.name, mesh_id, index);
        if (!mesh_material) return false;

        const hash = material_info.mesh_info_to_material_hashes[mesh_id][index];

        const material_copy = copy_material(mesh_material);

        if (value != undefined) {
            if (material_copy.defines == undefined) {
                material_copy.defines = {};
            }
            material_copy.defines[define_name] = value;
        } else {
            if (material_copy.defines && material_copy.defines[define_name] != undefined) {
                delete material_copy.defines[define_name];
            }
        }

        const new_hash = get_material_hash(material_copy);

        if (material_info.origin == new_hash) {
            set_to_origin(material_info, mesh_id, index, hash);
            // mesh.set_material(material_name, index);
            return true;
        }

        // NOTE: проверяем, существует ли копия материала с таким hash
        if (material_info.instances[new_hash]) {
            set_to_existing_copy(material_info, mesh_id, index, new_hash, hash);
            // mesh.set_material(material_info.name, index);
            return true;
        }

        // NOTE: создаем новую копию
        set_to_new_copy(material_info, mesh_id, index, hash, new_hash, material_copy);

        return true;

        // mesh.set_material(material_info.name, index);
    }

    function unlink_material_for_mesh(material_name: string, mesh_id: number) {
        const material_info = get_material_info(material_name);
        if (!material_info) return;

        unlink_material(material_info, mesh_id, 0);
    }

    function unlink_material_for_multiple_material_mesh(material_name: string, mesh_id: number, index: number) {
        const material_info = get_material_info(material_name);
        if (!material_info) return;

        unlink_material(material_info, mesh_id, index);
    }

    function unlink_material(material_info: MaterialInfo, mesh_id: number, index: number) {
        const hash = material_info.mesh_info_to_material_hashes[mesh_id][index];
        const mesh_info_index = material_info.material_hash_to_meshes_info[hash].findIndex((mesh_info) => {
            return mesh_info.id == mesh_id && mesh_info.index == index;
        });
        if (mesh_info_index != -1) {
            material_info.material_hash_to_meshes_info[hash].splice(mesh_info_index, 1);
            if (material_info.material_hash_to_meshes_info[hash].length == 0 && hash != material_info.origin) {
                delete material_info.material_hash_to_changed_uniforms[hash];
                delete material_info.material_hash_to_meshes_info[hash];
                delete material_info.instances[hash];
            }
        } else {
            Log.error('Mesh id not found in material_hash_to_mesh_id', mesh_id, material_info);
        }
        material_info.mesh_info_to_material_hashes[mesh_id].splice(index, 1);
        if (material_info.mesh_info_to_material_hashes[mesh_id].length == 0) {
            delete material_info.mesh_info_to_material_hashes[mesh_id];
        }
    }

    function get_info_about_unique_materials() {
        const unique_materials: { [key: string]: { origin: string, copies: string[] } } = {};
        for (const material_name in materials) {
            const material_info = get_material_info(material_name);
            if (material_info) {
                unique_materials[material_name] = {
                    origin: material_info.origin,
                    copies: []
                };
                for (const hash in material_info.instances) {
                    if (hash == material_info.origin) continue;
                    unique_materials[material_name].copies.push(hash);
                }
            }
        }
        return unique_materials;
    }

    function get_changed_uniforms_for_mesh(mesh: Slice9Mesh) {
        const mesh_id = mesh.mesh_data.id;
        const material_name = mesh.material.name;
        const material_info = get_material_info(material_name);
        if (!material_info) return;
        return get_changed_uniforms(material_info, mesh_id, 0);
    }

    function get_changed_uniforms_for_multiple_material_mesh(mesh: MultipleMaterialMesh, index: number) {
        const mesh_id = mesh.mesh_data.id;
        const material_name = mesh.get_materials()[index].name;
        const material_info = get_material_info(material_name);
        if (!material_info) return;
        return get_changed_uniforms(material_info, mesh_id, index);
    }

    function get_changed_uniforms(material_info: MaterialInfo, mesh_id: number, index: number) {
        const hash = material_info.mesh_info_to_material_hashes[mesh_id][index];
        const changed_uniforms = material_info.material_hash_to_changed_uniforms[hash];
        const changed_uniforms_data: { [key: string]: any } = {};
        for (const uniform_name of changed_uniforms) {
            const value = material_info.instances[hash].uniforms[uniform_name].value;
            changed_uniforms_data[uniform_name] = value;
        }
        return changed_uniforms_data;
    }

    function get_all_fonts() {
        return fonts;
    }

    function get_all_vertex_programs() {
        return Object.keys(vertex_programs);
    }

    function get_all_fragment_programs() {
        return Object.keys(fragment_programs);
    }

    function get_all_models() {
        return Object.keys(models);
    }

    function get_all_model_animations(model_name: string) {
        return animations.filter((animation) => animation.model == model_name).map((animation) => animation.animation);
    }

    function get_font(name: string) {
        return fonts[name];
    }

    function get_texture(name: string, atlas = ''): TextureData {
        if (!has_texture_name(name, atlas)) {
            if (name != '') {
                Log.error('Texture not found', name, atlas);
            }
            return {
                texture: bad_texture,
                size: new Vector2(128, 128),
                uvOffset: new Vector2(0, 0),
                uv12: new Vector4(0, 1, 1, 0),
                uvScale: new Vector2(1, 1)
            };
        };
        return atlases[atlas][name].data;
    }

    function get_atlas(name: string) {
        if (!atlases[name])
            return null;
        const values = Object.values(atlases[name]);
        return values[0].data.texture;
    }

    function get_all_atlases() {
        return Object.keys(atlases);
    }

    function get_atlas_by_texture_name(texture_name: string): string | null {
        if (texture_name == '') {
            return '';
        }

        for (const [atlas_name, textures] of Object.entries(atlases)) {
            if (textures[texture_name]) {
                return atlas_name;
            }
        }

        Log.error('Atlas not found', texture_name);
        return null;
    }

    function add_atlas(name: string) {
        if (has_atlas(name)) {
            Log.warn(`Atlas ${name} already exist!`)
        }

        atlases[name] = {};
    }

    function has_atlas(name: string) {
        return atlases[name] != undefined;
    }

    function del_atlas(name: string) {
        if (!atlases[name]) {
            Log.warn(`Atlas ${name} not found!`);
        }

        if (!has_atlas('')) {
            add_atlas('');
        }

        const textures = atlases[name];
        Object.entries(textures).forEach(([texture, data]) => {
            atlases[''][texture] = data;
        });

        delete atlases[name];
    }

    function get_all_textures() {
        const list: TextureInfo[] = [];
        for (const k in atlases) {
            for (const k2 in atlases[k]) {
                const asset = atlases[k][k2];
                list.push({ name: k2, atlas: k, data: asset.data });
            }
        }
        return list;
    }

    function get_all_materials() {
        return Object.keys(materials);
    }

    function has_material(name: string) {
        return materials[name] != undefined;
    }

    function find_animation(name_anim: string, model_name: string) {
        const list_anim = [];
        for (const k in animations) {
            if (animations[k].animation == name_anim)
                list_anim.push(animations[k]);
        }
        if (list_anim.length) {
            if (list_anim.length > 1)
                Log.warn('animation more 1:', list_anim, name_anim, model_name);
            for (let i = 0; i < list_anim.length; i++) {
                const it = list_anim[i];
                if (it.model == model_name)
                    return it;
            }
            return list_anim[0];
        }
        return null;
    }

    function has_skinned_mesh(mesh: Object3D) {
        let is_model = false;
        mesh.traverse((m) => {
            if (m instanceof SkinnedMesh)
                is_model = true;
        });
        return is_model;
    }

    function add_animations(anim_list: AnimationClip[], model_path = '') {
        if (anim_list.length) {
            const file_name = get_file_name(model_path);
            let model_name = get_model_name(model_path);
            let anim_name = file_name;
            if (file_name.indexOf('@') > -1) {
                anim_name = file_name.substring(file_name.indexOf('@') + 1);
            }
            for (let i = 0; i < anim_list.length; i++) {
                const clip = anim_list[i];
                let cur_anim_name = anim_name;
                if (find_animation(cur_anim_name, model_name))
                    Log.warn('animation exists already', cur_anim_name, model_name);
                animations.push({ model: model_name, animation: cur_anim_name, clip });
            }
        }
    }

    function get_model_name(path: string) {
        let model_name = get_file_name(path);
        if (model_name.indexOf('@') > -1)
            model_name = model_name.substring(0, model_name.indexOf('@'));
        return model_name;
    }

    async function preload_model(path: string) {
        path = project_path + path;
        let model_name = get_model_name(path);
        if (path.toLowerCase().endsWith('.fbx')) {
            return new Promise<Group>(async (resolve, _) => {
                const loader = new FBXLoader(manager);
                loader.load(path, (mesh) => {
                    models[model_name] = mesh;
                    add_animations(mesh.animations, path);
                    resolve(mesh);
                });
            })
        }
        else if (path.toLowerCase().endsWith('.gltf') || path.toLowerCase().endsWith('.glb')) {
            return new Promise<Group>(async (resolve, _) => {
                const loader = new GLTFLoader(manager);
                loader.load(path, (gltf) => {
                    //log(gltf)
                    const has_mesh = has_skinned_mesh(gltf.scene);
                    if (has_mesh)
                        if (has_mesh)
                            models[model_name] = gltf.scene;
                    add_animations(gltf.animations, path);
                    resolve(gltf.scene);
                });
            })
        }
        else if (path.toLowerCase().endsWith('.dae')) {
            return new Promise<Scene>(async (resolve, _) => {
                const loader = new ColladaLoader(manager);
                loader.load(path, (collada) => {
                    //log(collada)
                    const has_mesh = has_skinned_mesh(collada.scene);
                    if (has_mesh)
                        models[model_name] = collada.scene;
                    resolve(collada.scene);
                });
            })
        }
        Log.error('Model not supported', path);
        return null;
    }

    function get_model(name: string) {
        return models[name];
    }

    function get_animations_by_model(model_name: string) {
        const list: AnimationInfo[] = [];
        for (const k in animations) {
            if (animations[k].model == model_name)
                list.push(animations[k]);
        }
        return list;
    }

    async function load_asset(path: string) {
        path = project_path + path;
        return await (await fetch(path)).json();
    }

    function free_texture(name: string, atlas = '') {
        if (has_texture_name(name, atlas)) {
            const tex_data = atlases[atlas][name].data;
            delete atlases[atlas][name];
            tex_data.texture.dispose();
            log('Texture free', name, atlas);
        }
        else {
            Log.error('Texture not found', name, atlas);
        }
    }

    // NOTE: чтобы не вызывать write_metadata отдельно после каждого применения, можно сделать две функции, для одинарной перезаписи и для множественной перезаписи
    // чтобы писать в metadata сразу же здесь
    // Но при этом обязательно нужна будет пометка что функцию для одинарной перезаписи нельзя использовать паралельно
    // для таких случаев нужно будет использовать функцию для множественной перезаписи, передавая список
    // иначе будет проблема с одновременной записью в metadata!
    function override_atlas_texture(old_atlas: string, new_atlas: string, name: string) {
        if (!has_texture_name(name, old_atlas)) {
            Log.error('Texture not found', name, old_atlas);
            return;
        }

        const texture = atlases[old_atlas][name];
        delete atlases[old_atlas][name];

        if (!has_atlas(new_atlas)) {
            add_atlas(new_atlas);
        }

        atlases[new_atlas][name] = texture;
    }

    // NOTE: записываем всю информацию из ресурсов в metadata
    async function write_metadata() {
        try {
            // Write atlases metadata
            const metadata = await ClientAPI.get_info('atlases');
            if (!metadata.result) {
                if (metadata.data != undefined) {
                    throw new Error('Failed on get atlases metadata!');
                }
            }
            const metadata_atlases = {} as TRecursiveDict;
            // NOTE: для каждого атласа создаём отдельный объект в metadata_atlases
            for (const [atlas_name, textures] of Object.entries(atlases)) {
                if (!metadata_atlases[atlas_name]) {
                    metadata_atlases[atlas_name] = {} as TRecursiveDict;
                }
                const metadata_atlas = metadata_atlases[atlas_name] as TRecursiveDict;
                for (const [texture_name, texture] of Object.entries(textures)) {
                    // NOTE: записываем путь до исходника текстуры и фильтры
                    metadata_atlas[texture_name] = {
                        path: (texture.data.texture as any).path.replace(project_path, ''),
                        minFilter: texture.data.texture.minFilter,
                        magFilter: texture.data.texture.magFilter
                    };
                }
            }
            const save_result = await ClientAPI.save_info('atlases', metadata_atlases);
            if (!save_result.result) {
                throw new Error('Failed on save atlases metadata!');
            }

            // Write layers metadata
            const layers_metadata = await ClientAPI.get_info('layers');
            if (!layers_metadata.result && layers_metadata.data != undefined) {
                throw new Error('Failed on get layers metadata!');
            }
            const layers_dict: TRecursiveDict = {};
            layers.forEach((layer, index) => {
                if (index == 0) return;
                layers_dict[index.toString()] = layer;
            });
            const save_layers_result = await ClientAPI.save_info('layers', layers_dict);
            if (!save_layers_result.result) {
                throw new Error('Failed on save layers metadata!');
            }
        } catch (error) {
            Log.error('Error writing metadata:', error);
        }
    }

    // NOTE: считываем всю информацию из metadata и обновляем ресурсы
    async function update_from_metadata() {
        try {
            // Update atlases from metadata
            const metadata = await ClientAPI.get_info('atlases');
            if (!metadata.result) {
                if (metadata.data == undefined) {
                    Log.log('Update resource manager from metadata: atlases not found!');
                    return;
                }
                Log.warn('Update resource manager from metadata: failed on get atlases!');
                return;
            }
            const metadata_atlases = metadata.data as TRecursiveDict;
            for (const [atlas_name, textures] of Object.entries(metadata_atlases)) {
                if (!has_atlas(atlas_name)) {
                    add_atlas(atlas_name);
                }
                for (const [texture_name, texture_data] of Object.entries(textures)) {
                    const old_atlas = get_atlas_by_texture_name(texture_name);
                    override_atlas_texture(old_atlas || '', atlas_name, texture_name);

                    if (typeof texture_data === 'object' && texture_data !== null) {
                        const data = texture_data as { minFilter?: MinificationTextureFilter; magFilter?: MagnificationTextureFilter };
                        if (has_texture_name(texture_name, atlas_name)) {
                            const texture = atlases[atlas_name][texture_name].data.texture;
                            if (data.minFilter !== undefined) {
                                texture.minFilter = data.minFilter;
                            }
                            if (data.magFilter !== undefined) {
                                texture.magFilter = data.magFilter;
                            }
                        }
                    }
                }
            }

            // Update layers from metadata
            const layers_metadata = await ClientAPI.get_info('layers');
            if (!layers_metadata.result) {
                if (layers_metadata.data == undefined) {
                    Log.log('Update resource manager from metadata: layers not found!');
                    return;
                }
                Log.warn('Update resource manager from metadata: failed on get layers!');
                return;
            }
            const metadata_layers = layers_metadata.data as TRecursiveDict;
            Object.keys(metadata_layers).forEach(key => {
                const layer = metadata_layers[key];
                if (typeof layer === 'string') {
                    layers.push(layer);
                }
            });
        } catch (error) {
            Log.error('Error updating resource manager:', error);
        }
    }

    function add_layer(layer: string) {
        if (!layers.includes(layer)) {
            layers.push(layer);
        }
    }

    function remove_layer(layer: string) {
        const index = layers.indexOf(layer);
        if (index !== -1) {
            layers.splice(index, 1);
        }
    }

    function get_layers() {
        return layers;
    }

    function has_layer(layer: string) {
        return layers.includes(layer);
    }

    function get_layers_mask_by_names(layers_names: string[]) {
        if (layers_names.length == 0) {
            return 0;
        }
        return layers_names.map(layer => {
            const index = layers.indexOf(layer);
            if (index === -1) {
                Log.warn(`Layer "${layer}" not found in layers array`);
                return 0;
            }
            if (index > 10) {
                Log.warn(`Layer "${layer}" index ${index} exceeds maximum allowed value of 10`);
                return 0;
            }
            return 1 << index;
        }).reduce((acc, curr) => acc | curr, 0);
    }

    function get_layers_names_by_mask(mask: number) {
        const result: string[] = [];
        for (let i = 0; i < Math.min(10, layers.length); i++) {
            if (mask & (1 << i)) {
                result.push(layers[i]);
            }
        }
        return result;
    }

    // NOTE: скорее всего вся логика со списком загруженных tilemap перебор, так как будет загружега только одна tilemap в открытой сцене, получается текущую загруженную tilemap-у можно просто менять и не хранить список ?

    function set_tilemap_path(tilemap: string, path: string) {
        tilemap_paths[tilemap] = path;
    }

    function get_tilemap_path(tilemap: string) {
        return tilemap_paths[tilemap];
    }

    function set_tile_info(tilemap: string, tile_id: string, value: string) {
        if (!tilemap_info[tilemap]) {
            tilemap_info[tilemap] = {};
        }
        tilemap_info[tilemap][tile_id] = value;
    }

    function get_tile_info(tilemap: string, tile_id: string) {
        return tilemap_info[tilemap][tile_id];
    }

    function get_all_loaded_tilemaps() {
        return Object.keys(tilemap_info);
    }

    init();
    return {
        load_asset,
        add_texture,
        load_texture,
        has_texture_name,
        preload_audio,
        preload_scene,
        preload_atlas,
        preload_texture,
        preload_font,
        preload_material,
        preload_vertex_program,
        preload_fragment_program,
        get_material_info,
        is_material_origin_hash,
        get_material_by_hash,
        get_material_hash_by_mesh_id,
        get_material_by_mesh_id,
        set_material_property_for_mesh,
        set_material_uniform_for_original,
        set_material_uniform_for_mesh,
        set_material_uniform_for_multiple_material_mesh,
        set_material_define_for_mesh,
        set_material_define_for_multiple_material_mesh,
        has_material_by_mesh_id,
        unlink_material_for_mesh,
        unlink_material_for_multiple_material_mesh,
        get_info_about_unique_materials,
        get_changed_uniforms_for_mesh,
        get_changed_uniforms_for_multiple_material_mesh,
        get_font,
        get_texture,
        free_texture,
        get_atlas,
        get_atlas_by_texture_name,
        add_atlas,
        has_atlas,
        del_atlas,
        get_all_fonts,
        get_all_atlases,
        get_all_textures,
        get_all_materials,
        get_all_vertex_programs,
        get_all_fragment_programs,
        get_all_models,
        get_all_model_animations,
        set_project_path,
        preload_model,
        get_model,
        find_animation,
        get_animations_by_model,
        override_atlas_texture,
        update_from_metadata,
        write_metadata,
        get_scene_info,
        cache_scene,
        get_all_sounds,
        get_sound_buffer,
        add_layer,
        remove_layer,
        get_layers,
        has_layer,
        get_layers_mask_by_names,
        get_layers_names_by_mask,
        set_tilemap_path,
        get_tilemap_path,
        set_tile_info,
        get_tile_info,
        get_all_loaded_tilemaps,
        models,
        animations
    };
}