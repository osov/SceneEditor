import { Vector3, Quaternion } from "three";
import { id_to_url } from "./utils";

declare global {
    namespace factory {
        export function create(url: string, position?: vmath.vector3, rotation?: vmath.quat, scale?: vmath.vector3): number;
    }
}

export function factory_module() {
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
        if (result == null) return null;
        return id_to_url(result.mesh_data.id);
    }

    return { create };
}