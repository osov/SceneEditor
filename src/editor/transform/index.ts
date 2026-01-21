/**
 * Transform - модули трансформации объектов
 */

// Типы
export type {
    TransformableObject,
    PositionHistoryItem,
    RotationHistoryItem,
    ScaleHistoryItem,
} from './types';

// Применение трансформаций
export {
    apply_translate,
    apply_rotate,
    apply_scale,
    save_positions,
    save_rotations,
    save_scales,
} from './apply_transforms';

// История
export {
    type HistoryHandlerDeps,
    write_positions_to_history,
    write_rotations_to_history,
    write_scales_to_history,
} from './history_handlers';

// Proxy
export {
    calculate_average_point,
    set_proxy_in_average_point,
    init_proxy_from_object,
} from './proxy_manager';
