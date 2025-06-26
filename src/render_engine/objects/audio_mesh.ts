import { IObjectTypes } from "../types";
import { EntityBase } from "./entity_base";
import { DEFAULT_PAN_NORMALIZATION_DISTANCE, DEFAULT_MAX_VOLUME_RADIUS, DEFAULT_SOUND_RADIUS, DEFAULT_FADE_IN_TIME, DEFAULT_FADE_OUT_TIME } from "../../config";
import { EllipseCurve, Line, LineBasicMaterial, Vector3, BufferGeometry, CircleGeometry, Mesh, MeshBasicMaterial } from "three";

// NOTE: чтобы использовать без (window as any)
import "../../modules/SpatialSound";

export enum SoundFunctionType {
    LINEAR = 'linear',
    EXPONENTIAL = 'exponential',
    QUADRATIC = 'quadratic',
    INVERSE_QUADRATIC = 'inverse_quadratic',
    SMOOTH_STEP = 'smooth_step'
}

export interface AudioSerializeData {
    sound: string;
    speed?: number;
    volume?: number;
    loop?: boolean;
    pan?: number;
    soundRadius?: number;
    maxVolumeRadius?: number;
    panNormalizationDistance?: number;
    soundFunction?: SoundFunctionType;
    fadeInTime?: number;
    fadeOutTime?: number;
}

export class AudioMesh extends EntityBase {
    public type = IObjectTypes.GO_AUDIO_COMPONENT;

    private sound: string = '';
    private speed: number = 1;
    private volume: number = 1;
    private pan: number = 0;
    private loop: boolean = false;

    private soundRadius: number = DEFAULT_SOUND_RADIUS;
    private maxVolumeRadius: number = DEFAULT_MAX_VOLUME_RADIUS;
    private panNormalizationDistance: number = DEFAULT_PAN_NORMALIZATION_DISTANCE;
    private soundFunction: SoundFunctionType = SoundFunctionType.LINEAR;
    private fadeInTime: number = DEFAULT_FADE_IN_TIME;
    private fadeOutTime: number = DEFAULT_FADE_OUT_TIME;

    private soundRadiusVisual: Line | null = null;
    private maxVolumeRadiusVisual: Line | null = null;
    private panNormalizationVisual: Line | null = null;
    private listenerVisual: Mesh | null = null;

    constructor(id: number) {
        super(id);
        this.layers.disable(RenderEngine.DC_LAYERS.GO_LAYER);
        this.layers.enable(RenderEngine.DC_LAYERS.RAYCAST_LAYER);
        EventBus.on('SYS_ON_UPDATE', this.updateVisual.bind(this));
    }

    get_id() {
        return this.mesh_data.id;
    }

    // NOTE: важно чтобы мешь уже был создан и добавлен в сцену
    set_sound(name: string) {
        if (this.sound != '') {
            this.dispose();
        }

        this.sound = name;
        AudioManager.create_audio(name, this.get_id());
        SpatialSound.create_spatial_sound(
            SceneManager.get_mesh_url_by_id(this.get_id()),
            this.soundRadius,
            this.volume,
            this.maxVolumeRadius,
            this.panNormalizationDistance,
            this.soundFunction,
            this.fadeInTime,
            this.fadeOutTime
        );
        this.createVisual();
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
        if (this.soundRadius > 0) SpatialSound.set_max_volume(SceneManager.get_mesh_url_by_id(this.get_id()), volume);
        else AudioManager.set_volume(this.get_id(), volume);
    }

    get_volume() {
        return this.volume;
    }

    set_pan(pan: number) {
        this.pan = pan;
        AudioManager.set_pan(this.get_id(), pan);
    }

    get_pan() {
        return this.pan;
    }

    set_loop(loop: boolean) {
        this.loop = loop;
        AudioManager.set_loop(this.get_id(), loop);
    }

    get_loop() {
        return this.loop;
    }

    set_sound_radius(radius: number) {
        this.soundRadius = Math.max(0, radius);
        SpatialSound.set_sound_radius(SceneManager.get_mesh_url_by_id(this.get_id()), this.soundRadius);
    }

