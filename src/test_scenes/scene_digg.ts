import { PROJECT_NAME, SERVER_URL, WORLD_SCALAR } from "../config";
import { run_debug_filemanager } from "../controls/AssetControl";
import { URL_PATHS } from "../modules_editor/modules_editor_const";
import { get_all_tiled_textures, get_depth, MapData, preload_tiled_textures } from "../render_engine/parsers/tile_parser";
import { IObjectTypes } from "../render_engine/types";
import { default_settings, load_obstacles, MovementLogic, PlayerMovementSettings, PointerControl } from "../modules/PlayerMovement";

const SORT_LAYER = 7;
const SUB_SCALAR = WORLD_SCALAR;
export async function run_scene_digg() {
    (window as any).get_depth = get_depth;

    ResourceManager.set_project_path(`${SERVER_URL}${URL_PATHS.ASSETS}`);
    await run_debug_filemanager(PROJECT_NAME);

    // hack atlases
    //const all = get_all_tiled_textures();
    //for (const id in all) {
    //    const tex = all[id];
    //    if (ResourceManager.has_texture_name(tex.name, '')) {
    //        ResourceManager.override_atlas_texture('', tex.atlas, tex.name);
    //    }
    //}
    //await ResourceManager.write_metadata();
    // ------------
    const map_data = await ResourceManager.load_asset('/tiled/parsed_map.json') as MapData;
    const physic_layer = { "layer_name": "\u0424\u0438\u0437\u0438\u043a\u0430", "objects": [{ "id": 6779, "x": 2791.0, "y": 2548.0, "polygon": [0.0, 11.0, 261.0, 7.0, 277.0, 53.0, 513.667, 56.6667, 537.667, -3.0, 774.0, -3.0, 796.0, 55.0, 1085.0, 54.0, 1083.0, -3.0, 843.0, 3.0, 829.0, -43.0, 485.667, -43.3333, 476.667, 11.0, 326.0, 11.3333, 305.0, -35.0, -8.0, -35.3333] }, { "id": 6780, "x": 2787.5, "y": 2279.5, "polygon": [22.3333, 65.3333, 38.3329, 7.10877, 257.416, 1.0, 290.598, 53.0, 524.603, 54.0, 544.736, -3.0, 778.28, -3.0, 795.069, 55.0, 1042.67, 73.0, 1016.99, 11.6667, 833.717, 16.3333, 806.479, -38.6667, -33.3333, -30.6667, -33.941, 71.2443] }, { "id": 6783, "x": 2768.0, "y": 2256.0, "polyline": [-10.6667, -8.0, -26.6667, -1.0, -29.0, -272.333, -5.33333, -187.667, 236.667, -207.333, 236.0, -452.667, 249.667, -454.0, 250.0, -258.667, 320.0, -258.0, 365.0, -303.0, 409.0, -324.0, 579.0, -326.0, 625.0, -259.0, 715.0, -223.0, 791.0, -241.0, 829.0, -286.0, 810.0, -345.0, 728.0, -393.0, 639.0, -431.0, 594.0, -514.0, 620.0, -608.0, 711.0, -653.0, 782.0, -668.0, 1006.0, -662.0, 1415.67, -677.333, 1527.53, -644.924, 1537.7, -536.006, 1414.71, -513.277, 1150.67, -543.333, 1039.0, -523.0, 946.0, -434.0, 966.0, -401.0, 949.0, -351.0, 976.0, -261.0, 973.0, -208.0, 911.0, -149.0, 887.0, -85.0, 836.0, -52.0, 838.0, -8.0] }, { "id": 6784, "x": 2602.0, "y": 2255.67, "polygon": [0.0, 0.0, 19.0, -35.0, 9.0, -55.0, 13.0, -277.0, -513.0, -277.0, -521.0, -186.0, -579.667, -197.0, -576.667, -260.333, -587.0, -336.0, -708.0, -407.0, -968.0, -403.0, -1058.0, -308.0, -1058.0, -173.0, -1242.0, -161.0, -1388.0, -164.0, -1397.0, -288.0, -1396.0, -1.0, -1370.0, -34.0, -702.0, -49.0, -586.0, -50.0, -559.0, 195.0, -511.0, 246.0, -136.0, 241.0, -129.0, 106.0] }, { "id": 6786, "x": 3974.67, "y": 2274.67, "polyline": [2.66667, -4.0, -125.333, -2.66667, -122.667, -296.0, 9.33333, -293.333] }] };
    map_data.objects.push(physic_layer as any);
    preload_tiled_textures(map_data);

    const size = 10;
    const scale = 256 * SUB_SCALAR;
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const spr = SceneManager.create(IObjectTypes.GO_SPRITE_COMPONENT, { width: scale, height: scale });
            spr.set_texture('1_17');
            spr.set_position((x-size/2)*scale,(y-size/2)*scale);
            SceneManager.add(spr); 
        }
        
    }


    const am = SceneManager.create(IObjectTypes.GO_MODEL_COMPONENT, { width: 50 * SUB_SCALAR, height: 50 * SUB_SCALAR });
    const x = 0 * SUB_SCALAR;
    const y = 0 * SUB_SCALAR;
    const z = get_depth(x, y, SORT_LAYER, 50 * SUB_SCALAR, 50 * SUB_SCALAR);
    am.set_mesh('Unarmed Idle');
    am.children[0].scale.setScalar(1 / 100 * SUB_SCALAR);
    am.add_animation('Unarmed Idle', 'idle');
    am.add_animation('Unarmed Run Forward', 'walk');
    am.set_texture('PolygonExplorers_Texture_01_A')
    am.rotateX(30 / 180 * Math.PI)
    am.position.set(x, y, z)
    SceneManager.add(am);

    ControlManager.update_graph(true, 'digg');

    let game_mode = new URLSearchParams(document.location.search).get('is_game') == '1';
    if (game_mode) {
        const movement_settings: PlayerMovementSettings = {
            ...default_settings,
            collision_radius: 2,
            speed: { WALK: 26 },
            debug: true,
        }
        const obstacles = load_obstacles(map_data);
        const move_logic = MovementLogic(movement_settings);
        move_logic.init({ model: am, obstacles });
        EventBus.on('SYS_VIEW_INPUT_KEY_UP', (e) => {
            if (e.key == 'ь' || e.key == 'm') {
                if (move_logic.check_obstacles_enabled()) move_logic.enable_obstacles(false);
                else move_logic.enable_obstacles(true);
            }
        })
    }

    // console.log(JSON.stringify(SceneManager.save_scene()));
}