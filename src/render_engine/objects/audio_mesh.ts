import { IObjectTypes } from "../types";
import { EntityBase } from "./entity_base";
import { DEFAULT_PAN_NORMALIZATION_DISTANCE, DEFAULT_MAX_VOLUME_RADIUS, DEFAULT_SOUND_RADIUS, DEFAULT_FADE_IN_TIME, DEFAULT_FADE_OUT_TIME } from "../../config";
import { EllipseCurve, Line, LineBasicMaterial, Vector3, BufferGeometry, CircleGeometry, Mesh, MeshBasicMaterial, Vector2 } from "three";

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

    private currentVolume: number = 0;
    private targetVolume: number = 0;
    private fadeStartVolume: number = 0;
    private fadeStartTime: number = 0;
    private fadeDuration: number = 0;

    private forceControl: boolean = false;

    private soundRadiusVisual: Line | null = null;
    private maxVolumeRadiusVisual: Line | null = null;
    private panNormalizationVisual: Line | null = null;
    private listenerVisual: Mesh | null = null;

    constructor(id: number) {
        super(id);
        this.layers.disable(RenderEngine.DC_LAYERS.GO_LAYER);
        this.layers.enable(RenderEngine.DC_LAYERS.RAYCAST_LAYER);
        EventBus.on('SYS_ON_UPDATE', this.update.bind(this));
    }

    get_id() {
        return this.mesh_data.id;
    }

    set_sound(name: string) {
        if (this.sound != '') {
            this.dispose();
        }

        this.sound = name;
        AudioManager.create_audio(name, this.get_id());
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
    }

    get_volume() {
        return this.volume;
    }

    set_pan(pan: number) {
        this.pan = pan;
    }

    get_pan() {
        return this.pan;
    }

    set_loop(loop: boolean) {
        this.loop = loop;
    }

    get_loop() {
        return this.loop;
    }

    set_sound_radius(radius: number) {
        this.soundRadius = Math.max(0, radius);
    }

    get_sound_radius() {
        return this.soundRadius;
    }

    set_max_volume_radius(radius: number) {
        this.maxVolumeRadius = Math.max(0, radius);
    }

    get_max_volume_radius() {
        return this.maxVolumeRadius;
    }

    set_pan_normalization_distance(distance: number) {
        this.panNormalizationDistance = Math.max(0, distance);
    }

    get_pan_normalization_distance() {
        return this.panNormalizationDistance;
    }

    set_sound_function(func: SoundFunctionType) {
        this.soundFunction = func;
    }

    get_sound_function() {
        return this.soundFunction;
    }

    set_fade_in_time(time: number) {
        this.fadeInTime = Math.max(0, time);
    }

    get_fade_in_time() {
        return this.fadeInTime;
    }

    set_fade_out_time(time: number) {
        this.fadeOutTime = Math.max(0, time);
    }

    get_fade_out_time() {
        return this.fadeOutTime;
    }

    play() {
        if (this.sound == '') return;

        this.currentVolume = this.volume;
        this.targetVolume = this.volume;
        this.fadeDuration = 0;

        AudioManager.play(this.get_id(), this.loop, this.volume, this.speed);
        (window as any).MeshInspector.force_refresh();
    }

    pause() {
        if (this.sound == '') return;
        AudioManager.pause(this.get_id());
        (window as any).MeshInspector.force_refresh();
    }

    stop() {
        if (this.sound == '') return;

        this.currentVolume = 0;
        this.targetVolume = 0;
        this.fadeDuration = 0;

        AudioManager.stop(this.get_id());
        (window as any).MeshInspector.force_refresh();
    }

    is_playing() {
        return AudioManager.is_playing(this.get_id());
    }

    private update() {
        if (!this.get_active() || this.sound == '') {
            if (this.is_playing()) this.stopSpatialAudio();
            return;
        }

        this.forceControl = this.soundRadius == 0;

        const listenerPosition = this.getListenerPosition();
        const soundPosition = new Vector3();
        this.getWorldPosition(soundPosition);
        // NOTE: для того чтобы не учитывать z координату
        const soundPosition2D = new Vector2(soundPosition.x, soundPosition.y);
        const listenerPosition2D = new Vector2(listenerPosition.x, listenerPosition.y);
        const distance = soundPosition2D.distanceTo(listenerPosition2D);

        if (this.soundRadius == 0) {
            this.handleListenerInRange(distance, listenerPosition, soundPosition);
        } else {
            if (distance <= this.soundRadius) {
                this.handleListenerInRange(distance, listenerPosition, soundPosition);
            } else {
                this.handleListenerOutOfRange();
            }
        }

        this.updateFading();
        this.updateVisual();

        if (this.soundRadius > 0 && distance > this.soundRadius && this.currentVolume <= 0 && this.is_playing()) {
            this.stopSpatialAudio();
        }
    }

    private getListenerPosition(): Vector3 {
        const camera = RenderEngine.camera;
        return new Vector3(camera.position.x, camera.position.y, camera.position.z);
    }

    private handleListenerInRange(distance: number, listenerPos: Vector3, soundPos: Vector3) {
        const newTargetVolume = this.calculateVolumeByDistance(distance);

        const pan = this.calculatePanByDistance(distance, listenerPos, soundPos);
        AudioManager.set_pan(this.get_id(), pan);

        if (!this.forceControl && !this.is_playing() && newTargetVolume > 0) {
            this.startSpatialAudio();
        }

        if (Math.abs(newTargetVolume - this.targetVolume) > 0.001) {
            this.targetVolume = newTargetVolume;

            if (!this.is_playing() && this.targetVolume > 0) {
                this.currentVolume = 0;
                this.startFade(this.targetVolume, this.fadeInTime);
            } else if (this.is_playing()) {
                this.startFade(this.targetVolume, this.fadeInTime);
            }
        }
    }

    private handleListenerOutOfRange() {
        if (this.is_playing() && this.targetVolume > 0) {
            this.targetVolume = 0;
            this.startFade(0, this.fadeOutTime);
        }

        if (!this.is_playing()) {
            this.currentVolume = 0;
            this.targetVolume = 0;
        }
    }

    private calculateVolumeByDistance(distance: number): number {
        if (this.soundRadius == 0) {
            return this.volume;
        }

        if (distance <= 0) return this.volume;

        let volume = 0;
        if (this.maxVolumeRadius > 0) {
            if (distance <= this.maxVolumeRadius) {
                volume = 1;
            } else {
                const fadeDistance = this.soundRadius - this.maxVolumeRadius;
                const fadeProgress = (distance - this.maxVolumeRadius) / fadeDistance;
                volume = this.applySoundFunction(1 - fadeProgress);
            }
        } else {
            const fadeProgress = distance / this.soundRadius;
            volume = this.applySoundFunction(1 - fadeProgress);
        }

        return Math.max(0, Math.min(1, volume)) * this.volume;
    }

    private applySoundFunction(progress: number): number {
        switch (this.soundFunction) {
            case SoundFunctionType.LINEAR:
                return progress;
            case SoundFunctionType.EXPONENTIAL:
                return Math.pow(progress, 2);
            case SoundFunctionType.QUADRATIC:
                return Math.pow(progress, 3);
            case SoundFunctionType.INVERSE_QUADRATIC:
                return 1 - Math.pow(1 - progress, 2);
            case SoundFunctionType.SMOOTH_STEP:
                return progress * progress * (3 - 2 * progress);
            default:
                return progress;
        }
    }

    private calculatePanByDistance(distance: number, listenerPos: Vector3, soundPos: Vector3): number {
        if (this.panNormalizationDistance <= 0) return this.pan;

        if (distance < this.panNormalizationDistance) return this.pan;

        const soundPos2D = new Vector2(soundPos.x, soundPos.y);
        const listenerPos2D = new Vector2(listenerPos.x, listenerPos.y);
        const direction2D = new Vector2().subVectors(soundPos2D, listenerPos2D).normalize();
        const pan = direction2D.x;
        return Math.max(-1, Math.min(1, pan)) * this.pan;
    }

    private startSpatialAudio() {
        if (this.is_playing()) return;
        this.currentVolume = 0;
        AudioManager.play(this.get_id(), this.loop, 0, this.speed);
        (window as any).MeshInspector.force_refresh();
    }

    private stopSpatialAudio() {
        if (!this.is_playing()) return;
        AudioManager.stop(this.get_id());
        this.currentVolume = 0;
        this.targetVolume = 0;
        (window as any).MeshInspector.force_refresh();
    }

    private startFade(targetVolume: number, duration: number) {
        if (this.fadeDuration > 0 && Math.abs(this.targetVolume - targetVolume) < 0.001) {
            return;
        }

        this.fadeStartVolume = this.currentVolume;
        this.targetVolume = targetVolume;
        this.fadeStartTime = performance.now() / 1000;
        this.fadeDuration = duration;
    }

    private updateFading() {
        if (this.fadeDuration <= 0) return;

        const currentTime = performance.now() / 1000;
        const fadeProgress = (currentTime - this.fadeStartTime) / this.fadeDuration;

        if (fadeProgress >= 1) {
            // NOTE: Затухание завершено
            this.currentVolume = this.targetVolume;
            this.fadeDuration = 0;

            if (this.is_playing() && this.currentVolume <= 0) {
                this.stopSpatialAudio();
            }
        } else {
            const newVolume = this.fadeStartVolume + (this.targetVolume - this.fadeStartVolume) * fadeProgress;
            this.currentVolume = Math.max(0, newVolume);
        }

        if (this.is_playing()) {
            AudioManager.set_volume(this.get_id(), this.currentVolume);
        }
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

        const listenerPosition = this.getListenerPosition();
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
        const listenerPosition = this.getListenerPosition();
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
            AudioManager.set_volume(this.get_id(), this.volume);
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

    dispose() {
        super.dispose();
        this.stopSpatialAudio();
        this.removeVisual();
        AudioManager.free_audio(this.get_id());
    }
}