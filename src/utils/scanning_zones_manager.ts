import { CellsManagerCreate } from "./polygon_manager";
import { get_level_tiles_range } from "./polygon_utils";
import { PointLike } from "./geometry/types";
import { SpriteTileInfo, SpriteTileInfoDict } from "@editor/render_engine/tile_loader";
import { SpatialHashManagerCreate, SpatialHashManagerUtils } from "./spatial_hash_manager";
import { vec2_distance_to } from "./math_utils";


export const tile_utils: SpatialHashManagerUtils<SpriteTileInfo> = {
    get_center: (elem) => {
        return {x: elem.data.x, y: elem.data.y};
    },
    get_height: (elem) => elem.data.height,
    get_width: (elem) => elem.data.width,
    get_distance: (p, elem) => {
        const c = tile_utils.get_center(elem);
        return vec2_distance_to(p, c);
    }
}

export function SpawnZonesManager(tiles: SpriteTileInfoDict) {
    const cells_manager = CellsManagerCreate(20);
    const tile_manager = SpatialHashManagerCreate<SpriteTileInfo>(tile_utils);
    const {start, end}: {start: PointLike, end: PointLike} = get_level_tiles_range(Object.values(tiles));
    cells_manager.make_cells(start, end);

    for (const t of Object.values(tiles)) {
        tile_manager.add_element(t);
    }

    return {}
}

