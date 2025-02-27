import { apply_object_transform, apply_tile_transform, get_depth, get_tile_texture, MapData, parse_tiled, preload_tiled_textures, TILE_FLIP_MASK } from "./render_engine/parsers/tile_parser";
import { IObjectTypes } from "./render_engine/types";


export async function run_anim_scene() {
    //  await ResourceManager.preload_texture('./img/2.png');
    //await ResourceManager.preload_atlas('./img/example_atlas.tpsheet', './img/example_atlas.png');
    ResourceManager.set_project_path('http://localhost:7000/assets/ExampleProject/public/');

    /*
        const plane_4 = SceneManager.create(IObjectTypes.SLICE9_PLANE, { width: 128, height: 32 });
        plane_4.scale.setScalar(2);
        plane_4.position.set(300, -500, 0);
        plane_4.set_slice(8, 8)
        plane_4.set_color('#0f0')
        plane_4.set_texture('2');
        SceneManager.add(plane_4);
    
    
        await ResourceManager.preload_texture('Material-Color-Picker.jpg', '');
        await ResourceManager.preload_model('guy@Idle.fbx');
        await ResourceManager.preload_model('guy@Medium Run.fbx');
    
        const am = SceneManager.create(IObjectTypes.ANIMATED_MESH, { width: 50, height: 50 });
        am.mesh_data.id = 1000;
        am.set_mesh('guy@Idle');
        am.set_texture('Material-Color-Picker')
        am.add_animation('guy@Idle', 'idle');
        am.add_animation('guy@Medium Run', 'walk');
        am.rotateX(0.6)
        am.position.set(250, -500, -0.1)
        SceneManager.add(am);
    */
    const map_data = await ResourceManager.load_asset('./parsed_map.json') as MapData;
    await preload_tiled_textures(map_data);
    const render_data = parse_tiled(map_data);

    const tileSize = 512;
    let id_layer = -1;
    for (let layer of render_data.layers) {
        id_layer++;
        const container = SceneManager.create(IObjectTypes.GO_CONTAINER, {});
        container.name = layer.layer_name;
        SceneManager.add(container);
        for (let tile of layer.tiles) {
            const tile_id = tile.id & TILE_FLIP_MASK;
            const plane = SceneManager.create(IObjectTypes.SLICE9_PLANE, { width: tileSize, height: tileSize });
            plane.position.set(tile.x * tileSize + tileSize / 2, tile.y * tileSize - tileSize / 2, get_depth(tile.x, tile.y, id_layer, 0, 0));
            const tile_info = get_tile_texture(tile_id);
            plane.set_texture(tile_info.name, tile_info.atlas);
            apply_tile_transform(plane, tile.id);
            container.add(plane);
        }
    }

    for (let object_layer of render_data.objects_layers) {
        id_layer++;
        let id_object = -1;
        const container = SceneManager.create(IObjectTypes.GO_CONTAINER, {});
        container.name = object_layer.layer_name;
        SceneManager.add(container);
        for (let tile of object_layer.objects) {
            id_object++;
            const tile_id = tile.tile_id & TILE_FLIP_MASK;
            const plane = SceneManager.create(IObjectTypes.SLICE9_PLANE, { width: tile.width, height: tile.height });
            plane.set_pivot(0, 0)
            plane.position.set(tile.x, tile.y, get_depth(tile.x, tile.y, id_layer, tile.width, tile.height));
            const tile_info = get_tile_texture(tile_id);
            plane.set_texture(tile_info.name, tile_info.atlas);
            apply_object_transform(plane, tile);
            if (tile.rotation)
                plane.rotation.z = -tile.rotation * Math.PI / 180;
            container.add(plane);
        }
    }

    CameraControl.set_position(4276, -874, false);
    CameraControl.set_zoom(3, false)
    ControlManager.update_graph();
}