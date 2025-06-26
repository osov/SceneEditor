import { IBaseEntityAndThree } from "@editor/render_engine/types";
import { uh_to_id } from "./utils";
import { AudioMesh } from "@editor/render_engine/objects/audio_mesh";
import { SoundEndCallbackType } from "@editor/render_engine/AudioManager";

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
            complete_function?: (self: IBaseEntityAndThree, message_id: string, message: { play_id: number }, sender: string) => void
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
        const sound_mesh = SceneManager.get_mesh_by_id(id) as AudioMesh | null;
        if (!sound_mesh) {
            Log.error('Sound component not found');
            return -1;
        }

        if (sound_mesh.get_sound() == '') {
            Log.error('Sound not set');
            return -1;
        }

        if (sound_mesh.is_playing()) {
            sound_mesh.stop();
        }

        const properties = {
            delay: play_properties?.delay ?? 0,
            gain: play_properties?.gain ?? 1,
            pan: play_properties?.pan ?? 0,
            speed: play_properties?.speed ?? 1
        };

        AudioManager.set_volume(id, properties.gain);
        sound_mesh.set_pan(properties.pan);
        sound_mesh.set_speed(properties.speed);

        AudioManager.set_end_callback(id, (type: SoundEndCallbackType) => {
            if (complete_function) complete_function(sound_mesh, type, { play_id: id }, SceneManager.get_mesh_url_by_id(id));
        });

        if (properties.delay > 0) {
            setTimeout(() => {
                sound_mesh.play();
            }, properties.delay / 1000); // NOTE: конвертируем в миллисекунды
        } else sound_mesh.play();

        return id;
    }

    function stop(url: string | hash): void {
        const id = uh_to_id(url);
        const sound_mesh = SceneManager.get_mesh_by_id(id) as AudioMesh | null;
        if (!sound_mesh) {
            Log.error('Sound component not found');
            return;
        }
        sound_mesh.stop();
    }

    function pause(url: string | hash, pause: boolean): void {
        const id = uh_to_id(url);
        const sound_mesh = SceneManager.get_mesh_by_id(id) as AudioMesh | null;
        if (!sound_mesh) {
            Log.error('Sound component not found');
            return;
        }
        if (pause) sound_mesh.pause();
        else sound_mesh.play();
    }

    function set_gain(url: string | hash, gain: number): void {
        const id = uh_to_id(url);
        const sound_mesh = SceneManager.get_mesh_by_id(id) as AudioMesh | null;
        if (!sound_mesh) {
            Log.error('Sound component not found');
            return;
        }
        AudioManager.set_volume(id, gain);
    }

    function get_gain(url: string | hash): number {
        const id = uh_to_id(url);
        const sound_mesh = SceneManager.get_mesh_by_id(id) as AudioMesh | null;
        if (!sound_mesh) {
            Log.error('Sound component not found');
            return 0;
        }
        return AudioManager.get_volume(id);
    }

    function set_pan(url: string | hash, pan: number): void {
        const id = uh_to_id(url);
        const sound_mesh = SceneManager.get_mesh_by_id(id) as AudioMesh | null;
        if (!sound_mesh) {
            Log.error('Sound component not found');
            return;
        }
        sound_mesh.set_pan(pan);
    }

    function get_pan(url: string | hash): number {
        const id = uh_to_id(url);
        const sound_mesh = SceneManager.get_mesh_by_id(id) as AudioMesh | null;
        if (!sound_mesh) {
            Log.error('Sound component not found');
            return 0;
        }
        return sound_mesh.get_pan();
    }

    function set_speed(url: string | hash, speed: number): void {
        const id = uh_to_id(url);
        const sound_mesh = SceneManager.get_mesh_by_id(id) as AudioMesh | null;
        if (!sound_mesh) {
            Log.error('Sound component not found');
            return;
        }
        sound_mesh.set_speed(speed);
    }

    function get_speed(url: string | hash): number {
        const id = uh_to_id(url);
        const sound_mesh = SceneManager.get_mesh_by_id(id) as AudioMesh | null;
        if (!sound_mesh) {
            Log.error('Sound component not found');
            return 0;
        }
        return sound_mesh.get_speed();
    }

    return {
        play,
        stop,
        pause,
        set_gain,
        get_gain,
        set_pan,
        get_pan,
        set_speed,
        get_speed
    };
}
