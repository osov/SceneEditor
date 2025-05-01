import { Segment, Point } from "2d-geometry";
import { PlayerMovementSettings, default_settings, PathFinderMode, PathFinder, PointerControl } from "../modules/PlayerMovement";

export async function run_scene_empty() {
    test_pathfinder();
}

export function test_pathfinder() {
    const pos_A = new Point(307.18541941905903, -201.68673515682875);
    const pos_A1 = new Point(313.18541941905903, -195.68673515682875);
    const pos_A2 = new Point(311.18541941905903, -188.68673515682875);
    const obst_A1 = new Segment(276.266667, -206.8333, 300.4667, -204.8667);
    const obst_B1 = new Segment(300.4667, -204.8667, 298.4, -110.3333);
    const targ_A = new Point(292.6916370903421, -212.91223555276247);
    const targ_A1 = new Point(294.6916370903421, -208.91223555276247);
    const test_data = [
        {pos: pos_A, target: targ_A, obstacles: [obst_A1, obst_B1]}, 
        {pos: pos_A1, target: targ_A1, obstacles: [obst_A1, obst_B1]}, 
        {pos: pos_A2, target: targ_A, obstacles: [obst_A1, obst_B1]}, 
    ];
    let settings: PlayerMovementSettings = {
        ...default_settings, 
        update_interval: 25, 
        min_update_interval: 1, 
        collision_radius: 3, 
        speed: {WALK: 3}, 
        path_finder_mode: PathFinderMode.WAY_PREDICTION,
        pointer_control: PointerControl.FP,
        max_predicted_way_intervals: 4,
        debug: true,
        clear_drawn_lines: false,
    }
    const PF = PathFinder(settings);
    for (const batch of test_data) {
        PF.set_current_pos(batch.pos);
        PF.set_obstacles(batch.obstacles);
        PF.mark_obstacles(batch.obstacles);
        const way_req = new Segment(batch.pos, batch.target);
        PF.update_predicted_way(way_req, settings.pointer_control);
        // const way_intervals = PF.get_predicted_way();
        // log(way_intervals)
        // for (let i = 1; i < 10; i++) {
        //     const new_pos = PF.get_next_pos(current_pos, 1);
        //     // log('distance', current_pos.distanceTo(new_pos)[0]);
        //     current_pos = new_pos;
        //     // log('current_pos', current_pos);
        // }
        log();
    }
}
