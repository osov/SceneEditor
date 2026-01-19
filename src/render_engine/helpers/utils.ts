// Реэкспорт всех утилит для обратной совместимости
// DEPRECATED: используйте прямые импорты из соответствующих модулей:
// - file.ts: get_basename, get_file_name
// - common.ts: lerp, rand_int, rand_float, error_popup
// - curve.ts: generateArcLengthTable, getPointCurve, getUniformPoint
// - geometry.ts: flip_geometry_*, rotate_point*, convert_width_height_to_pivot_bb, set_pivot_with_sync_pos, make_ramk
// - mesh.ts: is_base_mesh, filter_list_base_mesh, is_tile, is_text, и др.
// - material.ts: copy_material, updateEachMaterialWhichHasTexture

export * from './file';
export * from './common';
export * from './curve';
export * from './geometry';
export * from './mesh';
export * from './material';
