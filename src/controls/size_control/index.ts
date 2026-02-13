/**
 * Модуль SizeControl
 * Реэкспорт всех публичных типов и функций
 */

// Типы
export type {
    MeshPropertyInfo,
    SizeHistoryData,
    ISizeControl,
} from './types';

export {
    DEBUG_BB_POINT_SIZE_MIN,
    DEBUG_BB_POINT_MAX_SIZE_PERCENT,
    DEBUG_BB_POINT_SIZE_MAX,
} from './types';

// Утилиты
export {
    index_to_pivot,
    pivot_to_index,
    get_cursor_dir,
    get_bounds_from_meshes,
    calc_debug_sub_scalar,
} from './utils';

// Геометрия
export {
    create_bb_points,
    create_pivot_points,
    create_anchor_mesh,
    create_slice_box_lines,
    create_debug_center,
    type LayerConfig,
} from './geometry';

// Основной контрол
export {
    type SizeControlType,
    SizeControlCreate,
} from './SizeControl';
