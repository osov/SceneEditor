import { IBaseEntityAndThree } from "@editor/render_engine/types";
import { Vector3, Quaternion } from "three";
import { id_to_url } from "./utils";

declare global {
    namespace collectionfactory {
        export function create(url: string, position: vmath.vector3, rotation?: vmath.quaternion, scale?: vmath.vector3): string[];
    }
}

export function collectionfactory_module() {
    function create(
        url: string,
        position?: vmath.vector3,
        rotation?: vmath.quaternion,
        properties?: any,
        scale?: vmath.vector3
    ) {
        const part = AssetControl.loadPartOfSceneInPos(
            url,
            position ? new Vector3().copy(position) : undefined,
            rotation ? new Quaternion().copy(rotation) : undefined,
            scale ? new Vector3().copy(scale) : undefined
        );
        if (!part) return null;
        const result: { [key: string]: hash } = {};
        SceneManager.get_scene_list().filter(obj => {
            return obj.mesh_data.id >= part.mesh_data.id;
        }).forEach((obj: IBaseEntityAndThree) => {
            const name = obj.name;
            const id = obj.mesh_data.id;
            result['/' + name] = { id } as hash;
        });
        return result;
    }

    return { create };
}