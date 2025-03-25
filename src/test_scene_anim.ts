import { Vector3, Vector2 } from "three";
import { SERVER_URL, WORLD_SCALAR } from "./config";
import { run_debug_filemanager } from "./controls/AssetControl";
import { URL_PATHS } from "./modules_editor/modules_editor_const";
import { rotate_point } from "./render_engine/helpers/utils";
import { apply_tile_transform, get_all_tiled_textures, get_depth, get_tile_texture, MapData, parse_tiled, preload_tiled_textures, TILE_FLIP_MASK } from "./render_engine/parsers/tile_parser";
import { IObjectTypes } from "./render_engine/types";

const SORT_LAYER = 7;
const SUB_SCALAR = WORLD_SCALAR;
export async function run_anim_scene() {
    (window as any).get_depth = get_depth;

    ResourceManager.set_project_path(`${SERVER_URL}${URL_PATHS.ASSETS}`);
    const project_to_load = 'SceneEditor_ExampleProject';
    await run_debug_filemanager(project_to_load);


    const map_data = await ResourceManager.load_asset('/tiled/parsed_map.json') as MapData;
    preload_tiled_textures(map_data);
    // hack atlases
    const all = get_all_tiled_textures();
    for (const id in all) {
        const tex = all[id];
        ResourceManager.override_atlas_texture('', tex.atlas, tex.name);
    }
    // ------------

    const render_data = parse_tiled(map_data);

    // TILES
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

            // Вычисляем коррекцию
            const tile_w = tile_info.w * SUB_SCALAR;
            const tile_h = tile_info.h * SUB_SCALAR;
            let x = tile.x * tileSize * SUB_SCALAR;
            let y = tile.y * tileSize * SUB_SCALAR - tileSize * SUB_SCALAR;
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
        }
    }

    // OBJECTS
    for (let object_layer of render_data.objects_layers) {
        id_layer++;
        let id_object = -1;
        const container = SceneManager.create(IObjectTypes.GO_CONTAINER, {});
        container.name = object_layer.layer_name;
        SceneManager.add(container);
        for (let tile of object_layer.objects) {
            id_object++;
            const tile_id = tile.tile_id & TILE_FLIP_MASK;
            const tile_info = get_tile_texture(tile_id);
            const tile_w = tile.width * SUB_SCALAR;
            const tile_h = tile.height * SUB_SCALAR;
            const x = tile.x * SUB_SCALAR;
            const y = tile.y * SUB_SCALAR;
            const z = get_depth(x, y, id_layer, tile_w, tile_h);
            const plane = SceneManager.create(IObjectTypes.GO_SPRITE_COMPONENT, { width: tile_w, height: tile_h });
            plane.position.set(x, y, z);
            plane.set_texture(tile_info.name, tile_info.atlas);
            apply_tile_transform(plane, tile.tile_id);
            if (tile.rotation)
                plane.rotation.z = -tile.rotation! * Math.PI / 180;
            container.add(plane);
            plane.name = tile_info.name + '' + plane.mesh_data.id;
        }
    }



    ControlManager.update_graph(true, 'anim_scene');

    const am = SceneManager.create(IObjectTypes.GO_MODEL_COMPONENT, { width: 50 * SUB_SCALAR, height: 50 * SUB_SCALAR });
    const x = 2802 * SUB_SCALAR;
    const y = -2533 * SUB_SCALAR;
    const z = get_depth(x, y, SORT_LAYER, 50 * SUB_SCALAR, 50 * SUB_SCALAR);
    am.set_mesh('Unarmed Idle');
    am.children[0].scale.setScalar(1 / 100 * SUB_SCALAR);
    am.add_animation('Unarmed Idle', 'idle');
    am.set_texture('PolygonExplorers_Texture_01_A')
    am.rotateX(30 / 180 * Math.PI)
    am.position.set(x, y, z)
    SceneManager.add(am);
    /*
    await ResourceManager.preload_model('/models/cow.glb');
    const am = SceneManager.create(IObjectTypes.GO_MODEL_COMPONENT, { width: 50, height: 50 });
    am.set_mesh('cow');
    am.children[0].scale.setScalar(100);
    am.add_animation('Armature|idle1', 'idle');
    am.rotateX(0.6)
    am.position.set(3121, -1692, 5)
    SceneManager.add(am);
    */
    /*
    
        await ResourceManager.preload_texture('T_GreatHornedOwl_BaseColor.jpg');
        await ResourceManager.preload_model('SK_GreatHornedOwl2Sided.FBX');
        await ResourceManager.preload_model('GreatHornedOwl@IdleLookAroundGrounded.FBX');
        let mesh = SceneManager.create(IObjectTypes.GO_MODEL_COMPONENT, { width: 50, height: 50 });
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
        mesh = SceneManager.create(IObjectTypes.GO_MODEL_COMPONENT, { width: 50, height: 50 });
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