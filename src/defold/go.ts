import { IBaseEntityAndThree, IObjectTypes } from "@editor/render_engine/types";
import { Quaternion, Vector3 } from "three";
import { animate_logic, cancel_animations_logic, get_nested_property, PLAYBACK_LOOP_BACKWARD, PLAYBACK_LOOP_FORWARD, PLAYBACK_ONCE_BACKWARD, PLAYBACK_ONCE_FORWARD, PLAYBACK_ONCE_PINGPONG, PLAYBACK_LOOP_PINGPONG, set_nested_property, uh_to_id, EASING_LINEAR, EASING_INQUART, EASING_INQUAD, EASING_OUTQUART, EASING_OUTQUAD, EASING_OUTQUINT, EASING_INOUTQUAD, EASING_INQUINT, EASING_INOUTQUART, EASING_INOUTQUINT, EASING_OUTCUBIC, EASING_INOUTCUBIC, EASING_OUTSINE, EASING_INSINE, EASING_INCUBIC, EASING_INOUTSINE, EASING_OUTCIRC, EASING_INOUTCIRC, EASING_INOUTEXPO, EASING_INCIRC, EASING_OUTBACK, EASING_INBACK, EASING_INOUTELASTIC, EASING_INOUTBACK, EASING_INEXPO, EASING_OUTEXPO, EASING_INELASTIC, EASING_OUTELASTIC, EASING_INBOUNCE, EASING_OUTBOUNCE, EASING_INOUTBOUNCE } from "./utils";

declare global {
    namespace go {
        export function set_position(position: vmath.vector3, id: string | hash): void
        export function get_position(id: string | hash): vmath.vector3
        export function set_rotation(rotation: vmath.quaternion, id: string | hash): void
        export function get_rotation(id: string | hash): vmath.quaternion
        export function set_scale(scale: vmath.vector3 | number, id: string | hash): void
        export function get_scale(id: string | hash): vmath.vector3
        export function set_parent(id: string | hash, parent_id: string | hash): void
        export function get_parent(id: string | hash): hash
        export function get_world_position(id: string | hash): vmath.vector3
        export function get_world_rotation(id: string | hash): vmath.quaternion
        export function get_world_scale(id: string | hash): vmath.vector3
        export function get(url: string | hash, property: string, options?: any): any
        export function set(url: string | hash, property: string, value: any, options?: any): void
        function _delete(id: string | hash, recursive?: boolean): void; export { _delete as delete }
        export function animate(url: string | hash, property: string, playback: any, to: number | vmath.vector3 | vmath.quaternion, easing: any, duration: number, delay?: number, complete_function?: (self: IBaseEntityAndThree, url: string | hash, property: string) => void): void
        export function cancel_animations(url: string | hash, property?: string): void

        export const PLAYBACK_ONCE_FORWARD: any;
        export const PLAYBACK_ONCE_BACKWARD: any;
        export const PLAYBACK_ONCE_PINGPONG: any;
        export const PLAYBACK_LOOP_FORWARD: any;
        export const PLAYBACK_LOOP_BACKWARD: any;
        export const PLAYBACK_LOOP_PINGPONG: any;

        export const EASING_LINEAR: any;
        export const EASING_INQUAD: any;
        export const EASING_OUTQUAD: any;
        export const EASING_INOUTQUAD: any;
        export const EASING_INCUBIC: any;
        export const EASING_OUTCUBIC: any;
        export const EASING_INOUTCUBIC: any;
        export const EASING_INQUART: any;
        export const EASING_OUTQUART: any;
        export const EASING_INOUTQUART: any;
        export const EASING_INQUINT: any;
        export const EASING_OUTQUINT: any;
        export const EASING_INOUTQUINT: any;
        export const EASING_INSINE: any;
        export const EASING_OUTSINE: any;
        export const EASING_INOUTSINE: any;
        export const EASING_INEXPO: any;
        export const EASING_OUTEXPO: any;
        export const EASING_INOUTEXPO: any;
        export const EASING_INCIRC: any;
        export const EASING_OUTCIRC: any;
        export const EASING_INOUTCIRC: any;
        export const EASING_INELASTIC: any;
        export const EASING_OUTELASTIC: any;
        export const EASING_INOUTELASTIC: any;
        export const EASING_INBACK: any;
        export const EASING_OUTBACK: any;
        export const EASING_INOUTBACK: any;
        export const EASING_INBOUNCE: any;
        export const EASING_OUTBOUNCE: any;
        export const EASING_INOUTBOUNCE: any;
    }
}

