import { get_depth } from "@editor/render_engine/parsers/tile_parser";
import { DynamicEntity } from "./physic/physic_system";
import { interpolate_with_wrapping } from "./math_utils";


export function AnimatedMeshManager(entities: DynamicEntity[], sort_layer: number) {
    function update(dt: number) {
        for (const entity of entities) {
            update_model(entity);
        }
    }

    function update_model(entity: DynamicEntity) {
        const model = entity.model;
        const shape = entity.shape;
        if (entity.is_moving && !entity.anim_moving) 
            start_movement(entity);
        if (!entity.is_moving && entity.anim_moving) 
            stop_movement(entity);
        // const seg = vector(shape.x - model.position.x, shape.y - model.position.y);
        // const next_angle = vector_slope(seg);
        model.position.x = shape.x;
        model.position.y = shape.y;
        model.position.z = get_depth(model.position.x, model.position.y, sort_layer);
        const new_angle = interpolate_with_wrapping(model.rotation.y, shape.angle + Math.PI / 2, 0.1, 0, 2 * Math.PI);
        model.rotation.y = new_angle;
    }

    function stop_movement(entity: DynamicEntity) {
        entity.model.set_animation('idle');
        entity.anim_moving = false;
    }

    function start_movement(entity: DynamicEntity) {
        entity.model.set_animation('run');
        entity.anim_moving = true;
    }
    
    return {update}
}

