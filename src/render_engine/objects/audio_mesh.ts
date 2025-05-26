import { IObjectTypes } from "../types";
import { EntityBase } from "./entity_base";

export interface AudioSerializeData {
    sound: string;
    speed?: number;
    volume?: number;
    loop?: boolean;
    pan?: number;
}

export class AudioMesh extends EntityBase {
    public type = IObjectTypes.GO_AUDIO_COMPONENT;
    private sound: string = '';
    private speed: number = 1;
    private volume: number = 1;
    private loop: boolean = false;
    private pan: number = 0;

    constructor(id: number) {
        super(id);
        this.layers.disable(RenderEngine.DC_LAYERS.GO_LAYER);
        this.layers.enable(RenderEngine.DC_LAYERS.RAYCAST_LAYER);
    }

    get_id() {
        return this.mesh_data.id;
    }

    set_sound(name: string) {
        if (this.sound != '') {
            this.dispose();
        }

        this.sound = name;
        AudioManager.create_audio(this.get_id(), name);
    }

    get_sound() {
        return this.sound;
    }

    set_speed(speed: number) {
        this.speed = speed;
        AudioManager.set_speed(this.get_id(), speed);
    }

    get_speed() {
        return this.speed;
    }

    set_volume(volume: number) {
        this.volume = volume;
        AudioManager.set_volume(this.get_id(), volume);
    }

    get_volume() {
        return this.volume;
    }

    set_loop(loop: boolean) {
        this.loop = loop;
        AudioManager.set_loop(this.get_id(), loop);
    }

    get_loop() {
        return this.loop;
    }

    set_pan(pan: number) {
        this.pan = pan;
        AudioManager.set_pan(this.get_id(), pan);
    }

    get_pan() {
        return this.pan;
    }

    serialize() {
        const data: AudioSerializeData = {
            ...super.serialize(),
            sound: this.sound
        };

        if (this.speed != 1) data.speed = this.speed;
        if (this.volume != 1) data.volume = this.volume;
        if (this.loop != false) data.loop = this.loop;
        if (this.pan != 0) data.pan = this.pan;

        return data;
    }

    deserialize(data: AudioSerializeData) {
        super.deserialize(data);
        this.sound = data.sound;
        AudioManager.create_audio(this.get_id(), this.sound);

        if (data.speed) {
            this.speed = data.speed;
            AudioManager.set_speed(this.get_id(), this.speed);
        }
        if (data.volume) {
            this.volume = data.volume;
            AudioManager.set_volume(this.get_id(), this.volume);
        }
        if (data.loop) {
            this.loop = data.loop;
            AudioManager.set_loop(this.get_id(), this.loop);
        }
        if (data.pan) {
            this.pan = data.pan;
            AudioManager.set_pan(this.get_id(), this.pan);
        }
    }

    dispose() {
        super.dispose();
        AudioManager.stop(this.get_id());
        AudioManager.free_audio(this.get_id());
    }
}