import { SERVER_URL, WORLD_SCALAR } from "./config";
import { run_debug_filemanager } from "./controls/AssetControl";
import { URL_PATHS } from "./modules_editor/modules_editor_const";
import { get_all_tiled_textures, get_depth, MapData, preload_tiled_textures } from "./render_engine/parsers/tile_parser";
import { IObjectTypes } from "./render_engine/types";
import { TileLoader } from "./render_engine/tile_loader";

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
    const world = SceneManager.create(IObjectTypes.GO_CONTAINER, {});
    world.name = 'World';
    SceneManager.add(world);
    const tl = TileLoader(world, 256);
    tl.load(map_data);


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

}