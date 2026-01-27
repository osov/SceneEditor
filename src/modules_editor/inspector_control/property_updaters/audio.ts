/**
 * Обработчики обновления аудио свойств
 */

import { IObjectTypes } from '../../../render_engine/types';
import type { AudioMesh } from '../../../render_engine/objects/audio_mesh';
import { update_audio_sound_function, update_audio_zone_type } from '../../inspector_module';
import type { ChangeInfo, UpdaterContext } from '../types';

/**
 * Внутренний хелпер для обновления аудио свойств
 */
function update_audio_internal<T>(
    ctx: UpdaterContext,
    value: T,
    setter: (audio: AudioMesh, v: T) => void
) {
    for (const item of ctx.selected_list) {
        if (item.type === IObjectTypes.GO_AUDIO_COMPONENT) {
            setter(item as unknown as AudioMesh, value);
        }
    }
}

/**
 * Обновляет звук
 */
export function update_audio_sound(info: ChangeInfo, ctx: UpdaterContext) {
    update_audio_internal(ctx, info.data.event.value as string, (a, v) => a.set_sound(v));
}

/**
 * Обновляет громкость
 */
export function update_audio_volume(info: ChangeInfo, ctx: UpdaterContext) {
    update_audio_internal(ctx, info.data.event.value as number, (a, v) => a.set_volume(v));
}

/**
 * Обновляет зацикливание
 */
export function update_audio_loop(info: ChangeInfo, ctx: UpdaterContext) {
    update_audio_internal(ctx, info.data.event.value as boolean, (a, v) => a.set_loop(v));
}

/**
 * Обновляет панораму
 */
export function update_audio_pan(info: ChangeInfo, ctx: UpdaterContext) {
    update_audio_internal(ctx, info.data.event.value as number, (a, v) => a.set_pan(v));
}

/**
 * Обновляет скорость
 */
export function update_audio_speed(info: ChangeInfo, ctx: UpdaterContext) {
    update_audio_internal(ctx, info.data.event.value as number, (a, v) => a.set_speed(v));
}

/**
 * Обновляет радиус звука
 */
export function update_audio_sound_radius(info: ChangeInfo, ctx: UpdaterContext) {
    update_audio_internal(ctx, info.data.event.value as number, (a, v) => a.set_sound_radius(v));
}

/**
 * Обновляет радиус максимальной громкости
 */
export function update_audio_max_volume_radius(info: ChangeInfo, ctx: UpdaterContext) {
    update_audio_internal(ctx, info.data.event.value as number, (a, v) => a.set_max_volume_radius(v));
}

/**
 * Обновляет функцию затухания звука
 */
export function update_audio_sound_function_handler(info: ChangeInfo, ctx: UpdaterContext) {
    update_audio_sound_function(ctx.selected_list, info.data.event.value as string);
}

/**
 * Обновляет тип зоны звука
 */
export function update_audio_zone_type_handler(info: ChangeInfo, ctx: UpdaterContext) {
    update_audio_zone_type(ctx.selected_list, info.data.event.value as string);
}

/**
 * Обновляет дистанцию нормализации панорамы
 */
export function update_audio_pan_normalization(info: ChangeInfo, ctx: UpdaterContext) {
    update_audio_internal(ctx, info.data.event.value as number, (a, v) => a.set_pan_normalization_distance(v));
}

/**
 * Обновляет ширину прямоугольника
 */
export function update_audio_rectangle_width(info: ChangeInfo, ctx: UpdaterContext) {
    update_audio_internal(ctx, info.data.event.value as number, (a, v) => a.set_rectangle_width(v));
}

/**
 * Обновляет высоту прямоугольника
 */
export function update_audio_rectangle_height(info: ChangeInfo, ctx: UpdaterContext) {
    update_audio_internal(ctx, info.data.event.value as number, (a, v) => a.set_rectangle_height(v));
}

/**
 * Обновляет максимальную ширину прямоугольника
 */
export function update_audio_rectangle_max_width(info: ChangeInfo, ctx: UpdaterContext) {
    update_audio_internal(ctx, info.data.event.value as number, (a, v) => a.set_rectangle_max_volume_width(v));
}

/**
 * Обновляет максимальную высоту прямоугольника
 */
export function update_audio_rectangle_max_height(info: ChangeInfo, ctx: UpdaterContext) {
    update_audio_internal(ctx, info.data.event.value as number, (a, v) => a.set_rectangle_max_volume_height(v));
}

/**
 * Обновляет время нарастания
 */
export function update_audio_fade_in_time(info: ChangeInfo, ctx: UpdaterContext) {
    update_audio_internal(ctx, info.data.event.value as number, (a, v) => a.set_fade_in_time(v));
}

/**
 * Обновляет время затухания
 */
export function update_audio_fade_out_time(info: ChangeInfo, ctx: UpdaterContext) {
    update_audio_internal(ctx, info.data.event.value as number, (a, v) => a.set_fade_out_time(v));
}
