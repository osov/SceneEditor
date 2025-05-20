import { IBaseEntityAndThree } from "@editor/render_engine/types";
import { Vector3, Quaternion } from "three";
import { id_to_url } from "./utils";

declare global {
    namespace collectionfactory {
        export function create(url: string, position: vmath.vector3, rotation?: vmath.quat, scale?: vmath.vector3): string[];
    }
}

export function collectionfactory_module() {
    function create(
        url: string,
        position?: vmath.vector3,
        rotation?: vmath.quat,
        properties?: any,
        scale?: vmath.vector3
    ) {
        const result = AssetControl.loadPartOfSceneInPos(
            url,
            position ? new Vector3().copy(position) : undefined,
            rotation ? new Quaternion().copy(rotation) : undefined,
            scale ? new Vector3().copy(scale) : undefined
        );
        if (!result) return null;
        return SceneManager.get_scene_list().filter(obj => {
            return obj.mesh_data.id >= result.mesh_data.id;
        }).map((obj: IBaseEntityAndThree) => id_to_url(obj.mesh_data.id));
    }

    return { create };
}