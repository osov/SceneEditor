import { is_base_mesh, is_text, is_label, is_sprite } from "../render_engine/helpers/utils";

export function url_to_id(url: string): number {
    // NOTE: socket не учитываем
    const idx = url.indexOf(":/");
    let goAndComponent = url;
    if (idx !== -1) {
        goAndComponent = url.substring(idx + 1);
    }
    // NOTE: проверяем, есть ли компонент
    const hashIdx = goAndComponent.indexOf("#");
    if (hashIdx !== -1) {
        // NOTE: если компонент есть, берем только его имя
        const componentName = goAndComponent.substring(hashIdx + 1);
        return SceneManager.get_mesh_id_by_name(componentName);
    } else {
        // NOTE: если нет компонента, берем последний сегмент go-части
        const goPath = goAndComponent;
        const parts = goPath.split("/");
        const lastName = parts[parts.length - 1];
        return SceneManager.get_mesh_id_by_name(lastName);
    }
}

export function id_to_url(id: number): string {
    const mesh = SceneManager.get_mesh_by_id(id);
    if (!mesh) {
        Log.error(`Mesh not found`);
        return '';
    }

    // NOTE: строим путь от корня до текущего объекта
    const path: string[] = [];
    let parent = mesh.parent;
    while (parent && is_base_mesh(parent)) {
        path.push(parent.name);
        parent = parent.parent;
    }
    path.reverse();

    // NOTE: если объект не является компонентом, добавляем его go-часть
    const is_cmp = is_text(mesh) || is_label(mesh) || is_sprite(mesh);
    if (!is_cmp) path.push(mesh.name);

    const goPath = path.join('/');
    return msg.url(undefined, goPath, is_cmp ? mesh.name : undefined);
}

export function get_nested_property(obj: any, path: string): any {
    const parts = path.split('.');
    let current = obj;
    for (const part of parts) {
        if (current === undefined || current === null) return undefined;
        current = current[part];
    }
    return current;
}

export function set_nested_property(obj: any, path: string, value: any): void {
    if (path == 'size') {
        obj.set_size(value.x, value.y);
        return;
    }
    if (path == 'tint') {
        obj.set_color(value);
        if (value.w != undefined)
            obj.set_alpha(value.w);
        return;
    }
    if (path == 'tint.w') {
        obj.set_alpha(value);
        return;
    }
    if (path == 'euler.z') {
        obj.rotation.z = value;
        return;
    }
    const parts = path.split('.');
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (current[part] === undefined || current[part] === null) {
            current[part] = {};
        }
        current = current[part];
    }
    current[parts[parts.length - 1]] = value;
}

export function uh_to_id(uh: string | hash): number {
    if (typeof uh !== 'string' && (uh as any).id != undefined) {
        return (uh as any).id;
    }
    return url_to_id(uh as string);
}