import { TDictionary } from "@editor/modules_editor/modules_editor_const";
import { IObjectTypes } from "@editor/render_engine/types";
import { LinesDrawer } from "./physic/LinesDrawer";
import { get_angle } from "./PathUpdater";
import { AnimationNames, COLORS, ObstacleTileData, PlayerMovementSettings } from "@editor/modules/types";
import { BodyGroup, BodyOptions, Circle, CollisionCallback, deg2rad, Line, Polygon, returnTrue, System, Response } from "detect-collisions";
import { get_depth, MapData, parse_tiled } from "@editor/render_engine/parsers/tile_parser";
import { IPoint, ISegment, PointLike } from "./geometry/types";
import { polygon_to_segments, polyline_to_segments } from "./physic/utils";
import { point, vector, vector_from_points } from "./geometry/logic";
import { AnimatedMesh } from "@editor/render_engine/objects/animated_mesh";
import { interpolate_with_wrapping } from "./math_utils";
import { Arc, Segment } from "./geometry/shapes";


export type MovementSettings = {
    speed: number;
    collision_radius: number;
    debug: boolean;
    animation_names: AnimationNames,
}

const obstacle_options: BodyOptions = {
    isStatic: true,

}

export function MovementManagerCreate(model: AnimatedMesh, obstacles: Line<any>[], start_pos: PointLike, settings: MovementSettings) {
    const system = new System();
    const LD = LinesDrawer();
    const obstacles_lines: TDictionary<any> = {};
    const speed = settings.speed;
    const move = 1 / 60 * speed;
    const collision_radius = settings.collision_radius;
    const animations = settings.animation_names;
    const debug = settings.debug;

    const joystick = SceneManager.create(IObjectTypes.GO_CONTAINER, {});
    joystick.name = 'joystick';
    SceneManager.add(joystick);
    const player_geometry = SceneManager.create(IObjectTypes.GO_CONTAINER, {});
    player_geometry.name = 'player_geometry';
    SceneManager.add(player_geometry);
    const player_way = SceneManager.create(IObjectTypes.GO_CONTAINER, {});
    player_way.name = 'player_way';
    SceneManager.add(player_way);
    const obstacles_container = SceneManager.create(IObjectTypes.GO_CONTAINER, {});
    obstacles_container.name = 'obstacles';
    SceneManager.add(obstacles_container);
    joystick.no_saving = true; joystick.no_removing = true;
    player_geometry.no_saving = true; player_geometry.no_removing = true;
    player_way.no_saving = true; player_way.no_removing = true;
    obstacles_container.no_saving = true; obstacles_container.no_removing = true;
    let is_moving = false;

    for (const obst of obstacles) {
        system.insert(obst);
    }

    // if (debug) draw_obstacles();

    const player = new Circle(start_pos, collision_radius);
    system.insert(player);
    model

    EventBus.on('SYS_ON_UPDATE', (e) => {
        const angle = get_angle();
        if (angle == -1) {
            if (is_moving) stop_movement();
            return;
        }
        if (angle != -1 && !is_moving) {
            start_movement();
        }
        const angle_rad = deg2rad(angle);
        player.setAngle(angle_rad, true);
        player.move(move, true);
        system.checkOne(player, (r) => {
            const { a, b, overlapV } = r;
            if (a === player)
                a.setPosition(a.pos.x - overlapV.x, a.pos.y - overlapV.y)
            if (b === player)
                b.setPosition(b.pos.x + overlapV.x, b.pos.y + overlapV.y)
        })

        const pos = point(player.x, player.y)
        update_position(pos);
        model.rotation.y = interpolate_with_wrapping(model.rotation.y, angle_rad + Math.PI / 2, 0.1, 0, 2 * Math.PI);
    })


    function stop_movement() {
        is_moving = false;
        model.set_animation(animations.IDLE);
    }

    function start_movement() {
        is_moving = true;
        model.set_animation(animations.WALK);
    }

    function update_position(end_pos: IPoint) {
        const current_pos = point(model.position.x, model.position.y);
        model.position.x = end_pos.x;
        model.position.y = end_pos.y;
        CameraControl.set_position(model.position.x, model.position.y, true);
        // const dir = vector_from_points(current_pos, end_pos);
        // model.rotation.y = interpolate_with_wrapping(model.rotation.y, Math.atan2(dir.y, dir.x) + Math.PI / 2, 0.1, 0, 2 * Math.PI);
        model.transform_changed();
        if (player_geometry.children.length == 0) {
            LD.draw_arc(Arc(point(0, 0), settings.collision_radius, 0, Math.PI * 2), player_geometry, COLORS.RED);
        }
        for (const line of player_geometry.children) {
            line.position.x = end_pos.x;
            line.position.y = end_pos.y;
        }
    }

    function draw_obstacles() {
        for (const obst of obstacles) {
            const start = point(obst.start.x, obst.start.y);
            const end = point(obst.end.x, obst.end.y);
            const seg = Segment(start, end);
            LD.draw_line(seg, obstacles_container, COLORS.GREEN);
        }
    }
}


