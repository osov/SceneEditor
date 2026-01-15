import { IBaseEntityAndThree, IObjectTypes } from "@editor/render_engine/types";
import { Vector3, Quaternion } from "three";
import { load_part_of_scene_in_pos } from "./runtime_stubs";

declare global {
    namespace collectionfactory {
        export function create(url: string, position: vmath.vector3, rotation?: vmath.quaternion, scale?: vmath.vector3): { [key: string]: hash };
    }
}

export function collectionfactory_module() {
    function create(
        url: string,
        position?: vmath.vector3,
        rotation?: vmath.quaternion,
        _properties?: unknown,
        scale?: vmath.vector3
    ) {
        const part = load_part_of_scene_in_pos(
            url,
            position ? new Vector3().copy(position) : undefined,
            rotation ? new Quaternion().copy(rotation) : undefined,
            scale ? new Vector3().copy(scale) : undefined
        );
        if (!part) return null;

        const objects: IBaseEntityAndThree[] = [];
        const stack: IBaseEntityAndThree[] = [part];
        while (stack.length > 0) {
            const current = stack.pop()!;
            if (current.type == IObjectTypes.GO_CONTAINER) {
                objects.push(current);
            }
            current.children.forEach(child => {
                stack.push(child as IBaseEntityAndThree);
            });
        }

        const result: { [key: string]: hash } = {};
        objects.forEach((obj: IBaseEntityAndThree) => {
            const name = obj.name;
            const id = obj.mesh_data.id;
            result['/' + name] = { id } as hash;
        });
        return result;
    }

    return { create };
}