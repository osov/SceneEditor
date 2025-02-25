import { CanvasTexture, RepeatWrapping, Texture, TextureLoader, Vector2 } from 'three';
import { preloadFont } from 'troika-three-text'
import { get_file_name } from './helpers/utils';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader'
import { parse_tp_data_to_uv } from './atlas_parser';

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
    let bad_texture: CanvasTexture;
    const ktx2Loader = new KTX2Loader().setTranscoderPath('./libs/basis/').detectSupport(RenderEngine.renderer);

    function init() {
        gen_textures();
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

    async function preload_texture(path: string, atlas = '') {
        const name = get_file_name(path);
        if (has_texture_name(name, atlas)) {
            Log.warn('texture exists', name, atlas);
            return atlases[atlas][name].data;
        }
        let texture: Texture;
        if (path.endsWith('.ktx2'))
            texture = await ktx2Loader.loadAsync(path);
        else
            texture = await texture_loader.loadAsync(path);
        (texture as any).path = path;
        if (!atlases[atlas])
            atlases[atlas] = {};
        if (atlases[atlas][name])
            Log.warn('texture exists', name, atlas);
        atlases[atlas][name] = { path, data: { texture, uvOffset: new Vector2(0, 0), uvScale: new Vector2(1, 1), size: new Vector2(texture.image.width, texture.image.height) } };
        log('Texture preloaded:', path);
        return atlases[atlas][name].data;
    }

    async function preload_atlas(atlas_path: string, texture_path: string) {
        const data = await (await fetch(atlas_path)).text();
        let texture: Texture;
        if (texture_path.endsWith('.ktx2'))
            texture = await ktx2Loader.loadAsync(texture_path);
        else
            texture = await texture_loader.loadAsync(texture_path);
        (texture as any).path = texture_path;
        const texture_data = parse_tp_data_to_uv(data, texture.image.width, texture.image.height);

        const name = get_file_name(atlas_path);
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
        log('Atlas preloaded:', atlas_path);
        return texture;
    }

    async function preload_font(path: string) {
        const name = get_file_name(path);
        if (fonts[name]) {
            return true;
        }
        return new Promise((resolve, _reject) => {
            preloadFont({
                font: path,
                characters: font_characters
            },
                () => {
                    fonts[name] = path;
                    log('Font preloaded:', path);
                    resolve(true);
                }
            )
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
    return { preload_atlas, preload_texture, preload_font, get_all_fonts, get_atlas, get_texture, get_font, free_texture, get_all_textures };
};