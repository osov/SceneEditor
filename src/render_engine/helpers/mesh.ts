// Утилиты для работы с мешами и объектами сцены
// Базовые функции (is_base_mesh, filter_list_base_mesh, format_list_without_children)
// вынесены в mesh_base.ts для избежания циклических зависимостей

import { Intersection, Object3D, Object3DEventMap } from "three";
import type { IBaseMeshAndThree } from "../types";
import { TextMesh } from "../objects/text";
import { GoText, GoSprite, GuiBox, GuiText } from "../objects/sub_types";
import type { RenderTileData, RenderTileObject } from "../parsers/tile_parser";
import { filter_list_base_mesh } from "./mesh_base";

// Реэкспорт базовых функций из mesh_base
export { is_base_mesh, filter_list_base_mesh, format_list_without_children } from "./mesh_base";

export function filter_intersect_list(tmp: Intersection<Object3D<Object3DEventMap>>[]) {
    const tmp_list: Object3D[] = [];
    for (let i = 0; i < tmp.length; i++)
        tmp_list.push(tmp[i].object);
    return filter_list_base_mesh(tmp_list);
}

export function is_tile(mesh: Object3D) {
    return (mesh.userData.tile !== undefined) && (mesh.userData.id_layer !== undefined);
}

export function is_text(mesh: Object3D) {
    return mesh instanceof TextMesh;
}

export function is_label(mesh: Object3D) {
    return mesh instanceof GoText;
}

export function is_sprite(mesh: Object3D) {
    return mesh instanceof GoSprite;
}

export function has_nearest_clipping_parent(mesh: GuiBox | GuiText): boolean {
    if (mesh.parent instanceof GuiBox) {
        if (mesh.parent.isClippingEnabled())
            return true;
        return has_nearest_clipping_parent(mesh.parent);
    }
    if (mesh.parent instanceof GuiText) {
        return has_nearest_clipping_parent(mesh.parent);
    }
    return false;
}

/**
 * Получить хэш-ключ для меша (для идентификации в коллекциях)
 */
export function get_hash_by_mesh(mesh: IBaseMeshAndThree): string {
    let key = mesh.name;
    if (mesh.userData !== undefined && mesh.userData.tile !== undefined) {
        const tile = mesh.userData.tile as (RenderTileObject | RenderTileData);
        if ('id_object' in tile) {
            key = tile.id_object + '';
        } else {
            key = mesh.userData.id_layer + '_' + tile.x + '.' + tile.y;
        }
    }
    return key;
}
