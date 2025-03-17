import { BufferGeometry, Object3D, Vector2, Vector3 } from "three";
import { IBaseMeshAndThree, IBaseEntityAndThree } from "../types";

export function get_basename(path: string) {
    return path.split('/').reverse()[0];
}

export function get_file_name(path: string) {
    return get_basename(path).split('.')[0];
}

export function is_base_mesh(mesh: Object3D) {
    return (mesh as any).mesh_data != undefined;
}

// исключить из списка дочерние элементы, тк при удалении проще будет восстановить 
export function format_list_without_children(list: IBaseEntityAndThree[]) {
    const ids = [];
    for (let i = 0; i < list.length; i++) {
        ids.push(list[i].mesh_data.id);
    }
    const res = [];
    for (let i = 0; i < list.length; i++) {
        if (is_base_mesh(list[i].parent!)) {
            const p = list[i].parent! as IBaseEntityAndThree;
            if (ids.indexOf(p.mesh_data.id) == -1) {
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
            list.push(it as any as IBaseMeshAndThree);
        }
    }
    return list;
}

export function convert_width_height_to_pivot_bb(w: number, h: number, ax = 0.5, ay = 0.5) {
    // left_bottom, left_top, right_top, right_bottom 
    return [
        new Vector2(-w * ax, -h * ay),
        new Vector2(-w * ax, h * (1 - ay)),
        new Vector2(w * (1 - ax), h * (1 - ay)),
        new Vector2(w * (1 - ax), -h * ay),
    ]
}

export function set_pivot_with_sync_pos(mesh: IBaseMeshAndThree, width: number, height: number, old_pivot_x: number, old_pivot_y: number, new_pivot_x: number, new_pivot_y: number) {
    const scale = mesh.scale;
    const op = convert_width_height_to_pivot_bb(width * scale.x, height * scale.y, old_pivot_x, old_pivot_y);
    const old_positions = [];
    for (let i = 0; i < mesh.children.length; i++) {
        const m = mesh.children[i];
        if (is_base_mesh(m)) {
            const v = new Vector3();
            m.getWorldPosition(v);
            old_positions.push(v);
        }
    }
    const wp = new Vector3();
    mesh.getWorldPosition(wp);
    mesh.set_pivot(new_pivot_x, new_pivot_y);
    const np = convert_width_height_to_pivot_bb(width * scale.x, height * scale.y, new_pivot_x, new_pivot_y);
    mesh.set_size(width, height);
    mesh.position.x += - np[0].x + op[0].x;
    mesh.position.y += - np[1].y + op[1].y;
    mesh.transform_changed();
    for (let i = 0; i < mesh.children.length; i++) {
        const m = mesh.children[i];
        if (is_base_mesh(m)) {
            const l = m.parent!.worldToLocal(old_positions[i]);
            m.position.copy(l);
            (m as any).transform_changed();
        }
    }
}

export function flip_geometry_y(geometry: BufferGeometry) {
    const uv = geometry.attributes.uv;
    for (let i = 0; i < uv.count; i++) 
        uv.setY(i, 1 - uv.getY(i));
    return geometry;
}

export function rotate_point(point: Vector3, size: Vector2, angle_deg: number,) {
    const pivot = { x: point.x - size.x / 2, y: point.y - size.y / 2 };
    const angle = angle_deg * Math.PI / 180;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);

    // Перемещение точки в начало координат относительно pivot
    const xTranslated = point.x - pivot.x;
    const yTranslated = point.y - pivot.y;

    // Поворот
    const xRotated = xTranslated * cosA - yTranslated * sinA;
    const yRotated = xTranslated * sinA + yTranslated * cosA;

    // Обратное перемещение
    const xNew = xRotated + pivot.x;
    const yNew = yRotated + pivot.y;

    return { x: xNew, y: yNew };
}
