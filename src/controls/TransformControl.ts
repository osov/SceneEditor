/**
 * Legacy TransformControl - обёртка для совместимости
 *
 * Делегирует к Services.transform для обратной совместимости
 * с существующим кодом, использующим глобальный TransformControl.
 */

import type { TransformControlsMode } from 'three/examples/jsm/controls/TransformControls.js';
import { IBaseEntityAndThree } from '../render_engine/types';
import { Services } from '@editor/core';
import type { ISceneObject } from '@editor/engine/types';

declare global {
    const TransformControl: ReturnType<typeof TransformControlCreate>;
}

export function register_transform_control() {
    (window as unknown as Record<string, unknown>).TransformControl = TransformControlCreate();
}

function TransformControlCreate() {
    function set_active(val: boolean): void {
        Services.transform.set_active(val);
    }

    function set_selected_list(list: IBaseEntityAndThree[]): void {
        Services.transform.set_selected_list(list as unknown as ISceneObject[]);
    }

    function set_mode(mode: TransformControlsMode): void {
        Services.transform.set_mode(mode);
    }

    function detach(): void {
        Services.transform.detach();
    }

    function set_proxy_position(x: number, y: number, z: number, objects?: IBaseEntityAndThree[]): void {
        Services.transform.set_proxy_position(x, y, z, objects as unknown as ISceneObject[] | undefined);
    }

    function set_proxy_rotation(x: number, y: number, z: number, objects?: IBaseEntityAndThree[]): void {
        Services.transform.set_proxy_rotation(x, y, z, objects as unknown as ISceneObject[] | undefined);
    }

    function set_proxy_scale(x: number, y: number, z: number, objects?: IBaseEntityAndThree[]): void {
        Services.transform.set_proxy_scale(x, y, z, objects as unknown as ISceneObject[] | undefined);
    }

    function get_proxy() {
        return Services.transform.get_proxy();
    }

    function set_proxy_in_average_point(objects?: IBaseEntityAndThree[]): void {
        Services.transform.set_proxy_in_average_point(objects as unknown as ISceneObject[] | undefined);
    }

    return {
        set_active,
        set_selected_list,
        set_mode,
        detach,
        set_proxy_position,
        set_proxy_rotation,
        set_proxy_scale,
        get_proxy,
        set_proxy_in_average_point,
    };
}
