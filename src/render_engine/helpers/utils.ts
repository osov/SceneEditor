import { BufferGeometry, Line, LineDashedMaterial, Object3D, ShaderMaterial, Vector2, Vector3, Vector4, Texture, IUniform } from "three";
import { IBaseMeshAndThree, IBaseEntityAndThree } from "../types";
import { deepClone, getObjectHash } from "../../modules/utils";


export function get_basename(path: string) {
    return path.split('/').reverse()[0];
}

export function get_file_name(path: string) {
    const basename = get_basename(path);
    return basename.substring(0, basename.lastIndexOf(".")) || basename;
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

export function flip_geometry_x(geometry: BufferGeometry) {
    const uv = geometry.attributes.uv;
    for (let i = 0; i < uv.count; i++)
        uv.setX(i, 1 - uv.getX(i));
    return geometry;
}

export function flip_geometry_y(geometry: BufferGeometry) {
    const uv = geometry.attributes.uv;
    for (let i = 0; i < uv.count; i++)
        uv.setY(i, 1 - uv.getY(i));
    return geometry;
}

export function flip_geometry_xy(geometry: BufferGeometry) {
    const uv = geometry.attributes.uv;
    for (let i = 0; i < uv.count; i++) {
        const tempX = uv.getX(i);
        uv.setX(i, 1 - uv.getY(i)); // Меняем X на Y
        uv.setY(i, 1 - tempX);      // Меняем Y на X
    }
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



export function make_ramk(width: number, height: number) {
    const offset = 0.5;
    var points = [
        new Vector3(-offset, offset, 0),
        new Vector3(offset, offset, 0),
        new Vector3(offset, - offset, 0),
        new Vector3(-offset, - offset, 0),
        new Vector3(-offset, offset, 0),
    ];

    var geometry = new BufferGeometry().setFromPoints(points);
    var line = new Line(geometry, new LineDashedMaterial({ color: 0xffaa00, dashSize: 0.005, gapSize: 0.005 }));
    line.scale.set(width, height, 1);
    line.position.x = width / 2;
    line.position.y = -height / 2;
    line.computeLineDistances();
    return line;
}

export function copy_material(material: ShaderMaterial) {
    const copy = new ShaderMaterial({
        name: material.name,
        vertexShader: material.vertexShader,
        fragmentShader: material.fragmentShader,
        transparent: deepClone(material.transparent),
        uniforms: {},
        defines: deepClone(material.defines || {})
    });

    // Properly clone uniforms
    for (const [key, uniform] of Object.entries(material.uniforms)) {
        if (uniform.value instanceof Texture) {
            const texture = new Texture();
            texture.copy(uniform.value);
            (texture as any).path = (uniform.value as any).path;
            copy.uniforms[key] = { value: texture };
        } else if (uniform.value instanceof Vector2) {
            copy.uniforms[key] = { value: uniform.value.clone() };
        } else if (uniform.value instanceof Vector3) {
            copy.uniforms[key] = { value: uniform.value.clone() };
        } else if (uniform.value instanceof Vector4) {
            copy.uniforms[key] = { value: uniform.value.clone() };
        } else {
            copy.uniforms[key] = { value: deepClone(uniform.value) };
        }
    }
    return copy;
}

export function get_material_hash(material: ShaderMaterial) {
    const material_info = ResourceManager.get_material_info(material.name);
    if (!material_info) {
        Log.error('Material info not found', material.name);
        return 'error';
    }

    const not_readonly_uniforms: { [uniform: string]: IUniform<any> } = {};
    Object.entries(material.uniforms).forEach(([key, uniform]) => {
        if (material_info.uniforms[key].readonly) {
            return;
        }
        not_readonly_uniforms[key] = uniform;
    });

    const hash = getObjectHash({
        uniforms: not_readonly_uniforms,
        defines: material.defines
    });

    return hash;
}