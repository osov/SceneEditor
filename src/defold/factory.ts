import { Vector3, Quaternion } from "three";

declare global {
    namespace factory {
        export function create(url: string, position?: vmath.vector3, rotation?: vmath.quaternion, scale?: number | vmath.vector3): string;
    }
}

export function factory_module() {
    function create(
        url: string,
        position?: vmath.vector3,
        rotation?: vmath.quaternion,
        properties?: any,
        scale?: number | vmath.vector3
    ) {
        if (url.includes('#')) {
            if (url[0] != '/')
                url = '/' + url;
            url = url.split('#').join('/');
            if (!url.includes('.scn'))
                url += '.scn';
        }
        const result = AssetControl.loadPartOfSceneInPos(
            url,
            position ? new Vector3().copy(position) : undefined,
            rotation ? new Quaternion().copy(rotation) : undefined,
            scale ? new Vector3().copy(typeof scale === "number" ? new Vector3(scale, scale, scale) : scale) : undefined
        );
        if (result == null) return null;
        return SceneManager.get_mesh_url_by_id(result.mesh_data.id);
    }

    return { create };
}