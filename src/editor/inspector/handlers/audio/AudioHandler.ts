/**
 * AudioHandler - обработчик аудио свойств
 *
 * Обрабатывает все аудио свойства:
 * - sound, volume, loop, pan, speed
 * - sound_radius, max_volume_radius
 * - sound_function, zone_type
 * - pan_normalization, fade_in_time, fade_out_time
 * - rectangle_width, rectangle_height, rectangle_max_width, rectangle_max_height
 */

import { Property } from '../../../../core/inspector/IInspectable';
import {
    type IPropertyHandler,
    type ReadContext,
    type ReadResult,
    type UpdateContext,
    type HandlerParams,
} from '../types';

import {
    read_sound,
    read_volume,
    read_loop,
    read_pan,
    read_speed,
    read_play_pause,
    read_stop,
    read_sound_radius,
    read_max_volume_radius,
    read_pan_normalization,
    read_sound_function,
    read_zone_type,
    read_fade_in_time,
    read_fade_out_time,
    read_rectangle_width,
    read_rectangle_height,
    read_rectangle_max_width,
    read_rectangle_max_height,
} from './readers';

import {
    update_sound,
    update_volume,
    update_loop,
    update_pan,
    update_speed,
    update_play_pause,
    update_stop,
    update_sound_radius,
    update_max_volume_radius,
    update_pan_normalization,
    update_sound_function,
    update_zone_type,
    update_fade_in_time,
    update_fade_out_time,
    update_rectangle_width,
    update_rectangle_height,
    update_rectangle_max_width,
    update_rectangle_max_height,
} from './updaters';

/** Создать AudioHandler */
export function create_audio_handler(_params?: HandlerParams): IPropertyHandler {
    const properties: Property[] = [
        Property.SOUND,
        Property.VOLUME,
        Property.LOOP,
        Property.PAN,
        Property.SPEED,
        Property.AUDIO_PLAY_PAUSE,
        Property.AUDIO_STOP,
        Property.SOUND_RADIUS,
        Property.MAX_VOLUME_RADIUS,
        Property.PAN_NORMALIZATION,
        Property.SOUND_FUNCTION,
        Property.ZONE_TYPE,
        Property.FADE_IN_TIME,
        Property.FADE_OUT_TIME,
        Property.RECTANGLE_WIDTH,
        Property.RECTANGLE_HEIGHT,
        Property.RECTANGLE_MAX_WIDTH,
        Property.RECTANGLE_MAX_HEIGHT,
    ];

    function read(property: Property, context: ReadContext): ReadResult<unknown> {
        switch (property) {
            case Property.SOUND:
                return read_sound(context);
            case Property.VOLUME:
                return read_volume(context);
            case Property.LOOP:
                return read_loop(context);
            case Property.PAN:
                return read_pan(context);
            case Property.SPEED:
                return read_speed(context);
            case Property.AUDIO_PLAY_PAUSE:
                return read_play_pause(context);
            case Property.AUDIO_STOP:
                return read_stop(context);
            case Property.SOUND_RADIUS:
                return read_sound_radius(context);
            case Property.MAX_VOLUME_RADIUS:
                return read_max_volume_radius(context);
            case Property.PAN_NORMALIZATION:
                return read_pan_normalization(context);
            case Property.SOUND_FUNCTION:
                return read_sound_function(context);
            case Property.ZONE_TYPE:
                return read_zone_type(context);
            case Property.FADE_IN_TIME:
                return read_fade_in_time(context);
            case Property.FADE_OUT_TIME:
                return read_fade_out_time(context);
            case Property.RECTANGLE_WIDTH:
                return read_rectangle_width(context);
            case Property.RECTANGLE_HEIGHT:
                return read_rectangle_height(context);
            case Property.RECTANGLE_MAX_WIDTH:
                return read_rectangle_max_width(context);
            case Property.RECTANGLE_MAX_HEIGHT:
                return read_rectangle_max_height(context);
            default:
                return { value: undefined, values_by_id: new Map(), has_differences: false };
        }
    }

    function update(property: Property, context: UpdateContext): void {
        switch (property) {
            case Property.SOUND:
                update_sound(context);
                break;
            case Property.VOLUME:
                update_volume(context);
                break;
            case Property.LOOP:
                update_loop(context);
                break;
            case Property.PAN:
                update_pan(context);
                break;
            case Property.SPEED:
                update_speed(context);
                break;
            case Property.AUDIO_PLAY_PAUSE:
                update_play_pause(context);
                break;
            case Property.AUDIO_STOP:
                update_stop(context);
                break;
            case Property.SOUND_RADIUS:
                update_sound_radius(context);
                break;
            case Property.MAX_VOLUME_RADIUS:
                update_max_volume_radius(context);
                break;
            case Property.PAN_NORMALIZATION:
                update_pan_normalization(context);
                break;
            case Property.SOUND_FUNCTION:
                update_sound_function(context);
                break;
            case Property.ZONE_TYPE:
                update_zone_type(context);
                break;
            case Property.FADE_IN_TIME:
                update_fade_in_time(context);
                break;
            case Property.FADE_OUT_TIME:
                update_fade_out_time(context);
                break;
            case Property.RECTANGLE_WIDTH:
                update_rectangle_width(context);
                break;
            case Property.RECTANGLE_HEIGHT:
                update_rectangle_height(context);
                break;
            case Property.RECTANGLE_MAX_WIDTH:
                update_rectangle_max_width(context);
                break;
            case Property.RECTANGLE_MAX_HEIGHT:
                update_rectangle_max_height(context);
                break;
        }
    }

    return {
        properties,
        read,
        update,
    };
}
