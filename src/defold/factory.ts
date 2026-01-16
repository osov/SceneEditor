import { Component } from "@editor/render_engine/components/container_component";
import { EntityBase } from "@editor/render_engine/objects/entity_base";
import { MultipleMaterialMesh } from "@editor/render_engine/objects/multiple_material_mesh";
import { Slice9Mesh } from "@editor/render_engine/objects/slice9";
import { TextMesh } from "@editor/render_engine/objects/text";
import { Vector3, Quaternion } from "three";
import { get_asset_control } from '@editor/controls/AssetControl';
import { Services } from '@editor/core';

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
        _properties?: unknown,
        scale?: number | vmath.vector3
    ) {
        const result = _create(url, position, rotation, scale);
        if (result == null) return null;
        return Services.scene.get_url_by_id(result.mesh_data.id);
    }

    function _create(
        url: string,
        position?: vmath.vector3,
        rotation?: vmath.quaternion,
        scale?: number | vmath.vector3
    ) {
        if (url.includes('#')) {
            if (url[0] != '/')
                url = '/' + url;
            url = url.split('#').join('/');
            if (!url.includes('.scn'))
                url += '.scn';
        }
        return get_asset_control().loadPartOfSceneInPos(
            url,
            position ? new Vector3().copy(position) : undefined,
            rotation ? new Quaternion().copy(rotation) : undefined,
            scale ? new Vector3().copy(typeof scale === "number" ? new Vector3(scale, scale, scale) : scale) : undefined
        );
    }

    return { create, _create };
}