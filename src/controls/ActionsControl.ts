import { format_list_without_children } from "../render_engine/helpers/utils";
import { HistoryData } from "./HistoryControl";
import { IObjectTypes } from '../render_engine/types';
import { TreeItem } from "./TreeControl";

declare global {
    const ActionsControl: ReturnType<typeof ActionsControlCreate>;
}

export function register_actions_control() {
    (window as any).ActionsControl = ActionsControlCreate();
}

export enum NodeAction {
    CTRL_X,
    CTRL_C,
    CTRL_V,
    CTRL_B,
    CTRL_D,
    rename,
    remove,
    add_gui_container,
    add_gui_box,
    add_gui_text,
    add_go_container,
    add_go_sprite_component,
    add_go_label_component,
    add_go_model_component,
    refresh,
    download,
    new_folder,
    material_base,
    new_particles,
}

function ActionsControlCreate() {
    let copy_mesh_list: any[] = [];
    let is_cut: boolean = false;

    function cut() {
        copy();
        if (copy_mesh_list.length > 0) {
            TreeControl.setCutList();
            is_cut = true;
        }
    }

    function copy() {
        const list = format_list_without_children(SelectControl.get_selected_list());
        if (list.length == 0) return;
        const canCopy = fromTheSameWorld(list);
        if (!canCopy) { 
            Popups.toast.open({
                type: 'info',
                message: 'Нельзя одновременно копировать/вырезать/дублировать элементы из GUI и GO!'
              });
            return;
        }

        copy_mesh_list = [];
        for (let i = 0; i < list.length; i++) {
            copy_mesh_list.push(SceneManager.serialize_mesh(list[i]));
        }
        
    }

    function paste(asChild: boolean = false) {
        if (copy_mesh_list.length == 0) return;
        const selected = SelectControl.get_selected_list();
        if (checkPasteSameWorld(selected[0]) == false) {
            Popups.toast.open({
                type: 'info',
                message: 'Нельзя элементы из GUI и GO вкладывать друг в друга!'
            });
            return;
        }

        let target: any = selected.length == 1 ? selected[0].parent : RenderEngine.scene;

        if(asChild && selected.length == 1) target = selected[0];

        if (is_cut) {
            const id_mlist: number[] = [];
            copy_mesh_list.forEach(i => id_mlist.push(i.id));
            TreeControl.setCutList(true);
            is_cut = false;
            copy_mesh_list.length = 0;
            EventBus.trigger("SYS_GRAPH_MOVED_TO", { pid: target.mesh_data?.id || -1, next_id: -1, id_mesh_list: id_mlist });
            return;
        }

        const mesh_list = [];
        const mesh_ids = [];
        for (let i = 0; i < copy_mesh_list.length; i++) {
            const m = SceneManager.deserialize_mesh(copy_mesh_list[i], false, target);
            m.position.x += 5;
            m.position.y -= 5;
            target.add(m);
            mesh_ids.push({ id_mesh: m.mesh_data.id });
            mesh_list.push(m);
        }
        setUniqueNameMeshList(ControlManager.get_tree_graph());

        HistoryControl.add('MESH_DELETE', mesh_ids);
        SelectControl.set_selected_list(mesh_list);
    }

    function duplication() {
        copy();
        paste();
        copy_mesh_list = [];
    }

    function remove() {
        const list = format_list_without_children(SelectControl.get_selected_list());
        if (list.length == 0) return;
        const mesh_data: HistoryData['MESH_ADD'][] = [];
        for (let i = 0; i < list.length; i++) {
            const m = list[i];
            mesh_data.push({ mesh: SceneManager.serialize_mesh(m), next_id: SceneManager.find_next_id_mesh(m) });
            SceneManager.remove(m.mesh_data.id);
        }
        HistoryControl.add('MESH_ADD', mesh_data);
        SelectControl.set_selected_list([]);
    }

    function add_gui_container(pid: number = -1) {
        const container = SceneManager.create(IObjectTypes.GUI_CONTAINER);
        sceneAddItem(container, pid);
    }
    
    function add_gui_box(pid: number = -1) {
        const box = SceneManager.create(IObjectTypes.GUI_BOX, { width: 128, height: 32 });
        box.scale.setScalar(1);
        box.position.set(200, -200, 0);
        box.set_color('#0f0')
        box.set_texture('2');
        box.set_slice(8, 8);
        sceneAddItem(box, pid);
    }

    function add_gui_text(pid: number = -1) {
        const txt = SceneManager.create(IObjectTypes.GUI_TEXT, { text: 'Text', width: 250, height: 50 });
        txt.set_color('#0f0');
        txt.scale.setScalar(0.5);
        txt.set_font('ShantellSans-Light11');
        sceneAddItem(txt, pid);
    }

    function add_go_container(pid: number = -1) {
        const container = SceneManager.create(IObjectTypes.GO_CONTAINER);
        container.set_position(540 / 2, -960 / 2);
        sceneAddItem(container, pid);
    }

    function add_go_sprite_component(pid: number = -1) {
        const sprite = SceneManager.create(IObjectTypes.GO_SPRITE_COMPONENT);
        sprite.set_texture('arrow1', 'example_atlas');
        sceneAddItem(sprite, pid);
    }

    function add_go_label_component(pid: number = -1) {
        const label = SceneManager.create(IObjectTypes.GO_LABEL_COMPONENT, {text:'label'});
        label.set_font('ShantellSans-Light11');
        sceneAddItem(label, pid);
    }

    function add_go_model_component(pid: number = -1) {
        const model = SceneManager.create(IObjectTypes.GO_MODEL_COMPONENT, { width: 50, height: 50 });
        model.position.set(250, 250, 1);
        sceneAddItem(model, pid);
    }

    function sceneAddItem(item: any, pid: number = -1) {
        if (!item) return;
        const parent = SceneManager.get_mesh_by_id(pid);
        parent ? parent.add(item) : SceneManager.add(item, pid);
        HistoryControl.add('MESH_DELETE', [{id_mesh: item.mesh_data.id}]);
        SelectControl.set_selected_list([item]);
    }

    function setUniqueNameMeshList(list: TreeItem[]): void {
        if (!list.length) return;

        const namesMap: { [key: string]: number } = {};

        list.forEach(item => {
            const match = item.name.match(/^(.+?)\s*\(\d+\)$/);
            const baseName = match ? match[1] : item.name;

            if (namesMap[baseName]) {
                namesMap[baseName]++;
                const mesh = SceneManager.get_mesh_by_id(item.id);
                if (mesh) mesh.name = baseName + ` (${namesMap[baseName] - 1})`;
            } else {
                namesMap[baseName] = 1;
            }
        });
    }

        function getWorldName(type: string): string {
            if (!type) return '';
            const go = ['go', 'sprite', 'label', 'model'];
            const gui = ['gui', 'box', 'text'];
            if (go.includes(type)) return 'go';
            if (gui.includes(type)) return 'gui';
            return '';
        }
        
        function fromTheSameWorld(listS: any, treeList: TreeItem[] = []) {
            if (listS.length <= 1) return true;
    
            const worldMap: any = [];
    
            for (let i = 0; i < listS.length; i++) {
                if (treeList.length) {
                    const item = treeList.filter((e: any) => e.id == listS[i]);
                    const icon = item.length ? item[0]?.icon : '';
                    worldMap.push(getWorldName(icon));
                }
                else {
                    worldMap.push(getWorldName(listS[i]?.type));
                }
    
                if (worldMap.length > 1) {
                    if (worldMap[i] != worldMap[i - 1]) return false;
                }
            }

            return true;
        }

        function checkPasteSameWorld(itemWhere: any, selected: any = copy_mesh_list) {
            const listWhat = selected?.length ? selected : [];
            if (!listWhat.length) return false;

            const type = listWhat[0]?.type ? listWhat[0]?.type : listWhat[0]?.icon ? listWhat[0]?.icon : '';
            const worldS = getWorldName(type);
            if (!worldS) return false;
            
            const icon = itemWhere?.type ? itemWhere?.type : itemWhere?.icon ? itemWhere?.icon : '';
            const worldIW = getWorldName(icon);
            if (!worldIW) return false;

            return worldS == worldIW;
        }

    return {
        fromTheSameWorld,
        checkPasteSameWorld,
        cut, copy, paste, duplication, remove,
        add_gui_container,
        add_gui_box,
        add_gui_text,
        add_go_container,
        add_go_sprite_component,
        add_go_label_component,
        add_go_model_component,
    };
}