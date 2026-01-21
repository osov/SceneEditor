/**
 * Scene Parser - координатор парсинга для Defold
 *
 * Phase 30: Разделён на модули в parsers/
 */

import {
    type IAtlas,
    type IFont,
    type IGuiNode,
    type INodesList,
    type IPrefab,
    type ISpineScene,
    NodeType,
} from './convert_types';

import {
    encodePrototype,
    encodeFont,
    DefoldFontTextureFormat,
} from './defold_encoder';

// Импорт из модулей парсеров
import {
    generateCollection,
    generateGui,
    castPrefab2DefoldPrototype,
    castAtlas2DefoldAtlas,
    castSpine2DefoldSpineScene,
} from './parsers';

import { encodeAtlas, encodeSpineScene } from './defold_encoder';

export enum DefoldType {
    COLLECTION,
    GO,
    GUI,
    ATLAS,
    FONT,
    SPINE
}

export interface DefoldData {
    name: string;
    type: DefoldType;
    data: string;
}

/** Парсинг сцены в набор Defold файлов */
export function parseScene(data: INodesList): DefoldData[] {
    const result = [] as DefoldData[];

    // main коллекция
    result.push({
        name: data.name,
        type: DefoldType.COLLECTION,
        data: generateCollection(data)
    });

    // ищем встроенные/вложенные коллекции и gui
    for (const node of data.list) {
        switch (node.type) {
            case NodeType.COLLECTION: {
                const node_list = (node.data as INodesList);
                result.push({
                    name: node_list.name,
                    type: DefoldType.COLLECTION,
                    data: generateCollection(node_list)
                });
                break;
            }
            case NodeType.GUI: {
                const gui = (node.data as IGuiNode);
                result.push({
                    name: gui.name,
                    type: DefoldType.GUI,
                    data: generateGui(data)
                });
                break;
            }
        }
    }

    return result;
}

/** Парсинг префаба */
export function parsePrefab(data: IPrefab): DefoldData {
    return {
        name: data.name,
        type: DefoldType.GO,
        data: encodePrototype(castPrefab2DefoldPrototype(data))
    };
}

/** Парсинг атласа */
export function parseAtlas(data: IAtlas): DefoldData {
    return {
        name: data.name,
        type: DefoldType.ATLAS,
        data: encodeAtlas(castAtlas2DefoldAtlas(data))
    };
}

/** Парсинг spine сцены */
export function parseSpineScene(data: ISpineScene): DefoldData {
    return {
        name: data.name,
        type: DefoldType.SPINE,
        data: encodeSpineScene(castSpine2DefoldSpineScene(data))
    };
}

/** Парсинг шрифта */
export function parseFont(data: IFont): DefoldData {
    return {
        name: data.font.split('.')[0],
        type: DefoldType.FONT,
        data: encodeFont({
            font: data.font,
            material: '/builtins/fonts/font-df.material',
            outline_alpha: data.outline_alpha,
            outline_width: data.outline_width,
            shadow_alpha: data.shadow_alpha,
            shadow_x: data.shadow_x,
            shadow_y: data.shadow_y,
            shadow_blur: data.shadow_blur,
            output_format: DefoldFontTextureFormat.TYPE_DISTANCE_FIELD,
            alpha: data.alpha,
            size: data.size,
            all_chars: true
        })
    };
}

// Реэкспорт для обратной совместимости
export * from './parsers';