export function go_module() {
    function set_position(position: vmath.vector3, id: string | hash) {
        const mesh = SceneManager.get_mesh_by_id(uh_to_id(id));
        if (!mesh) {
            Log.error(`Mesh with url ${id} not found`);
            return;
        }
        if (mesh.type != IObjectTypes.GO_CONTAINER) {
            Log.error(`Mesh with id ${id} is not go`);
            return;
        }
        mesh.position.copy(position);
    }

    function get_position(id: string | hash) {
        const mesh = SceneManager.get_mesh_by_id(uh_to_id(id));
        if (!mesh) {
            Log.error(`Mesh with url ${id} not found`);
            return null;
        }
        if (mesh.type != IObjectTypes.GO_CONTAINER) {
            Log.error(`Mesh with id ${id} is not go`);
            return null;
        }
        return vmath.vector3(...mesh.position.toArray());
    }

    function set_rotation(rotation: vmath.quaternion, id: string | hash) {
        const mesh = SceneManager.get_mesh_by_id(uh_to_id(id));
        if (!mesh) {
            Log.error(`Mesh with url ${id} not found`);
            return;
        }
        if (mesh.type != IObjectTypes.GO_CONTAINER) {
            Log.error(`Mesh with id ${id} is not go`);
            return;
        }
        mesh.rotation.setFromQuaternion(new Quaternion(rotation.x, rotation.y, rotation.z, rotation.w));
    }

    function get_rotation(id: string | hash) {
        const mesh = SceneManager.get_mesh_by_id(uh_to_id(id));
        if (!mesh) {
            Log.error(`Mesh with url ${id} not found`);
            return null;
        }
        if (mesh.type != IObjectTypes.GO_CONTAINER) {
            Log.error(`Mesh with id ${id} is not go`);
            return null;
        }
        const euler = mesh.rotation;
        return vmath.euler_to_quat(euler.x, euler.y, euler.z);
    }

    function set_scale(scale: vmath.vector3 | number, id: string | hash) {
        const mesh = SceneManager.get_mesh_by_id(uh_to_id(id));
        if (!mesh) {
            Log.error(`Mesh with url ${id} not found`);
            return;
        }
        if (mesh.type != IObjectTypes.GO_CONTAINER) {
            Log.error(`Mesh with id ${id} is not go`);
            return;
        }
        if (typeof scale === 'number') {
            scale = vmath.vector3(scale, scale, scale);
        }
        mesh.scale.copy(scale);
    }

    function get_scale(id: string | hash) {
        const mesh = SceneManager.get_mesh_by_id(uh_to_id(id));
        if (!mesh) {
            Log.error(`Mesh with url ${id} not found`);
            return null;
        }
        if (mesh.type != IObjectTypes.GO_CONTAINER) {
            Log.error(`Mesh with id ${id} is not go`);
            return null;
        }
        return vmath.vector3(...mesh.scale.toArray());
    }

    function set_parent(id: string | hash, parent_id: string | hash) {
        const mesh = SceneManager.get_mesh_by_id(uh_to_id(id));
        const parent = SceneManager.get_mesh_by_id(uh_to_id(parent_id));
        if (!mesh) {
            Log.error(`Mesh with url ${id} not found`);
            return;
        }
        if (mesh.type != IObjectTypes.GO_CONTAINER) {
            Log.error(`Mesh with id ${id} is not go`);
            return;
        }
        if (!parent) {
            Log.error(`Parent mesh with url ${parent_id} not found`);
            return;
        }
        if (parent.type != IObjectTypes.GO_CONTAINER) {
            Log.error(`Parent mesh with id ${parent_id} is not go`);
            return;
        }
        mesh.parent = parent;
    }

    function get_parent(id: string | hash) {
        const mesh = SceneManager.get_mesh_by_id(uh_to_id(id));
        if (!mesh) {
            Log.error(`Mesh with url ${id} not found`);
            return null;
        }
        if (mesh.type != IObjectTypes.GO_CONTAINER) {
            Log.error(`Mesh with id ${id} is not go`);
            return null;
        }
        return mesh.parent ? SceneManager.get_mesh_url_by_id(mesh.parent.id) : null;
    }

    function get_world_position(id: string | hash) {
        const mesh = SceneManager.get_mesh_by_id(uh_to_id(id));
        if (!mesh) {
            Log.error(`Mesh with url ${id} not found`);
            return null;
        }
        // TODO: нужно убрать, но пока нужно для аудио компонентa, в теории можно брать из обьекта родителя
        if (![IObjectTypes.GO_CONTAINER, IObjectTypes.GO_AUDIO_COMPONENT].includes(mesh.type)) {
            Log.error(`Mesh with id ${id} is not go`);
            return null;
        }
        const worldPosition = mesh.getWorldPosition(new Vector3());
        return vmath.vector3(...worldPosition.toArray());
    }

    function get_world_rotation(id: string | hash) {
        const mesh = SceneManager.get_mesh_by_id(uh_to_id(id));
        if (!mesh) {
            Log.error(`Mesh with url ${id} not found`);
            return null;
        }
        if (mesh.type != IObjectTypes.GO_CONTAINER) {
            Log.error(`Mesh with id ${id} is not go`);
            return null;
        }
        const worldRotation = mesh.rotation;
        return vmath.euler_to_quat(worldRotation.x, worldRotation.y, worldRotation.z);
    }

    function get_world_scale(id: string | hash) {
        const mesh = SceneManager.get_mesh_by_id(uh_to_id(id));
        if (!mesh) {
            Log.error(`Mesh with url ${id} not found`);
            return null;
        }
        if (mesh.type != IObjectTypes.GO_CONTAINER) {
            Log.error(`Mesh with id ${id} is not go`);
            return null;
        }
        const worldScale = mesh.getWorldScale(new Vector3());
        return vmath.vector3(...worldScale.toArray());
    }

    function _delete(id: string | hash, recursive?: boolean) {
        const mesh = SceneManager.get_mesh_by_id(uh_to_id(id));
        if (!mesh) {
            Log.error(`Mesh with url ${id} not found`);
            return;
        }
        if (mesh.type != IObjectTypes.GO_CONTAINER) {
            Log.error(`Mesh with id ${id} is not go`);
            return;
        }
        SceneManager.remove(uh_to_id(id));
    }

    function get(url: string | hash, property: string, options?: any) {
        const mesh = SceneManager.get_mesh_by_id(uh_to_id(url));
        if (!mesh) {
            Log.error(`Mesh with url ${url} not found`);
            return null;
        }
        return get_nested_property(mesh, property);
    }

    function set(url: string | hash, property: string, value: any, options?: any) {
        const mesh = SceneManager.get_mesh_by_id(uh_to_id(url));
        if (!mesh) {
            Log.error(`Mesh with url ${url} not found`);
            return;
        }
        if (['position', 'rotation', 'scale', 'euler.z'].includes(property) && mesh.type != IObjectTypes.GO_CONTAINER) {
            Log.error(`Mesh with id ${url} is not go property:`, property);
            return;
        }
        set_nested_property(mesh, property, value);
    }

    function animate(
        url: string | hash,
        property: string,
        playback: any,
        to: number | vmath.vector3 | vmath.quaternion,
        easing: any,
        duration: number,
        delay: number = 0,
        complete_function?: (self: IBaseEntityAndThree, url: string | hash, property: string) => void
    ) {
        const mesh_id = uh_to_id(url);
        const mesh = SceneManager.get_mesh_by_id(mesh_id);
        if (!mesh) {
            Log.error(`Mesh with url ${url} not found`);
            return;
        }
        animate_logic(mesh, property, playback, to, easing, duration, delay, () => {
            if (complete_function) complete_function(mesh, url, property);
        });
    }

    function cancel_animations(url: string | hash, property?: string) {
        const mesh_id = uh_to_id(url);
        const mesh = SceneManager.get_mesh_by_id(mesh_id);
        if (!mesh) {
            Log.error(`Mesh with url ${url} not found`);
            return;
        }
        cancel_animations_logic(mesh, property);
    }

    return {
        set_position,
        get_position,
        set_rotation,
        get_rotation,
        set_scale,
        get_scale,
        set_parent,
        get_parent,
        get_world_position,
        get_world_rotation,
        get_world_scale,
        delete: _delete,
        get,
        set,
        animate,
        cancel_animations,

        PLAYBACK_ONCE_FORWARD,
        PLAYBACK_ONCE_BACKWARD,
        PLAYBACK_ONCE_PINGPONG,
        PLAYBACK_LOOP_FORWARD,
        PLAYBACK_LOOP_BACKWARD,
        PLAYBACK_LOOP_PINGPONG,
        EASING_LINEAR,
        EASING_INQUAD,
        EASING_OUTQUAD,
        EASING_INOUTQUAD,
        EASING_INCUBIC,
        EASING_OUTCUBIC,
        EASING_INOUTCUBIC,
        EASING_INQUART,
        EASING_OUTQUART,
        EASING_INOUTQUART,
        EASING_INQUINT,
        EASING_OUTQUINT,
        EASING_INOUTQUINT,
        EASING_INSINE,
        EASING_OUTSINE,
        EASING_INOUTSINE,
        EASING_INEXPO,
        EASING_OUTEXPO,
        EASING_INOUTEXPO,
        EASING_INCIRC,
        EASING_OUTCIRC,
        EASING_INOUTCIRC,
        EASING_INELASTIC,
        EASING_OUTELASTIC,
        EASING_INOUTELASTIC,
        EASING_INBACK,
        EASING_OUTBACK,
        EASING_INOUTBACK,
        EASING_INBOUNCE,
        EASING_OUTBOUNCE,
        EASING_INOUTBOUNCE
    };
}