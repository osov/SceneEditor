import { Component } from "@editor/render_engine/components/container_component";
import { EntityBase } from "@editor/render_engine/objects/entity_base";
import { MultipleMaterialMesh } from "@editor/render_engine/objects/multiple_material_mesh";
import { Slice9Mesh } from "@editor/render_engine/objects/slice9";
import { TextMesh } from "@editor/render_engine/objects/text";
import { Vector3, Quaternion } from "three";
import { load_part_of_scene_in_pos } from "./runtime_stubs";

declare global {
    namespace factory {
        export function create(url: string, position?: vmath.vector3, rotation?: vmath.quaternion, scale?: number | vmath.vector3): string;
        export function _create(url: string, position?: vmath.vector3, rotation?: vmath.quaternion, scale?: number | vmath.vector3):  EntityBase | Slice9Mesh | TextMesh | Component | MultipleMaterialMesh;
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
        const result = _create(url, position, rotation, properties, scale);
        if (result == null) return null;
        return SceneManager.get_mesh_url_by_id(result.mesh_data.id);
    }

    function _create(
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
        return load_part_of_scene_in_pos(
            url,
            position ? new Vector3().copy(position) : undefined,
            rotation ? new Quaternion().copy(rotation) : undefined,
            scale ? new Vector3().copy(typeof scale === "number" ? new Vector3(scale, scale, scale) : scale) : undefined
        );
    }

    return { create, _create };
}