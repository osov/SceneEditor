import { IObjectTypes } from "../types";
import { EntityBase } from "./entity_base";
import { DEFAULT_PAN_NORMALIZATION_DISTANCE, DEFAULT_MAX_VOLUME_RADIUS, DEFAULT_SOUND_RADIUS, DEFAULT_FADE_IN_TIME, DEFAULT_FADE_OUT_TIME } from "../../config";
import { EllipseCurve, Line, LineBasicMaterial, Vector3, BufferGeometry, CircleGeometry, Mesh, MeshBasicMaterial, BoxHelper } from "three";

// NOTE: чтобы использовать без (window as any)
import "../../modules/Sound";

export enum SoundFunctionType {
    LINEAR = 'linear',
    EXPONENTIAL = 'exponential',
    QUADRATIC = 'quadratic',
    INVERSE_QUADRATIC = 'inverse_quadratic',
    SMOOTH_STEP = 'smooth_step'
}

export enum SoundZoneType {
    CIRCULAR = 'circular',
    RECTANGULAR = 'rectangular'
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
    zoneType?: SoundZoneType;
    rectangleWidth?: number;
    rectangleHeight?: number;
    rectangleMaxVolumeWidth?: number;
    rectangleMaxVolumeHeight?: number;
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

    private zoneType: SoundZoneType = SoundZoneType.CIRCULAR;
    private rectangleWidth: number = 0;
    private rectangleHeight: number = 0;
    private rectangleMaxVolumeWidth: number = 0;
    private rectangleMaxVolumeHeight: number = 0;

    private soundRadiusVisual: Line | null = null;
    private maxVolumeRadiusVisual: Line | null = null;
    private panNormalizationVisual: Line | null = null;
    private listenerVisual: Mesh | null = null;
    private rectangleVisual: Line | null = null;
    private rectangleMaxVolumeVisual: Line | null = null;

    constructor(id: number) {
        super(id);
        this.layers.disable(RenderEngine.DC_LAYERS.GO_LAYER);
        this.layers.enable(RenderEngine.DC_LAYERS.RAYCAST_LAYER);
        EventBus.on('SYS_ON_UPDATE', this.updateVisual.bind(this));
    }

    get_id() {
        return this.mesh_data.id;
    }

    set_active(val: boolean): void {
        super.set_active(val);
        Sound.set_active(SceneManager.get_mesh_url_by_id(this.get_id()), val);
    }

    // NOTE: перед установкой звука важно чтобы мешь уже был создан и добавлен в сцену
    set_sound(name: string) {
        if (this.sound != '') {
            this.dispose();
        }

        this.sound = name;
        AudioManager.create_audio(name, this.get_id());
        Sound.create(
            SceneManager.get_mesh_url_by_id(this.get_id()),
            this.soundRadius,
            this.volume,
            this.maxVolumeRadius,
            this.panNormalizationDistance,
            this.soundFunction,
            this.fadeInTime,
            this.fadeOutTime,
            this.zoneType,
            this.rectangleWidth,
            this.rectangleHeight,
            this.rectangleMaxVolumeWidth,
            this.rectangleMaxVolumeHeight
        );
        this.createVisual();
    }

    get_sound() {
        return this.sound;
    }

    set_speed(speed: number) {
        this.speed = speed;
        Sound.set_sound_speed(SceneManager.get_mesh_url_by_id(this.get_id()), speed);
    }

    get_speed() {
        return this.speed;
    }

    set_volume(volume: number) {
        this.volume = volume;
        Sound.set_max_volume(SceneManager.get_mesh_url_by_id(this.get_id()), volume);
    }

    get_volume() {
        return this.volume;
    }

    set_pan(pan: number) {
        this.pan = pan;
        Sound.set_sound_pan(SceneManager.get_mesh_url_by_id(this.get_id()), pan);
    }

    get_pan() {
        return this.pan;
    }

