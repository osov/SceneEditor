// Базовые утилиты для работы с мешами (без зависимостей от конкретных типов объектов)
// Эти утилиты могут безопасно импортироваться в slice9.ts и других базовых классах

import { Object3D } from "three";
import { IBaseMeshAndThree, IBaseEntityAndThree } from "../types";

/**
 * Проверка является ли объект базовым мешем
 */
export function is_base_mesh(mesh: Object3D): mesh is IBaseMeshAndThree {
    return (mesh as IBaseMeshAndThree).mesh_data !== undefined;
}

/**
 * Исключить из списка дочерние элементы
 */
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

/**
 * Отфильтровать список Object3D и оставить только базовые меши
 */
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
