import '@/assets/css/style.css'
import { register_manager } from "./modules/Manager";
import { register_engine } from './render_engine/engine';
import { run_scene_simple } from './test_scenes/scene_simple';
import { register_tree_control } from './controls/TreeControl';
import { register_popups } from './modules_editor/Popups';
import { register_contextmenu } from './modules_editor/ContextMenu';
import { register_select_control } from './controls/SelectControl';
import { register_camera_control } from './controls/CameraContol';
import { register_size_control } from './controls/SizeControl';
import { register_transform_control } from './controls/TransformControl';
import { register_scene_manager } from './render_engine/scene_manager';
import { register_control_manager } from './controls/ControlManager';
import { register_history_control } from './controls/HistoryControl';
import { register_resource_manager } from './render_engine/resource_manager';
import { register_actions_control } from './controls/ActionsControl';
import { register_view_control } from './controls/ViewControl';
import { register_asset_control } from './controls/AssetControl';
import { run_scene_anim } from './test_scenes/scene_anim';
import { run_scene_light } from './test_scenes/scene_light';
import { run_scene_card } from './test_scenes/scene_card';
import { register_flow_map_control } from './controls/FlowMapControl';
import { run_scene_stereo } from './test_scenes/scene_stereo';
import { run_scene_inventory } from './test_scenes/scene_inventory';
import { register_grass_tree_control } from './controls/GrassTreeControl';
import { register_object_inspector } from './inspectors/ObjectInspector';
import { register_asset_inspector } from './inspectors/AssetInspector';

let game_mode = new URLSearchParams(document.location.search).get('is_game') == '1';

register_manager();
register_engine();
RenderEngine.init();
RenderEngine.animate();

Input.bind_events();
register_resource_manager();
register_scene_manager();

register_camera_control();
register_select_control();
if (!game_mode)
    SelectControl.init();
register_size_control();
register_transform_control();
register_actions_control();
register_view_control();
register_asset_control();
register_tree_control();
register_popups();
register_contextmenu();
register_flow_map_control();
register_grass_tree_control();
register_control_manager();
register_history_control();

register_object_inspector();
register_asset_inspector();


const scenes = [
    run_scene_simple,
    run_scene_anim,
    run_scene_card,
    run_scene_light,
    run_scene_stereo,
    run_scene_inventory,
];
let id = new URLSearchParams(document.location.search).get('scene');
if (id)
    scenes[parseInt(id)]();
else
    scenes[0]();

