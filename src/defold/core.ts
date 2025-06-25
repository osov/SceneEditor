import { math_module } from "./math";
import { vmath_module } from "./vmath";
import { json_module } from "./json";
import { msg_module } from "./msg";
import { collectionfactory_module } from "./collectionfactory";
import { factory_module } from "./factory";
import { go_module } from "./go";
import { sprite_module } from "./sprite";
import { timer_module } from "./timer";
import { sound_module } from "./sound";
import { xmath_module } from "./extension/xmath";
import { gui_module } from "./gui";

declare global {
    function tonumber(e: any, base?: number): number | undefined;
    function pprint(obj: any): void;
    type hash = {};
    function hash(s: string): hash;
    type node = {};
}


export function register_lua_core() {
    (window as any).tonumber = Number;
    (window as any).pprint = function (obj: any) {
        console.log(obj);
    };

    (window as any).hash = function (url: string) {
        const id = SceneManager.get_mesh_id_by_url(url);
        return { id } as hash;
    };

    (window as any).json = json_module();
    (window as any).math = math_module();
    (window as any).vmath = vmath_module();
    (window as any).gui = gui_module();
    (window as any).go = go_module();
    (window as any).sprite = sprite_module();
    (window as any).factory = factory_module();
    (window as any).collectionfactory = collectionfactory_module();
    (window as any).msg = msg_module();
    (window as any).timer = timer_module();
    (window as any).sound = sound_module();

    // extension
    (window as any).xmath = xmath_module();
}