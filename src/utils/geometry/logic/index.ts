// Реэкспорт всех функций geometry/logic модулей
// Обеспечивает обратную совместимость с импортами из geometry/logic

// Трансформации
export {
    rotate_simple,
    rotate,
    rotate_vec_90CW,
    rotate_vec_90CCW,
    invert_vec,
    translate,
} from './transform';

// Операции с формами
export {
    // Arc
    arc_start,
    arc_end,
    arc_middle,
    arc_start_tangent,
    arc_end_tangent,
    // Segment
    segment_start_tangent,
    segment_end_tangent,
    // Shape
    shape_box,
    shape_center,
    shape_contains,
    shape_equal_to,
    clone,
    rewrite,
    transform,
    split,
    split_at_length,
    point_at_length,
    shape_vector,
    reverse,
    // Box
    box_less_than,
    box_merge,
    box_to_points,
    box_to_segments,
    // Point
    point_less_than,
    point_left_to,
    point_on,
    point_projection,
    ptInIntPoints,
    isPointInSegmentBox,
    points2norm,
    // Line
    line_standard,
    line_coord,
    parallel_to,
    incident_To,
    // Circle
    circle_to_arc,
    // Vector
    dot,
    cross,
    angleTo,
    vector_projection,
    vec_angle,
    // Factories
    det,
    point,
    circle,
    vector,
    vector_from_points,
    segment,
} from './shape_ops';

// Пересечения
export {
    intersect,
    line_intersect,
    segment_intersect,
    circle_intersect,
    arc_intersect,
    intersectBox2Box,
    intersectLine2Line,
    intersectLine2Circle,
    intersectLine2Box,
    intersectSegment2Line,
    intersectSegment2Segment,
    intersectSegment2Circle,
    intersectSegment2Arc,
    intersectSegment2Box,
    intersectLine2Arc,
    intersectArc2Circle,
    intersectCircle2Circle,
    intersectCircle2Box,
    intersectArc2Box,
    intersectArc2Arc,
} from './intersect';

// Расстояния
export {
    sort,
    shape2shape_distance,
    point_distance_to,
    point2point,
    point2line,
    point2circle,
    point2segment,
    point2arc,
    arc2point,
    segment2point,
    segment2circle,
    segment2line,
    segment2segment,
    segment2arc,
    arc2segment,
    circle2circle,
    circle2line,
    arc2circle,
    arc2line,
    arc2arc,
    reverse_result,
} from './distance';
