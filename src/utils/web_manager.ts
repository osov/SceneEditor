import { createTileSwayManager } from "./tile_sway_manager";

export function createWebManager() {
    return createTileSwayManager({ material: 'web', frequency: 1.5, speed: 4, effect_time: 1.2 });
}
