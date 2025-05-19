import { Tween } from "@tweenjs/tween.js";
import { TDictionary } from "../modules_editor/modules_editor_const";

declare global {
    const TweenManager: ReturnType<typeof TweenManagerModule>;
}

export function register_tween_manager() {
    (window as any).TweenManager = TweenManagerModule();
}

export function TweenManagerModule() {
    const mesh_properties_to_tween: TDictionary<TDictionary<Tween>> = {};

    function set_mesh_property_tween(id: number, property: string, tween: Tween) {
        if (!mesh_properties_to_tween[id]) mesh_properties_to_tween[id] = {};
        mesh_properties_to_tween[id][property] = tween;
    }

    function remove_mesh_property_tween(id: number, property: string) {
        const properties = mesh_properties_to_tween[id];
        if (!properties) {
            return;
        }
        delete properties[property];
    }

    function remove_all_mesh_properties_tweens(id: number) {
        const properties = mesh_properties_to_tween[id];
        if (!properties) {
            return;
        }
        Object.keys(properties).forEach((property) => delete properties[property]);
    }

    function get_mesh_property_tween(id: number, property: string) {
        const properties = mesh_properties_to_tween[id];
        if (!properties) {
            return null;
        }
        const tween = properties[property];
        if (!tween) {
            return null;
        }
        return tween;
    }

    function get_all_mesh_properties_tweens(id: number) {
        const properties = mesh_properties_to_tween[id];
        if (!properties) {
            return null;
        }
        return Object.values(properties);
    }

    return {
        set_mesh_property_tween,
        remove_mesh_property_tween,
        remove_all_mesh_properties_tweens,
        get_mesh_property_tween,
        get_all_mesh_properties_tweens
    };
}