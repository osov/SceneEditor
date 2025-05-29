import { vec_to_hex } from "../render_engine/helpers/utils";

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
        obj.set_color(vec_to_hex(value));
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
    return SceneManager.get_mesh_id_by_url(uh as string);
}