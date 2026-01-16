import { GoContainer } from "@editor/render_engine/objects/sub_types";
import { IObjectTypes } from "@editor/render_engine/types";
import { PolyPoints } from "navmesh";
import { ISegment } from "./geometry/types";
import { LinesDrawer } from "./lines_drawer";
import { vec2_distance_to } from "./math_utils";
import { COLORS } from "./old_pathfinder/types";
import { DynamicEntity } from "./physic/physic_system";
import { Arc } from "./geometry/shapes";
import { point } from "./geometry/logic";
import { Services } from '@editor/core';


export function DrawingPhysicsManager(player: DynamicEntity, entities: DynamicEntity[], _obstacles: ISegment[], passable_polygons: PolyPoints[], navmesh: unknown) {

    const LD = LinesDrawer();

    const joystick = Services.scene.create(IObjectTypes.GO_CONTAINER, {}) as unknown as GoContainer;
    joystick.name = 'joystick';
    Services.scene.add(joystick);
    const player_way = Services.scene.create(IObjectTypes.GO_CONTAINER, {}) as unknown as GoContainer;
    player_way.name = 'player_way';
    Services.scene.add(player_way);
    const pathfinder_path = Services.scene.create(IObjectTypes.GO_CONTAINER, {}) as unknown as GoContainer;
    pathfinder_path.name = 'pathfinder_path';
    Services.scene.add(pathfinder_path);
    const obstacles_container = Services.scene.create(IObjectTypes.GO_CONTAINER, {}) as unknown as GoContainer;
    obstacles_container.name = 'obstacles';
    Services.scene.add(obstacles_container);

    joystick.no_saving = true; joystick.no_removing = true;
    player_way.no_saving = true; player_way.no_removing = true;
    pathfinder_path.no_saving = true; pathfinder_path.no_removing = true;
    obstacles_container.no_saving = true; obstacles_container.no_removing = true;
    const user_visible = !(new URLSearchParams(document.location.search).get('user') === '0');

    const entities_containers: Dict<GoContainer> = {};

    if (passable_polygons !== undefined) {
        for (const poly of passable_polygons) {
            LD.draw_polygon(poly, obstacles_container, COLORS.GREEN)
        }
    }

    const navmesh_typed = navmesh as { findPath: (from: { x: number, y: number }, to: { x: number, y: number }) => Array<{ x: number, y: number }> } | undefined;
    Services.event_bus.on('input:pointer_down', (evt) => {
        const e = evt as { x: number, y: number };
        if (Services.input.is_shift() && navmesh_typed !== undefined) {
            const pos = Services.camera.screen_to_world(e.x, e.y);
            const dist = vec2_distance_to(player.model.position, pos)
            const t1 = Date.now()
            const way = navmesh_typed.findPath(player.model.position, pos);
            const t2 = Date.now()
            Services.logger.debug('time', t2 - t1, dist);
            if (way !== undefined && way.length > 0) {
                LD.draw_multiline(way, obstacles_container, COLORS.WHITE);
            }
        }
    })

    for (const entity of entities) {
        const geometry = Services.scene.create(IObjectTypes.GO_CONTAINER, {}) as unknown as GoContainer;
        geometry.name = `entity ${entity.id} collision circle`;
        Services.scene.add(geometry);
        geometry.no_saving = true; geometry.no_removing = true;
        geometry.set_active(user_visible);
        entities_containers[entity.id] = geometry;
    }

    function update(_dt: number) {
        if (pathfinder_path.children.length != 0) {
            for (const child of pathfinder_path.children) {
                child.remove();
            }
            pathfinder_path.clear();
        }
        for (const entity of entities) {
            const container = entities_containers[entity.id];
            if (container) {
                if (container.children.length == 0) {
                    LD.draw_arc(Arc(point(0, 0), entity.shape.r, 0, Math.PI * 2), container, COLORS.RED);
                }
                for (const line of container.children) {
                    line.position.x = entity.shape.x;
                    line.position.y = entity.shape.y;
                }
                
            }
            if (entity.path_points) {
                // LD.draw_multiline([entity.shape.pos, ...entity.path_points], pathfinder_path, COLORS.WHITE)
            }
        }
        if (player_way.children.length == 0) {
            LD.draw_arc(Arc(point(0, 0), player.shape.r, 0, Math.PI * 2), player_way, COLORS.PURPLE);
        }
        for (const line of player_way.children) {
            line.position.x = player.shape.x;
            line.position.y = player.shape.y;
        }
    }
    
    return {update}
}