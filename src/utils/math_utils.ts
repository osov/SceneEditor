export interface Vec2XY {
    x: number;
    y: number;
}

export type ArcLengthMap = { t: number; distance: number }[];


export function vec2_distance_to(a: Vec2XY, b: Vec2XY) {
    const dx = a.x - b.x, dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
}

export function vec2_div_scalar(v: Vec2XY, d: number) {
    v.x /= d;
    v.y /= d;
    return v;
}

export function vec2_length(v: Vec2XY) {
    return Math.sqrt(v.x * v.x + v.y * v.y);
}

export function vec2_normalize(v: Vec2XY) {
    return vec2_div_scalar(v, vec2_length(v) || 1);
}

export function vec2_sub(v1: Vec2XY, v2: Vec2XY) {
    return { x: v1.x - v2.x, y: v1.y - v2.y };
}

function CatmullRom(t: number, p0: number, p1: number, p2: number, p3: number): number {
    const v0 = (p2 - p0) * 0.5;
    const v1 = (p3 - p1) * 0.5;
    const t2 = t * t;
    const t3 = t * t2;
    return (2 * p1 - 2 * p2 + v0 + v1) * t3 + (-3 * p1 + 3 * p2 - 2 * v0 - v1) * t2 + v0 * t + p1;
}

export function get_point_curve(t: number, points: Vec2XY[], out: Vec2XY) {
    const p = (points.length - 1) * t;

    const intPoint = Math.floor(p);
    const weight = p - intPoint;

    const p0 = points[intPoint === 0 ? intPoint : intPoint - 1];
    const p1 = points[intPoint];
    const p2 = points[intPoint > points.length - 2 ? points.length - 1 : intPoint + 1];
    const p3 = points[intPoint > points.length - 3 ? points.length - 1 : intPoint + 2];

    out.x = CatmullRom(weight, p0.x, p1.x, p2.x, p3.x);
    out.y = CatmullRom(weight, p0.y, p1.y, p2.y, p3.y);
}

export function compute_arc_length_table(points: Vec2XY[], steps = 100) {
    let length = 0;
    const table: ArcLengthMap = [];
    const p = { x: 0, y: 0 };
    const prev = { x: 0, y: 0 };

    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        get_point_curve(t, points, p);
        if (i > 0) {
            const dx = p.x - prev.x;
            const dy = p.y - prev.y;
            length += Math.sqrt(dx * dx + dy * dy);
        }
        table.push({ t, distance: length });
        prev.x = p.x;
        prev.y = p.y;
    }
    return table;
}

export function get_t_by_distance(table: ArcLengthMap, target_distance: number) {
    if (target_distance <= 0) return 0;
    if (target_distance >= table[table.length - 1].distance) return 1;

    for (let i = 1; i < table.length; i++) {
        const prev = table[i - 1];
        const curr = table[i];
        if (target_distance <= curr.distance) {
            const span = curr.distance - prev.distance;
            const localT = (target_distance - prev.distance) / span;
            return prev.t + (curr.t - prev.t) * localT;
        }
    }
    return 1;
}

export function get_position_by_time(current_time: number, start_time: number, speed: number, points: Vec2XY[], arc_table: ArcLengthMap, out: vmath.vector3) {
    const elapsed = (current_time - start_time);
    const distance_traveled = speed * elapsed;
    const t = get_t_by_distance(arc_table, distance_traveled);
    get_point_curve(t, points, out);
    return t;
}

export function rotate_point(point: vmath.vector3, size: vmath.vector3, angle_deg: number,) {
    const pivot = { x: point.x - size.x / 2, y: point.y - size.y / 2 };
    return rotate_point_pivot(point, pivot, angle_deg);
}

export function rotate_point_pivot(point: vmath.vector3, pivot: {x:number,y:number}, angle_deg: number) {
    const angle = angle_deg * Math.PI / 180;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);

    // Перемещение точки в начало координат относительно pivot
    const xTranslated = point.x - pivot.x;
    const yTranslated = point.y - pivot.y;

    // Поворот
    const xRotated = xTranslated * cosA - yTranslated * sinA;
    const yRotated = xTranslated * sinA + yTranslated * cosA;

    // Обратное перемещение
    const xNew = xRotated + pivot.x;
    const yNew = yRotated + pivot.y;

    return { x: xNew, y: yNew };
}


export function degToRad(degrees: number) {
    return degrees * (Math.PI / 180);
}

function interpolate_delta_with_wrapping(start: number, end: number, percent: number, wrap_min: number, wrap_max: number) {
    const wrap_test = wrap_max - wrap_min;
    if (start - end > wrap_test / 2) end += wrap_test;
    else if (end - start > wrap_test / 2) start += wrap_test;
    return (end - start) * percent;
}

export function interpolate_with_wrapping(start: number, end: number, percent: number, wrap_min: number, wrap_max: number, is_range = false) {
    let interpolated_val = start + interpolate_delta_with_wrapping(start, end, percent, wrap_min, wrap_max);
    if (is_range) {
        const wrap_length = (wrap_max - wrap_min) / 2;
        if (interpolated_val >= wrap_length) interpolated_val -= 2 * wrap_length;
        if (interpolated_val <= -wrap_length) interpolated_val += 2 * wrap_length;
    }
    else {
        const wrap_length = wrap_max - wrap_min;
        if (interpolated_val >= wrap_length) interpolated_val -= wrap_length;
        if (interpolated_val < 0) interpolated_val += wrap_length;
    }
    return interpolated_val;
}
