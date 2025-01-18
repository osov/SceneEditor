import '@/assets/css/style.css'
import { register_manager } from "./modules/Manager";
import { register_engine } from './render_engine/engine';
import { run_debug_scene } from './test_scene';
import { initButtons } from './scene_tree/buttons';
import { renderTree } from './scene_tree/tree';

register_manager();
register_engine();
RenderEngine.init();
RenderEngine.animate();


run_debug_scene();

initButtons();
renderTree();