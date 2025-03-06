import { is_base_mesh } from "../render_engine/helpers/utils";
import { IBaseMeshAndThree } from "../render_engine/types";
import { TreeItem } from "./TreeControl";
import { HistoryData } from "./HistoryControl";
import Stats from 'stats.js';
import { getDefaultInspectorConfig } from "./InspectorControl";

declare global {
    const ControlManager: ReturnType<typeof ControlManagerCreate>;
}

export function register_control_manager() {
    (window as any).ControlManager = ControlManagerCreate();
}

type ButtonsList = 'translate_transform_btn' | 'scale_transform_btn' | 'rotate_transform_btn' | 'size_transform_btn';

function ControlManagerCreate() {
    let active_control = '';
    function init() {
        bind_btn('translate_transform_btn', () => set_active_control('translate_transform_btn'));
        bind_btn('scale_transform_btn', () => set_active_control('scale_transform_btn'));
        bind_btn('rotate_transform_btn', () => set_active_control('rotate_transform_btn'));
        bind_btn('size_transform_btn', () => set_active_control('size_transform_btn'));

        InspectorControl.setupConfig(getDefaultInspectorConfig());

        EventBus.on('SYS_SELECTED_MESH_LIST', (e) => {
            (window as any).selected = e.list[0];
            TransformControl.set_selected_list(e.list);
            SizeControl.set_selected_list(e.list);
            InspectorControl.set_selected_list(e.list);
            update_graph();
        });

        EventBus.on('SYS_UNSELECTED_MESH_LIST', () => {
            (window as any).selected = null;
            TransformControl.detach();
            SizeControl.detach();
            InspectorControl.detach();
            update_graph();
        });

        // Graph select
        EventBus.on('SYS_GRAPH_SELECTED', (e) => {
            const list = [];
            for (let i = 0; i < e.list.length; i++) {
                const m = SceneManager.get_mesh_by_id(e.list[i]);
                if (m)
                    list.push(m);
            }
            SelectControl.set_selected_list(list);
            if (list.length == 0)
                EventBus.trigger('SYS_UNSELECTED_MESH_LIST');
        })

        EventBus.on('SYS_GRAPH_MOVED_TO', (e) => {
            // save history
            const saved_list: HistoryData['MESH_MOVE'][] = [];
            const mesh_list: IBaseMeshAndThree[] = [];
            for (let i = 0; i < e.id_mesh_list.length; i++) {
                const id = e.id_mesh_list[i];
                const mesh = SceneManager.get_mesh_by_id(id);
                if (!mesh) {
                    Log.error('mesh is null', id);
                    continue;
                }
                const parent = mesh.parent!;
                let pid = -1;
                if (is_base_mesh(parent))
                    pid = (parent as any as IBaseMeshAndThree).mesh_data.id;
                saved_list.push({ id_mesh: id, pid: pid, next_id: SceneManager.find_next_id_mesh(mesh) });
                mesh_list.push(mesh);
            }
            HistoryControl.add('MESH_MOVE', saved_list);
            // move
            for (let i = 0; i < e.id_mesh_list.length; i++) {
                const id = e.id_mesh_list[i];
                SceneManager.move_mesh_id(id, e.pid, e.next_id);
            }
            SelectControl.set_selected_list(mesh_list);
            update_graph();

        });

        EventBus.on('SYS_GRAPH_CHANGE_NAME', (e) => {
            const mesh = SceneManager.get_mesh_by_id(e.id);
            if (!mesh) return Log.error('mesh is null', e.id);
            HistoryControl.add('MESH_NAME', [{ id_mesh: e.id, name: mesh.name }]);
            mesh.name = e.name;
            SelectControl.set_selected_list([mesh]);
            update_graph();
        });
        set_active_control('size_transform_btn');
        init_stats();
    }

    function init_stats() {
        let params = new URLSearchParams(document.location.search);
        if (params.has("stats")) {
            const stats = new Stats();
            stats.dom.style.cssText = 'position:fixed;top:0;right:80px;cursor:pointer;opacity:0.9;z-index:10000';
            stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
            document.body.appendChild(stats.dom);
            EventBus.on('SYS_ON_UPDATE', () => stats.begin());
            EventBus.on('SYS_ON_UPDATE_END', () => stats.end());
        }
    }

    function bind_btn(name: ButtonsList, callback: Function) {
        document.querySelector('.menu_min a.' + name)!.addEventListener('click', () => {
            callback();
        })
    }

    function set_active_control(name: ButtonsList) {
        if (name == active_control) return;
        clear_all_controls();
        set_active_btn(name);
        if (name == 'translate_transform_btn') {
            active_control = 'translate';
            TransformControl.set_active(true);
            TransformControl.set_mode('translate');
            TransformControl.set_selected_list(SelectControl.get_selected_list());
        }
        if (name == 'scale_transform_btn') {
            active_control = 'scale';
            TransformControl.set_active(true);
            TransformControl.set_mode('scale');
            TransformControl.set_selected_list(SelectControl.get_selected_list());
        }
        if (name == 'rotate_transform_btn') {
            active_control = 'rotate';
            TransformControl.set_active(true);
            TransformControl.set_mode('rotate');
            TransformControl.set_selected_list(SelectControl.get_selected_list());
        }
        if (name == 'size_transform_btn') {
            active_control = 'size';
            SizeControl.set_active(true);
            SizeControl.set_selected_list(SelectControl.get_selected_list());
        }
    }

    function clear_all_controls() {
        const list = document.querySelectorAll('.menu_min a');
        for (let i = 0; i < list.length; i++) {
            list[i].classList.remove('active');
        }
        TransformControl.set_active(false);
        SizeControl.set_active(false);
    }

    function set_active_btn(name: ButtonsList) {
        document.querySelector('.menu_min a.' + name)!.classList.add('active');
    }

    function get_tree_graph() {
        const graph = SceneManager.make_graph();
        const sel_list_ids = SelectControl.get_selected_list().map(m => m.mesh_data.id);
        const list: TreeItem[] = [];
        list.push({ id: -1, pid: -2, name: 'Сцена', icon: 'scene', selected: false, visible: true });
        for (let i = 0; i < graph.length; i++) {
            const g_item = graph[i];
            const item: TreeItem = {
                id: g_item.id,
                pid: g_item.pid,
                name: g_item.name,
                icon: g_item.type,
                selected: sel_list_ids.includes(g_item.id),
                visible: g_item.visible
            };
            if (g_item.type == 'sprite' || g_item.type == 'label') { item.no_drop = true; }
            list.push(item);
        }
        return list;
    }

    function update_graph(is_first = false) {
        if (is_first) TreeControl.draw_graph(ControlManager.get_tree_graph(), 'test_scene', true);
        else TreeControl.draw_graph(ControlManager.get_tree_graph(), 'test_scene');
    }

    init();
    return { clear_all_controls, set_active_control, get_tree_graph, update_graph };
}
