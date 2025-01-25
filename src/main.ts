import '@/assets/css/style.css'
import { register_manager } from "./modules/Manager";
import { register_engine } from './render_engine/engine';
import { run_debug_scene } from './test_scene';
import { initButtons } from './scene_tree/buttons';
import { renderTree } from './scene_tree/tree';
import { register_select_control } from './controls/SelectControl';
import { register_camera_control } from './controls/CameraContol';
import { register_size_control } from './controls/SizeControl';
import { register_transform_control } from './controls/TransformControl';
import { register_scene_manager } from './render_engine/scene_manager';
import { register_control_manager } from './controls/ControlManager';
import { register_history_control } from './controls/HistoryControl';

register_manager();
register_engine();
RenderEngine.init();
RenderEngine.animate();

Input.bind_events();
register_scene_manager();
register_camera_control();
register_select_control();
register_size_control();
register_transform_control();
register_control_manager();
register_history_control();
run_debug_scene();

initButtons();
renderTree();