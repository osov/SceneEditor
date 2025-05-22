import { AudioListener, Audio } from "three";
import { TDictionary } from "../modules_editor/modules_editor_const";

declare global {
    const SoundManager: ReturnType<typeof SoundManagerModule>;
}

export function register_sound_manager() {
    (window as any).SoundManager = SoundManagerModule();
}

function SoundManagerModule() {
    const listener = new AudioListener();
    const sounds: TDictionary<Audio> = {};
    const panners: TDictionary<StereoPannerNode> = {};

    function init() {
        Camera.set_listener(listener);
    }

    function play(name: string, loop = false, volume = 0.5, pan = 0.5, offset = 0) {
        let is_continue = true;
        if (!sounds[name]) {
            sounds[name] = new Audio(listener);
            panners[name] = listener.context.createStereoPanner();
            panners[name].connect(listener.context.destination);
            is_continue = false;
        }

        const sound = sounds[name];
        const panner = panners[name];

        if (!is_continue) {
            sound.setBuffer(ResourceManager.get_sound(name));
            if (sound.source && panner) {
                sound.source.connect(panner);
                panner.pan.value = pan;
            }
        }

        sound.offset = offset;
        sound.setLoop(loop);
        sound.setVolume(volume);
        sound.play();
    }

    function stop(name: string) {
        const sound = sounds[name];
        if (!sound) {
            Log.error(`[SoundManager.stop]: sound ${name} not found`);
            return;
        }
        sound.stop();
        delete sounds[name];
        delete panners[name];
    }

    function pause(name: string) {
        const sound = sounds[name];
        if (!sound) {
            Log.error(`[SoundManager.pause]: sound ${name} not found`);
            return;
        }
        sound.pause();
    }

    function set_volume(name: string, volume: number) {
        const sound = sounds[name];
        if (!sound) {
            Log.error(`[SoundManager.set_volume]: sound ${name} not found`);
            return;
        }
        sound.setVolume(volume);
    }

    function set_loop(name: string, loop: boolean) {
        const sound = sounds[name];
        if (!sound) {
            Log.error(`[SoundManager.set_loop]: sound ${name} not found`);
            return;
        }
        sound.setLoop(loop);
    }

    function set_speed(name: string, speed: number) {
        const sound = sounds[name];
        if (!sound) {
            Log.error(`[SoundManager.set_speed]: sound ${name} not found`);
            return;
        }
        sound.setPlaybackRate(speed);
    }

    function set_pan(name: string, pan: number) {
        const panner = panners[name];
        if (!panner) {
            Log.error(`[SoundManager.set_pan]: panner ${name} not found`);
            return;
        }

        panner.pan.value = pan;
    }

    init();
    return { play, stop, pause, set_volume, set_loop, set_speed, set_pan };
}