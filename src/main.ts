import '@/assets/css/style.css'
import { register_manager } from "./modules/Manager";
import { register_engine } from './render_engine/engine';
import { run_debug_scene } from './test_scene';
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
import { register_inspector_control } from './controls/InspectorControl';
import { register_asset_control } from './controls/AssetControl';
import { run_anim_scene } from './test_scene_anim';

register_manager();
register_engine();
RenderEngine.init();
RenderEngine.animate();

Input.bind_events();
register_resource_manager();
register_scene_manager();

register_camera_control();
register_select_control();
register_size_control();
register_transform_control();
register_actions_control();
register_view_control();
register_asset_control();
register_tree_control();
register_popups();
register_contextmenu();
register_inspector_control();
register_control_manager();
register_history_control();

//run_debug_scene();
run_anim_scene();
