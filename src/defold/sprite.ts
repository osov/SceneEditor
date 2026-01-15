import { IBaseEntityAndThree, IBaseMeshAndThree, IObjectTypes } from "@editor/render_engine/types";
import { uh_to_id } from "./utils";
import { Services } from '@editor/core';

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
        _complete_function?: (self: IBaseEntityAndThree, message_id: string, message: any) => void,
        _options?: {
            offset?: number,
            playback_rate?: number
        }
    ) {
        const mesh = Services.scene.get_by_id(uh_to_id(url));
        if (!mesh) {
            Services.logger.error(`Mesh with url ${url} not found`);
            return;
        }

        if (mesh.type != IObjectTypes.GO_SPRITE_COMPONENT) {
            Services.logger.error(`Mesh with url ${url} is not go`);
            return;
        }

        const sprite = mesh as IBaseMeshAndThree;
        const info = sprite.get_texture();
        sprite.set_texture(animation_id, info[1]);
    }

    function set_hflip(url: string | hash, flip: boolean) {
        const mesh = Services.scene.get_by_id(uh_to_id(url));
        if (!mesh) {
            Services.logger.error(`Mesh with url ${url} not found`);
            return;
        }
        if (mesh.type != IObjectTypes.GO_SPRITE_COMPONENT) {
            Services.logger.error(`Mesh with url ${url} is not go`);
            return;
        }
        mesh.scale.x = Math.abs(mesh.scale.x) * (flip ? -1 : 1);
    }

    function set_vflip(url: string | hash, flip: boolean) {
        const mesh = Services.scene.get_by_id(uh_to_id(url));
        if (!mesh) {
            Services.logger.error(`Mesh with url ${url} not found`);
            return;
        }
        if (mesh.type != IObjectTypes.GO_SPRITE_COMPONENT) {
            Services.logger.error(`Mesh with url ${url} is not go`);
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