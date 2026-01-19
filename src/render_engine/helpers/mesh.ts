// Утилиты для работы с мешами и объектами сцены

import { Intersection, Object3D, Object3DEventMap } from "three";
import { IBaseMeshAndThree, IBaseEntityAndThree } from "../types";
import { TextMesh } from "../objects/text";
import { GoText, GoSprite, GuiBox, GuiText } from "../objects/sub_types";
import type { RenderTileData, RenderTileObject } from "../parsers/tile_parser";

export function is_base_mesh(mesh: Object3D) {
    return (mesh as IBaseMeshAndThree).mesh_data !== undefined;
}

// Исключить из списка дочерние элементы, тк при удалении проще будет восстановить
export function format_list_without_children(list: IBaseEntityAndThree[]) {
    const ids: number[] = [];
    for (let i = 0; i < list.length; i++) {
        ids.push(list[i].mesh_data.id);
    }
    const res: IBaseEntityAndThree[] = [];
    for (let i = 0; i < list.length; i++) {
        if (is_base_mesh(list[i].parent!)) {
            const p = list[i].parent! as IBaseEntityAndThree;
            if (ids.indexOf(p.mesh_data.id) === -1) {
                res.push(list[i]);
            }
        }
        else
            res.push(list[i]);
    }
    return res;
}

export function filter_list_base_mesh(tmp: Object3D[]) {
    const list: IBaseMeshAndThree[] = [];
    for (let i = 0; i < tmp.length; i++) {
        const it = tmp[i];
        if (is_base_mesh(it)) {
            list.push(it as IBaseMeshAndThree);
        }
    }
    return list;
}

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
