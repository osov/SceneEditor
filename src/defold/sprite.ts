import { IBaseEntityAndThree, IObjectTypes } from "@editor/render_engine/types";
import { uh_to_id } from "./utils";

declare global {
    namespace sprite {
        export function play_flipbook(url: string, animation_id: string): void;
        export function set_hflip(url: string, flip: boolean): void;
        export function set_vflip(url: string, flip: boolean): void;
    }
}

export function sprite_module() {
    function play_flipbook(
        url: string | hash,
        animation_id: string,
        complete_function?: (self: IBaseEntityAndThree, message_id: string, message: any) => void,
        options?: {
            offset?: number,
            playback_rate?: number
        }
    ) {
        const mesh = SceneManager.get_mesh_by_id(uh_to_id(url));
        if (!mesh) {
            Log.error(`Mesh with url ${url} not found`);
            return;
        }

        if (mesh.type != IObjectTypes.GO_SPRITE_COMPONENT) {
            Log.error(`Mesh with url ${url} is not go`);
            return;
        }

        const info = mesh.get_texture();
        mesh.set_texture(animation_id, info[1]);
    }

    function set_hflip(url: string | hash, flip: boolean) {
        const mesh = SceneManager.get_mesh_by_id(uh_to_id(url));
        if (!mesh) {
            Log.error(`Mesh with url ${url} not found`);
            return;
        }
        if (mesh.type != IObjectTypes.GO_SPRITE_COMPONENT) {
            Log.error(`Mesh with url ${url} is not go`);
            return;
        }
        mesh.scale.x = Math.abs(mesh.scale.x) * (flip ? -1 : 1);
    }

    function set_vflip(url: string | hash, flip: boolean) {
        const mesh = SceneManager.get_mesh_by_id(uh_to_id(url));
        if (!mesh) {
            Log.error(`Mesh with url ${url} not found`);
            return;
        }
        if (mesh.type != IObjectTypes.GO_SPRITE_COMPONENT) {
            Log.error(`Mesh with url ${url} is not go`);
            return;
        }
        mesh.scale.y = Math.abs(mesh.scale.y) * (flip ? -1 : 1);
    }

    return {
        play_flipbook,
        set_hflip,
        set_vflip
    };
}