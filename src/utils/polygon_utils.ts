import NavMeshGenerator from "navmesh-generator";
import { PointLike } from "./geometry/types";
import { Polygon, PolyPoints } from "./polygon_manager";
import { SpriteTileInfo } from "@editor/render_engine/tile_loader";


export enum PolygonWinding {
    CW,
    CCW,
    COLLINEAR
}

export function polygon_winding(points: PointLike[]): PolygonWinding {
    if (points.length < 3) {
        return PolygonWinding.COLLINEAR;
    }

    let sum = 0;
        for (let i = 0; i < points.length; i++) {
        const p1 = points[i];
        const p2 = points[(i + 1) % points.length];
        sum += (p2.x - p1.x) * (p2.y + p1.y);
    }

    if (sum > 0) {
        return PolygonWinding.CW;
    } else if (sum < 0) {
        return PolygonWinding.CCW;
    } else {
        return PolygonWinding.CW;
    }
}

export function is_convex(polygon: PointLike[]): boolean {
    if (polygon.length < 3) {
        return true; 
    }

    let crossProductSign = 0;

    for (let i = 0; i < polygon.length; i++) {
        const p1 = polygon[i];
        const p2 = polygon[(i + 1) % polygon.length];
        const p3 = polygon[(i + 2) % polygon.length];

        const crossProduct = (p2.x - p1.x) * (p3.y - p2.y) - (p2.y - p1.y) * (p3.x - p2.x);

        if (crossProduct !== 0) {
            if (crossProductSign === 0) {
                crossProductSign = crossProduct > 0 ? 1 : -1;
            } else if ((crossProduct > 0 && crossProductSign === -1) || (crossProduct < 0 && crossProductSign === 1)) {
                return false;
            }
        }
    }
    return true;
}


export function build_navnmesh_polygons(level_size: {start: PointLike, end: PointLike}, obstacles: Polygon[], rasterizationCellSize: number): PolyPoints[] {
    const navMeshGenerator = new NavMeshGenerator(
    level_size.start.x,
    level_size.start.y,
    level_size.end.x,
    level_size.end.y,
    rasterizationCellSize
    );
    const arr: PolyPoints[] = [];
    for (const poly of obstacles) {
        arr.push(poly[0]);
    }
    const navMeshPolygons = navMeshGenerator.buildNavMesh(
        arr,
        0
    );
    return navMeshPolygons;
    }

/** Сколько миллисекунд можно считать без передачи управления браузеру */
const ASYNC_BUILD_SLICE_MS = 30;

function yield_to_browser() {
    // В фоновой вкладке setTimeout замедляется до ~1 с на вызов, MessageChannel — нет
    if (typeof document != 'undefined' && document.hidden)
        return new Promise<void>(resolve => {
            const channel = new MessageChannel();
            channel.port1.onmessage = () => resolve();
            channel.port2.postMessage(null);
        });
    return new Promise<void>(resolve => setTimeout(resolve, 0));
}

/**
 * То же, что build_navnmesh_polygons, но не блокирует страницу: самый долгий этап navmesh-generator
 * (RegionGenerator.generateRegions, ~95% времени) повторён здесь по шагам с передачей управления браузеру.
 * on_progress получает долю 0..1. Повторяет NavMeshGenerator.buildNavMesh из navmesh-generator 1.0.3;
 * если внутренности библиотеки поменялись, строит обычным синхронным способом.
 */
