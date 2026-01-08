/* eslint-disable @typescript-eslint/unbound-method */
import { VEC_A } from "../geometry/helpers";
import { Arc, Point, Segment } from "../geometry/shapes";
import { ISegment, IArc } from "../geometry/types";
import { shape_center, clone, invert_vec, rotate_vec_90CW, translate, shape_vector, point2segment } from "../geometry/logic";
import { normalize, multiply, vector_slope } from "../geometry/utils";
import { Line } from "detect-collisions";
import { SpatialHashManagerCreate, SpatialHashManagerUtils } from "../spatial_hash_manager";


export type ObstaclesManager = ReturnType<typeof ObstaclesManagerCreate>;

type OffsetBuildOption = "all" | "arc" | "segment";


export function ObstaclesManagerCreate(hash_cell_size: number) {

    const utils: SpatialHashManagerUtils<ISegment> = {
        get_center: (elem) => shape_center(elem),
        get_width: (elem) => Math.abs(elem.end.x - elem.start.x),
        get_height: (elem) => Math.abs(elem.end.y - elem.start.y),
        get_distance: (p, elem) => point2segment(p, elem)[0]
    }

    const base = SpatialHashManagerCreate<ISegment>(utils, hash_cell_size);


    function build_offsets(obstacle: ISegment, offset: number, build_option: OffsetBuildOption = "all") {
        const result: (ISegment | IArc)[] = [];
        const obst_vec = shape_vector(obstacle);
        VEC_A.x = obst_vec.x;
        VEC_A.y = obst_vec.y;
        normalize(VEC_A);
        rotate_vec_90CW(VEC_A);
        multiply(VEC_A, offset);
        if (build_option == "all" || build_option == "segment") {
            let offset = clone(obstacle);
            translate(offset, VEC_A.x, VEC_A.y);
            result.push(offset);
            invert_vec(VEC_A);
            offset = clone(obstacle);
            translate(offset, VEC_A.x, VEC_A.y);
            result.push(offset);
        }

        if (build_option == "all" || build_option == "arc") {
            const slope = vector_slope(shape_vector(obstacle));
            
            result.push(Arc(obstacle.start, offset, slope - Math.PI / 2, slope + Math.PI / 2, false));
            result.push(Arc(obstacle.end, offset, slope + Math.PI / 2, slope - Math.PI / 2, false));
        }
        return result;
    }

    function load_obstacles(obstacles: Line[]) {
        for (const L of obstacles) {
            base.add_element(Segment(Point(L.start.x, L.start.y), Point(L.end.x, L.end.y)));
        }
    }

    return {
        add_obstacle: base.add_element, 
        remove_obstacle: base.remove_element, 
        clear_obstacles: base.clear_elements,
        get_obstacles: base.get_elements, 
        enable_object: base.enable_object, 
        get_object_by_pos: base.get_object_by_pos,
        get_obstacle_by_id: base.get_element_by_id, 
        objects: base.objects, 
        all_elements: base.all_elements,
        
        build_offsets, load_obstacles
    };
}
