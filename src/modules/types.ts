import { WORLD_SCALAR } from "@editor/config"
import { Arc, Point, PointLike, Segment } from "./Geometry"


/**
 * JS (JOYSTICK) двигается в направлении, полученном от джойстика   
 * FP (FOLLOW_POINTER) - двигается в направлении курсора, пока не достигнет точки уровня, в которой была отпущена ЛКМ   
 * GP (GO_TO_POINT) - ищет путь к позиции где был клик
 */
export enum ControlType {
    JS,
    FP,
    GP,
    // FOLLOW_DIRECTION,            
}

export enum NextMoveType {
    STRAIGHT_LINE,
    SLIDE_OBSTACLE,
    BYPASS_ANGLE,
    STOP,
}

export type PredictNextMoveData = {
    next_do: NextMoveType, 
    way_required: Segment,
    lenght_remains: number,
    vertice_to_bypass?: Point,
    prev_vertice?: Point,
    obstacle_to_slide?: Segment,
    prev_obstacle?: Segment,
    control_type: ControlType,
}

export type ClosestObstacleData = {
    obstacle?: Segment,
    distance: number,
    point?: Point,
    way?: Segment | Arc,
    is_vertice: boolean,
}

export type WayNode = {
    arc?: Arc,                          // Дуга пути обхода предыдущей вершины, если она была
    segment?: Segment,                  // Сегмент пути
    previous_vertice?: Point,           // Предыдущая вершина
    previous_clockwise?: boolean,       // Направление обхода этой вершины
    next_vertice?: Point,               // Вершина возле которой остановились в конце segment. Если segment заканчивается в точке target, не указывается
    next_clockwise?: boolean,           // Требуемое направление обхода этой вершины
    parent?: WayNode,
    children: WayNode[],
    depth: number,
    total_length: number,
};

export type PlayerMovementSettings = {
    collision_min_error: number,          // Минимальное расстояние сближения с припятствиями, для предотвращения соприкосновений геометрий 

    max_predicted_way_intervals: number,  // Макс. количество отрезков прогнозируемого пути, на котором цикл построения пути завершится преждевременно
    predicted_way_lenght_mult: number,    // Множитель длины пути для построения пути с запасом
    min_required_way: number,
    min_awailable_way: number,
    min_idle_time: number,
    min_target_change: number,
    control_type: ControlType,
    keys_control: boolean,         // TODO: управление через клавиатуру
    model_layer: number,
    target_stop_distance: number,  // Расстояние остановки игрока от точки target
    animation_names: AnimationNames,
    update_interval: number,       // Интервал между обновлениями прогнозируемого пути по умолчанию 
    min_update_interval: number,   // Минимальный интервал между обновлениями прогнозируемого пути
    update_way_angle: number,      // Минимальный угол изменения направления движения, при котором произойдёт обновление прогнозируемого пути
    block_move_min_angle: number,  // Минимальный угол между нормалью к препятствию и направлением движения, при котором возможно движение вдоль препятствия
    speed: SpeedSettings,
    collision_radius: number,      // Радиус столкновения управляемого персонажа с препятствиями
    max_try_dist: number,          // Только для BASIC режима расчёта пути, шаг проверки столкновений с препятствиями
    max_blocked_move_time: number, // Время нахождения застрявшего игрока в одной позиции, после которого движение приостановится
    blocked_move_min_dist: number, // Минимальное расстояние для перемещения, меньше него позиция остаётся прежней.
    min_stick_dist: number,
    debug?: boolean,
    obstacles_space_cell_size: number,
    max_subgrid_size: number,
    min_subgrid_size: number,
    grid_params: GridParams,


    // Настройки геометрического поиска пути
    min_find_path_interval: number 
    max_checks_number: number,    // Максимальное количество проверок при геометрическом поиске пути
    max_checks_one_dir: number,   // Макс. количество проверок при поиске пути в прямом направлении, после чего пробуем искать обратный путь
    max_depth: number,            // Макс. глубина дерева путей / макс. количество интервалов наденного пути
    max_way_length: number,       // Ограничение на длину путей
    max_update_time: number       // Ограничение на время, затрачиваемое на поиск пути, мс.
}

export type AnimationNames = {
    IDLE: string,
    WALK: string,
    RUN?: string,
}

export type SpeedSettings = {
    WALK: number,
    RUN?: number,
}

export type GridParams = {
    start: PointLike,
    amount: PointLike,
    cell_size: number,
    origin_offset?: PointLike,
}

export type SubGridParams = {
    offset: PointLike,
    amount: PointLike,
}

export const default_obstacle_grid: GridParams = {
    start: { x: 0, y: 0 },
    amount: { x: 100, y: 100 },
    cell_size: 10,
    origin_offset: { x: 0, y: 0 },
}

export const default_settings: PlayerMovementSettings = {
    max_predicted_way_intervals: 10,
    predicted_way_lenght_mult: 1.5,
    collision_min_error: 0.01,
    min_required_way: 0.8,
    min_awailable_way: 0.8,
    min_idle_time: 0.7,
    min_target_change: 1.5,
    control_type: ControlType.FP,
    keys_control: true,
    target_stop_distance: 0.5,
    model_layer: 15,
    animation_names: { IDLE: "Unarmed Idle", WALK: "Unarmed Run Forward" },
    update_interval: 2.5,
    min_update_interval: 0.2,
    update_way_angle: 3 * Math.PI / 180,
    block_move_min_angle: 15 * Math.PI / 180,
    speed: { WALK: 26 },
    collision_radius: 4,
    max_try_dist: 0.2,
    max_blocked_move_time: 5,
    blocked_move_min_dist: 0.006,
    min_stick_dist: 15,
    obstacles_space_cell_size: 150 * WORLD_SCALAR,
    max_subgrid_size: 100,
    min_subgrid_size: 70,
    grid_params: default_obstacle_grid,

    min_find_path_interval: 0.5,
    max_checks_number: 55,
    max_checks_one_dir: 30,
    max_depth: 9,
    max_way_length: 2000 * WORLD_SCALAR,
    max_update_time: 80
}