    set_loop(loop: boolean) {
        this.loop = loop;
        Sound.set_sound_loop(SceneManager.get_mesh_url_by_id(this.get_id()), loop);
    }

    get_loop() {
        return this.loop;
    }

    set_sound_radius(radius: number) {
        this.soundRadius = Math.max(0, radius);
        Sound.set_sound_radius(SceneManager.get_mesh_url_by_id(this.get_id()), this.soundRadius);
        MeshInspector.force_refresh();
    }

    get_sound_radius() {
        return this.soundRadius;
    }

    set_zone_type(zoneType: SoundZoneType) {
        const previousZoneType = this.zoneType;
        this.zoneType = zoneType;

        if (previousZoneType != zoneType) {
            if (zoneType == SoundZoneType.CIRCULAR) {
                this.rectangleWidth = 0;
                this.rectangleHeight = 0;
                this.rectangleMaxVolumeWidth = 0;
                this.rectangleMaxVolumeHeight = 0;

                Sound.set_rectangle_width(SceneManager.get_mesh_url_by_id(this.get_id()), 0);
                Sound.set_rectangle_height(SceneManager.get_mesh_url_by_id(this.get_id()), 0);
                Sound.set_rectangle_max_volume_width(SceneManager.get_mesh_url_by_id(this.get_id()), 0);
                Sound.set_rectangle_max_volume_height(SceneManager.get_mesh_url_by_id(this.get_id()), 0);
            } else if (zoneType === SoundZoneType.RECTANGULAR) {
                this.soundRadius = 0;
                this.maxVolumeRadius = 0;

                Sound.set_sound_radius(SceneManager.get_mesh_url_by_id(this.get_id()), 0);
                Sound.set_max_volume_radius(SceneManager.get_mesh_url_by_id(this.get_id()), 0);
            }

            this.removeVisual();
            this.createVisual();
        }

        Sound.set_zone_type(SceneManager.get_mesh_url_by_id(this.get_id()), zoneType);
        MeshInspector.force_refresh();
    }

    get_zone_type() {
        return this.zoneType;
    }

    set_rectangle_width(width: number) {
        this.rectangleWidth = Math.max(0, width);
        Sound.set_rectangle_width(SceneManager.get_mesh_url_by_id(this.get_id()), this.rectangleWidth);
        MeshInspector.force_refresh();
    }

    get_rectangle_width() {
        return this.rectangleWidth;
    }

    set_rectangle_height(height: number) {
        this.rectangleHeight = Math.max(0, height);
        Sound.set_rectangle_height(SceneManager.get_mesh_url_by_id(this.get_id()), this.rectangleHeight);
        MeshInspector.force_refresh();
    }

    get_rectangle_height() {
        return this.rectangleHeight;
    }

    set_rectangle_max_volume_width(width: number) {
        this.rectangleMaxVolumeWidth = Math.max(0, width);
        Sound.set_rectangle_max_volume_width(SceneManager.get_mesh_url_by_id(this.get_id()), this.rectangleMaxVolumeWidth);
        MeshInspector.force_refresh();
    }

    get_rectangle_max_volume_width() {
        return this.rectangleMaxVolumeWidth;
    }

    set_rectangle_max_volume_height(height: number) {
        this.rectangleMaxVolumeHeight = Math.max(0, height);
        Sound.set_rectangle_max_volume_height(SceneManager.get_mesh_url_by_id(this.get_id()), this.rectangleMaxVolumeHeight);
        MeshInspector.force_refresh();
    }

    get_rectangle_max_volume_height() {
        return this.rectangleMaxVolumeHeight;
    }

    set_max_volume_radius(radius: number) {
        this.maxVolumeRadius = Math.max(0, radius);
        Sound.set_max_volume_radius(SceneManager.get_mesh_url_by_id(this.get_id()), this.maxVolumeRadius);
    }

    get_max_volume_radius() {
        return this.maxVolumeRadius;
    }

