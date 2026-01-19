/**
 * Модуль inspector_module - утилиты для работы с инспектором
 *
 * - InspectorOptionsUpdater - обновление опций выпадающих списков
 * - preset_converters - преобразования pivot/anchor ↔ preset
 * - blend_converters - преобразования BlendMode ↔ Three.js Blending
 * - tweakpane_utils - утилиты для работы с TweakPane
 */

export { InspectorOptionsUpdaterCreate, type IInspectorOptionsUpdater } from './InspectorOptionsUpdater';

export {
    ScreenPointPreset,
    pivot_to_screen_preset,
    screen_preset_to_pivot_value,
    anchor_to_screen_preset,
    screen_preset_to_anchor_value,
} from './preset_converters';

export {
    BlendMode,
    convert_blend_mode_to_threejs,
    convert_threejs_blending_to_blend_mode,
} from './blend_converters';

export {
    get_changed_info,
    get_dragged_info,
} from './tweakpane_utils';

export {
    create_default_inspector_config,
    PropertyType as ConfigPropertyType,
    FilterMode as ConfigFilterMode,
    TextAlign as ConfigTextAlign,
} from './inspector_config';

export {
    try_disabled_value_by_axis,
    AXIS_CONFIGS,
    type AxisDifferenceConfig,
    type AxisChangeInfo,
} from './axis_disabled_utils';

export {
    update_uniform_sampler2d,
    update_uniform_float,
    update_uniform_range,
    update_uniform_vec2,
    update_uniform_vec3,
    update_uniform_vec4,
    update_uniform_color,
    type UniformUpdateContext,
    type UniformChangeInfo,
} from './uniform_update_utils';

export {
    update_audio_property,
    update_audio_sound_function,
    update_audio_zone_type,
    parse_sound_function_type,
    parse_sound_zone_type,
    type AudioMeshSetter,
} from './audio_update_utils';