export async function build_navnmesh_polygons_async(level_size: {start: PointLike, end: PointLike}, obstacles: Polygon[], rasterizationCellSize: number, on_progress?: (progress: number) => void): Promise<PolyPoints[]> {
    const generator = new NavMeshGenerator(level_size.start.x, level_size.start.y, level_size.end.x, level_size.end.y, rasterizationCellSize) as any;
    const arr: PolyPoints[] = obstacles.map(poly => poly[0]);
    const { grid, obstacleRasterizer, regionGenerator, contourBuilder, convexPolygonGenerator, gridCoordinateConverter } = generator;
    const has_internals = grid && obstacleRasterizer && contourBuilder && convexPolygonGenerator && gridCoordinateConverter
        && regionGenerator?.expandRegions && regionGenerator?.floodNewRegion && regionGenerator?.obstacleRegionBordersCleaner;
    if (!has_internals) {
        const result = generator.buildNavMesh(arr, 0) as PolyPoints[];
        on_progress?.(1);
        return result;
    }

    let slice_start = performance.now();
    async function tick(progress: number) {
        if (performance.now() - slice_start < ASYNC_BUILD_SLICE_MS) return;
        on_progress?.(progress);
        await yield_to_browser();
        slice_start = performance.now();
    }

    grid.clear();
    const NULL_REGION_ID = grid.get(0, 0).regionID;
    obstacleRasterizer.rasterizeObstacles(grid, arr);
    await tick(0.02);
    regionGenerator.generateDistanceField(grid);
    await tick(0.05);

    // RegionGenerator.generateRegions(grid, 0): водораздел по уровням расстояния до препятствий
    const cell_padding = 0;
    const expand_iterations = 4 + 2 * cell_padding;
    const cells = regionGenerator.floodedCells;
    const max_level = -2 & grid.obstacleDistanceMax();
    let region_id = 1;
    for (let level = max_level; level > cell_padding; level = Math.max(level - 2, 0)) {
        cells.length = 0;
        for (let y = 1; y < grid.dimY() - 1; y++) {
            for (let x = 1; x < grid.dimX() - 1; x++) {
                const cell = grid.get(x, y);
                if (cell.regionID === NULL_REGION_ID && cell.distanceToObstacle >= level)
                    cells.push(cell);
            }
        }
        if (region_id > 1)
            regionGenerator.expandRegions(grid, cells, level > 0 ? expand_iterations : -1);
        for (const cell of cells) {
            if (cell && cell.regionID === NULL_REGION_ID) {
                const fill_to = Math.max(level - 2, cell_padding + 1, 1);
                if (regionGenerator.floodNewRegion(grid, cell, fill_to, region_id))
                    region_id++;
            }
        }
        await tick(0.05 + 0.9 * (max_level - level) / Math.max(max_level, 1));
    }
    cells.length = 0;
    for (let y = 1; y < grid.dimY() - 1; y++) {
        for (let x = 1; x < grid.dimX() - 1; x++) {
            const cell = grid.get(x, y);
            if (cell.distanceToObstacle > cell_padding && cell.regionID === NULL_REGION_ID)
                cells.push(cell);
        }
    }
    regionGenerator.expandRegions(grid, cells, cell_padding > 0 ? 8 * expand_iterations : -1);
    grid.regionCount = region_id;
    regionGenerator.obstacleRegionBordersCleaner.fixObstacleRegion(grid);
    await tick(0.95);

    const contours = contourBuilder.buildContours(grid, 1);
    const convex = convexPolygonGenerator.splitToConvexPolygons(contours, 16);
    const result = gridCoordinateConverter.convertFromGridBasis(grid, convex) as PolyPoints[];
    if (generator.isometricRatio != 1)
        result.forEach(poly => poly.forEach(p => p.y *= generator.isometricRatio));
    on_progress?.(1);
    return result;
}

export function get_level_range(obstacles: Polygon[], padding: number) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const obst of obstacles) {
        const border = obst[0];
        for (const point of border) {
            minX = Math.min(point.x, minX);
            minY = Math.min(point.y, minY);
            maxX = Math.max(point.x, maxX);
            maxY = Math.max(point.y, maxY);
        }
    }
    minX -= padding;
    minY -= padding;
    maxX += padding;
    maxY += padding;
    return {start: {x: minX, y: minY}, end: {x: maxX, y: maxY}};
}

export function get_level_tiles_range(tiles: SpriteTileInfo[]) {
    let minX = Math.min(...tiles.map(tile => tile.data.x - tile.data.width / 2));
    let minY = Math.min(...tiles.map(tile => tile.data.y - tile.data.height / 2));
    let maxX = Math.max(...tiles.map(tile => tile.data.x + tile.data.width / 2));
    let maxY = Math.max(...tiles.map(tile => tile.data.y + tile.data.height / 2));
    return {start: {x: minX, y: minY}, end: {x: maxX, y: maxY}};
}