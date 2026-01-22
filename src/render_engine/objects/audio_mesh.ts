// AudioMesh - аудио компонент с визуализацией зон звука

import { IObjectTypes } from "../types";
import { EntityBase } from "./entity_base";
import {
    DEFAULT_PAN_NORMALIZATION_DISTANCE,
    DEFAULT_MAX_VOLUME_RADIUS,
    DEFAULT_SOUND_RADIUS,
    DEFAULT_FADE_IN_TIME,
    DEFAULT_FADE_OUT_TIME,
    DEFAULT_CIRCULAR_SOUND_RADIUS,
    DEFAULT_CIRCULAR_MAX_VOLUME_RADIUS,
    DEFAULT_RECTANGLE_WIDTH,
    DEFAULT_RECTANGLE_HEIGHT,
    DEFAULT_RECTANGLE_MAX_WIDTH,
    DEFAULT_RECTANGLE_MAX_HEIGHT,
} from "../../config";

import { get_sound } from "../../modules/Sound";
import { get_audio_manager } from "../AudioManager";
import { uh_to_id } from "@editor/defold/utils";
import { Services } from '@editor/core/ServiceProvider';
import { DC_LAYERS } from '@editor/engine/RenderService';
import { Property, PropertyType, type InspectorFieldDefinition } from "@editor/core/inspector";
import {
    SoundFunctionType,
    SoundZoneType,
    type AudioSerializeData,
    AudioVisualizerCreate,
    type IAudioVisualizer
} from "./audio";

