import { IBaseEntityAndThree } from "@editor/render_engine/types";
import { uh_to_id } from "./utils";
import { AudioMesh } from "@editor/render_engine/objects/audio_mesh";
import { SoundEndCallbackType, get_audio_manager } from "@editor/render_engine/AudioManager";
import { Services } from '@editor/core';

declare global {
    namespace sound {
        export function play(
            url: string | hash,
            play_properties?: {
                delay?: number,
                gain?: number,
                pan?: number,
                speed?: number
            },
            complete_function?: (self: unknown, message_id: string, message: { play_id: number }, sender: string) => void
        ): number;
        export function stop(url: string | hash): void;
        export function pause(url: string | hash, pause: boolean): void;
        export function set_gain(url: string | hash, gain: number): void;
        export function get_gain(url: string | hash): number;
        export function set_pan(url: string | hash, pan: number): void;
        export function get_pan(url: string | hash): number;
        export function set_speed(url: string | hash, speed: number): void;
        export function get_speed(url: string | hash): number;
    }
}

export function sound_module() {
    function play(
        url: string | hash,
        play_properties?: {
            delay?: number,
            gain?: number,
            pan?: number,
            speed?: number
        },
        complete_function?: (self: IBaseEntityAndThree, message_id: string, message: { play_id: number }, sender: string) => void
    ): number {
        const id = uh_to_id(url);

        const properties = {
            delay: play_properties?.delay ?? 0,
            gain: play_properties?.gain ?? 1,
            pan: play_properties?.pan ?? 0,
            speed: play_properties?.speed ?? 1
        };

        get_audio_manager().set_volume(id, properties.gain);
        get_audio_manager().set_pan(id, properties.pan);
        get_audio_manager().set_speed(id, properties.speed);

        get_audio_manager().set_end_callback(id, (type: SoundEndCallbackType) => {
            if (complete_function) {
                const sound_mesh = Services.scene.get_by_id(id) as AudioMesh | null;
                if (sound_mesh) {
                    complete_function(sound_mesh, type, { play_id: id }, Services.scene.get_url_by_id(id) ?? '');
                }
            }
        });

        if (properties.delay > 0) {
            setTimeout(() => {
                get_audio_manager().play(id, false, properties.gain, properties.speed, properties.pan);
            }, properties.delay / 1000); // NOTE: конвертируем в миллисекунды
        } else {
            get_audio_manager().play(id, false, properties.gain, properties.speed, properties.pan);
        }

        return id;
    }

    function stop(url: string | hash): void {
        const id = uh_to_id(url);
        get_audio_manager().stop(id);
    }

    function pause(url: string | hash, pause: boolean): void {
        const id = uh_to_id(url);
        if (pause) {
            get_audio_manager().pause(id);
        } else {
            get_audio_manager().play(id, false, get_audio_manager().get_volume(id), get_audio_manager().get_speed(id), get_audio_manager().get_pan(id));
        }
    }

    function set_gain(url: string | hash, gain: number): void {
        const id = uh_to_id(url);
        get_audio_manager().set_volume(id, gain);
    }

    function set_pan(url: string | hash, pan: number): void {
        const id = uh_to_id(url);
        get_audio_manager().set_pan(id, pan);
    }

    return {
        play,
        stop,
        pause,
        set_gain,
        set_pan,
    };
}
