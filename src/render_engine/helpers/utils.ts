import { BufferGeometry, Line, LineDashedMaterial, Object3D, ShaderMaterial, Vector2, Vector3, Vector4, Texture, IUniform, Intersection, Object3DEventMap, CanvasTexture } from "three";
import { IBaseMeshAndThree, IBaseEntityAndThree } from "../types";
import { deepClone, getObjectHash } from "../../modules/utils";
import { TextMesh } from "../objects/text";
import { GoText, GoSprite, GuiBox, GuiText } from "../objects/sub_types";
import { MaterialUniformType } from "../resource_manager";
import type { RenderTileData, RenderTileObject } from "../parsers/tile_parser";


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

export function filter_intersect_list(tmp: Intersection<Object3D<Object3DEventMap>>[]) {
    let tmp_list = [];
    for (let i = 0; i < tmp.length; i++)
        tmp_list.push(tmp[i].object);
    return filter_list_base_mesh(tmp_list);
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
    const pivot = new Vector2(point.x - size.x / 2, point.y - size.y / 2);
    return rotate_point_pivot(point, pivot, angle_deg);
}

export function rotate_point_pivot(point: Vector3, pivot: Vector2, angle_deg: number,) {
    const angle = angle_deg * Math.PI / 180;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);

    const xTranslated = point.x - pivot.x;
    const yTranslated = point.y - pivot.y;

    const xRotated = xTranslated * cosA - yTranslated * sinA;
    const yRotated = xTranslated * sinA + yTranslated * cosA;

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
        transparent: material.transparent,

        blending: material.blending,

        depthTest: material.depthTest,
        stencilWrite: material.stencilWrite,
        stencilRef: material.stencilRef,
        stencilFunc: material.stencilFunc,
        stencilZPass: material.stencilZPass,
        colorWrite: material.colorWrite,

        uniforms: {},
        defines: deepClone(material.defines || {})
    });

    for (const [key, uniform] of Object.entries(material.uniforms)) {
        if (uniform.value instanceof Texture || uniform.value instanceof CanvasTexture) {
            copy.uniforms[key] = { value: uniform.value };
        } else if (
            uniform.value instanceof Vector2 ||
            uniform.value instanceof Vector3 ||
            uniform.value instanceof Vector4
        ) {
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
        blending: material.blending,
        uniforms: not_readonly_uniforms,
        defines: material.defines,
        depthTest: material.depthTest,
        stencilWrite: material.stencilWrite,
        stencilRef: material.stencilRef,
        stencilFunc: material.stencilFunc,
        stencilZPass: material.stencilZPass,
        colorWrite: material.colorWrite,
    });

    return hash;
}

export function updateEachMaterialWhichHasTexture(texture: Texture) {
    const materials = ResourceManager.get_all_materials();
    materials.forEach((material) => {
        const material_info = ResourceManager.get_material_info(material);
        if (!material_info) return;
        Object.entries(material_info.uniforms).forEach(([uniform_name, uniform]) => {
            if (uniform.type != MaterialUniformType.SAMPLER2D) return;
            Object.values(material_info.instances).forEach((inst) => {
                if (inst.uniforms[uniform_name] && inst.uniforms[uniform_name].value != null) {
                    if ((inst.uniforms[uniform_name] as IUniform<Texture>).value.uuid != texture.uuid) return;
                    inst.uniforms[uniform_name].value.needsUpdate = true;
                }
            });
        });
    });
}

export function lerp(a: number, b: number, t: number) {
    return a + (b - a) * t;
}

export function is_tile(mesh: Object3D) {
    return (mesh.userData.tile != undefined) && (mesh.userData.id_layer != undefined);
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

export function rand_int(a: number, b: number) {
    return math.random(a, b);
}

export function rand_float(a: number, b: number) {
    const mul = 1000;
    return rand_int(a * mul, b * mul) / mul;
}

type Point = { x: number, y: number };

function CatmullRom(t: number, p0: number, p1: number, p2: number, p3: number): number {
    const v0 = (p2 - p0) * 0.5;
    const v1 = (p3 - p1) * 0.5;
    const t2 = t * t;
    const t3 = t * t2;
    return (2 * p1 - 2 * p2 + v0 + v1) * t3 + (-3 * p1 + 3 * p2 - 2 * v0 - v1) * t2 + v0 * t + p1;
}

// Вычисление длины отрезка
function dist(a: Point, b: Point): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
}

// Генерация таблицы длин для равномерной скорости
export function generateArcLengthTable(points: Point[], divisions: number = 100): { arcLengths: number[], tValues: number[] } {
    const arcLengths = [0];
    const tValues = [0];

    let prev = { x: 0, y: 0 };
    getPointCurve(0, points, prev);

    let length = 0;

    for (let i = 1; i <= divisions; i++) {
        const t = i / divisions;
        const curr = { x: 0, y: 0 };
        getPointCurve(t, points, curr);
        length += dist(prev, curr);

        arcLengths.push(length);
        tValues.push(t);
        prev = curr;
    }

    // Нормализуем длины
    for (let i = 0; i < arcLengths.length; i++) {
        arcLengths[i] /= length;
    }

    return { arcLengths, tValues };
}

// Поиск t для нужной длины
function findTForUniformT(u: number, arcLengths: number[], tValues: number[]): number {
    for (let i = 1; i < arcLengths.length; i++) {
        if (u <= arcLengths[i]) {
            const ratio = (u - arcLengths[i - 1]) / (arcLengths[i] - arcLengths[i - 1]);
            return tValues[i - 1] + ratio * (tValues[i] - tValues[i - 1]);
        }
    }
    return 1;
}

export function getPointCurve(t: number, points: Point[], point: Point): Point {
    const p = (points.length - 1) * t;

    const intPoint = Math.floor(p);
    const weight = p - intPoint;

    const p0 = points[intPoint === 0 ? intPoint : intPoint - 1];
    const p1 = points[intPoint];
    const p2 = points[intPoint > points.length - 2 ? points.length - 1 : intPoint + 1];
    const p3 = points[intPoint > points.length - 3 ? points.length - 1 : intPoint + 2];

    point.x = CatmullRom(weight, p0.x, p1.x, p2.x, p3.x);
    point.y = CatmullRom(weight, p0.y, p1.y, p2.y, p3.y);
    return point;
}

// равномерная позиция по длине дуги
export function getUniformPoint(u: number, points: Point[], arcTable: { arcLengths: number[], tValues: number[] }, point: Point): Point {
    const t = findTForUniformT(u, arcTable.arcLengths, arcTable.tValues);
    return getPointCurve(t, points, point);
}

export function error_popup(message: string) {
    Popups.open({
        type: "Notify",
        params: { title: "Ошибка", text: message, button: "Ok", auto_close: true },
        callback: () => { }   // (success: boolean) => void
    });
}

export function has_nearest_clipping_parent(mesh: GuiBox | GuiText) {
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