import { TextureLoader } from 'three';
import { preloadFont } from 'troika-three-text'


declare global {
    const ResourceManager: ReturnType<typeof ResourceManagerModule>;
}

export function register_resource_manager() {
    (window as any).ResourceManager = ResourceManagerModule();
}


export function ResourceManagerModule() {
    const font_characters = " !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\]^_`abcdefghijklmnopqrstuvwxyz{|}~йцукенгшщзхфывапролджэячсмитьбюЙЦУКЕНГШЩЗХФЫВАПРОЛДЖЯЧСМИТЬБЮЭёЁäüÜöøæåéèêàôùëúíñçõ¿¡ÉãòáßóÇışİğĞ";
    const texture_loader = new TextureLoader();

    async function preload_texture(path: string) {
        const texture = await texture_loader.loadAsync(path);
        return texture;
    }

    async function preload_font(path: string) {
        return new Promise((resolve, reject) => {
            preloadFont({
                font: path,
                characters: font_characters
            },
                () => resolve(true)
            )
        })
    }

    return { preload_texture, preload_font };
};