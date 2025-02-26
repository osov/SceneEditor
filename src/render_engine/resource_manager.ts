import { CanvasTexture, Group, LoadingManager, Object3D, RepeatWrapping, Texture, TextureLoader, Vector2 } from 'three';
import { get_file_name } from './helpers/utils';
import { parse_tp_data_to_uv } from './parsers/atlas_parser';
import { preloadFont } from 'troika-three-text'
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

declare global {
    const ResourceManager: ReturnType<typeof ResourceManagerModule>;
}

export function register_resource_manager() {
    (window as any).ResourceManager = ResourceManagerModule();
}
interface AssetData<T> {
    [k: string]: { path: string, data: T };
}

interface TextureData {
    texture: Texture;
    uvOffset: Vector2;
    uvScale: Vector2;
    size: Vector2;
}

export function ResourceManagerModule() {
    const font_characters = " !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\]^_`abcdefghijklmnopqrstuvwxyz{|}~йцукенгшщзхфывапролджэячсмитьбюЙЦУКЕНГШЩЗХФЫВАПРОЛДЖЯЧСМИТЬБЮЭ";
    const texture_loader = new TextureLoader();
    const atlases: { [name: string]: AssetData<TextureData> } = { '': {} };
    const fonts: { [name: string]: string } = {};
    const models: { [name: string]: Object3D } = {};
    const manager = new LoadingManager();
    let bad_texture: CanvasTexture;
    let project_path = '';
    const ktx2Loader = new KTX2Loader().setTranscoderPath('./libs/basis/').detectSupport(RenderEngine.renderer);

    function init() {
        gen_textures();
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
        if (!atlases[atlas]) return false;
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
        if (!atlases[atlas])
            atlases[atlas] = {};
        if (atlases[atlas][name])
            Log.warn('texture exists already', name, atlas);
        atlases[atlas][name] = { path, data: { texture, uvOffset: new Vector2(0, 0), uvScale: new Vector2(1, 1), size: new Vector2(texture.image.width, texture.image.height) } };
        //log('Texture preloaded:', path);
        return atlases[atlas][name].data;
    }

    async function preload_atlas(atlas_path: string, texture_path: string, override = false) {
        const name = get_file_name(atlas_path);
        if (!override && atlases[name]) {
            Log.warn('atlas exists', name);
            const vals = Object.values(atlases[name]);
            return vals[0].data.texture;
        }
        const data = await (await fetch(project_path + atlas_path)).text();
        const texture = await load_texture(texture_path);
        const texture_data = parse_tp_data_to_uv(data, texture.image.width, texture.image.height);

        if (atlases[name])
            Log.warn('atlas exists already', name);
        atlases[name] = {};
        for (const texture_name in texture_data) {
            const tex_data = texture_data[texture_name];
            atlases[name][texture_name] = {
                path: atlas_path,
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

    function get_all_textures() {
        const list: { name: string, atlas: string, data: TextureData }[] = [];
        for (const k in atlases) {
            for (const k2 in atlases[k]) {
                list.push({ name: k2, atlas: k, data: atlases[k][k2].data });
            }
        }
        return list;
    }

    async function preload_model(path: string) {
        path = project_path + path;
        if (path.endsWith('.fbx')) {
            return new Promise<Group>(async (resolve, _) => {
                const loader = new FBXLoader(manager);
                loader.load(path, (object) => {
                    models[get_file_name(path)] = object;
                    resolve(object);
                });
            })
        }
        Log.error('Model not supported', path);
        return null;
    }

    function get_model(name: string) {
        return models[name];
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
        else
            Log.error('Texture not found', name, atlas);
    }

    init();
    return { load_asset, load_texture, preload_atlas, preload_texture, preload_font, get_all_fonts, get_atlas, get_texture, get_font, free_texture, get_all_textures, set_project_path, preload_model, get_model };
};