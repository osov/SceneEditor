import * as TWEEN from '@tweenjs/tween.js';
import { IBaseEntityAndThree, IObjectTypes } from "@editor/render_engine/types";
import { Quaternion, Vector3 } from "three";
import { get_nested_property, set_nested_property, uh_to_id } from "./utils";
import { Slice9Mesh } from '@editor/render_engine/objects/slice9';

declare global {
    namespace go {
        export function set_position(position: vmath.vector3, id: string | hash): void
        export function get_position(id: string | hash): vmath.vector3
        export function set_rotation(rotation: vmath.quaternion, id: string | hash): void
        export function get_rotation(id: string | hash): vmath.quaternion
        export function set_scale(scale: vmath.vector3|number, id: string | hash): void
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
    const PLAYBACK_ONCE_FORWARD = 0;
    const PLAYBACK_ONCE_BACKWARD = 1;
    const PLAYBACK_ONCE_PINGPONG = 2;
    const PLAYBACK_LOOP_FORWARD = 3;
    const PLAYBACK_LOOP_BACKWARD = 4;
    const PLAYBACK_LOOP_PINGPONG = 5;

    const EASING_LINEAR = 0;
    const EASING_INQUAD = 1;
    const EASING_OUTQUAD = 2;
    const EASING_INOUTQUAD = 3;
    const EASING_INCUBIC = 4;
    const EASING_OUTCUBIC = 5;
    const EASING_INOUTCUBIC = 6;
    const EASING_INQUART = 7;
    const EASING_OUTQUART = 8;
    const EASING_INOUTQUART = 9;
    const EASING_INQUINT = 10;
    const EASING_OUTQUINT = 11;
    const EASING_INOUTQUINT = 12;
    const EASING_INSINE = 13;
    const EASING_OUTSINE = 14;
    const EASING_INOUTSINE = 15;
    const EASING_INEXPO = 16;
    const EASING_OUTEXPO = 17;
    const EASING_INOUTEXPO = 18;
    const EASING_INCIRC = 19;
    const EASING_OUTCIRC = 20;
    const EASING_INOUTCIRC = 21;
    const EASING_INELASTIC = 22;
    const EASING_OUTELASTIC = 23;
    const EASING_INOUTELASTIC = 24;
    const EASING_INBACK = 25;
    const EASING_OUTBACK = 26;
    const EASING_INOUTBACK = 27;
    const EASING_INBOUNCE = 28;
    const EASING_OUTBOUNCE = 29;
    const EASING_INOUTBOUNCE = 30;

    const EASING_MAP: Record<string, (k: number) => number> = {
        [EASING_LINEAR]: TWEEN.Easing.Linear.None,
        [EASING_INQUAD]: TWEEN.Easing.Quadratic.In,
        [EASING_OUTQUAD]: TWEEN.Easing.Quadratic.Out,
        [EASING_INOUTQUAD]: TWEEN.Easing.Quadratic.InOut,
        [EASING_INCUBIC]: TWEEN.Easing.Cubic.In,
        [EASING_OUTCUBIC]: TWEEN.Easing.Cubic.Out,
        [EASING_INOUTCUBIC]: TWEEN.Easing.Cubic.InOut,
        [EASING_INQUART]: TWEEN.Easing.Quartic.In,
        [EASING_OUTQUART]: TWEEN.Easing.Quartic.Out,
        [EASING_INOUTQUART]: TWEEN.Easing.Quartic.InOut,
        [EASING_INQUINT]: TWEEN.Easing.Quintic.In,
        [EASING_OUTQUINT]: TWEEN.Easing.Quintic.Out,
        [EASING_INOUTQUINT]: TWEEN.Easing.Quintic.InOut,
        [EASING_INSINE]: TWEEN.Easing.Sinusoidal.In,
        [EASING_OUTSINE]: TWEEN.Easing.Sinusoidal.Out,
        [EASING_INOUTSINE]: TWEEN.Easing.Sinusoidal.InOut,
        [EASING_INEXPO]: TWEEN.Easing.Exponential.In,
        [EASING_OUTEXPO]: TWEEN.Easing.Exponential.Out,
        [EASING_INOUTEXPO]: TWEEN.Easing.Exponential.InOut,
        [EASING_INCIRC]: TWEEN.Easing.Circular.In,
        [EASING_OUTCIRC]: TWEEN.Easing.Circular.Out,
        [EASING_INOUTCIRC]: TWEEN.Easing.Circular.InOut,
        [EASING_INELASTIC]: TWEEN.Easing.Elastic.In,
        [EASING_OUTELASTIC]: TWEEN.Easing.Elastic.Out,
        [EASING_INOUTELASTIC]: TWEEN.Easing.Elastic.InOut,
        [EASING_INBACK]: TWEEN.Easing.Back.In,
        [EASING_OUTBACK]: TWEEN.Easing.Back.Out,
        [EASING_INOUTBACK]: TWEEN.Easing.Back.InOut,
        [EASING_INBOUNCE]: TWEEN.Easing.Bounce.In,
        [EASING_OUTBOUNCE]: TWEEN.Easing.Bounce.Out,
        [EASING_INOUTBOUNCE]: TWEEN.Easing.Bounce.InOut,
    };

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

    function set_scale(scale: vmath.vector3|number, id: string | hash) {
        const mesh = SceneManager.get_mesh_by_id(uh_to_id(id));
        if (!mesh) {
            Log.error(`Mesh with url ${id} not found`);
            return;
        }
        if (mesh.type != IObjectTypes.GO_CONTAINER) {
            Log.error(`Mesh with id ${id} is not go`);
            return;
        }
        if ( typeof scale === 'number') {
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
        if (mesh.type != IObjectTypes.GO_CONTAINER) {
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

    function applyPlayback(tween: TWEEN.Tween, playback: any) {
        switch (playback) {
            case PLAYBACK_ONCE_PINGPONG:
                tween.yoyo(true).repeat(1);
                break;
            case PLAYBACK_LOOP_FORWARD:
                tween.repeat(Infinity);
                break;
            case PLAYBACK_LOOP_BACKWARD:
                tween.repeat(Infinity);
                break;
            case PLAYBACK_LOOP_PINGPONG:
                tween.yoyo(true).repeat(Infinity);
                break;
        }
    }

    // NOTE: важно что для полей материала не поддерживается передача c доступом через '.'
    // если нужно к примеру передать vector, то нужно передавать целиком
    // pos.x - выдаст что поле не найдено
    // pos - верно
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
        if (property == 'tint.w')
            property = 'alpha';

        const mesh_id = uh_to_id(url);
        const mesh = SceneManager.get_mesh_by_id(mesh_id);
        if (!mesh) {
            Log.error(`Mesh with url ${url} not found`);
            return;
        }

        let is_material_property = false;
        let currentValue = get_nested_property(mesh, property);
        if (currentValue == undefined) {
            is_material_property = true;
            const material = (mesh as any).material;
            if (material) currentValue = material.uniforms[property]?.value;
            if (currentValue == undefined) {
                Log.error(`Property ${property} not found on mesh`);
                return;
            }
        }

        const is_backward = playback == go.PLAYBACK_ONCE_BACKWARD || playback == go.PLAYBACK_LOOP_BACKWARD;
        const obj = { value: is_backward ? to : currentValue };
        const tween = new TWEEN.Tween(obj)
            .to({ value: is_backward ? currentValue : to }, duration * 1000)
            .onUpdate(() => {
                if (is_material_property) {
                    ResourceManager.set_material_uniform_for_mesh(mesh as Slice9Mesh, property, obj.value);
                    return;
                }
                set_nested_property(mesh, property, obj.value);
            })
            .delay(delay * 1000)
            .easing(EASING_MAP[easing] ?? TWEEN.Easing.Linear.None)
            .onComplete((_: { [key: string]: any }) => {
                TweenManager.remove_mesh_property_tween(mesh_id, property);
                if (complete_function) complete_function(mesh, url, property);
            });
        applyPlayback(tween, playback);
        TweenManager.set_mesh_property_tween(mesh_id, property, tween);
        tween.start();
    }

    function cancel_animations(url: string | hash, property?: string) {
        const mesh_id = uh_to_id(url);
        const mesh = SceneManager.get_mesh_by_id(mesh_id);
        if (!mesh) {
            Log.error(`Mesh with url ${url} not found`);
            return;
        }
        if (property == 'tint.w')
            property = 'alpha';
        if (property) TweenManager.remove_mesh_property_tween(mesh_id, property);
        else TweenManager.remove_all_mesh_properties_tweens(mesh_id);
    }

    return {
        set_position, get_position, set_rotation, get_rotation,
        set_scale, get_scale, set_parent, get_parent,
        get_world_position, get_world_rotation, get_world_scale,
        delete: _delete, get, set, animate, cancel_animations,

        PLAYBACK_ONCE_FORWARD, PLAYBACK_ONCE_BACKWARD, PLAYBACK_ONCE_PINGPONG,
        PLAYBACK_LOOP_FORWARD, PLAYBACK_LOOP_BACKWARD, PLAYBACK_LOOP_PINGPONG,
        EASING_LINEAR, EASING_INQUAD, EASING_OUTQUAD, EASING_INOUTQUAD,
        EASING_INCUBIC, EASING_OUTCUBIC, EASING_INOUTCUBIC,
        EASING_INQUART, EASING_OUTQUART, EASING_INOUTQUART,
        EASING_INQUINT, EASING_OUTQUINT, EASING_INOUTQUINT,
        EASING_INSINE, EASING_OUTSINE, EASING_INOUTSINE,
        EASING_INEXPO, EASING_OUTEXPO, EASING_INOUTEXPO,
        EASING_INCIRC, EASING_OUTCIRC, EASING_INOUTCIRC,
        EASING_INELASTIC, EASING_OUTELASTIC, EASING_INOUTELASTIC,
        EASING_INBACK, EASING_OUTBACK, EASING_INOUTBACK,
        EASING_INBOUNCE, EASING_OUTBOUNCE, EASING_INOUTBOUNCE
    };
}