    get_sound_radius() {
        return this.soundRadius;
    }

    set_max_volume_radius(radius: number) {
        this.maxVolumeRadius = Math.max(0, radius);
        SpatialSound.set_max_volume_radius(SceneManager.get_mesh_url_by_id(this.get_id()), this.maxVolumeRadius);
    }

    get_max_volume_radius() {
        return this.maxVolumeRadius;
    }

    set_pan_normalization_distance(distance: number) {
        this.panNormalizationDistance = Math.max(0, distance);
        SpatialSound.set_pan_normalization_distance(SceneManager.get_mesh_url_by_id(this.get_id()), this.panNormalizationDistance);
    }

    get_pan_normalization_distance() {
        return this.panNormalizationDistance;
    }

    set_sound_function(func: SoundFunctionType) {
        this.soundFunction = func;
        SpatialSound.set_sound_function(SceneManager.get_mesh_url_by_id(this.get_id()), this.soundFunction);
    }

    get_sound_function() {
        return this.soundFunction;
    }

    set_fade_in_time(time: number) {
        this.fadeInTime = Math.max(0, time);
        SpatialSound.set_fade_in_time(SceneManager.get_mesh_url_by_id(this.get_id()), this.fadeInTime);
    }

    get_fade_in_time() {
        return this.fadeInTime;
    }

    set_fade_out_time(time: number) {
        this.fadeOutTime = Math.max(0, time);
        SpatialSound.set_fade_out_time(SceneManager.get_mesh_url_by_id(this.get_id()), this.fadeOutTime);
    }

    get_fade_out_time() {
        return this.fadeOutTime;
    }

    play() {
        if (this.sound == '') return;
        AudioManager.play(this.get_id(), this.loop, this.volume, this.speed, this.pan);
        MeshInspector.force_refresh();
    }

    pause() {
        if (this.sound == '') return;
        AudioManager.pause(this.get_id());
        MeshInspector.force_refresh();
    }

    stop() {
        if (this.sound == '') return;
        AudioManager.stop(this.get_id());
        MeshInspector.force_refresh();
    }

    is_playing() {
        return AudioManager.is_playing(this.get_id());
    }

    private createVisual() {
        this.createListenerVisual();
        this.createSoundRadiusVisual();
        this.createMaxVolumeRadiusVisual();
        this.createPanNormalizationVisual();
    }

    private updateVisual() {
        this.updateListenerVisual();
        this.updateSoundRadiusVisual();
        this.updateMaxVolumeRadiusVisual();
        this.updatePanNormalizationVisual();
    }

    private removeVisual() {
        this.removeListenerVisual();
        this.removeSoundRadiusVisual();
        this.removeMaxVolumeRadiusVisual();
        this.removePanNormalizationVisual();
    }

    private createListenerVisual() {
        const listenerGeometry = new CircleGeometry(15, 32);
        const listenerMaterial = new MeshBasicMaterial({
            color: 0xff0000,
            transparent: true,
            opacity: 1
        });
        this.listenerVisual = new Mesh(listenerGeometry, listenerMaterial);

        const listenerPosition = SpatialSound.get_listener_position();
        this.listenerVisual.position.copy(listenerPosition);
        this.listenerVisual.parent?.localToWorld(this.listenerVisual.position);
        this.listenerVisual.visible = this.get_active();
        this.add(this.listenerVisual);
    }

    private createSoundRadiusVisual() {
        const soundRadiusCurve = new EllipseCurve(0, 0, this.soundRadius, this.soundRadius, 0, 2 * Math.PI, false, 0);
        const soundRadiusPoints = soundRadiusCurve.getPoints(64);
        const soundRadiusGeometry = new BufferGeometry().setFromPoints(soundRadiusPoints);
        const soundRadiusMaterial = new LineBasicMaterial({
            color: 0x00ff00,
            transparent: true,
            opacity: 0.8
        });
        this.soundRadiusVisual = new Line(soundRadiusGeometry, soundRadiusMaterial);
        this.soundRadiusVisual.visible = this.get_active();
        this.add(this.soundRadiusVisual);
    }

