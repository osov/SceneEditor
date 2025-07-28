import { WORLD_SCALAR } from "../../config";
import { ISegment, IPoint, IArc, PointLike } from "../geometry/types";
import { ArcLengthMap } from "../math_utils";


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
    path_required: ISegment,
    lenght_remains: number,
    vertice_to_bypass?: IPoint,
    prev_vertice?: IPoint,
    obstacle_to_slide?: ISegment,
    prev_obstacle?: ISegment,
    control_type: ControlType,
};

export type ClosestObstacleData = {
    obstacle?: ISegment,
    distance: number,
    point?: IPoint,
    way?: ISegment | IArc,
    is_vertice: boolean,
};

export type PathDataBase = {
    path: (ISegment | IArc)[],
    length: number,
    time: number;
    cur_time: number;
};

export type PathData = PathDataBase & {
    path_points: IPoint[],
    blocked_way_nodes?: PathNode[],
    clear_way_nodes?: PathNode[],
    arc_table?: ArcLengthMap,
};

export type PathNode = {
    arc?: IArc,                          // Дуга пути обхода предыдущей вершины, если она была
    segment?: ISegment,                  // Сегмент пути
    previous_vertice?: IPoint,           // Предыдущая вершина
    previous_clockwise?: boolean,       // Направление обхода этой вершины
    next_vertice?: IPoint,               // Вершина возле которой остановились в конце segment. Если segment заканчивается в точке target, не указывается
    next_clockwise?: boolean,           // Требуемое направление обхода этой вершины
    parent?: PathNode,
    children: PathNode[],
    depth: number,
    total_length: number,
};

export type PlayerMovementSettings = {
    min_required_path: number,
    min_awailable_path: number,
    min_idle_time: number,
    min_target_change: number,
    control_type: ControlType,
    keys_control: boolean,         // TODO: управление через клавиатуру
    target_stop_distance: number,  // Расстояние остановки игрока от точки target
    animation_names: AnimationNames,
    update_interval: number,       // Интервал между обновлениями прогнозируемого пути по умолчанию 
    min_update_interval: number,   // Минимальный интервал между обновлениями прогнозируемого пути
    min_angle_change: number,      // Минимальный угол изменения направления движения, при котором произойдёт обновление прогнозируемого пути
    speed: SpeedSettings,
    collision_radius: number,      // Радиус столкновения управляемого персонажа с препятствиями
    pred_path_lenght_mult: number,  // Множитель длины пути для построения пути с запасом
    max_blocked_move_time: number, // Время нахождения застрявшего игрока в одной позиции, после которого движение приостановится
    blocked_max_dist: number, // Минимальное расстояние для перемещения, меньше него позиция остаётся прежней.
    min_stick_dist: number,
    min_find_path_interval: number,
    debug?: boolean,
};

export type PathFinderSettings = {
    control_type: ControlType,
    collision_min_error: number,    // Минимальное расстояние сближения с припятствиями, для предотвращения соприкосновений геометрий 
    max_path_intervals: number,     // Макс. количество отрезков прогнозируемого пути, на котором цикл построения пути завершится преждевременно
    obstacles_space_cell_size: number,
    block_move_min_angle: number,   // Минимальный угол между нормалью к препятствию и направлением движения, при котором возможно движение вдоль препятствия

    // Настройки геометрического поиска пути
    target_max_correction: number   // Макс. расстояние смещения целевой позиции при поиске свободного места если изначальная позиция пересекается с препятствием
    max_checks_number: number,      // Максимальное количество проверок при геометрическом поиске пути
    max_depth: number,              // Макс. глубина дерева путей / макс. количество интервалов наденного пути
    max_way_length: number,         // Ограничение на длину путей
    max_update_time: number         // Ограничение на время, затрачиваемое на поиск пути, мс.

    debug?: boolean,
};

export type AnimationNames = {
    IDLE: string,
    WALK: string,
    RUN?: string,
};

export type SpeedSettings = {
    WALK: number,
    RUN?: number,
};

export type GridParams = {
    start: PointLike,
    amount: PointLike,
    cell_size: number,
    origin_offset?: PointLike,
};

export type SubGridParams = {
    offset: PointLike,
    amount: PointLike,
};

export type ObstacleTileData = {
    x: number;
    y: number;
    polygon?: PointLike[],
    polyline?: PointLike[],
};

export const movement_default_settings: PlayerMovementSettings = {
    pred_path_lenght_mult: 2,
    min_required_path: 0.8,
    min_awailable_path: 0.8,
    min_idle_time: 0.7,
    min_target_change: 1.5,
    control_type: ControlType.FP,
    keys_control: true,
    target_stop_distance: 0.5,
    animation_names: { IDLE: "Unarmed Idle", WALK: "Unarmed Run Forward" },
    update_interval: 2.5,
    min_update_interval: 0.5,
    min_angle_change: 3 * Math.PI / 180,
    speed: { WALK: 26 },
    collision_radius: 2,
    max_blocked_move_time: 5,
    blocked_max_dist: 0.006,
    min_stick_dist: 15,

    min_find_path_interval: 0.5,
};

export const PF_default_settings: PathFinderSettings = {
    control_type: ControlType.GP,
    collision_min_error: 0.01,
    max_path_intervals: 13,
    obstacles_space_cell_size: 150 * WORLD_SCALAR,
    block_move_min_angle: 15 * Math.PI / 180,   // угол конуса трения


    // Настройки геометрического поиска пути
    target_max_correction: 10 * WORLD_SCALAR,
    max_checks_number: 100,
    max_depth: 15,
    max_way_length: 2100 * WORLD_SCALAR,
    max_update_time: 150,

    debug: false,
};

export const COLORS = {
    RED: 0xff0000,
    LIGHT_RED: 0xff3333,
    DARK_RED: 0xaa0000,
    BLUE: 0x2233ff,
    LIGHT_BLUE: 0x5555ff,
    PURPLE: 0xee44ff,
    YELLOW: 0xffff00,
    ORANGE: 0xff6600,
    GREEN: 0x00ff00,
    GRAY: 0x333333,
    WHITE: 0xffffff,
};
