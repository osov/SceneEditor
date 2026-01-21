/**
 * Asset Parser - парсинг ассетов (атласы, шрифты, spine) для Defold
 */

import {
    type IAtlas,
    type IFont,
    type ILabel,
    type IPrefab,
    type ISpineScene,
    type ISprite,
    PrefabComponentType,
} from '../convert_types';
import {
    encodeAtlas,
    encodeSpineScene,
    type IDefoldAtlas,
    type IDefoldPrototype,
    type IDefoldSpineScene,
} from '../defold_encoder';
import {
    castSprite2DefoldEmbeddedComponent,
    castLabel2DefoldEmbeddedComponent,
} from './component_parser';

/** Конвертировать Atlas в DefoldAtlas */
export function castAtlas2DefoldAtlas(data: IAtlas): IDefoldAtlas {
    const atlas = {} as IDefoldAtlas;
    atlas.images = [];
    for (const image of data.images) {
        atlas.images.push({ image });
    }
    return atlas;
}

/** Конвертировать SpineScene в DefoldSpineScene */
export function castSpine2DefoldSpineScene(data: ISpineScene): IDefoldSpineScene {
    return {
        spine_json: data.json,
        atlas: data.atlas
    };
}

/** Конвертировать Prefab в DefoldPrototype */
export function castPrefab2DefoldPrototype(prefab: IPrefab): IDefoldPrototype {
    const prototype = {} as IDefoldPrototype;
    prototype.embedded_components = [];

    for (const data of prefab.data) {
        switch (data.type) {
            case PrefabComponentType.SPRITE: {
                const sprite = data.data as ISprite;
                prototype.embedded_components.push(castSprite2DefoldEmbeddedComponent(sprite));
                break;
            }
            case PrefabComponentType.LABEL: {
                const label = data.data as ILabel;
                prototype.embedded_components.push(castLabel2DefoldEmbeddedComponent(label));
                break;
            }
        }
    }

    return prototype;
}

/** Парсинг атласа */
export function parseAtlasData(data: IAtlas): string {
    return encodeAtlas(castAtlas2DefoldAtlas(data));
}

/** Парсинг spine сцены */
export function parseSpineSceneData(data: ISpineScene): string {
    return encodeSpineScene(castSpine2DefoldSpineScene(data));
}

/** Получить имя шрифта из пути */
export function getFontName(font: IFont): string {
    return font.font.split('.')[0];
}
