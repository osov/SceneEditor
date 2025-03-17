import { SERVER_URL } from "./config";
import { run_debug_filemanager } from "./controls/AssetControl";
import { URL_PATHS } from "./modules_editor/modules_editor_const";
import { apply_object_transform,  apply_tile_transform,  get_depth, get_tile_texture, MapData, parse_tiled, preload_tiled_textures,  TILE_FLIP_MASK } from "./render_engine/parsers/tile_parser";
import { IObjectTypes } from "./render_engine/types";


export async function run_anim_scene() {
    await ResourceManager.preload_texture('./img/2.png');
    ResourceManager.set_project_path(`${SERVER_URL}${URL_PATHS.ASSETS}`);
    await run_debug_filemanager();


/*
    await ResourceManager.preload_model('/male/idle_walk.fbx');
    const am = SceneManager.create(IObjectTypes.GO_MODEL_COMPONENT, { width: 50, height: 50 });
    am.set_mesh('idle_walk');
    am.set_texture('PolygonExplorers_Texture_01_A')
    am.add_animation('idle_walk', 'idle');
    am.rotateX(0.6)
    am.position.set(250, -500, 1)
    am.children[0].scale.setScalar(0.3)
    SceneManager.add(am);
*/

    
    CameraControl.set_position(250, -500, false);
    CameraControl.set_zoom(2, false)
    ControlManager.update_graph(true);



    const map_data = await ResourceManager.load_asset('/tiled/parsed_map.json') as MapData;
    await preload_tiled_textures(map_data);
    const render_data = parse_tiled(map_data);

    const tileSize = 256;
    let id_layer = -1;
    for (let layer of render_data.layers) {
        id_layer++;
        const container = SceneManager.create(IObjectTypes.GO_CONTAINER, {});
        container.name = layer.layer_name;
        SceneManager.add(container);
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

            const plane = SceneManager.create(IObjectTypes.SLICE9_PLANE, { width: tile_info.w, height: tile_info.h });
            plane.position.set(tile.x * tileSize + tileSize / 2, tile.y * tileSize - tileSize / 2, get_depth(tile.x, tile.y, id_layer, 0, 0));
            plane.set_texture(tile_info.name, tile_info.atlas);
            apply_tile_transform(plane, tile_id);
            container.add(plane);
        }
    }

    /*
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
            container.add(plane);
            plane.name = tile_info.name+''+plane.mesh_data.id;
        }
    }
        */



    CameraControl.set_position(3251, -2039, false);
    CameraControl.set_zoom(0.2, false)
    ControlManager.update_graph(true);
    log("Ready");

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