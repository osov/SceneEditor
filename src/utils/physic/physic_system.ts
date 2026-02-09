import { BodyOptions, Circle, Line, System } from "detect-collisions";
import { MapData, parse_tiled } from "@editor/render_engine/parsers/tile_parser";
import { ICircle, ISegment, PointLike } from "../geometry/types";
import { polygon_to_segments, polyline_to_segments } from "./utils";
import { point } from "../geometry/logic";
import { AnimatedMesh } from "@editor/render_engine/objects/animated_mesh";
import { AnimationNames, ObstacleTileData } from "../old_pathfinder/types";
import { ShapeNames } from "../geometry/const";


export type MovementSettings = {
    speed: number;
    collision_radius: number;
    debug: boolean;
    animation_names: AnimationNames,
}

export type DynamicEntity = {
    id: number,
    shape: PhysicBody,
    model: AnimatedMesh,
    is_moving: boolean,
    anim_moving: boolean,

    last_update_time: number;
    
    weight: number,
    speed: number,
    // main_target_pos?: PointLike,  // Позиция, в которую бот хочет прийти в конечном итоге
    // cur_target_pos?: PointLike,   // Позиция, в которую бот перемещается в данный момент
    // path_points?: PointLike[],
    // main_target?: LogicMainTarget
}

export type PhysicBody = Circle<DynamicEntity>;

const obstacle_options: BodyOptions = {
    isStatic: true,
}

export enum LogicMainTarget {
    NONE,
    FOLLOW_PLAYER
}