export function make_geometry_from_data(obstacles_data: ObstacleTileData[], world_scalar: number) {
    const all_obstacles: ISegment[] = [];
    for (const tile of obstacles_data) {
        let obstacles: ISegment[] = [];
        if (tile.polygon || tile.polyline) {
            if (tile.polygon) {
                obstacles = polygon_to_segments(tile.x, tile.y, tile.polygon, world_scalar);
            }
            if (tile.polyline) {
                obstacles = polyline_to_segments(tile.x, tile.y, tile.polyline, world_scalar);
            }
        }
        all_obstacles.push(...obstacles);
    }
    return all_obstacles;
}

export function make_obstacles_from_geometry(geometry_data: ISegment[], world_scalar: number) {
    const all_obstacles: Line[] = [];
    for (const S of geometry_data) {
        const line = new Line(S.start, S.end, obstacle_options);
        all_obstacles.push(line);
    }
    return all_obstacles;
}

export function make_obstacles_from_data(map_data: MapData, world_scalar: number) {
    const obstacles_data = parse_tiled(map_data);
    const all_obstacles: Line[] = [];
    for (const layer of obstacles_data.objects_layers) {
        for (const tile of layer.objects) {
            if (tile.polygon || tile.polyline) {

                if (tile.polyline) {
                    const lines = make_collision_polyline(tile.x, tile.y, tile.polyline, world_scalar);
                    all_obstacles.push(...lines);
                }
                if (tile.polygon) {
                    const lines = make_collision_polygon(tile.x, tile.y, tile.polygon, world_scalar);
                    all_obstacles.push(...lines);
                }
            }
        }
    }
    return all_obstacles;
}

export function make_collision_polyline(x: number, y: number, polygon: PointLike[], world_scalar: number) {
    const segments: Line[] = [];
    const cx = x * world_scalar;
    const cy = y * world_scalar;
    for (let i = 0; i < polygon.length - 1; i++) {
        const s_x = polygon[i].x;
        const s_y = polygon[i].y;
        const e_x = polygon[i + 1].x;
        const e_y = polygon[i + 1].y;
        const seg = new Line(point(cx + s_x * world_scalar, cy - s_y * world_scalar), point(cx + e_x * world_scalar, cy - e_y * world_scalar));
        segments.push(seg);
    }
    return segments;
}

export function make_collision_polygon(x: number, y: number, polygon: PointLike[], world_scalar: number) {
    const segments: Line[] = [];
    const cx = x * world_scalar;
    const cy = y * world_scalar;
    segments.push(...make_collision_polyline(x, y, polygon, world_scalar));

    const s_x = polygon[polygon.length - 1].x;
    const s_y = polygon[polygon.length - 1].y;
    const e_x = polygon[0].x;
    const e_y = polygon[0].y;
    const seg = new Line(point(cx + s_x * world_scalar, cy - s_y * world_scalar), point(cx + e_x * world_scalar, cy - e_y * world_scalar));
    segments.push(seg);
    return segments;
}