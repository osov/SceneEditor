import { PROJECT_NAME, SERVER_URL, WORLD_SCALAR } from "../config";
import { run_debug_filemanager } from "../controls/AssetControl";
import { URL_PATHS } from "../modules_editor/modules_editor_const";
import { get_all_tiled_textures, get_depth, MapData, preload_tiled_textures } from "../render_engine/parsers/tile_parser";
import { IObjectTypes } from "../render_engine/types";
import { TileLoader } from "../render_engine/tile_loader";
import { default_settings, load_obstacles, MovementLogic, PathFinderMode, PlayerMovementSettings } from "../modules/PlayerMovement";
import { Segment } from "2d-geometry";

const SORT_LAYER = 7;
const SUB_SCALAR = WORLD_SCALAR;
export async function run_scene_anim() {
    (window as any).get_depth = get_depth;

    ResourceManager.set_project_path(`${SERVER_URL}${URL_PATHS.ASSETS}`);
    await run_debug_filemanager(PROJECT_NAME);

    const map_data = await ResourceManager.load_asset('/tiled/parsed_map.json') as MapData;
    preload_tiled_textures(map_data);
    // hack atlases
    //const all = get_all_tiled_textures();
    //for (const id in all) {
    //    const tex = all[id];
    //    if (ResourceManager.has_texture_name(tex.name, '')) {
    //        ResourceManager.override_atlas_texture('', tex.atlas, tex.name);
    //    }
    //}
    await ResourceManager.write_metadata();
    // ------------

    const world = SceneManager.create(IObjectTypes.GO_CONTAINER, {});
    world.name = 'World';
    SceneManager.add(world);
    const tl = TileLoader(world, 256);
    tl.load(map_data);

    const parent = SceneManager.create(IObjectTypes.GO_CONTAINER);
    parent.name = 'parent';
    parent.position.set(0, 0, 300);
    SceneManager.add(parent);

    const child = SceneManager.create(IObjectTypes.GO_CONTAINER);
    child.name = 'child';
    parent.add(child);

    const sprite = SceneManager.create(IObjectTypes.GO_SPRITE_COMPONENT);
    sprite.set_texture('5');
    sprite.set_position(0, 0, 0);
    child.add(sprite);

    const gui = SceneManager.create(IObjectTypes.GUI_CONTAINER);
    SceneManager.add(gui);

    const box = SceneManager.create(IObjectTypes.GUI_BOX, { width: 128, height: 32 });
    box.scale.setScalar(2);
    box.position.set(-15, -420, 9000);
    box.set_color('#0f0')
    box.set_slice(8, 8);
    gui.add(box);

    const box1 = SceneManager.create(IObjectTypes.GUI_BOX, { width: 230, height: 50 });
    box1.set_color('#fff');
    box1.scale.setScalar(0.5);
    box.add(box1)

    const am = SceneManager.create(IObjectTypes.GO_MODEL_COMPONENT, { width: 50 * SUB_SCALAR, height: 50 * SUB_SCALAR });
    const x = 2900 * SUB_SCALAR;
    const y = -2750 * SUB_SCALAR;
    const z = get_depth(x, y, SORT_LAYER, 50 * SUB_SCALAR, 50 * SUB_SCALAR);
    am.set_mesh('Unarmed Idle');
    am.children[0].scale.setScalar(1 / 100 * SUB_SCALAR);
    am.add_animation('Unarmed Idle', 'idle');
    am.add_animation('Unarmed Run Forward', 'walk');
    am.set_texture('PolygonExplorers_Texture_01_A')
    am.rotateX(30 / 180 * Math.PI)
    am.position.set(x, y, z)
    SceneManager.add(am);

    ControlManager.update_graph(true, 'anim_scene');

    let game_mode = new URLSearchParams(document.location.search).get('is_game') == '1';
    if (game_mode) {
        const movement_settings: PlayerMovementSettings = {
            ...default_settings,
            path_finder_mode: PathFinderMode.WAY_PREDICTION,
            collision_radius: 2,
            max_try_dist: 0.5,
            target_stop_distance: 0.2,
            blocked_move_min_dist: 0.01,
            debug: true,
        }
        const obstacles = load_obstacles(map_data);
        const move_logic = MovementLogic(movement_settings);
        move_logic.init({model: am, obstacles});
        EventBus.on('SYS_VIEW_INPUT_KEY_UP', (e) => {
            if (e.key == 'ь' || e.key == 'm') {
                if (move_logic.check_obstacles_enabled()) move_logic.enable_obstacles(false);
                else move_logic.enable_obstacles(true);
            }
        })
    }

    // console.log(JSON.stringify(SceneManager.save_scene()));
}