    set_pan_normalization_distance(distance: number) {
        this.panNormalizationDistance = Math.max(0, distance);
        Sound.set_pan_normalization_distance(SceneManager.get_mesh_url_by_id(this.get_id()), this.panNormalizationDistance);
    }

    get_pan_normalization_distance() {
        return this.panNormalizationDistance;
    }

    set_sound_function(func: SoundFunctionType) {
        this.soundFunction = func;
        Sound.set_sound_function(SceneManager.get_mesh_url_by_id(this.get_id()), this.soundFunction);
    }

    get_sound_function() {
        return this.soundFunction;
    }

    set_fade_in_time(time: number) {
        this.fadeInTime = Math.max(0, time);
        Sound.set_fade_in_time(SceneManager.get_mesh_url_by_id(this.get_id()), this.fadeInTime);
    }

    get_fade_in_time() {
        return this.fadeInTime;
    }

    set_fade_out_time(time: number) {
        this.fadeOutTime = Math.max(0, time);
        Sound.set_fade_out_time(SceneManager.get_mesh_url_by_id(this.get_id()), this.fadeOutTime);
    }

    get_fade_out_time() {
        return this.fadeOutTime;
    }

    play() {
        if (this.sound == '' || !this.get_active()) return;

        Sound.play(SceneManager.get_mesh_url_by_id(this.get_id()));
        MeshInspector.force_refresh();
    }

    is_spatial() {
        const is_circular_zone = this.zoneType == SoundZoneType.CIRCULAR && this.soundRadius > 0;
        const is_rectangular_zone = this.zoneType == SoundZoneType.RECTANGULAR && (this.rectangleWidth > 0 || this.rectangleHeight > 0);
        return is_circular_zone || is_rectangular_zone;
    }

    pause() {
        if (this.sound == '' || !this.get_active()) return;
        sound.pause(SceneManager.get_mesh_url_by_id(this.get_id()), true);
        MeshInspector.force_refresh();
    }

    stop() {
        if (this.sound == '' || !this.get_active()) return;
        Sound.stop(SceneManager.get_mesh_url_by_id(this.get_id()));
        MeshInspector.force_refresh();
    }

    is_playing() {
        if (!this.get_active()) return false;
        return Sound.is_sound_playing(SceneManager.get_mesh_url_by_id(this.get_id()));
    }

    private createVisual() {
        this.createListenerVisual();

        this.removeSoundRadiusVisual();
        this.removeMaxVolumeRadiusVisual();
        this.removeRectangleVisual();
        this.removeRectangleMaxVolumeVisual();

        if (this.zoneType == SoundZoneType.CIRCULAR) {
            this.createSoundRadiusVisual();
            this.createMaxVolumeRadiusVisual();
        } else {
            this.createRectangleVisual();
            this.createRectangleMaxVolumeVisual();
        }
        this.createPanNormalizationVisual();
    }

    private updateVisual() {
        this.updateListenerVisual();

        if (this.zoneType == SoundZoneType.CIRCULAR) {
            this.removeRectangleVisual();
            this.removeRectangleMaxVolumeVisual();

            this.updateSoundRadiusVisual();
            this.updateMaxVolumeRadiusVisual();
        } else {
            this.removeSoundRadiusVisual();
            this.removeMaxVolumeRadiusVisual();

            this.updateRectangleVisual();
            this.updateRectangleMaxVolumeVisual();
        }
        this.updatePanNormalizationVisual();
    }