    private createMaxVolumeRadiusVisual() {
        const maxVolumeCurve = new EllipseCurve(0, 0, this.maxVolumeRadius, this.maxVolumeRadius, 0, 2 * Math.PI, false, 0);
        const maxVolumePoints = maxVolumeCurve.getPoints(64);
        const maxVolumeGeometry = new BufferGeometry().setFromPoints(maxVolumePoints);
        const maxVolumeMaterial = new LineBasicMaterial({
            color: 0xffff00,
            transparent: true,
            opacity: 0.8
        });
        this.maxVolumeRadiusVisual = new Line(maxVolumeGeometry, maxVolumeMaterial);
        this.maxVolumeRadiusVisual.visible = this.get_active();
        this.add(this.maxVolumeRadiusVisual);
    }

    private createPanNormalizationVisual() {
        const panPoints = [
            new Vector3(-this.panNormalizationDistance, 0, 0),
            new Vector3(this.panNormalizationDistance, 0, 0)
        ];
        const panGeometry = new BufferGeometry().setFromPoints(panPoints);
        const panMaterial = new LineBasicMaterial({
            color: 0x0080ff,
            transparent: true,
            opacity: 1
        });
        this.panNormalizationVisual = new Line(panGeometry, panMaterial);
        this.panNormalizationVisual.visible = this.get_active();
        this.add(this.panNormalizationVisual);
    }

    private updateListenerVisual() {
        if (!this.listenerVisual) return;
        const listenerPosition = SpatialSound.get_listener_position();
        this.listenerVisual.position.copy(listenerPosition);
        this.listenerVisual.parent?.worldToLocal(this.listenerVisual.position);
        this.listenerVisual.visible = this.get_active();
    }

    private updateSoundRadiusVisual() {
        if (this.soundRadius > 0) {
            if (!this.soundRadiusVisual) this.createSoundRadiusVisual();
            else {
                this.soundRadiusVisual.geometry.dispose();
                const soundRadiusCurve = new EllipseCurve(0, 0, this.soundRadius, this.soundRadius, 0, 2 * Math.PI, false, 0);
                const soundRadiusPoints = soundRadiusCurve.getPoints(64);
                this.soundRadiusVisual.geometry = new BufferGeometry().setFromPoints(soundRadiusPoints);
            }
            this.soundRadiusVisual!.visible = this.get_active();
        } else {
            this.removeSoundRadiusVisual();
        }
    }

    private updateMaxVolumeRadiusVisual() {
        if (this.maxVolumeRadius > 0) {
            if (!this.maxVolumeRadiusVisual) this.createMaxVolumeRadiusVisual();
            else {
                this.maxVolumeRadiusVisual.geometry.dispose();
                const maxVolumeCurve = new EllipseCurve(0, 0, this.maxVolumeRadius, this.maxVolumeRadius, 0, 2 * Math.PI, false, 0);
                const maxVolumePoints = maxVolumeCurve.getPoints(64);
                this.maxVolumeRadiusVisual.geometry = new BufferGeometry().setFromPoints(maxVolumePoints);
            }
            this.maxVolumeRadiusVisual!.visible = this.get_active();
        } else this.removeMaxVolumeRadiusVisual();
    }

    private updatePanNormalizationVisual() {
        if (this.panNormalizationDistance > 0) {
            if (!this.panNormalizationVisual) this.createPanNormalizationVisual();
            else {
                this.panNormalizationVisual.geometry.dispose();
                const panPoints = [
                    new Vector3(-this.panNormalizationDistance, 0, 0),
                    new Vector3(this.panNormalizationDistance, 0, 0)
                ];
                this.panNormalizationVisual.geometry = new BufferGeometry().setFromPoints(panPoints);
            }
            this.panNormalizationVisual!.visible = this.get_active();
        } else this.removePanNormalizationVisual();
    }

    private removeSoundRadiusVisual() {
        if (this.soundRadiusVisual) {
            this.remove(this.soundRadiusVisual);
            this.soundRadiusVisual.geometry.dispose();
            if (this.soundRadiusVisual.material instanceof LineBasicMaterial) {
                this.soundRadiusVisual.material.dispose();
            }
            this.soundRadiusVisual = null;
        }
    }

