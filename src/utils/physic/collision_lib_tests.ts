import { MapData, parse_tiled } from "@editor/render_engine/parsers/tile_parser";
import { Services } from '@editor/core';
import {
    System as CollisionSystem,
    Circle,
    Line,
    Polygon,
    BodyOptions
} from "detect-collisions"
import { IPoint, ISegment, PointLike } from "../geometry/types";
import { point, shape_vector } from "../geometry/logic";
import { vector_slope } from "../geometry/utils";
import { ObstacleTileData } from "../old_pathfinder/types";
import { polygon_to_segments, polyline_to_segments } from "./utils";


const obstacle_options: BodyOptions = {
    isStatic: true,
    
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

export function make_polygons_from_geometry(geometry_data: ISegment[], world_scalar: number) {
    const all_obstacles: Polygon[] = [];
    for (const S of geometry_data) {
        const line = new Line(S.start, S.end, obstacle_options);
        all_obstacles.push(line);
    }
    return all_obstacles;
}

export function make_polygons_from_data(map_data: MapData, world_scalar: number) {
    const obstacles_data = parse_tiled(map_data);
    const all_obstacles: Polygon[] = [];
    for (const layer of obstacles_data.objects_layers) {
        for (const tile of layer.objects) {
            if (tile.polygon || tile.polyline) {
                
                if (tile.polygon) {
                    const polygon = make_collision_polygon(tile.x, tile.y, tile.polygon, world_scalar);
                    all_obstacles.push(polygon);
                }
            }
        }
    }
    return all_obstacles;
}

function make_collision_polygon(x: number, y: number, _points: PointLike[], world_scalar: number) {
    const points: PointLike[] = [];
    for (let i = 0; i < _points.length; i++) {
        const x = _points[i].x * world_scalar;
        const y = _points[i].y * world_scalar;
        points.push({x, y})
    }
    const polygon = new Polygon({x: x * world_scalar, y: y * world_scalar}, points, obstacle_options);
    return polygon;
}

export function test_detect_collision(
    obstacles: (Polygon | Line)[], 
    way: ISegment, 
    collision_radius: number,
    move: number,
    move_times: number,
) {
    const system = new CollisionSystem();
    const callback = () => {
        system.separate()
    }
    
    for (const obstacle of obstacles) {
        system.insert(obstacle);
    }
    const player = new Circle(way.start, collision_radius);
    system.insert(player);
    const angle = vector_slope(shape_vector(way));
    player.setAngle(angle, true);

    Services.logger.debug('test detect_collision lib');
    const points: IPoint[] = [point(player.x, player.y)];
    const t1 = Services.time.now_ms()
    for (let k = 0; k < 1; k++) {
        for (let i = 0; i < move_times; i++) {
            player.move(move, true);
            system.checkOne(player, () => {
                system.separateBody(player)
            })
            const pos = point(player.x, player.y)
            // const way_remain = Segment(pos, way.end)
            // const angle = vector_slope(shape_vector(way_remain));
            player.setAngle(angle, true);

            points.push(point(player.x, player.y));
        }
    }
    const t2 = Services.time.now_ms()
    Services.logger.debug('time', t2 - t1);
    Services.logger.debug('points', points.length);

    return points;
}
