import { IBaseEntityAndThree, IBaseMeshAndThree, IObjectTypes } from "@editor/render_engine/types";
import { Quaternion, Vector3 } from "three";
import {
    animate_logic, cancel_animations_logic, uh_to_id,
    get_nested_property, set_nested_property,
    PLAYBACK_LOOP_BACKWARD, PLAYBACK_LOOP_FORWARD, PLAYBACK_ONCE_BACKWARD,
    PLAYBACK_ONCE_FORWARD, PLAYBACK_ONCE_PINGPONG, PLAYBACK_LOOP_PINGPONG,
    EASING_LINEAR, EASING_INQUART, EASING_INQUAD, EASING_OUTQUART, EASING_OUTQUAD,
    EASING_OUTQUINT, EASING_INOUTQUAD, EASING_INQUINT, EASING_INOUTQUART,
    EASING_INOUTQUINT, EASING_OUTCUBIC, EASING_INOUTCUBIC, EASING_OUTSINE,
    EASING_INSINE, EASING_INCUBIC, EASING_INOUTSINE, EASING_OUTCIRC, EASING_INOUTCIRC,
    EASING_INOUTEXPO, EASING_INCIRC, EASING_OUTBACK, EASING_INBACK, EASING_INOUTELASTIC,
    EASING_INOUTBACK, EASING_INEXPO, EASING_OUTEXPO, EASING_INELASTIC, EASING_OUTELASTIC,
    EASING_INBOUNCE, EASING_OUTBOUNCE, EASING_INOUTBOUNCE,
    type PlaybackMode, type EasingType
} from "./utils";
import { Services } from '@editor/core';
import { get_audio_manager } from "@editor/render_engine/AudioManager";

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
        export function get(url: string | hash, property: string, options?: unknown): unknown
        export function set(url: string | hash, property: string, value: unknown, options?: unknown): void
        function _delete(id: string | hash, recursive?: boolean): void; export { _delete as delete }
        export function animate(url: string | hash, property: string, playback: PlaybackMode, to: number | vmath.vector3 | vmath.quaternion, easing: EasingType, duration: number, delay?: number, complete_function?: (self: IBaseEntityAndThree, url: string | hash, property: string) => void): void
        export function cancel_animations(url: string | hash, property?: string): void

        export const PLAYBACK_ONCE_FORWARD: PlaybackMode;
        export const PLAYBACK_ONCE_BACKWARD: PlaybackMode;
        export const PLAYBACK_ONCE_PINGPONG: PlaybackMode;
        export const PLAYBACK_LOOP_FORWARD: PlaybackMode;
        export const PLAYBACK_LOOP_BACKWARD: PlaybackMode;
        export const PLAYBACK_LOOP_PINGPONG: PlaybackMode;

        export const EASING_LINEAR: EasingType;
        export const EASING_INQUAD: EasingType;
        export const EASING_OUTQUAD: EasingType;
        export const EASING_INOUTQUAD: EasingType;
        export const EASING_INCUBIC: EasingType;
        export const EASING_OUTCUBIC: EasingType;
        export const EASING_INOUTCUBIC: EasingType;
        export const EASING_INQUART: EasingType;
        export const EASING_OUTQUART: EasingType;
        export const EASING_INOUTQUART: EasingType;
        export const EASING_INQUINT: EasingType;
        export const EASING_OUTQUINT: EasingType;
        export const EASING_INOUTQUINT: EasingType;
        export const EASING_INSINE: EasingType;
        export const EASING_OUTSINE: EasingType;
        export const EASING_INOUTSINE: EasingType;
        export const EASING_INEXPO: EasingType;
        export const EASING_OUTEXPO: EasingType;
        export const EASING_INOUTEXPO: EasingType;
        export const EASING_INCIRC: EasingType;
        export const EASING_OUTCIRC: EasingType;
        export const EASING_INOUTCIRC: EasingType;
        export const EASING_INELASTIC: EasingType;
        export const EASING_OUTELASTIC: EasingType;
        export const EASING_INOUTELASTIC: EasingType;
        export const EASING_INBACK: EasingType;
        export const EASING_OUTBACK: EasingType;
        export const EASING_INOUTBACK: EasingType;
        export const EASING_INBOUNCE: EasingType;
        export const EASING_OUTBOUNCE: EasingType;
        export const EASING_INOUTBOUNCE: EasingType;
    }
}