// Реэкспорт типов для обратной совместимости
export { SoundFunctionType, SoundZoneType, type AudioSerializeData };

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

    // Визуализатор аудио зон
    private visualizer: IAudioVisualizer;

    // Сохраняем bound функцию для корректного удаления listener
    private boundUpdateVisual: () => void;

    constructor(id: number) {
        super(id);
        this.layers.disable(DC_LAYERS.GO_LAYER);
        this.layers.enable(DC_LAYERS.RAYCAST_LAYER);
        this.visualizer = AudioVisualizerCreate(this);
        this.boundUpdateVisual = this.updateVisualizer.bind(this);
        Services.event_bus.on('engine:update', this.boundUpdateVisual);
    }

    get_id() {
        return this.mesh_data.id;
    }

    /** Получить URL объекта (безопасно, т.к. объект уже в сцене) */
    private get_url(): string {
        const url = Services.scene.get_url_by_id(this.mesh_data.id);
        if (url === undefined) throw new Error(`AudioMesh URL not found for id: ${this.get_id()}`);
        return url;
    }

    /** Обновляет параметры визуализатора */
    private syncVisualizerParams(): void {
        this.visualizer.set_params({
            soundRadius: this.soundRadius,
            maxVolumeRadius: this.maxVolumeRadius,
            panNormalizationDistance: this.panNormalizationDistance,
            zoneType: this.zoneType,
            rectangleWidth: this.rectangleWidth,
            rectangleHeight: this.rectangleHeight,
            rectangleMaxVolumeWidth: this.rectangleMaxVolumeWidth,
            rectangleMaxVolumeHeight: this.rectangleMaxVolumeHeight,
            isActive: this.get_active()
        });
    }

    /** Обновляет визуализацию (вызывается на engine:update) */
    private updateVisualizer(): void {
        this.syncVisualizerParams();
        this.visualizer.update();
    }

    set_active(val: boolean): void {
        super.set_active(val);
        get_sound().set_active(this.get_url(), val);
    }

    // NOTE: перед установкой звука важно чтобы меш уже был создан и добавлен в сцену
    set_sound(name: string) {
        if (this.sound !== '') {
            this.dispose();
        }

        this.sound = name;
        get_audio_manager().create_audio(name, this.get_id());
        get_sound().create(
            this.get_url(),
            this.position,
            this.speed,
            this.pan,
            this.loop,
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
        this.syncVisualizerParams();
        this.visualizer.create();
    }

    get_sound() {
        return this.sound;
    }

    set_position(x: number, y: number, z?: number) {
        z = z === undefined ? this.position.z : z;
        super.set_position(x, y, z);
        get_sound().set_sound_position(this.get_url(), vmath.vector3(x, y, z));
    }

    set_speed(speed: number) {
        this.speed = speed;
        get_sound().set_sound_speed(this.get_url(), speed);
    }

    get_speed() {
        return this.speed;
    }

    set_volume(volume: number) {
        this.volume = volume;
        get_sound().set_max_volume(this.get_url(), volume);
    }

    get_volume() {
        return this.volume;
    }

    set_pan(pan: number) {
        this.pan = pan;
        get_sound().set_sound_pan(this.get_url(), pan);
    }

    get_pan() {
        return this.pan;
    }

    set_loop(loop: boolean) {
        this.loop = loop;
        const url = this.get_url();
        get_sound().set_sound_loop(url, loop);
        get_audio_manager().set_loop(uh_to_id(url), loop);
    }

    get_loop() {
        return this.loop;
    }

    set_sound_radius(radius: number) {
        this.soundRadius = Math.max(0, radius);
        get_sound().set_sound_radius(this.get_url(), this.soundRadius);
        Services.event_bus.emit('inspector:update', {});
    }

    get_sound_radius() {
        return this.soundRadius;
    }

    set_zone_type(zoneType: SoundZoneType) {
        const previousZoneType = this.zoneType;
        this.zoneType = zoneType;

        if (previousZoneType !== zoneType) {
            if (zoneType === SoundZoneType.CIRCULAR) {
                this.rectangleWidth = 0;
                this.rectangleHeight = 0;
                this.rectangleMaxVolumeWidth = 0;
                this.rectangleMaxVolumeHeight = 0;

                get_sound().set_rectangle_width(this.get_url(), 0);
                get_sound().set_rectangle_height(this.get_url(), 0);
                get_sound().set_rectangle_max_volume_width(this.get_url(), 0);
                get_sound().set_rectangle_max_volume_height(this.get_url(), 0);

                // Устанавливаем дефолтные значения радиусов при переключении на круг
                if (this.soundRadius === 0) {
                    this.soundRadius = DEFAULT_CIRCULAR_SOUND_RADIUS;
                    get_sound().set_sound_radius(this.get_url(), DEFAULT_CIRCULAR_SOUND_RADIUS);
                }
                if (this.maxVolumeRadius === 0) {
                    this.maxVolumeRadius = DEFAULT_CIRCULAR_MAX_VOLUME_RADIUS;
                    get_sound().set_max_volume_radius(this.get_url(), DEFAULT_CIRCULAR_MAX_VOLUME_RADIUS);
                }
            } else if (zoneType === SoundZoneType.RECTANGULAR) {
                this.soundRadius = 0;
                this.maxVolumeRadius = 0;

                get_sound().set_sound_radius(this.get_url(), 0);
                get_sound().set_max_volume_radius(this.get_url(), 0);

                // Устанавливаем дефолтные значения для прямоугольника если они были нулевыми
                if (this.rectangleWidth === 0) {
                    this.rectangleWidth = DEFAULT_RECTANGLE_WIDTH;
                    get_sound().set_rectangle_width(this.get_url(), DEFAULT_RECTANGLE_WIDTH);
                }
                if (this.rectangleHeight === 0) {
                    this.rectangleHeight = DEFAULT_RECTANGLE_HEIGHT;
                    get_sound().set_rectangle_height(this.get_url(), DEFAULT_RECTANGLE_HEIGHT);
                }
                if (this.rectangleMaxVolumeWidth === 0) {
                    this.rectangleMaxVolumeWidth = DEFAULT_RECTANGLE_MAX_WIDTH;
                    get_sound().set_rectangle_max_volume_width(this.get_url(), DEFAULT_RECTANGLE_MAX_WIDTH);
                }
                if (this.rectangleMaxVolumeHeight === 0) {
                    this.rectangleMaxVolumeHeight = DEFAULT_RECTANGLE_MAX_HEIGHT;
                    get_sound().set_rectangle_max_volume_height(this.get_url(), DEFAULT_RECTANGLE_MAX_HEIGHT);
                }
            }

            this.visualizer.remove();
            this.syncVisualizerParams();
            this.visualizer.create();
        }

        get_sound().set_zone_type(this.get_url(), zoneType);
        Services.event_bus.emit('inspector:update', {});
    }

    get_zone_type() {
        return this.zoneType;
    }

    set_rectangle_width(width: number) {
        this.rectangleWidth = Math.max(0, width);
        get_sound().set_rectangle_width(this.get_url(), this.rectangleWidth);
        Services.event_bus.emit('inspector:update', {});
    }

    get_rectangle_width() {
        return this.rectangleWidth;
    }

    set_rectangle_height(height: number) {
        this.rectangleHeight = Math.max(0, height);
        get_sound().set_rectangle_height(this.get_url(), this.rectangleHeight);
        Services.event_bus.emit('inspector:update', {});
    }

    get_rectangle_height() {
        return this.rectangleHeight;
    }

    set_rectangle_max_volume_width(width: number) {
        this.rectangleMaxVolumeWidth = Math.max(0, width);
        get_sound().set_rectangle_max_volume_width(this.get_url(), this.rectangleMaxVolumeWidth);
        Services.event_bus.emit('inspector:update', {});
    }

    get_rectangle_max_volume_width() {
        return this.rectangleMaxVolumeWidth;
    }

    set_rectangle_max_volume_height(height: number) {
        this.rectangleMaxVolumeHeight = Math.max(0, height);
        get_sound().set_rectangle_max_volume_height(this.get_url(), this.rectangleMaxVolumeHeight);
        Services.event_bus.emit('inspector:update', {});
    }

    get_rectangle_max_volume_height() {
        return this.rectangleMaxVolumeHeight;
    }

    set_max_volume_radius(radius: number) {
        this.maxVolumeRadius = Math.max(0, radius);
        get_sound().set_max_volume_radius(this.get_url(), this.maxVolumeRadius);
    }

    get_max_volume_radius() {
        return this.maxVolumeRadius;
    }

    set_pan_normalization_distance(distance: number) {
        this.panNormalizationDistance = Math.max(0, distance);
        get_sound().set_pan_normalization_distance(this.get_url(), this.panNormalizationDistance);
    }

    get_pan_normalization_distance() {
        return this.panNormalizationDistance;
    }

    set_sound_function(func: SoundFunctionType) {
        this.soundFunction = func;
        get_sound().set_sound_function(this.get_url(), this.soundFunction);
    }

    get_sound_function() {
        return this.soundFunction;
    }

    set_fade_in_time(time: number) {
        this.fadeInTime = Math.max(0, time);
        get_sound().set_fade_in_time(this.get_url(), this.fadeInTime);
    }

    get_fade_in_time() {
        return this.fadeInTime;
    }

    set_fade_out_time(time: number) {
        this.fadeOutTime = Math.max(0, time);
        get_sound().set_fade_out_time(this.get_url(), this.fadeOutTime);
    }

    get_fade_out_time() {
        return this.fadeOutTime;
    }

    play(complete_function?: () => void) {
        if (this.sound === '' || !this.get_active()) return;
        get_sound().set_off(this.get_url(), false);
        get_sound().play(this.get_url(), () => {
            if (this.loop) this.play(complete_function);
            else if (complete_function !== undefined) complete_function();
        });
        Services.event_bus.emit('inspector:update', {});
    }

    is_spatial() {
        const is_circular_zone = this.zoneType === SoundZoneType.CIRCULAR && this.soundRadius > 0;
        const is_rectangular_zone = this.zoneType === SoundZoneType.RECTANGULAR && (this.rectangleWidth > 0 || this.rectangleHeight > 0);
        return is_circular_zone || is_rectangular_zone;
    }

    pause() {
        if (this.sound === '' || !this.get_active()) return;
        get_sound().pause(this.get_url(), true);
        Services.event_bus.emit('inspector:update', {});
    }

    resume() {
        if (this.sound === '' || !this.get_active()) return;
        get_sound().pause(this.get_url(), false);
        Services.event_bus.emit('inspector:update', {});
    }

    is_paused() {
        if (!this.get_active()) return false;
        const sound_module = get_sound();
        // Проверяем активен ли звук но на паузе
        return !sound_module.is_sound_playing(this.get_url()) && sound_module.is_off(this.get_url()) === false;
    }

    stop() {
        if (this.sound === '' || !this.get_active()) return;
        get_sound().stop(this.get_url());
        get_sound().set_off(this.get_url(), true);
        Services.event_bus.emit('inspector:update', {});
    }

    is_playing() {
        if (!this.get_active()) return false;
        return get_sound().is_sound_playing(this.get_url());
    }

    serialize() {
        const data: AudioSerializeData = {
            ...super.serialize(),
            sound: this.sound
        };

        if (this.speed !== 1) data.speed = this.speed;
        if (this.volume !== 1) data.volume = this.volume;
        if (this.loop !== false) data.loop = this.loop;
        if (this.soundRadius !== DEFAULT_SOUND_RADIUS) data.soundRadius = this.soundRadius;
        if (this.maxVolumeRadius !== DEFAULT_MAX_VOLUME_RADIUS) data.maxVolumeRadius = this.maxVolumeRadius;
        if (this.panNormalizationDistance !== DEFAULT_PAN_NORMALIZATION_DISTANCE) data.panNormalizationDistance = this.panNormalizationDistance;
        if (this.soundFunction !== SoundFunctionType.LINEAR) data.soundFunction = this.soundFunction;
        if (this.fadeInTime !== DEFAULT_FADE_IN_TIME) data.fadeInTime = this.fadeInTime;
        if (this.fadeOutTime !== DEFAULT_FADE_OUT_TIME) data.fadeOutTime = this.fadeOutTime;
        if (this.zoneType !== SoundZoneType.CIRCULAR) data.zoneType = this.zoneType;
        if (this.rectangleWidth !== 0) data.rectangleWidth = this.rectangleWidth;
        if (this.rectangleHeight !== 0) data.rectangleHeight = this.rectangleHeight;
        if (this.rectangleMaxVolumeWidth !== 0) data.rectangleMaxVolumeWidth = this.rectangleMaxVolumeWidth;
        if (this.rectangleMaxVolumeHeight !== 0) data.rectangleMaxVolumeHeight = this.rectangleMaxVolumeHeight;

        return data;
    }

    deserialize(data: AudioSerializeData) {
        super.deserialize(data);
        this.sound = data.sound;
        get_audio_manager().create_audio(this.sound, this.get_id());

        if (data.speed !== undefined) this.speed = data.speed;
        if (data.volume !== undefined) this.volume = data.volume;
        if (data.loop !== undefined) this.loop = data.loop;
        if (data.soundRadius !== undefined) this.soundRadius = data.soundRadius;
        if (data.maxVolumeRadius !== undefined) this.maxVolumeRadius = data.maxVolumeRadius;
        if (data.panNormalizationDistance !== undefined) this.panNormalizationDistance = data.panNormalizationDistance;
        if (data.soundFunction !== undefined) this.soundFunction = data.soundFunction;
        if (data.fadeInTime !== undefined) this.fadeInTime = data.fadeInTime;
        if (data.fadeOutTime !== undefined) this.fadeOutTime = data.fadeOutTime;
        if (data.zoneType !== undefined) this.zoneType = data.zoneType;
        if (data.rectangleWidth !== undefined) this.rectangleWidth = data.rectangleWidth;
        if (data.rectangleHeight !== undefined) this.rectangleHeight = data.rectangleHeight;
        if (data.rectangleMaxVolumeWidth !== undefined) this.rectangleMaxVolumeWidth = data.rectangleMaxVolumeWidth;
        if (data.rectangleMaxVolumeHeight !== undefined) this.rectangleMaxVolumeHeight = data.rectangleMaxVolumeHeight;
    }

    after_deserialize() {
        get_sound().create(
            this.get_url(),
            this.position,
            this.speed,
            this.pan,
            this.loop,
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

        get_sound().set_sound_speed(this.get_url(), this.speed);
        get_sound().set_sound_loop(this.get_url(), this.loop);
        get_sound().set_active(this.get_url(), this.get_active());
    }

    dispose() {
        super.dispose();
        this.visualizer.dispose();
        Services.event_bus.off('engine:update', this.boundUpdateVisual);
        get_sound().remove(this.get_url());
        get_audio_manager().free_audio(this.get_id());
    }

    /**
     * AudioMesh добавляет аудио поля к базовым полям
     */
    override get_inspector_fields(): InspectorFieldDefinition[] {
        return [
            ...super.get_inspector_fields(),
            // Аудио - основные
            { group: 'audio', property: Property.SOUND, type: PropertyType.LIST_TEXT },
            { group: 'audio', property: Property.VOLUME, type: PropertyType.SLIDER, params: { min: 0, max: 1, step: 0.01 } },
            { group: 'audio', property: Property.LOOP, type: PropertyType.BOOLEAN },
            { group: 'audio', property: Property.PAN, type: PropertyType.SLIDER, params: { min: -1, max: 1, step: 0.01 } },
            { group: 'audio', property: Property.SPEED, type: PropertyType.NUMBER, params: { min: 0.1, max: 10, step: 0.1 } },
            // Аудио - контролы воспроизведения
            { group: 'audio', property: Property.AUDIO_PLAY_PAUSE, type: PropertyType.BUTTON, title: this.is_playing() ? '⏹ Стоп' : '▶ Играть' },
            { group: 'audio', property: Property.AUDIO_STOP, type: PropertyType.BUTTON, title: '⏹ Стоп' },
            // Аудио - пространственные
            { group: 'audio', property: Property.ZONE_TYPE, type: PropertyType.LIST_TEXT },
            { group: 'audio', property: Property.SOUND_FUNCTION, type: PropertyType.LIST_TEXT },
            { group: 'audio', property: Property.SOUND_RADIUS, type: PropertyType.NUMBER, params: { min: 0 } },
            { group: 'audio', property: Property.MAX_VOLUME_RADIUS, type: PropertyType.NUMBER, params: { min: 0 } },
            { group: 'audio', property: Property.PAN_NORMALIZATION, type: PropertyType.NUMBER, params: { min: 0 } },
            // Аудио - прямоугольные зоны
            { group: 'audio', property: Property.RECTANGLE_WIDTH, type: PropertyType.NUMBER, params: { min: 0 } },
            { group: 'audio', property: Property.RECTANGLE_HEIGHT, type: PropertyType.NUMBER, params: { min: 0 } },
            { group: 'audio', property: Property.RECTANGLE_MAX_WIDTH, type: PropertyType.NUMBER, params: { min: 0 } },
            { group: 'audio', property: Property.RECTANGLE_MAX_HEIGHT, type: PropertyType.NUMBER, params: { min: 0 } },
            // Аудио - fade
            { group: 'audio', property: Property.FADE_IN_TIME, type: PropertyType.NUMBER, params: { min: 0, step: 0.1 } },
            { group: 'audio', property: Property.FADE_OUT_TIME, type: PropertyType.NUMBER, params: { min: 0, step: 0.1 } },
        ];
    }
}
