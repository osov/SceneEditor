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

export const NodeActionGui: number[] = [
    NodeAction.add_gui_container,
    NodeAction.add_gui_box,
    NodeAction.add_gui_text
];

export const NodeActionGo: number[] = [
    NodeAction.add_go_container,
    NodeAction.add_go_sprite_component,
    NodeAction.add_go_label_component,
    NodeAction.add_go_model_component
];

export const worldGo: string[] = [
    IObjectTypes.GO_CONTAINER,
    IObjectTypes.GO_MODEL_COMPONENT,
    IObjectTypes.GO_SPRITE_COMPONENT,
    IObjectTypes.GO_LABEL_COMPONENT
];

export const componentsGo: string[] = [
    IObjectTypes.GO_MODEL_COMPONENT,
    IObjectTypes.GO_SPRITE_COMPONENT,
    IObjectTypes.GO_LABEL_COMPONENT
];

export const worldGui: string[] = [
    IObjectTypes.GUI_CONTAINER,
    IObjectTypes.GUI_BOX,
    IObjectTypes.GUI_TEXT
];


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
            showToast('Нельзя одновременно копировать/вырезать/дублировать элементы из GUI и GO!');
            return;
        }

        copy_mesh_list = [];
        for (let i = 0; i < list.length; i++) {
            copy_mesh_list.push(SceneManager.serialize_mesh(list[i]));
        }
        
    }
    
    function paste(asChild: boolean = false, isDuplication: boolean = false) {
        if (copy_mesh_list.length == 0) {
            showToast('Нечего вставлять!');
            return;
        }
        const selected = SelectControl.get_selected_list();
        const preTarget = selected.length ? selected : [RenderEngine.scene];
        if (!selected.length && !isDuplication) {
            showToast('Некуда вставлять!');
            return;
        }

        // ctrl_b or ctrl_v
        let target: any = {};
        if (preTarget[0]?.type == "Scene") target = preTarget[0];
        else target = asChild ? preTarget[0] : preTarget[0].parent;

        if (!isValidAction(target, copy_mesh_list, asChild, false, true)) return;

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
        paste(false, true);
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

    // function getIdNewGuiContainer(pid: number = -1): number {
    //     const parent0 = SceneManager.get_mesh_by_id(pid);
    //     if (parent0 && worldGui.includes(parent0.type)) {
    //         return parent0?.mesh_data?.id ? parent0?.mesh_data?.id : pid;
    //     }
    //     const graph = ControlManager.get_tree_graph();
    //     const parent1 = graph.find(item => item.icon === IObjectTypes.GUI_CONTAINER);
    //     if (!parent1) {
    //         add_gui_container(-1);
    //         const graph2 = ControlManager.get_tree_graph()
    //         const parent2 = graph2.find(item => item.icon === IObjectTypes.GUI_CONTAINER);
    //         return parent2 ? parent2.id : pid;
    //     }
    //     return parent1 ? parent1.id : pid;
    // }

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
            if (['scene', 'Scene'].includes(type)) return 'scene';
            if (worldGo.includes(type)) return 'go';
            if (worldGui.includes(type)) return 'gui';
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

        function showToast(msg: string) {
            Popups.toast.open({
                type: 'info',
                message: msg
            });
        }

        function checkPasteScene(list: any): boolean {
            if (list.length == 0) return false;
            for (let i = 0; i < list.length; i++) {
                const type = list[i]?.type ? list[i]?.type : list[i].icon ? list[i].icon : '';
                if ([IObjectTypes.GO_CONTAINER, IObjectTypes.GUI_CONTAINER].includes(type) == false) {
                    return false;
                }
            }
            return true;
        }
        
        function isValidAction(itemWhere: any, selected: any = copy_mesh_list, asChild: boolean = false, isMove: boolean = false, msg: boolean = false) {
            const icon = itemWhere?.type ? itemWhere?.type : itemWhere?.icon ? itemWhere?.icon : '';
            const worldIW = getWorldName(icon);

            // внутрь sprite\label\model ничего добавлять нельзя
            if(asChild && componentsGo.includes(icon)) { 
                if (msg) showToast(`У ${componentsGo[0]}/${componentsGo[1]}/${componentsGo[2]} не может быть дочерних элементов!`);
                return false;
            }

            // при вставке gui в worldGui
            const gui = IObjectTypes.GUI_CONTAINER;
            const guiC = selected.filter((e:any) => e?.type == gui || e?.icon == gui)
            if (!isMove && worldIW == gui && guiC.length) {
                if (msg) showToast('Нельзя GUI контейнер вкладывать в GUI объекты!');
                return false;
            }

            // при перетаскивании gui в worldGui
            if (isMove && worldIW == gui && guiC.length) {
                if (msg) showToast('Нельзя GUI контейнер перемещать в GUI объекты!');
                return false;
            }

            // в корне можно создать\вставить только  GO_CONTAINER \ GUI_CONTAINER
            if (worldIW == 'scene' && !checkPasteScene(selected)) {
                if (msg) showToast('В корне могут быть только контейнеры Go и GUI!');
                return false;
            }

            if (worldIW == 'scene' && checkPasteScene(selected)) {
                return true;
            }

            const listWhat = selected?.length ? selected : [];
            if (!listWhat.length) {
                if (msg) showToast('Ничего не выбрано!');
                return false;
            }
            
            const type = listWhat[0]?.type ? listWhat[0]?.type : listWhat[0]?.icon ? listWhat[0]?.icon : '';
            const worldS = getWorldName(type);
            if (!worldS) {
                if (msg) showToast('Не найдены объекты для вставки!');
                return false;
            }
            
            if (!worldIW) {
                if (msg) showToast('Не выбрано место для вставки!');
                return false;
            }

            // нельзя Go в Gui || Gui в Go
            const result = worldS == worldIW;
            if (!result) {        
                if (msg) showToast('Нельзя объекты из GUI и GO вкладывать друг в друга!');
                return result;
            }

            return result;
        }

    return {
        copy_mesh_list,
        fromTheSameWorld,
        isValidAction,
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