export function go_module() {
    function set_position(position: vmath.vector3, id: string | hash) {
        const mesh = Services.scene.get_by_id(uh_to_id(id));
        if (!mesh) {
            Services.logger.error(`Mesh with url ${id} not found`);
            return;
        }
        if (mesh.type != IObjectTypes.GO_CONTAINER) {
            Services.logger.error(`Mesh with id ${id} is not go`);
            return;
        }
        mesh.position.copy(position);
    }

    function get_position(id: string | hash) {
        const mesh = Services.scene.get_by_id(uh_to_id(id));
        if (!mesh) {
            Services.logger.error(`Mesh with url ${id} not found`);
            return null;
        }
        if (mesh.type != IObjectTypes.GO_CONTAINER) {
            Services.logger.error(`Mesh with id ${id} is not go`);
            return null;
        }
        return vmath.vector3(...mesh.position.toArray());
    }

    function set_rotation(rotation: vmath.quaternion, id: string | hash) {
        const mesh = Services.scene.get_by_id(uh_to_id(id));
        if (!mesh) {
            Services.logger.error(`Mesh with url ${id} not found`);
            return;
        }
        if (mesh.type != IObjectTypes.GO_CONTAINER) {
            Services.logger.error(`Mesh with id ${id} is not go`);
            return;
        }
        mesh.rotation.setFromQuaternion(new Quaternion(rotation.x, rotation.y, rotation.z, rotation.w));
    }

    function get_rotation(id: string | hash) {
        const mesh = Services.scene.get_by_id(uh_to_id(id));
        if (!mesh) {
            Services.logger.error(`Mesh with url ${id} not found`);
            return null;
        }
        if (mesh.type != IObjectTypes.GO_CONTAINER) {
            Services.logger.error(`Mesh with id ${id} is not go`);
            return null;
        }
        const euler = mesh.rotation;
        return vmath.euler_to_quat(euler.x, euler.y, euler.z);
    }

    function set_scale(scale: vmath.vector3 | number, id: string | hash) {
        const mesh = Services.scene.get_by_id(uh_to_id(id));
        if (!mesh) {
            Services.logger.error(`Mesh with url ${id} not found`);
            return;
        }
        if (mesh.type != IObjectTypes.GO_CONTAINER) {
            Services.logger.error(`Mesh with id ${id} is not go`);
            return;
        }
        if (typeof scale === 'number') {
            scale = vmath.vector3(scale, scale, scale);
        }
        mesh.scale.copy(scale);
    }

    function get_scale(id: string | hash) {
        const mesh = Services.scene.get_by_id(uh_to_id(id));
        if (!mesh) {
            Services.logger.error(`Mesh with url ${id} not found`);
            return null;
        }
        if (mesh.type != IObjectTypes.GO_CONTAINER) {
            Services.logger.error(`Mesh with id ${id} is not go`);
            return null;
        }
        return vmath.vector3(...mesh.scale.toArray());
    }

    function set_parent(id: string | hash, parent_id: string | hash) {
        const mesh = Services.scene.get_by_id(uh_to_id(id));
        const parent = Services.scene.get_by_id(uh_to_id(parent_id));
        if (!mesh) {
            Services.logger.error(`Mesh with url ${id} not found`);
            return;
        }
        if (mesh.type != IObjectTypes.GO_CONTAINER) {
            Services.logger.error(`Mesh with id ${id} is not go`);
            return;
        }
        if (!parent) {
            Services.logger.error(`Parent mesh with url ${parent_id} not found`);
            return;
        }
        if (parent.type != IObjectTypes.GO_CONTAINER) {
            Services.logger.error(`Parent mesh with id ${parent_id} is not go`);
            return;
        }
        mesh.parent = parent;
    }

    function get_parent(id: string | hash) {
        const mesh = Services.scene.get_by_id(uh_to_id(id));
        if (!mesh) {
            Services.logger.error(`Mesh with url ${id} not found`);
            return null;
        }
        if (mesh.type != IObjectTypes.GO_CONTAINER) {
            Services.logger.error(`Mesh with id ${id} is not go`);
            return null;
        }
        return mesh.parent ? Services.scene.get_url_by_id(mesh.parent.id) : null;
    }

    function get_world_position(id: string | hash) {
        const mesh = Services.scene.get_by_id(uh_to_id(id));
        if (!mesh) {
            Services.logger.error(`Mesh with url ${id} not found`);
            return null;
        }

        let targetMesh = mesh;
        if (mesh.type != IObjectTypes.GO_CONTAINER) {
            let parent = mesh.parent as IBaseMeshAndThree;
            let foundGo = false;
            while (parent) {
                if (parent.type === IObjectTypes.GO_CONTAINER) {
                    targetMesh = parent;
                    foundGo = true;
                    break;
                }
                parent = parent.parent as IBaseMeshAndThree;
            }
            if (!foundGo) targetMesh = mesh;
        }

        const worldPosition = targetMesh.getWorldPosition(new Vector3());
        return vmath.vector3(...worldPosition.toArray());
    }

    function get_world_rotation(id: string | hash) {
        const mesh = Services.scene.get_by_id(uh_to_id(id));
        if (!mesh) {
            Services.logger.error(`Mesh with url ${id} not found`);
            return null;
        }
        if (mesh.type != IObjectTypes.GO_CONTAINER) {
            Services.logger.error(`Mesh with id ${id} is not go`);
            return null;
        }
        const worldRotation = mesh.rotation;
        return vmath.euler_to_quat(worldRotation.x, worldRotation.y, worldRotation.z);
    }

    function get_world_scale(id: string | hash) {
        const mesh = Services.scene.get_by_id(uh_to_id(id));
        if (!mesh) {
            Services.logger.error(`Mesh with url ${id} not found`);
            return null;
        }
        if (mesh.type != IObjectTypes.GO_CONTAINER) {
            Services.logger.error(`Mesh with id ${id} is not go`);
            return null;
        }
        const worldScale = mesh.getWorldScale(new Vector3());
        return vmath.vector3(...worldScale.toArray());
    }

    function _delete(id: string | hash, _recursive?: boolean) {
        const mesh = Services.scene.get_by_id(uh_to_id(id));
        if (!mesh) {
            Services.logger.error(`Mesh with url ${id} not found`);
            return;
        }
        if (mesh.type != IObjectTypes.GO_CONTAINER) {
            Services.logger.error(`Mesh with id ${id} is not go`);
            return;
        }
        Services.scene.remove_by_id(uh_to_id(id));
    }

    function get(url: string | hash, property: string, _options?: unknown) {
        const mesh = Services.scene.get_by_id(uh_to_id(url));
        if (!mesh) {
            Services.logger.error(`Mesh with url ${url} not found`);
            return null;
        }
        if (property == 'gain') {
            const id = uh_to_id(url);
            return get_audio_manager().get_volume(id);
        }
        if (property == 'pan') {
            const id = uh_to_id(url);
            return get_audio_manager().get_pan(id);
        }
        if (property == 'speed') {
            const id = uh_to_id(url);
            return get_audio_manager().get_speed(id);
        }
        return get_nested_property(mesh as IBaseEntityAndThree, property);
    }

    function set(url: string | hash, property: string, value: unknown, _options?: unknown) {
        const mesh = Services.scene.get_by_id(uh_to_id(url));
        if (!mesh) {
            Services.logger.error(`Mesh with url ${url} not found`);
            return;
        }
        if (['position', 'rotation', 'scale', 'euler.z'].includes(property) && mesh.type != IObjectTypes.GO_CONTAINER) {
            Services.logger.error(`Mesh with id ${url} is not go property:`, property);
            return;
        }
        if (property == 'speed') {
            const id = uh_to_id(url);
            get_audio_manager().set_speed(id, value as number);
            return;
        }
        set_nested_property(mesh as IBaseEntityAndThree, property, value);
    }

    function animate(
        url: string | hash,
        property: string,
        playback: PlaybackMode,
        to: number | vmath.vector3 | vmath.quaternion,
        easing: EasingType,
        duration: number,
        delay: number = 0,
        complete_function?: (self: IBaseEntityAndThree, url: string | hash, property: string) => void
    ) {
        const mesh_id = uh_to_id(url);
        const mesh = Services.scene.get_by_id(mesh_id);
        if (!mesh) {
            Services.logger.error(`Mesh with url ${url} not found`);
            return;
        }
        animate_logic(mesh as IBaseEntityAndThree, property, playback, to, easing, duration, delay, () => {
            if (complete_function) complete_function(mesh as IBaseEntityAndThree, url, property);
        });
    }

    function cancel_animations(url: string | hash, property?: string) {
        const mesh_id = uh_to_id(url);
        const mesh = Services.scene.get_by_id(mesh_id);
        if (!mesh) {
            Services.logger.error(`Mesh with url ${url} not found`);
            return;
        }
        cancel_animations_logic(mesh as IBaseEntityAndThree, property);
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