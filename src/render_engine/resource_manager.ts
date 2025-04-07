import { AnimationClip, CanvasTexture, Group, LoadingManager, Object3D, RepeatWrapping, Scene, SkinnedMesh, Texture, TextureLoader, Vector2, MinificationTextureFilter, MagnificationTextureFilter, ShaderMaterial, Vector3, IUniform } from 'three';
import { get_file_name } from './helpers/utils';
import { parse_tp_data_to_uv } from './parsers/atlas_parser';
import { preloadFont } from 'troika-three-text'
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { ColladaLoader } from 'three/examples/jsm/loaders/ColladaLoader';
import { TRecursiveDict } from '../modules_editor/modules_editor_const';
import { shader } from './objects/entity_base';
import { hexToRGB } from '../modules/utils';

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

//TODO: переместить в AssetInspector, а сдесь нужно сделать MaterialUniformValues
export type MaterialUniformParams = {
    [MaterialUniformType.FLOAT]: { min?: number, max?: number, step?: number };
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
}

export interface MaterialInfo {
    name: string;
    vp: string;
    fp: string;
    uniforms: {
        [key: string]: MaterialUniform<keyof MaterialUniformParams>
    };
    data: ShaderMaterial;
}

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
    const atlases: { [name: string]: AssetData<TextureData> } = { '': {} };
    const fonts: { [name: string]: string } = {};
    const materials: { [name: string]: MaterialInfo } = {};
    const models: { [name: string]: Object3D } = {};
    const animations: AnimationInfo[] = [];
    const manager = new LoadingManager();
    let bad_texture: CanvasTexture;
    let project_path = '';
    const ktx2Loader = new KTX2Loader().setTranscoderPath('./libs/basis/').detectSupport(RenderEngine.renderer);

    function init() {
        gen_textures();
        subscribe();
    }

    function subscribe() {
        // NOTE: обновление шейдеров при изменении файлов
        EventBus.on('SERVER_FILE_SYSTEM_EVENTS', async (e) => {
            for (let i = 0; i < e.events.length; i++) {
                const ev = e.events[i];
                if(ev.ext == '.vp') {
                    const vp_path = get_file_name(ev.path);
                    const vp_data = await AssetControl.get_file_data(vp_path);
                    const vp = vp_data.data!;
                    for(const material of Object.values(materials)) {
                        if(material.vp == vp_path) {
                            material.data.vertexShader = vp;
                            material.data.needsUpdate = true;
                        }
                    }
                }
                if (ev.ext == '.fp') {
                    const fp_path = get_file_name(ev.path);
                    const fp_data = await AssetControl.get_file_data(fp_path);
                    const fp = fp_data.data!;
                    for(const material of Object.values(materials)) {
                        if(material.fp == fp_path) {
                            material.data.fragmentShader = fp;
                            material.data.needsUpdate = true;
                        }
                    }
                }
            }
        });
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
        let texture: Texture;
        if (path.endsWith('.ktx2'))
            texture = await ktx2Loader.loadAsync(path);
        else
            texture = await texture_loader.loadAsync(path);
        (texture as any).path = path;
        return texture;
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
        atlases[atlas][name] = { data: { texture, uvOffset: new Vector2(0, 0), uvScale: new Vector2(1, 1), size: new Vector2(texture.image.width, texture.image.height) } };

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

        atlases[atlas][name] = { data: { texture, uvOffset: new Vector2(0, 0), uvScale: new Vector2(1, 1), size: new Vector2(texture.image.width, texture.image.height) } };

        return atlases[atlas][name].data;
    }

    async function preload_atlas(atlas_path: string, texture_path: string, override = false) {
        const name = get_file_name(atlas_path);
        if (!override && atlases[name]) {
            Log.warn('atlas exists', name);
            const textures = Object.values(atlases[name]);
            if(textures[0]) {
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

    async function load_material(path: string) {
        path = project_path + path;
        const result = await fetch(path);
        if (!result.ok) {
            return {
                success: false,
                error: `Material not found: ${path}`
            };
        }

        const material_info = await result.json();

        const material = {} as MaterialInfo;
        material.name = get_file_name(path);
        material.vp = material_info.vp;
        material.fp = material_info.fp;
        material.uniforms = {};

        material.data = new ShaderMaterial();
        material.data.name = material.name;

        Object.keys(material_info.uniforms).forEach((key) => {
            material.uniforms[key] = {
                type: material_info.uniforms[key].type,
                params: { ...material_info.uniforms[key] },
                readonly: material_info.uniforms[key].readonly
            };
            switch(material_info.uniforms[key].type) {
                case MaterialUniformType.COLOR:
                    const colorVec3 = hexToRGB(material_info.data[key]);
                    material.data.uniforms[key] = { value: colorVec3 } as IUniform<Vector3>;
                    break;
                case MaterialUniformType.SAMPLER2D:
                    const texture_name = get_file_name(material_info.data[key] || '');
                    const atlas = get_atlas_by_texture_name(texture_name);
                    const texture_data = get_texture(texture_name, atlas || '');
                    material.data.uniforms[key] = { value: texture_data.texture } as IUniform<Texture>;
                    break;
                default:
                    material.data.uniforms[key] = { value: material_info.data[key] };
                    break;
            }
        });

        const vp = await AssetControl.get_file_data(material_info.vp);
        material.data.vertexShader = (vp.result && vp.data) ? await vp.data : shader.vertexShader;
        
        const fp = await AssetControl.get_file_data(material_info.fp);
        material.data.fragmentShader = (fp.result && fp.data) ? await fp.data : shader.fragmentShader;
        
        material.data.transparent = material_info.transparent;

        return {
            success: true,
            data: material
        };
    }

    async function preload_material(path: string) {
        const name = get_file_name(path);
        Log.log('[preload_material] name:', name, path);
        if(has_material(name)) {
            Log.warn('Material already exists', name, path);
            return materials[name];
        }

        const response = await load_material(path);
        if (!response.success) {
            Log.error(response.error);
            return null;
        }

        if(!response.data) {
            Log.error('Material not found', path);
            return null;
        }

        Log.log('[preload_material] response:', response);

        materials[name] = response.data;
        return response.data;
    }

    function get_all_fonts() {
        return fonts;
    }

    function get_font(name: string) {
        return fonts[name];
    }

    function get_texture(name: string, atlas = ''): TextureData {
        if (!has_texture_name(name, atlas)) {
            Log.error('Texture not found', name, atlas);
            return { texture: bad_texture, size: new Vector2(128, 128), uvOffset: new Vector2(0, 0), uvScale: new Vector2(1, 1) };
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
        for (const [atlas_name, textures] of Object.entries(atlases)) {
            if (textures[texture_name]) {
                return atlas_name;
            }
        }
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

    function get_material(name: string) {
        return materials[name];
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

    function add_animations(anim_list: AnimationClip[], has_mesh = false, model_path = '') {
        if (anim_list.length) {
            const model_name = get_file_name(model_path);
            for (let i = 0; i < anim_list.length; i++) {
                const clip = anim_list[i];
                let cur_anim_name = has_mesh ? clip.name : model_name;
                if (cur_anim_name.includes('mixamo.com'))
                    cur_anim_name = model_name
                if (find_animation(cur_anim_name, model_name))
                    Log.warn('animation exists already', cur_anim_name, model_name);
                animations.push({ model: model_name, animation: cur_anim_name, clip });
            }
        }
    }

    async function preload_model(path: string) {
        path = project_path + path;
        const model_name = get_file_name(path);
        if (path.toLowerCase().endsWith('.fbx')) {
            return new Promise<Group>(async (resolve, _) => {
                const loader = new FBXLoader(manager);
                loader.load(path, (mesh) => {
                    //log(mesh);
                    const has_mesh = has_skinned_mesh(mesh);
                    if (has_mesh)
                        models[model_name] = mesh;
                    add_animations(mesh.animations, has_mesh, path);
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
                        models[model_name] = gltf.scene;
                    add_animations(gltf.animations, has_mesh, path);
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
        } catch (error) {
            Log.error('Error writing metadata:', error);
        }
    }

    // NOTE: считываем всю информацию из metadata и обновляем ресурсы
    async function update_from_metadata() {
        Log.log('Update resource manager from metadata');
        try {
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

                    // Update texture filters if they exist in metadata
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
        } catch (error) {
            Log.error('Error updating resource manager:', error);
        }
    }

    init();
    return {
        load_asset,
        add_texture,
        load_texture,
        has_texture_name,
        preload_atlas,
        preload_texture,
        preload_font,
        preload_material,
        get_all_fonts,
        get_font,
        get_texture,
        free_texture,
        get_atlas,
        get_all_atlases,
        get_atlas_by_texture_name,
        add_atlas,
        has_atlas,
        del_atlas,
        get_all_textures,
        get_all_materials,
        get_material,
        set_project_path,
        preload_model,
        get_model,
        find_animation,
        get_animations_by_model,
        override_atlas_texture,
        update_from_metadata,
        write_metadata
    };
}