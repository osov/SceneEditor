import { SERVER_URL } from "./config";
import { run_debug_filemanager } from "./controls/AssetControl";
import { URL_PATHS } from "./modules_editor/modules_editor_const";
import { apply_object_transform, apply_tile_transform, get_depth, get_tile_texture, MapData, parse_tiled, preload_tiled_textures, rotate_point, TILE_FLIP_MASK } from "./render_engine/parsers/tile_parser";
import { IObjectTypes } from "./render_engine/types";


export async function run_anim_scene() {
    await ResourceManager.preload_texture('./img/2.png');
    ResourceManager.set_project_path(`${SERVER_URL}${URL_PATHS.ASSETS}`);
    await run_debug_filemanager();



    /*
    const go = SceneManager.create(IObjectTypes.GO_CONTAINER, { width: 32, height: 32 });
    SceneManager.add(go);

    const plane_1 = SceneManager.create(IObjectTypes.SLICE9_PLANE, { width: 128, height: 32 });
    plane_1.scale.setScalar(2);
    plane_1.position.set(300, -379, 0.99);
    plane_1.set_slice(8, 8)
    plane_1.set_color('#0f0')
    plane_1.set_texture('2');
    //  SceneManager.add(plane_1);

    const plane_2 = SceneManager.create(IObjectTypes.SLICE9_PLANE, { width: 128, height: 32 });
    plane_2.scale.setScalar(2);
    plane_2.position.set(300, -500, 1.01);
    plane_2.set_slice(8, 8)
    plane_2.set_color('#0f0')
    plane_2.set_texture('2');
    // SceneManager.add(plane_2);


    await ResourceManager.preload_texture('Material-Color-Picker.jpg', '');
    await ResourceManager.preload_model('guy.fbx');
    await ResourceManager.preload_model('guy@Medium Run.fbx');

    const am = SceneManager.create(IObjectTypes.GO_MODEL_COMPONENT, { width: 50, height: 50 });
    am.set_mesh('guy');
    am.set_texture('Material-Color-Picker')
    am.add_animation('guy', 'idle');
    am.add_animation('guy@Medium Run', 'walk');
    am.rotateX(0.6)
    am.position.set(250, -500, 1)
    am.children[0].scale.setScalar(0.3)
    SceneManager.add(am);



    await ResourceManager.preload_texture('iso/stoneWallArchway_S.png');
    await ResourceManager.preload_texture('iso/stoneWallStructure_S.png');
    const t1 = SceneManager.create(IObjectTypes.SLICE9_PLANE, { width: 256, height: 512 });
    t1.position.set(300, -379, 0.99);
    t1.set_texture('stoneWallStructure_S');
    SceneManager.add(t1);

*/
    const map_data = await ResourceManager.load_asset('/parsed_map.json') as MapData;
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
            plane.position.set(tile.x, tile.y, get_depth(tile.x, tile.y, id_layer, tile.width, tile.height));
            const tile_info = get_tile_texture(tile_id);
            plane.set_texture(tile_info.name, tile_info.atlas);
            apply_object_transform(plane, tile);
            if (tile.rotation)
                plane.rotation.z = -tile.rotation! * Math.PI / 180;
            container.add(plane);
            plane.name = tile_info.name+''+plane.mesh_data.id;
        }
    }



    CameraControl.set_position(3916, -2437, false);
    CameraControl.set_zoom(2, false)
    ControlManager.update_graph(true);

    /*
      ResourceManager.preload_model('cow.glb');
        const am = SceneManager.create(IObjectTypes.ANIMATED_MESH, { width: 50, height: 50 });
        am.set_mesh('cow');
        am.children[0].scale.setScalar(100);
        am.add_animation('Armature|idle1', 'idle');
        am.rotateX(0.6)
        am.position.set(3121, -1692, 5)
        SceneManager.add(am);
    
    
        await ResourceManager.preload_texture('T_GreatHornedOwl_BaseColor.jpg');
        await ResourceManager.preload_model('SK_GreatHornedOwl2Sided.FBX');
        await ResourceManager.preload_model('GreatHornedOwl@IdleLookAroundGrounded.FBX');
        let mesh = SceneManager.create(IObjectTypes.ANIMATED_MESH, { width: 50, height: 50 });
        mesh.set_mesh('SK_GreatHornedOwl2Sided');
        mesh.children[0].scale.setScalar(1.5);
        mesh.add_animation('GreatHornedOwl@IdleLookAroundGrounded', 'idle');
        mesh.set_texture('T_GreatHornedOwl_BaseColor');
        mesh.rotateX(0.6)
        mesh.rotateY(0.6)
        mesh.set_position(3155, -1692, 5)
        SceneManager.add(mesh);
    
    
        await ResourceManager.preload_texture('T_Duck_Legacy.jpg');
        await ResourceManager.preload_model('SK_Duck.FBX');
        await ResourceManager.preload_model('Duck@IdlePickGround.FBX');
        mesh = SceneManager.create(IObjectTypes.ANIMATED_MESH, { width: 50, height: 50 });
        mesh.set_mesh('SK_Duck');
        mesh.children[0].scale.setScalar(2);
        mesh.add_animation('Duck@IdlePickGround', 'idle');
        mesh.set_texture('T_Duck_Legacy');
        mesh.rotateX(0.6)
        mesh.rotateY(-0.9)
        mesh.set_position(3121, -1792, 25)
        SceneManager.add(mesh);
        */
}