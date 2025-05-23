import '@/assets/css/style.css'
import { register_manager } from "./modules/Manager";
import { register_engine } from './render_engine/engine';
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
import { register_flow_map_control } from './controls/FlowMapControl';
import { register_grass_tree_control } from './controls/GrassTreeControl';
import { register_mesh_inspector } from './inspectors/MeshInspector';
import { register_asset_inspector } from './inspectors/AssetInspector';
import { register_paint_inspector } from './inspectors/PaintInspector';
import { register_cmp_mover_inspector } from './inspectors/ComponentMoverInspector';
import { register_components_control } from './controls/ComponentsControl';
import { PROJECT_NAME } from './config';
import { register_lua_core } from './defold/core';
import { register_tween_manager } from './render_engine/tween_manager';
import { register_audio_manager } from './modules/AudioManager';

function register_managers() {
    register_manager();
    register_engine();
    register_resource_manager();
    register_scene_manager();
    register_tween_manager();
    register_audio_manager();
    RenderEngine.init();
}

function register_controls() {
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
    register_control_manager();
    register_history_control();
    register_flow_map_control();
    register_grass_tree_control();
    register_components_control();
}

function register_inspectors() {
    register_mesh_inspector();
    register_asset_inspector();
    register_paint_inspector();
    register_cmp_mover_inspector();
}

async function run_selected_scene() {
    if (PROJECT_NAME != '') {
        try {
            const main_file = await import(`../../${PROJECT_NAME}/src/main.ts`);
            main_file.main();
        }
        catch (e) {
            Log.error('Проект не загружен:', PROJECT_NAME);
        }
    }
    else
        Log.error('Не передано имя проекта');
}


register_managers();
register_controls();
register_inspectors();
register_lua_core();
run_selected_scene();

const game_mode = new URLSearchParams(document.location.search).get('is_game') == '1';
RenderEngine.animate();
Input.bind_events();

if (!game_mode)
    SelectControl.init();
