import { AudioListener, Audio } from "three";
import { TDictionary } from "../modules_editor/modules_editor_const";

declare global {
    const AudioManager: ReturnType<typeof AudioManagerModule>;
}

export function register_audio_manager() {
    (window as any).AudioManager = AudioManagerModule();
}

function AudioManagerModule() {
    const listener = new AudioListener();
    const sounds: TDictionary<Audio> = {};
    const panners: TDictionary<StereoPannerNode> = {};
    const end_callbacks: TDictionary<() => void> = {};

    function init() {
        Camera.set_listener(listener);
    }

    function create_audio(id: number, name: string) {
        const sound = new Audio(listener);
        const panner = listener.context.createStereoPanner();
        const buffer = ResourceManager.get_sound_buffer(name);
        sound.setBuffer(buffer);
        sounds[id] = sound;
        panners[id] = panner;
    }

    function free_audio(id: number) {
        const sound = sounds[id];
        if (!sound) {
            Log.error(`[SoundManager.free_audio]: sound ${id} not found`);
            return;
        }
        const panner = panners[id];
        if (!panner) {
            Log.error(`[SoundManager.free_audio]: panner ${id} not found`);
            return;
        }
        sound.disconnect();
        panner.disconnect();
        delete sounds[id];
        delete panners[id];
        if (end_callbacks[id]) {
            delete end_callbacks[id];
        }
    }

    function set_end_callback(id: number, callback: () => void) {
        end_callbacks[id] = callback;
    }

    function play(id: number, loop = false, volume = 0.5, speed = 1, pan = 0.5, offset = 0) {
        const sound = sounds[id];
        if (!sound) {
            Log.error(`[SoundManager.play]: sound ${id} not found`);
            return;
        }
        const panner = panners[id];
        if (!panner) {
            Log.error(`[SoundManager.play]: panner ${id} not found`);
            return;
        }

        sound.offset = offset;
        sound.setLoop(loop);
        sound.setVolume(volume);
        sound.setPlaybackRate(speed);
        panner.pan.value = pan;

        sound.play();

        if (sound.source) {
            if (end_callbacks[id]) {
                sound.source.onended = () => {
                    sound.onEnded();
                    end_callbacks[id]();
                }
            }
            sound.source.connect(panner);
            panner.connect(listener.context.destination);
        }
    }

    function stop(id: number) {
        const sound = sounds[id];
        if (!sound) {
            Log.error(`[SoundManager.stop]: sound ${id} not found`);
            return;
        }
        sound.stop();
    }

    function is_playing(id: number) {
        const sound = sounds[id];
        if (!sound) {
            Log.error(`[SoundManager.is_playing]: sound ${id} not found`);
            return false;
        }
        return sound.isPlaying;
    }

    function pause(id: number) {
        const sound = sounds[id];
        if (!sound) {
            Log.error(`[SoundManager.pause]: sound ${id} not found`);
            return;
        }
        sound.pause();
    }

    function set_volume(id: number, volume: number) {
        const sound = sounds[id];
        if (!sound) {
            Log.error(`[SoundManager.set_volume]: sound ${id} not found`);
            return;
        }

        // NOTE/HACK: не устанавливаем громкость если звук не играет, потому что если менять громкость в момент когда звук закончит проигрываться, выдает ошибку
        if (!sound.isPlaying) return;
        sound.setVolume(volume);

        // NOTE/HACK: для того чтобы полностью отключить звук если громкость 0
        if (volume == 0) sound.source?.disconnect();
        else sound.source?.connect(panners[id]);
    }

    function get_volume(id: number) {
        const sound = sounds[id];
        if (!sound) {
            Log.error(`[SoundManager.get_volume]: sound ${id} not found`);
            return 0;
        }
        return sound.getVolume();
    }

    function set_loop(id: number, loop: boolean) {
        const sound = sounds[id];
        if (!sound) {
            Log.error(`[SoundManager.set_loop]: sound ${id} not found`);
            return;
        }
        sound.setLoop(loop);
    }

    function get_loop(id: number) {
        const sound = sounds[id];
        if (!sound) {
            Log.error(`[SoundManager.get_loop]: sound ${id} not found`);
            return false;
        }
        return sound.getLoop();
    }

    function set_speed(id: number, speed: number) {
        const sound = sounds[id];
        if (!sound) {
            Log.error(`[SoundManager.set_speed]: sound ${id} not found`);
            return;
        }
        sound.setPlaybackRate(speed);
    }

    function get_speed(id: number) {
        const sound = sounds[id];
        if (!sound) {
            Log.error(`[SoundManager.get_speed]: sound ${id} not found`);
            return 1;
        }
        return sound.getPlaybackRate();
    }

    function set_pan(id: number, pan: number) {
        const panner = panners[id];
        if (!panner) {
            Log.error(`[SoundManager.set_pan]: panner ${id} not found`);
            return;
        }

        panner.pan.value = pan;
    }

    function get_pan(id: number) {
        const panner = panners[id];
        if (!panner) {
            Log.error(`[SoundManager.get_pan]: panner ${id} not found`);
            return 0.5;
        }
        return panner.pan.value;
    }

    init();
    return { create_audio, free_audio, play, stop, pause, is_playing, set_volume, set_loop, set_speed, set_pan, get_volume, get_loop, get_speed, get_pan, set_end_callback };
}