    private removeVisual() {
        this.removeListenerVisual();
        this.removeSoundRadiusVisual();
        this.removeMaxVolumeRadiusVisual();
        this.removeRectangleVisual();
        this.removeRectangleMaxVolumeVisual();
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

        const listenerPosition = Sound.get_listener_position();
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

    private createRectangleVisual() {
        if (this.rectangleWidth > 0 && this.rectangleHeight > 0) {
            const halfWidth = this.rectangleWidth / 2;
            const halfHeight = this.rectangleHeight / 2;

            const rectanglePoints = [
                new Vector3(-halfWidth, -halfHeight, 0),
                new Vector3(halfWidth, -halfHeight, 0),
                new Vector3(halfWidth, halfHeight, 0),
                new Vector3(-halfWidth, halfHeight, 0),
                new Vector3(-halfWidth, -halfHeight, 0)
            ];

            const rectangleGeometry = new BufferGeometry().setFromPoints(rectanglePoints);
            const rectangleMaterial = new LineBasicMaterial({
                color: 0x00ff00,
                transparent: true,
                opacity: 0.8
            });

            this.rectangleVisual = new Line(rectangleGeometry, rectangleMaterial);
            this.rectangleVisual.visible = this.get_active();
            this.add(this.rectangleVisual);
        }
    }

    private createRectangleMaxVolumeVisual() {
        if (this.rectangleMaxVolumeWidth > 0 && this.rectangleMaxVolumeHeight > 0) {
            const halfWidth = this.rectangleMaxVolumeWidth / 2;
            const halfHeight = this.rectangleMaxVolumeHeight / 2;

            const rectanglePoints = [
                new Vector3(-halfWidth, -halfHeight, 0),
                new Vector3(halfWidth, -halfHeight, 0),
                new Vector3(halfWidth, halfHeight, 0),
                new Vector3(-halfWidth, halfHeight, 0),
                new Vector3(-halfWidth, -halfHeight, 0)
            ];

            const rectangleGeometry = new BufferGeometry().setFromPoints(rectanglePoints);
            const rectangleMaterial = new LineBasicMaterial({
                color: 0xffff00,
                transparent: true,
                opacity: 0.8
            });

            this.rectangleMaxVolumeVisual = new Line(rectangleGeometry, rectangleMaterial);
            this.rectangleMaxVolumeVisual.visible = this.get_active();
            this.add(this.rectangleMaxVolumeVisual);
        }
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
        const listenerPosition = Sound.get_listener_position();
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

    private updateRectangleVisual() {
        if (this.rectangleWidth > 0 && this.rectangleHeight > 0) {
            if (!this.rectangleVisual) this.createRectangleVisual();
            else {
                this.rectangleVisual.geometry.dispose();
                const halfWidth = this.rectangleWidth / 2;
                const halfHeight = this.rectangleHeight / 2;

                const rectanglePoints = [
                    new Vector3(-halfWidth, -halfHeight, 0),
                    new Vector3(halfWidth, -halfHeight, 0),
                    new Vector3(halfWidth, halfHeight, 0),
                    new Vector3(-halfWidth, halfHeight, 0),
                    new Vector3(-halfWidth, -halfHeight, 0)
                ];

                this.rectangleVisual.geometry = new BufferGeometry().setFromPoints(rectanglePoints);
            }
            this.rectangleVisual!.visible = this.get_active();
        } else {
            this.removeRectangleVisual();
        }
    }

    private updateRectangleMaxVolumeVisual() {
        if (this.rectangleMaxVolumeWidth > 0 && this.rectangleMaxVolumeHeight > 0) {
            if (!this.rectangleMaxVolumeVisual) this.createRectangleMaxVolumeVisual();
            else {
                this.rectangleMaxVolumeVisual.geometry.dispose();
                const halfWidth = this.rectangleMaxVolumeWidth / 2;
                const halfHeight = this.rectangleMaxVolumeHeight / 2;

                const rectanglePoints = [
                    new Vector3(-halfWidth, -halfHeight, 0),
                    new Vector3(halfWidth, -halfHeight, 0),
                    new Vector3(halfWidth, halfHeight, 0),
                    new Vector3(-halfWidth, halfHeight, 0),
                    new Vector3(-halfWidth, -halfHeight, 0)
                ];

                this.rectangleMaxVolumeVisual.geometry = new BufferGeometry().setFromPoints(rectanglePoints);
            }
            this.rectangleMaxVolumeVisual!.visible = this.get_active();
        } else {
            this.removeRectangleMaxVolumeVisual();
        }
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

    private removeRectangleVisual() {
        if (this.rectangleVisual) {
            this.remove(this.rectangleVisual);
            this.rectangleVisual.geometry.dispose();
            if (this.rectangleVisual.material instanceof LineBasicMaterial) {
                this.rectangleVisual.material.dispose();
            }
            this.rectangleVisual = null;
        }
    }

    private removeRectangleMaxVolumeVisual() {
        if (this.rectangleMaxVolumeVisual) {
            this.remove(this.rectangleMaxVolumeVisual);
            this.rectangleMaxVolumeVisual.geometry.dispose();
            if (this.rectangleMaxVolumeVisual.material instanceof LineBasicMaterial) {
                this.rectangleMaxVolumeVisual.material.dispose();
            }
            this.rectangleMaxVolumeVisual = null;
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
        if (this.zoneType != SoundZoneType.CIRCULAR) data.zoneType = this.zoneType;
        if (this.rectangleWidth != 0) data.rectangleWidth = this.rectangleWidth;
        if (this.rectangleHeight != 0) data.rectangleHeight = this.rectangleHeight;
        if (this.rectangleMaxVolumeWidth != 0) data.rectangleMaxVolumeWidth = this.rectangleMaxVolumeWidth;
        if (this.rectangleMaxVolumeHeight != 0) data.rectangleMaxVolumeHeight = this.rectangleMaxVolumeHeight;

        return data;
    }

    deserialize(data: AudioSerializeData) {
        super.deserialize(data);
        this.sound = data.sound;
        AudioManager.create_audio(this.sound, this.get_id());

        if (data.speed) this.speed = data.speed;
        if (data.volume) this.volume = data.volume;
        if (data.loop) this.loop = data.loop;
        if (data.soundRadius) this.soundRadius = data.soundRadius;
        if (data.maxVolumeRadius) this.maxVolumeRadius = data.maxVolumeRadius;
        if (data.panNormalizationDistance) this.panNormalizationDistance = data.panNormalizationDistance;
        if (data.soundFunction) this.soundFunction = data.soundFunction;
        if (data.fadeInTime) this.fadeInTime = data.fadeInTime;
        if (data.fadeOutTime) this.fadeOutTime = data.fadeOutTime;
        if (data.zoneType) this.zoneType = data.zoneType;
        if (data.rectangleWidth) this.rectangleWidth = data.rectangleWidth;
        if (data.rectangleHeight) this.rectangleHeight = data.rectangleHeight;
        if (data.rectangleMaxVolumeWidth) this.rectangleMaxVolumeWidth = data.rectangleMaxVolumeWidth;
        if (data.rectangleMaxVolumeHeight) this.rectangleMaxVolumeHeight = data.rectangleMaxVolumeHeight;
    }

    after_deserialize() {
        Sound.create(
            SceneManager.get_mesh_url_by_id(this.get_id()),
            this.soundRadius,
            this.volume,
            this.maxVolumeRadius,
            this.panNormalizationDistance,
            this.soundFunction,
            this.fadeInTime,
            this.fadeOutTime,
            this.zoneType,
            this.rectangleWidth,
            this.rectangleHeight,
            this.rectangleMaxVolumeWidth,
            this.rectangleMaxVolumeHeight
        );

        Sound.set_sound_speed(SceneManager.get_mesh_url_by_id(this.get_id()), this.speed);
        Sound.set_sound_loop(SceneManager.get_mesh_url_by_id(this.get_id()), this.loop);
        Sound.set_active(SceneManager.get_mesh_url_by_id(this.get_id()), this.get_active());
    }

    dispose() {
        super.dispose();
        this.removeVisual();
        EventBus.off('SYS_ON_UPDATE', this.updateVisual.bind(this));
        Sound.remove(SceneManager.get_mesh_url_by_id(this.get_id()));
        AudioManager.free_audio(this.get_id());
    }
}