import { Tween, Group } from "@tweenjs/tween.js";
import { TDictionary } from "../modules_editor/modules_editor_const";
import { Services } from '@editor/core';

/** Тип TweenManager */
export type TweenManagerType = ReturnType<typeof TweenManagerModule>;

/** Модульный instance для использования через импорт */
let tween_manager_instance: TweenManagerType | undefined;

/** Получить instance TweenManager */
export function get_tween_manager(): TweenManagerType {
    if (tween_manager_instance === undefined) {
        throw new Error('TweenManager не инициализирован. Вызовите register_tween_manager() сначала.');
    }
    return tween_manager_instance;
}

export function register_tween_manager() {
    tween_manager_instance = TweenManagerModule();
}

export function TweenManagerModule() {
    const group = new Group();
    const mesh_properties_to_tween: TDictionary<TDictionary<Tween>> = {};

    function init() {
        Services.event_bus.on('SYS_ON_UPDATE', () => {
            group.update();
        });
    }

    function set_mesh_property_tween(id: number, property: string, tween: Tween) {
        if (!mesh_properties_to_tween[id]) mesh_properties_to_tween[id] = {};
        mesh_properties_to_tween[id][property] = tween;
        group.add(tween);
    }

    function remove_mesh_property_tween(id: number, property: string) {
        const properties = mesh_properties_to_tween[id];
        if (!properties) {
            return;
        }
        if (!properties[property]) {
            Services.logger.warn(`Tween for property ${property} not found`);
            return;
        }
        properties[property].remove();
        group.remove(properties[property]);
        delete properties[property];
    }

    function remove_all_mesh_properties_tweens(id: number) {
        const properties = mesh_properties_to_tween[id];
        if (!properties) {
            return;
        }
        Object.keys(properties).forEach((property) => {
            if (!properties[property]) {
                Services.logger.error(`Tween for property ${property} not found`);
                return;
            }
            properties[property].remove();
            group.remove(properties[property]);
            delete properties[property]
        });
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

    init();
    return {
        set_mesh_property_tween,
        remove_mesh_property_tween,
        remove_all_mesh_properties_tweens,
        get_mesh_property_tween,
        get_all_mesh_properties_tweens
    };
}