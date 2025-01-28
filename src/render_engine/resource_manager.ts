import { CanvasTexture, RepeatWrapping, Texture, TextureLoader } from 'three';
import { preloadFont } from 'troika-three-text'
import { get_file_name } from './helpers/utils';

declare global {
    const ResourceManager: ReturnType<typeof ResourceManagerModule>;
}

export function register_resource_manager() {
    (window as any).ResourceManager = ResourceManagerModule();
}
interface AssetData<T> {
    [k: string]: { path: string, data: T };
}

export function ResourceManagerModule() {
    const font_characters = " !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\]^_`abcdefghijklmnopqrstuvwxyz{|}~йцукенгшщзхфывапролджэячсмитьбюЙЦУКЕНГШЩЗХФЫВАПРОЛДЖЯЧСМИТЬБЮЭёЁäüÜöøæåéèêàôùëúíñçõ¿¡ÉãòáßóÇışİğĞ";
    const texture_loader = new TextureLoader();
    const atlases: { [name: string]: AssetData<Texture> } = { '': {} };
    const fonts: { [name: string]: string } = {};
    let bad_texture: CanvasTexture;

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
            return atlases[atlas][name].data;
        }
        const texture = await texture_loader.loadAsync(path);
        if (!atlases[atlas])
            atlases[atlas] = {};
        atlases[atlas][name] = { path, data: texture };
        return texture;
    }

    async function preload_font(path: string) {
        const name = get_file_name(path);
        if (fonts[name]) {
            return true;
        }
        return new Promise((resolve, reject) => {
            preloadFont({
                font: path,
                characters: font_characters
            },
                () => {
                    fonts[name] = path;
                    resolve(true);
                }
            )
        })
    }

    function get_font(name: string) {
        return fonts[name];
    }

    function get_texture(name: string, atlas = '') {
        if (!has_texture_name(name, atlas)) {
            Log.error('texture not found', name, atlas);
            return bad_texture;
        };
        return atlases[atlas][name].data;
    }

    init();
    return { preload_texture, preload_font, get_texture, get_font };
};