export function PhysicSystemCreate(obstacles: Line<any>[]) {
    const physic_world = new System();
    
    const entities: DynamicEntity[] = [];
    
    let count = 0;
    let obst_count = 0;

    for (const obst of obstacles) {
        obst_count++;
        physic_world.insert(obst);
    }

    function add_entity(model: AnimatedMesh, collision_radius: number, weight: number, speed: number) {
        const shape: PhysicBody = new Circle(model.position, collision_radius);
        shape.setAngle(0)
        const entity: DynamicEntity = {
            id: count++,
            shape: shape,
            is_moving: false,
            anim_moving: false,
            model,
            weight,
            speed,
            last_update_time: -1,
        };
        shape.userData = entity;
        physic_world.insert(entity.shape);
        entities.push(entity);
        return entity;
    }

    function raycast(start: PointLike, end: PointLike, source_body: PhysicBody) {
        return physic_world.raycast(start, end, (body) => body != source_body);
    }

    function make_line(s: ISegment) {
        return new Line(s.start, s.end);
    }
    
    function make_circle(c: ICircle) {
        return new Circle(c.pc, c.r);
    }
    
    function get_all_collided(geometry: ISegment | ICircle, exclude: PhysicBody[] = [], dinamic_only = true) {
        const collision_body = (geometry.name == ShapeNames.Segment) ? make_line(geometry as ISegment) : make_circle(geometry as ICircle);
        const result: PhysicBody[] = [];
        physic_world.insert(collision_body);
        physic_world.checkOne(collision_body, (r) => {
            const { a, b } = r;
            let collided: PhysicBody;
            if (a === collision_body) 
                collided = b;
            else if (b === collision_body)
                collided = a;
            else
                return;
            if (dinamic_only && collided.isStatic)
                return;
            if (exclude.includes(collided))
                return;
            result.push(collided);
        });
        physic_world.remove(collision_body);
        return result;
    }

    function filter_collided(list: PhysicBody[], geometry: ISegment | ICircle) {
        const collision_body = (geometry.name == ShapeNames.Segment) ? make_line(geometry as ISegment) : make_circle(geometry as ICircle);
        physic_world.insert(collision_body);
        const result: PhysicBody[] = [];
        for (const body of list) {
            if (physic_world.checkCollision(collision_body, body))
                result.push(body);
        }
        physic_world.remove(collision_body);
        return result;
    }

    function update(dt: number) {
        for (const entity of entities) {
            if (entity.is_moving) {
                entity.shape.move(entity.speed * dt);
            }
        }
        for (const entity of entities) {
            const s = entity.shape;
            update_soft_physic(s, dt);
        }
        for (const entity of entities) {
            const s = entity.shape;
            update_obstacles_physic(s, dt);
        }
    }

    function update_obstacles_physic(body: PhysicBody, dt: number) {
        physic_world.checkOne(body, (r) => {
            const { a, b, overlapV } = r;
            if (!a.isStatic && !b.isStatic) return;
            if (a === body)
                a.setPosition(a.pos.x - overlapV.x, a.pos.y - overlapV.y)
            if (b === body)
                b.setPosition(b.pos.x + overlapV.x, b.pos.y + overlapV.y)
        });
    }
    

    function update_soft_physic(body: PhysicBody, dt: number) {
        physic_world.checkOne(body, (r) => {
            const { a, b, overlapV } = r;
            if (a.isStatic || b.isStatic) return;
            const weight_a = a.userData!.weight;
            const weight_b = b.userData!.weight;
            const dx_a = 0.1 * overlapV.x * (weight_b / (weight_a + weight_b));
            const dx_b = 0.1 * overlapV.x * (weight_a / (weight_a + weight_b));
            const dy_a = 0.1 * overlapV.y * (weight_b / (weight_a + weight_b));
            const dy_b = 0.1 * overlapV.y * (weight_a / (weight_a + weight_b));
            if (a === body) {
                a.setPosition(a.pos.x - dx_a, a.pos.y - dy_a);
                b.setPosition(b.pos.x + dx_b, b.pos.y + dy_b);
            }
            if (b === body) {
                b.setPosition(b.pos.x + dx_b, b.pos.y + dy_b);
                a.setPosition(a.pos.x - dx_a, a.pos.y - dy_a);
            }
        });
    }

    function find_clear_space(req_pos: PointLike, collision_radius: number, max_attempts = 3) {
        const test_body = new Circle(req_pos, collision_radius);
        physic_world.insert(test_body);
        let attempt = 0;
        let found = false;
        while (attempt < max_attempts && !found) {
            attempt++;
            physic_world.checkOne(test_body, (r) => {
                const { a, b, overlapV }: { a: Circle, b: Circle, overlapV: PointLike } = r;
                if (overlapV.x <= 0 && overlapV.y <= 0) {
                    found = true;
                    return;
                }
                if (!a.isStatic && !b.isStatic) return;
                if (a === test_body) {
                    a.setPosition(a.pos.x - (overlapV.x), a.pos.y - (overlapV.y));
                }
                if (b === test_body) {
                    b.setPosition(b.pos.x + (overlapV.x), b.pos.y + (overlapV.y));
                }
            });
        }
        physic_world.remove(test_body);
        return {x: test_body.x, y: test_body.y}
    }

    return {add_entity, update, find_clear_space, raycast, get_all_collided, filter_collided, world: physic_world};
}


export function make_segments_with_id_from_data(obstacles_data: ObstacleTileData[], world_scalar: number) {
    const all_obstacles: { [id: number]: ISegment[] } = [];
    for (const tile of obstacles_data) {
        all_obstacles[tile.id] = [];
        if (tile.polygon || tile.polyline) {
            if (tile.polygon) {
                all_obstacles[tile.id].push(...polygon_to_segments(tile.x, tile.y, tile.polygon, world_scalar));
            }
            else if (tile.polyline) {
                all_obstacles[tile.id].push(...polyline_to_segments(tile.x, tile.y, tile.polyline, world_scalar));
            }
        }
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
        const seg = new Line(
            point(cx + s_x * world_scalar, cy - s_y * world_scalar), 
            point(cx + e_x * world_scalar, cy - e_y * world_scalar), 
            obstacle_options
        );
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
    const seg = new Line(
        point(cx + s_x * world_scalar, cy - s_y * world_scalar),
        point(cx + e_x * world_scalar, cy - e_y * world_scalar),
        obstacle_options
    );
    segments.push(seg);
    return segments;
}