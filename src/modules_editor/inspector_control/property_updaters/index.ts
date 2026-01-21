/**
 * Реэкспорт всех property updaters
 */

// Transform updaters
export {
    update_position,
    update_rotation,
    update_scale,
    update_size,
} from './transform';

// Core updaters
export {
    update_name,
    update_active,
    update_visible,
    update_pivot,
    update_anchor,
    update_anchor_preset,
} from './core';

// Visual updaters
export {
    update_color,
    update_alpha,
    update_texture,
    update_slice,
    update_atlas,
    update_blend_mode,
    update_material,
    update_flip_vertical,
    update_flip_horizontal,
    update_flip_diagonal,
} from './visual';

// Text updaters
export {
    update_text,
    update_font,
    update_font_size,
    update_text_align,
    update_line_height,
} from './text';

// Audio updaters
export {
    update_audio_sound,
    update_audio_volume,
    update_audio_loop,
    update_audio_pan,
    update_audio_speed,
    update_audio_sound_radius,
    update_audio_max_volume_radius,
    update_audio_sound_function_handler,
    update_audio_zone_type_handler,
    update_audio_pan_normalization,
    update_audio_rectangle_width,
    update_audio_rectangle_height,
    update_audio_rectangle_max_width,
    update_audio_rectangle_max_height,
    update_audio_fade_in_time,
    update_audio_fade_out_time,
} from './audio';

// Model updaters
export {
    update_mesh_name,
    update_current_animation,
    update_model_scale,
    update_model_materials,
    update_slot_material,
} from './model';
