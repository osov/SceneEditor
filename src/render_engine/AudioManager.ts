import { AudioListener, Audio } from "three";
import { TDictionary } from "../modules_editor/modules_editor_const";

declare global {
    const AudioManager: ReturnType<typeof AudioManagerModule>;
}

export function register_audio_manager() {
    (window as any).AudioManager = AudioManagerModule();
}

export enum SoundEndCallbackType {
    SOUND_DONE = 'sound_done',
    SOUND_STOP = 'sound_stop'
}

function AudioManagerModule() {
    const listener = new AudioListener();
    const sounds: TDictionary<Audio> = {};
    const panners: TDictionary<StereoPannerNode> = {};
    const gains: TDictionary<GainNode> = {};
    const end_callbacks: TDictionary<(type: SoundEndCallbackType) => void> = {};

    function init() {
        Camera.set_listener(listener);
        EventBus.on('SYS_ON_UPDATE', () => {
            const camera = RenderEngine.camera;
            Sound.set_listener_position(vmath.vector3(camera.position.x, camera.position.y, camera.position.z));
        });
    }

    function create_audio(name: string, id = SceneManager.get_unique_id()) {
        const sound = new Audio(listener);
        const panner = listener.context.createStereoPanner();
        const buffer = ResourceManager.get_sound_buffer(name);
        sound.setBuffer(buffer);
        sounds[id] = sound;
        panners[id] = panner;
        gains[id] = listener.context.createGain();
        return id;
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
        delete gains[id];
        if (end_callbacks[id]) {
            delete end_callbacks[id];
        }
    }

    function set_end_callback(id: number, callback: (type: SoundEndCallbackType) => void) {
        end_callbacks[id] = callback;
    }

    function play(id: number, loop = false, volume = 1, speed = 1, pan = 0, offset = 0) {
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
        const gain = gains[id];
        if (!gain) {
            Log.error(`[SoundManager.play]: gain ${id} not found`);
            return;
        }

        panner.pan.value = pan;
        sound.gain.disconnect();
        sound.gain.connect(panner);
        panner.connect(gain);
        gain.connect(listener.context.destination);
        gain.gain.value = volume;

        sound.offset = offset;
        sound.setLoop(loop);
        sound.setPlaybackRate(speed);

        sound.play();

        if (sound.source) {
            if (end_callbacks[id]) {
                sound.source.onended = () => {
                    sound.onEnded();
                    end_callbacks[id](SoundEndCallbackType.SOUND_DONE);
                }
            }
        }
    }

    function stop(id: number) {
        const sound = sounds[id];
        if (!sound) {
            Log.error(`[SoundManager.stop]: sound ${id} not found`);
            return;
        }
        sound.stop();
        if (end_callbacks[id]) {
            end_callbacks[id](SoundEndCallbackType.SOUND_STOP);
        }
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
        const gain = gains[id];
        if (!gain) {
            Log.error(`[SoundManager.set_volume]: gain ${id} not found`);
            return;
        }
        gain.gain.value = volume;
    }

    function get_volume(id: number) {
        const sound = sounds[id];
        if (!sound) {
            Log.error(`[SoundManager.get_volume]: sound ${id} not found`);
            return 0;
        }
        const gain = gains[id];
        if (!gain) {
            Log.error(`[SoundManager.get_volume]: gain ${id} not found`);
            return 0;
        }
        return gain.gain.value;
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

        if (!sound.isPlaying || sound.source) {
            sound.setPlaybackRate(speed);
        }
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

        const sound = sounds[id];
        if (!sound) {
            Log.error(`[SoundManager.set_pan]: sound ${id} not found`);
            return;
        }

        if (!sound.isPlaying || sound.source) {
            panner.pan.value = pan;
        }
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