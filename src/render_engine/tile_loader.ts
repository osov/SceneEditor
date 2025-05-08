import { Vector3, Vector2, Line, BufferGeometry, LineBasicMaterial } from "three";
import { CAMERA_Z, WORLD_SCALAR } from "../config";
import { make_ramk, rotate_point } from "./helpers/utils";
import { parse_tiled, TILE_FLIP_MASK, get_tile_texture, get_depth, apply_tile_transform, MapData } from "./parsers/tile_parser";
import { IObjectTypes } from "./types";
import { GoContainer } from "./objects/sub_types";
import { createSpatialHash } from "../test_scenes/spatial_hash";
import { get_hash_by_mesh } from "../inspectors/ui_utils";
import { createRegionManager } from "../test_scenes/region_manager";

export function TileLoader(world: GoContainer, tileSize = 256) {

    function load(map_data: MapData) {
        const render_data = parse_tiled(map_data);
        // TILES
        let id_layer = -1;
        for (let layer of render_data.layers) {
            id_layer++;
            const container = SceneManager.create(IObjectTypes.GO_CONTAINER, {});
            container.name = layer.layer_name;
            world.add(container);
            for (let tile of layer.tiles) {
                const tile_id = tile.id & TILE_FLIP_MASK;
                const tile_info = get_tile_texture(tile_id);
                if (tile_info.w < tileSize) {
                    tile_info.w = tileSize;
                    Log.warn('fix tile_info.w', tile_info);
                }
                if (tile_info.h < tileSize) {
                    tile_info.h = tileSize;
                    Log.warn('fix tile_info.h', tile_info);
                }

                // Вычисляем коррекцию
                const tile_w = tile_info.w * WORLD_SCALAR;
                const tile_h = tile_info.h * WORLD_SCALAR;
                let x = tile.x * tileSize * WORLD_SCALAR;
                let y = tile.y * tileSize * WORLD_SCALAR - tileSize * WORLD_SCALAR;
                const new_pos = rotate_point(new Vector3(x, y, 0), new Vector2(tile_w, tile_h), 0);
                x = new_pos.x + tile_w / 2;
                y = new_pos.y + tile_h / 2;
                const z = get_depth(x, y, id_layer, tile_w, tile_h);

                const plane = SceneManager.create(IObjectTypes.GO_SPRITE_COMPONENT, { width: tile_w, height: tile_h });
                plane.position.set(x, y, z);
                plane.set_texture(tile_info.name, tile_info.atlas);
                apply_tile_transform(plane, tile.id);
                container.add(plane);
                plane.name = tile_info.name + '' + plane.mesh_data.id;
                plane.userData = { tile };
            }
        }

        const cell_size = 150 * WORLD_SCALAR;
        const rm = createRegionManager(cell_size, 3);
        (window as any).rm = rm;
        // OBJECTS
        for (let object_layer of render_data.objects_layers) {
            id_layer++;
            let id_object = -1;
            const container = SceneManager.create(IObjectTypes.GO_CONTAINER, {});
            container.name = object_layer.layer_name;
            world.add(container);
            for (let tile of object_layer.objects) {
                id_object++;
                if (tile.polygon || tile.polyline) {
                    const cx = tile.x * WORLD_SCALAR;
                    const cy = tile.y * WORLD_SCALAR;
                    const points = [];
                    if (tile.polygon) {
                        for (let point of tile.polygon) {
                            points.push(new Vector2(cx + point.x * WORLD_SCALAR, cy - point.y * WORLD_SCALAR));
                        }
                        points.push(points[0]);
                    }
                    if (tile.polyline) {
                        for (let point of tile.polyline) {
                            points.push(new Vector2(cx + point.x * WORLD_SCALAR, cy - point.y * WORLD_SCALAR));
                        }
                    }
                    const geometry = new BufferGeometry().setFromPoints(points);
                    const material = new LineBasicMaterial({ color: 0xff0000 });

                    const line = new Line(geometry, material);
                    line.position.z = CAMERA_Z - 5;
                    container.add(line);
                }
                else {
                    const tile_id = tile.tile_id & TILE_FLIP_MASK;
                    const tile_info = get_tile_texture(tile_id);
                    if (tile_info != undefined) {
                        const tile_w = tile.width * WORLD_SCALAR;
                        const tile_h = tile.height * WORLD_SCALAR;
                        const x = tile.x * WORLD_SCALAR;
                        const y = tile.y * WORLD_SCALAR;
                        const z = get_depth(x, y, id_layer, tile_w, tile_h);
                        const plane = SceneManager.create(IObjectTypes.GO_SPRITE_COMPONENT, { width: tile_w, height: tile_h });
                        plane.position.set(x, y, z);
                        plane.set_texture(tile_info.name, tile_info.atlas);
                        apply_tile_transform(plane, tile.tile_id);
                        if (tile.rotation)
                            plane.rotation.z = -tile.rotation! * Math.PI / 180;
                        container.add(plane);
                        plane.name = tile_info.name + '' + plane.mesh_data.id;
                        plane.userData = { tile };

                        if (['Flowers_1', 'Flowers_2', 'Flowers_3', 'Flowers_4'].includes(tile_info.name)) {
                            rm.add_region(x, y, tile_w, tile_h);
                        }
                    }
                }
            }
        }

        const cells = rm.get_debug_cells();
        for (let i = 0; i < cells.length; i++) {
            const it = cells[i];
            const l = make_ramk(cell_size, cell_size);
            l.position.set(it.x + cell_size / 2, it.y + cell_size / 2, 9000);
            RenderEngine.scene.add(l);
            const m = SceneManager.create(IObjectTypes.GO_LABEL_COMPONENT, { text: it.x + '\n' + it.y });
            m.scale.setScalar(0.04);
            SceneManager.add(m);
            m.position.set(it.x + cell_size / 2, it.y + cell_size / 2, 9000);
        }
        //log(cells)
        setInterval(() => rm.update(), 200);
    }

    return { load };
}