import { createTileSwayManager } from "./tile_sway_manager";

export function createGrassManager() {
    return createTileSwayManager({ material: 'grass', frequency: 3, speed: 5, effect_time: 1.0 });
}