    private removeMaxVolumeRadiusVisual() {
        if (this.maxVolumeRadiusVisual) {
            this.remove(this.maxVolumeRadiusVisual);
            this.maxVolumeRadiusVisual.geometry.dispose();
            if (this.maxVolumeRadiusVisual.material instanceof LineBasicMaterial) {
                this.maxVolumeRadiusVisual.material.dispose();
            }
            this.maxVolumeRadiusVisual = null;
        }
    }

    private removePanNormalizationVisual() {
        if (this.panNormalizationVisual) {
            this.remove(this.panNormalizationVisual);
            this.panNormalizationVisual.geometry.dispose();
            if (this.panNormalizationVisual.material instanceof LineBasicMaterial) {
                this.panNormalizationVisual.material.dispose();
            }
            this.panNormalizationVisual = null;
        }
    }

    private removeListenerVisual() {
        if (this.listenerVisual) {
            this.remove(this.listenerVisual);
            this.listenerVisual.geometry.dispose();
            if (this.listenerVisual.material instanceof MeshBasicMaterial) {
                this.listenerVisual.material.dispose();
            }
            this.listenerVisual = null;
        }
    }

    serialize() {
        const data: AudioSerializeData = {
            ...super.serialize(),
            sound: this.sound
        };

        if (this.speed != 1) data.speed = this.speed;
        if (this.volume != 1) data.volume = this.volume;
        if (this.loop != false) data.loop = this.loop;
        if (this.soundRadius != DEFAULT_SOUND_RADIUS) data.soundRadius = this.soundRadius;
        if (this.maxVolumeRadius != DEFAULT_MAX_VOLUME_RADIUS) data.maxVolumeRadius = this.maxVolumeRadius;
        if (this.panNormalizationDistance != DEFAULT_PAN_NORMALIZATION_DISTANCE) data.panNormalizationDistance = this.panNormalizationDistance;
        if (this.soundFunction != SoundFunctionType.LINEAR) data.soundFunction = this.soundFunction;
        if (this.fadeInTime != DEFAULT_FADE_IN_TIME) data.fadeInTime = this.fadeInTime;
        if (this.fadeOutTime != DEFAULT_FADE_OUT_TIME) data.fadeOutTime = this.fadeOutTime;

        return data;
    }

    deserialize(data: AudioSerializeData) {
        super.deserialize(data);
        this.sound = data.sound;
        AudioManager.create_audio(this.sound, this.get_id());

        if (data.speed) {
            this.speed = data.speed;
            AudioManager.set_speed(this.get_id(), this.speed);
        }
        if (data.volume) {
            this.volume = data.volume;
        }
        if (data.loop) {
            this.loop = data.loop;
            AudioManager.set_loop(this.get_id(), this.loop);
        }
        if (data.soundRadius) this.soundRadius = data.soundRadius;
        if (data.maxVolumeRadius) this.maxVolumeRadius = data.maxVolumeRadius;
        if (data.panNormalizationDistance) this.panNormalizationDistance = data.panNormalizationDistance;
        if (data.soundFunction) this.soundFunction = data.soundFunction;
        if (data.fadeInTime) this.fadeInTime = data.fadeInTime;
        if (data.fadeOutTime) this.fadeOutTime = data.fadeOutTime;
    }

    after_deserialize() {
        SpatialSound.create_spatial_sound(
            SceneManager.get_mesh_url_by_id(this.get_id()),
            this.soundRadius,
            this.volume,
            this.maxVolumeRadius,
            this.panNormalizationDistance,
            this.soundFunction,
            this.fadeInTime,
            this.fadeOutTime
        );
    }

    dispose() {
        super.dispose();
        this.removeVisual();
        EventBus.off('SYS_ON_UPDATE', this.updateVisual.bind(this));
        SpatialSound.remove_spatial_sound(SceneManager.get_mesh_url_by_id(this.get_id()));
        AudioManager.free_audio(this.get_id());
    }
}